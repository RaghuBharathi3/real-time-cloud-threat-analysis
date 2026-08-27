import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, ShieldAlert, AlertTriangle, Terminal, Cpu, Activity, Play, Pause,
  CheckCircle, XCircle, List, FileText, BarChart2, Server, Settings, 
  Key, User, Globe, RefreshCw, Send, Plus
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function App() {
  const [activeTab, setActiveTab] = useState('console');
  const [backendStatus, setBackendStatus] = useState('checking');
  
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
    user_id: "sec_operator",
    event_type: "resource_access",
    ip_address: "203.0.113.195",
    location: "US",
    failed_attempts: 0,
    resource: "s3_bucket_finance",
    request_frequency: 1
  });
  
  // Simulation Controller States
  const [isSimulating, setIsSimulating] = useState(false);
  const simulationTimer = useRef(null);

  // Load metrics & alerts
  useEffect(() => {
    // Generate initial custom event IDs
    generateCustomIds();
    checkHealth();
    fetchAlerts();
    fetchModelMetrics();
    
    const statusTimer = setInterval(checkHealth, 10000);
    return () => {
      clearInterval(statusTimer);
      if (simulationTimer.current) clearInterval(simulationTimer.current);
    };
  }, []);

  const generateCustomIds = () => {
    setCustomEvent(prev => ({
      ...prev,
      event_id: "EVT" + Math.floor(10000 + Math.random() * 90000),
      timestamp: new Date().toISOString().slice(0, 19)
    }));
  };

  const checkHealth = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/health`);
      setBackendStatus(res.ok ? 'online' : 'offline');
    } catch {
      setBackendStatus('offline');
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/alerts?limit=50`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
        if (data.length > 0 && !selectedAlert) {
          setSelectedAlert(data[0]);
        }
      }
    } catch (e) {
      console.error("Failed to load alerts list", e);
    }
  };

  const fetchModelMetrics = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/model/metrics`);
      if (res.ok) {
        const data = await res.json();
        setModelMetrics(data);
      }
    } catch (e) {
      console.error("Failed to fetch model metrics", e);
    }
  };

  const handleTrainModel = async () => {
    setIsTraining(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/model/train`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setModelMetrics(data.metrics);
      } else {
        alert("Model training failed. Make sure server is online.");
      }
    } catch (err) {
      alert("Error: Failed to reach model training endpoint.");
    } finally {
      setIsTraining(false);
    }
  };

  const handleSimulateNext = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/pipeline/simulate-next`, {
        method: 'POST'
      });
      if (res.ok) {
        const newAlert = await res.json();
        const formattedAlert = {
          event_id: newAlert.event_id,
          timestamp: newAlert.raw_event.timestamp,
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

        // Prepend and dedup by event_id
        setAlerts(prev => {
          const filtered = prev.filter(a => a.event_id !== formattedAlert.event_id);
          return [formattedAlert, ...filtered];
        });
        setSelectedAlert(formattedAlert);
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
      handleSimulateNext();
      simulationTimer.current = setInterval(handleSimulateNext, 3000);
    }
  };

  const handleCustomEventSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/pipeline/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customEvent)
      });
      if (res.ok) {
        const data = await res.json();
        const formattedAlert = {
          event_id: data.event_id,
          timestamp: data.raw_event.timestamp,
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
        
        // Regenerate Custom ID for next entry
        generateCustomIds();
        setActiveTab('console');
      } else {
        const err = await res.json();
        alert(`Ingestion failed: ${err.detail}`);
      }
    } catch (err) {
      alert("Error: Ingestion endpoint unreachable.");
    }
  };

  return (
    <div className="console-wrapper">
      
      {/* Console Top Header */}
      <header className="console-header">
        <div className="console-title-group">
          <h1>
            <Shield className="text-blue-500 w-5 h-5" />
            CLOUD SECURITY OPERATIONS CONSOLE
          </h1>
          <p>Generative AI-Powered Threat Analyzer Interface (Modules 1–3)</p>
        </div>

        {/* Connectivity status light */}
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded text-[11px] font-mono">
            <Server className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-gray-400">TARGET API:</span>
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
      </nav>

      {/* Main Tab Contents */}
      <main style={{ flexGrow: 1 }}>
        
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
                
                {/* Controller Player */}
                <button 
                  onClick={toggleSimulation}
                  className={`console-btn ${isSimulating ? 'console-btn-secondary' : 'console-btn-primary'} py-1 px-2.5 rounded text-[11px]`}
                >
                  {isSimulating ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  {isSimulating ? "PAUSE" : "SIMULATE"}
                </button>
              </div>

              {/* Status information banner */}
              <div className="bg-black/60 border border-slate-700 px-3 py-2 rounded text-[10px] font-mono text-gray-400 flex justify-between">
                <span className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isSimulating ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                  {isSimulating ? "STREAMING ACTIVE" : "STREAM STANDBY"}
                </span>
                <span>source: eval.csv</span>
              </div>

              {/* Scrolling event logs */}
              <div className="terminal-event-list">
                {alerts.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-[10px]">
                    NO EVENT LOGS DETECTED. CLICK SIMULATE.
                  </div>
                ) : (
                  alerts.map(alert => (
                    <button
                      key={alert.event_id}
                      onClick={() => setSelectedAlert(alert)}
                      className={`terminal-row ${selectedAlert?.event_id === alert.event_id ? 'active' : ''}`}
                    >
                      <div className="row-meta">
                        <span className="text-white font-bold">{alert.event_id}</span>
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
                  {/* Module 1 Ingest Log vs Module 2 engineered features side by side */}
                  <div className="console-card">
                    <div className="console-card-header">
                      <span className="console-card-title">
                        <Cpu className="text-purple-400 w-4 h-4" />
                        Log Inspection Diagnostics
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">ID: {selectedAlert.event_id}</span>
                    </div>

                    <div className="inspect-comparison-grid">
                      
                      {/* Left: Module 1 Raw values */}
                      <div>
                        <h4 className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5" />
                          Module 1: Raw Ingest Schema
                        </h4>
                        
                        <div className="console-code-block">
                          {JSON.stringify({
                            event_id: selectedAlert.event_id,
                            timestamp: selectedAlert.timestamp,
                            user_id: selectedAlert.user_id,
                            event_type: selectedAlert.event_type,
                            ip_address: selectedAlert.ip_address,
                            location: selectedAlert.location,
                            failed_attempts: selectedAlert.failed_attempts,
                            resource: selectedAlert.resource,
                            request_frequency: selectedAlert.request_frequency
                          }, null, 2)}
                        </div>
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
                                  {["s3_bucket_finance", "ec2_admin_portal", "iam_policy_manager", "kms_keys"].includes(selectedAlert.resource.toLowerCase()) ? 1 : 0}
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xxs)', gridColumn: 'span 2' }}>
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
            
            {/* Top widgets */}
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

                {/* Trainer control block */}
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
                    disabled={isTraining}
                    className={`console-btn console-btn-primary w-full ${isTraining ? 'console-btn-disabled' : ''}`}
                    style={{ marginTop: 'auto' }}
                  >
                    {isTraining ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    {isTraining ? "RE-FITTING FOREST..." : "RE-TRAIN ML CLASSIFIER"}
                  </button>
                </div>
              </>
            ) : (
              <div className="console-card md:col-span-3 py-16 text-center text-slate-500 flex flex-col items-center justify-center gap-4">
                <RefreshCw className="w-8 h-8 text-slate-700 animate-spin" />
                <p className="text-xs">MODEL DIAGNOSTICS ARE CURRENTLY UNINITIALIZED</p>
                <button 
                  onClick={handleTrainModel} 
                  className="console-btn console-btn-primary"
                >
                  Fit Classifier parameters
                </button>
              </div>
            )}

          </div>
        )}

      </main>
      
      {/* Footer copyright */}
      <footer className="text-center text-[10px] text-gray-500 border-t border-slate-800 pt-3">
        &copy; {new Date().getFullYear()} Generative AI Cloud Security Operations Control Center &bull; Phase 1 (Modules 1–3) Live
      </footer>
    </div>
  );
}

export default App;
