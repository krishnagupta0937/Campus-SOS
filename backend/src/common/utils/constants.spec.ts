import { describe, it, expect } from 'vitest';
import {
  isValidStatusTransition,
  VALID_STATUS_TRANSITIONS,
  VALID_ASSIGNMENT_TRANSITIONS,
  STATUS_LABELS,
  CAMPUS_WIDE_DENY_LIST,
  RESTRICTED_CATEGORIES,
  generatePublicId,
} from './constants';

describe('Constants & State Machine Rules', () => {
  describe('Incident Status Transitions (ARCHITECTURE.md §6.1)', () => {
    it('should permit valid forward transitions', () => {
      expect(isValidStatusTransition('DRAFT', 'CREATED')).toBe(true);
      expect(isValidStatusTransition('CREATED', 'TEAMS_NOTIFIED')).toBe(true);
      expect(isValidStatusTransition('TEAMS_NOTIFIED', 'RESPONDER_ASSIGNED')).toBe(true);
      expect(isValidStatusTransition('RESPONDER_ASSIGNED', 'RESPONDER_ON_THE_WAY')).toBe(true);
      expect(isValidStatusTransition('RESPONDER_ON_THE_WAY', 'RESPONDER_AT_LOCATION')).toBe(true);
      expect(isValidStatusTransition('RESPONDER_AT_LOCATION', 'RESOLVED')).toBe(true);
      expect(isValidStatusTransition('RESOLVED', 'REOPENED')).toBe(true);
      expect(isValidStatusTransition('REOPENED', 'TEAMS_NOTIFIED')).toBe(true);
    });

    it('should reject invalid or backwards transitions', () => {
      expect(isValidStatusTransition('DRAFT', 'RESOLVED')).toBe(false);
      expect(isValidStatusTransition('CREATED', 'RESPONDER_AT_LOCATION')).toBe(false);
      expect(isValidStatusTransition('CANCELLED', 'CREATED')).toBe(false);
      expect(isValidStatusTransition('RESOLVED', 'CREATED')).toBe(false);
      expect(isValidStatusTransition('NON_EXISTENT_STATE', 'CREATED')).toBe(false);
    });
  });

  describe('Restricted Categories & Deny List', () => {
    it('should include sensitive categories in CAMPUS_WIDE_DENY_LIST', () => {
      expect(CAMPUS_WIDE_DENY_LIST.has('TEACHER_MISCONDUCT')).toBe(true);
      expect(CAMPUS_WIDE_DENY_LIST.has('HARASSMENT_WOMEN')).toBe(true);
      expect(CAMPUS_WIDE_DENY_LIST.has('HARASSMENT_MEN')).toBe(true);
      expect(CAMPUS_WIDE_DENY_LIST.has('STUDENT_TEACHER_DISPUTE')).toBe(true);
      expect(CAMPUS_WIDE_DENY_LIST.has('MEDICAL_EMERGENCY')).toBe(true);
    });

    it('should designate privacy-critical categories in RESTRICTED_CATEGORIES', () => {
      expect(RESTRICTED_CATEGORIES.has('HARASSMENT_WOMEN')).toBe(true);
      expect(RESTRICTED_CATEGORIES.has('HARASSMENT_MEN')).toBe(true);
      expect(RESTRICTED_CATEGORIES.has('TEACHER_MISCONDUCT')).toBe(true);
      expect(RESTRICTED_CATEGORIES.has('MEDICAL_EMERGENCY')).toBe(true);
    });
  });

  describe('Public ID Generation', () => {
    it('should generate formatted public IDs with SOS prefix', () => {
      const publicId = generatePublicId('EMERGENCY_SOS', 42);
      const currentYear = new Date().getFullYear();
      expect(publicId).toBe(`SOS-${currentYear}-000042`);
    });

    it('should generate formatted public IDs with INC prefix for standard reports', () => {
      const publicId = generatePublicId('STANDARD_REPORT', 7);
      const currentYear = new Date().getFullYear();
      expect(publicId).toBe(`INC-${currentYear}-000007`);
    });
  });
});
