# 🤖 Robot Store Playwright Automation

Comprehensive E2E test automation framework for Robot Store Sandbox using Playwright and TypeScript with strict Page Object Model (POM) architecture.

---

## 📋 Table of Contents

- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Running Tests](#-running-tests)
- [Test Reports](#-test-reports)
- [The Golden Rules](#-the-golden-rules)
- [Test Categories](#-test-categories)
- [Configuration](#-configuration)
- [CI/CD](#-cicd)
- [Docker Support](#-docker-support)
- [Contributing](#-contributing)

---

## 🏗️ Project Structure

```
robot-store-playwright-automation/
├── .github/workflows/      # CI/CD workflows
├── configs/                # Configuration files (api, visual, performance)
├── src/
│   ├── pages/             # Page Object Models (Strict POM)
│   │   ├── auth/          # Authentication pages
│   │   ├── shopping/      # Shopping flow pages
│   │   ├── admin/         # Admin panel pages
│   │   ├── user/          # User dashboard pages
│   │   ├── public/        # Public pages (home, category, search)
│   │   ├── qa-tools/      # QA testing tools pages
│   │   ├── chatbot/       # Gemini chatbot pages
│   │   └── common/        # Shared components
│   ├── tests/
│   │   ├── ui/            # UI tests by feature
│   │   ├── api/           # API tests
│   │   ├── e2e/           # End-to-end flows
│   │   ├── visual/        # Visual regression tests
│   │   └── performance/   # Performance tests
│   ├── fixtures/          # Custom Playwright fixtures
│   ├── utils/             # Helper utilities
│   └── types/             # TypeScript type definitions
├── reports/               # Test reports output
│   ├── allure-results/    # Allure raw results
│   ├── allure-report/     # Allure HTML report
│   ├── html-report/       # Playwright HTML report
│   └── performance-results/ # Performance test results
├── test-data/             # Test data files
│   ├── visual/baseline/   # Visual regression baselines
│   ├── api/schemas/       # API schema definitions
│   └── load/              # Load test data
└── playwright.config.ts   # Main Playwright configuration
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **npm** or **yarn**
- **Git**

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd robot-store-playwright-automation

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Application URL
BASE_URL=https://robot-store-sandbox.onrender.com

# Test Credentials
TEST_USERNAME=testuser
TEST_PASSWORD=password123
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# API Configuration
API_TIMEOUT=30000

# Test Configuration
HEADLESS=true
SLOW_MO=0
```

---

## 🧪 Running Tests

### Basic Commands

```bash
# Run all tests
npx playwright test

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run tests in debug mode
npx playwright test --debug

# Run tests with UI mode (interactive)
npx playwright test --ui
```

### Run Tests by Category

#### 1. UI Tests

```bash
# All UI tests
npx playwright test src/tests/ui

# Authentication tests
npx playwright test src/tests/ui/auth

# Login tests only
npx playwright test src/tests/ui/auth/login.spec.ts

# Registration tests
npx playwright test src/tests/ui/auth/register.spec.ts

# Shopping tests
npx playwright test src/tests/ui/shopping

# Admin tests
npx playwright test src/tests/ui/admin

# User dashboard tests
npx playwright test src/tests/ui/user
```

#### 2. API Tests

```bash
# All API tests
npx playwright test src/tests/api

# Authentication API tests
npx playwright test src/tests/api/auth

# Shopping API tests
npx playwright test src/tests/api/shopping

# Admin API tests
npx playwright test src/tests/api/admin
```

#### 3. E2E Tests

```bash
# All E2E tests
npx playwright test src/tests/e2e

# Shopping flow
npx playwright test src/tests/e2e/shopping-flow.spec.ts

# Checkout flow
npx playwright test src/tests/e2e/checkout-flow.spec.ts

# User registration flow
npx playwright test src/tests/e2e/user-registration-flow.spec.ts
```

#### 4. Visual Regression Tests

```bash
# All visual tests
npx playwright test src/tests/visual

# Update visual baselines (when UI changes are intentional)
npx playwright test src/tests/visual --update-snapshots
```

#### 5. Performance Tests

```bash
# All performance tests
npx playwright test src/tests/performance

# Load tests only
npx playwright test src/tests/performance/load-test.spec.ts

# Stress tests
npx playwright test src/tests/performance/stress-test.spec.ts
```

### Run Tests by Browser

```bash
# Chromium only
npx playwright test --project=chromium

# Firefox only
npx playwright test --project=firefox

# WebKit (Safari) only
npx playwright test --project=webkit

# Mobile Chrome
npx playwright test --project=mobile-chrome

# All browsers
npx playwright test --project=chromium --project=firefox --project=webkit
```

### Run Tests by Tag

```bash
# Smoke tests only
npx playwright test --grep @smoke

# Regression tests
npx playwright test --grep @regression

# Exclude specific tags
npx playwright test --grep-invert @skip
```

### Parallel Execution

```bash
# Run with specific number of workers
npx playwright test --workers=4

# Run fully parallel
npx playwright test --fully-parallel

# Run serially (one at a time)
npx playwright test --workers=1
```

### Retry Failed Tests

```bash
# Retry failed tests 2 times
npx playwright test --retries=2

# Run only failed tests from last run
npx playwright test --last-failed
```

---

## 📊 Test Reports

### 1. HTML Report (Playwright Built-in)

**Generate and View:**

```bash
# Run tests (HTML report auto-generated)
npx playwright test

# View HTML report
npx playwright show-report reports/html-report

# Or open manually
open reports/html-report/index.html  # macOS
start reports/html-report/index.html # Windows
```

**Features:**

- ✅ Test results with screenshots
- ✅ Video recordings of failures
- ✅ Trace files for debugging
- ✅ Filterable by status/browser

**Location:** `reports/html-report/`

---

### 2. Allure Report

**Installation:**

```bash
# Install Allure CLI globally
npm install -g allure-commandline

# Or use npx (no installation needed)
```

**Generate and View:**

```bash
# Step 1: Install Allure reporter for Playwright
npm install -D allure-playwright

# Step 2: Add to playwright.config.ts (already configured)
# reporter: [['allure-playwright', { outputFolder: 'reports/allure-results' }]]

# Step 3: Run tests to generate results
npx playwright test

# Step 4: Generate Allure report
npx allure generate reports/allure-results -o reports/allure-report --clean

# Step 5: Open Allure report
npx allure open reports/allure-report
```

**One-liner:**

```bash
# Run tests and open Allure report
npx playwright test && npx allure generate reports/allure-results -o reports/allure-report --clean && npx allure open reports/allure-report
```

**Features:**

- ✅ Beautiful dashboard with charts
- ✅ Test history and trends
- ✅ Categories and suites
- ✅ Attachments (screenshots, videos, logs)
- ✅ Retries visualization

**Location:** `reports/allure-report/`

---

### 3. JSON Report

**Generate:**

```bash
# JSON report is auto-generated (configured in playwright.config.ts)
npx playwright test

# View raw JSON
cat reports/test-results.json
```

**Location:** `reports/test-results.json`

**Use Cases:**

- CI/CD integration
- Custom dashboards
- Test analytics

---

### 4. Performance Results

**Generate Performance Report:**

```bash
# Run performance tests
npx playwright test src/tests/performance

# Results are saved to
# reports/performance-results/

# View results
cat reports/performance-results/load-test-*.json
cat reports/performance-results/stress-test-*.json
```

**Custom Performance Reporting:**

```typescript
// In your test
import { PerformanceHelper } from "../utils/performance.helper";

test("measure page load", async ({ page }) => {
  const startTime = Date.now();
  await page.goto("/");
  const loadTime = Date.now() - startTime;

  // Save to performance results
  PerformanceHelper.saveMetric("page-load", loadTime);
});
```

**Location:** `reports/performance-results/`

---

### 5. Visual Regression Report

**Generate Baseline:**

```bash
# First run - creates baseline images
npx playwright test src/tests/visual
```

**Compare and Report:**

```bash
# Subsequent runs - compares against baseline
npx playwright test src/tests/visual

# View differences in HTML report
npx playwright show-report reports/html-report
```

**Update Baselines (when changes are intentional):**

```bash
npx playwright test src/tests/visual --update-snapshots
```

**Location:**

- Baselines: `test-data/visual/baseline/`
- Diffs: `reports/html-report/data/`

---

## 🎯 The Golden Rules

### 1. Strict Page Object Model (POM)

- **NEVER** use `page.locator()` or `page.click()` inside `*.spec.ts` files
- All selectors must be encapsulated in Page Classes in `src/pages/`
- Test files should read like plain English

**❌ Bad:**

```typescript
test("login", async ({ page }) => {
  await page.locator("#username").fill("user");
  await page.locator("#password").fill("pass");
  await page.click('button[type="submit"]');
});
```

**✅ Good:**

```typescript
test("login", async ({ loginPage }) => {
  await loginPage.goto();
  await loginPage.login("user", "pass");
});
```

### 2. Smart Fixtures over Hooks

- Avoid `test.beforeEach` for repetitive setup
- Use Custom Fixtures in `src/fixtures/`
- Example: `authedPage` fixture handles login automatically

**❌ Bad:**

```typescript
test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.fill("#username", "user");
  await page.fill("#password", "pass");
  await page.click("button");
});
```

**✅ Good:**

```typescript
test("view orders", async ({ authedPage }) => {
  // Already logged in!
  await authedPage.goto("/orders");
});
```

### 3. API Helpers for State Management

- Use `src/utils/*.helper.ts` for backend API interactions
- Set up test data via API, not UI
- Reset state between tests using API calls

**✅ Good:**

```typescript
test("add to cart", async ({ page }) => {
  // Create user via API (fast)
  const user = await AuthHelper.createUser();

  // Login via UI (what we're testing)
  const loginPage = new LoginPage(page);
  await loginPage.login(user.username, user.password);
});
```

---

## 🏷️ Test Categories

Use tags to organize and run specific test suites:

- **@smoke** - Critical path tests (run on every commit)
- **@regression** - Full regression suite (run nightly)
- **@e2e** - End-to-end user flows
- **@api** - API-only tests
- **@visual** - Visual regression tests
- **@performance** - Performance tests

**Example:**

```typescript
test.describe("@smoke Authentication", () => {
  test("should login successfully", async ({ loginPage }) => {
    // test code
  });
});
```

---

## ⚙️ Configuration

### Main Config: `playwright.config.ts`

```typescript
export default defineConfig({
  testDir: "./src/tests",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,

  use: {
    baseURL: process.env.BASE_URL || "https://robot-store-sandbox.onrender.com",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 5"] } },
  ],
});
```

### Additional Configs

- **API Config:** `configs/api.config.ts` - API endpoints and settings
- **Visual Config:** `configs/visual.config.ts` - Visual regression thresholds
- **Performance Config:** `configs/performance.config.ts` - Performance thresholds

---

## 🔄 CI/CD

### GitHub Actions Workflows

#### 1. CI Workflow (`.github/workflows/ci.yml`)

**Triggers:**

- Push to `main`, `test`, `develop` branches
- Pull requests to `main`

**Runs:**

- Chromium only (fast feedback)
- Uploads HTML report as artifact

#### 2. Nightly Workflow (`.github/workflows/nightly.yml`)

**Triggers:**

- Scheduled: Daily at 2 AM UTC
- Manual trigger via `workflow_dispatch`

**Runs:**

- All browsers (chromium, firefox, webkit)
- Full regression suite
- Uploads separate reports per browser

### View CI Reports

```bash
# Download artifacts from GitHub Actions
# Go to: Actions → Workflow Run → Artifacts → Download

# Extract and view
unzip playwright-report.zip
npx playwright show-report playwright-report/
```

---

## 🐳 Docker Support

### Run Tests in Docker

```bash
# Build and run
docker-compose up

# Run specific tests
docker-compose run playwright npx playwright test src/tests/ui/auth

# Run with custom environment
docker-compose run -e BASE_URL=http://localhost:3000 playwright npx playwright test
```

### Docker Compose Configuration

```yaml
services:
  playwright:
    image: mcr.microsoft.com/playwright:v1.40.0-focal
    working_dir: /app
    volumes:
      - .:/app
    command: npx playwright test
    environment:
      - BASE_URL=${BASE_URL:-https://robot-store-sandbox.onrender.com}
      - CI=true
```

---

## 🤝 Contributing

### Code Style

1. **File Naming:**
   - Pages: `kebab-case.page.ts` (e.g., `login.page.ts`)
   - Tests: `kebab-case.spec.ts` (e.g., `login.spec.ts`)
   - Components: `kebab-case.component.ts`

2. **Class Naming:**
   - PascalCase (e.g., `LoginPage`, `CartPage`)

3. **Method Naming:**
   - camelCase (e.g., `login()`, `addToCart()`)

### Adding New Tests

1. Create page object in `src/pages/`
2. Create test file in appropriate `src/tests/` subdirectory
3. Use fixtures from `src/fixtures/test-data.ts`
4. Add appropriate tags (`@smoke`, `@regression`)
5. Run tests locally before committing

### Pull Request Checklist

- [ ] Tests pass locally
- [ ] New tests added for new features
- [ ] Page objects follow POM principles
- [ ] No `page.locator()` in test files
- [ ] Environment variables documented
- [ ] README updated if needed

---

## 📚 Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Allure Report](https://docs.qameta.io/allure/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Robot Store Sandbox](https://robot-store-sandbox.onrender.com)

---

## 📝 License

ISC

---

## 🆘 Troubleshooting

### Common Issues

**1. Tests failing with timeout:**

```bash
# Increase timeout in playwright.config.ts
use: {
  actionTimeout: 15000,
  navigationTimeout: 45000,
}
```

**2. Browsers not installed:**

```bash
npx playwright install --with-deps
```

**3. Port already in use (HTML report):**

```bash
# Specify different port
npx playwright show-report reports/html-report --port 9324
```

**4. Allure command not found:**

```bash
# Install globally
npm install -g allure-commandline

# Or use npx
npx allure --version
```

**5. Visual tests failing after UI changes:**

```bash
# Update baselines if changes are intentional
npx playwright test src/tests/visual --update-snapshots
```

---

**Happy Testing! 🚀**
