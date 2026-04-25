# Cashflow Tax — Backend

Two services, one PostgreSQL database.

## Services

| Service | Port | Stack |
|---------|------|-------|
| Laravel API | 8000 | PHP 8.3, Laravel 11, Sanctum |
| OCR Microservice | 3001 | Node.js 20, Express, Tesseract.js |
| PostgreSQL | 5432 | Postgres 16 |

## Quick Start

```bash
cd cashflow-backend

# 1. Start all services
docker-compose up --build

# 2. Run migrations + seed (first time only)
docker exec cashflow_laravel php artisan migrate --seed

# 3. Generate app key (first time only)
docker exec cashflow_laravel php artisan key:generate
```

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/register | Register company + admin user |
| POST | /api/v1/login | Login, returns Sanctum token |
| POST | /api/v1/logout | Revoke token |
| GET  | /api/v1/user | Current user + company |

### Invoices
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | /api/v1/invoices | List (filterable by type, status, period, search) |
| POST | /api/v1/invoices | Create invoice (auto-calculates VAT 15%, WHT 2/3%) |
| GET  | /api/v1/invoices/{id} | Get single invoice |
| PUT  | /api/v1/invoices/{id} | Update invoice |
| DELETE | /api/v1/invoices/{id} | Soft delete |
| PATCH | /api/v1/invoices/{id}/status | Update status only |

### OCR (Node service)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/ocr/extract-only | Upload image → returns extracted fields for review |
| POST | /api/ocr/upload | Upload image → extract → auto-submit to Laravel |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/reports/csv?tax_period=YYYY-MM | ERA e-Tax CSV download |
| GET | /api/v1/reports/pdf?tax_period=YYYY-MM | PDF tax summary |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/dashboard?tax_period=YYYY-MM | Metrics, trend, recent invoices |

## Tax Logic

- VAT: 15% of taxable amount
- Withholding: 2% for Purchases, 3% for Sales
- Net VAT Payable = Output VAT (Sales) − Input VAT (Purchases)

## Environment Variables

Copy `.env.example` to `.env` in `laravel-api/` and update as needed.
Frontend: copy `.env.local` at the repo root (already created).
