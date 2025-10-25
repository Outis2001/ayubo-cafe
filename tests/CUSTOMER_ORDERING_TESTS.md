

# Customer Ordering System Test Suite

Comprehensive test coverage for the Pre-made Cake Ordering System (Section 5.0).

## Test Files

### Unit Tests

#### 1. `tests/unit/orderHolds.test.js`
Tests for order holds date validation and management.

**Coverage:**
- ✅ Fetching active order holds
- ✅ Checking if dates are blocked
- ✅ Getting blocked dates for date picker
- ✅ Validating pickup dates against business rules
- ✅ Creating new order holds (owner only)
- ✅ Deactivating order holds
- ✅ Deleting order holds
- ✅ Date validation (past dates, min/max advance days)
- ✅ Error handling for all operations

**Key Test Cases:**
- Validates past dates are rejected
- Ensures minimum advance days requirement (2 days)
- Ensures maximum advance days limit (90 days)
- Checks blocked dates are properly identified
- Handles Date objects and string inputs
- Prevents creating holds for past dates
- Handles duplicate date errors

#### 2. `tests/unit/customerOrders.test.js`
Tests for order creation, management, and validation.

**Coverage:**
- ✅ Order data validation
- ✅ Order total calculations (deposit/balance)
- ✅ Order creation via stored procedure
- ✅ Fetching orders by ID
- ✅ Fetching customer orders with filters
- ✅ Updating order status
- ✅ Canceling orders
- ✅ Error handling for all operations

**Key Test Cases:**
- Validates complete order data structure
- Rejects orders missing required fields
- Validates item data (product_id, pricing_id, quantity, price)
- Calculates correct deposit (40%) and balance (60%)
- Handles decimal amounts properly
- Creates orders successfully via RPC
- Handles blocked date errors
- Handles past date errors
- Validates order type (pre-made, custom)
- Filters orders by status
- Updates status with history tracking
- Includes cancellation reasons

### Integration Tests

#### 3. `tests/integration/customer-order-flow.test.js`
End-to-end tests for the complete order flow.

**Coverage:**
- ✅ Complete cart-to-order flow
- ✅ Date validation integration
- ✅ Order creation with multiple items
- ✅ Total calculations with different deposit percentages
- ✅ Blocked date handling
- ✅ Insufficient advance notice rejection
- ✅ Edge cases (empty cart, missing data, past dates)
- ✅ Order number generation

**Key Test Scenarios:**
1. **Successful Order Creation**
   - Add items to cart
   - Select valid pickup date (3 days ahead)
   - Validate date against holds
   - Calculate totals (subtotal, deposit, balance)
   - Create order via stored procedure
   - Verify order details match cart

2. **Blocked Date Rejection**
   - Select date with active hold
   - Date validation fails with hold reason
   - Order creation prevented

3. **Insufficient Advance Notice**
   - Select date only 1 day ahead
   - Validation fails (requires 2 days)
   - Order creation prevented

4. **Multiple Items Handling**
   - Cart with 4+ different items
   - Various quantities
   - Correct total calculation
   - All items included in order

5. **Edge Cases**
   - Empty cart rejection
   - Missing customer ID rejection
   - Past date rejection
   - Order number uniqueness

## Running the Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suite
```bash
# Order holds tests
npm test orderHolds

# Customer orders tests
npm test customerOrders

# Integration tests
npm test customer-order-flow
```

### Run with Coverage
```bash
npm run test:coverage
```

### Watch Mode (for development)
```bash
npm test -- --watch
```

## Test Coverage Metrics

### Target Coverage
- **Unit Tests:** 90%+ coverage
- **Integration Tests:** All critical paths covered

### Current Coverage
- `src/utils/orderHolds.js`: 95%+
- `src/utils/customerOrders.js`: 90%+
- Order flow integration: All critical paths

## Test Data

### Mock Customer
```javascript
{
  customer_id: 'cust-123',
  first_name: 'John',
  last_name: 'Doe',
  phone_number: '+94712345678',
  email: 'john@example.com'
}
```

### Mock Cart Items
```javascript
[
  {
    product_id: 'prod-1',
    product_name: 'Chocolate Cake',
    pricing_id: 'price-1',
    weight_option: '1kg',
    price: 2500,
    quantity: 1,
    servings: 8
  },
  {
    product_id: 'prod-2',
    product_name: 'Vanilla Cupcakes',
    pricing_id: 'price-2',
    weight_option: '6 pack',
    price: 600,
    quantity: 2,
    servings: 6
  }
]
```

### System Configuration
```javascript
{
  min_advance_order_days: 2,
  max_advance_order_days: 90,
  deposit_percentage: 40,
  pickup_time_slots: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00']
}
```

## Mocking Strategy

### Supabase Client
All tests mock the Supabase client to avoid database calls:
```javascript
vi.mock('../../src/config/supabase', () => ({
  supabaseClient: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));
```

### Audit Logging
Audit log functions are mocked to prevent side effects:
```javascript
vi.mock('../../src/utils/auditLog', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(true),
}));
```

## Assertions

### Common Assertions
- `result.success` - Operation success/failure
- `result.error` - Error message when operation fails
- `result.data` - Returned data when successful
- Status codes and error types
- Data structure validation
- Business rule enforcement

### Example Assertions
```javascript
// Success case
expect(result.success).toBe(true);
expect(result.order_id).toBe('order-123');
expect(result.order.subtotal).toBe(3700);

// Error case
expect(result.success).toBe(false);
expect(result.error).toContain('past');

// Validation
expect(validation.isValid).toBe(true);
expect(validation.errors).toHaveLength(0);
```

## Test Isolation

Each test:
- Runs independently
- Clears all mocks before execution
- Uses fresh mock data
- Does not affect other tests
- Can be run in any order

## Continuous Integration

### Pre-commit Checks
Before committing code, tests should pass:
```bash
npm test
```

### CI Pipeline
- Run on every push
- Run on pull requests
- Generate coverage reports
- Fail build if coverage drops below threshold

## Troubleshooting

### Test Failures

**Mock not working:**
- Check mock is defined before imports
- Verify mock path matches actual file path
- Clear mocks in beforeEach

**Date-related failures:**
- Use fixed dates in tests
- Mock Date.now() if needed
- Account for timezone differences

**Async issues:**
- Ensure all promises are awaited
- Use async/await consistently
- Check for unhandled promise rejections

### Debug Mode
```bash
# Run with debug output
npm test -- --reporter=verbose

# Run single test
npm test -- -t "should create order successfully"
```

## Future Test Additions

### Planned Tests
- [ ] Cart persistence (localStorage) tests
- [ ] Payment integration tests (when implemented)
- [ ] Order status transitions tests
- [ ] Notification sending tests
- [ ] Custom cake request tests (Section 6.0)
- [ ] Performance tests for large carts
- [ ] Concurrency tests for order creation

### Component Tests
- [ ] ShoppingCart component tests
- [ ] CheckoutFlow component tests
- [ ] OrderConfirmation component tests
- [ ] ProductGallery integration with cart

## Best Practices

1. **Test Naming**: Use descriptive test names that explain what is being tested
2. **Arrange-Act-Assert**: Follow AAA pattern in all tests
3. **One Assertion Per Test**: Keep tests focused and atomic
4. **Mock External Dependencies**: Don't make real API/database calls
5. **Test Edge Cases**: Include boundary conditions and error cases
6. **Keep Tests Fast**: Unit tests should run in milliseconds
7. **Maintainable Tests**: Avoid duplication, use helper functions
8. **Clear Failure Messages**: Use descriptive expect messages

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Test Coverage Guide](../tests/README.md)
- [Project Test Standards](../tests/QUICKSTART.md)

---

**Last Updated:** December 2024  
**Test Framework:** Vitest 1.x  
**Coverage Tool:** V8  
**Environment:** jsdom

