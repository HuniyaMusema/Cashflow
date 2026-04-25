<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Invoice;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $company = Company::create([
            'name'                => 'Example Ethiopia PLC',
            'tin'                 => '1234567890',
            'email'               => 'admin@example.et',
            'vat_registered'      => true,
            'vat_registered_since' => '2018-09-11',
        ]);

        $user = User::create([
            'company_id' => $company->id,
            'name'       => 'Admin User',
            'email'      => 'admin@cashflow.et',
            'password'   => 'password',
            'role'       => 'admin',
        ]);

        // Seed sample invoices
        $vendors = [
            ['Ethio Telecom', '0012345678'],
            ['Shell Ethiopia', '0087654321'],
            ['Hilton Addis',   '0011223344'],
            ['Office Depot',   '0099887766'],
            ['Abyssinia Bank', '0055443322'],
        ];

        foreach ($vendors as [$name, $tin]) {
            $taxable = fake()->randomFloat(2, 500, 10000);
            $taxes   = Invoice::calculateTax($taxable, 'Purchase');
            Invoice::create([
                'company_id'         => $company->id,
                'created_by'         => $user->id,
                'invoice_number'     => 'INV-' . strtoupper(Str::random(8)),
                'vendor_name'        => $name,
                'vendor_tin'         => $tin,
                'invoice_date'       => now()->subDays(rand(1, 30)),
                'type'               => 'Purchase',
                'taxable_amount'     => $taxable,
                'vat_amount'         => $taxes['vat'],
                'withholding_amount' => $taxes['withholding'],
                'total_amount'       => $taxes['total'],
                'status'             => 'verified',
                'source'             => 'manual',
                'tax_period'         => now()->format('Y-m'),
            ]);
        }
    }
}
