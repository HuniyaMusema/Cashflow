const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const pool    = require('../db/pool');
const { generateToken, auth } = require('../middleware/auth');

// POST /api/v1/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(422).json({ message: 'Email and password required.' });

  const { rows } = await pool.query(
    `SELECT u.*, c.id AS cid, c.name AS cname, c.tin AS ctin
     FROM users u JOIN companies c ON c.id = u.company_id
     WHERE u.email = $1`,
    [email.toLowerCase()]
  );

  if (!rows.length || !(await bcrypt.compare(password, rows[0].password))) {
    return res.status(422).json({ errors: { email: ['The provided credentials are incorrect.'] } });
  }

  const user = rows[0];
  const token = generateToken(user.id);

  res.json({
    token,
    user: {
      id: user.id, name: user.name, email: user.email, role: user.role,
      company: { id: user.cid, name: user.cname, tin: user.ctin },
    },
  });
});

// POST /api/v1/register
router.post('/register', async (req, res) => {
  const { company_name, tin, name, email, password } = req.body;
  if (!company_name || !tin || !name || !email || !password) {
    return res.status(422).json({ message: 'All fields required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const comp = await client.query(
      `INSERT INTO companies (name, tin) VALUES ($1, $2) RETURNING id`,
      [company_name, tin]
    );
    const hash = await bcrypt.hash(password, 10);
    const user = await client.query(
      `INSERT INTO users (company_id, name, email, password, role) VALUES ($1,$2,$3,$4,'admin') RETURNING id, name, email, role`,
      [comp.rows[0].id, name, email.toLowerCase(), hash]
    );
    await client.query('COMMIT');
    const token = generateToken(user.rows[0].id);
    res.status(201).json({
      token,
      user: { ...user.rows[0], company: { id: comp.rows[0].id, name: company_name, tin } },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(422).json({ message: 'Email or TIN already exists.' });
    throw err;
  } finally {
    client.release();
  }
});

// GET /api/v1/user
router.get('/user', auth, (req, res) => {
  const u = req.user;
  res.json({
    id: u.id, name: u.name, email: u.email, role: u.role,
    company: { id: u.cid, name: u.cname, tin: u.ctin,
               vat_registered: u.vat_registered,
               vat_registered_since: u.vat_registered_since },
  });
});

// POST /api/v1/logout
router.post('/logout', auth, (_req, res) => {
  // JWT is stateless — client just drops the token
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
