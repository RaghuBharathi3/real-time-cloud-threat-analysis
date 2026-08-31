import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, ShieldAlert, AlertTriangle, Terminal, Cpu, Activity, Play, Pause,
  BarChart2, Server, Settings, User, RefreshCw, Send, Plus
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Native Web Crypto helper for HMAC-SHA256 calculation (zero external dependencies)
async function computeHMAC(secret, message) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  const cryptoKey = await window.crypto.subtle.importKey(
    "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await window.crypto.subtle.sign("HMAC", cryptoKey, messageData);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function App() {
  const [activeTab, setActiveTab] = useState('console');
  const [backendStatus, setBackendStatus] = useState('checking');
  
  // Auth/Users states
  const [users, setUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [authError, setAuthError] = useState("");
  
  // Real-time Event List
  const [alerts, setAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  
  // Model Training & Performance Metrics
  const [modelMetrics, setModelMetrics] = useState(null);
  const [isTraining, setIsTraining] = useState(false);
  
  // Custom Log Form Ingestion State
  const [customEvent, setCustomEvent] = useState({
    event_id: "",
    timestamp: "",
    cloud_provider: "aws",
    user_id: "sec_operator",
    event_type: "resource_access",
    ip_address: "203.0.113.195",
    location: "US",
    failed_attempts: 0,
    resource: "s3_bucket_finance",
    request_frequency: 1
  });
  
  const [isSimulating, setIsSimulating] = useState(false);
  const simulationTimer = useRef(null);

  // Billing portal states
  const [billingStatus, setBillingStatus] = useState("");
  
  // Demo Mode state
  const [demoMode, setDemoMode] = useState(true);

  useEffect(() => {
    generateCustomIds();
    checkHealth();
    loadUsers();
    
    const statusTimer = setInterval(checkHealth, 10000);
    return () => {
      clearInterval(statusTimer);
      if (simulationTimer.current) clearInterval(simulationTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  function generateCustomIds() {
    setCustomEvent(prev => ({
      ...prev,
      event_id: "EVT" + Math.floor(10000 + Math.random() * 90000),
      timestamp: new Date().toISOString().slice(0, 19)
    }));
  }

  async function checkHealth() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/health`);
      if (res.ok) {
        const data = await res.json();
        setBackendStatus('online');
        setDemoMode(data.demo_mode ?? true);
      } else {
        setBackendStatus('offline');
      }
    } catch {
      setBackendStatus('offline');
    }
  }

  async function loadUsers() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/users`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
        if (data.length > 0) {
          const defaultUser = data.find(u => u.user_id === 'usr_free') || data[0];
          setActiveUser(defaultUser);
          await loadSession(defaultUser.user_id);
        }
      }
    } catch (e) {
      console.error("Failed to fetch mock user profiles", e);
    }
  }

  async function loadSession(userId) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/session`, {
        headers: { 'X-User-ID': userId }
      });
      if (res.ok) {
        const sessionData = await res.json();
        setActiveUser(sessionData);
        // Reload parameters for the context of the active user
        fetchAlerts(userId);
        fetchModelMetrics(userId);
      }
    } catch (e) {
      console.error("Failed to load user details", e);
    }
  }

  async function handleUserChange(userId) {
    setAuthError("");
    setBillingStatus("");
    
    // Stop simulation when swapping users to prevent out-of-role event loops
    if (isSimulating) {
      if (simulationTimer.current) clearInterval(simulationTimer.current);
      setIsSimulating(false);
    }
    
    await loadSession(userId);
  }

  async function fetchAlerts(userId) {
    const currentId = userId || activeUser?.user_id || 'usr_free';
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/alerts?limit=50`, {
        headers: { 'X-User-ID': currentId }
      });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
        if (data.length > 0) {
          setSelectedAlert(data[0]);
        } else {
          setSelectedAlert(null);
        }
      }
    } catch (e) {
      console.error("Failed to load alerts list", e);
    }
  }

  async function fetchModelMetrics(userId) {
    const currentId = userId || activeUser?.user_id || 'usr_free';
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/model/metrics`, {
        headers: { 'X-User-ID': currentId }
      });
      if (res.ok) {
        const data = await res.json();
        setModelMetrics(data);
      }
    } catch (e) {
      console.error("Failed to fetch model metrics", e);
    }
  }


  const handleTrainModel = async () => {
    setIsTraining(true);
    setAuthError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/model/train`, {
        method: 'POST',
        headers: { 'X-User-ID': activeUser?.user_id || 'usr_free' }
      });
      if (res.ok) {
        const data = await res.json();
        setModelMetrics(data.metrics);
        setAuthError("");
      } else {
        const err = await res.json();
        setAuthError(err.detail || "Model training failed.");
      }
    } catch (e) {
      console.error("Failed to trigger model training:", e);
      alert("Error: Failed to reach model training endpoint.");
    } finally {
      setIsTraining(false);
    }
  };


  const handleSimulateNext = async (userId) => {
    const currentId = userId || activeUser?.user_id || 'usr_free';
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/pipeline/simulate-next`, {
        method: 'POST',
        headers: { 'X-User-ID': currentId }
      });
      if (res.ok) {
        const newAlert = await res.json();
        const formattedAlert = {
          event_id: newAlert.event_id,
          timestamp: newAlert.raw_event.timestamp,
          cloud_provider: newAlert.raw_event.cloud_provider,
          user_id: newAlert.raw_event.user_id,
          event_type: newAlert.raw_event.event_type,
          ip_address: newAlert.raw_event.ip_address,
          location: newAlert.raw_event.location,
          resource: newAlert.raw_event.resource,
          failed_attempts: newAlert.raw_event.failed_attempts,
          request_frequency: newAlert.raw_event.request_frequency,
          threat_status: newAlert.detection_result.threat_status,
          threat_type: newAlert.detection_result.threat_type,
          confidence: newAlert.detection_result.confidence,
          reasons: newAlert.detection_result.reason
        };

        setAlerts(prev => {
          const filtered = prev.filter(a => a.event_id !== formattedAlert.event_id);
          return [formattedAlert, ...filtered];
        });
        setSelectedAlert(formattedAlert);
        setAuthError("");
      } else {
        const err = await res.json();
        setAuthError(`[SIMULATION REJECTED] ${err.detail}`);
        if (isSimulating) {
          if (simulationTimer.current) clearInterval(simulationTimer.current);
          setIsSimulating(false);
        }
      }
    } catch (err) {
      console.error("Simulation request failed", err);
    }
  };

  const toggleSimulation = () => {
    if (isSimulating) {
      if (simulationTimer.current) clearInterval(simulationTimer.current);
      setIsSimulating(false);
    } else {
      setIsSimulating(true);
      handleSimulateNext(activeUser?.user_id);
      simulationTimer.current = setInterval(() => handleSimulateNext(activeUser?.user_id), 3000);
    }
  };

  const handleCustomEventSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/pipeline/run`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-ID': activeUser?.user_id || 'usr_free'
        },
        body: JSON.stringify(customEvent)
      });
      if (res.ok) {
        const data = await res.json();
        const formattedAlert = {
          event_id: data.event_id,
          timestamp: data.raw_event.timestamp,
          cloud_provider: data.raw_event.cloud_provider,
          user_id: data.raw_event.user_id,
          event_type: data.raw_event.event_type,
          ip_address: data.raw_event.ip_address,
          location: data.raw_event.location,
          resource: data.raw_event.resource,
          failed_attempts: data.raw_event.failed_attempts,
          request_frequency: data.raw_event.request_frequency,
          threat_status: data.detection_result.threat_status,
          threat_type: data.detection_result.threat_type,
          confidence: data.detection_result.confidence,
          reasons: data.detection_result.reason
        };

        setAlerts(prev => {
          const filtered = prev.filter(a => a.event_id !== formattedAlert.event_id);
          return [formattedAlert, ...filtered];
        });
        setSelectedAlert(formattedAlert);
        setAuthError("");
        generateCustomIds();
        setActiveTab('console');
      } else {
        const err = await res.json();
        setAuthError(`[INGESTION FORBIDDEN] ${err.detail}`);
        alert(`Ingestion failed: ${err.detail}`);
      }
    } catch (e) {
      console.error("Ingestion endpoint request failed:", e);
      alert("Error: Ingestion endpoint unreachable.");
    }
  };


  const handleUpgradeToPro = async () => {
    setBillingStatus("Initiating mock checkout pipeline...");
    try {
      const resOrder = await fetch(`${API_BASE_URL}/api/v1/billing/checkout`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-ID': activeUser?.user_id || 'usr_free'
        },
        body: JSON.stringify({ plan: "pro" })
      });
      
      if (!resOrder.ok) {
        setBillingStatus("Failed to initiate checkout order.");
        return;
      }
      
      const order = await resOrder.json();
      setBillingStatus(`Order ${order.order_id} created. Generating cryptographic verification signature...`);
      
      // Simulate signature callback payload
      const paymentId = `pay_mock_${Math.floor(100000 + Math.random() * 900000)}`;
      const secret = "mock_secret_key_123";
      const payloadString = `${paymentId}:${order.order_id}`;
      
      const signature = await computeHMAC(secret, payloadString);
      setBillingStatus("Sending signature-verified webhook callback...");
      
      const resWebhook = await fetch(`${API_BASE_URL}/api/v1/billing/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Mock-Signature': signature
        },
        body: JSON.stringify({
          payment_id: paymentId,
          order_id: order.order_id,
          user_id: activeUser.user_id
        })
      });
      
      if (resWebhook.ok) {
        const resData = await resWebhook.json();
        setBillingStatus(`SUCCESS: ${resData.message}`);
        // Reload current user state
        await loadSession(activeUser.user_id);
      } else {
        const err = await resWebhook.json();
        setBillingStatus(`Webhook upgrade failed: ${err.detail}`);
      }
    } catch (e) {
      console.error(e);
      setBillingStatus("Simulated checkout connection failed.");
    }
  };

  const getProviderBadge = (provider) => {
    const p = (provider || 'aws').toLowerCase();
    let bg = 'bg-slate-800';
    let text = 'text-slate-300';
    
    if (p === 'azure') { bg = 'bg-blue-950 border border-blue-800/40'; text = 'text-blue-400'; }
    else if (p === 'gcp') { bg = 'bg-amber-950 border border-amber-800/40'; text = 'text-amber-400'; }
    else if (p === 'oci') { bg = 'bg-red-950 border border-red-800/40'; text = 'text-red-400'; }
    else { bg = 'bg-slate-900 border border-slate-700/50'; text = 'text-slate-300'; }
    
    return (
      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono tracking-wider ${bg} ${text}`}>
        {p.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="console-wrapper">
      
      {demoMode && (
        <div className="bg-amber-950/20 border-b border-amber-500/30 text-amber-400 text-[10px] py-1 text-center font-mono font-bold tracking-widest uppercase">
          ⚠️ DEMO ENVIRONMENT ACTIVE &bull; RUNNING WITH MOCK DATA &bull; NO LIVE CLOUD CONNECTIONS &bull; NO REAL TRANSACTIONS
        </div>
      )}
      
      {/* Console Top Header */}

      <header className="console-header">
        <div className="console-title-group">
          <h1>
            <Shield className="text-blue-500 w-5 h-5" />
            CLOUD SECURITY OPERATIONS CONSOLE
          </h1>
          <p>Multi-Cloud Threat Assessment Portal (Modules 1–3 & Subscription Controls)</p>
        </div>

        {/* User Session and Connectivity Swappers */}
        <div className="flex gap-4 items-center">
          
          {/* Mock Auth Profile selector */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded text-[11px] font-mono">
            <User className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-gray-400">ACTIVE SESSION:</span>
            <select 
              value={activeUser?.user_id || ''} 
              onChange={(e) => handleUserChange(e.target.value)}
              className="bg-transparent border-none text-white focus:outline-none cursor-pointer font-bold font-mono"
            >
              {users.map(u => (
                <option key={u.user_id} value={u.user_id} className="bg-slate-950 text-white">
                  {u.username.toUpperCase()} ({u.role}) - {u.is_pro ? 'PRO' : 'FREE'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded text-[11px] font-mono">
            <Server className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-gray-400">API:</span>
            <span className={backendStatus === 'online' ? 'status-text-safe font-bold' : 'status-text-danger font-bold'}>
              {backendStatus === 'online' ? 'ACTIVE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </header>

      {/* Tabs Menu Navigation */}
      <nav className="console-tabs" aria-label="Main Navigation">
        <button 
          onClick={() => setActiveTab('console')}
          className={`console-tab-btn ${activeTab === 'console' ? 'active' : ''}`}
        >
          <Activity className="w-4 h-4" />
          Threat Monitor console
        </button>
        <button 
          onClick={() => setActiveTab('inject')}
          className={`console-tab-btn ${activeTab === 'inject' ? 'active' : ''}`}
        >
          <Plus className="w-4 h-4" />
          Log Ingest Injector
        </button>
        <button 
          onClick={() => setActiveTab('metrics')}
          className={`console-tab-btn ${activeTab === 'metrics' ? 'active' : ''}`}
        >
          <BarChart2 className="w-4 h-4" />
          RF Model diagnostics
        </button>
        <button 
          onClick={() => setActiveTab('billing')}
          className={`console-tab-btn ${activeTab === 'billing' ? 'active' : ''}`}
        >
          <Server className="w-4 h-4" />
          Billing & Tiers
        </button>
      </nav>

      {/* Alert Warning for Authorization Failures */}
      {authError && (
        <div className="bg-red-950/20 border border-red-500/30 text-red-400 text-xs px-4 py-2.5 rounded font-mono flex items-center gap-2 mt-2">
          <AlertTriangle className="w-4 h-4 shrink-0 animate-bounce" />
          <span>SECURITY ROUTING NOTICE: {authError}</span>
        </div>
      )}

      {/* Main Tab Contents */}
      <main style={{ flexGrow: 1, marginTop: 'var(--space-md)' }}>
        
        {/* Tab 1: Real-Time Threat Console */}
        {activeTab === 'console' && (
          <div className="console-split-layout">
            
            {/* Left Sidebar: Simulation Controller & Event Log Stream */}
            <section className="console-card">
              <div className="console-card-header">
                <span className="console-card-title">
                  <Terminal className="text-blue-400 w-4 h-4" />
                  Live Event Log Stream
                </span>
                
                {/* Controller Player - Disabled if not admin */}
                <button 
                  onClick={toggleSimulation}
                  disabled={activeUser?.role !== 'ADMIN'}
                  className={`console-btn ${isSimulating ? 'console-btn-secondary' : 'console-btn-primary'} py-1 px-2.5 rounded text-[11px] ${activeUser?.role !== 'ADMIN' ? 'console-btn-disabled' : ''}`}
                  title={activeUser?.role !== 'ADMIN' ? "Admin permission required to simulate logs" : ""}
                >
                  {isSimulating ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  {isSimulating ? "PAUSE" : "SIMULATE"}
                </button>
              </div>

              {/* Status information banner */}
              <div className="bg-black/60 border border-slate-700 px-3 py-2 rounded text-[10px] font-mono text-gray-400 flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isSimulating ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                  {isSimulating ? "STREAMING ACTIVE" : "STREAM STANDBY"}
                </span>
                {activeUser?.role !== 'ADMIN' && <span className="text-amber-500 font-bold">🔒 SIMULATION LOCKED (ADMIN ONLY)</span>}
              </div>

              {/* Scrolling event logs */}
              <div className="terminal-event-list">
                {alerts.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-[10px]">
                    NO EVENT LOGS DETECTED. CHOOSE ADMIN USER AND CLICK SIMULATE.
                  </div>
                ) : (
                  alerts.map(alert => (
                    <button
                       key={alert.event_id}
                       onClick={() => setSelectedAlert(alert)}
                       className={`terminal-row ${selectedAlert?.event_id === alert.event_id ? 'active' : ''}`}
                    >
                      <div className="row-meta">
                        <span className="text-white font-bold flex items-center gap-1.5">
                          {alert.event_id}
                          {getProviderBadge(alert.cloud_provider)}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">{alert.timestamp.slice(11, 19)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 font-mono">{alert.resource}</span>
                        <span className={alert.threat_status === 'Suspicious' ? 'status-text-danger row-status' : 'status-text-safe row-status'}>
                          {alert.threat_status === 'Suspicious' ? 'CRIT' : 'SAFE'}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </section>

            {/* Right Main Panel: Deep Event Inspector */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {selectedAlert ? (
                <>
                  {/* Module 1 Ingest Log vs Module 2 engineered features */}
                  <div className="console-card">
                    <div className="console-card-header">
                      <span className="console-card-title">
                        <Cpu className="text-purple-400 w-4 h-4" />
                        Log Inspection Diagnostics
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">ID: {selectedAlert.event_id}</span>
                    </div>

                    <div className="inspect-comparison-grid">
                      
                      {/* Left: Module 1 Raw values (Locked for USER role) */}
                      <div>
                        <h4 className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5" />
                          Module 1: Raw Ingest Schema
                        </h4>
                        
                        {activeUser?.role === 'USER' ? (
                          <div className="console-code-block text-slate-500 italic text-center py-8">
                            🔒 Access Denied: User role requires Analyst or Admin permission to inspect raw audit JSON records.
                          </div>
                        ) : (
                          <div className="console-code-block">
                            {JSON.stringify({
                              event_id: selectedAlert.event_id,
                              timestamp: selectedAlert.timestamp,
                              cloud_provider: selectedAlert.cloud_provider || 'aws',
                              user_id: selectedAlert.user_id,
                              event_type: selectedAlert.event_type,
                              ip_address: selectedAlert.ip_address,
                              location: selectedAlert.location,
                              failed_attempts: selectedAlert.failed_attempts,
                              resource: selectedAlert.resource,
                              request_frequency: selectedAlert.request_frequency
                            }, null, 2)}
                          </div>
                        )}
                      </div>

                      {/* Right: Module 2 Preprocessed features */}
                      <div>
                        <h4 className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5" />
                          Module 2: Engineered Feature Vector
                        </h4>
                        
                        <div className="dense-table-container">
                          <table className="dense-table">
                            <thead>
                              <tr>
                                <th>Feature name</th>
                                <th>computed value</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>failed_attempts</td>
                                <td>{selectedAlert.failed_attempts}</td>
                              </tr>
                              <tr>
                                <td>request_frequency</td>
                                <td>{selectedAlert.request_frequency}</td>
                              </tr>
                              <tr>
                                <td>is_login</td>
                                <td>{selectedAlert.event_type === 'login' ? 1 : 0}</td>
                              </tr>
                              <tr>
                                <td>is_sensitive_resource</td>
                                <td>
                                  {["s3_bucket_finance", "ec2_admin_portal", "iam_policy_manager", "kms_keys", "azure_keyvault", "gcp_kms", "oci_vault"].includes(selectedAlert.resource.toLowerCase()) ? 1 : 0}
                                </td>
                              </tr>
                              <tr>
                                <td>is_unusual_location</td>
                                <td>
                                  {["CN", "RU", "KP", "UNKNOWN"].includes(selectedAlert.location.toUpperCase()) ? 1 : 0}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Module 3 Classifier Output */}
                  <div className="console-card">
                    <div className="console-card-header">
                      <span className="console-card-title">
                        <Shield className="text-blue-400 w-4 h-4" />
                        Module 3: Random Forest Classifier Prediction
                      </span>
                    </div>

                    <div className={`p-4 rounded border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${selectedAlert.threat_status === 'Suspicious' ? 'bg-red-950/20 border-red-500/20' : 'bg-emerald-950/20 border-emerald-500/20'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded border ${selectedAlert.threat_status === 'Suspicious' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                          {selectedAlert.threat_status === 'Suspicious' ? <ShieldAlert className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-500 font-bold uppercase">CLASSIFIER VERDICT</div>
                          <h4 className={`text-base font-bold m-0 mt-0.5 ${selectedAlert.threat_status === 'Suspicious' ? 'text-red-400' : 'text-emerald-400'}`}>
                            {selectedAlert.threat_type}
                          </h4>
                          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Confidence Probability: {Math.round(selectedAlert.confidence * 100)}%</span>
                        </div>
                      </div>

                      <div className="text-[10px] text-gray-400 bg-slate-900 border border-slate-700 p-2 rounded font-mono flex flex-col">
                        <span>threat_status:</span>
                        <span className={selectedAlert.threat_status === 'Suspicious' ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                          {selectedAlert.threat_status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Explanatory Reasons */}
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 block mb-2 uppercase tracking-wider">Explainability Diagnostics</span>
                      <div className="flex flex-col gap-1.5">
                        {selectedAlert.reasons.map((r, i) => (
                          <div key={i} className="bg-slate-900 border border-slate-800 px-3 py-2 rounded text-xs text-gray-300 flex items-center gap-2 font-mono">
                            <span className="w-1 h-1 bg-blue-500 rounded-full" />
                            {r}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="console-card py-16 text-center text-slate-500 flex flex-col items-center justify-center gap-4">
                  <Shield className="w-8 h-8 text-slate-700 animate-pulse" />
                  <p className="text-xs">SELECT AN INGESTED LOG EVENT FROM THE LOG STREAM TO RUN DEEP DIAGNOSTICS</p>
                </div>
              )}
            </section>

          </div>
        )}

        {/* Tab 2: Custom Log Injection Form */}
        {activeTab === 'inject' && (
          <div className="console-card max-w-xl mx-auto">
            <div className="console-card-header">
              <span className="console-card-title">
                <Send className="text-blue-400 w-4 h-4" />
                Inject Custom Security Log Event
              </span>
            </div>

            <form onSubmit={handleCustomEventSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xxs)' }}>
                <label className="text-[11px] text-gray-400 font-medium">Event ID</label>
                <input 
                  type="text" 
                  value={customEvent.event_id} 
                  disabled
                  className="console-input bg-black/60 text-slate-500 border-slate-800" 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xxs)' }}>
                <label className="text-[11px] text-gray-400 font-medium">Timestamp (ISO)</label>
                <input 
                  type="text" 
                  value={customEvent.timestamp} 
                  onChange={(e) => setCustomEvent({...customEvent, timestamp: e.target.value})}
                  className="console-input" 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xxs)' }}>
                <label className="text-[11px] text-gray-400 font-medium">Cloud Provider</label>
                <select 
                  value={customEvent.cloud_provider} 
                  onChange={(e) => setCustomEvent({...customEvent, cloud_provider: e.target.value})}
                  className="console-select"
                >
                  <option value="aws">AWS (Free)</option>
                  <option value="azure">Azure (Pro Only)</option>
                  <option value="gcp">Google Cloud (Pro Only)</option>
                  <option value="oci">Oracle Cloud (Pro Only)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xxs)' }}>
                <label className="text-[11px] text-gray-400 font-medium">User Identifier</label>
                <input 
                  type="text" 
                  value={customEvent.user_id} 
                  onChange={(e) => setCustomEvent({...customEvent, user_id: e.target.value})}
                  className="console-input" 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xxs)' }}>
                <label className="text-[11px] text-gray-400 font-medium">Event Type</label>
                <select 
                  value={customEvent.event_type} 
                  onChange={(e) => setCustomEvent({...customEvent, event_type: e.target.value})}
                  className="console-select"
                >
                  <option value="login">login</option>
                  <option value="resource_access">resource_access</option>
                  <option value="api_call">api_call</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xxs)' }}>
                <label className="text-[11px] text-gray-400 font-medium">IPv4 Address</label>
                <input 
                  type="text" 
                  value={customEvent.ip_address} 
                  onChange={(e) => setCustomEvent({...customEvent, ip_address: e.target.value})}
                  className="console-input" 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xxs)' }}>
                <label className="text-[11px] text-gray-400 font-medium">Geographic Location</label>
                <input 
                  type="text" 
                  value={customEvent.location} 
                  onChange={(e) => setCustomEvent({...customEvent, location: e.target.value})}
                  className="console-input" 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xxs)' }}>
                <label className="text-[11px] text-gray-400 font-medium">Failed Login Attempts</label>
                <input 
                  type="number" 
                  value={customEvent.failed_attempts} 
                  onChange={(e) => setCustomEvent({...customEvent, failed_attempts: parseInt(e.target.value) || 0})}
                  className="console-input" 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xxs)' }}>
                <label className="text-[11px] text-gray-400 font-medium">Target Resource</label>
                <input 
                  type="text" 
                  value={customEvent.resource} 
                  onChange={(e) => setCustomEvent({...customEvent, resource: e.target.value})}
                  className="console-input" 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xxs)' }}>
                <label className="text-[11px] text-gray-400 font-medium">Request Frequency (req / min)</label>
                <input 
                  type="number" 
                  value={customEvent.request_frequency} 
                  onChange={(e) => setCustomEvent({...customEvent, request_frequency: parseInt(e.target.value) || 1})}
                  className="console-input" 
                />
              </div>

              <button 
                type="submit" 
                className="console-btn console-btn-primary py-2.5"
                style={{ gridColumn: 'span 2', marginTop: 'var(--space-xs)' }}
              >
                <Send className="w-4 h-4" />
                INJECT EVENT INTO PIPELINE
              </button>

            </form>
          </div>
        )}

        {/* Tab 3: Model Metrics & Feature Importances */}
        {activeTab === 'metrics' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {modelMetrics ? (
              <>
                <div className="console-card">
                  <div className="console-card-header">
                    <span className="console-card-title">CLASSIFIER ACCURACY</span>
                  </div>
                  <span className="text-3xl font-mono font-bold text-white">{(modelMetrics.accuracy * 100).toFixed(1)}%</span>
                  <span className="text-[10px] text-gray-500 font-mono">Test validation accuracy on security_events_eval.csv</span>
                </div>

                <div className="console-card">
                  <div className="console-card-header">
                    <span className="console-card-title">MACRO F1 SCORE</span>
                  </div>
                  <span className="text-3xl font-mono font-bold text-white">{(modelMetrics.macro_f1 * 100).toFixed(1)}%</span>
                  <span className="text-[10px] text-gray-500 font-mono">Harmonic precision-recall mean split</span>
                </div>

                <div className="console-card">
                  <div className="console-card-header">
                    <span className="console-card-title">FOREST ESTIMATORS</span>
                  </div>
                  <span className="text-3xl font-mono font-bold text-white">50</span>
                  <span className="text-[10px] text-gray-500 font-mono">Total decision tree count inside classifier</span>
                </div>

                {/* Feature Importance List */}
                <div className="console-card md:col-span-2">
                  <div className="console-card-header">
                    <span className="console-card-title">
                      <BarChart2 className="text-blue-400 w-4 h-4" />
                      Random Forest Split Feature Importances
                    </span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {Object.entries(modelMetrics.feature_importances).map(([feature, val]) => (
                      <div key={feature} className="importance-bar-container">
                        <div className="importance-bar-label">
                          <span>{feature}</span>
                          <span className="text-white">{(val * 100).toFixed(1)}%</span>
                        </div>
                        <div className="importance-bar-track">
                          <div 
                            className="importance-bar-fill" 
                            style={{ width: `${val * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trainer control block (Locked if not admin) */}
                <div className="console-card">
                  <div className="console-card-header">
                    <span className="console-card-title">
                      <Settings className="text-blue-400 w-4 h-4" />
                      Model Configuration
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Triggers backend re-fitting of model parameters. Random seed splits, preprocessing standardizations, and F1 calculations run dynamically on data.
                  </p>
                  
                  <button 
                    onClick={handleTrainModel}
                    disabled={isTraining || activeUser?.role !== 'ADMIN'}
                    className={`console-btn console-btn-primary w-full ${isTraining || activeUser?.role !== 'ADMIN' ? 'console-btn-disabled' : ''}`}
                    style={{ marginTop: 'auto' }}
                    title={activeUser?.role !== 'ADMIN' ? "Admin permission required to retrain the model" : ""}
                  >
                    {isTraining ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    {isTraining ? "RE-FITTING FOREST..." : "RE-TRAIN ML CLASSIFIER"}
                  </button>
                  {activeUser?.role !== 'ADMIN' && (
                    <span className="text-[10px] text-amber-500 font-mono mt-1.5 block text-center">
                      🔒 Retraining locked: ADMIN role required.
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="console-card md:col-span-3 py-16 text-center text-slate-500 flex flex-col items-center justify-center gap-4">
                <RefreshCw className="w-8 h-8 text-slate-700 animate-spin" />
                <p className="text-xs">MODEL DIAGNOSTICS ARE CURRENTLY UNINITIALIZED</p>
                <button 
                  onClick={handleTrainModel} 
                  disabled={activeUser?.role !== 'ADMIN'}
                  className={`console-btn console-btn-primary ${activeUser?.role !== 'ADMIN' ? 'console-btn-disabled' : ''}`}
                >
                  Fit Classifier parameters
                </button>
              </div>
            )}

          </div>
        )}

        {/* Tab 4: Subscription & Billing Portal */}
        {activeTab === 'billing' && (
          <div className="console-card max-w-2xl mx-auto">
            <div className="console-card-header">
              <span className="console-card-title">
                <Server className="text-blue-400 w-4 h-4" />
                Billing Pipeline & Tier Management
              </span>
            </div>

            <div className="flex flex-col gap-6">
              
              {/* Account summary banner */}
              <div className="p-4 rounded border border-slate-700 bg-slate-900/40 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">CURRENT LEVEL</span>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 mt-1">
                    {activeUser?.is_pro ? "PRO MULTI-CLOUD SERVICE" : "FREE STANDARD TIER"}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${activeUser?.is_pro ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' : 'bg-amber-950 text-amber-400 border border-amber-500/20'}`}>
                      {activeUser?.is_pro ? 'PRO' : 'FREE'}
                    </span>
                  </h3>
                  <span className="text-xs text-gray-400 font-mono block mt-1">
                    Logged Session: {activeUser?.username} (Role: {activeUser?.role})
                  </span>
                </div>
                
                {activeUser?.is_pro ? (
                  <div className="text-right">
                    <span className="text-xs text-emerald-400 font-mono block font-bold">Auto-renewing Active</span>
                    <span className="text-[10px] text-gray-500 block font-mono">Expires: {activeUser?.subscription_expires_at?.slice(0, 10) || '30 days'}</span>
                  </div>
                ) : (
                  <button
                    onClick={handleUpgradeToPro}
                    className="console-btn console-btn-primary px-4 py-2 text-xs font-bold font-mono"
                  >
                    Upgrade to Pro Plan
                  </button>
                )}
              </div>

              {/* Simulated webhook status console */}
              {billingStatus && (
                <div className="bg-slate-950 border border-slate-800 p-3 rounded font-mono text-xs text-blue-400">
                  <div className="flex items-center gap-2 mb-1">
                    <Terminal className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-bold text-white">Simulated Webhook pipeline logs:</span>
                  </div>
                  <div>{billingStatus}</div>
                </div>
              )}

              {/* Compare table */}
              <div className="dense-table-container">
                <table className="dense-table">
                  <thead>
                    <tr>
                      <th>Capability</th>
                      <th>Free Standard</th>
                      <th>Pro Enterprise</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Cloud Integration Mappings</td>
                      <td>AWS Only</td>
                      <td className="text-blue-400 font-bold">AWS + Azure + GCP + OCI</td>
                    </tr>
                    <tr>
                      <td>Daily Scanning limit</td>
                      <td>100 events</td>
                      <td className="text-blue-400 font-bold">Unlimited Ingestion</td>
                    </tr>
                    <tr>
                      <td>ML Risk Engine</td>
                      <td>Random Forest Verdict</td>
                      <td className="text-blue-400 font-bold">RF + pgvector RAG Playbooks</td>
                    </tr>
                    <tr>
                      <td>Compliance Framework Maps</td>
                      <td>Basic posture score</td>
                      <td className="text-blue-400 font-bold">NIST CSF 2.0 / CIS / ISO 27001</td>
                    </tr>
                    <tr>
                      <td>Access Controls (RBAC)</td>
                      <td>None (Free account defaults)</td>
                      <td className="text-blue-400 font-bold">Admin/Analyst/User isolation</td>
                    </tr>
                    <tr>
                      <td>Monthly Cost</td>
                      <td>0 INR</td>
                      <td className="text-white font-bold">499 INR / month (Simulated)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>
      
      {/* Footer copyright */}
      <footer className="text-center text-[10px] text-gray-500 border-t border-slate-800 pt-3 mt-8">
        &copy; {new Date().getFullYear()} Generative AI Cloud Security Operations Control Center &bull; Low-Budget Self-Hosted Multi-Cloud Architecture Verified
      </footer>
    </div>
  );
}

export default App;
