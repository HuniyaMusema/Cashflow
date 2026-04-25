const jwt  = require('jsonwebtoken');
const pool = require('../db/pool');

const JWT_SECRET = process.env.JWT_SECRET || 'abz-tax-secret';

async function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthenticated.' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const { rows } = await pool.query(
      `SELECT u.*, c.id AS cid, c.name AS cname, c.tin AS ctin,
              c.vat_registered, c.vat_registered_since
       FROM users u JOIN companies c ON c.id = u.company_id
       WHERE u.id = $1`,
      [payload.userId]
    );
    if (!rows.length) return res.status(401).json({ message: 'Unauthenticated.' });

    req.user       = rows[0];
    req.companyId  = rows[0].cid;
    next();
  } catch {
    return res.status(401).json({ message: 'Unauthenticated.' });
  }
}

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

module.exports = { auth, generateToken };
