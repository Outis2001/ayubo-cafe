/**
 * Test Setup File
 * 
 * This file runs before all tests to set up the testing environment.
 * It includes global test utilities, mocks, and configuration.
 */

import { beforeEach, afterEach, vi } from 'vitest';

// Global test setup
beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();
  
  // Reset localStorage
  localStorage.clear();
  sessionStorage.clear();
  
  // Reset environment variables
  process.env.NODE_ENV = 'test';
});

afterEach(() => {
  // Cleanup after each test
  vi.restoreAllMocks();
});

// Global test utilities
global.testUtils = {
  // Helper to wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Helper to advance time
  advanceTime: async (ms) => {
    vi.advanceTimersByTime(ms);
    await vi.runAllTimersAsync();
  },
};

