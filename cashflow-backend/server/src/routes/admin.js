const router = require('express').Router();
const pool   = require('../db/pool');
const bcrypt = require('bcryptjs');
const { auth } = require('../middleware/auth');

// Admin-only guard
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  next();
}

// ─── Overview ────────────────────────────────────────────────────────────────

// GET /api/v1/admin/overview
router.get('/overview', auth, adminOnly, async (_req, res) => {
  const [companies, users, invoices, vatRes] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM companies`),
    pool.query(`SELECT COUNT(*) FROM users`),
    pool.query(`SELECT COUNT(*) FROM invoices WHERE deleted_at IS NULL`),
    pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN type='Sales'    THEN vat_amount ELSE 0 END),0) AS total_output_vat,
        COALESCE(SUM(CASE WHEN type='Purchase' THEN vat_amount ELSE 0 END),0) AS total_input_vat,
        COALESCE(SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END),0)         AS pending_count,
        COALESCE(SUM(CASE WHEN status='verified' THEN 1 ELSE 0 END),0)        AS verified_count,
        COALESCE(SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END),0)        AS rejected_count
      FROM invoices WHERE deleted_at IS NULL
    `),
  ]);

  const v = vatRes.rows[0];
  res.json({
    total_companies:  parseInt(companies.rows[0].count),
    total_users:      parseInt(users.rows[0].count),
    total_invoices:   parseInt(invoices.rows[0].count),
    total_output_vat: parseFloat(v.total_output_vat),
    total_input_vat:  parseFloat(v.total_input_vat),
    net_vat:          parseFloat(v.total_output_vat) - parseFloat(v.total_input_vat),
    pending_count:    parseInt(v.pending_count),
    verified_count:   parseInt(v.verified_count),
    rejected_count:   parseInt(v.rejected_count),
  });
});

// ─── Companies ───────────────────────────────────────────────────────────────

// GET /api/v1/admin/companies
router.get('/companies', auth, adminOnly, async (req, res) => {
  const { search, page = 1, per_page = 15 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(per_page);

  let where = ['1=1'];
  const params = [];
  let idx = 1;

  if (search) {
    where.push(`(c.name ILIKE $${idx} OR c.tin ILIKE $${idx})`);
    params.push(`%${search}%`); idx++;
  }

  const whereStr = where.join(' AND ');

  const [countRes, dataRes] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM companies c WHERE ${whereStr}`, params),
    pool.query(`
      SELECT c.*,
        COUNT(DISTINCT u.id)  AS user_count,
        COUNT(DISTINCT i.id)  AS invoice_count,
        COALESCE(SUM(CASE WHEN i.type='Sales' AND i.deleted_at IS NULL THEN i.vat_amount ELSE 0 END),0) AS output_vat,
        COALESCE(SUM(CASE WHEN i.type='Purchase' AND i.deleted_at IS NULL THEN i.vat_amount ELSE 0 END),0) AS input_vat
      FROM companies c
      LEFT JOIN users u ON u.company_id = c.id
      LEFT JOIN invoices i ON i.company_id = c.id
      WHERE ${whereStr}
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, [...params, parseInt(per_page), offset]),
  ]);

  const total    = parseInt(countRes.rows[0].count);
  const lastPage = Math.ceil(total / parseInt(per_page)) || 1;

  res.json({
    data: dataRes.rows,
    meta: { current_page: parseInt(page), last_page: lastPage, total },
  });
});

// POST /api/v1/admin/companies — create company + admin user in one shot
router.post('/companies', auth, adminOnly, async (req, res) => {
  const { company_name, tin, email, password = 'password123' } = req.body;
  if (!company_name || !tin) {
    return res.status(422).json({ message: 'company_name and tin are required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const compRes = await client.query(`
      INSERT INTO companies (name, tin, vat_registered)
      VALUES ($1, $2, true) RETURNING *
    `, [company_name, tin]);
    const company = compRes.rows[0];

    // Auto-generate email from TIN if not provided
    const userEmail = email || `user${tin}@abz.et`;
    const hash = await bcrypt.hash(password, 10);

    const userRes = await client.query(`
      INSERT INTO users (company_id, name, email, password, role)
      VALUES ($1, $2, $3, $4, 'accountant') RETURNING id, name, email, role
    `, [company.id, company_name, userEmail.toLowerCase(), hash]);

    await client.query('COMMIT');
    res.status(201).json({
      company,
      user: userRes.rows[0],
      credentials: { email: userEmail.toLowerCase(), password },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(422).json({ message: 'TIN or email already exists.' });
    throw err;
  } finally {
    client.release();
  }
});

// DELETE /api/v1/admin/companies/:id
router.delete('/companies/:id', auth, adminOnly, async (req, res) => {
  await pool.query(`DELETE FROM companies WHERE id=$1`, [req.params.id]);
  res.json({ message: 'Company deleted.' });
});

// GET /api/v1/admin/companies/:id
router.get('/companies/:id', auth, adminOnly, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT c.*,
      COUNT(DISTINCT u.id) AS user_count,
      COUNT(DISTINCT i.id) AS invoice_count
    FROM companies c
    LEFT JOIN users u ON u.company_id = c.id
    LEFT JOIN invoices i ON i.company_id = c.id AND i.deleted_at IS NULL
    WHERE c.id = $1
    GROUP BY c.id
  `, [req.params.id]);

  if (!rows.length) return res.status(404).json({ message: 'Company not found.' });

  const invRes = await pool.query(`
    SELECT * FROM invoices
    WHERE company_id=$1 AND deleted_at IS NULL
    ORDER BY created_at DESC LIMIT 10
  `, [req.params.id]);

  res.json({ ...rows[0], recent_invoices: invRes.rows });
});

// ─── Users ───────────────────────────────────────────────────────────────────

// GET /api/v1/admin/users
router.get('/users', auth, adminOnly, async (req, res) => {
  const { search, page = 1, per_page = 15 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(per_page);

  let where = ['1=1'];
  const params = [];
  let idx = 1;

  if (search) {
    where.push(`(u.name ILIKE $${idx} OR u.email ILIKE $${idx} OR c.name ILIKE $${idx})`);
    params.push(`%${search}%`); idx++;
  }

  const whereStr = where.join(' AND ');

  const [countRes, dataRes] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM users u JOIN companies c ON c.id=u.company_id WHERE ${whereStr}`, params),
    pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.created_at,
             c.id AS company_id, c.name AS company_name, c.tin AS company_tin
      FROM users u JOIN companies c ON c.id = u.company_id
      WHERE ${whereStr}
      ORDER BY u.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, [...params, parseInt(per_page), offset]),
  ]);

  const total    = parseInt(countRes.rows[0].count);
  const lastPage = Math.ceil(total / parseInt(per_page)) || 1;

  res.json({
    data: dataRes.rows,
    meta: { current_page: parseInt(page), last_page: lastPage, total },
  });
});

// PATCH /api/v1/admin/users/:id/role
router.patch('/users/:id/role', auth, adminOnly, async (req, res) => {
  const { role } = req.body;
  if (!['admin', 'accountant', 'viewer'].includes(role)) {
    return res.status(422).json({ message: 'Invalid role.' });
  }
  const { rows } = await pool.query(
    `UPDATE users SET role=$1, updated_at=NOW() WHERE id=$2 RETURNING id, name, email, role`,
    [role, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ message: 'User not found.' });
  res.json(rows[0]);
});

// DELETE /api/v1/admin/users/:id
router.delete('/users/:id', auth, adminOnly, async (req, res) => {
  await pool.query(`DELETE FROM users WHERE id=$1`, [req.params.id]);
  res.json({ message: 'User deleted.' });
});

// POST /api/v1/admin/users — create user for a company
router.post('/users', auth, adminOnly, async (req, res) => {
  const { name, email, password, role = 'accountant', company_id } = req.body;
  if (!name || !email || !password || !company_id) {
    return res.status(422).json({ message: 'name, email, password, company_id required.' });
  }
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(`
    INSERT INTO users (company_id, name, email, password, role)
    VALUES ($1,$2,$3,$4,$5) RETURNING id, name, email, role, company_id
  `, [company_id, name, email.toLowerCase(), hash, role]);
  res.status(201).json(rows[0]);
});

// ─── All Invoices ─────────────────────────────────────────────────────────────

// GET /api/v1/admin/invoices
router.get('/invoices', auth, adminOnly, async (req, res) => {
  const { search, status, type, page = 1, per_page = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(per_page);

  let where = ['i.deleted_at IS NULL'];
  const params = [];
  let idx = 1;

  if (status) { where.push(`i.status=$${idx++}`); params.push(status); }
  if (type)   { where.push(`i.type=$${idx++}`);   params.push(type); }
  if (search) {
    where.push(`(i.vendor_name ILIKE $${idx} OR i.invoice_number ILIKE $${idx} OR c.name ILIKE $${idx})`);
    params.push(`%${search}%`); idx++;
  }

  const whereStr = where.join(' AND ');

  const [countRes, dataRes] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM invoices i JOIN companies c ON c.id=i.company_id WHERE ${whereStr}`, params),
    pool.query(`
      SELECT i.*, c.name AS company_name, c.tin AS company_tin
      FROM invoices i JOIN companies c ON c.id = i.company_id
      WHERE ${whereStr}
      ORDER BY i.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, [...params, parseInt(per_page), offset]),
  ]);

  const total    = parseInt(countRes.rows[0].count);
  const lastPage = Math.ceil(total / parseInt(per_page)) || 1;

  res.json({
    data: dataRes.rows,
    meta: { current_page: parseInt(page), last_page: lastPage, total },
  });
});

// ─── Monthly trend across all companies ──────────────────────────────────────

// GET /api/v1/admin/trends
router.get('/trends', auth, adminOnly, async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT
      tax_period,
      COUNT(DISTINCT company_id)                                              AS active_companies,
      COALESCE(SUM(CASE WHEN type='Sales'    THEN vat_amount ELSE 0 END), 0) AS output_vat,
      COALESCE(SUM(CASE WHEN type='Purchase' THEN vat_amount ELSE 0 END), 0) AS input_vat,
      COUNT(*)                                                                AS invoice_count
    FROM invoices
    WHERE deleted_at IS NULL
      AND invoice_date >= NOW() - INTERVAL '6 months'
    GROUP BY tax_period
    ORDER BY tax_period ASC
  `);
  res.json(rows);
});

module.exports = router;
