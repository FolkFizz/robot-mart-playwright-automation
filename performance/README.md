# 🚀 Performance Testing (k6)

This directory contains performance testing scripts using [k6](https://k6.io/).
The framework is designed to verify system stability and response times under load, supporting both local and production environments.

## 📂 Structure

- **`scripts/`**: proper k6 test scripts (e.g., `smoke.k6.js`).
- **`scenarios/`**: Reusable load profiles (e.g., `smoke`, `stress`, `soak`).
- **`lib/`**: Shared configuration and logic.
- **`thresholds/`**: Pass/Fail criteria logic.

## 🛠️ Prerequisites

1.  **Install k6**: [Installation Guide](https://k6.io/docs/get-started/installation/)
    - Windows: `winget install k6` or `choco install k6`
    - Mac: `brew install k6`
2.  **Environment Variables**:
    - The tests automatically load variables from the root `.env` file.
    - Ensure `REAL_URL` or `BASE_URL` is set.

## 🏃‍♂️ How to Run

Reference the custom runner script in `package.json`:

```bash
# Run a quick Smoke Test (1 VU, 1 min) - Checks if system is alive
npm run test:perf:smoke

# Run Race Condition Test (20 VUs competing for same resource)
npm run test:perf:race
```

## ⚙️ Configuration

The configuration logic is in `lib/config.js`. It intelligently selects the target environment:

1.  **`REAL_URL`** (Highest Priority): Used for testing Production/Staging.
2.  **`BASE_URL`**: Used for testing Localhost.
3.  **Default**: `http://localhost:3000`

To test against a specific environment, usually you just update your `.env` file or pass variables to the runner.

## 📊 Test Types

We provide comprehensive performance testing across 4 main categories:

### 1️⃣ Load Testing (Normal Conditions)

| Script             | Scenario | Description                         | Duration |
| :----------------- | :------- | :---------------------------------- | :------- |
| **smoke.k6.js**    | smoke    | Health check (1 VU)                 | 60s      |
| **browse.k6.js**   | ramping  | Browse products under gradual load  | 2m       |
| **cart.k6.js**     | ramping  | Cart operations under gradual load  | 2m       |
| **checkout.k6.js** | spike    | Checkout under traffic spike        | 1.5m     |
| **load.k6.js**     | load     | Full E2E journey (20 VUs sustained) | 5m       |

### 2️⃣ Stress Testing (Breaking Point)

| Script           | Scenario | Description                    | Duration |
| :--------------- | :------- | :----------------------------- | :------- |
| **stress.k6.js** | stress   | Find system limits (0→150 VUs) | 9m       |

### 3️⃣ Spike & Soak Testing (Resilience)

| Script                   | Scenario   | Description                                | Duration |
| :----------------------- | :--------- | :----------------------------------------- | :------- |
| **race-condition.k6.js** | concurrent | Test race conditions (20 VUs simultaneous) | 30s      |
| **soak.k6.js**           | soak       | Long-duration stability (10 VUs)           | 30m      |

### 4️⃣ Scalability & Capacity

| Script               | Scenario   | Description                   | Duration |
| :------------------- | :--------- | :---------------------------- | :------- |
| **breakpoint.k6.js** | breakpoint | Max throughput (10→300 req/s) | 4m       |

## 🏃‍♂️ Quick Start

```bash
# 1. Health check (always run first)
npm run test:perf:smoke

# 2. Load testing (normal conditions)
npm run test:perf:load

# 3. Stress testing (find limits)
npm run test:perf:stress

# 4. Soak testing (long-duration, 30min)
npm run test:perf:soak

# 5. Breakpoint testing (max capacity)
npm run test:perf:breakpoint

# 6. Race condition testing
npm run test:perf:race
```
