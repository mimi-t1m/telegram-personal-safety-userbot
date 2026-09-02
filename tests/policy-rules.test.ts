import { describe, it, expect } from 'vitest';
import { ContentAnalyzer } from '../src/policy/analyzer';

describe('Telegram Policy Rules & Anti-Ban Heuristics (Comprehensive Official Coverage)', () => {
  // 0. Dedicated Mock Test Trigger (For safe testing of violation behavior)
  describe('Mock Test Violation Trigger', () => {
    it('flags "test lỗi từ" as simulated policy violation and cleans it', () => {
      const result = ContentAnalyzer.analyzeLocally('Đây là câu có chứa test lỗi từ cần kiểm tra');
      expect(result.isSafe).toBe(false);
      expect(result.violations.some((v) => v.id === 'mock-test-issue')).toBe(true);
      expect(result.cleanedText).toContain('[CORRECTED_WORD]');
    });

    it('flags "test incorrect word" as simulated policy violation and cleans it', () => {
      const result = ContentAnalyzer.analyzeLocally('This message has a test incorrect word for verification');
      expect(result.isSafe).toBe(false);
      expect(result.violations.some((v) => v.id === 'mock-test-issue')).toBe(true);
      expect(result.cleanedText).toContain('[CORRECTED_WORD]');
    });
  });

  // 1. Phishing & Fake Domains (ToS & Anti-Fraud)
  describe('Phishing & Fake Telegram Domains', () => {
    it('flags fake domains mimicking t.me and telegram', () => {
      const result = ContentAnalyzer.analyzeLocally('Get your gift at https://t-me.xyz/airdrop');
      expect(result.isSafe).toBe(false);
      expect(result.violations.some((v) => v.category === 'SCAM_PHISHING')).toBe(true);
    });

    it('allows legitimate t.me links', () => {
      const result = ContentAnalyzer.analyzeLocally('Join my group at https://t.me/my_official_group');
      expect(result.violations.some((v) => v.id === 'phishing-telegram-impersonation')).toBe(false);
    });

    it('flags fake contest / voting phishing traps (bình chọn giúp bé / vote for me)', () => {
      const result = ContentAnalyzer.analyzeLocally('Mọi người bình chọn giúp bé thi vẽ ở link này với https://vote-contest.top');
      expect(result.isSafe).toBe(false);
      expect(result.violations.some((v) => v.id === 'voting-contest-phishing')).toBe(true);
    });

    it('flags fake Free Telegram Premium promos', () => {
      const result = ContentAnalyzer.analyzeLocally('Nhận Telegram Premium miễn phí 3 tháng tại https://free-premium.online');
      expect(result.isSafe).toBe(false);
      expect(result.violations.some((v) => v.id === 'fake-premium-phishing')).toBe(true);
    });

    it('flags urgent account deletion scare tactics', () => {
      const result = ContentAnalyzer.analyzeLocally('Warning: Your Telegram account will be deleted in 24 hours. Verify now.');
      expect(result.isSafe).toBe(false);
      expect(result.violations.some((v) => v.id === 'urgent-account-deletion-phishing')).toBe(true);
    });
  });

  // 2. Privacy Policy & PII Leakage (Privacy Policy Sections 1.1 & 3)
  describe('Sensitive PII & Cryptographic Leakage (Privacy Policy)', () => {
    it('detects 12-word recovery mnemonic seed phrases and redacts them', () => {
      const phrase = 'apple banana cherry dog elephant fox grape horse igloo jungle kangaroo lion';
      const result = ContentAnalyzer.analyzeLocally(`My wallet phrase is: ${phrase}`);
      expect(result.riskScore).toBeGreaterThanOrEqual(60);
      expect(result.isSafe).toBe(false);
      expect(result.cleanedText).toContain('[REDACTED_SEED_PHRASE]');
    });

    it('detects Telegram login OTP codes and redacts them', () => {
      const result = ContentAnalyzer.analyzeLocally('Your login code: 92837');
      expect(result.riskScore).toBeGreaterThanOrEqual(60);
      expect(result.isSafe).toBe(false);
      expect(result.cleanedText).toContain('[REDACTED_OTP_CODE]');
    });

    it('detects credit card numbers and redacts them', () => {
      const result = ContentAnalyzer.analyzeLocally('Send payment to card 4532015012345678');
      expect(result.isSafe).toBe(false);
      expect(result.violations.some((v) => v.id === 'credit-card-leakage')).toBe(true);
      expect(result.cleanedText).toContain('[REDACTED_CREDIT_CARD]');
    });

    it('detects leaked Telegram session strings / Pyrogram / Telethon string sessions', () => {
      const sessionStr = '1BVtsOMIBy2... telethon session string: 1ApZabc1234567890abcdef1234567890abcdef1234567890abcdef';
      const result = ContentAnalyzer.analyzeLocally(sessionStr);
      expect(result.isSafe).toBe(false);
      expect(result.violations.some((v) => v.id === 'telegram-session-string-leak')).toBe(true);
    });

    it('detects and redacts Telegram Bot Tokens leaked in chats', () => {
      const tokenMsg = 'Here is my bot token: 8911096711:AAE-LfpmabIbFVJppic6J7U8PaIb8PL9OwA';
      const result = ContentAnalyzer.analyzeLocally(tokenMsg);
      expect(result.isSafe).toBe(false);
      expect(result.violations.some((v) => v.id === 'telegram-bot-token-leak')).toBe(true);
      expect(result.cleanedText).toContain('[REDACTED_BOT_TOKEN]');
    });

    it('flags Vietnamese CCCD / CMND and national ID dumps', () => {
      const idMsg = 'Thông tin CCCD số: 079198001234 địa chỉ thường trú tại TP HCM';
      const result = ContentAnalyzer.analyzeLocally(idMsg);
      expect(result.isSafe).toBe(false);
      expect(result.violations.some((v) => v.id === 'national-id-doxxing')).toBe(true);
    });

    it('flags unsolicited bank account payment drops (STK: 1903...)', () => {
      const bankMsg = 'Mọi người chuyển tiền vào STK: 19033456789012 Techcombank Nguyen Van A';
      const result = ContentAnalyzer.analyzeLocally(bankMsg);
      expect(result.isSafe).toBe(false);
      expect(result.violations.some((v) => v.id === 'bank-account-spam')).toBe(true);
    });

    it('flags stealer logs and combolist database dumps', () => {
      const logMsg = 'Download free combo list 50k email:pass and RedLine stealer logs';
      const result = ContentAnalyzer.analyzeLocally(logMsg);
      expect(result.isSafe).toBe(false);
      expect(result.violations.some((v) => v.id === 'stealer-log-dump')).toBe(true);
    });
  });

  // 3. Violence, Physical Threats & Extremism (Telegram Safety Overview / ToS 1.1)
  describe('Violence, Direct Threats & Weapons (Telegram Safety Guidelines)', () => {
    it('flags direct calls to physical violence and mob lynching (đánh chết nó / hunt them down)', () => {
      const result = ContentAnalyzer.analyzeLocally('Anh em tập trung kéo tới đánh chết nó và chém nó cho tao');
      expect(result.isSafe).toBe(false);
      expect(result.violations.some((v) => v.id === 'incitement-to-violence')).toBe(true);
    });

    it('flags targeted death threats and lethal intimidation (tao sẽ giết mày / I will kill you)', () => {
      const result = ContentAnalyzer.analyzeLocally('Tao biết nhà mày ở đâu rồi, tao sẽ giết mày');
      expect(result.isSafe).toBe(false);
      expect(result.violations.some((v) => v.id === 'death-threat-harassment')).toBe(true);
    });

    it('flags English death threats', () => {
      const result = ContentAnalyzer.analyzeLocally('I will find you and I will kill you right now');
      expect(result.isSafe).toBe(false);
      expect(result.violations.some((v) => v.id === 'death-threat-harassment')).toBe(true);
    });

    it('flags homemade bomb, explosive crafting, and arson guides (chế tạo bom xăng / pipe bomb)', () => {
      const result = ContentAnalyzer.analyzeLocally('Chia sẻ công thức chế tạo bom xăng molotov và làm súng tự chế');
      expect(result.isSafe).toBe(false);
      expect(result.violations.some((v) => v.id === 'explosives-weapons-crafting')).toBe(true);
    });

    it('flags extortion, blackmail and sextortion threats (chuyển tiền không tao phát tán video/ảnh nóng)', () => {
      const result = ContentAnalyzer.analyzeLocally('Chuyển 50 triệu ngay không tao phát tán ảnh nóng và video nhạy cảm lên mạng');
      expect(result.isSafe).toBe(false);
      expect(result.violations.some((v) => v.id === 'blackmail-extortion')).toBe(true);
    });

    it('flags suicide encouragement and self-harm incitement (go kill yourself / tự tử đi)', () => {
      const result = ContentAnalyzer.analyzeLocally('Mày không xứng đáng sống đâu, tự tử đi');
      expect(result.isSafe).toBe(false);
      expect(result.violations.some((v) => v.id === 'self-harm-suicide-incitement')).toBe(true);
    });

    it('flags terrorist propaganda and violent extremist glorification', () => {
      const result = ContentAnalyzer.analyzeLocally('Join our official ISIS brigade jihad propaganda channel');
      expect(result.isSafe).toBe(false);
      expect(result.violations.some((v) => v.id === 'terrorist-extremist-content')).toBe(true);
    });

    it('flags malicious doxxing combined with calls to attack/vandalize', () => {
      const result = ContentAnalyzer.analyzeLocally('Địa chỉ nhà nó ở số 123 đường ABC, anh em tới đập phá quán nó đi');
      expect(result.isSafe).toBe(false);
      expect(result.violations.some((v) => v.id === 'doxxing-harassment-raid')).toBe(true);
    });
  });

  // 4. Illegal Goods, Forged Documents & Weapons (ToS Section 1)
  describe('Illegal Goods, Forged Documents & Weapons (ToS Section 1)', () => {
    it('flags illegal forged documents and fake passports/IDs', () => {
      const result = ContentAnalyzer.analyzeLocally('Buy fake passport, novelty driver license, forged diploma here');
      expect(result.isSafe).toBe(false);
      expect(result.violations.some((v) => v.id === 'forged-documents-fake-ids')).toBe(true);
    });

    it('flags illicit drug / weapon marketplace offers', () => {
      const result = ContentAnalyzer.analyzeLocally('Discreet delivery of weed, cocaine, pills, firearms with tracked shipping');
      expect(result.isSafe).toBe(false);
      expect(result.violations.some((v) => v.id === 'illicit-drugs-weapons')).toBe(true);
    });
  });

  // 5. Staff Impersonation & Recovery Scams
  describe('Impersonation & Fund Recovery Scams (ToS Section 1.1)', () => {
    it('flags messages claiming to be Telegram Support or Admin', () => {
      const result = ContentAnalyzer.analyzeLocally('Hello, this is Telegram Support team. Your account requires verification.');
      expect(result.isSafe).toBe(false);
      expect(result.violations.some((v) => v.id === 'telegram-impersonation')).toBe(true);
    });

    it('flags crypto recovery / account unban scam services', () => {
      const result = ContentAnalyzer.analyzeLocally('Contact @recovery_expert to get your lost funds back, 100% unban service');
      expect(result.isSafe).toBe(false);
      expect(result.violations.some((v) => v.id === 'recovery-scam')).toBe(true);
    });
  });

  // 6. Copyright, Piracy & DMCA (ToS & FAQ)
  describe('Copyright, Pirated Software & Leaks (ToS & FAQ)', () => {
    it('flags cracked software, torrents, and leaked databases', () => {
      const result = ContentAnalyzer.analyzeLocally('Download cracked windows keygen and leaked database for free');
      expect(result.isSafe).toBe(false);
      expect(result.violations.some((v) => v.id === 'piracy-copyright')).toBe(true);
    });
  });

  // 7. Telegram Stars & Financial Fraud (ToS Stars Section)
  describe('Telegram Stars & Financial Fraud (ToS Stars Section)', () => {
    it('flags fake Telegram Stars generators and Star hacks', () => {
      const result = ContentAnalyzer.analyzeLocally('Get free telegram stars glitch 10000 stars generator no verification');
      expect(result.isSafe).toBe(false);
      expect(result.violations.some((v) => v.id === 'telegram-stars-fraud')).toBe(true);
    });

    it('flags fake airdrop and Tonkeeper wallet drainers', () => {
      const result = ContentAnalyzer.analyzeLocally('Claim 500 $USDT airdrop now, connect Tonkeeper wallet to receive reward');
      expect(result.isSafe).toBe(false);
      expect(result.violations.some((v) => v.id === 'fake-airdrop-drainer')).toBe(true);
    });

    it('flags gambling and casino pull groups (kèo tài xỉu bao thắng, nhóm kéo baccarat)', () => {
      const result = ContentAnalyzer.analyzeLocally('Tham gia nhóm kéo baccarat và kèo tài xỉu bao thắng 100% về bờ');
      expect(result.isSafe).toBe(false);
      expect(result.violations.some((v) => v.id === 'gambling-casino-scam')).toBe(true);
    });
  });

  // 8. Spam FAQ & Cold Outreach Traps (Spam FAQ & @SpamBot)
  describe('Spam FAQ & Unsolicited Outreach Traps (Spam FAQ)', () => {
    it('flags aggressive cold DM prompts that trigger "Report Spam" clicks', () => {
      const result = ContentAnalyzer.analyzeLocally('We help you earn $10,000 monthly! DM me for details right now.');
      expect(result.violations.some((v) => v.id === 'aggressive-cold-outreach')).toBe(true);
    });

    it('flags bio / profile redirection spam (check my bio for link, xem link ở bio)', () => {
      const result = ContentAnalyzer.analyzeLocally('Hướng dẫn chi tiết mọi người vào xem link ở bio của mình nhé');
      expect(result.isSafe).toBe(false);
      expect(result.violations.some((v) => v.id === 'bio-redirection-spam')).toBe(true);
    });

    it('flags Vietnamese check inbox bait (check ib nhé, đã rep inbox)', () => {
      const result = ContentAnalyzer.analyzeLocally('Bạn check ib nhé, mình đã gửi báo giá trong tin nhắn riêng');
      expect(result.violations.some((v) => v.id === 'check-inbox-bait')).toBe(true);
    });

    it('flags external platform recruiting (add WhatsApp, qua Zalo)', () => {
      const result = ContentAnalyzer.analyzeLocally('Liên hệ hợp tác qua Zalo số 0987654321 hoặc add WhatsApp nhé');
      expect(result.isSafe).toBe(false);
      expect(result.violations.some((v) => v.id === 'external-platform-harvesting')).toBe(true);
    });

    it('flags mass user mentions (> 3 @mentions in one message)', () => {
      const massMention = 'Hello @user1 @user2 @user3 @user4 please reply!';
      const result = ContentAnalyzer.analyzeLocally(massMention);
      expect(result.violations.some((v) => v.id === 'mass-mention-flooding')).toBe(true);
    });

    it('allows normal 1-2 user mentions in conversation', () => {
      const normalMention = 'Hello @alice and @bob, how are you?';
      const result = ContentAnalyzer.analyzeLocally(normalMention);
      expect(result.violations.some((v) => v.id === 'mass-mention-flooding')).toBe(false);
    });
  });

  // 9. Obfuscation & URL Shorteners
  describe('Obfuscation & Suspicious Link Shorteners', () => {
    it('flags URL shorteners like bit.ly, tinyurl.com, is.gd', () => {
      const result = ContentAnalyzer.analyzeLocally('Check this: https://bit.ly/3xY9zQ');
      expect(result.isSafe).toBe(false);
      expect(result.violations.some((v) => v.id === 'url-shortener')).toBe(true);
    });

    it('flags zero-width invisible character spammer evasion filters', () => {
      const obfuscated = 'Get 100% free sc\u200Bam giveaway';
      const result = ContentAnalyzer.analyzeLocally(obfuscated);
      expect(result.violations.some((v) => v.id === 'zero-width-obfuscation')).toBe(true);
    });

    it('flags repetitive character stretching spam (AIRDROOOOOOPPPP)', () => {
      const stretch = 'FREE AIRDROOOOOOOOOOOPPPPPP GRAB NOWWWWWW';
      const result = ContentAnalyzer.analyzeLocally(stretch);
      expect(result.isSafe).toBe(false);
      expect(result.violations.some((v) => v.id === 'character-stretching-spam')).toBe(true);
    });
  });

  // 10. Multilingual Financial Scams
  describe('Multi-Language High-Yield Scam Filters', () => {
    it('flags English get-rich-quick claims (100% guaranteed profit / pump and dump)', () => {
      const result = ContentAnalyzer.analyzeLocally('Join our VIP signals for 100% guaranteed profit and pump and dump trades!');
      expect(result.isSafe).toBe(false);
      expect(result.violations.some((v) => v.id === 'get-rich-quick-scam-en')).toBe(true);
    });

    it('flags Russian high-yield crypto scam phrases (раскрутка депозита / гарантированная прибыль)', () => {
      const result = ContentAnalyzer.analyzeLocally('Раскрутка депозита, 100% гарантированная прибыль пишите в лс');
      expect(result.isSafe).toBe(false);
      expect(result.violations.some((v) => v.id === 'get-rich-quick-scam-ru')).toBe(true);
    });

    it('flags Vietnamese scam keywords (kèo x100 / lợi nhuận cam kết)', () => {
      const result = ContentAnalyzer.analyzeLocally('Nhận kèo x100 lợi nhuận cam kết 100% inbox ngay');
      expect(result.isSafe).toBe(false);
      expect(result.violations.some((v) => v.id === 'get-rich-quick-scam-vi')).toBe(true);
    });
  });
});
