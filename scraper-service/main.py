"""
GoSakha Scraper Service
FastAPI wrapper around Overpass (discovery) + ScrapeGraphAI (enrichment).
"""
import os
import json
import time
import re
from typing import Optional
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser


import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from concurrent.futures import ThreadPoolExecutor, as_completed
from email_extractor import extract_email_from_site

load_dotenv()

# --- Config ---
SGAI_API_KEY = os.getenv("SGAI_API_KEY")
PORT = int(os.getenv("SCRAPER_PORT", "5001"))
MAX_RESULTS = int(os.getenv("SCRAPER_MAX_RESULTS", "50"))
REQUEST_DELAY = int(os.getenv("SCRAPER_REQUEST_DELAY_MS", "2000")) / 1000
USER_AGENT = "GoSakhaCMO/1.0 (+https://gosakha.com; contact@gosakha.com)"

# --- FastAPI app ---
app = FastAPI(title="GoSakha Scraper Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4000", "http://127.0.0.1:4000"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# --- Request / Response models ---
class ScrapeRequest(BaseModel):
    city: str = Field(..., min_length=2, max_length=100)
    state: str = Field(..., min_length=2, max_length=100)
    max_results: int = Field(default=20, ge=1, le=100)

class Hospital(BaseModel):
    name: str
    type: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    specialties: list[str] = []
    doctors: list[dict] = []
    about: Optional[str] = None
    source: str = "overpass+scrapegraphai"
    enriched: bool = False

class ScrapeResponse(BaseModel):
    city: str
    state: str
    discovered: int
    enriched: int
    hospitals: list[Hospital]
    elapsed_ms: int

# --- Overpass discovery ---
OVERPASS_ENDPOINTS = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass-api.de/api/interpreter",
]

OVERPASS_HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "application/json",
    "Content-Type": "text/plain",
}

def discover_hospitals(city: str, state: str, limit: int) -> list[dict]:
    """Query Google Places API (New) for hospitals in a city.
    NOTE: The Python SDK does not support pagination.
    A single call returns up to 20 results."""
    api_key = os.getenv("GOOGLE_PLACES_API_KEY")
    if not api_key:
        print("[discover] GOOGLE_PLACES_API_KEY not set in .env")
        return []

    try:
        from google.maps import places_v1
    except ImportError:
        print("[discover] google-maps-places not installed. Run: pip install google-maps-places")
        return []

    client = places_v1.PlacesClient(client_options={"api_key": api_key})

    # Fields to request
    field_mask = ",".join([
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.internationalPhoneNumber",
        "places.websiteUri",
        "places.rating",
        "places.userRatingCount",
        "places.addressComponents",
    ])

    query_text = f"multi-specialty hospital in {city}, {state}, India"
    print(f"[discover] Google Places query: {query_text}")

    try:
        request = places_v1.SearchTextRequest(
            text_query=query_text,
            language_code="en",
            region_code="IN",
            max_result_count=20,   # SDK max is 20, no pagination
        )
        response = client.search_text(
            request=request,
            metadata=[("x-goog-fieldmask", field_mask)],
        )
        places = list(response.places or [])
        print(f"[discover] Got {len(places)} results (SDK max 20, no pagination)")
    except Exception as e:
        print(f"[discover] Google Places error: {e}")
        return []

     # Convert Google Places results to a flat dict (simpler for Node)
    elements = []
    for p in places:
        tags = {}

        # Google Places place_id — the dedup key
        if hasattr(p, "id") and p.id:
            tags["place_id"] = p.id

        if hasattr(p, "display_name") and p.display_name:
            tags["name"] = p.display_name.text

        if hasattr(p, "formatted_address") and p.formatted_address:
            tags["address"] = p.formatted_address

        if hasattr(p, "international_phone_number") and p.international_phone_number:
            tags["phone"] = p.international_phone_number

        if hasattr(p, "website_uri") and p.website_uri:
            tags["website"] = p.website_uri

        # Extract city / state / pincode from address_components
        if hasattr(p, "address_components") and p.address_components:
            for comp in p.address_components:
                types = list(comp.types) if comp.types else []
                if "locality" in types:
                    tags["city"] = comp.long_text
                elif "administrative_area_level_1" in types:
                    tags["state"] = comp.long_text
                elif "postal_code" in types:
                    tags["pincode"] = comp.long_text

        if hasattr(p, "rating") and p.rating:
            tags["rating"] = str(p.rating)
        if hasattr(p, "user_rating_count") and p.user_rating_count:
            tags["review_count"] = str(p.user_rating_count)

        elements.append({"tags": tags})

    print(f"[discover] total: {len(elements)} hospitals")
    return elements

# --- Robots.txt ---
def can_fetch(url: str) -> bool:
    try:
        parsed = urlparse(url)
        rp = RobotFileParser()
        rp.set_url(f"{parsed.scheme}://{parsed.netloc}/robots.txt")
        rp.read()
        return rp.can_fetch(USER_AGENT, url)
    except Exception:
        return True

# --- Fetch + clean page ---
def fetch_clean_text(url: str) -> Optional[str]:
    if not can_fetch(url):
        return None
    try:
        r = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=15)
        if r.status_code != 200:
            return None
        soup = BeautifulSoup(r.text, "lxml")
        for tag in soup(["script", "style", "nav", "footer", "noscript", "iframe"]):
            tag.decompose()
        text = soup.get_text(separator="\n", strip=True)
        text = re.sub(r"\n{3,}", "\n\n", text)
        text = re.sub(r"[ \t]+", " ", text)
        return text[:12000]
    except Exception:
        return None

# --- ScrapeGraphAI extract ---
def extract_with_sgai(url: str) -> Optional[dict]:
    if not SGAI_API_KEY:
        return None
    try:
        from scrapegraph_py import ScrapeGraphAI
        sgai = ScrapeGraphAI(api_key=SGAI_API_KEY)
        prompt = """Extract hospital info. Return JSON with:
name, type (hospital|clinic|diagnostic_center|multi_specialty|doctor),
address, city, state, phone, email, website,
specialties (array), doctors (array of {name,role}), about (1-2 sentences).
Use null for missing. Do NOT invent data."""
        result = sgai.extract(prompt, url=url)
        if result.status != "success":
            return None
        data = result.data
        if hasattr(data, "json_data"):
            return data.json_data
        if hasattr(data, "model_dump"):
            return data.model_dump().get("json_data", data.model_dump())
        return data
    except Exception as e:
        print(f"[extract] error: {e}")
        return None

# --- Endpoints ---
@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "gosakha-scraper",
        "sgai_configured": bool(SGAI_API_KEY),
    }

@app.post("/scrape/hospitals", response_model=ScrapeResponse)
def scrape_hospitals(req: ScrapeRequest):
    start = time.time()
    limit = min(req.max_results, MAX_RESULTS)

    # 1. Discover via Overpass (free)
    elements = discover_hospitals(req.city, req.state, limit)
    if not elements:
        raise HTTPException(status_code=502, detail="Overpass discovery failed. Try again later.")

    # 2. Build base hospital records
    hospitals: list[Hospital] = []
    for el in elements:
        tags = el.get("tags", {})
        name = tags.get("name")
        if not name:
            continue
        hospitals.append(Hospital(
            name=name,
            type="multi_specialty" if tags.get("healthcare:speciality") else "hospital",
            address=", ".join(filter(None, [
                tags.get("addr:housenumber", ""),
                tags.get("addr:street", ""),
            ])) or None,
            city=tags.get("addr:city") or req.city,
            state=tags.get("addr:state") or req.state,
            phone=tags.get("phone") or tags.get("contact:phone"),
            email=tags.get("email") or tags.get("contact:email"),
            website=tags.get("website") or tags.get("contact:website"),
            enriched=False,
        ))

    # 3. Enrich via ScrapeGraphAI (only hospitals with websites)
    enriched_count = 0
    for h in hospitals:
        if not h.website:
            continue
        if not SGAI_API_KEY:
            break
        data = extract_with_sgai(h.website)
        if data:
            h.phone = data.get("phone") or h.phone
            h.email = data.get("email") or h.email
            h.address = data.get("address") or h.address
            h.city = data.get("city") or h.city
            h.state = data.get("state") or h.state
            h.type = data.get("type") or h.type
            h.specialties = data.get("specialties") or []
            h.doctors = data.get("doctors") or []
            h.about = data.get("about")

            h.enriched = True
            enriched_count += 1
        time.sleep(REQUEST_DELAY)

    elapsed = int((time.time() - start) * 1000)
    return ScrapeResponse(
        city=req.city,
        state=req.state,
        discovered=len(hospitals),
        enriched=enriched_count,
        hospitals=hospitals,
        elapsed_ms=elapsed,
    )

def enrich_emails_parallel(hospitals: list[dict], max_workers: int = 8) -> None:
    """Fetch each hospital's website to extract contact emails. Mutates in place.
    Runs in parallel with a short timeout; never raises."""
    to_fetch = [h for h in hospitals if h.get("website") and not h.get("email")]
    if not to_fetch:
        return

    print(f"[emails] extracting from {len(to_fetch)} websites...")

    def _task(h):
        try:
            return (h["website"], extract_email_from_site(h["website"]))
        except Exception as e:
            print(f"[emails] {h['website']} failed: {e}")
            return (h["website"], None)

    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = {pool.submit(_task, h): h for h in to_fetch}
        for fut in as_completed(futures):
            website, email = fut.result()
            if email:
                for h in to_fetch:
                    if h["website"] == website:
                        h["email"] = email
                        h["email_source"] = "scraped"
                        break

    found = sum(1 for h in hospitals if h.get("email"))
    print(f"[emails] found {found}/{len(to_fetch)} emails")
    
@app.post("/scrape/discover-only")
def discover_only(req: ScrapeRequest):
    """Discovery only — no enrichment, no ScrapeGraphAI credits.
    Returns full fields for storing in Supabase.
    Also fetches each hospital's website in parallel to extract contact emails."""
    start = time.time()
    limit = min(req.max_results, MAX_RESULTS)
    elements = discover_hospitals(req.city, req.state, limit)

    hospitals = []
    for el in elements:
        tags = el.get("tags", {})
        name = tags.get("name")
        if not name:
            continue

        # Clean up SEO junk from Google Places names
        # e.g. "Skanda Hospitals - Best Hospital in Hyderabad" -> "Skanda Hospitals"
        import re as _re
        # Only split when there is whitespace around the separator:
        #   "Skanda Hospitals - Best in Hyderabad" -> "Skanda Hospitals"  ✅
        #   "Star Multi-Speciality Hospitals"       -> unchanged           ✅
        clean_name = _re.split(r"\s+[-|]\s+|\s+[|]\s+", name)[0].strip() or name

        hospitals.append({
            "name": clean_name,
            "place_id": tags.get("place_id"),
            "type": "multi_specialty",           # Google doesn't return this reliably
            "address": tags.get("address"),
            "city": tags.get("city") or req.city,
            "state": tags.get("state") or req.state,
            "pincode": tags.get("pincode"),
            "phone": tags.get("phone"),
            "email": tags.get("email"),
            "email_source": None,                # filled by enrich_emails_parallel
            "website": tags.get("website"),
            "rating": float(tags["rating"]) if tags.get("rating") else None,
            "review_count": int(tags["review_count"]) if tags.get("review_count") else None,
            "source": "google_places",
            "source_url": f"https://www.google.com/maps/place/?q=place_id:{tags.get('place_id')}" if tags.get("place_id") else None,
        })

    # Enrich with contact emails from each hospital's website
    enrich_emails_parallel(hospitals)

    return {
        "discovered": len(hospitals),
        "hospitals": hospitals,
        "elapsed_ms": int((time.time() - start) * 1000),
    }



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)

