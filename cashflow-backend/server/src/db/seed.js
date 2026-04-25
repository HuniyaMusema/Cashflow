require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const pool   = require('./pool');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function seed() {
  const client = await pool.connect();
  try {
    // Company
    const compRes = await client.query(`
      INSERT INTO companies (name, tin, email, vat_registered, vat_registered_since)
      VALUES ('ABZ', '1234567890', 'admin@abz.et', true, '2018-09-11')
      ON CONFLICT (tin) DO UPDATE SET name = 'ABZ'
      RETURNING id
    `);
    const companyId = compRes.rows[0].id;

    // Admin user
    const hash = await bcrypt.hash('password', 10);
    const userRes = await client.query(`
      INSERT INTO users (company_id, name, email, password, role)
      VALUES ($1, 'Admin', 'admin@cashflow.et', $2, 'admin')
      ON CONFLICT (email) DO UPDATE SET password = $2, company_id = $1
      RETURNING id
    `, [companyId, hash]);
    const userId = userRes.rows[0].id;

    // Sample invoices
    const vendors = [
      ['Ahmed Rahmeto Retail Trade', '0001163960', 67200, 10080, 'Purchase'],
      ['Ethio Telecom',              '0012345678',  1200,   180, 'Purchase'],
      ['Shell Ethiopia',             '0087654321',  4500,   675, 'Sales'],
      ['Hilton Addis',               '0011223344',  8900,  1335, 'Purchase'],
      ['Abyssinia Bank',             '0055443322',  2100,   315, 'Sales'],
    ];

    const period = new Date().toISOString().slice(0, 7);
    for (const [name, tin, taxable, vat, type] of vendors) {
      const wht = type === 'Purchase' ? taxable * 0.02 : taxable * 0.03;
      await client.query(`
        INSERT INTO invoices
          (company_id, created_by, invoice_number, vendor_name, vendor_tin,
           invoice_date, type, taxable_amount, vat_amount, withholding_amount,
           total_amount, status, source, tax_period)
        VALUES ($1,$2,$3,$4,$5,NOW(),$6,$7,$8,$9,$10,'verified','manual',$11)
        ON CONFLICT (invoice_number) DO NOTHING
      `, [companyId, userId, 'INV-' + uuidv4().slice(0,8).toUpperCase(),
          name, tin, type, taxable, vat, wht, taxable + vat, period]);
    }

    console.log(`✓ Company: ABZ (ID ${companyId})`);
    console.log(`✓ User: admin@cashflow.et / password`);
    console.log(`✓ ${vendors.length} sample invoices created`);
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => { console.error('Seed failed:', err.message); process.exit(1); });
