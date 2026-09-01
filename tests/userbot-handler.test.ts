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

  it('automatically detects simulated error "test lỗi từ" without any prefix and blocks it', () => {
    const text = 'Đây là tin nhắn bình thường nhưng có test lỗi từ';
    const result = UserbotHandler.processOutgoingMessage(text);
    expect(result.shouldHandle).toBe(true);
    expect(result.isSafe).toBe(false);
    expect(result.action).toBe('BLOCK_AND_WARN');
    expect(result.processedText).toContain('⚠️');
    expect(result.processedText).toContain('test lỗi từ');
    expect(result.cleanedText).toContain('[TỪ ĐÃ ĐƯỢC SỬA]');
  });

  it('automatically detects URL shorteners without any prefix and blocks it', () => {
    const text = 'Check out this cool link: https://bit.ly/secret123';
    const result = UserbotHandler.processOutgoingMessage(text);
    expect(result.shouldHandle).toBe(true);
    expect(result.isSafe).toBe(false);
    expect(result.action).toBe('BLOCK_AND_WARN');
    expect(result.processedText).toContain('⚠️');
    expect(result.processedText).toContain('bit.ly');
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
});
