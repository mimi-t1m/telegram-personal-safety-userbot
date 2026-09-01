import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { NewMessage, NewMessageEvent } from 'telegram/events';
// @ts-ignore
import input from 'input';
import { UserbotHandler } from './handler';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables manually if running as standalone node script
function loadEnv(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env');
  const env: Record<string, string> = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        env[key] = val;
      }
    }
  }
  return env;
}

const env = loadEnv();
const API_ID = parseInt(process.env.TELEGRAM_API_ID || env.TELEGRAM_API_ID || '0', 10);
const API_HASH = process.env.TELEGRAM_API_HASH || env.TELEGRAM_API_HASH || '';
const SESSION_STRING = process.env.TELEGRAM_SESSION_STRING || env.TELEGRAM_SESSION_STRING || '';

// Cached dialogs for index shortcuts (1, 2, 3...)
let cachedDialogs: Array<{ id: any; title: string; entity: any }> = [];

async function startUserbot() {
  console.log('====================================================');
  console.log('🛡️ Telegram 24/7 Automatic Safety Shield (GramJS MTProto)');
  console.log('====================================================\n');

  if (!API_ID || !API_HASH) {
    console.error('❌ Missing TELEGRAM_API_ID or TELEGRAM_API_HASH in .env!');
    console.log('\n👉 How to get your API ID & API Hash (takes 30 seconds):');
    console.log('1. Go to https://my.telegram.org and log in with your phone number.');
    console.log('2. Click on "API development tools".');
    console.log('3. Create any app title (e.g. "MySafetyChecker").');
    console.log('4. Copy your api_id and api_hash and put them into your .env file:');
    console.log('   TELEGRAM_API_ID=12345678');
    console.log('   TELEGRAM_API_HASH=abcdef1234567890abcdef\n');
    process.exit(1);
  }

  const stringSession = new StringSession(SESSION_STRING);
  const client = new TelegramClient(stringSession, API_ID, API_HASH, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => await input.text('📱 Enter your Telegram phone number (with country code, e.g. +1234567890): '),
    password: async () => await input.text('🔑 Enter your 2FA password (if enabled): '),
    phoneCode: async () => await input.text('✉️ Enter the Telegram login code sent to your app: '),
    onError: (err: Error) => console.error('Authentication error:', err),
  });

  console.log('\n✅ Successfully logged into your Telegram account!');
  const savedSession = client.session.save() as unknown as string;

  // Save session string into .env for automatic future logins
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
    if (!envContent.includes('TELEGRAM_SESSION_STRING=')) {
      envContent += `\nTELEGRAM_SESSION_STRING=${savedSession}\n`;
    } else {
      envContent = envContent.replace(/TELEGRAM_SESSION_STRING=.*/, `TELEGRAM_SESSION_STRING=${savedSession}`);
    }
    fs.writeFileSync(envPath, envContent, 'utf-8');
  } catch (err) {
    console.warn('Could not auto-save session string to .env:', err);
  }

  const me = await client.getMe();
  const myIdStr = me.id.toString();
  console.log(`👤 Connected as: ${me.firstName || ''} ${me.lastName || ''} (@${me.username || 'no_username'}) [ID: ${myIdStr}]`);

  // Pre-fetch recent group dialogs
  try {
    const dialogs = await client.getDialogs({ limit: 40 });
    cachedDialogs = dialogs
      .filter((d) => d.isGroup || d.isChannel)
      .map((d) => ({
        id: d.id,
        title: d.title || 'Untitled Group',
        entity: d.entity,
      }));
    console.log(`📋 Cached ${cachedDialogs.length} active groups for quick relay.`);
  } catch (err) {
    console.warn('Could not fetch initial dialogs:', err);
  }

  console.log('\n🛡️ Automatic Safety Shield is ACTIVE on ALL outgoing messages!');
  console.log('----------------------------------------------------');
  console.log('✨ You can now chat NORMALLY without typing any prefix:');
  console.log('   • Safe messages: Sent instantly as normal (zero edit badge).');
  console.log('   • Risky messages: Automatically blocked & replaced with warning.');
  console.log('   • Relay from Saved Messages: .send 1 <message> or .groups');
  console.log('----------------------------------------------------\n');

  // Listen for all messages sent by YOU
  client.addEventHandler(async (event: NewMessageEvent) => {
    const message = event.message;
    if (!message || !message.text) return;

    // Check if the message is from yourself
    const senderIdStr = message.senderId ? message.senderId.toString() : '';
    const isFromMe = message.out || senderIdStr === myIdStr;
    if (!isFromMe) return;

    const rawText = message.text.trim();
    const result = UserbotHandler.processOutgoingMessage(rawText);
    if (!result.shouldHandle) return;

    // Case 1: Message is 100% safe (Sent normally without prefix) -> Pass untouched!
    if (result.action === 'PASS_UNTOUCHED') {
      console.log(`[PASS] Safe message sent: "${rawText.slice(0, 45)}..."`);
      return;
    }

    // Case 2: List Groups (.groups)
    if (result.action === 'LIST_GROUPS') {
      try {
        console.log('[ACTION] Fetching group list...');
        const dialogs = await client.getDialogs({ limit: 30 });
        cachedDialogs = dialogs
          .filter((d) => d.isGroup || d.isChannel)
          .map((d) => ({
            id: d.id,
            title: d.title || 'Untitled Group',
            entity: d.entity,
          }));

        const listText =
          `📋 <b>Active Groups for Quick Relay:</b>\n\n` +
          cachedDialogs
            .slice(0, 20)
            .map((g, idx) => `<b>[${idx + 1}]</b> <code>${g.title}</code>`)
            .join('\n') +
          `\n\n💡 <b>How to send:</b>\n<code>.send 1 Your message here</code>\nor <code>.send "Group Name" Your message</code>`;

        await client.editMessage(message.peerId, {
          message: message.id,
          text: listText,
          parseMode: 'html',
        });
        console.log('[ACTION] Group list displayed successfully.');
      } catch (err) {
        console.error('Error listing groups:', err);
      }
      return;
    }

    // Case 3: Relay Send (.send "Group Name" <message> or .send 1 <message>)
    if (result.action === 'RELAY_SEND' && result.target) {
      try {
        console.log(`[ACTION] Relaying message to target: "${result.target}"`);
        let targetEntity: any = null;
        let targetTitle = result.target;

        const targetIndex = parseInt(result.target, 10);
        if (!isNaN(targetIndex) && targetIndex >= 1 && targetIndex <= cachedDialogs.length) {
          const item = cachedDialogs[targetIndex - 1];
          targetEntity = item.entity;
          targetTitle = item.title;
        } else {
          const normalizedTarget = result.target.toLowerCase();
          const found = cachedDialogs.find(
            (d) =>
              d.title.toLowerCase() === normalizedTarget ||
              d.title.toLowerCase().includes(normalizedTarget)
          );
          if (found) {
            targetEntity = found.entity;
            targetTitle = found.title;
          } else {
            targetEntity = await client.getEntity(result.target);
          }
        }

        if (!targetEntity) {
          await client.editMessage(message.peerId, {
            message: message.id,
            text: `❌ Could not find group: "${result.target}". Type <code>.groups</code> to see active groups.`,
            parseMode: 'html',
          });
          return;
        }

        await client.sendMessage(targetEntity, { message: result.processedText });

        await client.editMessage(message.peerId, {
          message: message.id,
          text: `✅ <b>Sent safely to "${targetTitle}":</b>\n"${result.processedText}"`,
          parseMode: 'html',
        });

        console.log(`[RELAY] Successfully sent clean message to "${targetTitle}"`);
      } catch (err) {
        console.error('Error relaying message:', err);
        await client.editMessage(message.peerId, {
          message: message.id,
          text: `❌ Error sending to "${result.target}": ${err instanceof Error ? err.message : String(err)}`,
        });
      }
      return;
    }

    // Case 4: Explicit .c prefix used on safe message -> remove .c prefix
    if (result.action === 'EDIT_TO_SAFE') {
      try {
        await client.editMessage(message.peerId, {
          message: message.id,
          text: result.processedText,
        });
        console.log(`[SAFE] Cleaned & sent message: "${result.processedText.slice(0, 40)}..."`);
      } catch (err) {
        console.error('Failed to edit message:', err);
      }
      return;
    }

    // Case 5: Block Risky Content / Policy Violations (Automatic on any message)
    if (result.action === 'BLOCK_AND_WARN') {
      try {
        await client.editMessage(message.peerId, {
          message: message.id,
          text: result.processedText,
        });
        console.warn(`[WARNING] Risky content blocked: "${result.originalQuery.slice(0, 40)}..."`);
      } catch (err) {
        console.error('Failed to update message with warning:', err);
      }
      return;
    }
  }, new NewMessage({}));
}

if (require.main === module) {
  startUserbot().catch((err) => {
    console.error('Fatal userbot error:', err);
  });
}
