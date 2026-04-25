<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Invoice extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'company_id', 'created_by', 'invoice_number', 'vendor_name',
        'vendor_tin', 'invoice_date', 'type', 'taxable_amount',
        'vat_amount', 'withholding_amount', 'total_amount',
        'status', 'source', 'receipt_image_path', 'ocr_raw_data', 'tax_period',
    ];

    protected $casts = [
        'invoice_date'       => 'date',
        'taxable_amount'     => 'decimal:2',
        'vat_amount'         => 'decimal:2',
        'withholding_amount' => 'decimal:2',
        'total_amount'       => 'decimal:2',
        'ocr_raw_data'       => 'array',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Auto-calculate VAT (15%) and withholding (2% Purchase / 3% Sales)
     */
    public static function calculateTax(float $taxableAmount, string $type): array
    {
        $vat         = round($taxableAmount * 0.15, 2);
        $withholding = $type === 'Purchase'
            ? round($taxableAmount * 0.02, 2)
            : round($taxableAmount * 0.03, 2);
        $total = $taxableAmount + $vat;

        return compact('vat', 'withholding', 'total');
    }
}
