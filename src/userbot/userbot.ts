import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { NewMessage, NewMessageEvent } from 'telegram/events';
import { EditedMessage, EditedMessageEvent } from 'telegram/events/EditedMessage';
// @ts-ignore
import input from 'input';
import { UserbotHandler } from './handler';
import { ContentAnalyzer } from '../policy/analyzer';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables manually if running as standalone node script
function loadEnv(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env');
  const env: Record<string, string> = {};
  try {
    if (fs.existsSync(envPath) && fs.statSync(envPath).isFile()) {
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
  } catch (err) {
    // Gracefully ignore if .env cannot be read (e.g. running purely with container environment variables)
  }
  return env;
}

const env = loadEnv();
const API_ID = parseInt(process.env.TELEGRAM_API_ID || env.TELEGRAM_API_ID || '0', 10);
const API_HASH = process.env.TELEGRAM_API_HASH || env.TELEGRAM_API_HASH || '';
const SESSION_STRING = process.env.TELEGRAM_SESSION_STRING || env.TELEGRAM_SESSION_STRING || '';

// Cached dialogs for index shortcuts (1, 2, 3...)
let cachedDialogs: Array<{ id: any; title: string; entity: any }> = [];

// Interactive Pending Approvals Store
interface PendingRedaction {
  id: number;
  peerId: any;
  messageId: number;
  chatTitle: string;
  originalText: string;
  suggestedText: string;
  notificationMsgId?: number;
  createdAt: number;
}

let nextApprovalId = 1;
const pendingApprovals = new Map<number, PendingRedaction>();
const notificationToApprovalMap = new Map<number, number>(); // notificationMsgId -> approvalId

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
  console.log('\n🔑 TELEGRAM_SESSION_STRING:');
  console.log(savedSession);
  console.log('----------------------------------------------------');

  // Save session string into .env for automatic future logins if .env is a valid file
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (!fs.existsSync(envPath) || fs.statSync(envPath).isFile()) {
      let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
      if (!envContent.includes('TELEGRAM_SESSION_STRING=')) {
        envContent += `\nTELEGRAM_SESSION_STRING=${savedSession}\n`;
      } else {
        envContent = envContent.replace(/TELEGRAM_SESSION_STRING=.*/, `TELEGRAM_SESSION_STRING=${savedSession}`);
      }
      fs.writeFileSync(envPath, envContent, 'utf-8');
      console.log('💾 Session string auto-saved to .env file.');
    }
  } catch (err) {
    console.warn('Could not auto-save session string to .env file:', err);
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
  console.log('   • Risky messages: Intercepted -> Redacted in chat -> 1-Click approval in Saved Messages.');
  console.log('   • Relay from Saved Messages: .send 1 <message> or .groups');
  console.log('----------------------------------------------------\n');

  // Core Message Processor (Handles both newly sent messages and edited messages)
  async function onMessageEvent(event: NewMessageEvent | EditedMessageEvent, isEdit = false) {
    const message = event.message;
    if (!message) return;

    // Check if the message is from yourself
    const senderIdStr = message.senderId ? message.senderId.toString() : '';
    const isFromMe = message.out || senderIdStr === myIdStr;
    if (!isFromMe) return;

    const rawText = (message.text || message.message || '').trim();
    if (!rawText) return;

    // Ignore messages that are our own placeholder (to prevent recursion)
    if (rawText === '🛡️ [Message redacted by Safety Shield]') return;

    // Check for interactive approval commands with optional custom text (e.g. /approve_1 newtest here, .approve 1, /apply_1)
    const approveWithIdMatch = rawText.match(/^[/.]approve(?:_|\s+)(\d+)(?:\s+(.+))?$/i) || rawText.match(/^[/.]apply(?:_|\s+)(\d+)(?:\s+(.+))?$/i);
    if (approveWithIdMatch) {
      const approvalId = parseInt(approveWithIdMatch[1], 10);
      const customWords = approveWithIdMatch[2]?.trim();
      const pending = pendingApprovals.get(approvalId);
      if (!pending) {
        await client.sendMessage('me', {
          message: `⚠️ Approval request <b>#${approvalId}</b> was not found, has expired, or was already applied.`,
          parseMode: 'html',
        });
        return;
      }

      const resolution = UserbotHandler.resolveCustomReplacement(pending.suggestedText, customWords);
      if (!resolution.isSafe) {
        const violationsList = resolution.violations.map((v) => `• <b>${v}</b>`).join('\n');
        await client.sendMessage('me', {
          message: `⚠️ <b>Cannot apply custom replacement!</b>\nThe resulting message contains high-risk patterns:\n${violationsList}\n\n💡 Please provide a safe replacement word.`,
          parseMode: 'html',
        });
        return;
      }

      try {
        await client.editMessage(pending.peerId, {
          message: pending.messageId,
          text: resolution.text,
        });

        await client.sendMessage('me', {
          message: `✅ <b>Approved #${approvalId}!</b> Message in <code>${pending.chatTitle}</code> updated to:\n\n<code>${resolution.text}</code>`,
          parseMode: 'html',
        });

        pendingApprovals.delete(approvalId);
        if (pending.notificationMsgId) {
          notificationToApprovalMap.delete(pending.notificationMsgId);
        }
        console.log(`[APPROVED] Successfully applied #${approvalId} to "${pending.chatTitle}": "${resolution.text.slice(0, 40)}..."`);
      } catch (err) {
        console.error(`Failed to apply approval #${approvalId}:`, err);
        await client.sendMessage('me', {
          message: `❌ Failed to update message in <code>${pending.chatTitle}</code>: ${err instanceof Error ? err.message : String(err)}`,
          parseMode: 'html',
        });
      }
      return;
    }

    // Support standalone /approve [custom text], .approve, /apply, .apply (without ID, applies to latest pending item)
    const genericApproveMatch = rawText.match(/^[/.]approve(?:\s+(.+))?$/i) || rawText.match(/^[/.]apply(?:\s+(.+))?$/i);
    if (genericApproveMatch) {
      if (pendingApprovals.size === 0) {
        await client.sendMessage('me', {
          message: '📋 No pending redacted messages awaiting approval.',
        });
        return;
      }
      const customWords = genericApproveMatch[1]?.trim();
      const latestId = Array.from(pendingApprovals.keys()).sort((a, b) => b - a)[0];
      const pending = pendingApprovals.get(latestId)!;

      const resolution = UserbotHandler.resolveCustomReplacement(pending.suggestedText, customWords);
      if (!resolution.isSafe) {
        const violationsList = resolution.violations.map((v) => `• <b>${v}</b>`).join('\n');
        await client.sendMessage('me', {
          message: `⚠️ <b>Cannot apply custom replacement!</b>\nThe resulting message contains high-risk patterns:\n${violationsList}\n\n💡 Please provide a safe replacement word.`,
          parseMode: 'html',
        });
        return;
      }

      try {
        await client.editMessage(pending.peerId, {
          message: pending.messageId,
          text: resolution.text,
        });

        await client.sendMessage('me', {
          message: `✅ <b>Approved #${latestId}!</b> Message in <code>${pending.chatTitle}</code> updated to:\n\n<code>${resolution.text}</code>`,
          parseMode: 'html',
        });

        pendingApprovals.delete(latestId);
        if (pending.notificationMsgId) {
          notificationToApprovalMap.delete(pending.notificationMsgId);
        }
        console.log(`[APPROVED] Successfully applied latest #${latestId} to "${pending.chatTitle}": "${resolution.text.slice(0, 40)}..."`);
      } catch (err) {
        console.error(`Failed to apply approval #${latestId}:`, err);
        await client.sendMessage('me', {
          message: `❌ Failed to update message in <code>${pending.chatTitle}</code>: ${err instanceof Error ? err.message : String(err)}`,
          parseMode: 'html',
        });
      }
      return;
    }

    // Check if user replied to a Saved Messages notification
    const replyToId = (message.replyTo && (message.replyTo as any).replyToMsgId) || (message as any).replyToMsgId;
    if (replyToId && notificationToApprovalMap.has(replyToId)) {
      const approvalId = notificationToApprovalMap.get(replyToId)!;
      const pending = pendingApprovals.get(approvalId);
      if (pending) {
        const lower = rawText.toLowerCase().trim();
        const isAffirmative = ['ok', 'yes', 'y', 'send', 'apply', 'approve', '.approve', '/approve', 'dong y', 'đồng ý', 'duoc', 'được'].includes(lower);
        const customWords = isAffirmative ? undefined : rawText;

        const resolution = UserbotHandler.resolveCustomReplacement(pending.suggestedText, customWords);
        if (!resolution.isSafe) {
          const violationsList = resolution.violations.map((v) => `• <b>${v}</b>`).join('\n');
          await client.sendMessage('me', {
            message: `⚠️ <b>Cannot apply custom replacement!</b>\nThe resulting message contains high-risk patterns:\n${violationsList}\n\n💡 Please provide a safe replacement word.`,
            parseMode: 'html',
          });
          return;
        }

        try {
          await client.editMessage(pending.peerId, {
            message: pending.messageId,
            text: resolution.text,
          });

          await client.sendMessage('me', {
            message: `✅ <b>Approved #${approvalId}!</b> Message in <code>${pending.chatTitle}</code> updated to:\n\n<code>${resolution.text}</code>`,
            parseMode: 'html',
          });

          pendingApprovals.delete(approvalId);
          notificationToApprovalMap.delete(replyToId);
          console.log(`[REPLY-APPROVED] Updated message for #${approvalId} in "${pending.chatTitle}": "${resolution.text.slice(0, 40)}..."`);
        } catch (err) {
          console.error(`Failed to update message on reply for #${approvalId}:`, err);
          await client.sendMessage('me', {
            message: `❌ Failed to update message in <code>${pending.chatTitle}</code>: ${err instanceof Error ? err.message : String(err)}`,
            parseMode: 'html',
          });
        }
        return;
      }
    }

    // Check for .pending command
    if (rawText === '.pending' || rawText === '/pending') {
      if (pendingApprovals.size === 0) {
        await client.sendMessage('me', {
          message: '📋 No pending redacted messages awaiting approval.',
        });
        return;
      }
      const list = Array.from(pendingApprovals.values())
        .map((p) => `<b>[#${p.id}]</b> in <code>${p.chatTitle}</code>:\n<code>${p.suggestedText.slice(0, 80)}${p.suggestedText.length > 80 ? '...' : ''}</code>\n👉 /approve_${p.id}`)
        .join('\n\n');
      await client.sendMessage('me', {
        message: `📋 <b>Pending Redacted Messages (${pendingApprovals.size}):</b>\n\n${list}`,
        parseMode: 'html',
      });
      return;
    }

    // Check if the message is a Forward
    const isForward = Boolean(message.fwdFrom || (message as any).forward);

    const result = UserbotHandler.processOutgoingMessage(rawText, { isForward, isEdit });
    if (!result.shouldHandle) return;

    // Case 1: Message is 100% safe -> Pass untouched!
    if (result.action === 'PASS_UNTOUCHED') {
      console.log(`[PASS] Safe message (${isEdit ? 'Edited' : isForward ? 'Forward' : 'Direct'}): "${rawText.slice(0, 45)}..."`);
      return;
    }

    // Case 1b: Risky Forwarded Message -> Instant Delete for everyone + Alert to Saved Messages
    if (result.action === 'DELETE_AND_NOTIFY') {
      try {
        console.warn(`[INTERCEPT] Deleting violating forwarded message (ID: ${message.id})...`);
        
        // 1. Delete message immediately for all participants
        await client.deleteMessages(message.peerId, [message.id], { revoke: true });

        // 2. Resolve destination chat title
        let chatTitle = 'Unknown Chat';
        try {
          const entity: any = await client.getEntity(message.peerId);
          chatTitle = entity.title || entity.username || `${entity.firstName || ''} ${entity.lastName || ''}`.trim() || 'Private Chat';
        } catch {
          chatTitle = 'Target Chat';
        }

        // 3. Format detailed alert report
        const flaggedList = result.analysis?.violations
          .map((v) => `• <b>${v.title}</b>: <i>${v.reason}</i>`)
          .join('\n') || '• Privacy/Policy violation';

        const alertReport =
          `🚨 <b>[FORWARDED MESSAGE INTERCEPTED & DELETED]</b>\n\n` +
          `📍 <b>Destination Chat:</b> <code>${chatTitle}</code>\n` +
          `⚠️ <b>Risk Score:</b> <code>${result.analysis?.riskScore}%</code>\n\n` +
          `🛡️ <b>Violations Detected:</b>\n${flaggedList}\n\n` +
          `📝 <b>Blocked Message Snippet:</b>\n<code>${rawText.slice(0, 250)}${rawText.length > 250 ? '...' : ''}</code>\n\n` +
          `🔒 <i>The message was permanently deleted for all members in &lt;50ms to protect your account.</i>`;

        // 4. Send safety report to your Saved Messages ('me')
        await client.sendMessage('me', {
          message: alertReport,
          parseMode: 'html',
        });

        console.log(`[DELETED] Successfully revoked violating forward in "${chatTitle}" and sent safety report to Saved Messages.`);
      } catch (err) {
        console.error('Failed to delete violating forwarded message:', err);
      }
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

    // Case 5: Block Risky Content / Policy Violations -> Redact in Chat & Notify Saved Messages with 1-Click Approve
    if (result.action === 'BLOCK_AND_WARN') {
      try {
        // 1. Immediately edit the message in destination chat to the clean redacted placeholder
        await client.editMessage(message.peerId, {
          message: message.id,
          text: result.processedText,
        });
        console.warn(`[${isEdit ? 'EDIT-REDACTED' : 'REDACTED'}] Message in chat redacted safely: "${rawText.slice(0, 40)}..."`);

        // 2. Resolve destination chat title
        let chatTitle = 'Direct Chat';
        try {
          const entity: any = await client.getEntity(message.peerId);
          chatTitle = entity.title || entity.username || `${entity.firstName || ''} ${entity.lastName || ''}`.trim() || 'Direct Chat';
        } catch {
          chatTitle = 'Direct Chat';
        }

        // 3. Register pending approval
        const approvalId = nextApprovalId++;
        const pending: PendingRedaction = {
          id: approvalId,
          peerId: message.peerId,
          messageId: message.id,
          chatTitle,
          originalText: rawText,
          suggestedText: result.cleanedText || rawText,
          createdAt: Date.now(),
        };
        pendingApprovals.set(approvalId, pending);

        // 4. Format private report with 1-click approve link
        const flaggedList = result.analysis?.violations
          .map((v) => `• <b>${v.title}</b>: <i>${v.reason}</i>`)
          .join('\n') || '• Privacy/Policy violation';

        const prefillCommand = encodeURIComponent(`/approve_${approvalId} `);
        const prefillLink = me.username
          ? `https://t.me/${me.username}?text=${prefillCommand}`
          : `https://t.me/share/url?text=${prefillCommand}`;

        const alertReport =
          `🛡️ <b>[${isEdit ? 'EDITED MESSAGE' : 'MESSAGE'} REDACTED BY SAFETY SHIELD]</b>\n\n` +
          `📍 <b>Destination Chat:</b> <code>${chatTitle}</code>\n` +
          `⚠️ <b>Risk Score:</b> <code>${result.analysis?.riskScore}%</code>\n\n` +
          `🛡️ <b>Violations Detected:</b>\n${flaggedList}\n\n` +
          `💡 <b>Suggested Safe Version:</b>\n<code>${result.cleanedText}</code>\n\n` +
          `👉 <b>Click to write in message box:</b>\n<a href="${prefillLink}">/approve_${approvalId}</a>\n\n` +
          `<i>(Tip: You can click the link above, or just send <code>/approve</code>, or reply directly with <code>ok</code>)</i>`;

        // 5. Send report to Saved Messages ('me')
        const sentNotification = await client.sendMessage('me', {
          message: alertReport,
          parseMode: 'html',
        });

        if (sentNotification && sentNotification.id) {
          pending.notificationMsgId = sentNotification.id;
          notificationToApprovalMap.set(sentNotification.id, approvalId);
        }
      } catch (err) {
        console.error('Failed to redact message or send Saved Messages notification:', err);
      }
      return;
    }
  }

  // Register event handlers for both newly sent messages AND edited messages
  client.addEventHandler(async (event: NewMessageEvent) => {
    await onMessageEvent(event, false);
  }, new NewMessage({}));

  client.addEventHandler(async (event: EditedMessageEvent) => {
    await onMessageEvent(event, true);
  }, new EditedMessage({}));
}

if (require.main === module) {
  startUserbot().catch((err) => {
    console.error('Fatal userbot error:', err);
  });
}
