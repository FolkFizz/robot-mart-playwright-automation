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

## 📊 Scenarios

| Scenario       | Description                 | Purpose                                   |
| :------------- | :-------------------------- | :---------------------------------------- |
| **Smoke**      | 1 User, Short duration      | Verify system health before larger tests. |
| **Concurrent** | 20 Users, Shared iterations | Test race conditions and data integrity.  |
| **Load**       | (Planned) Gradual ramp-up   | Measure performance under expected usage. |
| **Stress**     | (Planned) High load         | Determine breaking point.                 |
