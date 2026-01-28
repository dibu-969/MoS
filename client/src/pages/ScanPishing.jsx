import { useState } from "react";
import axios from "axios";

const ScanPhishingPage = ({ token }) => {
    const [url, setUrl] = useState("");
    const [scanning, setScanning] = useState(false);
    const [results, setResults] = useState([]);

    const startScan = async () => {
        if (!url) return alert("Masukkan URL terlebih dahulu");

        setScanning(true);
        setResults([]);

        try {
            const res = await axios.post(
                "http://localhost:8000/scan-url",
                { url },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setResults([{
                link: url,
                status: res.data.status,
                confidence: res.data.confidence,
                reasons: res.data.reasons
            }]);

        } catch (err) {
            alert("Scan gagal");
            console.error(err);
        } finally {
            setScanning(false);
        }
    };

    return (
        <div>
            <h2>Scan Phishing URL</h2>
            <input 
                type="text"
                placeholder="Masukkan URL"
                value={url}
                onChange={e => setUrl(e.target.value)}
            />
            <button onClick={startScan} disabled={scanning}>
                {scanning ? "🔍 Scanning..." : "Start Scan"}
            </button>

            {results.length > 0 && (
                <div style={{ marginTop: 20 }}>
                    <h3>Hasil Scan</h3>
                    {results.map((r, idx) => (
                        <div key={idx} style={{ border: "1px solid #ccc", padding: 10, marginBottom: 10 }}>
                            <p><b>URL:</b> {r.link}</p>
                            <p><b>Status:</b> {r.status}</p>
                            <p><b>Confidence:</b> {r.confidence}%</p>
                            <p><b>Reasons:</b></p>
                            <ul>
                                {r.reasons.map((reason, i) => <li key={i}>{reason}</li>)}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ScanPhishingPage;
