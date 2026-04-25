<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class InvoiceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Invoice::where('company_id', $request->user()->company_id)
            ->with('creator:id,name');

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('tax_period')) {
            $query->where('tax_period', $request->tax_period);
        }
        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('vendor_name', 'ilike', "%{$request->search}%")
                  ->orWhere('invoice_number', 'ilike', "%{$request->search}%")
                  ->orWhere('vendor_tin', 'like', "%{$request->search}%");
            });
        }

        $invoices = $query->orderByDesc('invoice_date')
            ->paginate($request->get('per_page', 20));

        return response()->json($invoices);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateInvoice($request);
        $invoice = $this->createInvoice($data, $request->user()->company_id, $request->user()->id);
        return response()->json($invoice, 201);
    }

    public function show(Request $request, Invoice $invoice): JsonResponse
    {
        $this->authorizeInvoice($request, $invoice);
        return response()->json($invoice->load('creator:id,name'));
    }

    public function update(Request $request, Invoice $invoice): JsonResponse
    {
        $this->authorizeInvoice($request, $invoice);
        $data = $this->validateInvoice($request);
        $taxes = Invoice::calculateTax((float) $data['taxable_amount'], $data['type']);

        $invoice->update([
            ...$data,
            'vat_amount'         => $taxes['vat'],
            'withholding_amount' => $taxes['withholding'],
            'total_amount'       => $taxes['total'],
        ]);

        return response()->json($invoice->fresh());
    }

    public function destroy(Request $request, Invoice $invoice): JsonResponse
    {
        $this->authorizeInvoice($request, $invoice);
        $invoice->delete();
        return response()->json(['message' => 'Invoice deleted']);
    }

    public function updateStatus(Request $request, Invoice $invoice): JsonResponse
    {
        $this->authorizeInvoice($request, $invoice);
        $request->validate(['status' => 'required|in:pending,verified,rejected']);
        $invoice->update(['status' => $request->status]);
        return response()->json($invoice->fresh());
    }

    /**
     * Called internally by the Node OCR microservice.
     * Protected by OcrInternalMiddleware (token check).
     */
    public function ocrSubmit(Request $request): JsonResponse
    {
        $data = $request->validate([
            'vendor_name'    => 'required|string',
            'vendor_tin'     => 'required|string|size:10',
            'invoice_date'   => 'required|date',
            'taxable_amount' => 'required|numeric|min:0',
            'type'           => 'required|in:Sales,Purchase',
            'company_id'     => 'required|exists:companies,id',
            'ocr_raw_data'   => 'nullable|array',
            'receipt_image_path' => 'nullable|string',
        ]);

        // Use company's first admin as creator for OCR submissions
        $company = \App\Models\Company::findOrFail($data['company_id']);
        $creator = $company->users()->where('role', 'admin')->first()
            ?? $company->users()->first();

        $invoice = $this->createInvoice($data, $data['company_id'], $creator->id, 'ocr');

        return response()->json($invoice, 201);
    }

    // -------------------------------------------------------------------------

    private function validateInvoice(Request $request): array
    {
        return $request->validate([
            'vendor_name'    => 'required|string|max:255',
            'vendor_tin'     => 'required|string|size:10',
            'invoice_date'   => 'required|date',
            'taxable_amount' => 'required|numeric|min:0',
            'type'           => 'required|in:Sales,Purchase',
            'status'         => 'sometimes|in:pending,verified,rejected',
        ]);
    }

    private function createInvoice(array $data, int $companyId, int $userId, string $source = 'manual'): Invoice
    {
        $taxes = Invoice::calculateTax((float) $data['taxable_amount'], $data['type']);

        return Invoice::create([
            'company_id'         => $companyId,
            'created_by'         => $userId,
            'invoice_number'     => 'INV-' . strtoupper(Str::random(8)),
            'vendor_name'        => $data['vendor_name'],
            'vendor_tin'         => $data['vendor_tin'],
            'invoice_date'       => $data['invoice_date'],
            'type'               => $data['type'],
            'taxable_amount'     => $data['taxable_amount'],
            'vat_amount'         => $taxes['vat'],
            'withholding_amount' => $taxes['withholding'],
            'total_amount'       => $taxes['total'],
            'status'             => $data['status'] ?? 'pending',
            'source'             => $source,
            'receipt_image_path' => $data['receipt_image_path'] ?? null,
            'ocr_raw_data'       => $data['ocr_raw_data'] ?? null,
            'tax_period'         => substr($data['invoice_date'], 0, 7),
        ]);
    }

    private function authorizeInvoice(Request $request, Invoice $invoice): void
    {
        abort_if($invoice->company_id !== $request->user()->company_id, 403, 'Forbidden');
    }
}
