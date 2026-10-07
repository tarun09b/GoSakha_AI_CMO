// backend/services/scraper-client.js
// Thin HTTP client for the Python scraper service on port 5001.

const SCRAPER_URL = process.env.SCRAPER_URL || 'http://localhost:5001';
const TIMEOUT_MS = Number(process.env.SCRAPER_TIMEOUT_MS || 90000);

/**
 * Discover hospitals in a city via the Python scraper service.
 * Returns the parsed JSON response body.
 *
 * @param {string} city
 * @param {string} state
 * @param {number} maxResults
 */
export async function discoverHospitals(city, state, maxResults = 20) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${SCRAPER_URL}/scrape/discover-only`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city,
        state,
        max_results: maxResults,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Scraper responded ${res.status}: ${body.slice(0, 300)}`);
    }

    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Scraper timed out after ${TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Health check for the scraper service.
 */
export async function scraperHealth() {
  try {
    const res = await fetch(`${SCRAPER_URL}/health`, { method: 'GET' });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, data: await res.json() };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}