import { describe, it, expect } from 'vitest';
import { UserbotHandler } from '../src/userbot/handler';

describe('Forwarded Message Privacy & Auto-Deletion Shield', () => {
  // ==========================================
  // 1. Privacy & Sensitive Data Leak Tests
  // ==========================================
  describe('Privacy & Credential Leaks in Forwarded Messages', () => {
    it('deletes forwarded message containing a 12-word crypto seed phrase', () => {
      const forwardedText = 'My wallet backup: apple banana cherry dog elephant fox grape horse igloo jaguar kangaroo lion';
      const result = UserbotHandler.processOutgoingMessage(forwardedText, { isForward: true });

      expect(result.shouldHandle).toBe(true);
      expect(result.isSafe).toBe(false);
      expect(result.isForward).toBe(true);
      expect(result.action).toBe('DELETE_AND_NOTIFY');
      expect(result.analysis?.riskScore).toBeGreaterThanOrEqual(60);
      expect(result.processedText).toContain('🚨 [FORWARD INTERCEPTED & DELETED');
      expect(result.processedText).toContain('Seed Phrase');
      expect(result.cleanedText).toContain('[REDACTED_CONFIDENTIAL]');
    });

    it('deletes forwarded message containing a Telegram Bot Token', () => {
      const forwardedText = 'Forwarded from developer: use token 8911096711:AAE-LfpmabIbFVJppic6J7U8PaIb8PL9OwA to control bot';
      const result = UserbotHandler.processOutgoingMessage(forwardedText, { isForward: true });

      expect(result.shouldHandle).toBe(true);
      expect(result.isSafe).toBe(false);
      expect(result.isForward).toBe(true);
      expect(result.action).toBe('DELETE_AND_NOTIFY');
      expect(result.processedText).toContain('Bot Token');
      expect(result.cleanedText).toContain('[REDACTED_BOT_TOKEN]');
    });

    it('deletes forwarded message containing login OTP code', () => {
      const forwardedText = 'Your Telegram login code is 84920. Never share this code with anyone.';
      const result = UserbotHandler.processOutgoingMessage(forwardedText, { isForward: true });

      expect(result.shouldHandle).toBe(true);
      expect(result.isSafe).toBe(false);
      expect(result.action).toBe('DELETE_AND_NOTIFY');
      expect(result.processedText).toContain('🚨 [FORWARD INTERCEPTED & DELETED');
      expect(result.cleanedText).toContain('[REDACTED_CONFIDENTIAL]');
    });

    it('deletes forwarded message containing National ID / CCCD leak', () => {
      const forwardedText = 'Thong tin ca nhan: So CCCD 001201012345 Nguyen Van A';
      const result = UserbotHandler.processOutgoingMessage(forwardedText, { isForward: true });

      expect(result.shouldHandle).toBe(true);
      expect(result.isSafe).toBe(false);
      expect(result.action).toBe('DELETE_AND_NOTIFY');
      expect(result.cleanedText).toContain('[REDACTED_ID_NUMBER]');
    });

    it('deletes forwarded message containing credit card numbers', () => {
      const forwardedText = 'Forwarded billing card details: 4532015012345678 exp 12/28';
      const result = UserbotHandler.processOutgoingMessage(forwardedText, { isForward: true });

      expect(result.shouldHandle).toBe(true);
      expect(result.isSafe).toBe(false);
      expect(result.action).toBe('DELETE_AND_NOTIFY');
      expect(result.cleanedText).toContain('[REDACTED_CONFIDENTIAL]');
    });

    it('deletes forwarded message containing stolen account combo dump', () => {
      const forwardedText = 'Check out this fresh combo list 50k email:pass leaked passwords from stealer logs';
      const result = UserbotHandler.processOutgoingMessage(forwardedText, { isForward: true });

      expect(result.shouldHandle).toBe(true);
      expect(result.isSafe).toBe(false);
      expect(result.action).toBe('DELETE_AND_NOTIFY');
    });
  });

  // ==========================================
  // 2. Phishing, Scams & Malicious Traps Tests
  // ==========================================
  describe('Phishing & Malicious Content in Forwarded Messages', () => {
    it('deletes forwarded phishing link with URL shorteners (bit.ly, tinyurl)', () => {
      const forwardedText = 'Claim free Telegram Stars and Premium here: https://bit.ly/free-stars-2025';
      const result = UserbotHandler.processOutgoingMessage(forwardedText, { isForward: true });

      expect(result.shouldHandle).toBe(true);
      expect(result.isSafe).toBe(false);
      expect(result.action).toBe('DELETE_AND_NOTIFY');
      expect(result.processedText).toContain('bit.ly');
    });

    it('deletes forwarded fake contest / voting trap scam', () => {
      const forwardedText = 'Nhờ mọi người vào bình chọn giúp bé nhà em với ạ, em cảm ơn nhiều';
      const result = UserbotHandler.processOutgoingMessage(forwardedText, { isForward: true });

      expect(result.shouldHandle).toBe(true);
      expect(result.isSafe).toBe(false);
      expect(result.action).toBe('DELETE_AND_NOTIFY');
    });

    it('deletes forwarded illegal gambling / casino pull scam', () => {
      const forwardedText = 'Kèo tài xỉu bao thắng 100% hoàn vốn liên hệ nhóm kín';
      const result = UserbotHandler.processOutgoingMessage(forwardedText, { isForward: true });

      expect(result.shouldHandle).toBe(true);
      expect(result.isSafe).toBe(false);
      expect(result.action).toBe('DELETE_AND_NOTIFY');
    });
  });

  // ==========================================
  // 3. Safety, Threats & Violence Tests
  // ==========================================
  describe('Violence & Harassment in Forwarded Messages', () => {
    it('deletes forwarded death threats and incitement to physical violence', () => {
      const forwardedText = 'Tao sẽ giết mày nếu mày dám quay lại đây';
      const result = UserbotHandler.processOutgoingMessage(forwardedText, { isForward: true });

      expect(result.shouldHandle).toBe(true);
      expect(result.isSafe).toBe(false);
      expect(result.action).toBe('DELETE_AND_NOTIFY');
    });

    it('deletes forwarded extortion / sextortion threats', () => {
      const forwardedText = 'Chuyển tiền không tao phát tán ảnh nóng lên mạng';
      const result = UserbotHandler.processOutgoingMessage(forwardedText, { isForward: true });

      expect(result.shouldHandle).toBe(true);
      expect(result.isSafe).toBe(false);
      expect(result.action).toBe('DELETE_AND_NOTIFY');
    });

    it('deletes forwarded weapons / bomb crafting instructions', () => {
      const forwardedText = 'Hướng dẫn chế tạo bom xăng molotov cocktail tại nhà';
      const result = UserbotHandler.processOutgoingMessage(forwardedText, { isForward: true });

      expect(result.shouldHandle).toBe(true);
      expect(result.isSafe).toBe(false);
      expect(result.action).toBe('DELETE_AND_NOTIFY');
    });
  });

  // ==========================================
  // 4. Safe Forwarded Messages (Allowed untouched)
  // ==========================================
  describe('Safe Forwarded Messages', () => {
    it('passes safe forwarded conversation messages completely untouched', () => {
      const forwardedText = 'Project meeting is rescheduled to Thursday 2 PM. Please prepare slides.';
      const result = UserbotHandler.processOutgoingMessage(forwardedText, { isForward: true });

      expect(result.shouldHandle).toBe(true);
      expect(result.isSafe).toBe(true);
      expect(result.action).toBe('PASS_UNTOUCHED');
      expect(result.processedText).toBe(forwardedText);
    });

    it('passes safe technical code snippets and documentation', () => {
      const forwardedText = 'To start the app: npm install && npm run build';
      const result = UserbotHandler.processOutgoingMessage(forwardedText, { isForward: true });

      expect(result.shouldHandle).toBe(true);
      expect(result.isSafe).toBe(true);
      expect(result.action).toBe('PASS_UNTOUCHED');
    });

    it('passes safe greeting and group announcements', () => {
      const forwardedText = 'Welcome to the team! Looking forward to working together.';
      const result = UserbotHandler.processOutgoingMessage(forwardedText, { isForward: true });

      expect(result.shouldHandle).toBe(true);
      expect(result.isSafe).toBe(true);
      expect(result.action).toBe('PASS_UNTOUCHED');
    });
  });

  // ==========================================
  // 5. Edge Cases & Behavioral Contract
  // ==========================================
  describe('Forward Handler Edge Cases', () => {
    it('ignores empty or whitespace-only forwarded messages', () => {
      const result = UserbotHandler.processOutgoingMessage('   ', { isForward: true });
      expect(result.shouldHandle).toBe(false);
      expect(result.isSafe).toBe(true);
      expect(result.action).toBe('IGNORE');
    });

    it('guarantees action is strictly DELETE_AND_NOTIFY for violating forwards, not BLOCK_AND_WARN', () => {
      const violatingText = 'test lỗi từ trong forward message';
      
      // When isForward: true -> MUST be DELETE_AND_NOTIFY
      const forwardResult = UserbotHandler.processOutgoingMessage(violatingText, { isForward: true });
      expect(forwardResult.action).toBe('DELETE_AND_NOTIFY');

      // When isForward: false (direct chat) -> MUST be BLOCK_AND_WARN
      const directResult = UserbotHandler.processOutgoingMessage(violatingText, { isForward: false });
      expect(directResult.action).toBe('BLOCK_AND_WARN');
    });
  });
});
