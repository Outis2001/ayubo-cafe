# Quick Start Guide - Tasks 6-12 Tests

## Running the Tests

### Run All New Tests
```bash
# Run all tests for tasks 6-12
npm test -- tests/unit/payments.test.js tests/unit/notifications.test.js tests/unit/pickupTimeSlots.test.js tests/integration/custom-cake-quote-flow.test.js tests/integration/payment-processing-flow.test.js tests/integration/staff-notifications-flow.test.js tests/integration/order-tracking-profile-flow.test.js
```

### Run by Category

**Unit Tests Only:**
```bash
npm test -- tests/unit/payments.test.js tests/unit/notifications.test.js tests/unit/pickupTimeSlots.test.js
```

**Integration Tests Only:**
```bash
npm test -- tests/integration/custom-cake-quote-flow.test.js tests/integration/payment-processing-flow.test.js tests/integration/staff-notifications-flow.test.js tests/integration/order-tracking-profile-flow.test.js
```

### Run by Task

**Task 6.0 - Custom Cake Requests:**
```bash
npm test -- tests/integration/custom-cake-quote-flow.test.js
```

**Task 7.0 - Payment Integration:**
```bash
npm test -- tests/unit/payments.test.js tests/integration/payment-processing-flow.test.js
```

**Task 9.0 - Notifications:**
```bash
npm test -- tests/unit/notifications.test.js tests/integration/staff-notifications-flow.test.js
```

**Task 10.0 - Pickup Time Slots:**
```bash
npm test -- tests/unit/pickupTimeSlots.test.js
```

**Task 11.0 - Order Tracking & Profile:**
```bash
npm test -- tests/integration/order-tracking-profile-flow.test.js
```

## Test File Overview

### Unit Tests (3 files)

1. **`tests/unit/payments.test.js`** - 35+ tests
   - Payment calculations (deposit/balance)
   - Payment record CRUD
   - Bank transfer verification
   - Payment status tracking

2. **`tests/unit/notifications.test.js`** - 30+ tests
   - Notification creation and fetching
   - Read/unread management
   - Notification cleanup
   - Display helpers

3. **`tests/unit/pickupTimeSlots.test.js`** - 25+ tests
   - Time slot configuration
   - Validation rules
   - Time formatting
   - Slot availability checking

### Integration Tests (4 files)

1. **`tests/integration/custom-cake-quote-flow.test.js`** - 20+ tests
   - Customer request submission
   - Staff quote creation
   - Quote approval/rejection
   - Expiration handling

2. **`tests/integration/payment-processing-flow.test.js`** - 30+ tests
   - Stripe payment flow
   - Bank transfer flow
   - Staff verification
   - Payment retry

3. **`tests/integration/staff-notifications-flow.test.js`** - 35+ tests
   - Notification workflows
   - Real-time updates
   - Navigation and management
   - Priority and filtering

4. **`tests/integration/order-tracking-profile-flow.test.js`** - 40+ tests
   - Order history and tracking
   - Order modification
   - Profile management
   - Phone verification

## Watch Mode

Run tests in watch mode for development:

```bash
npm test -- --watch tests/unit/payments.test.js
```

## Coverage Report

Generate coverage report:

```bash
npm test -- --coverage
```

## Expected Results

✅ **Total Tests**: 215+ tests  
✅ **Unit Tests**: 90+ tests  
✅ **Integration Tests**: 125+ tests  
✅ **Expected Pass Rate**: 100% (all tests should pass)

## Troubleshooting

**Tests not found?**
- Ensure you're in the project root directory
- Verify test files exist in the correct locations

**Import errors?**
- Check that all utility files exist
- Verify mock paths are correct

**Mock issues?**
- Ensure Vitest is properly configured
- Check that mocks are cleared between tests

## Next Steps

After running these tests:

1. Review the detailed documentation: `tests/TASKS_6_12_TEST_DOCUMENTATION.md`
2. Check existing test results: `tests/CUSTOMER_ORDERING_TEST_RESULTS.md`
3. Run all project tests: `npm test`
4. Generate coverage report: `npm test -- --coverage`

## Support

For issues or questions:
- Check test documentation
- Review mock implementations
- Verify utility function exports
- Ensure Supabase client is properly mocked

---

**Created**: October 26, 2025  
**Test Framework**: Vitest  
**Total Coverage**: 215+ tests

