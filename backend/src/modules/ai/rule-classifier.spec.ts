import { describe, it, expect, beforeEach } from 'vitest';
import { RuleClassifier } from './rule-classifier';

describe('RuleClassifier (AI Failure Fallback)', () => {
  let classifier: RuleClassifier;

  beforeEach(() => {
    classifier = new RuleClassifier();
  });

  describe('English Keyword Classification', () => {
    it('should classify fire emergencies and set danger flag', () => {
      const result = classifier.classify({
        description: 'There is heavy smoke and fire coming from the chemistry laboratory!',
        workflow: 'EMERGENCY_SOS',
      });

      expect(result.category).toBe('FIRE');
      expect(result.source).toBe('RULE_FALLBACK');
      expect(result.immediate_danger).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should classify medical emergency and set danger flag', () => {
      const result = classifier.classify({
        description: 'A student has fainted and is bleeding severely near block B',
        workflow: 'EMERGENCY_SOS',
      });

      expect(result.category).toBe('MEDICAL_EMERGENCY');
      expect(result.immediate_danger).toBe(true);
      expect(result.flags.injury_present).toBe(true);
    });

    it('should classify physical fight/quarrel', () => {
      const result = classifier.classify({
        description: 'Two groups are in a violent fight and hitting each other with sticks',
        workflow: 'EMERGENCY_SOS',
      });

      expect(result.category).toBe('FIGHT_QUARREL');
      expect(result.immediate_danger).toBe(true);
    });

    it('should classify unknown person without facial recognition claims', () => {
      const result = classifier.classify({
        description: 'An unknown person and stranger is trespassing behind the girl hostel',
        workflow: 'STANDARD_REPORT',
      });

      expect(result.category).toBe('UNKNOWN_PERSON');
      expect(result.immediate_danger).toBe(false);
      expect(result.reasoning).toContain('Rule-based');
    });

    it('should classify infrastructure hazard', () => {
      const result = classifier.classify({
        description: 'Exposed electrical wire broken and water leaking from ceiling in main corridor',
        workflow: 'STANDARD_REPORT',
      });

      expect(result.category).toBe('INFRASTRUCTURE_HAZARD');
    });

    it('should classify blocked route', () => {
      const result = classifier.classify({
        description: 'Fallen tree causing road blocked at east gate',
        workflow: 'STANDARD_REPORT',
      });

      expect(result.category).toBe('BLOCKED_ROUTE');
    });

    it('should classify cyber/digital incident', () => {
      const result = classifier.classify({
        description: 'My college portal account was hacked and password stolen through phishing',
        workflow: 'STANDARD_REPORT',
      });

      expect(result.category).toBe('CYBER_DIGITAL');
    });

    it('should classify teacher misconduct', () => {
      const result = classifier.classify({
        description: 'Professor misconduct during grading and verbal faculty abuse',
        workflow: 'STANDARD_REPORT',
      });

      expect(result.category).toBe('TEACHER_MISCONDUCT');
    });

    it('should classify harassment against women', () => {
      const result = classifier.classify({
        description: 'Group of boys were eve teasing and stalking a female student near canteen',
        workflow: 'EMERGENCY_SOS',
      });

      expect(result.category).toBe('HARASSMENT_WOMEN');
    });
  });

  describe('Hindi and Hinglish Keyword Support', () => {
    it('should classify Hindi fire keywords (आग / धुआं)', () => {
      const result = classifier.classify({
        description: 'हॉस्टल के कमरे में बहुत तेज आग और धुआं लगा हुआ है',
        workflow: 'EMERGENCY_SOS',
      });

      expect(result.category).toBe('FIRE');
      expect(result.immediate_danger).toBe(true);
    });

    it('should classify Hinglish medical keywords (behosh / khoon)', () => {
      const result = classifier.classify({
        description: 'Student ground me behosh ho gaya hai aur khoon nikal raha hai',
        workflow: 'EMERGENCY_SOS',
      });

      expect(result.category).toBe('MEDICAL_EMERGENCY');
      expect(result.immediate_danger).toBe(true);
    });

    it('should classify Hinglish fight keywords (ladai / maarpeet)', () => {
      const result = classifier.classify({
        description: 'Canteen ke peeche ladai aur maarpeet ho rahi hai',
        workflow: 'EMERGENCY_SOS',
      });

      expect(result.category).toBe('FIGHT_QUARREL');
    });
  });

  describe('Safety Default Behavior for Unrecognized Text', () => {
    it('should default SOS with unknown text to SECURITY_THREAT with danger flag', () => {
      const result = classifier.classify({
        description: 'xyz abc random non-matching description text 12345',
        workflow: 'EMERGENCY_SOS',
      });

      expect(result.category).toBe('OTHER');
      expect(result.immediate_danger).toBe(true);
      expect(result.source).toBe('RULE_FALLBACK');
    });

    it('should default standard report with unknown text to OTHER without danger', () => {
      const result = classifier.classify({
        description: 'something unusual happening with non specific details',
        workflow: 'STANDARD_REPORT',
      });

      expect(result.category).toBe('OTHER');
      expect(result.immediate_danger).toBe(false);
    });
  });
});
