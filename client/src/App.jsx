import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Shield, Activity, Cpu, Lock, Zap, AlertTriangle, LayoutDashboard, Eye, X, Lightbulb, CheckCircle, AlertOctagon, Folder } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import axios from 'axios';


// --- CONFIG & SETUP ---
ChartJS.register(ArcElement, Tooltip, Legend);

// --- 1. SIDEBAR ---
const Sidebar = ({ handleLogout }) => {
    const [open, setOpen] = useState(false);
    const navClass = (isActive) => `flex items-center gap-3 px-4 py-3 rounded-lg transition w-full ${isActive ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`;
    const menuItems = [
        { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
        { to: '/ai-agent', icon: <Zap size={20} />, label: 'AI Agent' },
        { to: '/scan-phishing', icon: <AlertTriangle size={20} />, label: 'Scan Phishing' },
        { to: '/settings', icon: <Shield size={20} />, label: 'Settings' },
    ];
    return (
        <>
            <div className="md:hidden fixed top-4 left-4 z-50"><button onClick={() => setOpen(true)} className="p-2 bg-slate-800 border border-slate-700 rounded text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg></button></div>
            <aside className="w-64 bg-slate-800 border-r border-slate-700 p-6 hidden md:flex flex-col fixed h-full">
                <h2 className="text-2xl font-bold mb-10 tracking-widest">MoS<span className="text-blue-500">.</span></h2>
                <nav className="space-y-2 flex-1">{menuItems.map((m) => (<NavLink key={m.to} to={m.to} className={({ isActive }) => navClass(isActive)}>{m.icon} <span className="font-medium">{m.label}</span></NavLink>))}</nav>
                <div className="pt-6 border-t border-slate-700"><button onClick={handleLogout} className="w-full py-2 border border-red-500/50 text-red-400 rounded hover:bg-red-500/10 transition text-sm">Logout Agent</button></div>
            </aside>
            {open && (<><div className="fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} /><div className="fixed top-0 left-0 z-50 w-72 h-full bg-slate-900 border-r border-slate-700 p-6 shadow-lg"><div className="flex items-center justify-between mb-6"><h2 className="text-xl font-bold tracking-widest">MoS<span className="text-blue-500">.</span></h2><button onClick={() => setOpen(false)} className="p-2 rounded bg-slate-800 border border-slate-700 text-white">Close</button></div><nav className="flex flex-col gap-2">{menuItems.map((m) => (<NavLink key={m.to} to={m.to} onClick={() => setOpen(false)} className={({ isActive }) => navClass(isActive)}>{m.icon} <span className="font-medium">{m.label}</span></NavLink>))}</nav><div className="pt-6 border-t border-slate-700 mt-6"><button onClick={() => { setOpen(false); handleLogout(); }} className="w-full py-2 border border-red-500/50 text-red-400 rounded hover:bg-red-500/10 transition text-sm">Logout Agent</button></div></div></>)}
        </>
    );
};

// --- 2. DASHBOARD HOME ---
const DashboardHome = ({ token }) => {
    const [stats, setStats] = useState(null);
    const [selectedThreat, setSelectedThreat] = useState(null);
    const [isQuarantining, setIsQuarantining] = useState(false);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await axios.get('http://localhost:8000/dashboard/stats', { headers: { Authorization: `Bearer ${token}` } });
                setStats(res.data);
            } catch (err) { console.error(err); }
        };
        const interval = setInterval(fetchStats, 5000); 
        fetchStats(); return () => clearInterval(interval);
    }, [token]);

    const handleQuarantine = async () => {
        if (!selectedThreat) return;
        setIsQuarantining(true);
        try {
            await axios.post('http://localhost:8000/quarantine', 
                { filename: selectedThreat.file },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert(`SUCCESS: ${selectedThreat.file} has been moved to Quarantine Vault.`);
            setSelectedThreat(null); 
        } catch (err) {
            console.error(err);
            alert("QUARANTINE FAILED: " + (err.response?.data?.detail || "Check console/logs"));
        } finally {
            setIsQuarantining(false);
        }
    };

    if (!stats) return <div className="ml-0 md:ml-64 p-10 text-white flex items-center justify-center min-h-screen"><div className="animate-pulse">Connecting to Neural Engine...</div></div>;

    const chartData = {
        labels: stats.top_apps ? stats.top_apps.map(app => app.name) : [],
        datasets: [{ label: '% Memory', data: stats.top_apps ? stats.top_apps.map(app => app.memory) : [], backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'], borderColor: '#1e293b', borderWidth: 2 }],
    };

    return (
        <div className="ml-0 md:ml-64 p-8 text-white min-h-screen relative">
            {/* MODAL POPUP - DITAMBAHKAN LOKASI */}
            {selectedThreat && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-red-500/50 rounded-xl shadow-[0_0_50px_rgba(220,38,38,0.3)] w-full max-w-2xl overflow-hidden transform transition-all scale-100">
                        <div className="bg-red-900/20 p-4 border-b border-red-500/30 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-red-400 flex items-center gap-2"><AlertTriangle /> THREAT INTELLIGENCE</h3>
                            <button onClick={() => setSelectedThreat(null)} className="p-1 hover:bg-red-500/20 rounded transition text-slate-400 hover:text-white"><X size={24} /></button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20 text-center min-w-[100px]">
                                    <div className="text-3xl font-bold text-red-500">{selectedThreat.confidence || 0}%</div>
                                    <div className="text-[10px] uppercase text-red-400 tracking-wider mt-1">Confidence</div>
                                </div>
                                <div className="overflow-hidden">
                                    <h4 className="text-2xl font-bold text-white mb-1 truncate" title={selectedThreat.file}>{selectedThreat.file}</h4>
                                    {/* TAMBAHAN: Lokasi Path di Modal */}
                                    <div className="flex items-center gap-2 text-xs text-blue-400 font-mono mb-2 bg-blue-500/5 p-2 rounded border border-blue-500/10 break-all">
                                        <Folder size={12} className="shrink-0" /> {selectedThreat.location || "Path unknown"}
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded border border-slate-700">Detected by: {selectedThreat.model}</span>
                                        <span className={`text-xs px-2 py-1 rounded border animate-pulse ${selectedThreat.status === "HIGH" ? "bg-red-900/50 text-red-400 border-red-500/30" : "bg-orange-900/50 text-orange-400 border-orange-500/30"}`}>{selectedThreat.status} Severity</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-black/40 p-4 rounded-lg border border-slate-700 font-mono text-sm text-slate-300">
                                <p className="text-blue-400 mb-2 font-bold border-b border-slate-700 pb-1"> AI ANALYSIS REPORT:</p>
                                <p className="leading-relaxed whitespace-pre-wrap">{selectedThreat.reason || "No detailed reasoning provided by AI."}</p>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-3">
                            <button onClick={() => setSelectedThreat(null)} className="px-4 py-2 rounded text-slate-400 hover:bg-slate-800 transition text-sm">Close</button>
                            <button 
                                onClick={handleQuarantine} 
                                disabled={isQuarantining}
                                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-bold shadow-lg shadow-red-900/20 text-sm flex items-center gap-2 disabled:opacity-50"
                            >
                                <Shield size={16}/> {isQuarantining ? "Securing..." : "Quarantine File"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <header className="mb-8 flex justify-between items-end">
                <div><h1 className="text-3xl font-bold">System Analytics</h1><p className="text-slate-400">Real-time resource monitoring & AI advice.</p></div>
                <div className="text-right"><p className="text-xs text-slate-500 uppercase">Last Updated</p><p className="font-mono text-blue-400">LIVE</p></div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard icon={<Cpu />} title="CPU Load" value={`${stats.cpu_usage}%`} color={stats.cpu_usage > 80 ? "red" : "blue"} />
                    <StatCard icon={<Activity />} title="RAM Usage" value={`${stats.ram_usage}%`} color={stats.ram_usage > 85 ? "red" : "purple"} />
                    <StatCard icon={<Zap />} title="Disk Usage" value={`${stats.disk_usage}%`} color={stats.disk_usage > 90 ? "red" : "orange"} />
                    <div className="md:col-span-3 bg-slate-800 rounded-xl border border-slate-700 p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5"><Lightbulb size={120} /></div>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Lightbulb className="text-yellow-400" size={20}/> AI Performance Advisor</h3>
                        {stats.ai_advice && stats.ai_advice.advice ? (
                            <div className="space-y-3">
                                {stats.ai_advice.advice.map((tip, idx) => (
                                    <div key={idx} className="flex items-start gap-3 text-slate-300 text-sm bg-slate-900/50 p-3 rounded border border-slate-700/50"><CheckCircle size={16} className="mt-0.5 text-emerald-500 shrink-0"/><span>{tip}</span></div>
                                ))}
                            </div>
                        ) : <p className="text-slate-500 italic">Gathering data...</p>}
                    </div>
                </div>
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 flex flex-col items-center justify-center">
                    <h3 className="text-lg font-bold text-white mb-6 w-full text-left flex items-center gap-2"><Activity className="text-blue-400" size={18}/> Top RAM Consumers</h3>
                    <div className="w-full max-w-[250px]"><Doughnut data={chartData} options={{ plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: {size: 10} } } }, cutout: '70%', borderWidth: 0 }} /></div>
                </div>
            </div>

            <div className="lg:col-span-3 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden mb-8 shadow-lg">
                <div className="p-4 bg-slate-900 border-b border-slate-700 flex justify-between items-center"><h3 className="font-bold text-white flex items-center gap-2"><Activity className="text-blue-400" /> Live Scanner Feed</h3><span className="text-xs font-mono text-slate-500 animate-pulse">MONITORING ACTIVE</span></div>
                <div className="p-0 overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-900/50 text-xs uppercase font-bold text-slate-500">
                            <tr><th className="px-6 py-3">Timestamp</th><th className="px-6 py-3">File Name & Path</th><th className="px-6 py-3">Source</th><th className="px-6 py-3 text-right">Action</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {stats.recent_scans && stats.recent_scans.length > 0 ? (
                                stats.recent_scans.map((scan, index) => (
                                    <tr key={index} className="hover:bg-slate-700/50 transition">
                                        <td className="px-6 py-3 font-mono text-xs">{scan.timestamp}</td>
                                        <td className="px-6 py-3">
                                            <div className="font-medium text-white text-xs">{scan.file}</div>
                                            {/* TAMBAHAN: Lokasi path di bawah nama file */}
                                            <div className="text-[10px] text-slate-500 truncate max-w-xs font-mono" title={scan.location}>
                                                {scan.location || "Path unknown"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className={`text-[10px] px-2 py-1 rounded border ${scan.model?.includes("Cache") ? "border-slate-600 text-slate-400 bg-slate-800" : "border-blue-500 text-blue-400 bg-blue-900/20"}`}>
                                                {scan.model}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-right flex justify-end gap-2 items-center">
                                            {scan.status === "SAFE" ? (
                                                <span className="bg-emerald-500/20 text-emerald-500 border border-emerald-500/50 px-2 py-1 rounded text-[10px] font-bold">SAFE</span>
                                            ) : (
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold border ${scan.status === "HIGH" ? "bg-red-600/20 text-red-500 border-red-500 animate-pulse" : scan.status === "MEDIUM" ? "bg-orange-500/20 text-orange-500 border-orange-500" : "bg-yellow-500/20 text-yellow-500 border-yellow-500"}`}>{scan.status}</span>
                                            )}
                                            {scan.status !== "SAFE" && (<button onClick={() => setSelectedThreat(scan)} className="flex items-center gap-1 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded border border-slate-600 transition"><Eye size={12} /> Inspect</button>)}
                                        </td>
                                    </tr>
                                ))
                            ) : (<tr><td colSpan="4" className="px-6 py-8 text-center text-slate-600 italic">Waiting for file activity...</td></tr>)}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className={`p-6 rounded-xl border flex items-center justify-between transition-all duration-500 ${stats.status_level === 'Critical' ? 'bg-red-900/20 border-red-500' : 'bg-slate-800 border-slate-700'}`}>
                <div><h3 className="text-xl font-bold flex items-center gap-2">{stats.status_level === 'Critical' ? <AlertOctagon className="text-red-500"/> : <Shield className="text-emerald-500"/>} Security Status</h3><p className="text-slate-400 text-sm mt-1">{stats.status_level === 'Critical' ? "Threats detected! Check logs." : "System is running normally. No active threats."}</p></div>
                <Link to="/ai-agent" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm font-bold transition">Open Security Hub &rarr;</Link>
            </div>
        </div>
    );
};

// --- SISANYA TETAP SAMA ---

//scaning page
const usePageScanner = (token) => {
    const location = useLocation();

    useEffect(() => {
        const scannedPage = {
            path: location.pathname,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            tokenActive: !!token
        };
        console.log("🔍 PAGE SCANNED:", scannedPage);
    }, [location.pathname, token]);
};

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
                confidence: Math.round(res.data.confidence),
                reasons: res.data.reasons || []
            }]);

        } catch (err) {
            alert("Scan gagal");
            console.error(err);
        } finally {
            setScanning(false);
        }
    };


    return (
        <div className="ml-0 md:ml-64 p-8 text-white min-h-screen">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <AlertTriangle className="text-yellow-400"/> Phishing Link Scanner
            </h1>
            <p className="text-slate-400 mb-6">
                Scan a website and detect malicious or phishing links using AI.
            </p>

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6">
                <label className="block text-sm text-slate-400 mb-2">
                    Target URL
                </label>
                <div className="flex gap-3">
                    <input
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="flex-1 p-3 rounded bg-slate-900 border border-slate-700 text-white"
                    />
                    <button
                        onClick={startScan}
                        disabled={scanning}
                        className="px-6 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded transition disabled:opacity-50"
                    >
                        {scanning ? "Scanning..." : "Start Scan"}
                    </button>
                </div>
            </div>

            {scanning && (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6 animate-pulse">
                    <p className="text-yellow-400 font-mono">
                        🔍 Scanning links… analyzing behavior & structure
                    </p>
                </div>
            )}

            {results.length > 0 && (
                <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                    <div className="p-4 bg-slate-900 border-b border-slate-700 font-bold">
                        Scan Result
                    </div>
                    <table className="w-full text-sm">
                        <thead className="bg-slate-900 text-slate-400">
                            <tr>
                                <th className="px-4 py-3 text-left">Link</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Confidence</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((r, i) => (
                                <tr key={i} className="border-t border-slate-700">
                                    <td className="px-4 py-3 font-mono text-xs text-blue-400">
                                        {r.link}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                                            r.status === "SAFE"
                                                ? "bg-emerald-500/20 text-emerald-400"
                                                : r.status === "SUSPICIOUS"
                                                ? "bg-yellow-500/20 text-yellow-400"
                                                : "bg-red-500/20 text-red-400"
                                        }`}>
                                            {r.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {r.confidence}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};


const PageScannerWrapper = ({ token }) => {
    usePageScanner(token);
    return null;
};


const AIAgentPage = ({ token }) => {
    const [stats, setStats] = useState(null);
    const [immunityData, setImmunityData] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const resStats = await axios.get('http://localhost:8000/dashboard/stats', { headers: { Authorization: `Bearer ${token}` } });
                setStats(resStats.data);
                const resImmunity = await axios.get('http://localhost:8000/dashboard/immunity', { headers: { Authorization: `Bearer ${token}` } });
                setImmunityData(resImmunity.data);
            } catch (err) { console.error(err); }
        };
        const interval = setInterval(fetchData, 2000); fetchData(); return () => clearInterval(interval);
    }, [token]);

    if (!stats || !immunityData) return <div className="ml-0 md:ml-64 p-10 text-white">Connecting to AI Neural Net...</div>;

    return (
        <div className="ml-0 md:ml-64 p-8 text-white min-h-screen">
            <header className={`flex justify-between items-center mb-8 p-6 rounded-xl border transition-all duration-500 ${stats.status_level === 'Critical' ? 'bg-red-900/20 border-red-500 shadow-[0_0_30px_rgba(220,38,38,0.2)]' : 'bg-emerald-900/20 border-emerald-500'}`}>
                <div><h1 className="text-3xl font-bold flex items-center gap-3">{stats.status_level === 'Critical' ? '🚨 CRITICAL THREATS' : '🛡️ AI GUARD ACTIVE'}</h1><p className="text-slate-300 mt-2 text-sm">Real-time threat hunting & automated response.</p></div>
                <div className="text-right"><p className="text-xs text-gray-400 uppercase tracking-widest">AI Engine</p><p className="text-2xl font-bold text-blue-400">ONLINE</p></div>
            </header>
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg mb-8">
                <div className="p-4 bg-slate-900 border-b border-slate-700 flex justify-between items-center"><h3 className="font-bold flex items-center gap-2 text-blue-400"><Zap size={18} /> Detection Log</h3><span className="text-xs text-slate-500 font-mono">LIVE FEED</span></div>
                <div className="p-4 h-64 overflow-y-auto space-y-3 bg-slate-900/50">
                    {!stats.issues || stats.issues.length === 0 ? (<div className="flex flex-col items-center justify-center h-full text-slate-600"><Shield size={48} className="mb-4 opacity-20"/><p>No active threats detected.</p></div>) : (stats.issues.map((issue, index) => {
                        const parts = issue.msg.split('\nREASON: ');
                        const headerText = parts[0] || issue.msg;
                        const reasonText = parts[1] || "No details.";
                        let severity = "THREAT"; let fileName = "Unknown";
                        if (headerText.includes("]")) severity = headerText.split("] ")[0].replace("[", "");
                        if (headerText.includes("THREAT: ")) fileName = headerText.split("THREAT: ")[1];
                        return (
                            <div key={index} className="p-4 border-l-4 border-red-500 rounded bg-slate-800 flex items-start gap-4 hover:bg-slate-800/80 transition">
                                <div className="mt-1 bg-red-500/10 p-2 rounded-full text-red-500 animate-pulse"><AlertTriangle size={20}/></div>
                                <div className="flex-1"><div className="flex items-center gap-2 mb-1"><span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${severity === "HIGH" ? "bg-red-600 text-white" : "bg-orange-500 text-white"}`}>{severity}</span><span className="font-bold text-red-300 text-sm">{fileName}</span></div><div className="text-slate-300 text-xs font-mono bg-black/30 p-2 rounded border border-white/5 mt-2"><span className="text-blue-400 font-bold mr-2">ANALYSIS:</span> {reasonText}</div></div>
                            </div>
                        );
                    }))}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 relative overflow-hidden"><div className="absolute top-0 right-0 p-4 opacity-10"><Lock size={100} /></div><h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><span className="text-red-500">⛔</span> Isolation Vault</h3><div className="space-y-2 h-40 overflow-y-auto">{immunityData.blocked_apps.length === 0 ? (<div className="text-emerald-500 text-sm italic">No apps isolated. Network Clean.</div>) : (immunityData.blocked_apps.map((app, idx) => (<div key={idx} className="flex justify-between items-center bg-red-900/20 border border-red-500/30 p-2 rounded"><span className="text-red-400 font-mono text-sm">{app}</span><span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded">BLOCKED</span></div>)))}</div></div>
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 relative overflow-hidden"><div className="absolute top-0 right-0 p-4 opacity-10"><Activity size={100} /></div><h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><span className="text-emerald-500">❤️</span> Self-Healing Core</h3><div className="h-40 overflow-y-auto space-y-2 font-mono text-xs">{immunityData.logs.length === 0 ? <div className="text-slate-500">System config integrity: 100%</div> : immunityData.logs.slice().reverse().map((log, idx) => (<div key={idx} className={`p-2 rounded border-l-2 ${log.action === 'HEALING' ? 'border-emerald-500 bg-emerald-900/10 text-emerald-300' : 'border-red-500 bg-red-900/10 text-red-300'}`}><span className="opacity-50 mr-2">[{log.time}]</span><span className="font-bold">{log.action}:</span> {log.msg}</div>))}</div></div>
            </div>
        </div>
    );
};

const LandingPage = () => (<div className="min-h-screen bg-slate-950 text-white selection:bg-blue-500/30"><nav className="border-b border-slate-800 bg-slate-950/50 backdrop-blur fixed w-full z-50"><div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center"><div className="text-2xl font-bold tracking-tighter flex items-center gap-2"><Shield className="text-blue-500" fill="currentColor" fillOpacity={0.2} /> MoS<span className="text-blue-500">.</span></div><div className="flex gap-4"><Link to="/login" className="px-6 py-2 rounded-full border border-slate-700 hover:border-blue-500 hover:text-blue-400 transition text-sm font-medium">Log In</Link><Link to="/login" className="px-6 py-2 rounded-full bg-blue-600 hover:bg-blue-500 transition text-sm font-bold shadow-[0_0_20px_rgba(37,99,235,0.3)]">Get Protected</Link></div></div></nav><header className="pt-40 pb-20 px-6 relative overflow-hidden text-center"><div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] -z-10"></div><div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/30 border border-blue-500/30 text-blue-300 text-xs font-bold mb-6 tracking-wide"><span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span> SYSTEM VERSION 2.0</div><h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">Next-Gen Security <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Powered by Dual AI</span></h1><p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">MoS combines the precision of <strong>Google Gemini</strong> with the speed of <strong>Groq Llama 3</strong>.</p><div className="flex justify-center gap-4"><Link to="/login" className="px-8 py-4 bg-white text-slate-900 rounded-lg font-bold hover:bg-slate-200 transition flex items-center gap-2"><Zap size={20} className="fill-slate-900"/> Initialize Agent</Link></div></header></div>);
const LoginPage = ({ setToken }) => {
    const [username, setUsername] = useState(""); const [password, setPassword] = useState(""); const [loading, setLoading] = useState(false); const navigate = useNavigate();
    const submit = async (e) => { e.preventDefault(); setLoading(true); try { const params = new URLSearchParams(); params.append('username', username); params.append('password', password || ""); const res = await axios.post('http://localhost:8000/token', params.toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }); if (res.data?.access_token) { setToken(res.data.access_token); navigate('/dashboard'); } } catch (err) { alert('Login failed'); } finally { setLoading(false); } };
    return (<div className="min-h-screen flex items-center justify-center p-6 bg-slate-900 text-white"><form onSubmit={submit} className="w-full max-w-md bg-slate-800 p-8 rounded-xl border border-slate-700"><h2 className="text-2xl font-bold mb-6">Agent Login</h2><label className="block mb-3"><span className="text-slate-400 text-sm">Username</span><input className="mt-1 w-full p-2 rounded bg-slate-900 border border-slate-700" value={username} onChange={e => setUsername(e.target.value)} /></label><label className="block mb-4"><span className="text-slate-400 text-sm">Password</span><input type="password" className="mt-1 w-full p-2 rounded bg-slate-900 border border-slate-700" value={password} onChange={e => setPassword(e.target.value)} /></label><button type="submit" disabled={loading} className="w-full py-2 bg-blue-600 rounded text-white font-bold">{loading ? 'Connecting...' : 'Connect Agent'}</button></form></div>);
};
const StatCard = ({ icon, title, value, color }) => { const colorClasses = { blue: "text-blue-400 border-l-blue-500 bg-blue-500/10", purple: "text-purple-400 border-l-purple-500 bg-purple-500/10", red: "text-red-400 border-l-red-500 bg-red-500/10", orange: "text-orange-400 border-l-orange-500 bg-orange-500/10" }; return (<div className={`p-6 rounded-xl border border-slate-700 flex items-center gap-4 border-l-4 ${colorClasses[color]} bg-slate-800`}><div className={`p-3 rounded-lg bg-slate-900/50`}>{icon}</div><div><p className="text-slate-400 text-xs uppercase font-bold tracking-wider">{title}</p><p className="text-2xl font-bold text-white">{value}</p></div></div>); };

function App() {
    const [token, setToken] = useState(localStorage.getItem('mos_token'));

    const saveToken = (t) => {
        localStorage.setItem('mos_token', t);
        setToken(t);
    };

    const handleLogout = () => {
        localStorage.removeItem('mos_token');
        setToken(null);
    };

    return (
        <Router>
            <PageScannerWrapper token={token} />
            <div className="bg-slate-900 min-h-screen">
                {token && <Sidebar handleLogout={handleLogout} />}
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<LoginPage setToken={saveToken} />} />
                    <Route path="/dashboard" element={token ? <DashboardHome token={token} /> : <Navigate to="/login" />} />
                    <Route path="/ai-agent" element={token ? <AIAgentPage token={token} /> : <Navigate to="/login" />} />
                    <Route path="/scan-phishing" element={token ? <ScanPhishingPage token={token} /> : <Navigate to="/login" />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;