const axios = require('axios');

const client = axios.create({
  baseURL: process.env.LARAVEL_API_URL || 'http://127.0.0.1:8001/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type':  'application/json',
    'Accept':        'application/json',
    'X-OCR-Token':   process.env.LARAVEL_INTERNAL_TOKEN || 'ocr-internal-secret-token',
  },
});

/**
 * Submit extracted invoice data to the Laravel API.
 * @param {Object} payload
 * @returns {Promise<Object>} Created invoice from Laravel
 */
async function submitToLaravel(payload) {
  try {
    const { data } = await client.post('/invoices/ocr-submit', payload);
    return data;
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    throw new Error(`Laravel submission failed: ${msg}`);
  }
}

module.exports = { submitToLaravel };
