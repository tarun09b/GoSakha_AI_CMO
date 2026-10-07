// backend/poller.js
// Background poller — runs processDraftReplies on all sent drafts every N minutes.
// Usage: node poller.js
// Stop: Ctrl+C
import 'dotenv/config';
import { pool } from './db/pool.js';
import { processDraftReplies } from './services/reply-handler.js';

const INTERVAL_MS = Number(process.env.POLLER_INTERVAL_MS || 2 * 60 * 1000); // 2 min
const BATCH_SIZE = Number(process.env.POLLER_BATCH_SIZE || 20);

// Human-readable timestamp
function ts() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function log(msg) {
  console.log(`[${ts()}] ${msg}`);
}

async function tick() {
  try {
    // Get sent drafts that haven't been polled in the last ~1 minute
    // (to spread load if the poller overlaps with manual testing)
    const drafts = await pool.query(
      `SELECT id, recipient_email, gmail_thread_id, sent_at
       FROM email_drafts
       WHERE status = 'sent'
         AND sent_at IS NOT NULL
       ORDER BY sent_at DESC
       LIMIT $1`,
      [BATCH_SIZE]
    );

    if (drafts.rowCount === 0) {
      log('No sent drafts to check.');
      return;
    }

    let totalFetched = 0;
    let totalStored = 0;

    for (const draft of drafts.rows) {
      const summary = await processDraftReplies(draft);
      totalFetched += summary.fetched;
      totalStored += summary.stored;

      if (summary.stored > 0) {
        log(`Draft ${draft.id.slice(0, 8)} → ${draft.recipient_email}: ${summary.stored} new reply(ies) [${summary.classifications.join(', ')}]`);
      }
    }

    log(`Checked ${drafts.rowCount} draft(s) · ${totalFetched} message(s) fetched · ${totalStored} new reply(ies) stored.`);
  } catch (err) {
    console.error(`[${ts()}] Poller tick error:`, err.message);
  }
}

async function main() {
  log(`GoSakha reply poller started.`);
  log(`Interval: ${INTERVAL_MS / 1000}s · Batch size: ${BATCH_SIZE}`);

  // First tick immediately
  await tick();

  // Then every INTERVAL_MS
  const interval = setInterval(tick, INTERVAL_MS);

  // Graceful shutdown
  const shutdown = async (signal) => {
    log(`Received ${signal}, shutting down...`);
    clearInterval(interval);
    await pool.end();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Fatal poller error:', err);
  process.exit(1);
});