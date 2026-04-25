const express = require('express');
const cors    = require('cors');
const path    = require('path');

const uploadRouter = require('./routes/upload');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
}));
app.use(express.json());

// Serve uploaded files statically (for preview in frontend)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/ocr', uploadRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'cashflow-ocr' });
});

app.listen(PORT, () => {
  console.log(`OCR service running on port ${PORT}`);
});
