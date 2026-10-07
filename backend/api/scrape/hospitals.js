// backend/api/scrape/hospitals.js
// POST /api/scrape/hospitals
// Body: { city, state, max_results? }
//
// Calls the Python scraper, stores results in Supabase.
// Dedup: phone (secondary) + place_id (primary). No ON CONFLICT — uses explicit SELECT.
import { pool } from '../../db/pool.js';
import { audit } from '../../services/audit.js';
import { discoverHospitals, scraperHealth } from '../../services/scraper-client.js';

const VALID_TYPES = ['hospital', 'clinic', 'diagnostic_center', 'multi_specialty', 'doctor'];

// Normalize an Indian phone number for dedup comparison.
// "+91 1800 102 7827" -> "18001027827"
function normalizePhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length < 10) return null;
  if (digits.startsWith('91') && digits.length === 12) {
    return digits.slice(2);
  }
  return digits.slice(-10);
}

// Scoring out of 60
function computeScore(h) {
  let score = 0;
  if (h.rating != null) score += Math.round(Number(h.rating) * 6);         // max 30
  if (h.review_count != null) {
    const rc = Number(h.review_count);
    if (rc >= 2000)      score += 20;
    else if (rc >= 500)  score += 15;
    else if (rc >= 100)  score += 10;
    else if (rc >= 20)   score += 5;
  }
  if (h.phone)   score += 5;
  if (h.website) score += 5;
  return Math.min(score, 60);
}

function temperatureFromScore(score) {
  return score >= 55 ? 'hot' : score >= 48 ? 'warm' : 'cool';
}

export async function scrapeHospitalsHandler(req, res) {
  const { city, state, max_results } = req.body || {};
  const actorId = req.user.id;

  if (!city || typeof city !== 'string' || city.trim().length < 2) {
    return res.status(400).json({ code: 'INVALID_CITY', message: 'city is required.' });
  }
  if (!state || typeof state !== 'string' || state.trim().length < 2) {
    return res.status(400).json({ code: 'INVALID_STATE', message: 'state is required.' });
  }

  const limit = Math.min(Math.max(Number(max_results) || 20, 1), 50);

  // Pre-flight scraper health
  const health = await scraperHealth();
  if (!health.ok) {
    return res.status(503).json({
      code: 'SCRAPER_UNAVAILABLE',
      message: 'Scraper service is not responding. Is python main.py running?',
      detail: health.error || `status ${health.status}`,
    });
  }

  let scraperResult;
  try {
    scraperResult = await discoverHospitals(city.trim(), state.trim(), limit);
  } catch (err) {
    console.error('[scrape] scraper error:', err);
    await audit({
      req, action: 'scrape.failed', entityType: 'scrape_run',
      metadata: { city, state, error: err.message.slice(0, 300) },
      result: 'failure',
    });
    return res.status(502).json({
      code: 'SCRAPER_ERROR',
      message: `Scraper failed: ${err.message}`,
    });
  }

  const hospitals = scraperResult?.hospitals || [];
  if (hospitals.length === 0) {
    return res.status(200).json({
      city, state, discovered: 0,
      created_orgs: 0, created_leads: 0, duplicates_skipped: 0, leads: [],
    });
  }

  const client = await pool.connect();
  const createdLeads = [];
  let createdOrgs = 0;
  let duplicatesSkipped = 0;

  try {
    await client.query('BEGIN');

    for (const h of hospitals) {
      const name = (h.name || '').trim();
      if (!name) continue;

      const type = VALID_TYPES.includes(h.type) ? h.type : 'hospital';
      const sourceId = h.place_id || null;
      const normalizedPhone = normalizePhone(h.phone);

      // ---- Step 1: find existing org ----
      let orgId = null;

      // 1a. Phone-based match (secondary dedup) — only among Google-sourced orgs
      if (normalizedPhone) {
        const phoneMatch = await client.query(
          `SELECT id FROM organizations
           WHERE source_id IS NOT NULL
             AND REGEXP_REPLACE(phone, '\\D', '', 'g') LIKE '%' || $1
           LIMIT 1`,
          [normalizedPhone]
        );
        if (phoneMatch.rowCount > 0) {
          orgId = phoneMatch.rows[0].id;
          duplicatesSkipped += 1;
        }
      }

      // 1b. Source-id match (primary dedup)
      if (!orgId && sourceId) {
        const srcMatch = await client.query(
          `SELECT id FROM organizations
           WHERE source = 'google_places' AND source_id = $1
           LIMIT 1`,
          [sourceId]
        );
        if (srcMatch.rowCount > 0) {
          orgId = srcMatch.rows[0].id;
          duplicatesSkipped += 1;
        }
      }

      // ---- Step 2: insert new org if no match ----
      if (!orgId) {
        const insert = await client.query(
          `INSERT INTO organizations
            (name, type, address, city, state, pincode, phone, website,
             email, email_source,
             source, source_id, source_url, rating, review_count, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
           RETURNING id`,
          [
            name, type,
            h.address || null,
            h.city || city.trim(),
            h.state || state.trim(),
            h.pincode || null,
            h.phone || null,
            h.website || null,
            h.email || null,
            h.email_source || null,
            sourceId ? 'google_places' : 'manual',
            sourceId,
            h.source_url || null,
            h.rating != null ? Number(h.rating) : null,
            h.review_count != null ? Number(h.review_count) : null,
            actorId,
          ]
        );

        if (insert.rowCount === 0 || !insert.rows[0]) {
          console.warn('[scrape] insert returned no rows for:', name);
          continue;
        }

        orgId = insert.rows[0].id;
        createdOrgs += 1;
      }

      // ---- Step 3: skip if a lead already exists for this org ----
      const existingLead = await client.query(
        'SELECT id FROM leads WHERE organization_id = $1 LIMIT 1',
        [orgId]
      );
      if (existingLead.rowCount > 0) {
        continue;
      }

      // ---- Step 4: create lead ----
      const score = computeScore(h);
      const temperature = temperatureFromScore(score);

      const leadResult = await client.query(
        `INSERT INTO leads
          (organization_id, stage, temperature, score, owner_id, next_action, next_action_due)
         VALUES ($1, 'New', $2, $3, $4, $5, NOW() + INTERVAL '2 days')
         RETURNING id, organization_id, stage, temperature, score`,
        [
          orgId,
          temperature,
          score,
          actorId,
          h.phone ? 'Call the hospital' : 'Send intro email',
        ]
      );

      createdLeads.push({
        ...leadResult.rows[0],
        org_name: name,
        phone: h.phone,
        website: h.website,
        city: h.city || city.trim(),
      });
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[scrape/hospitals] DB error:', err);
    return res.status(500).json({
      code: 'DATABASE_ERROR',
      message: 'Failed to store hospitals.',
      detail: err.message,
    });
  } finally {
    client.release();
  }

  await audit({
    req, action: 'scrape.completed', entityType: 'scrape_run',
    metadata: {
      city, state,
      discovered: hospitals.length,
      created_orgs: createdOrgs,
      created_leads: createdLeads.length,
      duplicates_skipped: duplicatesSkipped,
    },
    result: 'success',
  });

  return res.status(200).json({
    city, state,
    discovered: hospitals.length,
    created_orgs: createdOrgs,
    created_leads: createdLeads.length,
    duplicates_skipped: duplicatesSkipped,
    leads: createdLeads,
  });
}