<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $companyId = $request->user()->company_id;
        $period    = $request->get('tax_period', now()->format('Y-m'));

        // Current period totals
        $totals = Invoice::where('company_id', $companyId)
            ->where('tax_period', $period)
            ->where('status', '!=', 'rejected')
            ->selectRaw("
                SUM(CASE WHEN type = 'Sales' THEN vat_amount ELSE 0 END)    AS output_vat,
                SUM(CASE WHEN type = 'Purchase' THEN vat_amount ELSE 0 END) AS input_vat,
                SUM(withholding_amount)                                      AS total_withholding,
                COUNT(*)                                                     AS invoice_count
            ")
            ->first();

        $netVat = ($totals->output_vat ?? 0) - ($totals->input_vat ?? 0);

        // Monthly trend (last 7 months)
        $trend = Invoice::where('company_id', $companyId)
            ->where('status', '!=', 'rejected')
            ->where('invoice_date', '>=', now()->subMonths(6)->startOfMonth())
            ->selectRaw("
                tax_period,
                SUM(CASE WHEN type = 'Sales' THEN vat_amount ELSE 0 END)    AS output_vat,
                SUM(CASE WHEN type = 'Purchase' THEN vat_amount ELSE 0 END) AS input_vat
            ")
            ->groupBy('tax_period')
            ->orderBy('tax_period')
            ->get();

        // Recent invoices
        $recent = Invoice::where('company_id', $companyId)
            ->orderByDesc('created_at')
            ->limit(5)
            ->get(['id', 'invoice_number', 'vendor_name', 'invoice_date', 'total_amount', 'vat_amount', 'status', 'type']);

        return response()->json([
            'period'             => $period,
            'output_vat'         => round($totals->output_vat ?? 0, 2),
            'input_vat'          => round($totals->input_vat ?? 0, 2),
            'net_vat_payable'    => round($netVat, 2),
            'total_withholding'  => round($totals->total_withholding ?? 0, 2),
            'invoice_count'      => $totals->invoice_count ?? 0,
            'monthly_trend'      => $trend,
            'recent_invoices'    => $recent,
        ]);
    }
}
