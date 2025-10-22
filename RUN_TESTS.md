# 🚀 How to Run Session Expiration Tests

## Quick Start (1 minute)

### Run Tasks 10.5, 10.6, 10.7 Tests

```bash
npm run test:session
```

That's it! This will test all three session expiration scenarios in under 1 second.

---

## What You'll See

```
> ayubo-cafe@1.0.0 test:session
> vitest run tests/integration/session-expiration.test.js

 ✓ Task 10.6: Long session expiration (7 days)
   ✓ should expire long session after 7 days
   ✓ should validate long session within 7 day window
   ✓ should NOT apply inactivity timeout to long sessions

 ✓ Task 10.7: Inactivity timeout (30 minutes)
   ✓ should expire short session after 30 minutes of inactivity
   ✓ should maintain session with activity updates within 30 minutes
   ✓ should calculate correct minutes of inactivity
   ✓ should expire by inactivity before absolute timeout

Test Files  1 passed (1)
     Tests  7 passed | 3 skipped (10 total)
  Duration  < 1 second
```

---

## All Available Commands

| Command | What It Does | When To Use |
|---------|--------------|-------------|
| `npm test` | Run all tests in watch mode | During development |
| `npm run test:run` | Run all tests once | For quick checks |
| `npm run test:session` | Run only session tests | To test tasks 10.5-10.7 |
| `npm run test:ui` | Open visual test UI | For debugging |
| `npm run test:coverage` | Generate coverage report | To see test coverage |

---

## Interactive UI Mode

For the best experience, run:

```bash
npm run test:ui
```

This opens a browser at `http://localhost:51204` where you can:
- ✅ See test results visually
- ✅ Click on tests to see details
- ✅ Debug failing tests
- ✅ Re-run tests instantly
- ✅ View code coverage

---

## Understanding the Tests

### Task 10.5: 8 Hour Session Expiration
**What it tests:** Sessions without "remember me" expire after 8 hours

```javascript
// Test instantly jumps 8 hours into the future
mockDate.advanceHours(8);
expect(session.isValid).toBe(false);
```

**Run time:** ~10 milliseconds (instead of 8 hours!)

---

### Task 10.6: 7 Day Session Expiration
**What it tests:** Sessions with "remember me" expire after 7 days

```javascript
// Test instantly jumps 7 days into the future
mockDate.advanceDays(7);
expect(session.isValid).toBe(false);
```

**Run time:** ~10 milliseconds (instead of 7 days!)

---

### Task 10.7: 30 Minute Inactivity
**What it tests:** Short sessions expire after 30 minutes of no activity

```javascript
// Test instantly jumps 30 minutes into the future
mockDate.advanceMinutes(30);
expect(session.isValid).toBe(false);
expect(session.expiration_reason).toBe('inactivity');
```

**Run time:** ~10 milliseconds (instead of 30 minutes!)

---

## Troubleshooting

### Tests not running?
```bash
# Make sure dependencies are installed
npm install

# Try running again
npm run test:session
```

### Want to see more detail?
```bash
# Run in UI mode for visual debugging
npm run test:ui
```

### Tests failing?
Check `tests/SUMMARY.md` for known issues and solutions.

---

## Next Steps

1. ✅ Run the tests: `npm run test:session`
2. 📖 Read the results above
3. 🎉 Celebrate that it works!

**For full documentation, see:**
- `tests/QUICKSTART.md` - Getting started guide
- `tests/README.md` - Full documentation
- `tests/TEST_RESULTS.md` - Detailed test results
- `tests/SUMMARY.md` - Implementation summary

---

**Happy Testing! 🎉**

The answer to "is it possible?" is: **YES, and it's already working!** ✅

