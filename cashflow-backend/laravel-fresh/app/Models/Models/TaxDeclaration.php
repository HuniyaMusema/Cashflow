<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaxDeclaration extends Model
{
    protected $fillable = [
        'company_id', 'generated_by', 'declaration_number', 'tax_period',
        'total_output_vat', 'total_input_vat', 'net_vat_payable',
        'total_withholding', 'status', 'csv_path', 'pdf_path', 'filed_at',
    ];

    protected $casts = [
        'total_output_vat'  => 'decimal:2',
        'total_input_vat'   => 'decimal:2',
        'net_vat_payable'   => 'decimal:2',
        'total_withholding' => 'decimal:2',
        'filed_at'          => 'datetime',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function generator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by');
    }
}
