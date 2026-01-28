from scanner_link import rule_based_scan
from cek_gemini import ai_scan_url

def analyze_url(url: str):
    rule_score, reasons = rule_based_scan(url)
    ai = ai_scan_url(url)

    ai_conf = ai.get("confidence", 0)
    ai_label = ai.get("status", "unknown")

    risk_score = (rule_score * 20) + (ai_conf * 60)

    if risk_score >= 80:
        status = "PHISHING"
    elif risk_score >= 50:
        status = "SUSPICIOUS"
    else:
        status = "SAFE"

    if ai_label == "phishing":
        reasons.append("AI detected phishing behavior")

    return {
        "url": url,
        "status": status,
        "risk_score": round(risk_score, 1),
        "confidence": round(risk_score / 100, 2),
        "reasons": reasons,
        "engine": {
            "rule_score": rule_score,
            "ai_label": ai_label
        }
    }
