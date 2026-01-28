# K6 Performance Tests

This directory contains K6 performance and load tests for the Robot Store application.

## Prerequisites

Install K6:

```bash
# Windows (using Chocolatey)
choco install k6

# macOS (using Homebrew)
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Running K6 Tests

### Race Condition / Stock Test

This test simulates concurrent users trying to purchase the same product to verify stock management under high load.

```bash
# Run with required environment variables
k6 run -e RESET_KEY=your_reset_key src/tests/performance/race-stock.k6.js

# Run with mock payment (faster)
k6 run -e RESET_KEY=your_reset_key -e PAYMENT_MOCK=mock src/tests/performance/race-stock.k6.js

# Run with custom VUs (virtual users)
k6 run -e RESET_KEY=your_reset_key --vus 100 src/tests/performance/race-stock.k6.js
```

### Test Configuration

- **VUs (Virtual Users):** 50 (default)
- **Iterations:** 1 per VU
- **Max Duration:** 1 minute
- **Scenario:** Oversell prevention test

### What This Test Validates

1. ✅ Stock is reset before test
2. ✅ Multiple users can register concurrently
3. ✅ Users can add items to cart simultaneously
4. ✅ Checkout prevents overselling (stock management)
5. ✅ System handles race conditions correctly

### Expected Results

- **Success (200):** Order placed successfully
- **Out of Stock (400):** Stock depleted, order rejected (correct behavior)
- **Threshold:** HTTP request failure rate < 10%

### Viewing Results

K6 provides real-time console output showing:

- Request rates
- Response times
- Success/failure rates
- Custom check results

For detailed reports, use:

```bash
k6 run --out json=reports/performance-results/k6-results.json src/tests/performance/race-stock.k6.js
```

## Integration with Playwright

While K6 tests run independently, you can trigger them from Playwright tests:

```typescript
import { test } from "@playwright/test";
import { exec } from "child_process";

test("run K6 load test", async () => {
  await new Promise((resolve, reject) => {
    exec("k6 run src/tests/performance/race-stock.k6.js", (error, stdout) => {
      if (error) reject(error);
      console.log(stdout);
      resolve(stdout);
    });
  });
});
```
