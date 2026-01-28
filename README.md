# Robot Store Playwright Automation

Comprehensive E2E test automation framework for Robot Store Sandbox using Playwright and TypeScript.

## 🎯 Project Structure

```
robot-store-playwright-automation/
├── configs/              # Configuration files
├── src/
│   ├── pages/           # Page Object Models (Strict POM)
│   ├── tests/           # Test specifications
│   ├── fixtures/        # Custom fixtures and test data
│   ├── utils/           # Helper utilities
│   └── types/           # TypeScript type definitions
├── reports/             # Test reports
└── test-data/           # Test data files
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
npx playwright install
```

### Running Tests

```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test src/tests/ui/auth/login.spec.ts

# Run tests in headed mode
npx playwright test --headed

# Run tests in specific browser
npx playwright test --project=chromium

# Run tests with tag
npx playwright test --grep @smoke
```

### View Reports

```bash
npx playwright show-report reports/html-report
```

## 📋 The Golden Rules

### 1. Strict Page Object Model (POM)

- **NEVER** use `page.locator()` or `page.click()` inside `*.spec.ts` files
- All selectors must be encapsulated in Page Classes in `src/pages/`
- Test files should read like plain English

### 2. Smart Fixtures over Hooks

- Avoid `test.beforeEach` for repetitive setup
- Use Custom Fixtures in `src/fixtures/`
- Example: `authedPage` fixture handles login automatically

### 3. API Helpers for State Management

- Use `src/utils/*.helper.ts` for backend API interactions
- Set up test data via API, not UI
- Reset state between tests using API calls

## 🧪 Test Categories

- **@smoke** - Critical path tests
- **@regression** - Full regression suite
- **@e2e** - End-to-end user flows

## 🔧 Configuration

Environment variables in `.env`:

```
BASE_URL=https://robot-store-sandbox.onrender.com
TEST_USERNAME=testuser
TEST_PASSWORD=password123
```

## 📊 CI/CD

GitHub Actions workflows:

- `ci.yml` - Runs on every push/PR
- `nightly.yml` - Comprehensive nightly tests

## 🤝 Contributing

1. Follow the Golden Rules
2. Use kebab-case for files
3. Use PascalCase for classes
4. Use camelCase for methods
5. Add `@smoke` or `@regression` tags to tests

## 📝 License

ISC
