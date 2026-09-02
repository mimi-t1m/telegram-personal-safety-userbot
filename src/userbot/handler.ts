import { ContentAnalyzer } from '../policy/analyzer';
import { AnalysisResult } from '../policy/rules';

export interface UserbotProcessOptions {
  isForward?: boolean;
  isEdit?: boolean;
}

export interface UserbotProcessResult {
  shouldHandle: boolean;
  isSafe: boolean;
  action: 'IGNORE' | 'PASS_UNTOUCHED' | 'EDIT_TO_SAFE' | 'BLOCK_AND_WARN' | 'DELETE_AND_NOTIFY' | 'RELAY_SEND' | 'LIST_GROUPS';
  originalQuery: string;
  processedText: string;
  cleanedText?: string;
  target?: string;
  isForward?: boolean;
  isEdit?: boolean;
  analysis?: AnalysisResult;
}

export const TRIGGER_PREFIXES = ['.c ', '.check ', '.safe ', '.s '];

export class UserbotHandler {
  /**
   * Evaluates outgoing messages sent by the account.
   * Inspects all outgoing messages automatically (no prefix required).
   * Supports forwarded messages by issuing DELETE_AND_NOTIFY when violations are found.
   * Supports edited messages by re-intercepting if a safe message is edited into a risky one.
   */
  static processOutgoingMessage(rawText: string, options?: UserbotProcessOptions): UserbotProcessResult {
    const isForward = options?.isForward ?? false;
    const isEdit = options?.isEdit ?? false;
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
      const violationTitles = analysis.violations.map((v) => v.title).join(', ');

      const warningMessage =
        `⚠️ [RELAY BLOCKED - Risk: ${analysis.riskScore}%]\n` +
        `Target: "${target}"\n` +
        `Violations: ${violationTitles}\n\n` +
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

    // If the message is a Forward, Telegram MTProto does not allow edits -> must DELETE & NOTIFY
    if (isForward) {
      const violationTitles = analysis.violations.map((v) => v.title).join(', ');

      const forwardAlertMessage =
        `🚨 [FORWARD INTERCEPTED & DELETED - Risk: ${analysis.riskScore}%]\n` +
        `Violations: ${violationTitles}\n\n` +
        `💡 Safe Version Available:\n${analysis.cleanedText}`;

      return {
        shouldHandle: true,
        isSafe: false,
        isForward: true,
        action: 'DELETE_AND_NOTIFY',
        originalQuery: query,
        processedText: forwardAlertMessage,
        cleanedText: analysis.cleanedText,
        analysis,
      };
    }

    // Direct message violation detected -> replace in chat with clean safe placeholder
    const safeRedactedPlaceholder = '🛡️ [Message redacted by Safety Shield]';

    return {
      shouldHandle: true,
      isSafe: false,
      isForward: false,
      isEdit,
      action: 'BLOCK_AND_WARN',
      originalQuery: query,
      processedText: safeRedactedPlaceholder,
      cleanedText: analysis.cleanedText,
      analysis,
    };
  }

  /**
   * Resolves custom replacement text provided during /approve command (e.g. /approve_1 newtest here).
   * Supports multiple placeholders:
   * - If separated by comma or pipe (e.g. /approve_1 word1, word2), replaces placeholders sequentially.
   * - If single word provided, replaces all placeholders.
   * Runs a safety policy scan to ensure the custom replacement is safe.
   */
  static resolveCustomReplacement(
    suggestedText: string,
    customWords?: string
  ): { text: string; isSafe: boolean; violations: string[] } {
    let targetText = suggestedText;
    if (customWords && customWords.trim()) {
      const trimmedCustom = customWords.trim();
      const placeholderRegex = /\[[A-Z0-9_]+\]/g;

      if (placeholderRegex.test(suggestedText)) {
        // Check for double pipe (||), single pipe (|), or comma (,) separators for multiple placeholders
        const delimiter = trimmedCustom.includes('||')
          ? '||'
          : trimmedCustom.includes('|')
          ? '|'
          : trimmedCustom.includes(',')
          ? ','
          : null;
        if (delimiter) {
          const parts = trimmedCustom.split(delimiter).map((p) => p.trim()).filter((p) => p.length > 0);
          if (parts.length > 1) {
            let index = 0;
            targetText = suggestedText.replace(placeholderRegex, (match) => {
              if (index < parts.length) {
                const replacement = parts[index];
                index++;
                return replacement;
              }
              return match;
            });
          } else {
            targetText = suggestedText.replace(placeholderRegex, trimmedCustom);
          }
        } else {
          targetText = suggestedText.replace(placeholderRegex, trimmedCustom);
        }
      } else {
        targetText = trimmedCustom;
      }
    }

    const check = ContentAnalyzer.analyzeLocally(targetText);
    return {
      text: targetText,
      isSafe: check.isSafe && check.violations.length === 0,
      violations: check.violations.map((v) => v.title),
    };
  }
}
