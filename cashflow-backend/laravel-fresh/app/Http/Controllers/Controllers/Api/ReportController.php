<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Exports\InvoicesExport;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\View;

class ReportController extends Controller
{
    /**
     * Export e-Tax CSV for ERA submission
     */
    public function exportCsv(Request $request)
    {
        $request->validate(['tax_period' => 'required|date_format:Y-m']);

        $period    = $request->tax_period;
        $companyId = $request->user()->company_id;

        return Excel::download(
            new InvoicesExport($companyId, $period),
            "etax-{$period}.csv",
            \Maatwebsite\Excel\Excel::CSV
        );
    }

    /**
     * Export PDF report using Browsershot
     */
    public function exportPdf(Request $request)
    {
        $request->validate(['tax_period' => 'required|date_format:Y-m']);

        $period    = $request->tax_period;
        $companyId = $request->user()->company_id;
        $company   = $request->user()->company;

        $invoices = Invoice::where('company_id', $companyId)
            ->where('tax_period', $period)
            ->where('status', 'verified')
            ->orderBy('invoice_date')
            ->get();

        $outputVat   = $invoices->where('type', 'Sales')->sum('vat_amount');
        $inputVat    = $invoices->where('type', 'Purchase')->sum('vat_amount');
        $withholding = $invoices->sum('withholding_amount');

        $pdf = Pdf::loadView('reports.tax-summary', compact(
            'company', 'invoices', 'period', 'outputVat', 'inputVat', 'withholding'
        ));

        return $pdf->download("tax-report-{$period}.pdf");
    }
}
