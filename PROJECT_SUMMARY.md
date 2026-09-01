# 🛡️ Telegram Personal Safety & Anti-Ban Userbot

> **An automated 24/7 compliance and security shield for Telegram personal accounts, powered by GramJS (MTProto) and TypeScript.**

---

## 📌 Executive Summary

This project is a high-performance **Telegram Personal Userbot** designed to protect your Telegram account from being restricted, banned by `@SpamBot`, or reported by group members. 

Unlike traditional Telegram Bot API bots, this Userbot connects directly to your **personal Telegram session via MTProto**. It operates as an invisible background shield:
* **Zero `via @bot` tags**: All messages are posted natively from your personal account.
* **Zero Copy-Pasting Required**: You chat normally in any group or channel.
* **Instant In-Place Sanitization**: If a message contains policy violations, spam triggers, PII leaks, or violent content, the Userbot automatically intercepts and replaces it with a warning and safe rewrite in less than **50 milliseconds**.

---

## ⚡ Core Features & User Workflows

### 1. 🛡️ Zero-Prefix Automatic Shield (Everyday Chatting)
* **Safe Messages**: You type and send normally. The Userbot detects the message is clean and **leaves it 100% untouched** (no edit badges, no delays).
* **Risky / Policy Violation Messages**: If you type prohibited keywords (e.g. `bit.ly`, leaked OTP/keys, `"test lỗi từ"`), the Userbot **instantly overwrites the message** with a safety alert and the cleaned rewrite before anyone can read or report it.

### 2. 🚀 Private Relay Mode (100% Zero-Exposure Sandbox)
* Open your **"Saved Messages"** and type:
  * **`.groups`**: Displays your recent active groups with shortcut numbers `[1]`, `[2]`, `[3]`.
  * **`.send 1 <message>`** or **`.send "Group Name" <message>`**:
    1. Inspects the content in private inside Saved Messages.
    2. **If Safe**: Relays the message directly to the target group as **YOU**.
    3. **If Risky**: Blocks the relay and keeps the warning in Saved Messages so **zero dangerous packets ever touch the group**.

---

## 📋 Comprehensive Policy Engine (52 Rules)

The policy engine implements official rules gathered from **[telegram.org/safety](https://telegram.org/safety)**, **Telegram Terms of Service**, **Telegram Privacy Policy**, and **`@SpamBot` case studies**:

| Category | Rules & Coverage |
| :--- | :--- |
| **1. Violence, Threats & Safety** | Incitement to violence, mob lynching, death threats, homemade explosives (`bom xăng`, `pipe bomb`), weapon blueprints, extortion/blackmail, self-harm/suicide incitement, terrorist propaganda. |
| **2. Phishing & Hijacking Traps** | Contest/voting phishing (`"bình chọn giúp bé"`), fake free Telegram Premium, urgent account deletion scare tactics, fake `t-me.xyz` domains. |
| **3. Group Anti-Spam & `@SpamBot`** | Bio/Profile link redirection (`"xem link ở bio"`), Vietnamese check inbox bait (`"check ib nhé"`), external platform recruiting (WhatsApp/Zalo/Discord), aggressive cold outreach, mass user mentions (>3 users). |
| **4. Privacy & PII Protection** | 12/24-word crypto seed phrases, Telegram login OTPs, Telegram Bot Tokens, citizen national IDs (CCCD/CMND), unsolicited bank account drops (STK), stealer logs/combolists. |
| **5. Financial & Crypto Scams** | Fake airdrop/wallet connect drainers (`Tonkeeper`/`MetaMask`), gambling & casino pull groups (`kèo tài xỉu`, `nhóm kéo baccarat`), advance-fee unban/recovery scams, multi-language HYIP phrases. |
| **6. Obfuscation & Spammer Tricks** | URL shorteners (`bit.ly`, `tinyurl.com`), zero-width unicode character evasion, character stretching visual spam (`AIRDROOOOOOP`), simulated test triggers (`"test lỗi từ"`). |

---

## 🛠️ Technology Stack

* **Language**: TypeScript 5.7+ / Node.js 22+
* **MTProto Library**: GramJS (`telegram` npm package)
* **Test Runner**: Vitest (52 Unit Tests - **100% Pass Rate**)
* **Execution**: `tsx` (Zero-compilation TypeScript runtime)

---

## 🚀 Quickstart & Commands

```powershell
# 1. Install dependencies
npm install

# 2. Run test suite (52 tests)
npm test

# 3. Start the Userbot
npm run userbot
```

### Environment Variables (`.env`)
```env
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
TELEGRAM_SESSION_STRING=auto_generated_after_first_login
```

---

## ☁️ Deployment Recommendations

* **AWS Lightsail / VPS**: Runs 24/7 with `pm2` for $3.50/mo (3 months free trial).
* **Render.com / Fly.io**: Free background container worker.
* **Local Background**: `pm2 start npm --name "userbot" -- run userbot`.
