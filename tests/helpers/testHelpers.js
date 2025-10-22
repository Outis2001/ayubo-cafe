/**
 * Test Helper Utilities
 * 
 * Reusable utilities for setting up test data and mocking Supabase
 */

import { vi } from 'vitest';

/**
 * Create a mock Supabase client for testing
 */
export const createMockSupabaseClient = () => {
  const mockData = {
    sessions: [],
    users: [],
    auditLogs: [],
  };

  const mockClient = {
    from: (table) => {
      const tableData = {
        user_sessions: mockData.sessions,
        users: mockData.users,
        audit_logs: mockData.auditLogs,
      }[table] || [];

      return {
        select: (columns = '*') => ({
          eq: (column, value) => ({
            single: () => {
              const found = tableData.find(item => item[column] === value);
              if (found) {
                return Promise.resolve({ data: found, error: null });
              }
              return Promise.resolve({ data: null, error: { message: 'Not found' } });
            },
            gte: (col, val) => ({
              order: () => ({
                limit: (n) => Promise.resolve({ 
                  data: tableData.filter(item => item[column] === value && item[col] >= val).slice(0, n), 
                  error: null 
                })
              })
            })
          }),
          gt: (column, value) => ({
            order: (col, opts) => Promise.resolve({
              data: tableData.filter(item => new Date(item[column]) > new Date(value)),
              error: null
            })
          }),
          single: () => Promise.resolve({ data: tableData[0] || null, error: tableData.length ? null : { message: 'Not found' } })
        }),
        insert: (data) => ({
          select: () => ({
            single: () => {
              tableData.push(data);
              return Promise.resolve({ data, error: null });
            }
          })
        }),
        update: (data) => ({
          eq: (column, value) => {
            const index = tableData.findIndex(item => item[column] === value);
            if (index >= 0) {
              tableData[index] = { ...tableData[index], ...data };
              return Promise.resolve({ data: tableData[index], error: null });
            }
            return Promise.resolve({ data: null, error: { message: 'Not found' } });
          }
        }),
        delete: () => ({
          eq: (column, value) => {
            const filtered = tableData.filter(item => item[column] !== value);
            const removed = tableData.length - filtered.length;
            mockData[table] = filtered;
            return Promise.resolve({ data: filtered, error: null, count: removed });
          },
          lt: (column, value) => ({
            select: () => {
              const removed = tableData.filter(item => new Date(item[column]) < new Date(value));
              mockData[table] = tableData.filter(item => new Date(item[column]) >= new Date(value));
              return Promise.resolve({ data: removed, error: null });
            }
          }),
          neq: (column, value) => ({
            select: () => Promise.resolve({ data: [], error: null })
          })
        })
      };
    },
    _mockData: mockData, // Expose for test assertions
  };

  return mockClient;
};

/**
 * Create test user data
 */
export const createTestUser = (overrides = {}) => ({
  user_id: 'test-user-id-123',
  username: 'testuser',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  role: 'cashier',
  is_active: true,
  password_hash: '$2a$10$testHashedPassword',
  ...overrides,
});

/**
 * Create test session data
 */
export const createTestSession = (overrides = {}) => {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setHours(expiresAt.getHours() + 8);

  return {
    session_id: 'test-session-id-123',
    user_id: 'test-user-id-123',
    session_token: 'test-session-token-abc123',
    remember_me: false,
    expires_at: expiresAt.toISOString(),
    created_at: now.toISOString(),
    last_activity_at: now.toISOString(),
    ...overrides,
  };
};

/**
 * Mock date utilities for time-based testing
 */
export class MockDate {
  constructor(initialDate = new Date()) {
    this.currentDate = new Date(initialDate);
  }

  now() {
    return this.currentDate.getTime();
  }

  advance(ms) {
    this.currentDate = new Date(this.currentDate.getTime() + ms);
  }

  advanceHours(hours) {
    this.advance(hours * 60 * 60 * 1000);
  }

  advanceDays(days) {
    this.advance(days * 24 * 60 * 60 * 1000);
  }

  advanceMinutes(minutes) {
    this.advance(minutes * 60 * 1000);
  }

  getCurrentDate() {
    return new Date(this.currentDate);
  }

  toISOString() {
    return this.currentDate.toISOString();
  }
}

/**
 * Time constants for tests
 */
export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  
  // Session-specific timeouts
  SHORT_SESSION: 8 * 60 * 60 * 1000,  // 8 hours
  LONG_SESSION: 7 * 24 * 60 * 60 * 1000,  // 7 days
  INACTIVITY_TIMEOUT: 30 * 60 * 1000,  // 30 minutes
};

/**
 * Mock audit log function
 */
export const createMockAuditLog = () => {
  const logs = [];
  
  return {
    log: (action, userId, details = {}) => {
      logs.push({
        action,
        user_id: userId,
        details,
        timestamp: new Date().toISOString(),
      });
    },
    getLogs: () => logs,
    clear: () => logs.length = 0,
  };
};

