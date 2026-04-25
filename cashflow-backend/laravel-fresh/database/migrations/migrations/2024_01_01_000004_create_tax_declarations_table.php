<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('tax_declarations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('generated_by')->constrained('users');
            $table->string('declaration_number')->unique();
            $table->string('tax_period', 7); // YYYY-MM
            $table->decimal('total_output_vat', 15, 2)->default(0);
            $table->decimal('total_input_vat', 15, 2)->default(0);
            $table->decimal('net_vat_payable', 15, 2)->default(0);
            $table->decimal('total_withholding', 15, 2)->default(0);
            $table->enum('status', ['draft', 'filed', 'accepted', 'rejected'])->default('draft');
            $table->string('csv_path')->nullable();
            $table->string('pdf_path')->nullable();
            $table->timestamp('filed_at')->nullable();
            $table->timestamps();

            $table->unique(['company_id', 'tax_period']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tax_declarations');
    }
};
