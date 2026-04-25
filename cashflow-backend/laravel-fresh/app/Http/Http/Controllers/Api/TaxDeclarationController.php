<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\TaxDeclaration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TaxDeclarationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $declarations = TaxDeclaration::where('company_id', $request->user()->company_id)
            ->orderByDesc('tax_period')
            ->get();

        return response()->json($declarations);
    }

    public function generate(Request $request): JsonResponse
    {
        $request->validate(['tax_period' => 'required|date_format:Y-m']);

        $companyId = $request->user()->company_id;
        $period    = $request->tax_period;

        // Aggregate verified invoices for the period
        $invoices = Invoice::where('company_id', $companyId)
            ->where('tax_period', $period)
            ->where('status', 'verified')
            ->get();

        $outputVat    = $invoices->where('type', 'Sales')->sum('vat_amount');
        $inputVat     = $invoices->where('type', 'Purchase')->sum('vat_amount');
        $withholding  = $invoices->sum('withholding_amount');
        $netVat       = $outputVat - $inputVat;

        $declaration = TaxDeclaration::updateOrCreate(
            ['company_id' => $companyId, 'tax_period' => $period],
            [
                'generated_by'      => $request->user()->id,
                'declaration_number' => 'DEC-' . strtoupper(Str::random(8)),
                'total_output_vat'  => $outputVat,
                'total_input_vat'   => $inputVat,
                'net_vat_payable'   => $netVat,
                'total_withholding' => $withholding,
                'status'            => 'draft',
            ]
        );

        return response()->json([
            'declaration' => $declaration,
            'invoice_count' => $invoices->count(),
        ], 201);
    }
}
