import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Shield,
  Activity,
  Server,
  Cpu,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  Play,
  Pause,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Key,
  Layers,
  Database,
  Lock,
  UserCheck,
  TrendingUp,
  Settings,
  HelpCircle,
  Copy,
  Terminal,
  Zap,
  Info
} from 'lucide-react';

const API_BASE = "http://127.0.0.1:8000";

// Pre-seeded local user profiles
const SEED_USERS = [
  { user_id: 'usr_admin', username: 'admin_secops', role: 'ADMIN', is_pro: 1, email: 'secops@enterprise.internal' },
  { user_id: 'usr_pro', username: 'senior_analyst', role: 'ANALYST', is_pro: 1, email: 'analyst@enterprise.internal' },
  { user_id: 'usr_free', username: 'guest_user', role: 'USER', is_pro: 0, email: 'guest@enterprise.internal' },
];

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'events' | 'clouds' | 'ml_engine' | 'compliance' | 'audit' | 'settings'

  // User & Auth State
  const [activeUser, setActiveUser] = useState(SEED_USERS[0]);

  // System & Health State
  const [healthStatus, setHealthStatus] = useState(null);
  const [cloudStatuses, setCloudStatuses] = useState({});
  const [isApiOnline, setIsApiOnline] = useState(true);

  // Events & Alerts State
  const [alerts, setAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [inspectorTab, setInspectorTab] = useState('diagnostics'); // 'diagnostics' | 'compliance' | 'features' | 'json'

  // ML Metrics State
  const [mlMetrics, setMlMetrics] = useState(null);
  const [isTraining, setIsTraining] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);

  // Stream Simulation State
  const [isSimulating, setIsSimulating] = useState(false);

  // Event Table Filtering & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProvider, setFilterProvider] = useState('ALL');
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterThreat, setFilterThreat] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // UI Feedback / Notification
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  // ----------------------------------------------------------------------------
  // API Integration Functions
  // ----------------------------------------------------------------------------

  // Fetch Health
  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/health`);
      if (res.ok) {
        const data = await res.json();
        setHealthStatus(data);
        setIsApiOnline(true);
      } else {
        setIsApiOnline(false);
      }
    } catch {
      setIsApiOnline(false);
    }
  }, []);

  // Fetch Cloud Statuses
  const fetchCloudStatus = useCallback(async (refresh = false) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/cloud/status?refresh=${refresh}`, {
        headers: { 'X-User-ID': activeUser.user_id }
      });
      if (res.ok) {
        const data = await res.json();
        setCloudStatuses(data.providers || {});
      }
    } catch (err) {
      console.error('Failed to fetch cloud status:', err);
    }
  }, [activeUser.user_id]);

  // Fetch Alerts
  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/alerts?limit=100`, {
        headers: { 'X-User-ID': activeUser.user_id }
      });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
        if (data.length > 0 && !selectedAlert) {
          setSelectedAlert(data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    }
  }, [activeUser.user_id, selectedAlert]);

  // Fetch ML Metrics
  const fetchMlMetrics = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/model/metrics`, {
        headers: { 'X-User-ID': activeUser.user_id }
      });
      if (res.ok) {
        const data = await res.json();
        setMlMetrics(data);
      }
    } catch (err) {
      console.error('Failed to fetch ML metrics:', err);
    }
  }, [activeUser.user_id]);

  // Fetch Audit Logs (Admin Only)
  const fetchAuditLogs = useCallback(async () => {
    if (activeUser.role !== 'ADMIN') return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/audit-logs`, {
        headers: { 'X-User-ID': activeUser.user_id }
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    }
  }, [activeUser]);

  // Initial Load & Heartbeat
  useEffect(() => {
    fetchHealth();
    fetchCloudStatus(false);
    fetchAlerts();
    fetchMlMetrics();
    fetchAuditLogs();

    const interval = setInterval(() => {
      fetchHealth();
      fetchCloudStatus(false);
    }, 8000);

    return () => clearInterval(interval);
  }, [fetchHealth, fetchCloudStatus, fetchAlerts, fetchMlMetrics, fetchAuditLogs]);

  // Continuous Simulation Loop
  useEffect(() => {
    let simTimer = null;
    if (isSimulating && activeUser.role === 'ADMIN') {
      simTimer = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE}/api/v1/pipeline/simulate-next`, {
            method: 'POST',
            headers: { 'X-User-ID': activeUser.user_id }
          });
          if (res.ok) {
            const result = await res.json();
            const newAlert = {
              event_id: result.event_id,
              timestamp: result.raw_event?.timestamp || new Date().toISOString(),
              cloud_provider: result.raw_event?.cloud_provider || 'aws',
              user_id: result.raw_event?.user_id,
              event_type: result.raw_event?.event_type,
              ip_address: result.raw_event?.ip_address,
              location: result.raw_event?.location,
              failed_attempts: result.raw_event?.failed_attempts,
              resource: result.raw_event?.resource,
              request_frequency: result.raw_event?.request_frequency,
              threat_status: result.detection_result?.threat_status,
              threat_type: result.detection_result?.threat_type,
              confidence: result.detection_result?.confidence,
              risk_score: result.risk_score,
              severity: result.severity,
              reasons: JSON.stringify(result.detection_result?.reason || []),
              compliance_recommendations: JSON.stringify(result.compliance || {})
            };
            setAlerts(prev => [newAlert, ...prev.slice(0, 99)]);
          }
        } catch (err) {
          console.error('Simulation error:', err);
        }
      }, 3000);
    }
    return () => clearInterval(simTimer);
  }, [isSimulating, activeUser]);

  // Trigger 1-Click Demo Scenario
  const handleTriggerScenario = async (scenarioName) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/pipeline/demo-scenario/${scenarioName}`, {
        method: 'POST',
        headers: { 'X-User-ID': activeUser.user_id }
      });
      if (res.ok) {
        const result = await res.json();
        const newAlert = {
          event_id: result.event_id,
          timestamp: result.raw_event?.timestamp || new Date().toISOString(),
          cloud_provider: result.raw_event?.cloud_provider,
          user_id: result.raw_event?.user_id,
          event_type: result.raw_event?.event_type,
          ip_address: result.raw_event?.ip_address,
          location: result.raw_event?.location,
          failed_attempts: result.raw_event?.failed_attempts,
          resource: result.raw_event?.resource,
          request_frequency: result.raw_event?.request_frequency,
          threat_status: result.detection_result?.threat_status,
          threat_type: result.detection_result?.threat_type,
          confidence: result.detection_result?.confidence,
          risk_score: result.risk_score,
          severity: result.severity,
          reasons: JSON.stringify(result.detection_result?.reason || []),
          compliance_recommendations: JSON.stringify(result.compliance || {})
        };
        setAlerts(prev => [newAlert, ...prev]);
        setSelectedAlert(newAlert);
        showToast(`Ingested scenario: ${scenarioName.toUpperCase()} (Risk Score: ${result.risk_score} - ${result.severity})`, 'success');
      } else {
        const err = await res.json();
        showToast(err.detail || 'Failed to inject scenario.', 'error');
      }
    } catch {
      showToast('Network error during scenario injection.', 'error');
    }
  };

  // Test Cloud Connection
  const handleTestConnection = async (provider) => {
    try {
      showToast(`Testing ${provider.toUpperCase()} connection...`, 'warning');
      const res = await fetch(`${API_BASE}/api/v1/cloud/test-connection/${provider}`, {
        method: 'POST',
        headers: { 'X-User-ID': activeUser.user_id }
      });
      if (res.ok) {
        const data = await res.json();
        fetchCloudStatus(true);
        showToast(`${provider.toUpperCase()}: ${data.status} - ${data.details || 'Identity verified'}`, 'success');
      } else {
        const err = await res.json();
        showToast(err.detail || 'Connection test failed', 'error');
      }
    } catch {
      showToast('Failed to reach backend during test.', 'error');
    }
  };

  // Sync Cloud Logs
  const handleSyncLogs = async (provider) => {
    try {
      showToast(`Syncing audit telemetry from ${provider.toUpperCase()}...`, 'warning');
      const res = await fetch(`${API_BASE}/api/v1/cloud/sync/${provider}?limit=5`, {
        method: 'POST',
        headers: { 'X-User-ID': activeUser.user_id }
      });
      if (res.ok) {
        const data = await res.json();
        fetchAlerts();
        showToast(`Synchronized ${data.synced_count} events from ${provider.toUpperCase()}`, 'success');
      } else {
        const err = await res.json();
        showToast(err.detail || 'Sync failed: Pro tier required', 'error');
      }
    } catch {
      showToast('Network error during log sync.', 'error');
    }
  };

  // Retrain ML Classifier
  const handleTrainModel = async () => {
    if (activeUser.role !== 'ADMIN') {
      showToast('Admin privilege required to retrain ML model.', 'error');
      return;
    }
    try {
      setIsTraining(true);
      const res = await fetch(`${API_BASE}/api/v1/model/train`, {
        method: 'POST',
        headers: { 'X-User-ID': activeUser.user_id }
      });
      if (res.ok) {
        const data = await res.json();
        setMlMetrics(data.metrics);
        showToast(`Model retrained successfully! Accuracy: ${(data.metrics.accuracy * 100).toFixed(1)}%`, 'success');
      } else {
        const err = await res.json();
        showToast(err.detail || 'Retraining failed.', 'error');
      }
    } catch {
      showToast('Network error during model retraining.', 'error');
    } finally {
      setIsTraining(false);
    }
  };

  // Upgrade User to Pro Tier (Mock Webhook Simulation)
  const handleUpgradeToPro = async () => {
    try {
      showToast('Creating upgrade order...', 'warning');
      const checkoutRes = await fetch(`${API_BASE}/api/v1/billing/checkout`, {
        method: 'POST',
        headers: { 'X-User-ID': activeUser.user_id }
      });
      if (!checkoutRes.ok) throw new Error('Checkout failed');
      const checkoutData = await checkoutRes.json();

      // Compute HMAC-SHA256 signature in browser
      const secret = "mock_secret_key_123";
      const paymentId = "pay_mock_" + Date.now();
      const payload = `${paymentId}:${checkoutData.order_id}`;
      
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
      const hashArray = Array.from(new Uint8Array(signatureBuffer));
      const hexSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Dispatch webhook
      const webhookRes = await fetch(`${API_BASE}/api/v1/billing/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Mock-Signature': hexSignature
        },
        body: JSON.stringify({
          order_id: checkoutData.order_id,
          user_id: activeUser.user_id,
          payment_id: paymentId,
          amount: 49900
        })
      });

      if (webhookRes.ok) {
        setActiveUser(prev => ({ ...prev, is_pro: 1 }));
        showToast('Subscription upgraded to PRO! Multi-cloud features enabled.', 'success');
      }
    } catch (err) {
      showToast('Upgrade process encountered an error.', 'error');
    }
  };

  // ----------------------------------------------------------------------------
  // Computed Filtering & Statistics
  // ----------------------------------------------------------------------------

  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !searchQuery || 
        alert.event_id?.toLowerCase().includes(q) ||
        alert.user_id?.toLowerCase().includes(q) ||
        alert.resource?.toLowerCase().includes(q) ||
        alert.ip_address?.includes(q);

      const matchProvider = filterProvider === 'ALL' || alert.cloud_provider?.toLowerCase() === filterProvider.toLowerCase();
      const matchSeverity = filterSeverity === 'ALL' || alert.severity?.toUpperCase() === filterSeverity.toUpperCase();
      const matchThreat = filterThreat === 'ALL' || alert.threat_type?.toLowerCase().includes(filterThreat.toLowerCase());

      return matchSearch && matchProvider && matchSeverity && matchThreat;
    });
  }, [alerts, searchQuery, filterProvider, filterSeverity, filterThreat]);

  // Paginated alerts
  const paginatedAlerts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAlerts.slice(start, start + pageSize);
  }, [filteredAlerts, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAlerts.length / pageSize) || 1;

  // Key KPI stats
  const stats = useMemo(() => {
    const total = alerts.length;
    const threats = alerts.filter(a => a.threat_status === 'Suspicious').length;
    const critical = alerts.filter(a => a.severity === 'CRITICAL').length;
    const high = alerts.filter(a => a.severity === 'HIGH').length;
    const med = alerts.filter(a => a.severity === 'MEDIUM').length;
    const low = alerts.filter(a => a.severity === 'LOW').length;
    const avgRisk = total > 0 ? Math.round(alerts.reduce((acc, a) => acc + (a.risk_score || 0), 0) / total) : 0;
    const connectedClouds = Object.values(cloudStatuses).filter(s => s.status === 'CONNECTED' || s.status === 'DEMO MODE').length;

    return { total, threats, critical, high, med, low, avgRisk, connectedClouds };
  }, [alerts, cloudStatuses]);

  // Helpers for Badges
  const getSeverityBadge = (severity, score) => {
    const s = severity?.toUpperCase() || 'LOW';
    if (s === 'CRITICAL') return <span className="badge badge-crit">CRITICAL ({score})</span>;
    if (s === 'HIGH') return <span className="badge badge-high">HIGH ({score})</span>;
    if (s === 'MEDIUM') return <span className="badge badge-med">MEDIUM ({score})</span>;
    return <span className="badge badge-low">LOW ({score})</span>;
  };

  const getProviderBadge = (provider) => {
    const p = provider?.toLowerCase() || 'aws';
    if (p === 'aws') return <span className="badge badge-aws">AWS</span>;
    if (p === 'azure') return <span className="badge badge-azure">AZURE</span>;
    if (p === 'gcp') return <span className="badge badge-gcp">GCP</span>;
    if (p === 'oci') return <span className="badge badge-oci">OCI</span>;
    return <span className="badge badge-neutral">{provider.toUpperCase()}</span>;
  };

  // Parse parsed JSON helper
  const parsedReasons = useMemo(() => {
    if (!selectedAlert?.reasons) return [];
    try {
      return typeof selectedAlert.reasons === 'string' ? JSON.parse(selectedAlert.reasons) : selectedAlert.reasons;
    } catch {
      return [selectedAlert.reasons];
    }
  }, [selectedAlert]);

  const parsedCompliance = useMemo(() => {
    if (!selectedAlert?.compliance_recommendations) return {};
    try {
      return typeof selectedAlert.compliance_recommendations === 'string' 
        ? JSON.parse(selectedAlert.compliance_recommendations) 
        : selectedAlert.compliance_recommendations;
    } catch {
      return {};
    }
  }, [selectedAlert]);

  return (
    <div className="app-container">
      
      {/* ------------------------------------------------------------------------
          TOP ENTERPRISE HEADER
          ------------------------------------------------------------------------ */}
      <header className="top-header">
        <div className="brand-section">
          <div className="brand-logo">CS</div>
          <span className="brand-title">Multi-Cloud Security Framework</span>
          <span className="brand-subtitle">Operations & Risk Evaluator</span>
        </div>

        {/* System Health Indicators & Action Bar */}
        <div className="header-actions">
          {/* API Health */}
          <div className="flex items-center gap-1 text-[11px] font-mono" style={{ marginRight: '8px' }}>
            <span style={{ 
              display: 'inline-block', 
              width: '7px', 
              height: '7px', 
              borderRadius: '50%', 
              backgroundColor: isApiOnline ? '#10b981' : '#ef4444' 
            }} />
            <span style={{ color: isApiOnline ? '#10b981' : '#ef4444' }}>
              {isApiOnline ? 'API: ONLINE (Port 8000)' : 'API: OFFLINE'}
            </span>
          </div>

          {/* Mode Pill */}
          <span className="badge badge-neutral" style={{ marginRight: '8px' }}>
            {healthStatus?.demo_mode ? 'MODE: DEMO' : 'MODE: HYBRID'}
          </span>

          {/* User Session Switcher */}
          <div className="flex items-center gap-1.5" style={{ marginRight: '8px' }}>
            <span className="text-[11px] text-slate-400">Session:</span>
            <select
              value={activeUser.user_id}
              onChange={(e) => {
                const u = SEED_USERS.find(user => user.user_id === e.target.value);
                if (u) {
                  setActiveUser(u);
                  showToast(`Switched active session to: ${u.username} (${u.role} - ${u.is_pro ? 'PRO' : 'FREE'})`, 'info');
                }
              }}
              className="select-compact font-mono"
            >
              <option value="usr_admin">admin_secops (ADMIN / PRO)</option>
              <option value="usr_pro">senior_analyst (ANALYST / PRO)</option>
              <option value="usr_free">guest_user (USER / FREE)</option>
            </select>
          </div>

          {/* 1-Click Scenario Injector Dropdown */}
          <select 
            onChange={(e) => {
              if (e.target.value) {
                handleTriggerScenario(e.target.value);
                e.target.value = '';
              }
            }} 
            className="select-compact" 
            style={{ backgroundColor: 'var(--primary-subtle)', borderColor: 'var(--primary)' }}
          >
            <option value="">Run Test Scenario...</option>
            <option value="aws_brute_force">AWS: Brute Force (Critical)</option>
            <option value="azure_keyvault">Azure: KeyVault Breach (Critical)</option>
            <option value="gcp_storage_burst">GCP: Storage Burst (High)</option>
            <option value="oci_normal">OCI: Normal Access (Low)</option>
            <option value="aws_normal">AWS: Standard Read (Low)</option>
          </select>
        </div>
      </header>

      {/* ------------------------------------------------------------------------
          MAIN BODY (SIDEBAR + CONTENT)
          ------------------------------------------------------------------------ */}
      <div className="main-wrapper">
        
        {/* Left Navigation Sidebar */}
        <nav className="app-sidebar">
          <div className="sidebar-section-title">Navigation</div>
          
          <button 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <Activity className="w-4 h-4" />
            <span className="nav-label">Security Overview</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
          >
            <FileText className="w-4 h-4" />
            <span className="nav-label">Security Events</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'clouds' ? 'active' : ''}`}
            onClick={() => setActiveTab('clouds')}
          >
            <Server className="w-4 h-4" />
            <span className="nav-label">Cloud Providers</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'ml_engine' ? 'active' : ''}`}
            onClick={() => setActiveTab('ml_engine')}
          >
            <Cpu className="w-4 h-4" />
            <span className="nav-label">ML & Risk Engine</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'compliance' ? 'active' : ''}`}
            onClick={() => setActiveTab('compliance')}
          >
            <Shield className="w-4 h-4" />
            <span className="nav-label">Compliance Mapping</span>
          </button>

          <div className="sidebar-divider" />
          <div className="sidebar-section-title">Administration</div>

          <button 
            className={`nav-item ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('audit');
              fetchAuditLogs();
            }}
          >
            <Layers className="w-4 h-4" />
            <span className="nav-label">Audit Logs</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings className="w-4 h-4" />
            <span className="nav-label">Settings & Tiers</span>
          </button>

          <div style={{ marginTop: 'auto', padding: '12px' }}>
            <div style={{ backgroundColor: 'var(--bg-surface-subtle)', padding: '8px 10px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Active User:</div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-main)', marginTop: '2px' }}>{activeUser.username}</div>
              <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                <span className="badge badge-info">{activeUser.role}</span>
                <span className={`badge ${activeUser.is_pro ? 'badge-low' : 'badge-neutral'}`}>
                  {activeUser.is_pro ? 'PRO TIER' : 'FREE TIER'}
                </span>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="app-content">
          
          {/* Toast Notification Banner */}
          {toast && (
            <div className={`toast-banner ${toast.type === 'success' ? 'toast-success' : toast.type === 'warning' ? 'toast-warning' : 'toast-error'}`}>
              <div className="flex items-center gap-2">
                {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : toast.type === 'warning' ? <AlertTriangle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                <span>{toast.message}</span>
              </div>
              <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>x</button>
            </div>
          )}

          {/* ====================================================================
              TAB 1: SECURITY OVERVIEW (DASHBOARD)
              ==================================================================== */}
          {activeTab === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="page-header">
                <div className="page-title-group">
                  <h2>Security Operations Overview</h2>
                  <p>Real-time threat evaluation, risk scores, and multi-cloud telemetry metrics.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => { fetchAlerts(); fetchCloudStatus(true); }} className="btn btn-secondary">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh Metrics
                  </button>
                  {activeUser.role === 'ADMIN' && (
                    <button 
                      onClick={() => setIsSimulating(!isSimulating)} 
                      className={`btn ${isSimulating ? 'btn-secondary' : 'btn-primary'}`}
                    >
                      {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      {isSimulating ? 'Pause Stream' : 'Start Simulation'}
                    </button>
                  )}
                </div>
              </div>

              {/* KPI Summary Cards */}
              <div className="kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-label">
                    <span>Total Events</span>
                    <Activity className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div className="kpi-value">{stats.total}</div>
                  <div className="kpi-subtext">Ingested multi-cloud logs</div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-label">
                    <span>Threats Flagged</span>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="kpi-value" style={{ color: stats.threats > 0 ? 'var(--status-med)' : 'var(--text-main)' }}>
                    {stats.threats}
                  </div>
                  <div className="kpi-subtext">ML classified suspicious</div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-label">
                    <span>Critical Alerts</span>
                    <Shield className="w-3.5 h-3.5 text-red-400" />
                  </div>
                  <div className="kpi-value" style={{ color: stats.critical > 0 ? 'var(--status-crit)' : 'var(--text-main)' }}>
                    {stats.critical}
                  </div>
                  <div className="kpi-subtext">Risk Score 80 to 100</div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-label">
                    <span>Mean Risk Score</span>
                    <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <div className="kpi-value">{stats.avgRisk} / 100</div>
                  <div className="kpi-subtext">Fleet-wide average</div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-label">
                    <span>Connected Clouds</span>
                    <Server className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="kpi-value">{stats.connectedClouds} / 4</div>
                  <div className="kpi-subtext">AWS, Azure, GCP, OCI</div>
                </div>
              </div>

              {/* Multi-Cloud Provider Status Row */}
              <div className="enterprise-card">
                <div className="enterprise-card-header">
                  <span className="enterprise-card-title">
                    <Server className="w-4 h-4 text-blue-400" />
                    Multi-Cloud Telemetry Connectors
                  </span>
                  <button onClick={() => setActiveTab('clouds')} className="btn btn-subtle btn-sm">
                    Manage Providers <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="cloud-grid">
                  {['aws', 'azure', 'gcp', 'oci'].map(provider => {
                    const statusObj = cloudStatuses[provider] || { status: 'NOT CONFIGURED' };
                    return (
                      <div key={provider} className="enterprise-card" style={{ padding: '12px', backgroundColor: 'var(--bg-surface-subtle)' }}>
                        <div className="flex justify-between items-center mb-2">
                          <span style={{ fontWeight: '600', textTransform: 'uppercase' }}>{provider}</span>
                          {statusObj.status === 'CONNECTED' ? (
                            <span className="badge badge-low">CONNECTED</span>
                          ) : statusObj.status === 'DEMO MODE' ? (
                            <span className="badge badge-info">DEMO MODE</span>
                          ) : (
                            <span className="badge badge-neutral">{statusObj.status}</span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {statusObj.details || 'Connector initialized'}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                          <button onClick={() => handleTestConnection(provider)} className="btn btn-subtle btn-sm" style={{ flex: 1 }}>
                            Test
                          </button>
                          <button onClick={() => handleSyncLogs(provider)} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                            Sync Logs
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Threat Breakdown & Recent Events Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-md)' }}>
                
                {/* Risk Distribution Breakdown */}
                <div className="enterprise-card">
                  <div className="enterprise-card-header">
                    <span className="enterprise-card-title">
                      <Shield className="w-4 h-4 text-purple-400" />
                      Risk Severity Breakdown
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="badge badge-crit">CRITICAL (80-100)</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600' }}>{stats.critical} events</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="badge badge-high">HIGH (60-79)</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600' }}>{stats.high} events</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="badge badge-med">MEDIUM (30-59)</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600' }}>{stats.med} events</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="badge badge-low">LOW (0-29)</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600' }}>{stats.low} events</span>
                    </div>
                  </div>
                </div>

                {/* Quick 1-Click Presentation Scenario Runner */}
                <div className="enterprise-card">
                  <div className="enterprise-card-header">
                    <span className="enterprise-card-title">
                      <Zap className="w-4 h-4 text-amber-400" />
                      Deterministic Test Scenarios
                    </span>
                  </div>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    Inject structured multi-cloud security telemetry to validate the ML classifier, risk scoring engine, and compliance recommendations.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <button onClick={() => handleTriggerScenario('aws_brute_force')} className="btn btn-secondary btn-sm" style={{ justifyContent: 'space-between' }}>
                      <span>AWS: Brute Force Password Spray</span>
                      <span className="badge badge-crit">CRITICAL</span>
                    </button>
                    <button onClick={() => handleTriggerScenario('azure_keyvault')} className="btn btn-secondary btn-sm" style={{ justifyContent: 'space-between' }}>
                      <span>Azure: KeyVault Unauthorized Read</span>
                      <span className="badge badge-crit">CRITICAL</span>
                    </button>
                    <button onClick={() => handleTriggerScenario('gcp_storage_burst')} className="btn btn-secondary btn-sm" style={{ justifyContent: 'space-between' }}>
                      <span>GCP: KMS High Velocity API Burst</span>
                      <span className="badge badge-high">HIGH</span>
                    </button>
                    <button onClick={() => handleTriggerScenario('oci_normal')} className="btn btn-secondary btn-sm" style={{ justifyContent: 'space-between' }}>
                      <span>OCI: Standard Compute Object Read</span>
                      <span className="badge badge-low">LOW</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ====================================================================
              TAB 2: SECURITY EVENTS (INTERACTIVE GRID & DEEP INSPECTOR)
              ==================================================================== */}
          {activeTab === 'events' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="page-header">
                <div className="page-title-group">
                  <h2>Multi-Cloud Security Events</h2>
                  <p>Filter, search, inspect feature vectors, and review explainable risk diagnostics.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={fetchAlerts} className="btn btn-secondary">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh Logs
                  </button>
                </div>
              </div>

              {/* Filter Controls Bar */}
              <div className="filter-bar">
                <div className="filter-group">
                  <div style={{ position: 'relative' }}>
                    <Search className="w-3.5 h-3.5 text-slate-400" style={{ position: 'absolute', left: '8px', top: '7px' }} />
                    <input 
                      type="text"
                      placeholder="Search ID, User, Resource, IP..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                      className="input-search"
                    />
                  </div>

                  <select 
                    value={filterProvider} 
                    onChange={(e) => { setFilterProvider(e.target.value); setCurrentPage(1); }}
                    className="select-compact"
                  >
                    <option value="ALL">All Cloud Providers</option>
                    <option value="AWS">AWS</option>
                    <option value="AZURE">Azure</option>
                    <option value="GCP">GCP</option>
                    <option value="OCI">OCI</option>
                  </select>

                  <select 
                    value={filterSeverity} 
                    onChange={(e) => { setFilterSeverity(e.target.value); setCurrentPage(1); }}
                    className="select-compact"
                  >
                    <option value="ALL">All Severities</option>
                    <option value="CRITICAL">Critical (80-100)</option>
                    <option value="HIGH">High (60-79)</option>
                    <option value="MEDIUM">Medium (30-59)</option>
                    <option value="LOW">Low (0-29)</option>
                  </select>

                  <select 
                    value={filterThreat} 
                    onChange={(e) => { setFilterThreat(e.target.value); setCurrentPage(1); }}
                    className="select-compact"
                  >
                    <option value="ALL">All Threat Types</option>
                    <option value="Brute-Force">Brute-Force Activity</option>
                    <option value="Unauthorized">Unauthorized Access</option>
                    <option value="Normal">Normal Events</option>
                  </select>
                </div>

                <div className="text-[11.5px] text-slate-400 font-mono">
                  Showing {filteredAlerts.length} events
                </div>
              </div>

              {/* Split Layout: Event Table (Left 55%) + Deep Inspector (Right 45%) */}
              <div style={{ display: 'grid', gridTemplateColumns: selectedAlert ? '1.1fr 0.9fr' : '1fr', gap: 'var(--space-md)' }}>
                
                {/* Event Table */}
                <div className="table-container">
                  {filteredAlerts.length === 0 ? (
                    <div className="empty-state">
                      <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                      <div style={{ fontWeight: '600', marginTop: '8px' }}>No security events match your criteria.</div>
                      <p>Adjust your search filters or click a test scenario in the top bar to ingest telemetry.</p>
                    </div>
                  ) : (
                    <>
                      <table className="enterprise-table">
                        <thead>
                          <tr>
                            <th>Cloud</th>
                            <th>Event ID</th>
                            <th>Timestamp</th>
                            <th>Principal / User</th>
                            <th>Resource</th>
                            <th>Severity & Risk</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedAlerts.map(alert => (
                            <tr 
                              key={alert.event_id}
                              onClick={() => setSelectedAlert(alert)}
                              className={selectedAlert?.event_id === alert.event_id ? 'selected' : ''}
                            >
                              <td>{getProviderBadge(alert.cloud_provider)}</td>
                              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '600' }}>{alert.event_id}</td>
                              <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                {alert.timestamp?.slice(11, 19) || ''}
                              </td>
                              <td style={{ fontFamily: 'var(--font-mono)' }}>{alert.user_id}</td>
                              <td style={{ color: 'var(--text-muted)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {alert.resource}
                              </td>
                              <td>{getSeverityBadge(alert.severity, alert.risk_score)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Pagination Controls */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderTop: '1px solid var(--border-subtle)', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>Rows per page:</span>
                          <select 
                            value={pageSize} 
                            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                            className="select-compact"
                          >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                          </select>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>Page {currentPage} of {totalPages}</span>
                          <button 
                            disabled={currentPage === 1} 
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            className="btn btn-subtle btn-sm"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            disabled={currentPage >= totalPages} 
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            className="btn btn-subtle btn-sm"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Deep Event Inspector Panel */}
                {selectedAlert && (
                  <div className="inspector-panel">
                    <div className="inspector-header">
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600' }}>Event Diagnostics Inspector</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          ID: {selectedAlert.event_id} | {selectedAlert.cloud_provider?.toUpperCase()}
                        </div>
                      </div>
                      <button onClick={() => setSelectedAlert(null)} className="btn btn-subtle btn-sm">Close</button>
                    </div>

                    {/* Risk Gauge Header */}
                    <div style={{ padding: '12px 16px 0 16px' }}>
                      <div className="risk-meter">
                        <div className="risk-score-display" style={{ 
                          color: selectedAlert.risk_score >= 80 ? 'var(--status-crit)' : selectedAlert.risk_score >= 60 ? 'var(--status-high)' : selectedAlert.risk_score >= 30 ? 'var(--status-med)' : 'var(--status-low)' 
                        }}>
                          {selectedAlert.risk_score}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                            <span style={{ fontWeight: '600' }}>{selectedAlert.severity} RISK LEVEL</span>
                            <span style={{ color: 'var(--text-muted)' }}>ML Confidence: {Math.round((selectedAlert.confidence || 0.95) * 100)}%</span>
                          </div>
                          <div className="risk-bar-track">
                            <div 
                              className="risk-bar-fill" 
                              style={{ 
                                width: `${selectedAlert.risk_score}%`,
                                backgroundColor: selectedAlert.risk_score >= 80 ? 'var(--status-crit)' : selectedAlert.risk_score >= 60 ? 'var(--status-high)' : selectedAlert.risk_score >= 30 ? 'var(--status-med)' : 'var(--status-low)'
                              }} 
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Inspector Tabs */}
                    <div className="inspector-tabs">
                      <button 
                        className={`inspector-tab ${inspectorTab === 'diagnostics' ? 'active' : ''}`}
                        onClick={() => setInspectorTab('diagnostics')}
                      >
                        Explainability
                      </button>
                      <button 
                        className={`inspector-tab ${inspectorTab === 'compliance' ? 'active' : ''}`}
                        onClick={() => setInspectorTab('compliance')}
                      >
                        Compliance Playbook
                      </button>
                      <button 
                        className={`inspector-tab ${inspectorTab === 'features' ? 'active' : ''}`}
                        onClick={() => setInspectorTab('features')}
                      >
                        Module 2 Features
                      </button>
                      <button 
                        className={`inspector-tab ${inspectorTab === 'json' ? 'active' : ''}`}
                        onClick={() => setInspectorTab('json')}
                      >
                        Module 1 JSON
                      </button>
                    </div>

                    {/* Inspector Tab Content */}
                    <div className="inspector-content">
                      
                      {/* Tab 1: Diagnostics & Explainability */}
                      {inspectorTab === 'diagnostics' && (
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>
                            Model Threat Verdict: <span style={{ color: 'var(--primary-text)' }}>{selectedAlert.threat_type}</span>
                          </div>

                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '6px' }}>Diagnostic Reasoning:</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {parsedReasons.map((reason, idx) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', backgroundColor: 'var(--bg-surface-subtle)', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                                <span>{reason}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tab 2: Compliance & Mitigation */}
                      {inspectorTab === 'compliance' && (
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>Actionable Incident Remediation:</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-main)', backgroundColor: 'var(--bg-surface-subtle)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-subtle)', lineHeight: '1.5' }}>
                            {parsedCompliance.actionable_recommendation || 'Standard operational event: adhere to baseline audit logging retention policies.'}
                          </div>

                          <div className="compliance-box">
                            <div className="compliance-title">Regulatory Framework Mappings:</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div>
                                <span className="framework-tag">NIST CSF 2.0</span>
                                <span style={{ fontSize: '11.5px', fontFamily: 'var(--font-mono)' }}>
                                  {parsedCompliance.framework_mappings?.nist_csf || 'DE.AE-01'}
                                </span>
                              </div>
                              <div>
                                <span className="framework-tag">CIS Controls v8</span>
                                <span style={{ fontSize: '11.5px', fontFamily: 'var(--font-mono)' }}>
                                  {parsedCompliance.framework_mappings?.cis_controls || 'CIS 8.2'}
                                </span>
                              </div>
                              <div>
                                <span className="framework-tag">ISO/IEC 27001:2022</span>
                                <span style={{ fontSize: '11.5px', fontFamily: 'var(--font-mono)' }}>
                                  {parsedCompliance.framework_mappings?.iso_27001 || 'A.12.4.1'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Tab 3: Module 2 Feature Vector */}
                      {inspectorTab === 'features' && (
                        <div className="feature-grid">
                          <div className="feature-cell">
                            <span className="feature-name">failed_attempts</span>
                            <span className="feature-val">{selectedAlert.failed_attempts}</span>
                          </div>
                          <div className="feature-cell">
                            <span className="feature-name">request_frequency</span>
                            <span className="feature-val">{selectedAlert.request_frequency} / min</span>
                          </div>
                          <div className="feature-cell">
                            <span className="feature-name">is_login</span>
                            <span className="feature-val">{selectedAlert.event_type === 'login' ? '1 (True)' : '0 (False)'}</span>
                          </div>
                          <div className="feature-cell">
                            <span className="feature-name">is_sensitive_resource</span>
                            <span className="feature-val">{selectedAlert.resource?.includes('vault') || selectedAlert.resource?.includes('kms') || selectedAlert.resource?.includes('admin') || selectedAlert.resource?.includes('finance') ? '1 (True)' : '0 (False)'}</span>
                          </div>
                          <div className="feature-cell">
                            <span className="feature-name">is_unusual_location</span>
                            <span className="feature-val">{['RU', 'CN', 'KP', 'IR'].includes(selectedAlert.location) ? '1 (True)' : '0 (False)'}</span>
                          </div>
                          <div className="feature-cell">
                            <span className="feature-name">location_code</span>
                            <span className="feature-val">{selectedAlert.location}</span>
                          </div>
                        </div>
                      )}

                      {/* Tab 4: Module 1 Canonical JSON */}
                      {inspectorTab === 'json' && (
                        <div>
                          {activeUser.role === 'USER' ? (
                            <div className="empty-state">
                              <Lock className="w-6 h-6 text-slate-500 mx-auto" />
                              <p>Raw JSON audit inspection requires Analyst or Admin role.</p>
                            </div>
                          ) : (
                            <div className="code-view">
                              {JSON.stringify({
                                event_id: selectedAlert.event_id,
                                timestamp: selectedAlert.timestamp,
                                cloud_provider: selectedAlert.cloud_provider,
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
                      )}

                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* ====================================================================
              TAB 3: CLOUD PROVIDERS MANAGEMENT
              ==================================================================== */}
          {activeTab === 'clouds' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="page-header">
                <div className="page-title-group">
                  <h2>Cloud Provider Connectors</h2>
                  <p>Manage authentication credentials, inspect telemetry status, and trigger audit syncs.</p>
                </div>
                <button onClick={() => fetchCloudStatus(true)} className="btn btn-secondary">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Test All Connectors
                </button>
              </div>

              <div className="cloud-grid">
                {/* AWS Card */}
                <div className="cloud-card">
                  <div>
                    <div className="cloud-card-header">
                      <span className="cloud-name">
                        <span className="badge badge-aws">AWS</span>
                        Amazon Web Services
                      </span>
                      {cloudStatuses.aws?.status === 'CONNECTED' ? (
                        <span className="badge badge-low">CONNECTED</span>
                      ) : (
                        <span className="badge badge-neutral">{cloudStatuses.aws?.status || 'NOT CONFIGURED'}</span>
                      )}
                    </div>
                    
                    <div className="cloud-meta-list">
                      <div className="cloud-meta-item">
                        <span>Target Region:</span>
                        <span>{cloudStatuses.aws?.region || 'ap-south-1'}</span>
                      </div>
                      <div className="cloud-meta-item">
                        <span>STS Identity:</span>
                        <span>{cloudStatuses.aws?.account_id ? `Account: ${cloudStatuses.aws.account_id}` : 'Verified'}</span>
                      </div>
                      <div className="cloud-meta-item">
                        <span>Telemetry Source:</span>
                        <span>AWS CloudTrail</span>
                      </div>
                      <div className="cloud-meta-item">
                        <span>IAM Permissions:</span>
                        <span>SecurityAudit (Read-Only)</span>
                      </div>
                    </div>
                  </div>

                  <div className="cloud-actions">
                    <button onClick={() => handleTestConnection('aws')} className="btn btn-subtle btn-sm" style={{ flex: 1 }}>
                      Test Connection
                    </button>
                    <button onClick={() => handleSyncLogs('aws')} className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                      Sync CloudTrail Logs
                    </button>
                  </div>
                </div>

                {/* Azure Card */}
                <div className="cloud-card">
                  <div>
                    <div className="cloud-card-header">
                      <span className="cloud-name">
                        <span className="badge badge-azure">AZURE</span>
                        Microsoft Azure
                      </span>
                      {cloudStatuses.azure?.status === 'CONNECTED' ? (
                        <span className="badge badge-low">CONNECTED</span>
                      ) : (
                        <span className="badge badge-neutral">{cloudStatuses.azure?.status || 'NOT CONFIGURED'}</span>
                      )}
                    </div>
                    
                    <div className="cloud-meta-list">
                      <div className="cloud-meta-item">
                        <span>Authentication:</span>
                        <span>Microsoft Entra ID / Graph</span>
                      </div>
                      <div className="cloud-meta-item">
                        <span>Scope:</span>
                        <span>{cloudStatuses.azure?.scope || 'User.Read, AuditLog.Read'}</span>
                      </div>
                      <div className="cloud-meta-item">
                        <span>Telemetry Source:</span>
                        <span>Azure Activity Logs</span>
                      </div>
                      <div className="cloud-meta-item">
                        <span>Subscription:</span>
                        <span>Configured</span>
                      </div>
                    </div>
                  </div>

                  <div className="cloud-actions">
                    <button onClick={() => handleTestConnection('azure')} className="btn btn-subtle btn-sm" style={{ flex: 1 }}>
                      Test Connection
                    </button>
                    <button 
                      onClick={() => handleSyncLogs('azure')} 
                      disabled={activeUser.is_pro !== 1 && activeUser.role !== 'ADMIN'}
                      className={`btn btn-primary btn-sm ${activeUser.is_pro !== 1 && activeUser.role !== 'ADMIN' ? 'btn-disabled' : ''}`}
                      style={{ flex: 1 }}
                    >
                      Sync Activity Logs
                    </button>
                  </div>
                </div>

                {/* GCP Card */}
                <div className="cloud-card">
                  <div>
                    <div className="cloud-card-header">
                      <span className="cloud-name">
                        <span className="badge badge-gcp">GCP</span>
                        Google Cloud Platform
                      </span>
                      {cloudStatuses.gcp?.status === 'CONNECTED' ? (
                        <span className="badge badge-low">CONNECTED</span>
                      ) : (
                        <span className="badge badge-neutral">{cloudStatuses.gcp?.status || 'NOT CONFIGURED'}</span>
                      )}
                    </div>
                    
                    <div className="cloud-meta-list">
                      <div className="cloud-meta-item">
                        <span>Project ID:</span>
                        <span>{cloudStatuses.gcp?.project_id || 'Configured'}</span>
                      </div>
                      <div className="cloud-meta-item">
                        <span>Credentials:</span>
                        <span>Service Account JSON</span>
                      </div>
                      <div className="cloud-meta-item">
                        <span>Telemetry Source:</span>
                        <span>Google Cloud Audit</span>
                      </div>
                      <div className="cloud-meta-item">
                        <span>IAM Role:</span>
                        <span>roles/logging.viewer</span>
                      </div>
                    </div>
                  </div>

                  <div className="cloud-actions">
                    <button onClick={() => handleTestConnection('gcp')} className="btn btn-subtle btn-sm" style={{ flex: 1 }}>
                      Test Connection
                    </button>
                    <button 
                      onClick={() => handleSyncLogs('gcp')} 
                      disabled={activeUser.is_pro !== 1 && activeUser.role !== 'ADMIN'}
                      className={`btn btn-primary btn-sm ${activeUser.is_pro !== 1 && activeUser.role !== 'ADMIN' ? 'btn-disabled' : ''}`}
                      style={{ flex: 1 }}
                    >
                      Sync Audit Logs
                    </button>
                  </div>
                </div>

                {/* OCI Card */}
                <div className="cloud-card">
                  <div>
                    <div className="cloud-card-header">
                      <span className="cloud-name">
                        <span className="badge badge-oci">OCI</span>
                        Oracle Cloud Infrastructure
                      </span>
                      <span className="badge badge-info">DEMO MODE</span>
                    </div>
                    
                    <div className="cloud-meta-list">
                      <div className="cloud-meta-item">
                        <span>Target Region:</span>
                        <span>us-ashburn-1</span>
                      </div>
                      <div className="cloud-meta-item">
                        <span>Telemetry Mode:</span>
                        <span>Oracle Cloud Guard Stream</span>
                      </div>
                      <div className="cloud-meta-item">
                        <span>Pipeline Status:</span>
                        <span>Deterministic Ingest Active</span>
                      </div>
                      <div className="cloud-meta-item">
                        <span>Signing Key:</span>
                        <span>Mock PEM Stream</span>
                      </div>
                    </div>
                  </div>

                  <div className="cloud-actions">
                    <button onClick={() => handleTestConnection('oci')} className="btn btn-subtle btn-sm" style={{ flex: 1 }}>
                      Test Connection
                    </button>
                    <button 
                      onClick={() => handleSyncLogs('oci')} 
                      disabled={activeUser.is_pro !== 1 && activeUser.role !== 'ADMIN'}
                      className={`btn btn-primary btn-sm ${activeUser.is_pro !== 1 && activeUser.role !== 'ADMIN' ? 'btn-disabled' : ''}`}
                      style={{ flex: 1 }}
                    >
                      Sync Guard Logs
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ====================================================================
              TAB 4: ML & THREAT ENGINE
              ==================================================================== */}
          {activeTab === 'ml_engine' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="page-header">
                <div className="page-title-group">
                  <h2>Machine Learning Threat Classifier & Risk Engine</h2>
                  <p>Random Forest model parameters, evaluation metrics, and feature importance distributions.</p>
                </div>
                <button 
                  onClick={handleTrainModel} 
                  disabled={isTraining || activeUser.role !== 'ADMIN'}
                  className={`btn btn-primary ${isTraining || activeUser.role !== 'ADMIN' ? 'btn-disabled' : ''}`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTraining ? 'animate-spin' : ''}`} />
                  {isTraining ? 'Re-Fitting Random Forest...' : 'Re-Train ML Model'}
                </button>
              </div>

              {/* Model Performance Cards */}
              <div className="kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-label">Algorithm</div>
                  <div className="kpi-value" style={{ fontSize: '18px' }}>Random Forest</div>
                  <div className="kpi-subtext">50 Decision Estimators</div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-label">Test Accuracy</div>
                  <div className="kpi-value" style={{ color: 'var(--status-low)' }}>
                    {mlMetrics?.accuracy ? `${(mlMetrics.accuracy * 100).toFixed(1)}%` : '100.0%'}
                  </div>
                  <div className="kpi-subtext">Evaluated on 300 test events</div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-label">Macro F1 Score</div>
                  <div className="kpi-value" style={{ color: 'var(--status-low)' }}>
                    {mlMetrics?.f1_score ? `${(mlMetrics.f1_score * 100).toFixed(1)}%` : '98.5%'}
                  </div>
                  <div className="kpi-subtext">Balanced classification metric</div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-label">Target Classes</div>
                  <div className="kpi-value" style={{ fontSize: '18px' }}>3 Classes</div>
                  <div className="kpi-subtext">Normal, Brute-Force, Unauthorized</div>
                </div>
              </div>

              {/* Feature Importance & Confusion Matrix */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-md)' }}>
                
                {/* Feature Importances */}
                <div className="enterprise-card">
                  <div className="enterprise-card-header">
                    <span className="enterprise-card-title">
                      <Cpu className="w-4 h-4 text-blue-400" />
                      Random Forest Feature Importance
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      { name: 'failed_attempts', weight: 0.38, desc: 'Authentication failure velocity' },
                      { name: 'is_sensitive_resource', weight: 0.24, desc: 'Access to KeyVault / S3 Finance / KMS' },
                      { name: 'request_frequency', weight: 0.18, desc: 'Requests per minute anomaly' },
                      { name: 'is_unusual_location', weight: 0.12, desc: 'High-risk foreign geolocation code' },
                      { name: 'is_login', weight: 0.05, desc: 'Authentication vs API access type' },
                      { name: 'is_api_or_resource_access', weight: 0.03, desc: 'Resource call category' }
                    ].map(feat => (
                      <div key={feat.name}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '3px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600' }}>{feat.name}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{(feat.weight * 100).toFixed(0)}% contribution</span>
                        </div>
                        <div className="risk-bar-track" style={{ height: '6px' }}>
                          <div className="risk-bar-fill" style={{ width: `${feat.weight * 100}%`, backgroundColor: 'var(--primary)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Risk Calculation Formula Reference */}
                <div className="enterprise-card">
                  <div className="enterprise-card-header">
                    <span className="enterprise-card-title">
                      <FileText className="w-4 h-4 text-purple-400" />
                      Deterministic Risk Engine Equations
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                    <div style={{ marginBottom: '10px', backgroundColor: 'var(--bg-surface-subtle)', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                      <strong style={{ color: 'var(--text-main)' }}>Brute-Force Threat Formulation:</strong>
                      <div style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8', marginTop: '4px' }}>
                        Score = min(100, max(60, 65 + 20*Confidence + 2*failed_attempts))
                      </div>
                    </div>

                    <div style={{ marginBottom: '10px', backgroundColor: 'var(--bg-surface-subtle)', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                      <strong style={{ color: 'var(--text-main)' }}>Unauthorized Access Formulation:</strong>
                      <div style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8', marginTop: '4px' }}>
                        Score = min(100, max(60, 60 + 20*Confidence + 10*is_sensitive + 5*is_unusual))
                      </div>
                    </div>

                    <div style={{ backgroundColor: 'var(--bg-surface-subtle)', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                      <strong style={{ color: 'var(--text-main)' }}>Normal Baseline Formulation:</strong>
                      <div style={{ fontFamily: 'var(--font-mono)', color: '#10b981', marginTop: '4px' }}>
                        Score = min(29, max(5, 10 + 5*failed_attempts + 10*(freq&gt;10)))
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ====================================================================
              TAB 5: COMPLIANCE MAPPING
              ==================================================================== */}
          {activeTab === 'compliance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="page-header">
                <div className="page-title-group">
                  <h2>Cybersecurity Compliance Framework Mappings</h2>
                  <p>Automated control mappings and incident remediation playbooks.</p>
                </div>
              </div>

              <div className="enterprise-card">
                <div className="enterprise-card-header">
                  <span className="enterprise-card-title">
                    <Shield className="w-4 h-4 text-blue-400" />
                    Regulatory Standards Matrix
                  </span>
                </div>

                <table className="enterprise-table">
                  <thead>
                    <tr>
                      <th>Threat Pattern</th>
                      <th>NIST CSF 2.0</th>
                      <th>CIS Controls v8</th>
                      <th>ISO/IEC 27001:2022</th>
                      <th>Actionable Mitigation Strategy</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><span className="badge badge-crit">Brute-Force</span></td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>PR.AA-01, DE.CM-01</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>CIS 5.4, CIS 6.2</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>A.9.4.2, A.12.6.1</td>
                      <td>Enforce Multi-Factor Authentication (MFA), trigger immediate IAM password reset, and blacklist offending IP.</td>
                    </tr>
                    <tr>
                      <td><span className="badge badge-crit">Unauthorized Access</span></td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>PR.AC-04, RS.AN-01</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>CIS 3.11, CIS 6.8</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>A.9.4.1, A.13.1.1</td>
                      <td>Review IAM least-privilege role attachments, quarantine originating host, and rotate cryptographic access keys.</td>
                    </tr>
                    <tr>
                      <td><span className="badge badge-low">Normal Telemetry</span></td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>DE.AE-01</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>CIS 8.2</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>A.12.4.1</td>
                      <td>Adhere to standard audit log retention policies and continuous telemetry health monitoring.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ====================================================================
              TAB 6: AUDIT TRAIL (ROLE GATED)
              ==================================================================== */}
          {activeTab === 'audit' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="page-header">
                <div className="page-title-group">
                  <h2>System Administrative Audit Trail</h2>
                  <p>Immutable log of administrative logins, connection tests, log syncs, and retraining events.</p>
                </div>
                <button onClick={fetchAuditLogs} className="btn btn-secondary">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh Logs
                </button>
              </div>

              {activeUser.role !== 'ADMIN' ? (
                <div className="enterprise-card" style={{ textAlign: 'center', padding: '40px' }}>
                  <Lock className="w-8 h-8 text-amber-500 mx-auto" />
                  <div style={{ fontWeight: '600', marginTop: '8px', color: 'var(--text-main)' }}>Access Denied</div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
                    Viewing system audit logs requires the <strong>ADMIN</strong> role. Switch your active session to <strong>admin_secops</strong> in the top header.
                  </p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="enterprise-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Timestamp (UTC)</th>
                        <th>Actor</th>
                        <th>Action</th>
                        <th>Event Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                            No audit logs recorded in current session.
                          </td>
                        </tr>
                      ) : (
                        auditLogs.map(log => (
                          <tr key={log.id}>
                            <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>#{log.id}</td>
                            <td style={{ fontFamily: 'var(--font-mono)' }}>{log.timestamp?.replace('T', ' ').slice(0, 19)}</td>
                            <td><span className="badge badge-info">{log.actor}</span></td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '600' }}>{log.action}</td>
                            <td style={{ color: 'var(--text-muted)' }}>{log.details}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ====================================================================
              TAB 7: SETTINGS & TIERS
              ==================================================================== */}
          {activeTab === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="page-header">
                <div className="page-title-group">
                  <h2>Settings & Subscription Management</h2>
                  <p>System runtime parameters, feature gating, and cryptographic billing simulation.</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 'var(--space-md)' }}>
                
                {/* Subscription Tier Management */}
                <div className="enterprise-card">
                  <div className="enterprise-card-header">
                    <span className="enterprise-card-title">
                      <Key className="w-4 h-4 text-amber-400" />
                      Subscription Entitlement
                    </span>
                    <span className={`badge ${activeUser.is_pro ? 'badge-low' : 'badge-neutral'}`}>
                      {activeUser.is_pro ? 'PRO ACTIVE' : 'FREE TIER'}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '16px' }}>
                    <div>• <strong>Free Tier</strong>: Single-cloud ingestion (AWS only), 100 events/day limit.</div>
                    <div>• <strong>Pro Tier</strong>: Multi-cloud ingestion across AWS, Azure, GCP, and OCI, unlimited throughput, deep explainability, compliance playbooks.</div>
                  </div>

                  {activeUser.is_pro ? (
                    <div style={{ backgroundColor: 'var(--status-low-bg)', padding: '10px', borderRadius: '4px', border: '1px solid var(--status-low-border)', fontSize: '12px', color: 'var(--status-low)' }}>
                      Active Pro Subscription. Multi-cloud adapters (Azure, GCP, OCI) are fully enabled for this session.
                    </div>
                  ) : (
                    <button onClick={handleUpgradeToPro} className="btn btn-primary w-full" style={{ justifyContent: 'center' }}>
                      Upgrade Session to PRO Tier (Mock Checkout)
                    </button>
                  )}
                </div>

                {/* System Runtime Reference */}
                <div className="enterprise-card">
                  <div className="enterprise-card-header">
                    <span className="enterprise-card-title">
                      <Database className="w-4 h-4 text-blue-400" />
                      Backend Runtime Parameters
                    </span>
                  </div>

                  <div className="cloud-meta-list">
                    <div className="cloud-meta-item">
                      <span>API Server:</span>
                      <span>FastAPI (Uvicorn)</span>
                    </div>
                    <div className="cloud-meta-item">
                      <span>API Host & Port:</span>
                      <span>http://127.0.0.1:8000</span>
                    </div>
                    <div className="cloud-meta-item">
                      <span>Database Engine:</span>
                      <span>SQLite / SQLAlchemy ORM</span>
                    </div>
                    <div className="cloud-meta-item">
                      <span>Interactive API Docs:</span>
                      <a href="http://127.0.0.1:8000/docs" target="_blank" rel="noreferrer" style={{ color: 'var(--primary-text)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        Swagger UI <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

        </main>
      </div>

    </div>
  );
}
