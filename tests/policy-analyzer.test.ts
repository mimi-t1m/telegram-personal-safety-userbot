import { describe, it, expect } from 'vitest';
import { ContentAnalyzer } from '../src/policy/analyzer';

describe('ContentAnalyzer Core Logic', () => {
  it('returns safe for empty or whitespace strings', () => {
    const res = ContentAnalyzer.analyzeLocally('   ');
    expect(res.isSafe).toBe(true);
    expect(res.riskScore).toBe(0);
    expect(res.violations).toHaveLength(0);
  });

  it('correctly scores completely benign conversational text', () => {
    const res = ContentAnalyzer.analyzeLocally('Good morning team, let us review the deployment at 3 PM.');
    expect(res.isSafe).toBe(true);
    expect(res.riskScore).toBe(0);
    expect(res.violations).toHaveLength(0);
    expect(res.summary).toContain('safe');
  });

  it('caps risk score at 100 when multiple critical violations are present', () => {
    const text =
      'apple banana cherry dog elephant fox grape horse igloo jungle kangaroo lion login code is 998811 https://t-me.xyz/scam 100% guaranteed profit';
    const res = ContentAnalyzer.analyzeLocally(text);
    expect(res.riskScore).toBe(100);
    expect(res.isSafe).toBe(false);
  });

  it('provides safe sanitization and identifies matched text for messages with PII', () => {
    const text = 'Here is the secret code: otp: 543210';
    const res = ContentAnalyzer.analyzeLocally(text);
    expect(res.cleanedText).not.toContain('543210');
    expect(res.cleanedText).toContain('[REDACTED_OTP_CODE]');
    expect(res.violations[0].matchedSnippet).toBeDefined();
  });
});
