# 🛡️ Telegram Personal Safety & Anti-Ban Userbot (GramJS MTProto)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22+-green.svg)](https://nodejs.org/)
[![Vitest](https://img.shields.io/badge/Tests-72%20Passing-brightgreen.svg)](https://vitest.dev/)
[![Telegram](https://img.shields.io/badge/MTProto-GramJS-2CA5E0.svg)](https://telegram.org/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

An intelligent, real-time **24/7 compliance and security shield for Telegram personal accounts**. Built with **GramJS (MTProto)** and **TypeScript**, it runs directly on your account session to protect you from `@SpamBot` restrictions, group reporting bans, phishing traps, data leakage, and terms-of-service violations.

All messages are sent **directly from your personal profile** with **ZERO `via @bot` tags** and **ZERO copy-pasting required**.

---

## 🌟 Key Features

* **⚡ Zero-Prefix Automatic Shield**:
  * Passively monitors all outgoing messages in real-time.
  * **Safe messages**: Sent normally with **0 delay and 0 edits** (no "edited" badge).
  * **Risky direct messages**: Intercepted in $< 50$ms and replaced with an alert and safe rewrite before anyone can report your account.

* **🗑️ Forwarded Message Auto-Delete & Privacy Shield**:
  * Passively detects outgoing **forwarded messages** containing privacy/policy violations (seed phrases, credit cards, credentials, phishing links, etc.).
  * Since Telegram MTProto forbids editing forwarded messages, the userbot **immediately revokes and deletes the forwarded message for all participants** ($< 50$ms).
  * Automatically sends a detailed violation report to your private **"Saved Messages"** so you know what was intercepted and why.

* **🔒 Private Sandbox Relay (100% Zero-Exposure)**:
  * Use your private **"Saved Messages"** as a test sandbox.
  * Type `.groups` to list your active groups with shortcut numbers `[1]`, `[2]`, `[3]`.
  * Type `.send 1 <message>` or `.send "Group Name" <message>` to verify content in private and relay the clean message directly into the target group.

* **🛡️ 52 Comprehensive Policy Rules**:
  * Cross-referenced against **[telegram.org/safety](https://telegram.org/safety)**, official **Telegram Terms of Service**, **Telegram Privacy Policy**, and **`@SpamBot` case studies**.

* **🧪 100% Test-Driven Quality**:
  * Full test coverage with **72 automated unit tests** in Vitest.

---

## 📋 Comprehensive Policy Engine (52 Rules)

```
                       ┌─────────────────────────────────────────────────┐
                       │           Outgoing Telegram Message             │
                       └───────────────────────┬─────────────────────────┘
                                               │
                                       [Content Analyzer]
                                   (52 Rule Pattern Matches)
                                               │
                       ┌───────────────────────┴─────────────────────────┐
                       ▼                                                 ▼
             [✅ 100% Compliant]                                [⚠️ Violation Found]
           • Passed untouched                                 • Intercepted in < 50ms
           • 0 edits, 0 delay                                 • In-place overwrite with warning
           • Native profile send                              • Auto-generated safe rewrite
```

| Category | Real-World Violations Detected & Blocked |
| :--- | :--- |
| **1. Violence, Threats & Safety**<br>*(from [telegram.org/safety](https://telegram.org/safety))* | • Incitement to physical violence & mob lynching (`"đánh chết nó"`, `"hunt them down"`)<br>• Death threats & lethal harassment (`"tao sẽ giết mày"`, `"I will kill you"`)<br>• Homemade explosives & weapons (`"bom xăng"`, `"pipe bomb"`, `"molotov cocktail"`)<br>• Blackmail, extortion & sextortion threats (`"tống tiền ảnh nóng"`)<br>• Self-harm & suicide encouragement (`"tự tử đi"`, `"go kill yourself"`)<br>• Terrorist propaganda (ISIS, Al-Qaeda, mass shooting manifestos)<br>• Malicious doxxing coupled with calls to attack/vandalize |
| **2. Phishing & Hijacking Traps** | • Fake voting/contest traps (`"bình chọn giúp bé"`, `"vote for my drawing"`)<br>• Fake Free Telegram Premium / Free Stars promos<br>• Urgent account deletion phishing (`"account will be deleted in 24h"`)<br>• Imitation domains (`t-me.xyz`, `telegram-security.top`) |
| **3. Group Anti-Spam & `@SpamBot`** | • Bio/Profile link redirection (`"xem link ở bio"`, `"check my bio"`)<br>• Vietnamese check inbox bait (`"check ib nhé"`, `"đã rep inbox"`)<br>• External platform recruiting (`"qua Zalo"`, `"add WhatsApp"`, `"join discord.gg"`)<br>• Aggressive cold DM triggers (`"dm me for details"`)<br>• Mass user mentions (> 3 @mentions in one message) |
| **4. Privacy, Security & PII** | • 12/24-word crypto seed phrases & private keys $\rightarrow$ *[REDACTED]*<br>• Telegram login OTPs & credit cards $\rightarrow$ *[REDACTED]*<br>• Telegram Bot Tokens (`8911096711:AAE...`) $\rightarrow$ *[REDACTED]*<br>• National IDs (CCCD / CMND / SSN) $\rightarrow$ *[REDACTED]*<br>• Unsolicited bank account number drops (STK)<br>• Stealer logs & combo database dumps |
| **5. Financial & Crypto Scams** | • Fake airdrops & Tonkeeper/MetaMask wallet drainers<br>• Casino & gambling pull groups (`"kèo tài xỉu bao thắng"`, `"kéo baccarat"`)<br>• Advance-fee crypto recovery & unban scams<br>• Multi-language high-yield Ponzi/HYIP triggers (EN, RU, VI) |
| **6. Obfuscation & Spammer Tricks** | • URL shorteners (`bit.ly`, `tinyurl.com`, `is.gd`, `cutt.ly`)<br>• Zero-width unicode character filters<br>• Character stretching spam (`AIRDROOOOOOPPPPPP`, `KÈOOOOO`)<br>• Simulated test triggers (`"test lỗi từ"`, `"test incorrect word"`) |

---

## 🚀 Quickstart Guide

### 1. Prerequisites
* **Node.js 22+** installed on your machine.
* A Telegram account and phone number.

### 2. Get Your Telegram API Credentials (Free, Takes 30 Seconds)
1. Go to **[my.telegram.org](https://my.telegram.org)** and log in with your phone number.
2. Click **API development tools**.
3. Create an application (e.g., App title: `MySafetyChecker`, Short name: `safetychecker`).
4. Copy your **`api_id`** and **`api_hash`**.

### 3. Setup Project & Environment
Clone or navigate to your project folder:

```powershell
# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

Open `.env` and fill in your credentials:
```env
TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=abcdef1234567890abcdef
TELEGRAM_SESSION_STRING=
```
*(Leave `TELEGRAM_SESSION_STRING` empty on initial run; it is generated automatically after your first login).*

### 4. Start the Userbot
```powershell
npm run userbot
```
* On the first run, enter your phone number and the login code sent to your Telegram app.
* Your session is saved permanently in `.env` so you won't need to log in again!

---

## 💬 How to Use in Telegram

### Method 1: Chat Normally Anywhere (Zero-Prefix)
Just chat as you normally do in any group or private chat:
* If your text is clean: Sent immediately with no edits.
* If you type a risky message:
  ```text
  Check out this link https://bit.ly/secret and dm me for details!
  ```
  The bot immediately overwrites it with:
  ```text
  ⚠️ [SAFETY BLOCKED - Risk: 65%]
  Your message contained high-risk patterns: "https://bit.ly/secret" (URL Shortener), "dm me" (Cold Outreach)

  💡 Suggested Safe Version:
  Check out this link [DIRECT_LINK_HERE] (happy to share info here in the group)!
  ```

### Method 2: Private Relay from Saved Messages
In your **Saved Messages**:
1. Type:
   ```text
   .groups
   ```
   *(Edits to show your active groups with numbers `[1]`, `[2]`, `[3]`)*
2. Type:
   ```text
   .send 1 Hey team, are we ready for the 3 PM sync?
   ```
   *(Checks safety in private, then posts clean text into Group #1 directly as you!)*

---

## 🧪 Testing & Quality Assurance

Run the automated test suite with Vitest:
```powershell
npm test
```
```text
 ✓ tests/policy-analyzer.test.ts (4 tests)
 ✓ tests/userbot-handler.test.ts (5 tests)
 ✓ tests/policy-rules.test.ts (43 tests)

 Test Files  3 passed (3)
      Tests  52 passed (52)
```

Verify TypeScript types:
```powershell
npm run build
# tsc --noEmit -> 0 errors
```

---

## ☁️ 24/7 Cloud & Docker Deployment

### 1. Docker & Docker Compose (Recommended)

1. **Create your environment file (e.g. `custom.env` or `.env`)**:
   ```env
   DOCKER_IMAGE=yourusername/telegram-safety-userbot:latest
   TELEGRAM_API_ID=12345678
   TELEGRAM_API_HASH=abcdef1234567890abcdef
   TELEGRAM_SESSION_STRING=
   ```

2. **First-time login (interactive)**:
   ```bash
   docker compose --env-file custom.env -f docker-compose.yml run --rm telegram-safety-userbot
   ```

3. **Start 24/7 in background**:
   ```bash
   docker compose --env-file custom.env -f docker-compose.yml up -d
   ```

4. **View logs**:
   ```bash
   docker compose --env-file custom.env -f docker-compose.yml logs -f
   ```

5. **Stop container**:
   ```bash
   docker compose --env-file custom.env -f docker-compose.yml down
   ```

---

### 2. AWS Lightsail VPS (PM2)
```bash
sudo apt update && sudo apt install -y nodejs npm git
sudo npm install -g pm2
pm2 start npm --name "telegram-userbot" -- run userbot
pm2 startup && pm2 save
```

---

### 3. Local PC Background (PM2)
```powershell
npm install -g pm2
pm2 start tsx --name "telegram-userbot" -- src/userbot/userbot.ts
```

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
