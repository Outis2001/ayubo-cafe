/**
 * Session Expiration Integration Tests
 * 
 * Tests for tasks 10.5, 10.6, and 10.7:
 * - 10.5: Short session expiration (8 hours)
 * - 10.6: Long session expiration (7 days)
 * - 10.7: Inactivity timeout (30 minutes for short sessions)
 * 
 * These tests use time mocking to simulate the passage of time
 * without actually waiting for hours or days.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createSession, validateSession } from '../../src/utils/session';
import { createMockSupabaseClient, createTestSession, TIME, MockDate } from '../helpers/testHelpers';

// Mock the Supabase client
let mockSupabase;
vi.mock('../../src/config/supabase', () => ({
  supabaseClient: null, // Will be set in beforeEach
}));

describe('Session Expiration Tests (Tasks 10.5, 10.6, 10.7)', () => {
  const BASE_TIME = new Date('2025-10-22T10:00:00.000Z');

  beforeEach(async () => {
    // Create mock Supabase client
    mockSupabase = createMockSupabaseClient();
    
    // Replace the supabase import with our mock
    const supabaseModule = await import('../../src/config/supabase');
    vi.mocked(supabaseModule).supabaseClient = mockSupabase;

    // Use Vitest's built-in fake timers for complete Date mocking
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);
  });

  afterEach(() => {
    // Restore real timers
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  /**
   * Task 10.5: Test short session expiration after 8 hours
   * 
   * When a user logs in WITHOUT "remember me":
   * - Session should be valid for up to 8 hours
   * - After 8 hours, session should expire (absolute timeout)
   * - Expired session should return isValid: false with reason 'expired_timeout'
   */
  describe('Task 10.5: Short session expiration (8 hours)', () => {
    it('should expire short session after 8 hours', async () => {
      const userId = 'test-user-123';
      const sessionStartTime = new Date('2025-10-22T10:00:00.000Z');
      const expiresAt = new Date('2025-10-22T18:00:00.000Z'); // 8 hours later

      const session = createTestSession({
        user_id: userId,
        session_token: 'short-session-token',
        remember_me: false,
        expires_at: expiresAt.toISOString(),
        created_at: sessionStartTime.toISOString(),
        last_activity_at: sessionStartTime.toISOString(),
      });

      // Add session to mock database
      mockSupabase._mockData.sessions.push(session);

      // Verify session is valid initially (at 10:00)
      const initialValidation = await validateSession(session.session_token);
      expect(initialValidation.isValid).toBe(true);
      expect(initialValidation.session).toBeDefined();

      // Advance time by 7 hours 59 minutes (17:59 - just before expiration)
      vi.setSystemTime(new Date('2025-10-22T17:59:00.000Z'));
      
      // Update last_activity_at to avoid inactivity timeout
      session.last_activity_at = new Date('2025-10-22T17:59:00.000Z').toISOString();

      const almostExpiredValidation = await validateSession(session.session_token);
      expect(almostExpiredValidation.isValid).toBe(true);
      expect(almostExpiredValidation.message).toBe('Session is valid');

      // Advance time by 2 more minutes (18:01 - now expired)
      vi.setSystemTime(new Date('2025-10-22T18:01:00.000Z'));

      const expiredValidation = await validateSession(session.session_token);
      expect(expiredValidation.isValid).toBe(false);
      expect(expiredValidation.reason).toBe('expired_timeout');
      expect(expiredValidation.message).toBe('Session has expired');
      expect(expiredValidation.expiration_reason).toBe('timeout');
    });

    it('should validate short session within 8 hour window', async () => {
      const userId = 'test-user-456';
      const sessionStartTime = new Date('2025-10-22T10:00:00.000Z');
      const expiresAt = new Date('2025-10-22T18:00:00.000Z'); // 8 hours later

      const session = createTestSession({
        user_id: userId,
        session_token: 'short-session-valid',
        remember_me: false,
        expires_at: expiresAt.toISOString(),
        created_at: sessionStartTime.toISOString(),
        last_activity_at: sessionStartTime.toISOString(),
      });

      mockSupabase._mockData.sessions.push(session);

      // Test at multiple points within the 8 hour window
      const testPoints = [
        { hours: 1, time: '2025-10-22T11:00:00.000Z' },
        { hours: 2, time: '2025-10-22T12:00:00.000Z' },
        { hours: 4, time: '2025-10-22T14:00:00.000Z' },
        { hours: 6, time: '2025-10-22T16:00:00.000Z' },
        { hours: 7.5, time: '2025-10-22T17:30:00.000Z' },
      ];
      
      for (const point of testPoints) {
        // Reset to test time
        vi.setSystemTime(new Date(point.time));
        
        // Update last_activity_at to avoid inactivity timeout
        session.last_activity_at = point.time;
        
        const validation = await validateSession(session.session_token);
        expect(validation.isValid).toBe(true);
        expect(validation.message).toBe('Session is valid');
      }
    });
  });

  /**
   * Task 10.6: Test long session expiration after 7 days
   * 
   * When a user logs in WITH "remember me":
   * - Session should be valid for up to 7 days
   * - After 7 days, session should expire
   * - No inactivity timeout applies to long sessions
   */
  describe('Task 10.6: Long session expiration (7 days)', () => {
    it('should expire long session after 7 days', async () => {
      const userId = 'test-user-789';
      const sessionStartTime = new Date('2025-10-22T10:00:00.000Z');
      const expiresAt = new Date('2025-10-29T10:00:00.000Z'); // 7 days later

      const session = createTestSession({
        user_id: userId,
        session_token: 'long-session-token',
        remember_me: true, // Long session
        expires_at: expiresAt.toISOString(),
        created_at: sessionStartTime.toISOString(),
        last_activity_at: sessionStartTime.toISOString(),
      });

      mockSupabase._mockData.sessions.push(session);

      // Verify session is valid initially (Oct 22 10:00)
      const initialValidation = await validateSession(session.session_token);
      expect(initialValidation.isValid).toBe(true);

      // Advance time by 6 days 23 hours (Oct 29 09:00 - just before expiration)
      vi.setSystemTime(new Date('2025-10-29T09:00:00.000Z'));

      const almostExpiredValidation = await validateSession(session.session_token);
      expect(almostExpiredValidation.isValid).toBe(true);
      expect(almostExpiredValidation.message).toBe('Session is valid');

      // Advance time by 2 more hours (Oct 29 11:00 - now expired)
      vi.setSystemTime(new Date('2025-10-29T11:00:00.000Z'));

      const expiredValidation = await validateSession(session.session_token);
      expect(expiredValidation.isValid).toBe(false);
      expect(expiredValidation.reason).toBe('expired_timeout');
      expect(expiredValidation.message).toBe('Session has expired');
      expect(expiredValidation.expiration_reason).toBe('timeout');
    });

    it('should validate long session within 7 day window', async () => {
      const userId = 'test-user-101';
      const sessionStartTime = new Date('2025-10-22T10:00:00.000Z');
      const expiresAt = new Date('2025-10-29T10:00:00.000Z'); // 7 days later

      const session = createTestSession({
        user_id: userId,
        session_token: 'long-session-valid',
        remember_me: true,
        expires_at: expiresAt.toISOString(),
        created_at: sessionStartTime.toISOString(),
        last_activity_at: sessionStartTime.toISOString(),
      });

      mockSupabase._mockData.sessions.push(session);

      // Test at multiple points within the 7 day window
      const testPoints = [
        { days: 1, time: '2025-10-23T10:00:00.000Z' },
        { days: 2, time: '2025-10-24T10:00:00.000Z' },
        { days: 3, time: '2025-10-25T10:00:00.000Z' },
        { days: 5, time: '2025-10-27T10:00:00.000Z' },
        { days: 6.5, time: '2025-10-28T22:00:00.000Z' },
      ];
      
      for (const point of testPoints) {
        // Set to specific test time
        vi.setSystemTime(new Date(point.time));
        
        const validation = await validateSession(session.session_token);
        expect(validation.isValid).toBe(true);
        expect(validation.message).toBe('Session is valid');
      }
    });

    it('should NOT apply inactivity timeout to long sessions', async () => {
      const userId = 'test-user-202';
      const sessionStartTime = new Date('2025-10-22T10:00:00.000Z');
      const expiresAt = new Date('2025-10-29T10:00:00.000Z'); // 7 days later

      const session = createTestSession({
        user_id: userId,
        session_token: 'long-session-no-inactivity',
        remember_me: true,
        expires_at: expiresAt.toISOString(),
        created_at: sessionStartTime.toISOString(),
        last_activity_at: sessionStartTime.toISOString(), // No activity update
      });

      mockSupabase._mockData.sessions.push(session);

      // Advance time by 2 days without any activity
      vi.setSystemTime(new Date('2025-10-24T10:00:00.000Z'));

      // Session should still be valid (no inactivity timeout for remember_me sessions)
      const validation = await validateSession(session.session_token);
      expect(validation.isValid).toBe(true);
      expect(validation.reason).toBeUndefined();
    });
  });

  /**
   * Task 10.7: Test inactivity timeout (30 minutes for short sessions)
   * 
   * When a user logs in WITHOUT "remember me":
   * - If inactive for 30 minutes, session should expire
   * - Expiration should be logged to audit_logs with expiration_reason: 'inactivity'
   * - Long sessions (remember_me = true) should NOT have inactivity timeout
   */
  describe('Task 10.7: Inactivity timeout (30 minutes)', () => {
    it('should expire short session after 30 minutes of inactivity', async () => {
      const userId = 'test-user-303';
      const sessionStartTime = new Date('2025-10-22T10:00:00.000Z');
      const expiresAt = new Date('2025-10-22T18:00:00.000Z'); // 8 hours later

      const session = createTestSession({
        user_id: userId,
        session_token: 'inactivity-test-token',
        remember_me: false, // Short session - inactivity applies
        expires_at: expiresAt.toISOString(),
        created_at: sessionStartTime.toISOString(),
        last_activity_at: sessionStartTime.toISOString(),
      });

      mockSupabase._mockData.sessions.push(session);

      // Verify session is valid initially (10:00)
      const initialValidation = await validateSession(session.session_token);
      expect(initialValidation.isValid).toBe(true);

      // Advance time by 29 minutes (10:29 - just before inactivity timeout)
      vi.setSystemTime(new Date('2025-10-22T10:29:00.000Z'));

      const almostInactiveValidation = await validateSession(session.session_token);
      expect(almostInactiveValidation.isValid).toBe(true);

      // Advance time by 2 more minutes (10:31 - now inactive)
      vi.setSystemTime(new Date('2025-10-22T10:31:00.000Z'));

      const inactiveValidation = await validateSession(session.session_token);
      expect(inactiveValidation.isValid).toBe(false);
      expect(inactiveValidation.reason).toBe('expired_inactivity');
      expect(inactiveValidation.message).toBe('Session expired due to inactivity');
      expect(inactiveValidation.expiration_reason).toBe('inactivity');
      expect(inactiveValidation.minutes_inactive).toBeGreaterThanOrEqual(31);
    });

    it('should maintain session with activity updates within 30 minutes', async () => {
      const userId = 'test-user-404';
      const sessionStartTime = new Date('2025-10-22T10:00:00.000Z');
      const expiresAt = new Date('2025-10-22T18:00:00.000Z'); // 8 hours later

      const session = createTestSession({
        user_id: userId,
        session_token: 'active-session-token',
        remember_me: false,
        expires_at: expiresAt.toISOString(),
        created_at: sessionStartTime.toISOString(),
        last_activity_at: sessionStartTime.toISOString(),
      });

      mockSupabase._mockData.sessions.push(session);

      // Simulate user activity every 20 minutes for 2 hours
      const activityTimes = [
        '2025-10-22T10:20:00.000Z',
        '2025-10-22T10:40:00.000Z',
        '2025-10-22T11:00:00.000Z',
        '2025-10-22T11:20:00.000Z',
        '2025-10-22T11:40:00.000Z',
        '2025-10-22T12:00:00.000Z',
      ];

      for (const activityTime of activityTimes) {
        vi.setSystemTime(new Date(activityTime));
        
        // Update last_activity_at (simulating refreshSession call)
        session.last_activity_at = activityTime;
        
        const validation = await validateSession(session.session_token);
        expect(validation.isValid).toBe(true);
        expect(validation.message).toBe('Session is valid');
      }
    });

    it('should calculate correct minutes of inactivity', async () => {
      const userId = 'test-user-505';
      const sessionStartTime = new Date('2025-10-22T10:00:00.000Z');
      const expiresAt = new Date('2025-10-22T18:00:00.000Z'); // 8 hours later

      const session = createTestSession({
        user_id: userId,
        session_token: 'minutes-test-token',
        remember_me: false,
        expires_at: expiresAt.toISOString(),
        created_at: sessionStartTime.toISOString(),
        last_activity_at: sessionStartTime.toISOString(),
      });

      mockSupabase._mockData.sessions.push(session);

      // Test different inactivity periods
      const testCases = [
        { minutes: 31, time: '2025-10-22T10:31:00.000Z', shouldExpire: true },
        { minutes: 45, time: '2025-10-22T10:45:00.000Z', shouldExpire: true },
        { minutes: 60, time: '2025-10-22T11:00:00.000Z', shouldExpire: true },
        { minutes: 120, time: '2025-10-22T12:00:00.000Z', shouldExpire: true },
      ];

      for (const testCase of testCases) {
        // Reset session and time
        session.last_activity_at = sessionStartTime.toISOString();
        vi.setSystemTime(new Date(testCase.time));
        
        const validation = await validateSession(session.session_token);
        
        if (testCase.shouldExpire) {
          expect(validation.isValid).toBe(false);
          expect(validation.reason).toBe('expired_inactivity');
          expect(validation.minutes_inactive).toBeGreaterThanOrEqual(testCase.minutes);
        }
      }
    });

    it('should expire by inactivity before absolute timeout if applicable', async () => {
      const userId = 'test-user-606';
      const sessionStartTime = new Date('2025-10-22T10:00:00.000Z');
      const expiresAt = new Date('2025-10-22T18:00:00.000Z'); // 8 hours later

      const session = createTestSession({
        user_id: userId,
        session_token: 'priority-test-token',
        remember_me: false,
        expires_at: expiresAt.toISOString(),
        created_at: sessionStartTime.toISOString(),
        last_activity_at: sessionStartTime.toISOString(),
      });

      mockSupabase._mockData.sessions.push(session);

      // Advance by 45 minutes (10:45 - past inactivity but before 8 hour expiration)
      vi.setSystemTime(new Date('2025-10-22T10:45:00.000Z'));

      const validation = await validateSession(session.session_token);
      
      // Should fail due to inactivity, not absolute timeout
      expect(validation.isValid).toBe(false);
      expect(validation.reason).toBe('expired_inactivity');
      expect(validation.expiration_reason).toBe('inactivity');
    });
  });

  /**
   * Combined scenarios testing multiple expiration conditions
   */
  describe('Combined expiration scenarios', () => {
    it('should handle multiple sessions with different expiration times', async () => {
      const userId = 'test-user-multi';
      const sessionStartTime = new Date('2025-10-22T10:00:00.000Z');

      // Create short session (expires in 8 hours)
      const shortSession = createTestSession({
        user_id: userId,
        session_token: 'short-multi',
        remember_me: false,
        expires_at: new Date('2025-10-22T18:00:00.000Z').toISOString(),
        created_at: sessionStartTime.toISOString(),
        last_activity_at: sessionStartTime.toISOString(),
      });

      // Create long session (expires in 7 days)
      const longSession = createTestSession({
        user_id: userId,
        session_token: 'long-multi',
        remember_me: true,
        expires_at: new Date('2025-10-29T10:00:00.000Z').toISOString(),
        created_at: sessionStartTime.toISOString(),
        last_activity_at: sessionStartTime.toISOString(),
      });

      mockSupabase._mockData.sessions.push(shortSession, longSession);

      // After 4 hours (14:00): both valid
      vi.setSystemTime(new Date('2025-10-22T14:00:00.000Z'));
      // Update activity to avoid inactivity timeout
      shortSession.last_activity_at = new Date('2025-10-22T14:00:00.000Z').toISOString();
      expect((await validateSession(shortSession.session_token)).isValid).toBe(true);
      expect((await validateSession(longSession.session_token)).isValid).toBe(true);

      // After 9 hours (19:00): short expired, long still valid
      vi.setSystemTime(new Date('2025-10-22T19:00:00.000Z'));
      expect((await validateSession(shortSession.session_token)).isValid).toBe(false);
      expect((await validateSession(longSession.session_token)).isValid).toBe(true);

      // After 8 days (Oct 30): both expired
      vi.setSystemTime(new Date('2025-10-30T10:00:00.000Z'));
      expect((await validateSession(shortSession.session_token)).isValid).toBe(false);
      expect((await validateSession(longSession.session_token)).isValid).toBe(false);
    });
  });
});

