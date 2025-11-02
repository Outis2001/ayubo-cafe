/**
 * Pickup Time Slots Tests
 * 
 * Unit tests for pickup time slot management utilities (Task 10.0)
 * Tests time slot configuration, validation, and formatting
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Supabase
vi.mock('../../src/config/supabase', () => ({
  supabaseClient: {
    from: vi.fn(),
  },
}));

describe('Pickup Time Slots Utilities', () => {
  let supabaseMock;
  let pickupTimeSlots;

  beforeEach(async () => {
    vi.clearAllMocks();
    const supabaseModule = await import('../../src/config/supabase');
    supabaseMock = supabaseModule.supabaseClient;
    pickupTimeSlots = await import('../../src/utils/pickupTimeSlots');
  });

  describe('getPickupTimeSlots', () => {
    it('should fetch configured time slots from database', async () => {
      const mockTimeSlots = [
        { id: '1', startTime: '09:00', endTime: '12:00', label: 'Morning', enabled: true },
        { id: '2', startTime: '14:00', endTime: '17:00', label: 'Afternoon', enabled: true },
      ];

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { config_value: JSON.stringify(mockTimeSlots) },
              error: null,
            }),
          }),
        }),
      });

      const result = await pickupTimeSlots.getPickupTimeSlots();

      expect(result.success).toBe(true);
      expect(result.timeSlots).toEqual(mockTimeSlots);
      expect(supabaseMock.from).toHaveBeenCalledWith('system_configuration');
    });

    it('should return default time slots if not configured', async () => {
      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      const result = await pickupTimeSlots.getPickupTimeSlots();

      expect(result.success).toBe(true);
      expect(result.timeSlots).toBeDefined();
      expect(Array.isArray(result.timeSlots)).toBe(true);
      expect(result.timeSlots.length).toBeGreaterThan(0);
      
      // Default time slots should have required properties
      result.timeSlots.forEach(slot => {
        expect(slot).toHaveProperty('id');
        expect(slot).toHaveProperty('startTime');
        expect(slot).toHaveProperty('endTime');
        expect(slot).toHaveProperty('label');
        expect(slot).toHaveProperty('enabled');
      });
    });

    it('should handle database errors gracefully', async () => {
      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error', code: 'ERROR' },
            }),
          }),
        }),
      });

      const result = await pickupTimeSlots.getPickupTimeSlots();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.timeSlots).toBeDefined(); // Should still return default slots
    });

    it('should parse JSON string config values', async () => {
      const mockTimeSlots = [
        { id: '1', startTime: '10:00', endTime: '13:00', label: 'Mid Morning', enabled: true },
      ];

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { config_value: JSON.stringify(mockTimeSlots) },
              error: null,
            }),
          }),
        }),
      });

      const result = await pickupTimeSlots.getPickupTimeSlots();

      expect(result.success).toBe(true);
      expect(result.timeSlots).toEqual(mockTimeSlots);
    });

    it('should handle object config values', async () => {
      const mockTimeSlots = [
        { id: '1', startTime: '10:00', endTime: '13:00', label: 'Mid Morning', enabled: true },
      ];

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { config_value: mockTimeSlots }, // Already an object
              error: null,
            }),
          }),
        }),
      });

      const result = await pickupTimeSlots.getPickupTimeSlots();

      expect(result.success).toBe(true);
      expect(result.timeSlots).toEqual(mockTimeSlots);
    });
  });

  describe('savePickupTimeSlots', () => {
    it('should save valid time slots', async () => {
      const validTimeSlots = [
        { id: '1', startTime: '09:00', endTime: '12:00', label: 'Morning', enabled: true },
        { id: '2', startTime: '14:00', endTime: '17:00', label: 'Afternoon', enabled: true },
      ];

      // Mock: configuration already exists
      supabaseMock.from.mockImplementation((table) => {
        if (table === 'system_configuration') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { config_id: 'config-123' },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                error: null,
              }),
            }),
          };
        }
      });

      const result = await pickupTimeSlots.savePickupTimeSlots(validTimeSlots);

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
    });

    it('should insert new configuration if not exists', async () => {
      const validTimeSlots = [
        { id: '1', startTime: '09:00', endTime: '12:00', label: 'Morning', enabled: true },
      ];

      supabaseMock.from.mockImplementation((table) => {
        if (table === 'system_configuration') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null, // Configuration doesn't exist
                  error: null,
                }),
              }),
            }),
            insert: vi.fn().mockResolvedValue({
              error: null,
            }),
          };
        }
      });

      const result = await pickupTimeSlots.savePickupTimeSlots(validTimeSlots);

      expect(result.success).toBe(true);
    });

    it('should reject invalid time slots', async () => {
      const invalidTimeSlots = [
        { id: '1', startTime: '12:00', endTime: '09:00', label: 'Invalid', enabled: true }, // End before start
      ];

      const result = await pickupTimeSlots.savePickupTimeSlots(invalidTimeSlots);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle database errors', async () => {
      const validTimeSlots = [
        { id: '1', startTime: '09:00', endTime: '12:00', label: 'Morning', enabled: true },
      ];

      supabaseMock.from.mockImplementation((table) => {
        if (table === 'system_configuration') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { config_id: 'config-123' },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                error: { message: 'Database error' },
              }),
            }),
          };
        }
      });

      const result = await pickupTimeSlots.savePickupTimeSlots(validTimeSlots);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('validateTimeSlots', () => {
    it('should validate correct time slots', () => {
      const validTimeSlots = [
        { id: '1', startTime: '09:00', endTime: '12:00', label: 'Morning', enabled: true },
        { id: '2', startTime: '14:00', endTime: '17:00', label: 'Afternoon', enabled: true },
      ];

      const result = pickupTimeSlots.validateTimeSlots(validTimeSlots);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject non-array input', () => {
      const result = pickupTimeSlots.validateTimeSlots('not an array');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be an array');
    });

    it('should reject empty array', () => {
      const result = pickupTimeSlots.validateTimeSlots([]);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('At least one time slot is required');
    });

    it('should reject slot with missing start time', () => {
      const invalidTimeSlots = [
        { id: '1', endTime: '12:00', label: 'Morning', enabled: true },
      ];

      const result = pickupTimeSlots.validateTimeSlots(invalidTimeSlots);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Start time and end time are required');
    });

    it('should reject slot with missing end time', () => {
      const invalidTimeSlots = [
        { id: '1', startTime: '09:00', label: 'Morning', enabled: true },
      ];

      const result = pickupTimeSlots.validateTimeSlots(invalidTimeSlots);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Start time and end time are required');
    });

    it('should reject invalid time format', () => {
      const invalidTimeSlots = [
        { id: '1', startTime: '9:00', endTime: '12:00', label: 'Morning', enabled: true }, // Missing leading zero
      ];

      const result = pickupTimeSlots.validateTimeSlots(invalidTimeSlots);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid time format');
    });

    it('should reject end time before start time', () => {
      const invalidTimeSlots = [
        { id: '1', startTime: '12:00', endTime: '09:00', label: 'Invalid', enabled: true },
      ];

      const result = pickupTimeSlots.validateTimeSlots(invalidTimeSlots);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('End time must be after start time');
    });

    it('should reject end time equal to start time', () => {
      const invalidTimeSlots = [
        { id: '1', startTime: '09:00', endTime: '09:00', label: 'Invalid', enabled: true },
      ];

      const result = pickupTimeSlots.validateTimeSlots(invalidTimeSlots);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('End time must be after start time');
    });

    it('should reject overlapping time slots', () => {
      const overlappingTimeSlots = [
        { id: '1', startTime: '09:00', endTime: '12:00', label: 'Morning', enabled: true },
        { id: '2', startTime: '11:00', endTime: '14:00', label: 'Overlap', enabled: true }, // Overlaps with slot 1
      ];

      const result = pickupTimeSlots.validateTimeSlots(overlappingTimeSlots);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('overlaps');
    });

    it('should allow adjacent time slots', () => {
      const adjacentTimeSlots = [
        { id: '1', startTime: '09:00', endTime: '12:00', label: 'Morning', enabled: true },
        { id: '2', startTime: '12:00', endTime: '15:00', label: 'Afternoon', enabled: true }, // Starts when previous ends
      ];

      const result = pickupTimeSlots.validateTimeSlots(adjacentTimeSlots);

      expect(result.valid).toBe(true);
    });

    it('should ignore disabled slots when checking overlaps', () => {
      const timeSlots = [
        { id: '1', startTime: '09:00', endTime: '12:00', label: 'Morning', enabled: true },
        { id: '2', startTime: '11:00', endTime: '14:00', label: 'Overlap', enabled: false }, // Disabled, so overlap OK
      ];

      const result = pickupTimeSlots.validateTimeSlots(timeSlots);

      expect(result.valid).toBe(true);
    });

    it('should validate 24-hour time format', () => {
      const validTimeSlots = [
        { id: '1', startTime: '00:00', endTime: '23:59', label: 'All Day', enabled: true },
      ];

      const result = pickupTimeSlots.validateTimeSlots(validTimeSlots);

      expect(result.valid).toBe(true);
    });

    it('should reject invalid hours', () => {
      const invalidTimeSlots = [
        { id: '1', startTime: '25:00', endTime: '26:00', label: 'Invalid', enabled: true },
      ];

      const result = pickupTimeSlots.validateTimeSlots(invalidTimeSlots);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid time format');
    });

    it('should reject invalid minutes', () => {
      const invalidTimeSlots = [
        { id: '1', startTime: '09:60', endTime: '12:00', label: 'Invalid', enabled: true },
      ];

      const result = pickupTimeSlots.validateTimeSlots(invalidTimeSlots);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid time format');
    });
  });

  describe('formatTimeRange', () => {
    it('should format AM times correctly', () => {
      expect(pickupTimeSlots.formatTimeRange('09:00', '11:30')).toBe('9:00 AM - 11:30 AM');
      expect(pickupTimeSlots.formatTimeRange('08:15', '10:45')).toBe('8:15 AM - 10:45 AM');
    });

    it('should format PM times correctly', () => {
      expect(pickupTimeSlots.formatTimeRange('14:00', '17:00')).toBe('2:00 PM - 5:00 PM');
      expect(pickupTimeSlots.formatTimeRange('13:30', '16:45')).toBe('1:30 PM - 4:45 PM');
    });

    it('should format noon correctly', () => {
      expect(pickupTimeSlots.formatTimeRange('12:00', '13:00')).toBe('12:00 PM - 1:00 PM');
    });

    it('should format midnight correctly', () => {
      expect(pickupTimeSlots.formatTimeRange('00:00', '01:00')).toBe('12:00 AM - 1:00 AM');
    });

    it('should format mixed AM/PM times', () => {
      expect(pickupTimeSlots.formatTimeRange('10:00', '14:00')).toBe('10:00 AM - 2:00 PM');
    });

    it('should preserve minutes in output', () => {
      expect(pickupTimeSlots.formatTimeRange('09:15', '11:45')).toBe('9:15 AM - 11:45 AM');
      expect(pickupTimeSlots.formatTimeRange('14:30', '17:15')).toBe('2:30 PM - 5:15 PM');
    });
  });

  describe('getEnabledTimeSlots', () => {
    it('should return only enabled time slots', async () => {
      const mockTimeSlots = [
        { id: '1', startTime: '09:00', endTime: '12:00', label: 'Morning', enabled: true },
        { id: '2', startTime: '12:00', endTime: '15:00', label: 'Afternoon', enabled: false },
        { id: '3', startTime: '15:00', endTime: '18:00', label: 'Evening', enabled: true },
      ];

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { config_value: JSON.stringify(mockTimeSlots) },
              error: null,
            }),
          }),
        }),
      });

      const result = await pickupTimeSlots.getEnabledTimeSlots();

      expect(result.success).toBe(true);
      expect(result.timeSlots.length).toBe(2);
      expect(result.timeSlots.every(slot => slot.enabled !== false)).toBe(true);
    });

    it('should handle empty enabled slots', async () => {
      const mockTimeSlots = [
        { id: '1', startTime: '09:00', endTime: '12:00', label: 'Morning', enabled: false },
        { id: '2', startTime: '12:00', endTime: '15:00', label: 'Afternoon', enabled: false },
      ];

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { config_value: JSON.stringify(mockTimeSlots) },
              error: null,
            }),
          }),
        }),
      });

      const result = await pickupTimeSlots.getEnabledTimeSlots();

      expect(result.success).toBe(true);
      expect(result.timeSlots.length).toBe(0);
    });
  });

  describe('isValidPickupTime', () => {
    beforeEach(() => {
      const mockTimeSlots = [
        { id: '1', startTime: '09:00', endTime: '12:00', label: 'Morning', enabled: true },
        { id: '2', startTime: '14:00', endTime: '17:00', label: 'Afternoon', enabled: true },
      ];

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { config_value: JSON.stringify(mockTimeSlots) },
              error: null,
            }),
          }),
        }),
      });
    });

    it('should return true for valid pickup time', async () => {
      expect(await pickupTimeSlots.isValidPickupTime('09:00')).toBe(true);
      expect(await pickupTimeSlots.isValidPickupTime('10:30')).toBe(true);
      expect(await pickupTimeSlots.isValidPickupTime('14:00')).toBe(true);
      expect(await pickupTimeSlots.isValidPickupTime('16:30')).toBe(true);
    });

    it('should return false for time outside slots', async () => {
      expect(await pickupTimeSlots.isValidPickupTime('08:00')).toBe(false);
      expect(await pickupTimeSlots.isValidPickupTime('13:00')).toBe(false);
      expect(await pickupTimeSlots.isValidPickupTime('18:00')).toBe(false);
    });

    it('should return false for time at slot end boundary', async () => {
      // Time slots are [start, end), so end time is not included
      expect(await pickupTimeSlots.isValidPickupTime('12:00')).toBe(false);
      expect(await pickupTimeSlots.isValidPickupTime('17:00')).toBe(false);
    });

    it('should return false on database error', async () => {
      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error', code: 'ERROR' },
            }),
          }),
        }),
      });

      expect(await pickupTimeSlots.isValidPickupTime('10:00')).toBe(false);
    });
  });
});

