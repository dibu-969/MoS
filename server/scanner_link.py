import re
from urllib.parse import urlparse

def rule_based_scan(url):
    score = 0
    reasons = []
    parsed = urlparse(url)

    # 1. IP address instead of domain
    if re.match(r"\d+\.\d+\.\d+\.\d+", parsed.netloc):
        score += 2
        reasons.append("URL uses IP address instead of domain")

    # 2. Suspicious keywords
    suspicious_words = [
        "login", "verify", "secure", "update",
        "account", "bank", "paypal"
    ]

    keyword_hits = 0
    for word in suspicious_words:
        if word in url.lower():
            score += 1
            keyword_hits += 1

    if keyword_hits >= 2:
        reasons.append("Multiple suspicious keywords detected")

    # 3. Excessive hyphens
    if url.count("-") >= 3:
        score += 1
        reasons.append("URL contains excessive hyphens")

    # 4. Too many subdomains
    if len(parsed.netloc.split(".")) > 4:
        score += 1
        reasons.append("Too many subdomains")

    return score, reasons
