# TEST REPORT

Generated At: 2026-02-14T14:26:09.173Z
Run Started At: 2026-02-14T14:16:42.126Z
Environment: N/A

## Table of Contents

- [Section 1: Executive Summary](#section-1-executive-summary)
- [Section 2: Detail by Category](#section-2-detail-by-category)
- [a11y](#a11y)
- [api](#api)
- [e2e](#e2e)
- [integration](#integration)
- [security](#security)

## Section 1: Executive Summary

Overall: **13/18 passed** (72.22% pass rate, skipped: 0)

| Category | Total | Passed | Failed | Skipped | Pass Rate |
|---|---:|---:|---:|---:|---:|
| a11y | 18 | 13 | 5 | 0 | 72.22% |
| api | 0 | 0 | 0 | 0 | 0.00% |
| e2e | 0 | 0 | 0 | 0 | 0.00% |
| integration | 0 | 0 | 0 | 0 | 0.00% |
| security | 0 | 0 | 0 | 0 | 0.00% |

## Section 2: Detail by Category

### a11y

| File | Total | Passed | Failed | Skipped | Pass Rate |
|---|---:|---:|---:|---:|---:|
| a11y/mobile.a11y.spec.ts | 18 | 13 | 5 | 0 | 72.22% |

#### Failure Notes

| File Name | Test Case Name | Root Cause / Error | Action / Ticket | Status |
|---|---|---|---|---|
| a11y/mobile.a11y.spec.ts | [pixel] A11Y-MOB-P03: hidden QA menu stays non-readable when collapsed @a11y @mobile @regression | QA menu trigger is implemented as a non-semantic div without interactive role/name contract. | A11Y-101 | Fixing |
| a11y/mobile.a11y.spec.ts | [iphone] A11Y-MOB-P02: default mobile layout reflows without horizontal overflow @a11y @mobile @regression | iPhone Safari layout still overflows horizontally due to fixed-width nav/content containers. | RESP-224 | Investigating |
| a11y/mobile.a11y.spec.ts | [iphone] A11Y-MOB-P03: hidden QA menu stays non-readable when collapsed @a11y @mobile @regression | QA menu trigger is implemented as a non-semantic div without interactive role/name contract. | A11Y-101 | Fixing |
| a11y/mobile.a11y.spec.ts | [iphone] A11Y-MOB-N02: 200% text scale does not break reflow for core controls @a11y @mobile @regression | Error: expect(received).toBeLessThanOrEqual(expected) Expected: <= 1 Received: 813 | - | 🔴 New Bug / Investigate |
| a11y/mobile.a11y.spec.ts | [iphone] A11Y-MOB-E02: 250% text scale in landscape keeps controls reflow-safe @a11y @mobile @regression | Error: expect(received).toBeLessThanOrEqual(expected) Expected: <= 1 Received: 711 | - | 🔴 New Bug / Investigate |

### api

| File | Total | Passed | Failed | Skipped | Pass Rate |
|---|---:|---:|---:|---:|---:|
| - | 0 | 0 | 0 | 0 | 0.00% |

### e2e

| File | Total | Passed | Failed | Skipped | Pass Rate |
|---|---:|---:|---:|---:|---:|
| - | 0 | 0 | 0 | 0 | 0.00% |

### integration

| File | Total | Passed | Failed | Skipped | Pass Rate |
|---|---:|---:|---:|---:|---:|
| - | 0 | 0 | 0 | 0 | 0.00% |

### security

| File | Total | Passed | Failed | Skipped | Pass Rate |
|---|---:|---:|---:|---:|---:|
| - | 0 | 0 | 0 | 0 | 0.00% |

