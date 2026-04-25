require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const pool = require('./pool');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migrations...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id               SERIAL PRIMARY KEY,
        name             VARCHAR(255) NOT NULL,
        tin              VARCHAR(10)  NOT NULL UNIQUE,
        email            VARCHAR(255),
        phone            VARCHAR(50),
        address          TEXT,
        vat_registered   BOOLEAN DEFAULT true,
        vat_registered_since DATE,
        created_at       TIMESTAMPTZ DEFAULT NOW(),
        updated_at       TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          SERIAL PRIMARY KEY,
        company_id  INTEGER REFERENCES companies(id) ON DELETE CASCADE,
        name        VARCHAR(255) NOT NULL,
        email       VARCHAR(255) NOT NULL UNIQUE,
        password    VARCHAR(255) NOT NULL,
        role        VARCHAR(50)  DEFAULT 'admin',
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id                  SERIAL PRIMARY KEY,
        company_id          INTEGER REFERENCES companies(id) ON DELETE CASCADE,
        created_by          INTEGER REFERENCES users(id),
        invoice_number      VARCHAR(50) UNIQUE,
        vendor_name         VARCHAR(255) NOT NULL,
        vendor_tin          VARCHAR(10)  NOT NULL,
        invoice_date        DATE NOT NULL,
        type                VARCHAR(20)  NOT NULL CHECK (type IN ('Sales','Purchase')),
        taxable_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
        vat_amount          NUMERIC(15,2) NOT NULL DEFAULT 0,
        withholding_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
        total_amount        NUMERIC(15,2) NOT NULL DEFAULT 0,
        status              VARCHAR(20)  DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
        source              VARCHAR(20)  DEFAULT 'manual' CHECK (source IN ('manual','ocr')),
        receipt_image_path  VARCHAR(255),
        ocr_raw_data        JSONB,
        tax_period          VARCHAR(7)   NOT NULL,
        deleted_at          TIMESTAMPTZ,
        created_at          TIMESTAMPTZ DEFAULT NOW(),
        updated_at          TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_invoices_company_period ON invoices(company_id, tax_period);
      CREATE INDEX IF NOT EXISTS idx_invoices_company_type   ON invoices(company_id, type);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tax_declarations (
        id                  SERIAL PRIMARY KEY,
        company_id          INTEGER REFERENCES companies(id) ON DELETE CASCADE,
        generated_by        INTEGER REFERENCES users(id),
        declaration_number  VARCHAR(50) UNIQUE,
        tax_period          VARCHAR(7)  NOT NULL,
        total_output_vat    NUMERIC(15,2) DEFAULT 0,
        total_input_vat     NUMERIC(15,2) DEFAULT 0,
        net_vat_payable     NUMERIC(15,2) DEFAULT 0,
        total_withholding   NUMERIC(15,2) DEFAULT 0,
        status              VARCHAR(20)  DEFAULT 'draft',
        csv_path            VARCHAR(255),
        filed_at            TIMESTAMPTZ,
        created_at          TIMESTAMPTZ DEFAULT NOW(),
        updated_at          TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, tax_period)
      );
    `);

    console.log('✓ All tables created successfully');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => { console.error('Migration failed:', err.message); process.exit(1); });
