import os
import json
import time
import re
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser
import requests
from bs4 import BeautifulSoup
import anthropic
from dotenv import load_dotenv

load_dotenv()

# --- Config ---
ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY")
USER_AGENT = "GoSakhaCMO/1.0 (+https://gosakha.com; contact@gosakha.com)"
REQUEST_DELAY = 2  # seconds between requests
MAX_TEXT_CHARS = 12000  # Claude Haiku sweet spot

if not ANTHROPIC_KEY:
    print("ERROR: ANTHROPIC_API_KEY not set")
    exit(1)

client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)

# --- Robots.txt check (ethical scraping) ---
def can_fetch(url: str, user_agent: str) -> bool:
    """Check robots.txt before scraping. Returns True if allowed."""
    try:
        parsed = urlparse(url)
        robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
        rp = RobotFileParser()
        rp.set_url(robots_url)
        rp.read()
        return rp.can_fetch(user_agent, url)
    except Exception:
        # If robots.txt doesn't exist or errors, assume allowed
        return True

# --- Fetch + clean HTML ---
def fetch_clean_text(url: str) -> str | None:
    """Fetch URL, check robots.txt, return cleaned text."""
    if not can_fetch(url, USER_AGENT):
        print(f"  ⛔ Blocked by robots.txt: {url}")
        return None

    try:
        r = requests.get(
            url,
            headers={"User-Agent": USER_AGENT},
            timeout=15,
        )
        if r.status_code != 200:
            print(f"  ❌ HTTP {r.status_code}")
            return None

        soup = BeautifulSoup(r.text, "lxml")
        for tag in soup(["script", "style", "nav", "footer", "noscript", "iframe"]):
            tag.decompose()

        text = soup.get_text(separator="\n", strip=True)
        # Collapse whitespace
        text = re.sub(r"\n{3,}", "\n\n", text)
        text = re.sub(r"[ \t]+", " ", text)
        return text[:MAX_TEXT_CHARS]
    except Exception as e:
        print(f"  ❌ Fetch error: {e}")
        return None

# --- Claude structured extraction ---
EXTRACTION_PROMPT = """Extract hospital information from the text below.

Return ONLY a valid JSON object with these exact fields:
{
  "name": "official hospital name",
  "type": "hospital" | "clinic" | "diagnostic_center" | "multi_specialty" | "doctor",
  "address": "full street address or null",
  "city": "city name or null",
  "state": "state name or null",
  "phone": "primary phone or null",
  "email": "any listed email or null",
  "website": "official website or null",
  "specialties": ["list", "of", "specialties"],
  "doctors": [{"name": "...", "role": "..."}],
  "about": "1-2 sentence description"
}

Rules:
- Use null for fields not present. Do NOT invent data.
- Phone numbers: include country code if present.
- Only include doctors explicitly named in the text.
- Return ONLY the JSON. No markdown fences, no explanation.

Text to extract from:
"""

def extract_with_claude(text: str) -> dict | None:
    """Send text to Claude, get structured JSON."""
    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20241022",
            max_tokens=2048,
            messages=[{
                "role": "user",
                "content": EXTRACTION_PROMPT + text,
            }],
        )
        raw = response.content[0].text.strip()
        # Strip markdown fences if present
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        return json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"  ❌ JSON parse error: {e}")
        print(f"  Raw response: {raw[:200]}")
        return None
    except Exception as e:
        print(f"  ❌ Claude error: {e}")
        return None

# --- Main pipeline ---
def enrich_hospitals(input_file="osm_hospitals.json", output_file="enriched_hospitals.json"):
    with open(input_file, encoding="utf-8") as f:
        elements = json.load(f)

    results = []
    for i, el in enumerate(elements, 1):
        tags = el.get("tags", {})
        name = tags.get("name")
        website = tags.get("website") or tags.get("contact:website")

        if not name:
            continue

        print(f"\n[{i}/{len(elements)}] {name}")

        if not website:
            print("  ⏭️  No website — skipping")
            results.append({"name": name, "source": "osm_only", "data": tags})
            continue

        print(f"  🌐 {website}")
        text = fetch_clean_text(website)
        if not text:
            results.append({"name": name, "website": website, "source": "fetch_failed"})
            continue

        print(f"  📄 Extracted {len(text)} chars, sending to Claude...")
        data = extract_with_claude(text)
        if data:
            print(f"  ✅ {data.get('name', '?')} — {len(data.get('specialties', []))} specialties")
            results.append({"name": name, "website": website, "source": "claude", "data": data})
        else:
            results.append({"name": name, "website": website, "source": "claude_failed"})

        time.sleep(REQUEST_DELAY)  # Polite delay

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"\n✅ Saved {len(results)} results to {output_file}")

if __name__ == "__main__":
    enrich_hospitals()