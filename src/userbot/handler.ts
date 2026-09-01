import { ContentAnalyzer } from '../policy/analyzer';
import { AnalysisResult } from '../policy/rules';

export interface UserbotProcessResult {
  shouldHandle: boolean;
  isSafe: boolean;
  action: 'IGNORE' | 'PASS_UNTOUCHED' | 'EDIT_TO_SAFE' | 'BLOCK_AND_WARN' | 'RELAY_SEND' | 'LIST_GROUPS';
  originalQuery: string;
  processedText: string;
  cleanedText?: string;
  target?: string;
  analysis?: AnalysisResult;
}

export const TRIGGER_PREFIXES = ['.c ', '.check ', '.safe ', '.s '];

export class UserbotHandler {
  /**
   * Evaluates outgoing messages sent by the account.
   * Inspects all outgoing messages automatically (no prefix required).
   */
  static processOutgoingMessage(rawText: string): UserbotProcessResult {
    const trimmed = rawText ? rawText.trim() : '';
    if (!trimmed) {
      return {
        shouldHandle: false,
        isSafe: true,
        action: 'IGNORE',
        originalQuery: '',
        processedText: '',
      };
    }

    // 1. Check for .groups command
    if (trimmed === '.groups' || trimmed === '.chats' || trimmed === '.list') {
      return {
        shouldHandle: true,
        isSafe: true,
        action: 'LIST_GROUPS',
        originalQuery: trimmed,
        processedText: '',
      };
    }

    // 2. Check for .send <target> <message> relay command
    if (trimmed.startsWith('.send ') || trimmed.startsWith('.s ')) {
      const rest = trimmed.startsWith('.send ') ? trimmed.slice(6).trim() : trimmed.slice(3).trim();
      let target = '';
      let messageContent = '';

      if (rest.startsWith('"')) {
        // Target is in quotes: .send "Group Name" message
        const closingQuoteIdx = rest.indexOf('"', 1);
        if (closingQuoteIdx !== -1) {
          target = rest.slice(1, closingQuoteIdx).trim();
          messageContent = rest.slice(closingQuoteIdx + 1).trim();
        }
      } else {
        // Target is a single word (e.g., @group or 1): .send @mygroup message
        const firstSpaceIdx = rest.indexOf(' ');
        if (firstSpaceIdx !== -1) {
          target = rest.slice(0, firstSpaceIdx).trim();
          messageContent = rest.slice(firstSpaceIdx + 1).trim();
        }
      }

      if (!target || !messageContent) {
        return {
          shouldHandle: true,
          isSafe: true,
          action: 'IGNORE',
          originalQuery: rawText,
          processedText: 'Usage: .send "Group Name" <message> or .send @groupname <message>',
        };
      }

      // Analyze message content before relay
      const analysis = ContentAnalyzer.analyzeLocally(messageContent);
      if (analysis.isSafe && analysis.violations.length === 0) {
        return {
          shouldHandle: true,
          isSafe: true,
          action: 'RELAY_SEND',
          target,
          originalQuery: messageContent,
          processedText: messageContent,
          cleanedText: messageContent,
          analysis,
        };
      }

      // Risky content detected in .send
      const flaggedSnippets = analysis.violations
        .map((v) => (v.matchedSnippet ? `"${v.matchedSnippet}" (${v.title})` : v.title))
        .join(', ');

      const warningMessage =
        `⚠️ [RELAY BLOCKED - Risk: ${analysis.riskScore}%]\n` +
        `Target: "${target}"\n` +
        `Your message contained high-risk patterns: ${flaggedSnippets}\n\n` +
        `💡 Suggested Safe Version:\n${analysis.cleanedText}`;

      return {
        shouldHandle: true,
        isSafe: false,
        action: 'BLOCK_AND_WARN',
        target,
        originalQuery: messageContent,
        processedText: warningMessage,
        cleanedText: analysis.cleanedText,
        analysis,
      };
    }

    // 3. Optional Prefix Support (.c <message>, .check <message>)
    const matchedPrefix = TRIGGER_PREFIXES.find((prefix) => trimmed.startsWith(prefix));
    const query = matchedPrefix ? trimmed.slice(matchedPrefix.length).trim() : trimmed;

    // Run our 27 Telegram ToS & Privacy Policy rules
    const analysis = ContentAnalyzer.analyzeLocally(query);

    // If completely safe:
    if (analysis.isSafe && analysis.violations.length === 0) {
      // If user explicitly used .c, strip the .c prefix
      if (matchedPrefix) {
        return {
          shouldHandle: true,
          isSafe: true,
          action: 'EDIT_TO_SAFE',
          originalQuery: query,
          processedText: query,
          cleanedText: query,
          analysis,
        };
      }
      // If user typed normally without prefix, leave message completely untouched (no edit needed)
      return {
        shouldHandle: true,
        isSafe: true,
        action: 'PASS_UNTOUCHED',
        originalQuery: query,
        processedText: query,
        cleanedText: query,
        analysis,
      };
    }

    // Risky content / violation detected - automatically block and warn
    const flaggedSnippets = analysis.violations
      .map((v) => (v.matchedSnippet ? `"${v.matchedSnippet}" (${v.title})` : v.title))
      .join(', ');

    const warningMessage =
      `⚠️ [SAFETY BLOCKED - Risk: ${analysis.riskScore}%]\n` +
      `Your message contained high-risk patterns: ${flaggedSnippets}\n\n` +
      `💡 Suggested Safe Version:\n${analysis.cleanedText}`;

    return {
      shouldHandle: true,
      isSafe: false,
      action: 'BLOCK_AND_WARN',
      originalQuery: query,
      processedText: warningMessage,
      cleanedText: analysis.cleanedText,
      analysis,
    };
  }
}
