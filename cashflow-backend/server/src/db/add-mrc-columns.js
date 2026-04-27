require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const pool = require('./pool');

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE invoices
        ADD COLUMN IF NOT EXISTS mrc        VARCHAR(30),
        ADD COLUMN IF NOT EXISTS fs_number  VARCHAR(30),
        ADD COLUMN IF NOT EXISTS vat_reg_no VARCHAR(20);
    `);
    console.log('✓ Added mrc, fs_number, vat_reg_no columns to invoices');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => { console.error(err.message); process.exit(1); });
