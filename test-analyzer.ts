import { ContentAnalyzer } from './src/policy/analyzer';

const testCases = [
  {
    name: 'Normal Safe Message',
    text: 'Hey Alice! Are we still meeting for coffee tomorrow at 10 AM?',
  },
  {
    name: 'URL Shortener (High Risk Spam Filter)',
    text: 'Check out this awesome tutorial: https://bit.ly/3xY9zQ!',
  },
  {
    name: 'Phishing Fake Telegram Domain',
    text: 'Claim your Telegram Premium gift at https://telegram-premium.xyz/claim',
  },
  {
    name: 'Cryptocurrency Seed Phrase Leak',
    text: 'Here is my wallet backup: apple banana cherry dog elephant fox grape horse igloo jungle kangaroo lion',
  },
  {
    name: 'Aggressive Cold Outreach / DM Trap',
    text: 'We help you scale your business 10x! DM me for details right now.',
  },
  {
    name: 'Telegram OTP / Login Code',
    text: 'Your telegram login code is 49382',
  },
  {
    name: 'Get-Rich-Quick Financial Scam',
    text: 'Join our VIP channel for 100% guaranteed profit and risk-free crypto trades!',
  },
];

console.log('====================================================');
console.log('🧪 Testing Telegram Inline Content Policy Analyzer');
console.log('====================================================\n');

for (const test of testCases) {
  console.log(`📌 Test: ${test.name}`);
  console.log(`   Input: "${test.text}"`);
  const result = ContentAnalyzer.analyzeLocally(test.text);
  console.log(`   Score: ${result.riskScore}/100 | Safe: ${result.isSafe ? 'YES' : 'NO'}`);
  console.log(`   Summary: ${result.summary}`);
  if (result.violations.length > 0) {
    console.log(`   Violations (${result.violations.length}):`);
    result.violations.forEach((v) => {
      console.log(`     - [${v.severity}] ${v.title}: ${v.reason}`);
    });
  }
  if (result.cleanedText !== test.text) {
    console.log(`   Sanitized: "${result.cleanedText}"`);
  }
  console.log('----------------------------------------------------\n');
}
