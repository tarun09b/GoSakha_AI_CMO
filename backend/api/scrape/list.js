// backend/api/scrape/list.js
// GET /api/leads?temperature=&stage=&limit=
// Returns leads with their organization details joined.
import { pool } from '../../db/pool.js';

export async function listLeadsHandler(req, res) {
  const { temperature, stage } = req.query;
  const limit = Math.min(Number(req.query.limit) || 50, 200);

  const filters = [];
  const params = [];

  if (temperature) {
    if (!['hot', 'warm', 'cool'].includes(temperature)) {
      return res.status(400).json({ code: 'INVALID_TEMPERATURE' });
    }
    params.push(temperature);
    filters.push(`l.temperature = $${params.length}`);
  }
  if (stage) {
    params.push(stage);
    filters.push(`l.stage = $${params.length}`);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  params.push(limit);

  try {
    const result = await pool.query(
      `SELECT
         l.id, l.stage, l.temperature, l.score, l.opt_out,
         l.next_action, l.next_action_due, l.last_activity_at,
         o.id AS org_id, o.name AS org_name, o.type AS org_type,
         o.address, o.city, o.state, o.phone, o.website,
         o.email AS org_email, o.email_source,
         o.last_emailed_at,
         o.rating, o.review_count, o.source, o.source_id
       FROM leads l
       JOIN organizations o ON o.id = l.organization_id
       ${where}
       ORDER BY
         CASE l.temperature WHEN 'hot' THEN 1 WHEN 'warm' THEN 2 ELSE 3 END,
         l.score DESC,
         l.created_at DESC
       LIMIT $${params.length}`,
      params
    );

    return res.status(200).json({
      leads: result.rows,
      total: result.rowCount,
    });
  } catch (err) {
    console.error('[leads/list] error:', err.message);
    return res.status(500).json({ code: 'SERVER_ERROR', message: 'Could not list leads.' });
  }
}