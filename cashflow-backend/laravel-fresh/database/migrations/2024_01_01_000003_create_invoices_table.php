<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users');
            $table->string('invoice_number')->unique();
            $table->string('vendor_name');
            $table->string('vendor_tin', 10);
            $table->date('invoice_date');
            $table->enum('type', ['Sales', 'Purchase']);
            $table->decimal('taxable_amount', 15, 2);
            $table->decimal('vat_amount', 15, 2);       // 15% VAT
            $table->decimal('withholding_amount', 15, 2)->default(0); // 2% or 3%
            $table->decimal('total_amount', 15, 2);
            $table->enum('status', ['pending', 'verified', 'rejected'])->default('pending');
            $table->string('source')->default('manual'); // manual | ocr
            $table->string('receipt_image_path')->nullable();
            $table->json('ocr_raw_data')->nullable();
            $table->string('tax_period', 7); // YYYY-MM
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'tax_period']);
            $table->index(['company_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
