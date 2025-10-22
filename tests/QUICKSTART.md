# Test Automation Quick Start Guide

## 🚀 Getting Started

### Prerequisites
All testing dependencies are already installed! The setup includes:
- ✅ Vitest - Fast unit test framework
- ✅ Testing Library - React component testing
- ✅ jsdom - Browser environment simulation
- ✅ Mock utilities for time and database

### Run Your First Test

```bash
# Run all tests
npm test

# Run session expiration tests (tasks 10.5, 10.6, 10.7)
npm run test:session
```

## 📋 Tasks 10.5, 10.6, 10.7 - Session Expiration Tests

### What These Tests Cover

| Task | Description | Test File |
|------|-------------|-----------|
| 10.5 | Short session expiration (8 hours) | `tests/integration/session-expiration.test.js` |
| 10.6 | Long session expiration (7 days) | `tests/integration/session-expiration.test.js` |
| 10.7 | Inactivity timeout (30 minutes) | `tests/integration/session-expiration.test.js` |

### How Time Mocking Works

Instead of waiting 8 hours or 7 days, tests use time mocking:

```javascript
// Start at a specific time
const mockDate = new MockDate();

// Instantly jump forward 8 hours
mockDate.advanceHours(8);

// Or jump forward 7 days
mockDate.advanceDays(7);

// Or jump forward 30 minutes
mockDate.advanceMinutes(30);
```

Tests complete in **seconds** instead of days! ⚡

### Test Execution Flow

```
1. Create mock session (short or long)
2. Verify session is initially valid ✅
3. Advance time using MockDate ⏩
4. Validate session again
5. Assert expected expiration behavior 🎯
```

## 📊 Understanding Test Results

### Success Output
```
✓ tests/integration/session-expiration.test.js (12 tests)
  ✓ Task 10.5: Short session expiration
    ✓ should expire short session after 8 hours
    ✓ should validate within 8 hour window
  ✓ Task 10.6: Long session expiration
    ✓ should expire long session after 7 days
    ✓ should validate within 7 day window
  ✓ Task 10.7: Inactivity timeout
    ✓ should expire after 30 minutes inactivity
    ✓ should maintain session with activity

Test Files  1 passed (1)
Tests       12 passed (12)
Duration    1.23s
```

### Failure Output
When a test fails, you'll see:
```
✗ should expire short session after 8 hours
  Expected: false
  Received: true
  
  at tests/integration/session-expiration.test.js:123:45
```

## 🔍 Interactive Test UI

For a visual testing experience:

```bash
npm run test:ui
```

This opens a browser interface where you can:
- 👀 See test results visually
- 🐛 Debug failing tests
- 📈 View coverage reports
- ⚡ Re-run tests on file changes

## 🎯 Test Coverage

Generate a coverage report:

```bash
npm run test:coverage
```

Coverage report will be saved to `coverage/` directory.

## 🛠️ Common Commands

```bash
# Watch mode (auto re-run on changes)
npm test

# Run once (good for CI/CD)
npm run test:run

# Run specific test file
npm test tests/unit/validation.test.js

# Run tests matching pattern
npm test session

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```

## 🐛 Debugging Tests

### Add Debug Output
```javascript
it('should do something', () => {
  console.log('Debug:', someValue);
  expect(someValue).toBe(expectedValue);
});
```

### Run Single Test
```javascript
it.only('should test this one thing', () => {
  // Only this test will run
});
```

### Skip Test Temporarily
```javascript
it.skip('should test this later', () => {
  // This test will be skipped
});
```

## 📝 Test Structure

### Describe Blocks (Test Suites)
```javascript
describe('Feature Name', () => {
  // Group related tests
  it('should do something', () => {
    // Individual test
  });
});
```

### Assertions
```javascript
expect(value).toBe(expected);           // Exact equality
expect(value).toEqual(expected);        // Deep equality
expect(value).toBeDefined();            // Not undefined
expect(value).toBeGreaterThan(5);       // Number comparison
expect(array).toContain(item);          // Array contains
expect(array).toHaveLength(3);          // Array length
expect(result.isValid).toBe(true);      // Boolean check
```

## ✨ Best Practices

1. **One assertion per test** (when possible)
2. **Clear test names** - Describe what's being tested
3. **AAA Pattern**:
   - **Arrange**: Set up test data
   - **Act**: Execute the function
   - **Assert**: Verify the result
4. **Clean up**: Tests should not affect each other
5. **Mock external dependencies** (database, APIs, etc.)

## 🔗 Next Steps

1. ✅ Run the session expiration tests
2. 📖 Read the full test documentation in `tests/README.md`
3. ✏️ Write additional tests for other features
4. 🔄 Integrate tests into CI/CD pipeline

## 📚 Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://testingjavascript.com/)
- [Mock Time in Tests](https://vitest.dev/guide/mocking.html#timers)

---

**Happy Testing! 🎉**

If you encounter any issues, check the main README in `tests/README.md` for troubleshooting tips.

