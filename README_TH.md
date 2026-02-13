# Robot Store Playwright Automation

เอกสารหลักของ repository นี้
โปรเจกต์นี้รวม Playwright (functional) และ k6 (performance) testing สำหรับ Robot Store sandbox app

## 1. ขอบเขตของ Repo นี้

- UI/API/Integration/Security/A11y test ด้วย Playwright
- Performance/load test ด้วย k6
- Safe production smoke check (`@smoke`, `@safe`)
- Local deterministic test setup พร้อม reset/seed hook

## 2. Tech Stack

- Node.js + TypeScript
- Playwright (`@playwright/test`)
- k6
- Prometheus + Grafana (optional — สำหรับ k6 live monitoring)
- Allure (`allure-playwright`, `allure-commandline`)
- axe (`@axe-core/playwright`)
- ESLint + Prettier
- PostgreSQL client (`pg`)

## 3. Prerequisites

1. ติดตั้ง dependencies:

```bash
npm install
```

2. เตรียม environment profile:

- Copy `.env.local.example` → `.env.local`
- Copy `.env.prod.example` → `.env.prod`
- Activate profile ที่ต้องการเป็น `.env`:

```bash
npm run env:use:local
# หรือ
npm run env:use:prod
```

3. หากใช้ local mode ให้รัน companion app (`robot-store-sandbox`) ที่ `http://localhost:3000`

4. หากต้องการรัน performance test ให้ติดตั้ง k6 ด้วย

5. Optional (สำหรับ k6 live monitoring dashboard): ติดตั้ง Docker Desktop หรือ Docker Engine

## 4. Environment Strategy

### Profiles

- `.env.local`
  - `APP_BASE_URL=http://localhost:3000`
  - Optional k6-only override: `K6_BASE_URL=...` (โดยทั่วไปปล่อยว่างไว้เพื่อ reuse `APP_BASE_URL`)
  - `DATABASE_URL` ยังคงจำเป็นสำหรับ direct-DB integration check และ fallback seeding
  - แนะนำ local setup: Docker Postgres URL (`postgresql://postgres:password_local_docker@localhost:5433/robot_store_sandbox`)
  - `SEED_DATA=true` สำหรับ deterministic local run

- `.env.prod`
  - `APP_BASE_URL=https://robot-store-sandbox.onrender.com`
  - Optional k6-only override: `K6_BASE_URL=...` (ตั้งค่าเฉพาะเมื่อ perf target ต่างจาก Playwright target)
  - `DATABASE_URL` ควรชี้ไปที่ Neon/production branch
  - ใช้สำหรับ hosted safe check
  - `SEED_DATA=false`

### URL Resolution

- Playwright target:
  1. `APP_BASE_URL`
  2. fallback `http://localhost:3000`

- k6 target:
  1. `K6_BASE_URL`
  2. `APP_BASE_URL`
  3. fallback `http://localhost:3000`

Legacy target variable จากเวอร์ชันเก่า (`BASE_URL`, `PERF_BASE_URL`, `REAL_URL`) ยังคงอ่านได้เป็น fallback เพื่อไม่ให้ script เก่าพัง สำหรับ setup ใหม่ให้ใช้เพียง:

- `APP_BASE_URL` (shared target หลัก)
- `K6_BASE_URL` (optional k6-only override)

ตรวจสอบ active target:

```bash
npm run env:targets
```

### Safety Rules

- Destructive hook (`/api/test/reset`, `/api/test/seed`) อนุญาตเฉพาะ localhost เป็นค่า default
- Test ที่ต้องการสิทธิ์ mutate stock จะถูกข้ามบน hosted target เป็นค่า default
- Override เฉพาะเมื่อตั้งใจ:
  - `ALLOW_DESTRUCTIVE_TEST_HOOKS=true`

## 5. Run Modes

### Quick reviewer mode (hosted, ไม่ต้องมี companion repo)

```bash
npm run env:use:prod
npm run env:targets
npm run test:smoke
```

### Local dev mode

ใน `robot-store-sandbox`:

```bash
docker compose up -d
```

ใช้คำสั่งนี้เป็น default local startup (app + db + mailpit)

หยุด local stack:

```bash
docker compose down
```

Reset local DB volume:

```bash
docker compose down -v
```

ใน repo นี้:

```bash
npm run env:use:local
npm run env:targets
npm run ci:quick
npm run test
```

### Safe production check

```bash
npm run test:prod
```

`test:prod` รันเฉพาะ test ที่ tag `@smoke|@safe`

### Local vs Production Test Matrix

**Playwright:**

| Scope | Recommended target | Commands |
| --- | --- | --- |
| Full/active development coverage | Local (`APP_BASE_URL=http://localhost:3000`) | `npm run test`, `npm run test:regression`, `npm run test:api`, `npm run test:a11y`, `npm run test:quick-regression`, `npm run test:quick-regression:stable` |
| Lightweight hosted sanity check | Production (`APP_BASE_URL=https://...onrender.com`) | `npm run test:prod`, `npm run test:smoke` |
| Stock-mutation / privileged check | Local เป็นค่า default (hosted run ต้องการ explicit override) | `tests/api/admin.api.spec.ts`, `tests/integration/product-cart.int.spec.ts` |

**k6:**

| Scope | Recommended target | Commands |
| --- | --- | --- |
| Low-risk hosted perf smoke | Production (`K6_BASE_URL` ว่าง จะ follow `APP_BASE_URL`) | `npm run test:perf:smoke`, `npm run test:perf:auth`, `npm run test:perf:browse`, `npm run test:perf:breakpoint`, `npm run test:perf:suite:lite` |
| Write-heavy / capacity profiling | Local | `npm run test:perf:cart`, `npm run test:perf:checkout`, `npm run test:perf:checkout-acceptance`, `npm run test:perf:race`, `npm run test:perf:load`, `npm run test:perf:load-acceptance`, `npm run test:perf:stress`, `npm run test:perf:soak`, `npm run test:perf:suite`, `npm run test:perf:suite:gate` |

**หมายเหตุ:**
- `K6_BASE_URL` เป็น optional — ปล่อยว่างไว้เพื่อ reuse `APP_BASE_URL`
- Playwright integration flow บางส่วนอ่าน `DATABASE_URL` โดยตรง ดังนั้นให้ `DATABASE_URL` ชี้ตรงกับ environment ที่ใช้งาน (`local Docker DB` สำหรับ local run, `Neon prod` สำหรับ hosted check)

## 6. Test Architecture

### Layering

1. `tests/**`
   - เป็นเจ้าของ flow และ assertion ของตัวเอง
   - ให้ spec อ่านง่ายและสื่อ intent ชัดเจน

2. `src/pages/**`
   - Page Object เก็บ selector และ UI interaction

3. `src/fixtures/**`
   - Typed shared setup/context (API, auth, seed lifecycle)

4. `src/test-support/**`
   - Cross-spec helper

5. `src/api/**`
   - Reusable API client และ request wrapper

6. `src/config/**`, `src/data/**`
   - Env, route, constant, test data

7. `performance/**`
   - k6 shared library, scenario, threshold และ script

### Repository Structure

```text
src/
tests/
performance/
scripts/
.github/workflows/
```

## 7. Test Taxonomy และ Tag

### Taxonomy

- Functional: `tests/api`, `tests/integration`, `tests/e2e`
- Non-functional: `tests/a11y`, `tests/security`
- Performance: `performance/scripts/*.k6.js`

### Core tags

- `@smoke`: fast check
- `@regression`: broader coverage
- `@api`, `@a11y`, `@security`
- `@ai-mock`: deterministic chatbot check (ไม่ใช้ external LLM quota)
- `@ai-live`: low-volume live canary check (จำกัด quota)

### Safety tags

- `@safe`: non-destructive
- `@destructive`: เปลี่ยนแปลงข้อมูล

**แนวทาง:**
- ใช้ `@safe` สำหรับ read-only test
- ใช้ `@destructive` เมื่อเปลี่ยนแปลงข้อมูล (seed/reset/checkout/admin write)

### AI Test Lanes

- **`@ai-mock` lane:**
  - default lane สำหรับ chatbot suite
  - คาดหวัง deterministic backend response (price/stock/safety) โดยไม่ใช้ Gemini live quota

- **`@ai-live` lane:**
  - small canary-only live suite
  - มี daily budget script gate ก่อน execute
  - รันด้วย `--workers=1` เพื่อหลีกเลี่ยง burst request

## 8. Command Reference

### Playwright

```bash
npm run test
npm run test:smoke
npm run test:regression
npm run test:api
npm run test:a11y
npm run test:quick-regression
npm run test:quick-regression:stable
npm run test:prod
npm run test:ai:mock
npm run test:ai:live
npm run ai:budget:report
npm run ai:budget:check
npm run ai:budget:consume
```

รัน single file:

```bash
npx playwright test tests/e2e/catalog.e2e.spec.ts --project=chromium
```

รันตาม tag:

```bash
npx playwright test --grep "@smoke"
```

### Quality gates

```bash
npm run format
npm run format:check
npm run typecheck
npm run lint
npm run lint:fix
npm run ci:quality
npm run ci:quick
```

### Reporting

```bash
npm run allure:clean
npm run report:allure
npm run report:open
npm run report:snapshots
```

### Environment และ Stock Utilities

```bash
npm run env:use:local
npm run env:use:prod
npm run env:targets
npm run stock:reset
npm run stock:reset:local
npm run stock:reset:prod
```

### k6

```bash
npm run test:perf:smoke
npm run test:perf:auth
npm run test:perf:browse
npm run test:perf:cart
npm run test:perf:checkout
npm run test:perf:checkout-acceptance
npm run test:perf:race
npm run test:perf:load
npm run test:perf:load-acceptance
npm run test:perf:stress
npm run test:perf:soak
npm run test:perf:breakpoint
npm run test:perf:suite
npm run test:perf:suite:lite
npm run test:perf:suite:gate
npm run test:perf:smoke:monitor
npm run test:perf:suite:monitor
npm run test:perf:suite:gate:monitor
npm run monitor:up
npm run monitor:status
npm run monitor:logs
npm run monitor:down
npm run monitor:down:volumes
```

### Docker

```bash
docker compose run --rm qa-playwright
docker compose run --rm qa-k6
docker compose -f docker-compose.monitor.yml up -d
```

สำหรับ container → local app testing:

```bash
APP_BASE_URL=http://host.docker.internal:3000
```

## 9. Accessibility และ Allure

### Accessibility (axe)

```bash
npm run test:a11y
# หรือ
npx playwright test tests/a11y --grep "@a11y"
```

A11y helper behavior รวมศูนย์อยู่ที่ `src/utils/a11y.ts`

### Allure

```bash
npm run report:allure
npm run report:open
```

Allure artifact ถูก generate จาก `allure-results`

## 10. Performance Monitoring (Prometheus + Grafana)

Repository นี้มี local monitoring stack สำหรับ k6 พร้อมใช้งาน:

- Prometheus รับ k6 metric ผ่าน remote write
- Grafana auto-provision datasource + dashboard เมื่อ startup
- Dashboard file อยู่ที่ `monitoring/grafana/dashboards/k6-overview.json` (versioned)

Start stack:

```bash
npm run monitor:up
npm run monitor:status
```

รัน k6 พร้อม remote-write output:

```bash
npm run test:perf:smoke:monitor
# หรือ
npm run test:perf:suite:monitor
```

เปิด UI:

- Grafana: `http://localhost:3001` (default login `admin` / `admin`)
- Prometheus: `http://localhost:9090`

Stop stack:

```bash
npm run monitor:down
```

**หมายเหตุ:**
- Grafana ใช้ port `3001` เพื่อหลีกเลี่ยง conflict กับ local app (`localhost:3000`)
- stack นี้ไม่ได้แทนที่ Allure
- Allure = Playwright functional test report, Prometheus/Grafana = k6 runtime metric

### Visual Gallery (Allure + Grafana + Prometheus)

รูปภาพเหล่านี้ออกแบบสำหรับ portfolio/reviewer-friendly README preview

![Allure Report Overview](assets/readme/allure-overview.png)
![Grafana k6 Overview](assets/readme/grafana-k6-overview.png)
![Prometheus k6 Query Overview](assets/readme/prometheus-overview.png)

Refresh snapshot:

```bash
npm run report:allure
npm run monitor:up
npm run test:perf:smoke:monitor
npm run report:snapshots
```

**หมายเหตุ:**
- Snapshot output บันทึกไปที่ `assets/readme/`
- หาก service ใด unavailable script จะเขียน placeholder image ที่ clean เพื่อไม่ให้ README พัง
- Optional env override:
  - `GRAFANA_URL`, `GRAFANA_DASHBOARD_URL`, `GRAFANA_USER`, `GRAFANA_PASSWORD`
  - `PROMETHEUS_URL`, `PROMETHEUS_GRAPH_URL`

## 11. CI/CD Coverage

### Active CI Workflows

- `.github/workflows/quick-regression.yml`
- `.github/workflows/ui-smoke.yml`
- `.github/workflows/api.yml`
- `.github/workflows/a11y.yml`
- `.github/workflows/ai-live-manual.yml`
- `.github/workflows/regression-nightly.yml`
- `.github/workflows/k6-nightly.yml`

### CI Behavior Summary

- **`quick-regression`:** `ci:quality` + quick smoke/regression subset
- **`ui-smoke`:** safe UI/security/a11y slice
- **`api`:** API smoke/security slice
- **`a11y`:** accessibility smoke slice
- **`ai-live-manual`:** manual low-volume live AI canary suite (`@ai-live`) พร้อม budget gate (state cache ต่อ UTC day)
- **`regression-nightly`:** wider regression subset
- **`k6-nightly`:** performance gate suite

**CI default ทั่วไป:**
- `@chat`/`@ai` ถูก exclude ใน routine run
- `@ai-live` ใช้สำหรับ manual/controlled run พร้อม budget gate (`npm run test:ai:live`)
- destructive test ถูก exclude ออกจาก PR-safe path
- artifact ถูก upload (`playwright-report`, `test-results`, `allure-*`, `performance/results/*`)
- nightly schedule รันเฉพาะเมื่อ repo variable `ENABLE_NIGHTLY=true`
- `k6-nightly` default เป็น `lite` profile เพื่อลด hosted DB load (manual dispatch สามารถรัน `gate`/`portfolio` ได้)

## 12. Performance Evidence Snapshot

Latest committed evidence reference:

- Portfolio manifest: `performance/results/20260209-121019-portfolio/manifest.md`
- Gate manifest: `performance/results/20260209-122753-gate/manifest.md`
- Latest pointer: `performance/results/latest.txt`

**Bottleneck ที่พบจาก gate/portfolio artifact ล่าสุด:**

- `checkout-strict`: ผลลัพธ์ไม่คาดคิดและ checkout latency สูงเกินไปภายใต้ spike
- `stress-quick`: p95 response time เกิน threshold
- `soak-quick`: p95 response time เกิน threshold ภายใต้ sustained load

**Backlog work item:**

1. Stabilize checkout ภายใต้ concurrency (`checkout-strict` gate failure)
2. ลด stress p95 latency ให้ถึง threshold target
3. ปรับปรุง soak p95 stability ตลอด sustained duration

## 13. Known Limitations / Trade-offs

- `@chat`/`@ai` test ถูก exclude ออกจาก routine CI เนื่องจาก external dependency และ cost ที่ผันแปร
- k6 threshold อาจ fail ใน shared hosted environment เพราะ runtime/network condition ไม่แน่นอน
- Destructive test path ถูกจำกัดโดยตั้งใจเพื่อความปลอดภัย

## 14. Troubleshooting

### Test fail ด้วย 403 บน `/api/test/reset`

สาเหตุที่เป็นไปได้:

- target เป็น hosted environment ที่ destructive hook ถูกปิดไว้
- `TEST_API_KEY`/`RESET_KEY` ไม่ถูกต้อง
- backend test hook ไม่ได้เปิดใช้งานสำหรับ environment นั้น

### Checkout/perf failure เพราะ stock ต่ำ

Reset stock ก่อนรัน stock-sensitive test:

```bash
npm run stock:reset:local
# หรือ
npm run stock:reset:prod
```

### Allure generation ช้า/ค้าง

ลบ artifact เก่าก่อน:

```bash
npm run allure:clean
npm run test:smoke
npm run report:allure
```

## 15. Portfolio Reviewer Path (แนะนำ)

สำหรับการ review ที่เร็วและ reproducible ที่สุด:

1. `npm install`
2. `npm run env:use:prod`
3. `npm run ci:quality`
4. `npm run test:smoke`
5. `npm run report:allure`

sequence นี้ตรวจสอบ code quality, smoke stability และ report generation ด้วย setup ขั้นต่ำ

## 16. Final QA Checklist (Project Close-Out)

ใช้ checklist นี้ก่อนประกาศว่าโปรเจกต์เสร็จสมบูรณ์:

- [ ] เลือก target profile และตรวจสอบ:
  - `npm run env:use:local` หรือ `npm run env:use:prod`
  - `npm run env:targets`
- [ ] Local stack health (เมื่อ test local):
  - ใน `robot-store-sandbox`: `docker compose up -d`
  - ยืนยันว่า app เปิดได้ที่ `http://localhost:3000`
- [ ] Quality gate ผ่าน:
  - `npm run ci:quality`
- [ ] Core regression ผ่าน (Chromium, safe slice):
  - `npm run ci:quick`
- [ ] Hosted safe check ผ่าน:
  - `npm run test:prod`
- [ ] Functional report ถูก generate:
  - `npm run report:allure`
- [ ] Performance suite ผ่าน (แนะนำ local สำหรับ heavy profile):
  - `npm run test:perf:suite:lite`
  - `npm run test:perf:suite:gate` (optional สำหรับ capacity evidence)
- [ ] Monitoring evidence ถูก capture (k6 + Grafana):
  - รัน stack: `npm run monitor:up`
  - `npm run report:snapshots`
  - เก็บ dashboard/result artifact ไว้ใน `performance/results/*`
- [ ] CI workflow แสดง green run อย่างน้อยหนึ่งครั้ง:
  - `quick-regression`, `ui-smoke`, `api`, `a11y`, `regression-nightly`, `k6-nightly`
- [ ] Cleanup ไฟล์ชั่วคราวก่อน commit:
  - เช่น result file local-only ที่ไม่จำเป็นใน `performance/results/`
- [ ] อัปเดต portfolio evidence pointer ใน README นี้หากมีการเปลี่ยนแปลง

**Exit criteria:**

- Playwright safe/quick suite เป็น green
- k6 lite (และ gate หากรัน) มี pass/fail signal ที่ชัดเจนพร้อม document ไว้
- Allure + Grafana evidence พร้อมสำหรับ reviewer walkthrough