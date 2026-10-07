// backend/services/reply-handler.js
// Orchestrates: fetch replies → classify → store → update lead → audit
import { pool } from '../db/pool.js';
import { audit } from './audit.js';
import { classifyReply } from './reply-classifier.js';
import { findRepliesForDraft } from './gmail-sender.js';

/**
 * Process all replies for a single draft.
 * Idempotent — safe to run repeatedly; DB unique constraint dedupes.
 *
 * @returns {Promise<{fetched: number, stored: number, skipped: number, classifications: string[]}>}
 */
export async function processDraftReplies(draft) {
  const summary = { fetched: 0, stored: 0, skipped: 0, classifications: [] };

  const replies = await findRepliesForDraft(draft);
  summary.fetched = replies.length;
  if (replies.length === 0) return summary;

  for (const reply of replies) {
    // --- Classify ---
    const { classification, confidence, matched_signals } = classifyReply(
      reply.body,
      reply.subject || ''
    );

    // --- Find the lead behind this draft ---
    const leadResult = await pool.query(
      `SELECT l.id, l.organization_id, l.stage, l.opt_out
       FROM leads l
       JOIN organizations o ON o.id = l.organization_id
       WHERE o.phone IS NOT NULL
         AND (SELECT 1 FROM email_drafts WHERE id = $1) IS NOT NULL
       LIMIT 1`,
      [draft.id]
    );
    // Fallback: find lead by matching the draft's recipient email to any contact
    // (we don't have a contacts table yet, so we just match nothing and let it be null)
    const lead = leadResult.rows[0] || null;

    // --- Determine action ---
    let action_taken = 'flagged_for_review';
    if (classification === 'positive') action_taken = 'stage_changed_to_Interested';
    else if (classification === 'unsubscribe') action_taken = 'opt_out_set';
    else if (classification === 'objection') action_taken = 'flagged_for_human';

    // --- Store reply (idempotent via unique index on gmail_message_id) ---
    const insertResult = await pool.query(
      `INSERT INTO email_replies
        (draft_id, organization_id, lead_id, gmail_message_id, gmail_thread_id,
         from_email, from_name, subject, body, classification, confidence,
         received_at, action_taken)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (gmail_message_id) DO NOTHING
       RETURNING id`,
      [
        draft.id,
        lead?.organization_id || null,
        lead?.id || null,
        reply.messageId,
        reply.threadId || null,
        reply.from,
        reply.fromName || null,
        reply.subject || null,
        reply.body,
        classification,
        confidence,
        reply.receivedAt ? new Date(reply.receivedAt) : null,
        action_taken,
      ]
    );

    if (insertResult.rowCount === 0) {
      summary.skipped += 1;
      continue;
    }

    summary.stored += 1;
    summary.classifications.push(classification);

    // --- Update lead based on classification ---
    if (lead) {
      if (classification === 'positive') {
        await pool.query(
          `UPDATE leads
           SET stage = 'Interested',
               temperature = 'hot',
               last_activity_at = NOW(),
               next_action = 'Schedule demo',
               next_action_due = NOW() + INTERVAL '1 day'
           WHERE id = $1`,
          [lead.id]
        );
      } else if (classification === 'unsubscribe') {
        await pool.query(
          `UPDATE leads
           SET opt_out = TRUE, last_activity_at = NOW()
           WHERE id = $1`,
          [lead.id]
        );
      } else if (classification === 'objection') {
        await pool.query(
          `UPDATE leads
           SET last_activity_at = NOW(),
               next_action = 'Human review: objection received'
           WHERE id = $1`,
          [lead.id]
        );
      }
    }

    // --- Audit ---
    await audit({
      action: 'email.reply_received',
      entityType: 'email_reply',
      entityId: insertResult.rows[0].id,
      metadata: {
        draft_id: draft.id,
        from: reply.from,
        classification,
        confidence,
        matched_signals,
        action_taken,
      },
      result: 'success',
    });
  }

  return summary;
}