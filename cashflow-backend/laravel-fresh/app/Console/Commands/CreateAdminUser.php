<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class CreateAdminUser extends Command
{
    protected $signature   = 'cashflow:admin';
    protected $description = 'Create or reset the ABZ admin user';

    public function handle(): void
    {
        // Use DB facade directly — avoids any model autoload issues
        $company = DB::table('companies')->where('tin', '1234567890')->first();

        if (! $company) {
            $companyId = DB::table('companies')->insertGetId([
                'name'                 => 'ABZ',
                'tin'                  => '1234567890',
                'email'                => 'admin@abz.et',
                'vat_registered'       => true,
                'vat_registered_since' => '2018-09-11',
                'created_at'           => now(),
                'updated_at'           => now(),
            ]);
        } else {
            $companyId = $company->id;
            DB::table('companies')->where('id', $companyId)->update(['name' => 'ABZ', 'updated_at' => now()]);
        }

        DB::table('users')->updateOrInsert(
            ['email' => 'admin@cashflow.et'],
            [
                'company_id' => $companyId,
                'name'       => 'Admin',
                'password'   => Hash::make('password'),
                'role'       => 'admin',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        $this->info("✓ Company: ABZ (ID {$companyId})");
        $this->info("✓ User: admin@cashflow.et / password");
    }
}
