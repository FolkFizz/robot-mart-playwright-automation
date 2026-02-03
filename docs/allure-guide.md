# Allure Guide

Allure reporting is enabled in `playwright.config.ts`.

## Run tests
```bash
npx playwright test
```

## Generate report
```bash
npm run report:allure
```

## Open report
```bash
npm run report:open
```

## Attachments
Use helpers in `src/utils/allure.ts`:
- `attachText`
- `attachJson`
- `attachScreenshot`

> Note: If Allure CLI is not installed, report generation/open will not work.
