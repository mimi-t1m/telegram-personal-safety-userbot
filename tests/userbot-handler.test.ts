import { describe, it, expect } from 'vitest';
import { UserbotHandler } from '../src/userbot/handler';

describe('Telegram MTProto Userbot - Zero-Prefix Automatic Detection', () => {
  it('automatically passes normal safe messages untouched without needing any prefix', () => {
    const text = 'Hey team, let us meet tomorrow at 10 AM';
    const result = UserbotHandler.processOutgoingMessage(text);
    expect(result.shouldHandle).toBe(true);
    expect(result.isSafe).toBe(true);
    expect(result.action).toBe('PASS_UNTOUCHED');
    expect(result.processedText).toBe(text);
  });

  it('automatically detects simulated error "test lỗi từ" without any prefix and redacts it with safe placeholder', () => {
    const text = 'Đây là tin nhắn bình thường nhưng có test lỗi từ';
    const result = UserbotHandler.processOutgoingMessage(text);
    expect(result.shouldHandle).toBe(true);
    expect(result.isSafe).toBe(false);
    expect(result.action).toBe('BLOCK_AND_WARN');
    expect(result.processedText).toBe('🛡️ [Message redacted by Safety Shield]');
    expect(result.cleanedText).toContain('[CORRECTED_WORD]');
  });

  it('automatically detects URL shorteners without any prefix and redacts it safely without leaking url in chat', () => {
    const text = 'Check out this cool link: https://bit.ly/secret123';
    const result = UserbotHandler.processOutgoingMessage(text);
    expect(result.shouldHandle).toBe(true);
    expect(result.isSafe).toBe(false);
    expect(result.action).toBe('BLOCK_AND_WARN');
    expect(result.processedText).toBe('🛡️ [Message redacted by Safety Shield]');
    expect(result.cleanedText).toContain('[DIRECT_LINK_HERE]');
  });

  it('does not falsely trigger seed phrase detection on normal 12-word business/design sentences', () => {
    const text = 'I think we have 3 solution now:\n' +
      '1. Change layout matchd with image size\n' +
      '2. Design team will rework all images all game follow our new size\n' +
      '3. Let AI generate change ratio test, if ok then can process all other images With 1 is quite fast but layout will difference with UFA Thai side want.\n' +
      'With 2, 3 depended on design team and AI generate. It can be slow because we have many game icons.';
    const result = UserbotHandler.processOutgoingMessage(text);
    expect(result.shouldHandle).toBe(true);
    expect(result.isSafe).toBe(true);
    expect(result.action).toBe('PASS_UNTOUCHED');
  });

  it('still supports .send "Group Name" <message> in relay mode', () => {
    const text = '.send "New MMP Internal" xong chưa Wood?';
    const result = UserbotHandler.processOutgoingMessage(text);
    expect(result.shouldHandle).toBe(true);
    expect(result.action).toBe('RELAY_SEND');
    expect(result.target).toBe('New MMP Internal');
    expect(result.processedText).toBe('xong chưa Wood?');
    expect(result.isSafe).toBe(true);
  });

  it('still supports .groups command', () => {
    const text = '.groups';
    const result = UserbotHandler.processOutgoingMessage(text);
    expect(result.shouldHandle).toBe(true);
    expect(result.action).toBe('LIST_GROUPS');
  });

  it('passes safe forwarded messages untouched', () => {
    const forwardText = 'Forwarded announcement: Happy New Year everyone!';
    const result = UserbotHandler.processOutgoingMessage(forwardText, { isForward: true });
    expect(result.shouldHandle).toBe(true);
    expect(result.isSafe).toBe(true);
    expect(result.action).toBe('PASS_UNTOUCHED');
  });

  it('triggers DELETE_AND_NOTIFY when a forwarded message contains privacy violations (e.g. seed phrase / credentials)', () => {
    const violatingForward = 'Here is my seed phrase: apple banana cherry dog elephant fox grape horse igloo jaguar kangaroo lion';
    const result = UserbotHandler.processOutgoingMessage(violatingForward, { isForward: true });
    expect(result.shouldHandle).toBe(true);
    expect(result.isSafe).toBe(false);
    expect(result.isForward).toBe(true);
    expect(result.action).toBe('DELETE_AND_NOTIFY');
    expect(result.processedText).toContain('🚨 [FORWARD INTERCEPTED & DELETED');
  });

  it('triggers DELETE_AND_NOTIFY when a forwarded message contains bot token or dangerous link', () => {
    const violatingForward = 'Check this bot token: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz and link https://bit.ly/claim';
    const result = UserbotHandler.processOutgoingMessage(violatingForward, { isForward: true });
    expect(result.shouldHandle).toBe(true);
    expect(result.isSafe).toBe(false);
    expect(result.action).toBe('DELETE_AND_NOTIFY');
  });

  // ==========================================
  // Edited Message Interception Tests
  // ==========================================
  it('intercepts edited messages that are modified into sensitive/violating content', () => {
    const editedText = 'Originally safe message now edited: here is bot token 8911096711:AAE-LfpmabIbFVJppic6J7U8PaIb8PL9OwA';
    const result = UserbotHandler.processOutgoingMessage(editedText, { isEdit: true });
    expect(result.shouldHandle).toBe(true);
    expect(result.isSafe).toBe(false);
    expect(result.isEdit).toBe(true);
    expect(result.action).toBe('BLOCK_AND_WARN');
    expect(result.processedText).toBe('🛡️ [Message redacted by Safety Shield]');
    expect(result.cleanedText).toContain('[REDACTED_BOT_TOKEN]');
  });

  it('passes edited messages untouched if edited version remains safe', () => {
    const editedText = 'Fixed a typo in my earlier message, see you tomorrow!';
    const result = UserbotHandler.processOutgoingMessage(editedText, { isEdit: true });
    expect(result.shouldHandle).toBe(true);
    expect(result.isSafe).toBe(true);
    expect(result.action).toBe('PASS_UNTOUCHED');
  });

  // ==========================================
  // Custom Word Replacement & Re-Scan Tests (/approve_1 <custom text>)
  // ==========================================
  it('replaces placeholder tags with user custom words and passes if safe', () => {
    const suggestedText = 'Here is the safe version [CORRECTED_WORD]';
    const resolution = UserbotHandler.resolveCustomReplacement(suggestedText, 'newtest here');
    expect(resolution.isSafe).toBe(true);
    expect(resolution.text).toBe('Here is the safe version newtest here');
    expect(resolution.violations.length).toBe(0);
  });

  it('scans and blocks unsafe custom replacement words (e.g. containing shorteners or bot tokens)', () => {
    const suggestedText = 'Here is the safe version [CORRECTED_WORD]';
    const resolution = UserbotHandler.resolveCustomReplacement(suggestedText, 'visit https://bit.ly/phishing');
    expect(resolution.isSafe).toBe(false);
    expect(resolution.violations.length).toBeGreaterThan(0);
    expect(resolution.violations).toContain('Obfuscated / Shortened URL');
  });

  it('keeps suggested text when no custom word is provided', () => {
    const suggestedText = 'Here is the safe version [CORRECTED_WORD]';
    const resolution = UserbotHandler.resolveCustomReplacement(suggestedText);
    expect(resolution.isSafe).toBe(true);
    expect(resolution.text).toBe(suggestedText);
  });

  it('replaces multiple placeholders sequentially when separated by comma', () => {
    const suggestedText = 'test text 1 [CORRECTED_WORD], test text 2 [CORRECTED_WORD]';
    const resolution = UserbotHandler.resolveCustomReplacement(suggestedText, 'apple, banana');
    expect(resolution.isSafe).toBe(true);
    expect(resolution.text).toBe('test text 1 apple, test text 2 banana');
  });

  it('replaces multiple placeholders sequentially when separated by pipe |', () => {
    const suggestedText = 'test text 1 [CORRECTED_WORD], test text 2 [CORRECTED_WORD]';
    const resolution = UserbotHandler.resolveCustomReplacement(suggestedText, 'first test | second test');
    expect(resolution.isSafe).toBe(true);
    expect(resolution.text).toBe('test text 1 first test, test text 2 second test');
  });

  it('replaces multiple placeholders sequentially when separated by double pipe ||', () => {
    const suggestedText = 'test text 1 [CORRECTED_WORD], test text 2 [CORRECTED_WORD]';
    const resolution = UserbotHandler.resolveCustomReplacement(suggestedText, 'first text || second text');
    expect(resolution.isSafe).toBe(true);
    expect(resolution.text).toBe('test text 1 first text, test text 2 second text');
  });

  it('replaces all placeholders with single custom word if no separator is used', () => {
    const suggestedText = 'test text 1 [CORRECTED_WORD], test text 2 [CORRECTED_WORD]';
    const resolution = UserbotHandler.resolveCustomReplacement(suggestedText, 'sample');
    expect(resolution.isSafe).toBe(true);
    expect(resolution.text).toBe('test text 1 sample, test text 2 sample');
  });
});
