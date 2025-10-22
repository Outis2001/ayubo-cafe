# Test Suite Documentation

## Overview

This test suite provides automated testing for the Ayubo Cafe application, specifically focusing on session expiration scenarios for tasks 10.5, 10.6, and 10.7.

## Test Structure

```
tests/
├── unit/              # Unit tests for individual functions
├── integration/       # Integration tests for feature workflows
├── e2e/              # End-to-end tests (future)
└── helpers/          # Test utilities and helpers
    ├── setup.js      # Global test setup
    └── testHelpers.js # Reusable test utilities
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in UI mode (interactive)
```bash
npm run test:ui
```

### Run tests once (CI mode)
```bash
npm run test:run
```

### Run tests with coverage report
```bash
npm run test:coverage
```

### Run specific test file (session expiration tests)
```bash
npm run test:session
```

### Run tests in watch mode
```bash
npm test
# Tests will re-run automatically when files change
```

## Session Expiration Tests (Tasks 10.5, 10.6, 10.7)

Located in: `tests/integration/session-expiration.test.js`

### Task 10.5: Short Session Expiration (8 hours)
Tests that sessions without "remember me" expire after 8 hours.

**Test scenarios:**
- ✅ Session expires exactly at 8 hour mark
- ✅ Session is valid just before 8 hours
- ✅ Session is valid at multiple points within 8 hour window

### Task 10.6: Long Session Expiration (7 days)
Tests that sessions with "remember me" expire after 7 days.

**Test scenarios:**
- ✅ Session expires exactly at 7 day mark
- ✅ Session is valid just before 7 days
- ✅ Session is valid at multiple points within 7 day window
- ✅ No inactivity timeout applies to long sessions

### Task 10.7: Inactivity Timeout (30 minutes)
Tests that short sessions expire after 30 minutes of inactivity.

**Test scenarios:**
- ✅ Session expires after 30 minutes of inactivity
- ✅ Session remains valid with activity updates
- ✅ Correct minutes of inactivity calculated
- ✅ Inactivity expiration logged with correct reason

## Test Approach

### Time Mocking
Tests use time mocking to simulate the passage of time without actually waiting:

```javascript
// Mock date and advance time
const mockDate = new MockDate();
mockDate.advanceHours(8);  // Simulate 8 hours passing
```

This allows tests to run in seconds instead of hours/days.

### Mock Supabase Client
Tests use a mock Supabase client to avoid database dependencies:

```javascript
const mockSupabase = createMockSupabaseClient();
// Tests run against in-memory data
```

## Writing New Tests

### Unit Test Template

```javascript
import { describe, it, expect } from 'vitest';
import { yourFunction } from '../../src/utils/yourModule';

describe('Your Function', () => {
  it('should do something', () => {
    const result = yourFunction();
    expect(result).toBe(expectedValue);
  });
});
```

### Integration Test Template

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabaseClient } from '../helpers/testHelpers';

describe('Feature Integration', () => {
  let mockSupabase;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
  });

  it('should integrate components correctly', async () => {
    // Test setup
    // Execute feature
    // Assert results
  });
});
```

## Test Helpers

### MockDate
Utility for mocking dates and advancing time:

```javascript
const mockDate = new MockDate();
mockDate.advanceHours(2);    // Advance 2 hours
mockDate.advanceDays(5);     // Advance 5 days
mockDate.advanceMinutes(30); // Advance 30 minutes
```

### TIME Constants
Predefined time constants for readability:

```javascript
TIME.SECOND              // 1000ms
TIME.MINUTE              // 60,000ms
TIME.HOUR                // 3,600,000ms
TIME.DAY                 // 86,400,000ms
TIME.SHORT_SESSION       // 8 hours
TIME.LONG_SESSION        // 7 days
TIME.INACTIVITY_TIMEOUT  // 30 minutes
```

### Test Data Creators

```javascript
const user = createTestUser();
const session = createTestSession();
const mockSupabase = createMockSupabaseClient();
```

## Coverage Goals

- **Unit Tests**: 80%+ coverage for utility functions
- **Integration Tests**: Cover all critical user flows
- **E2E Tests**: Cover complete user journeys (future)

## Continuous Integration

Tests should be run as part of CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: npm run test:run
  
- name: Generate coverage
  run: npm run test:coverage
```

## Troubleshooting

### Tests fail with "Cannot find module"
Run: `npm install`

### Tests hang indefinitely
Check for missing `await` on async functions or unresolved promises.

### Time-based tests failing
Ensure `MockDate` is properly reset between tests in `beforeEach`.

### Supabase mock not working
Verify the mock is set up in `beforeEach` and the module path is correct.

## Future Enhancements

- [ ] Add E2E tests with Playwright
- [ ] Add visual regression tests
- [ ] Add performance benchmarks
- [ ] Add mutation testing
- [ ] Add accessibility tests

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Test Best Practices](https://testingjavascript.com/)

