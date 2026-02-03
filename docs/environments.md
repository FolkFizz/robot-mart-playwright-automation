# Environments & .env (Single Source of Truth)

This project uses a single `.env` file for both **local app** and **test** runs.
There is no `.env.test`. Keep everything in `.env`.

## Base URL behavior
- **Default**: `http://localhost:3000`
- **Override**: set `BASE_URL` in `.env` or via command
- **Prod run**: use `npm run test:prod` (sets BASE_URL to Render)

## Required variables
These are expected by the test project:
- `BASE_URL` (optional; defaults to `http://localhost:3000`)
- `DATABASE_URL` (single source of truth for DB)
- `TEST_API_KEY` (for `/api/test/seed` and `/api/test/reset`)
- `RESET_KEY` (for reset-stock endpoint)
- `USER_USERNAME`, `USER_PASSWORD`
- `ADMIN_USERNAME`, `ADMIN_PASSWORD`

## Optional variables
- `CHAOS_ENABLED` (true/false)
- `PAYMENT_MOCK` (e.g. `mock` or `stripe` if UI supports)
- `SEED_DATA` (`false` to skip auto seed/reset)
- `SEED_STOCK` (number to override stock after seed)

## Example .env
```env
BASE_URL=http://localhost:3000
DATABASE_URL=postgres://...
TEST_API_KEY=mytestkey
RESET_KEY=resetkey
USER_USERNAME=user
USER_PASSWORD=user123
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
CHAOS_ENABLED=false
PAYMENT_MOCK=mock
SEED_DATA=true
SEED_STOCK=100
```

## Safety notes
- When `BASE_URL` points to production (`robot-store-sandbox.onrender.com`),
  the reset/seed logic is automatically **skipped** to avoid destructive actions.
- For local runs, reset/seed will run (unless `SEED_DATA=false`).
