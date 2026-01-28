import re
from urllib.parse import urlparse

def extract_features(url: str) -> dict:
    parsed = urlparse(url)

    return {
        "length": len(url),
        "has_ip": bool(re.match(r"\d+\.\d+\.\d+\.\d+", parsed.netloc)),
        "has_https": parsed.scheme == "https",
        "has_at_symbol": "@" in url,
        "suspicious_keywords": sum(
            kw in url.lower()
            for kw in ["login", "verify", "secure", "account", "update"]
        ),
        "subdomain_count": parsed.netloc.count("."),
    }
