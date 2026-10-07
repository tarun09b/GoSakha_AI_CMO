// backend/services/gmail-sender.js
// Sends emails via the Gmail API using the stored OAuth refresh token.
// Handles MIME construction and ASCII-safe header encoding.
import { google } from 'googleapis';

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  GOOGLE_REFRESH_TOKEN,
  GMAIL_SENDER,
} = process.env;

let _client = null;

function getClient() {
  if (_client) return _client;

  const missing = [];
  if (!GOOGLE_CLIENT_ID) missing.push('GOOGLE_CLIENT_ID');
  if (!GOOGLE_CLIENT_SECRET) missing.push('GOOGLE_CLIENT_SECRET');
  if (!GOOGLE_REDIRECT_URI) missing.push('GOOGLE_REDIRECT_URI');
  if (!GOOGLE_REFRESH_TOKEN) missing.push('GOOGLE_REFRESH_TOKEN');
  if (missing.length) {
    throw new Error(`Gmail credentials missing from .env: ${missing.join(', ')}`);
  }

  const oauth2 = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
  oauth2.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
  _client = oauth2;
  return _client;
}

// Gmail requires the "From" address to match the authenticated user.
// GMAIL_SENDER must equal the account that owns GOOGLE_REFRESH_TOKEN.
const FROM_ADDRESS = GMAIL_SENDER || 'tarunbarka1234@gmail.com';

/**
 * Base64url encoding (Gmail API requires this, not standard base64).
 */
function toBase64Url(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Convert any non-ASCII characters in a header value into RFC 2047
 * "encoded-word" form. Prevents mojibake in subjects.
 */
function encodeHeader(value) {
  if (/^[\x00-\x7F]*$/.test(value)) return value;
  const b64 = Buffer.from(value, 'utf8').toString('base64');
  return `=?UTF-8?B?${b64}?=`;
}

/**
 * Send an email. Returns { id, threadId, labelIds }.
 */
export async function sendEmail({ to, subject, body }) {
  const auth = getClient();
  const gmail = google.gmail({ version: 'v1', auth });

  // Normalize line endings and ensure plain ASCII in the body
  // (bodies are simple templates; no need for quoted-printable)
  const safeBody = String(body).replace(/\r?\n/g, '\r\n');

  const headers = [
    `From: ${FROM_ADDRESS}`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    'List-Unsubscribe: <mailto:unsubscribe@gosakha.com?subject=unsubscribe>',
    'List-Unsubscribe-Post: List-Unsubscribe=One-Click',
  ];

  const rawMessage = headers.join('\r\n') + '\r\n\r\n' + safeBody;
  const encoded = toBase64Url(rawMessage);

  const result = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encoded },
  });

  return {
    id: result.data.id,
    threadId: result.data.threadId,
    labelIds: result.data.labelIds,
  };
}



// ---------------------------------------------------------------
// Reply detection — fetch incoming messages from a thread
// ---------------------------------------------------------------

/**
 * Extract the value of a specific header from a Gmail message.
 * Headers are in an array of { name, value }.
 */
function getHeader(message, name) {
  const headers = message.payload?.headers || [];
  const found = headers.find(
    (h) => h.name.toLowerCase() === name.toLowerCase()
  );
  return found?.value || null;
}

/**
 * Extract the text/plain body from a Gmail message payload.
 * Walks MIME parts recursively and returns the first text/plain found.
 */
function extractBody(payload) {
  if (!payload) return '';

  // Direct body
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64url').toString('utf8');
  }

  // Recurse into parts
  if (Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      const text = extractBody(part);
      if (text) return text;
    }
  }

  // Fallback: check for HTML and strip tags crudely
  if (payload.mimeType === 'text/html' && payload.body?.data) {
    const html = Buffer.from(payload.body.data, 'base64url').toString('utf8');
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  return '';
}

/**
 * Fetch the Gmail thread for a sent draft and return messages
 * that came *from the recipient* (not us).
 *
 * @param {string} threadId
 * @param {string} recipientEmail - the hospital's address
 * @param {string} sinceDate - ISO date string; skip messages received before this
 * @returns {Promise<Array<{messageId, threadId, from, fromName, subject, body, receivedAt}>>}
 */
export async function fetchRepliesInThread(threadId, recipientEmail, sinceDate = null) {
  if (!threadId) return [];

  const auth = getClient();
  const gmail = google.gmail({ version: 'v1', auth });

  let thread;
  try {
    thread = await gmail.users.threads.get({
      userId: 'me',
      id: threadId,
      format: 'full',
    });
  } catch (err) {
    // 404 = thread deleted; 401 = auth problem
    if (err.code === 404) return [];
    throw new Error(`Gmail thread fetch failed: ${err.message}`);
  }

  const messages = thread.data.messages || [];
  const ourAddress = FROM_ADDRESS.toLowerCase();
  const recipient = String(recipientEmail || '').toLowerCase();
  const sinceMs = sinceDate ? new Date(sinceDate).getTime() : 0;

  const incoming = [];

  for (const msg of messages) {
    const from = getHeader(msg, 'From') || '';
    const fromLower = from.toLowerCase();
    const labels = msg.labelIds || [];

    // Only skip messages Gmail marks as SENT (definitively our own outbound).
    // Address comparison is skipped — it breaks self-reply testing where
    // recipient === our address.
    if (labels.includes('SENT')) continue;

    // If we know the recipient AND they differ from us, require match
    if (recipient && recipient !== ourAddress && !fromLower.includes(recipient)) {
      continue;
    }

    // Skip if received before our send
    const receivedMs = Number(msg.internalDate) || 0;
    if (sinceMs && receivedMs < sinceMs - 60000) continue; // 1-min clock skew

    // Skip empty bodies (rare, but happens with calendar invites)
    const body = extractBody(msg.payload);
    if (!body || body.trim().length < 2) continue;

    // Extract from-name (strip email if present)
    const fromName = from.replace(/<[^>]+>/g, '').replace(/"/g, '').trim() || null;

    incoming.push({
      messageId: msg.id,
      threadId: msg.threadId,
      from: recipient || from,
      fromName,
      subject: getHeader(msg, 'Subject') || null,
      body: body.trim(),
      receivedAt: receivedMs ? new Date(receivedMs).toISOString() : null,
    });
  }

  return incoming;
}


/**
 * Find replies to a specific draft. Uses two strategies:
 *   1. Search the original Gmail thread for incoming messages
 *   2. Fall back to searching for messages FROM the recipient received after send
 *
 * Returns a deduplicated array of reply objects.
 */
export async function findRepliesForDraft(draft) {
  const { gmail_thread_id, recipient_email, sent_at, id } = draft;

  if (!recipient_email || !sent_at) {
    return [];
  }

  const auth = getClient();
  const gmail = google.gmail({ version: 'v1', auth });

  const seen = new Set();
  const replies = [];

  // --- Strategy 1: check the original thread (if we have a thread id) ---
  if (gmail_thread_id) {
    try {
      const threadReplies = await fetchRepliesInThread(
        gmail_thread_id,
        recipient_email,
        sent_at
      );
      for (const r of threadReplies) {
        if (!seen.has(r.messageId)) {
          seen.add(r.messageId);
          replies.push(r);
        }
      }
    } catch (err) {
      console.warn(`[findReplies] thread lookup failed for ${id}:`, err.message);
    }
  }

  // --- Strategy 2: search for messages FROM the recipient after send ---
  // Gmail's search API: 'from:' + 'after:' work reliably
  const sentDate = new Date(sent_at);
  const yyyy = sentDate.getFullYear();
  const mm = String(sentDate.getMonth() + 1).padStart(2, '0');
  const dd = String(sentDate.getDate()).padStart(2, '0');
  const afterDate = `${yyyy}/${mm}/${dd}`;

  try {
    const search = await gmail.users.messages.list({
      userId: 'me',
      q: `from:${recipient_email} after:${afterDate}`,
      maxResults: 20,
    });

    for (const m of search.data.messages || []) {
      if (seen.has(m.id)) continue;

      // Fetch the message body
      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: m.id,
        format: 'full',
      });

      // Skip if labeled SENT (our own outbound)
      if ((msg.data.labelIds || []).includes('SENT')) continue;

      const body = extractBody(msg.data.payload);
      if (!body || body.trim().length < 2) continue;

      const from = getHeader(msg.data, 'From') || '';
      const fromName = from.replace(/<[^>]+>/g, '').replace(/"/g, '').trim() || null;

      seen.add(m.id);
      replies.push({
        messageId: msg.data.id,
        threadId: msg.data.threadId,
        from: recipient_email,
        fromName,
        subject: getHeader(msg.data, 'Subject') || null,
        body: body.trim(),
        receivedAt: msg.data.internalDate
          ? new Date(Number(msg.data.internalDate)).toISOString()
          : null,
      });
    }
  } catch (err) {
    console.warn(`[findReplies] sender search failed for ${id}:`, err.message);
  }

  return replies;
}