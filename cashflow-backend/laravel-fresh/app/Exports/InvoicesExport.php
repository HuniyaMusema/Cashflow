<?php

namespace App\Exports;

use App\Models\Invoice;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class InvoicesExport implements FromCollection, WithHeadings, WithMapping
{
    public function __construct(
        private int $companyId,
        private string $taxPeriod
    ) {}

    public function collection()
    {
        return Invoice::where('company_id', $this->companyId)
            ->where('tax_period', $this->taxPeriod)
            ->where('status', 'verified')
            ->orderBy('invoice_date')
            ->get();
    }

    public function headings(): array
    {
        // ERA e-Tax CSV format
        return [
            'Invoice Number',
            'Vendor Name',
            'Vendor TIN',
            'Invoice Date',
            'Type',
            'Taxable Amount (ETB)',
            'VAT Amount (ETB)',
            'Withholding Amount (ETB)',
            'Total Amount (ETB)',
            'Tax Period',
        ];
    }

    public function map($invoice): array
    {
        return [
            $invoice->invoice_number,
            $invoice->vendor_name,
            $invoice->vendor_tin,
            $invoice->invoice_date->format('Y-m-d'),
            $invoice->type,
            number_format($invoice->taxable_amount, 2, '.', ''),
            number_format($invoice->vat_amount, 2, '.', ''),
            number_format($invoice->withholding_amount, 2, '.', ''),
            number_format($invoice->total_amount, 2, '.', ''),
            $invoice->tax_period,
        ];
    }
}
