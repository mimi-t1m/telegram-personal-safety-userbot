import { TELEGRAM_RULES, AnalysisResult, PolicyViolation } from './rules';

export class ContentAnalyzer {
  /**
   * Fast rule-based analysis (runs locally on V8 with < 1ms latency)
   */
  static analyzeLocally(text: string): AnalysisResult {
    const trimmed = text.trim();
    if (!trimmed) {
      return {
        isSafe: true,
        riskScore: 0,
        violations: [],
        cleanedText: '',
        summary: 'No text provided.',
      };
    }

    const violations: PolicyViolation[] = [];
    let riskScore = 0;
    let cleaned = trimmed;

    // 1. Check predefined rule definitions
    for (const rule of TELEGRAM_RULES) {
      const match = trimmed.match(rule.regex);
      if (match) {
        violations.push({
          id: rule.id,
          category: rule.category,
          severity: rule.severity,
          title: rule.title,
          matchedSnippet: match[0],
          reason: rule.reason,
          recommendation: rule.recommendation,
        });

        switch (rule.severity) {
          case 'CRITICAL':
            riskScore += 60;
            break;
          case 'HIGH':
            riskScore += 35;
            break;
          case 'MEDIUM':
            riskScore += 20;
            break;
          case 'LOW':
            riskScore += 10;
            break;
        }

        // Apply auto-sanitization / cleaning with descriptive encrypted/redacted tags
        if (rule.id === 'mock-test-issue') {
          cleaned = cleaned
            .replace(/test\s+lỗi\s+từ/gi, '[CORRECTED_WORD]')
            .replace(/test\s+incorrect\s+word/gi, '[CORRECTED_WORD]');
        } else if (rule.id === 'crypto-seed-phrase') {
          cleaned = cleaned.replace(rule.regex, '[REDACTED_SEED_PHRASE]');
        } else if (rule.id === 'telegram-session-string-leak') {
          cleaned = cleaned.replace(rule.regex, '[REDACTED_SESSION_STRING]');
        } else if (rule.id === 'telegram-bot-token-leak') {
          cleaned = cleaned.replace(rule.regex, '[REDACTED_BOT_TOKEN]');
        } else if (rule.id === 'otp-telegram-code') {
          cleaned = cleaned.replace(rule.regex, '[REDACTED_OTP_CODE]');
        } else if (rule.id === 'credit-card-leakage') {
          cleaned = cleaned.replace(rule.regex, '[REDACTED_CREDIT_CARD]');
        } else if (rule.id === 'national-id-doxxing') {
          cleaned = cleaned.replace(rule.regex, '[REDACTED_NATIONAL_ID]');
        } else if (rule.id === 'bank-account-spam') {
          cleaned = cleaned.replace(rule.regex, '[REDACTED_BANK_ACCOUNT]');
        } else if (rule.id === 'stealer-log-dump') {
          cleaned = cleaned.replace(rule.regex, '[REDACTED_CREDENTIALS]');
        } else if (rule.id === 'character-stretching-spam') {
          cleaned = cleaned.replace(/([A-Za-zÀ-ỹ])\1{5,}/g, '$1$1');
        } else if (rule.id === 'zero-width-obfuscation') {
          cleaned = cleaned.replace(rule.regex, '');
        } else if (rule.id === 'url-shortener') {
          cleaned = cleaned.replace(rule.regex, '[DIRECT_LINK_HERE]');
        } else if (rule.id === 'phishing-telegram-impersonation') {
          cleaned = cleaned.replace(rule.regex, '[REDACTED_PHISHING_LINK]');
        } else if (rule.id === 'voting-contest-phishing') {
          cleaned = cleaned.replace(rule.regex, '[REDACTED_VOTING_LINK]');
        } else if (rule.id === 'fake-premium-phishing') {
          cleaned = cleaned.replace(rule.regex, '[REDACTED_FAKE_PROMO]');
        } else if (rule.id === 'urgent-account-deletion-phishing') {
          cleaned = cleaned.replace(rule.regex, '[REDACTED_SCARE_TACTIC]');
        } else if (rule.id === 'incitement-to-violence') {
          cleaned = cleaned.replace(rule.regex, '[REDACTED_VIOLENT_CONTENT]');
        } else if (rule.id === 'death-threat-harassment') {
          cleaned = cleaned.replace(rule.regex, '[REDACTED_DEATH_THREAT]');
        } else if (rule.id === 'explosives-weapons-crafting') {
          cleaned = cleaned.replace(rule.regex, '[REDACTED_WEAPON_INSTRUCTIONS]');
        } else if (rule.id === 'blackmail-extortion') {
          cleaned = cleaned.replace(rule.regex, '[REDACTED_EXTORTION_THREAT]');
        } else if (rule.id === 'self-harm-suicide-incitement') {
          cleaned = cleaned.replace(rule.regex, '[REDACTED_SELF_HARM]');
        } else if (rule.id === 'terrorist-extremist-content') {
          cleaned = cleaned.replace(rule.regex, '[REDACTED_EXTREMIST_CONTENT]');
        } else if (rule.id === 'doxxing-harassment-raid') {
          cleaned = cleaned.replace(rule.regex, '[REDACTED_DOXXING_INFO]');
        } else if (rule.id === 'forged-documents-fake-ids') {
          cleaned = cleaned.replace(rule.regex, '[REDACTED_FORGED_DOCUMENT]');
        } else if (rule.id === 'illicit-drugs-weapons') {
          cleaned = cleaned.replace(rule.regex, '[REDACTED_ILLICIT_GOODS]');
        } else if (rule.id === 'telegram-impersonation') {
          cleaned = cleaned.replace(rule.regex, '[REDACTED_IMPERSONATION]');
        } else if (rule.id === 'recovery-scam') {
          cleaned = cleaned.replace(rule.regex, '[REDACTED_RECOVERY_SCAM]');
        } else if (rule.id === 'telegram-stars-fraud') {
          cleaned = cleaned.replace(rule.regex, '[REDACTED_STARS_EXPLOIT]');
        } else if (rule.id === 'fake-airdrop-drainer') {
          cleaned = cleaned.replace(rule.regex, '[REDACTED_DRAINER_LINK]');
        } else if (rule.id === 'gambling-casino-scam') {
          cleaned = cleaned.replace(rule.regex, '[REDACTED_GAMBLING_PROMO]');
        } else if (rule.id === 'bio-redirection-spam') {
          cleaned = cleaned.replace(rule.regex, '[REDACTED_BIO_LINK]');
        } else if (rule.id === 'check-inbox-bait') {
          cleaned = cleaned.replace(rule.regex, '[REDACTED_INBOX_BAIT]');
        } else if (rule.id === 'external-platform-harvesting') {
          cleaned = cleaned.replace(rule.regex, '[REDACTED_EXTERNAL_INVITE]');
        } else if (rule.id === 'aggressive-cold-outreach') {
          cleaned = cleaned.replace(rule.regex, '[REDACTED_COLD_OUTREACH]');
        } else if (rule.id.startsWith('get-rich-quick-scam')) {
          cleaned = cleaned.replace(rule.regex, '[REPHRASE_INVESTMENT_PROMISE]');
        } else if (rule.id === 'piracy-copyright') {
          cleaned = cleaned.replace(rule.regex, '[REDACTED_PIRATED_CONTENT]');
        } else if (rule.category === 'SECURITY_PII') {
          cleaned = cleaned.replace(rule.regex, '[REDACTED_CONFIDENTIAL]');
        } else if (rule.category === 'VIOLENCE_THREATS') {
          cleaned = cleaned.replace(rule.regex, '[REDACTED_PROHIBITED_CONTENT]');
        } else if (rule.category === 'AGGRESSIVE_OUTREACH') {
          cleaned = cleaned.replace(rule.regex, '[REDACTED_OUTREACH]');
        } else if (rule.category === 'SPAM') {
          cleaned = cleaned.replace(rule.regex, '[REPHRASE_PROMO_TEXT]');
        }
      }
    }

    // 2. Mass Mentions Detection (> 3 @mentions in a single message)
    const mentionMatches = trimmed.match(/@[a-zA-Z0-9_]{3,32}/g);
    if (mentionMatches && mentionMatches.length > 3) {
      violations.push({
        id: 'mass-mention-flooding',
        category: 'SPAM',
        severity: 'HIGH',
        title: 'Mass Mentions Flooding',
        matchedSnippet: mentionMatches.slice(0, 4).join(', ') + '...',
        reason: `Found ${mentionMatches.length} user mentions. Tagging many users simultaneously triggers Telegram automated spam bans.`,
        recommendation: 'Reduce the number of @mentions to 3 or fewer per message.',
      });
      riskScore += 35;
      // Sanitize mass mentions by keeping only the first 3
      const allowedMentions = mentionMatches.slice(0, 3);
      let count = 0;
      cleaned = cleaned.replace(/@[a-zA-Z0-9_]{3,32}/g, (match) => {
        count++;
        return count <= 3 ? match : '';
      });
    }

    // Clean up double spaces created by replacements
    cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

    // Cap score at 100
    riskScore = Math.min(100, riskScore);
    const isSafe = riskScore < 30 && violations.length === 0;

    let summary = '';
    if (violations.length === 0 && riskScore === 0) {
      summary = '✅ Content looks safe and compliant with Telegram policies.';
    } else if (riskScore < 30) {
      summary = 'ℹ️ Low risk detected. Content should be fine, but review recommendations.';
    } else if (riskScore < 70) {
      summary = '⚠️ Moderate risk of triggering spam filters or user complaints.';
    } else {
      summary = '🚨 Critical violation risk! Sending this may result in Telegram account bans or restrictions.';
    }

    return {
      isSafe,
      riskScore,
      violations,
      cleanedText: cleaned,
      summary,
    };
  }

  /**
   * Optional AI contextual evaluation using Gemini Flash API
   */
  static async analyzeWithAI(text: string, apiKey: string): Promise<AnalysisResult> {
    const localResult = this.analyzeLocally(text);

    try {
      const prompt = `You are a Telegram Security and Anti-Spam Compliance Auditor.
Analyze the following text that a user wants to send on Telegram:
"""
${text}
"""

Evaluate against:
1. Telegram Terms of Service (No spam, no scams, no illegal goods, no copyright piracy).
2. Anti-SpamBot triggers (aggressive cold outreach, misleading links, pyramid schemes, mass mentions).
3. Privacy/PII leaks (crypto seeds, OTP codes, credit cards).

Output strictly valid JSON with this schema:
{
  "riskScore": number (0 to 100),
  "isSafe": boolean,
  "summary": "short summary sentence",
  "safeRewrite": "cleaned/safer version of the message without spam triggers or sensitive data",
  "warnings": ["warning 1", "warning 2"]
}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        }
      );

      if (!res.ok) {
        console.warn(`Gemini API returned status ${res.status}, falling back to local analysis.`);
        return localResult;
      }

      const data = (await res.json()) as any;
      const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!responseText) return localResult;

      const aiData = JSON.parse(responseText);
      const combinedScore = Math.max(localResult.riskScore, aiData.riskScore || 0);

      return {
        isSafe: combinedScore < 30 && localResult.violations.length === 0,
        riskScore: combinedScore,
        violations: [
          ...localResult.violations,
          ...(aiData.warnings || []).map((w: string, idx: number) => ({
            id: `ai-flag-${idx}`,
            category: 'SPAM' as const,
            severity: 'MEDIUM' as const,
            title: 'AI Policy Flag',
            reason: w,
            recommendation: 'Review phrasing to sound natural and compliant.',
          })),
        ],
        cleanedText: aiData.safeRewrite || localResult.cleanedText,
        summary: aiData.summary || localResult.summary,
      };
    } catch (err) {
      console.error('Error during AI analysis:', err);
      return localResult;
    }
  }
}
