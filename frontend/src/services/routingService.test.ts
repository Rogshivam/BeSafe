import { describe, it, expect } from 'vitest';
import { formatDistance, formatDuration, buildStepInstruction } from './routingService';

describe('routingService helper tests', () => {
  describe('formatDistance', () => {
    it('formats short distance in meters', () => {
      expect(formatDistance(450)).toBe('450 m');
      expect(formatDistance(85)).toBe('85 m');
    });

    it('formats longer distance in kilometers', () => {
      expect(formatDistance(8400)).toBe('8.4 km');
      expect(formatDistance(12500)).toBe('13 km');
    });

    it('handles 0 or invalid values', () => {
      expect(formatDistance(0)).toBe('0 m');
      expect(formatDistance(-10)).toBe('0 m');
    });
  });

  describe('formatDuration', () => {
    it('formats short duration in minutes or seconds', () => {
      expect(formatDuration(45)).toBe('< 1 min');
      expect(formatDuration(120)).toBe('2 min');
      expect(formatDuration(1260)).toBe('21 min');
    });

    it('formats longer duration in hours and minutes', () => {
      expect(formatDuration(3600)).toBe('1 hr');
      expect(formatDuration(4500)).toBe('1 hr 15 min');
      expect(formatDuration(7500)).toBe('2 hr 5 min');
    });
  });

  describe('buildStepInstruction', () => {
    it('handles depart instruction', () => {
      const step = {
        name: 'MG Road',
        maneuver: { type: 'depart', bearing_after: 0 }
      };
      expect(buildStepInstruction(step, 0, 4)).toContain('Head north on MG Road');
    });

    it('handles arrive instruction', () => {
      const step = {
        maneuver: { type: 'arrive' }
      };
      expect(buildStepInstruction(step, 3, 4)).toBe('Arrive at your destination');
    });

    it('handles turn instruction', () => {
      const step = {
        name: 'Main Street',
        maneuver: { type: 'turn', modifier: 'right' }
      };
      expect(buildStepInstruction(step, 1, 4)).toBe('Turn right onto Main Street');
    });
  });
});
