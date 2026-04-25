<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Company extends Model
{
    protected $fillable = [
        'name', 'tin', 'email', 'phone', 'address',
        'vat_registered', 'vat_registered_since',
    ];

    protected $casts = [
        'vat_registered' => 'boolean',
        'vat_registered_since' => 'date',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function taxDeclarations(): HasMany
    {
        return $this->hasMany(TaxDeclaration::class);
    }
}
