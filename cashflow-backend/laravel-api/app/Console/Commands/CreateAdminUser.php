<?php

namespace App\Console\Commands;

use App\Models\Company;
use App\Models\User;
use Illuminate\Console\Command;

class CreateAdminUser extends Command
{
    protected $signature   = 'cashflow:admin';
    protected $description = 'Create or reset the ABZ admin user';

    public function handle(): void
    {
        $company = Company::where('tin', '1234567890')->first();

        if (! $company) {
            $company = Company::create([
                'name'                => 'ABZ',
                'tin'                 => '1234567890',
                'email'               => 'admin@abz.et',
                'vat_registered'      => true,
                'vat_registered_since' => '2018-09-11',
            ]);
        } else {
            $company->update(['name' => 'ABZ']);
        }

        $user = User::updateOrCreate(
            ['email' => 'admin@cashflow.et'],
            [
                'company_id' => $company->id,
                'name'       => 'Admin',
                'password'   => bcrypt('password'),
                'role'       => 'admin',
            ]
        );

        $this->info("✓ Company: {$company->name} (ID {$company->id})");
        $this->info("✓ User: {$user->email} / password");
    }
}
