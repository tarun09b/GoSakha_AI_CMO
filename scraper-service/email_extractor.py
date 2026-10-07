"""
email_extractor.py
Extract contact emails from hospital websites.

Strategy:
1. Fetch homepage — look for mailto: links and email patterns
2. Try common contact page paths (/contact, /contact-us, etc.)
3. Return the best email found, or None

Runs with short timeouts and never raises — always returns a string or None.
"""
import re
import logging
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

USER_AGENT = "GoSakhaCMO/1.0 (+https://gosakha.com; contact@gosakha.com)"
TIMEOUT = 8  # seconds per page

# Common contact page paths to try if homepage has no email
CONTACT_PATHS = [
    "/contact", "/contact-us", "/contactus", "/about",
    "/about-us", "/reach-us", "/get-in-touch", "/enquiry",
]

# Generic/role emails that are actually useful for outreach
PREFERRED_LOCAL_PARTS = [
    "info", "contact", "hello", "care", "appointments",
    "reception", "frontdesk", "front.desk", "admin", "enquiry",
    "enquiries", "help", "support", "hospital", "health",
    "hello", "office", "connect", "reach",
]

# Emails we should never return — they're automated or useless
BLACKLISTED_LOCAL_PARTS = [
    "noreply", "no-reply", "donotreply", "do-not-reply",
    "postmaster", "webmaster", "abuse", "sentry", "example",
    "test", "demo", "admin@example", "user@example",
]

# Regex for extracting emails from text
EMAIL_RE = re.compile(
    r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}",
    re.IGNORECASE,
)

# Common file extensions that look like emails but aren't
JUNK_EXTENSIONS = (".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg",
                   ".css", ".js", ".ico", ".mp4", ".pdf")


def _is_valid_email(email: str) -> bool:
    """Reject junk, blacklisted, or too-short emails."""
    if not email or len(email) < 6 or len(email) > 100:
        return False

    email = email.lower().strip()

    # Junk file extensions
    if any(email.endswith(ext) for ext in JUNK_EXTENSIONS):
        return False

    # Must have exactly one @
    if email.count("@") != 1:
        return False

    local, domain = email.split("@")

    # Domain must have a dot and be reasonable length
    if "." not in domain or len(domain) < 4:
        return False

    # Local part must not be empty
    if not local or len(local) < 2:
        return False

    # Blacklisted
    for bad in BLACKLISTED_LOCAL_PARTS:
        if bad in local:
            return False

    # Domain must not be a CDN or tracker
    if any(x in domain for x in ["cloudflare", "googleapis", "gstatic", "sentry"]):
        return False

    return True


def _score_email(email: str) -> int:
    """Higher score = better email for outreach."""
    local = email.split("@")[0].lower()

    # Preferred role-based emails get bonus
    for i, pref in enumerate(PREFERRED_LOCAL_PARTS):
        if local == pref:
            return 1000 - i * 10  # earlier in list = higher priority
        if local.startswith(pref):
            return 500 - i * 5

    # Personal-looking emails (e.g. "john.doe@") get medium score
    if "." in local or "_" in local:
        return 200

    return 100


def _extract_from_html(html: str, base_url: str) -> list[str]:
    """Extract all candidate emails from a page."""
    found = set()

    # 1. mailto: links — highest confidence
    try:
        soup = BeautifulSoup(html, "lxml")
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if href.lower().startswith("mailto:"):
                email = href[7:].split("?")[0].strip()
                if _is_valid_email(email):
                    found.add(email.lower())
    except Exception as e:
        logger.debug(f"mailto parse failed: {e}")

    # 2. Regex over visible text
    try:
        for m in EMAIL_RE.findall(html):
            if _is_valid_email(m):
                found.add(m.lower())
    except Exception:
        pass

    return list(found)


def extract_email_from_site(website_url: str) -> str | None:
    """
    Main entry point. Given a hospital website URL, return the best email
    or None. Never raises.
    """
    if not website_url or not website_url.startswith(("http://", "https://")):
        return None

    # Normalize URL
    try:
        parsed = urlparse(website_url)
        base = f"{parsed.scheme}://{parsed.netloc}"
    except Exception:
        return None

    headers = {"User-Agent": USER_AGENT}
    all_candidates: list[str] = []

    # 1. Try homepage
    try:
        r = requests.get(website_url, headers=headers, timeout=TIMEOUT, allow_redirects=True)
        if r.status_code == 200:
            candidates = _extract_from_html(r.text, website_url)
            all_candidates.extend(candidates)
    except Exception as e:
        logger.debug(f"homepage fetch failed for {website_url}: {e}")

    # 2. If no preferred email yet, try contact pages
    if not any(_score_email(e) >= 500 for e in all_candidates):
        for path in CONTACT_PATHS:
            try:
                url = urljoin(base, path)
                r = requests.get(url, headers=headers, timeout=TIMEOUT, allow_redirects=True)
                if r.status_code == 200:
                    candidates = _extract_from_html(r.text, url)
                    all_candidates.extend(candidates)
                    # Stop at first good hit
                    if any(_score_email(e) >= 500 for e in all_candidates):
                        break
            except Exception:
                continue

    if not all_candidates:
        return None

    # 3. Deduplicate and pick the best
    unique = list(set(all_candidates))
    unique.sort(key=_score_email, reverse=True)
    return unique[0]