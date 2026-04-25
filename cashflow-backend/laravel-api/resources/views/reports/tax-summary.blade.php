<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; margin: 40px; }
  h1 { font-size: 22px; color: #4f46e5; margin-bottom: 4px; }
  .meta { color: #64748b; font-size: 11px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th { background: #4f46e5; color: white; padding: 8px 10px; text-align: left; font-size: 11px; }
  td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) td { background: #f8fafc; }
  .summary { margin-top: 24px; background: #f1f5f9; padding: 16px; border-radius: 8px; }
  .summary-row { display: flex; justify-content: space-between; padding: 4px 0; }
  .label { color: #64748b; }
  .value { font-weight: bold; }
  .net { color: #4f46e5; font-size: 14px; }
</style>
</head>
<body>
  <h1>Cashflow Tax — VAT Report</h1>
  <div class="meta">
    <strong>{{ $company->name }}</strong> &nbsp;|&nbsp; TIN: {{ $company->tin }}
    &nbsp;|&nbsp; Period: {{ $period }}
    &nbsp;|&nbsp; Generated: {{ now()->format('Y-m-d H:i') }}
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Invoice No.</th>
        <th>Vendor</th>
        <th>TIN</th>
        <th>Date</th>
        <th>Type</th>
        <th>Taxable (ETB)</th>
        <th>VAT (ETB)</th>
        <th>WHT (ETB)</th>
      </tr>
    </thead>
    <tbody>
      @foreach($invoices as $i => $inv)
      <tr>
        <td>{{ $i + 1 }}</td>
        <td>{{ $inv->invoice_number }}</td>
        <td>{{ $inv->vendor_name }}</td>
        <td>{{ $inv->vendor_tin }}</td>
        <td>{{ $inv->invoice_date->format('Y-m-d') }}</td>
        <td>{{ $inv->type }}</td>
        <td>{{ number_format($inv->taxable_amount, 2) }}</td>
        <td>{{ number_format($inv->vat_amount, 2) }}</td>
        <td>{{ number_format($inv->withholding_amount, 2) }}</td>
      </tr>
      @endforeach
    </tbody>
  </table>

  <div class="summary">
    <div class="summary-row"><span class="label">Output VAT (Sales)</span><span class="value">ETB {{ number_format($outputVat, 2) }}</span></div>
    <div class="summary-row"><span class="label">Input VAT (Purchases)</span><span class="value">ETB {{ number_format($inputVat, 2) }}</span></div>
    <div class="summary-row"><span class="label">Total Withholding Tax</span><span class="value">ETB {{ number_format($withholding, 2) }}</span></div>
    <div class="summary-row net"><span class="label">Net VAT Payable</span><span class="value">ETB {{ number_format($outputVat - $inputVat, 2) }}</span></div>
  </div>
</body>
</html>
