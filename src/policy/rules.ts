export interface PolicyViolation {
  id: string;
  category: 'SPAM' | 'SECURITY_PII' | 'SCAM_PHISHING' | 'IMPERSONATION' | 'ILLEGAL_TOS' | 'AGGRESSIVE_OUTREACH' | 'VIOLENCE_THREATS';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  matchedSnippet?: string;
  reason: string;
  recommendation: string;
}

export interface AnalysisResult {
  isSafe: boolean;
  riskScore: number; // 0 (completely safe) to 100 (critical ban risk)
  violations: PolicyViolation[];
  cleanedText: string;
  summary: string;
}

export interface RuleDefinition {
  id: string;
  category: PolicyViolation['category'];
  severity: PolicyViolation['severity'];
  title: string;
  regex: RegExp;
  reason: string;
  recommendation: string;
}

export const TELEGRAM_RULES: RuleDefinition[] = [
  // 0. Mock Test Rule (For easy user testing of violation & auto-fix flows)
  {
    id: 'mock-test-issue',
    category: 'SPAM',
    severity: 'HIGH',
    title: 'Simulated Test Issue',
    regex: /(test\s+lỗi\s+từ|test\s+incorrect\s+word)/i,
    reason: 'Simulated test keyword to verify violation detection and auto-sanitization workflows.',
    recommendation: 'Remove or replace this test keyword to pass the safety check.',
  },

  // 1. Critical: Phishing & Credential Theft (ToS & Privacy Policy)
  {
    id: 'phishing-telegram-impersonation',
    category: 'SCAM_PHISHING',
    severity: 'CRITICAL',
    title: 'Phishing / Fake Telegram Link',
    regex: /(https?:\/\/)?(www\.)?(t[-_.]?me[a-z0-9_-]*|telegr[a-z0-9_-]+|telegram-[a-z0-9_-]+)\.(xyz|top|site|club|vip|online|live|ru|cn|click|tk|ml|ga|cf|gq|cc)\b/i,
    reason: 'Matches fake domain patterns mimicking official Telegram domains (t.me). Telegram automatically detects and permanently bans accounts distributing these.',
    recommendation: 'Use only official https://t.me/ or official domain links.',
  },
  {
    id: 'voting-contest-phishing',
    category: 'SCAM_PHISHING',
    severity: 'CRITICAL',
    title: 'Fake Contest / Voting Phishing Trap',
    regex: /(bình\s+chọn\s+giúp|vote\s+for\s+(my\s+drawing|my\s+daughter|me|our\s+team)|thi\s+vẽ\s+ở\s+link|click\s+link\s+to\s+vote)/i,
    reason: 'Matches classic viral Telegram account-hijacking schemes ("bình chọn giúp bé / vote for me") that steal login session tokens.',
    recommendation: 'Do not distribute external contest voting links in public groups.',
  },
  {
    id: 'fake-premium-phishing',
    category: 'SCAM_PHISHING',
    severity: 'HIGH',
    title: 'Fake Telegram Premium Scam',
    regex: /(nhận|free|claim)\s+(telegram\s+premium|free\s+premium)\s*(miễn\s+phí|\d+\s+months?|\d+\s+tháng)/i,
    reason: 'Promoting unauthorized "Free Telegram Premium" campaigns is heavily flagged by Telegram anti-fraud filters.',
    recommendation: 'Purchase Telegram Premium only through official Telegram app settings.',
  },
  {
    id: 'urgent-account-deletion-phishing',
    category: 'SCAM_PHISHING',
    severity: 'CRITICAL',
    title: 'Account Deletion Scare Tactic',
    regex: /(account\s+will\s+be\s+deleted\s+in\s+\d+\s+hours|tài\s+khoản\s+sẽ\s+bị\s+xoá\s+trong\s+\d+\s+giờ|telegram\s+security\s+notice.*verify)/i,
    reason: 'Deceptive scare tactic impersonating Telegram security to steal credentials.',
    recommendation: 'Telegram never warns about account deletion via chat links.',
  },

  // 2. Sensitive PII & Cryptographic Leakage
  {
    id: 'crypto-seed-phrase',
    category: 'SECURITY_PII',
    severity: 'CRITICAL',
    title: 'Seed Phrase / Private Key Leakage',
    regex: /(?:(?:seed\s+phrase|recovery\s+phrase|mnemonic|wallet\s+(?:phrase|backup|seed)|secret\s+(?:phrase|recovery)|passphrase|bip39)[\s\w:]*?([a-z]{3,8}\s+){11,23}[a-z]{3,8})|(0x[a-fA-F0-9]{64})|\b5[HJK][1-9A-HJ-NP-Za-km-z]{49}\b|\b[KL][1-9A-HJ-NP-Za-km-z]{51}\b/i,
    reason: 'Appears to contain a 12/24-word cryptocurrency mnemonic seed phrase or private key. Sharing this publicly can lead to complete loss of funds or flagged security abuse.',
    recommendation: 'Never share private keys or mnemonic recovery phrases over Telegram.',
  },
  {
    id: 'telegram-session-string-leak',
    category: 'SECURITY_PII',
    severity: 'CRITICAL',
    title: 'Telegram Session String Leakage',
    regex: /(telethon|pyrogram)\s+session\s+string|1[0-9a-zA-Z]{50,}/i,
    reason: 'Telegram string sessions grant full API control of your account. Leaking this compromises your entire account security.',
    recommendation: 'Keep Pyrogram/Telethon string sessions private and never send in chats.',
  },
  {
    id: 'telegram-bot-token-leak',
    category: 'SECURITY_PII',
    severity: 'CRITICAL',
    title: 'Telegram Bot Token Leakage',
    regex: /\b\d{9,11}:[a-zA-Z0-9_-]{35}\b/,
    reason: 'Telegram Bot tokens grant full remote control over the bot. Telegram automated scanners immediately revoke public tokens.',
    recommendation: 'Keep bot tokens in .env and never post in chats.',
  },
  {
    id: 'otp-telegram-code',
    category: 'SECURITY_PII',
    severity: 'CRITICAL',
    title: 'Telegram Login Code / OTP Sharing',
    regex: /(login\s+code|telegram\s+code|verification\s+code|otp)\s*(is|:)?\s*\d{5,6}/i,
    reason: 'Sharing Telegram login codes is heavily monitored by Telegram security and is a primary sign of account takeover / social engineering.',
    recommendation: 'Telegram will NEVER ask for your login code. Do not share login codes.',
  },
  {
    id: 'credit-card-leakage',
    category: 'SECURITY_PII',
    severity: 'HIGH',
    title: 'Payment / Credit Card Data',
    regex: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11})\b/,
    reason: 'Detected credit card number pattern. Telegram privacy and anti-fraud filters flag sharing financial card details.',
    recommendation: 'Remove credit card numbers from public and group messages.',
  },
  {
    id: 'national-id-doxxing',
    category: 'SECURITY_PII',
    severity: 'HIGH',
    title: 'National ID / Doxxing Information',
    regex: /(cccd|cmnd|số\s+định\s+danh|căn\s+cước\s+công\s+dân|ssn|social\s+security\s+number)[\s:]*(số)?[\s:]*\d{9,12}/i,
    reason: 'Sharing citizen identity numbers / national IDs in public chats violates Telegram Privacy Policy on doxxing.',
    recommendation: 'Do not publish personal identification numbers in public channels.',
  },
  {
    id: 'bank-account-spam',
    category: 'SPAM',
    severity: 'HIGH',
    title: 'Unsolicited Bank Account / Payment Drop',
    regex: /(stk|số\s+tài\s+khoản|so\s+tai\s+khoan)\s*:\s*\d{8,16}\s*(techcombank|vietcombank|mbbank|acb|bidv|vietinbank|tpbank|vpbank|sacombank|agribank|vcb|tcb|mb)/i,
    reason: 'Dropping personal bank account numbers in public chats triggers anti-spam financial solicitation filters.',
    recommendation: 'Share banking details privately with confirmed counterparties.',
  },
  {
    id: 'stealer-log-dump',
    category: 'ILLEGAL_TOS',
    severity: 'CRITICAL',
    title: 'Stealer Logs / Stolen Database Dumps',
    regex: /(combo\s*list\s*\d+k|email:pass|stealer\s*logs|redline\s*logs|leaked\s*passwords)/i,
    reason: 'Distributing stolen account credentials or malware stealer logs violates Telegram ToS.',
    recommendation: 'Do not share or promote stolen account dumps.',
  },

  // 3. Violence, Physical Threats & Extremism (Telegram Safety Overview / Europol / ETIDAL)
  {
    id: 'incitement-to-violence',
    category: 'VIOLENCE_THREATS',
    severity: 'CRITICAL',
    title: 'Incitement to Physical Violence / Mob Lynching',
    regex: /(đánh\s+chết\s+nó|chém\s+nó|đốt\s+nhà\s+nó|hunt\s+(them|him|her)\s+down|kill\s+(him|them|her)|lynch\s+(him|them)|beat\s+(him|them)\s+up)/i,
    reason: 'Direct incitement to physical violence or mob attacks violates Telegram Terms of Service and Telegram Safety policies, triggering instant account bans and Europol reporting.',
    recommendation: 'Never incite violence or physical harm against any person or group.',
  },
  {
    id: 'death-threat-harassment',
    category: 'VIOLENCE_THREATS',
    severity: 'CRITICAL',
    title: 'Targeted Death Threat / Lethal Intimidation',
    regex: /(tao\s+sẽ\s+giết\s+mày|tao\s+bắn\s+chết\s+mày|tao\s+chém\s+chết\s+mày|i\s+will\s+kill\s+you|you\s+will\s+die|i\s+will\s+murder\s+you|tao\s+biết\s+nhà\s+mày.*giết)/i,
    reason: 'Direct death threats and lethal intimidation result in permanent account termination under Telegram Safety enforcement.',
    recommendation: 'Refrain from violent threats or intimidation.',
  },
  {
    id: 'explosives-weapons-crafting',
    category: 'VIOLENCE_THREATS',
    severity: 'CRITICAL',
    title: 'Explosives, Bomb Crafting & Homemade Weapons',
    regex: /(chế\s+tạo\s+bom|bom\s+xăng|làm\s+súng\s+tự\s+chế|pipe\s+bomb|molotov\s+cocktail|how\s+to\s+make\s+(a\s+)?bomb|3d\s+printed\s+gun\s+(cad|file)|ghost\s+gun\s+receiver)/i,
    reason: 'Sharing recipes or instructions for manufacturing bombs, explosives, molotov cocktails, or untraceable firearms violates Telegram Zero-Tolerance violent content policies.',
    recommendation: 'Do not share instructions or blueprints for lethal weapons or explosives.',
  },
  {
    id: 'blackmail-extortion',
    category: 'VIOLENCE_THREATS',
    severity: 'CRITICAL',
    title: 'Blackmail, Extortion & Sextortion',
    regex: /(phát\s+tán\s+(ảnh\s+nóng|video\s+nhạy\s+cảm|ảnh\s+kín)|chuyển\s+tiền\s+không\s+tao\s+phát\s+tán|leak\s+your\s+(private|nude|naked)\s+photos|pay\s+(me|ransom)\s+or\s+i\s+leak)/i,
    reason: 'Extortion, blackmail, and threatening non-consensual media distribution violates international criminal law and Telegram safety mandates.',
    recommendation: 'Never engage in extortion or blackmail.',
  },
  {
    id: 'self-harm-suicide-incitement',
    category: 'VIOLENCE_THREATS',
    severity: 'CRITICAL',
    title: 'Self-Harm & Suicide Encouragement',
    regex: /(tự\s+tử\s+đi|hướng\s+dẫn\s+tự\s+sát|cắt\s+cổ\s+tay|go\s+kill\s+yourself|commit\s+suicide|kill\s+urself|kys\b)/i,
    reason: 'Encouraging self-harm or suicide is strictly barred across all global communication networks and Telegram safety filters.',
    recommendation: 'Never encourage self-harm or suicide.',
  },
  {
    id: 'terrorist-extremist-content',
    category: 'VIOLENCE_THREATS',
    severity: 'CRITICAL',
    title: 'Terrorist Propaganda & Violent Extremism',
    regex: /(isis\s+(brigade|jihad|propaganda)|al-qaeda\s+manifesto|al-qaida|hamas\s+propaganda|boko\s+haram|mass\s+shooter\s+manifesto)/i,
    reason: 'Telegram proactively scans and removes terrorist propaganda in partnership with Europol and ETIDAL.',
    recommendation: 'Do not share terrorist or violent extremist propaganda.',
  },
  {
    id: 'doxxing-harassment-raid',
    category: 'VIOLENCE_THREATS',
    severity: 'CRITICAL',
    title: 'Malicious Doxxing / Raid Incitement',
    regex: /(địa\s+chỉ\s+nhà\s+nó.*(đập\s+phá|xử\s+nó|phá\s+quán)|home\s+address.*(raid|attack|beat|hunt))/i,
    reason: 'Publishing home addresses coupled with calls to attack or vandalize property violates Telegram anti-harassment policies.',
    recommendation: 'Do not publish personal addresses to incite raids or harassment.',
  },

  // 4. Illegal Goods, Forged Documents & Weapons
  {
    id: 'forged-documents-fake-ids',
    category: 'ILLEGAL_TOS',
    severity: 'CRITICAL',
    title: 'Forged Documents / Fake IDs',
    regex: /\b(fake\s+(passport|driver\s*license|id\s*card|ssn|visa)|forged\s+(document|diploma|certificate)|novelty\s+(passport|id)|buy\s+fake\s+id)\b/i,
    reason: 'Telegram ToS strictly forbids offering forged documents or fake government identity items. Triggers immediate permanent ban.',
    recommendation: 'Never offer or request forged identification documents on Telegram.',
  },
  {
    id: 'illicit-drugs-weapons',
    category: 'ILLEGAL_TOS',
    severity: 'CRITICAL',
    title: 'Illicit Goods (Drugs & Weapons)',
    regex: /\b(buy\s+(cocaine|weed|cannabis|mdma|meth|heroin|lsd|fentanyl)|discreet\s+(delivery|shipping)\s+of\s+(weed|cocaine|pills|firearms)|buy\s+(firearms?|ammo|glock|ghost\s+gun))\b/i,
    reason: 'Telegram ToS Section 1 prohibits selling or offering illegal goods and services (drugs, firearms, weapons).',
    recommendation: 'Do not discuss or offer prohibited substances or firearms.',
  },

  // 5. Staff Impersonation & Recovery Scams
  {
    id: 'telegram-impersonation',
    category: 'IMPERSONATION',
    severity: 'HIGH',
    title: 'Telegram Staff / Admin Impersonation',
    regex: /\b(telegram\s+(admin|moderator|support|team|security)|official\s+spambot|telegram\s+helpdesk)\b/i,
    reason: 'Claiming to represent Telegram staff or official support violates Telegram Terms of Service section 1.1 and results in immediate permanent ban.',
    recommendation: 'Never claim or imply you represent Telegram officials or administrators.',
  },
  {
    id: 'recovery-scam',
    category: 'SCAM_PHISHING',
    severity: 'HIGH',
    title: 'Fund Recovery / Unban Scam',
    regex: /(recovery\s+expert|recovered\s+my\s+(funds|crypto|bitcoin)|dịch\s+vụ\s+mở\s+khoá\s+tài\s+khoản|unban\s+service)/i,
    reason: 'Matches advance-fee fund recovery fraud targeting victims of previous scams.',
    recommendation: 'Only contact official Telegram support via telegram.org/support.',
  },

  // 6. Stars, Gambling & Drainer Scams
  {
    id: 'telegram-stars-fraud',
    category: 'SPAM',
    severity: 'HIGH',
    title: 'Telegram Stars Exploit / Scam',
    regex: /(free\s+telegram\s+stars|stars\s+generator|stars\s+glitch|hack\s+telegram\s+stars|cheap\s+telegram\s+stars\s+carding)/i,
    reason: 'Promoting unauthorized Telegram Stars generators, chargeback exploits, or carding schemes violates Telegram Stars Terms.',
    recommendation: 'Purchase Telegram Stars only through official inside-app mechanisms.',
  },
  {
    id: 'fake-airdrop-drainer',
    category: 'SCAM_PHISHING',
    severity: 'HIGH',
    title: 'Fake Airdrop / Wallet Connect Drainer',
    regex: /(claim\s+\$?\d+\s*(\$usdt|\$ton|usdt|ton|sol)\s+airdrop|connect\s+(tonkeeper|metamask|phantom)\s+wallet\s+to\s+(claim|receive))/i,
    reason: 'Matches malicious crypto drainer campaigns designed to empty connected user wallets.',
    recommendation: 'Never connect wallets to unverified third-party airdrop claim sites.',
  },
  {
    id: 'gambling-casino-scam',
    category: 'SPAM',
    severity: 'HIGH',
    title: 'Gambling / Casino Signal Groups',
    regex: /(kèo\s+tài\s+xỉu|kéo\s+baccarat|bao\s+thắng\s+100%|về\s+bờ\s+an\s+toàn|hack\s+game\s+bài|slot\s+hack\s+bot)/i,
    reason: 'Promoting deceptive casino pull groups or guaranteed gambling wins triggers heavy anti-spam filters.',
    recommendation: 'Do not promote gambling schemes or unverified prediction bots.',
  },

  // 7. Bio Redirection, Check Inbox & External Platform Harvesting
  {
    id: 'bio-redirection-spam',
    category: 'AGGRESSIVE_OUTREACH',
    severity: 'HIGH',
    title: 'Bio / Profile Link Redirection',
    regex: /(xem\s+link\s+ở\s+bio|link\s+in\s+bio|check\s+my\s+bio|thông\s+tin\s+ở\s+profile|link\s+dưới\s+bio)/i,
    reason: 'Directing group members to bio links is an evasion technique heavily penalized by community anti-spam bots.',
    recommendation: 'Share information openly in the chat rather than redirecting users to external bio links.',
  },
  {
    id: 'check-inbox-bait',
    category: 'AGGRESSIVE_OUTREACH',
    severity: 'MEDIUM',
    title: 'Check Inbox / Direct Message Bait',
    regex: /(check\s+ib|đã\s+rep\s+inbox|check\s+your\s+dm|tin\s+nhắn\s+riêng\s+nhé|đã\s+gửi\s+báo\s+giá\s+trong\s+tin\s+nhắn)/i,
    reason: 'Unsolicited DM pressure prompts recipients to click "Report Spam", causing SpamBot account bans.',
    recommendation: 'Discuss inquiries directly in the group without directing users to private inbox.',
  },
  {
    id: 'external-platform-harvesting',
    category: 'AGGRESSIVE_OUTREACH',
    severity: 'HIGH',
    title: 'External Platform Harvesting (WhatsApp/Zalo/Discord)',
    regex: /(add\s+whatsapp|qua\s+zalo\s+số|liên\s+hệ\s+qua\s+zalo|chat\.whatsapp\.com|discord\.gg\/)/i,
    reason: 'Channeling group users away to external unmoderated platforms triggers group anti-spam rules.',
    recommendation: 'Keep project discussions within the active Telegram group.',
  },

  // 8. Cold Outreach & Generic DM Traps
  {
    id: 'aggressive-cold-outreach',
    category: 'AGGRESSIVE_OUTREACH',
    severity: 'MEDIUM',
    title: 'Aggressive Cold Outreach / DM Trigger',
    regex: /\b(dm\s+me\s+(for|to)\s+(more|details|buy|earn)|check\s+your\s+dm|inbox\s+me\s+now|message\s+me\s+privately|send\s+me\s+a\s+pm|write\s+me\s+in\s+pm)\b/i,
    reason: 'Directing group members to private messages for sales or promotions frequently leads to recipients clicking "Report Spam", causing SpamBot restrictions.',
    recommendation: 'Provide the information in the public chat or invite discussion openly without unsolicited DM pressure.',
  },

  // 9. Obfuscation, Shorteners & Character Stretching
  {
    id: 'url-shortener',
    category: 'SCAM_PHISHING',
    severity: 'HIGH',
    title: 'Obfuscated / Shortened URL',
    regex: /(https?:\/\/)?(bit\.ly|tinyurl\.com|is\.gd|cutt\.ly|shorturl\.at|rb\.gy|t\.co|adf\.ly|goo\.gl|tiny\.cc)\/[a-zA-Z0-9_-]+/i,
    reason: 'Shortened URLs hide the actual destination. Telegram spam filters penalize shortened links because they are frequently used to mask malware and scam pages.',
    recommendation: 'Use direct, transparent destination URLs instead of link shorteners.',
  },
  {
    id: 'zero-width-obfuscation',
    category: 'SCAM_PHISHING',
    severity: 'HIGH',
    title: 'Zero-Width Character Obfuscation',
    regex: /[\u200B\u200C\u200D\uFEFF]/,
    reason: 'Contains invisible zero-width characters commonly used by spammers to evade automated word filters.',
    recommendation: 'Remove hidden/zero-width unicode characters from the message.',
  },
  {
    id: 'character-stretching-spam',
    category: 'SPAM',
    severity: 'HIGH',
    title: 'Character Stretching Visual Spam',
    regex: /([A-Za-zÀ-ỹ])\1{6,}/,
    reason: 'Excessive repeated characters (e.g. AIRDROOOOOOP) designed to dominate chat space and evade keyword filters.',
    recommendation: 'Use standard spelling without artificial character stretching.',
  },

  // 10. Multilingual Financial Scams
  {
    id: 'get-rich-quick-scam-en',
    category: 'SPAM',
    severity: 'HIGH',
    title: 'High-Yield / Financial Scam Trigger Words',
    regex: /\b(100%\s+guaranteed\s+(profit|returns?)|make\s+\$\d+.*daily|pump\s+and\s+dump|guaranteed\s+roi|risk[\s-]free\s+crypto|free\s+crypto\s+giveaway|send\s+\d+\s+get\s+\d+)\b/i,
    reason: 'Contains classic high-yield investment scam (HYIP) keywords that trigger automated spam scoring and user reports.',
    recommendation: 'Rephrase to remove unsubstantiated financial promises.',
  },
  {
    id: 'get-rich-quick-scam-ru',
    category: 'SPAM',
    severity: 'HIGH',
    title: 'High-Yield Scam Keywords (RU)',
    regex: /(раскрутка\s+(депозита|счета|баланса)|100%\s+гарантированн(ая|ый)\s+(прибыль|доход)|пассивный\s+доход\s+без\s+рисков|пишите\s+в\s+лс)/i,
    reason: 'Contains Russian high-yield spam and DM-solicitation phrases monitored by anti-spam systems.',
    recommendation: 'Avoid deceptive financial guarantees or unprompted private messaging requests.',
  },
  {
    id: 'get-rich-quick-scam-vi',
    category: 'SPAM',
    severity: 'HIGH',
    title: 'High-Yield Scam Keywords (VI)',
    regex: /(kèo\s+x\d+|lợi\s+nhuận\s+cam\s+kết|bao\s+lỗ|inbox\s+(ngay|em|nhận\s+kèo)|nhóm\s+vip\s+kéo)/i,
    reason: 'Contains Vietnamese high-yield crypto/casino scam phrases.',
    recommendation: 'Remove guaranteed profit claims and aggressive DM invitations.',
  },

  // 11. Piracy & Copyright Violations
  {
    id: 'piracy-copyright',
    category: 'ILLEGAL_TOS',
    severity: 'HIGH',
    title: 'Copyright / Piracy Terms',
    regex: /\b(cracked\s+(software|apk|ipa|windows)|keygen|torrent\s+link|leaked\s+(course|onlyfans|nudes|database)|free\s+netflix\s+account|nulled\s+script)\b/i,
    reason: 'Sharing pirated software, cracked accounts, or leaked databases violates DMCA / Telegram Intellectual Property rules and leads to channel/account bans.',
    recommendation: 'Do not distribute unauthorized intellectual property or cracked credentials.',
  }
];
