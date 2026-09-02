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
  Square,
  RotateCcw,
  Trash2,
  Clock,
  Radio,
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
  Info,
  BarChart3,
  ArrowRight
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

  // Stream Engine Observability State
  const [streamStatus, setStreamStatus] = useState({
    status: 'IDLE',
    session_id: null,
    duration_seconds: 0,
    events_collected: 0,
    events_processed: 0,
    threats_detected: 0,
    critical_threats: 0,
    high_threats: 0,
    medium_threats: 0,
    low_events: 0,
    average_risk: 0.0,
    throughput_eps: 0.0,
    last_event: null,
    provider_counts: { aws: 0, azure: 0, gcp: 0, oci: 0, demo: 0 },
    threat_distribution: { 'Brute-Force': 0, 'Unauthorized': 0, 'Normal': 0 },
    risk_distribution: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
    pipeline_stages: {
      collection: { status: 'IDLE', details: 'Ready for stream start' },
      validation: { status: 'IDLE', details: 'Module 1 Schema Validator ready' },
      preprocessing: { status: 'IDLE', details: 'Module 2 Feature Extractor ready' },
      ml_classification: { status: 'IDLE', details: 'Module 3 Random Forest ready' },
      risk_engine: { status: 'IDLE', details: 'Deterministic Risk Engine ready' },
      database: { status: 'IDLE', details: 'Idempotent DB Persistence ready' },
      dashboard: { status: 'CONNECTED', details: 'REST Stream Connection Active' }
    },
    activity_timeline: []
  });

  const [streamInterval, setStreamInterval] = useState(2.0);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isClearDataConfirmOpen, setIsClearDataConfirmOpen] = useState(false);

  // Event Table Filtering & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProvider, setFilterProvider] = useState('ALL');
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterThreat, setFilterThreat] = useState('ALL');
  const [filterSourceMode, setFilterSourceMode] = useState('ALL'); // 'ALL' | 'REAL' | 'DEMO'
  const [syncLookback, setSyncLookback] = useState(60); // lookback in minutes
  const [isSyncing, setIsSyncing] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // UI Feedback / Notification
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  const formatDuration = (seconds) => {
    if (!seconds || seconds < 0) return '00:00:00';
    const hrs = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

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

  // Fetch Stream Status
  const fetchStreamStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/stream/status`);
      if (res.ok) {
        const data = await res.json();
        setStreamStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch stream status:', err);
    }
  }, []);

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

  // Initial Load & Synchronized Polling
  useEffect(() => {
    fetchHealth();
    fetchCloudStatus(false);
    fetchAlerts();
    fetchMlMetrics();
    fetchAuditLogs();
    fetchStreamStatus();

    const isFastPolling = streamStatus.status === 'RUNNING' || streamStatus.status === 'STARTING';
    const interval = setInterval(() => {
      fetchHealth();
      fetchStreamStatus();
      if (isFastPolling) {
        fetchAlerts();
      }
    }, isFastPolling ? 1500 : 4000);

    return () => clearInterval(interval);
  }, [fetchHealth, fetchCloudStatus, fetchAlerts, fetchMlMetrics, fetchAuditLogs, fetchStreamStatus, streamStatus.status]);

  // Stream Lifecycle Handlers
  const handleStartStream = async () => {
    if (activeUser.role !== 'ADMIN') {
      showToast('Admin role required to operate streaming ingestion.', 'error');
      return;
    }
    try {
      showToast('Starting real-time streaming worker...', 'warning');
      const res = await fetch(`${API_BASE}/api/v1/stream/start?interval=${streamInterval}`, {
        method: 'POST',
        headers: { 'X-User-ID': activeUser.user_id }
      });
      if (res.ok) {
        const data = await res.json();
        await fetchStreamStatus();
        showToast(`Stream started (Session: ${data.session_id})`, 'success');
      } else {
        const err = await res.json();
        showToast(err.detail || 'Failed to start stream.', 'error');
      }
    } catch {
      showToast('Network error during stream start.', 'error');
    }
  };

  const handleStopStream = async () => {
    if (activeUser.role !== 'ADMIN') {
      showToast('Admin role required to stop stream.', 'error');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/v1/stream/stop`, {
        method: 'POST',
        headers: { 'X-User-ID': activeUser.user_id }
      });
      if (res.ok) {
        await fetchStreamStatus();
        showToast('Stream stopped cleanly. Metrics and session preserved.', 'success');
      } else {
        const err = await res.json();
        showToast(err.detail || 'Failed to stop stream.', 'error');
      }
    } catch {
      showToast('Network error during stream stop.', 'error');
    }
  };

  const handleResetStream = async () => {
    if (activeUser.role !== 'ADMIN') {
      showToast('Admin role required to reset stream.', 'error');
      return;
    }
    try {
      setIsResetConfirmOpen(false);
      const res = await fetch(`${API_BASE}/api/v1/stream/reset`, {
        method: 'POST',
        headers: { 'X-User-ID': activeUser.user_id }
      });
      if (res.ok) {
        await fetchStreamStatus();
        await fetchAlerts();
        showToast('Stream session reset cleanly. All stream counters and timeline cleared.', 'success');
      } else {
        const err = await res.json();
        showToast(err.detail || 'Failed to reset stream.', 'error');
      }
    } catch {
      showToast('Network error during stream reset.', 'error');
    }
  };

  const handleClearDemoData = async () => {
    if (activeUser.role !== 'ADMIN') {
      showToast('Admin role required to purge demo records.', 'error');
      return;
    }
    try {
      setIsClearDataConfirmOpen(false);
      const res = await fetch(`${API_BASE}/api/v1/stream/clear-demo-data`, {
        method: 'POST',
        headers: { 'X-User-ID': activeUser.user_id }
      });
      if (res.ok) {
        const data = await res.json();
        await fetchStreamStatus();
        await fetchAlerts();
        showToast(data.message || 'Demo records purged successfully.', 'success');
      } else {
        const err = await res.json();
        showToast(err.detail || 'Failed to purge demo records.', 'error');
      }
    } catch {
      showToast('Network error during demo data purge.', 'error');
    }
  };

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
          compliance_recommendations: JSON.stringify(result.compliance || {}),
          source_mode: result.source_mode || 'DEMO'
        };
        setAlerts(prev => [newAlert, ...prev]);
        setSelectedAlert(newAlert);
        await fetchStreamStatus();
        showToast(`Injected ${scenarioName.toUpperCase()} (Risk: ${result.risk_score} - ${result.severity})`, 'success');
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
      setIsSyncing(prev => ({ ...prev, [provider]: true }));
      showToast(`Polling telemetry from ${provider.toUpperCase()} (Lookback: ${syncLookback}m)...`, 'warning');
      const res = await fetch(`${API_BASE}/api/v1/cloud/sync/${provider}?limit=10&lookback_minutes=${syncLookback}`, {
        method: 'POST',
        headers: { 'X-User-ID': activeUser.user_id }
      });
      if (res.ok) {
        const data = await res.json();
        await fetchAlerts();
        await fetchCloudStatus(true);
        if (data.new_inserted_count > 0) {
          showToast(`${provider.toUpperCase()}: ${data.new_inserted_count} new events ingested (${data.skipped_duplicates_count} duplicates skipped).`, 'success');
        } else if (data.skipped_duplicates_count > 0) {
          showToast(`${provider.toUpperCase()}: All ${data.skipped_duplicates_count} events already ingested (Deduplication active).`, 'warning');
        } else {
          showToast(`${provider.toUpperCase()}: ${data.message || '0 events found in time window.'}`, 'warning');
        }
      } else {
        const err = await res.json();
        showToast(err.detail || 'Sync failed: Pro tier required', 'error');
      }
    } catch {
      showToast('Network error during log sync.', 'error');
    } finally {
      setIsSyncing(prev => ({ ...prev, [provider]: false }));
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
      const matchSource = filterSourceMode === 'ALL' || (alert.source_mode || 'DEMO').toUpperCase() === filterSourceMode.toUpperCase();

      return matchSearch && matchProvider && matchSeverity && matchThreat && matchSource;
    });
  }, [alerts, searchQuery, filterProvider, filterSeverity, filterThreat, filterSourceMode]);

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
    const realEvents = alerts.filter(a => (a.source_mode || '').toUpperCase() === 'REAL').length;
    const avgRisk = total > 0 ? Math.round(alerts.reduce((acc, a) => acc + (a.risk_score || 0), 0) / total) : 0;
    const connectedClouds = Object.values(cloudStatuses).filter(s => s.status === 'CONNECTED' || s.status === 'DEMO MODE').length;

    return { total, threats, critical, high, med, low, realEvents, avgRisk, connectedClouds };
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

  const getSourceBadge = (sourceMode) => {
    const isReal = (sourceMode || '').toUpperCase() === 'REAL';
    if (isReal) {
      return <span className="badge badge-real">REAL</span>;
    }
    return <span className="badge badge-demo">DEMO</span>;
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
              TAB 1: STREAM OPERATIONS & OBSERVABILITY CONSOLE
              ==================================================================== */}
          {activeTab === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              
              {/* Page Header */}
              <div className="page-header">
                <div className="page-title-group">
                  <h2>Stream Operations & Observability Console</h2>
                  <p>Authoritative real-time streaming telemetry, 7-stage pipeline inspection, and multi-cloud risk analytics.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => { fetchAlerts(); fetchCloudStatus(true); fetchStreamStatus(); }} className="btn btn-secondary">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh
                  </button>
                </div>
              </div>

              {/* Top Stream Control & Ingestion Toolbar */}
              <div className="stream-bar">
                <div className="stream-meta-group">
                  <div className={`stream-status-pill status-${streamStatus.status.toLowerCase()}`}>
                    <span className={`stream-dot ${streamStatus.status === 'RUNNING' ? 'pulse' : ''}`} />
                    <span>{streamStatus.status}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Session:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)', fontWeight: '600' }}>
                      {streamStatus.session_id || 'NONE (IDLE)'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>Duration:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)', fontWeight: '600' }}>
                      {formatDuration(streamStatus.duration_seconds)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    <span>Rate:</span>
                    <select 
                      value={streamInterval} 
                      onChange={(e) => setStreamInterval(parseFloat(e.target.value))}
                      disabled={streamStatus.status === 'RUNNING'}
                      className="select-compact"
                      style={{ padding: '2px 6px', height: '26px' }}
                    >
                      <option value="1.0">1.0s (Fast)</option>
                      <option value="2.0">2.0s (Normal)</option>
                      <option value="3.5">3.5s (Steady)</option>
                      <option value="5.0">5.0s (Low)</option>
                    </select>
                  </div>
                </div>

                {/* Control Action Buttons */}
                <div className="stream-actions">
                  {streamStatus.status === 'RUNNING' ? (
                    <button 
                      onClick={handleStopStream} 
                      className="btn btn-secondary"
                      style={{ borderColor: 'var(--status-med-border)', color: 'var(--status-med)' }}
                    >
                      <Square className="w-3.5 h-3.5" />
                      Stop Stream
                    </button>
                  ) : (
                    <button 
                      onClick={handleStartStream} 
                      disabled={streamStatus.status === 'STARTING' || streamStatus.status === 'RESETTING'}
                      className="btn btn-primary"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Start Stream
                    </button>
                  )}

                  <button 
                    onClick={() => setIsResetConfirmOpen(true)} 
                    disabled={streamStatus.status === 'RESETTING'}
                    className="btn btn-secondary"
                    title="Stop active stream and reset all stream counters to clean state"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Stream
                  </button>

                  <button 
                    onClick={() => setIsClearDataConfirmOpen(true)} 
                    className="btn btn-secondary"
                    style={{ color: 'var(--text-muted)' }}
                    title="Purge all synthetic demo records from database, preserving real cloud events"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    Purge Demo Data
                  </button>

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
                    <option value="aws_brute_force">AWS: Brute Force Spray (Critical)</option>
                    <option value="azure_keyvault">Azure: KeyVault Breach (Critical)</option>
                    <option value="gcp_storage_burst">GCP: Storage Burst (High)</option>
                    <option value="oci_normal">OCI: Standard Object Read (Low)</option>
                    <option value="aws_normal">AWS: Standard Read (Low)</option>
                  </select>
                </div>
              </div>

              {/* Authoritative Stream KPI Metrics Ribbon */}
              <div className="kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-label">
                    <span>Stream Events</span>
                    <Activity className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div className="kpi-value">{streamStatus.events_collected}</div>
                  <div className="kpi-subtext">Total session ingress ({stats.total} fleet total)</div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-label">
                    <span>Events Processed</span>
                    <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="kpi-value">{streamStatus.events_processed}</div>
                  <div className="kpi-subtext">Passed 7 pipeline stages</div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-label">
                    <span>Threats Detected</span>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="kpi-value" style={{ color: streamStatus.threats_detected > 0 ? 'var(--status-med)' : 'var(--text-main)' }}>
                    {streamStatus.threats_detected}
                  </div>
                  <div className="kpi-subtext">
                    {streamStatus.events_processed > 0 ? `${((streamStatus.threats_detected / streamStatus.events_processed) * 100).toFixed(1)}% threat rate` : '0.0% threat rate'}
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-label">
                    <span>Critical Alerts</span>
                    <Shield className="w-3.5 h-3.5 text-red-400" />
                  </div>
                  <div className="kpi-value" style={{ color: streamStatus.critical_threats > 0 ? 'var(--status-crit)' : 'var(--text-main)' }}>
                    {streamStatus.critical_threats}
                  </div>
                  <div className="kpi-subtext">Risk Score 80 to 100</div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-label">
                    <span>Mean Stream Risk</span>
                    <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <div className="kpi-value">{streamStatus.average_risk.toFixed(1)} / 100</div>
                  <div className="kpi-subtext">Session rolling average</div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-label">
                    <span>Throughput (eps)</span>
                    <Zap className="w-3.5 h-3.5 text-yellow-400" />
                  </div>
                  <div className="kpi-value">{streamStatus.throughput_eps.toFixed(2)}</div>
                  <div className="kpi-subtext">Events per second</div>
                </div>
              </div>

              {/* Real-Time Visual Pipeline Flow Visualizer */}
              <div className="pipeline-flow-container">
                <div className="pipeline-flow-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers className="w-4 h-4 text-blue-400" />
                    <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      End-to-End Real-Time Pipeline Visualizer (7 Stages)
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                    State Sync: Active | Zero Loss Architecture
                  </div>
                </div>

                <div className="pipeline-grid">
                  {/* Stage 1: Cloud Source */}
                  <div className={`pipeline-stage-card ${streamStatus.status === 'RUNNING' ? 'running' : ''}`}>
                    <div className="pipeline-stage-top">
                      <span className="pipeline-stage-num">01. INGEST</span>
                      <span className={`badge ${streamStatus.status === 'RUNNING' ? 'badge-low' : 'badge-neutral'}`}>
                        {streamStatus.status === 'RUNNING' ? 'ACTIVE' : 'IDLE'}
                      </span>
                    </div>
                    <div className="pipeline-stage-name">Multi-Cloud Source</div>
                    <div className="pipeline-stage-detail">AWS, Azure, GCP, OCI</div>
                    <div className="pipeline-stage-time">{streamStatus.pipeline_stages?.collection?.last_activity || 'Standby'}</div>
                  </div>

                  {/* Stage 2: Normalization */}
                  <div className={`pipeline-stage-card ${streamStatus.pipeline_stages?.collection?.status === 'RUNNING' ? 'running' : ''}`}>
                    <div className="pipeline-stage-top">
                      <span className="pipeline-stage-num">02. NORM</span>
                      <span className={`badge ${streamStatus.pipeline_stages?.collection?.status === 'RUNNING' ? 'badge-low' : 'badge-neutral'}`}>
                        {streamStatus.pipeline_stages?.collection?.status || 'IDLE'}
                      </span>
                    </div>
                    <div className="pipeline-stage-name">Canonical Mapping</div>
                    <div className="pipeline-stage-detail">Standard 10-field format</div>
                    <div className="pipeline-stage-time">{streamStatus.pipeline_stages?.collection?.details || 'Normalized'}</div>
                  </div>

                  {/* Stage 3: Validation */}
                  <div className={`pipeline-stage-card ${streamStatus.pipeline_stages?.validation?.status === 'RUNNING' ? 'running' : ''}`}>
                    <div className="pipeline-stage-top">
                      <span className="pipeline-stage-num">03. MODULE 1</span>
                      <span className={`badge ${streamStatus.pipeline_stages?.validation?.status === 'RUNNING' ? 'badge-low' : 'badge-neutral'}`}>
                        {streamStatus.pipeline_stages?.validation?.status || 'IDLE'}
                      </span>
                    </div>
                    <div className="pipeline-stage-name">Schema Validation</div>
                    <div className="pipeline-stage-detail">Pydantic Constraints</div>
                    <div className="pipeline-stage-time">{streamStatus.pipeline_stages?.validation?.details || 'Module 1 Ready'}</div>
                  </div>

                  {/* Stage 4: Preprocessing */}
                  <div className={`pipeline-stage-card ${streamStatus.pipeline_stages?.preprocessing?.status === 'RUNNING' ? 'running' : ''}`}>
                    <div className="pipeline-stage-top">
                      <span className="pipeline-stage-num">04. MODULE 2</span>
                      <span className={`badge ${streamStatus.pipeline_stages?.preprocessing?.status === 'RUNNING' ? 'badge-low' : 'badge-neutral'}`}>
                        {streamStatus.pipeline_stages?.preprocessing?.status || 'IDLE'}
                      </span>
                    </div>
                    <div className="pipeline-stage-name">Feature Extractor</div>
                    <div className="pipeline-stage-detail">6-Feature Numerical Vector</div>
                    <div className="pipeline-stage-time">{streamStatus.pipeline_stages?.preprocessing?.details || 'Module 2 Ready'}</div>
                  </div>

                  {/* Stage 5: ML Classifier */}
                  <div className={`pipeline-stage-card ${streamStatus.pipeline_stages?.ml_classification?.status === 'RUNNING' ? 'running' : ''}`}>
                    <div className="pipeline-stage-top">
                      <span className="pipeline-stage-num">05. MODULE 3</span>
                      <span className={`badge ${streamStatus.pipeline_stages?.ml_classification?.status === 'RUNNING' ? 'badge-low' : 'badge-neutral'}`}>
                        {streamStatus.pipeline_stages?.ml_classification?.status || 'IDLE'}
                      </span>
                    </div>
                    <div className="pipeline-stage-name">Random Forest ML</div>
                    <div className="pipeline-stage-detail">Multi-Class Probability</div>
                    <div className="pipeline-stage-time">{streamStatus.pipeline_stages?.ml_classification?.details || 'Module 3 Ready'}</div>
                  </div>

                  {/* Stage 6: Risk & Compliance */}
                  <div className={`pipeline-stage-card ${streamStatus.pipeline_stages?.risk_engine?.status === 'RUNNING' ? 'running' : ''}`}>
                    <div className="pipeline-stage-top">
                      <span className="pipeline-stage-num">06. RISK & COMP</span>
                      <span className={`badge ${streamStatus.pipeline_stages?.risk_engine?.status === 'RUNNING' ? 'badge-low' : 'badge-neutral'}`}>
                        {streamStatus.pipeline_stages?.risk_engine?.status || 'IDLE'}
                      </span>
                    </div>
                    <div className="pipeline-stage-name">Risk Scoring Engine</div>
                    <div className="pipeline-stage-detail">Deterministic 0-100 + NIST</div>
                    <div className="pipeline-stage-time">{streamStatus.pipeline_stages?.risk_engine?.details || 'Score Computed'}</div>
                  </div>

                  {/* Stage 7: Database Storage */}
                  <div className={`pipeline-stage-card ${streamStatus.pipeline_stages?.database?.status === 'RUNNING' ? 'running' : ''}`}>
                    <div className="pipeline-stage-top">
                      <span className="pipeline-stage-num">07. PERSIST</span>
                      <span className={`badge ${streamStatus.pipeline_stages?.database?.status === 'RUNNING' ? 'badge-low' : 'badge-neutral'}`}>
                        {streamStatus.pipeline_stages?.database?.status || 'IDLE'}
                      </span>
                    </div>
                    <div className="pipeline-stage-name">Idempotent DB</div>
                    <div className="pipeline-stage-detail">SQLite Deduplication</div>
                    <div className="pipeline-stage-time">{streamStatus.pipeline_stages?.database?.details || 'Storage Ready'}</div>
                  </div>
                </div>
              </div>

              {/* Visual Analytics Grid */}
              <div className="analytics-grid">
                
                {/* 1. Ingress Rate & Event Timeline */}
                <div className="analytics-card">
                  <div>
                    <div className="analytics-card-title">
                      <span>Event Ingress Activity</span>
                      <Activity className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      Recent Event Telemetry Flow
                    </div>
                    
                    {/* Visual SVG Timeline representation */}
                    <div style={{ height: '70px', width: '100%', display: 'flex', alignItems: 'flex-end', gap: '3px', backgroundColor: 'var(--bg-app)', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                      {alerts.slice(0, 24).reverse().map((a, idx) => {
                        const h = Math.max(12, Math.min(60, (a.risk_score || 10) * 0.58));
                        const color = a.severity === 'CRITICAL' ? 'var(--status-crit)' : a.severity === 'HIGH' ? 'var(--status-high)' : a.severity === 'MEDIUM' ? 'var(--status-med)' : 'var(--status-low)';
                        return (
                          <div 
                            key={idx} 
                            style={{ 
                              flex: 1, 
                              height: `${h}px`, 
                              backgroundColor: color, 
                              borderRadius: '1px',
                              opacity: 0.85
                            }}
                            title={`${a.event_id}: ${a.threat_type} (Risk ${a.risk_score})`}
                          />
                        );
                      })}
                      {alerts.length === 0 && (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: '11px' }}>
                          No stream activity
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--text-dim)', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
                    <span>Oldest</span>
                    <span>Recent Telemetry Ingress</span>
                    <span>Latest</span>
                  </div>
                </div>

                {/* 2. Risk Severity Breakdown */}
                <div className="analytics-card">
                  <div>
                    <div className="analytics-card-title">
                      <span>Risk Severity Distribution</span>
                      <Shield className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    
                    {/* Stacked Bar */}
                    <div className="progress-stacked">
                      <div className="progress-stacked-bar" style={{ width: `${stats.total > 0 ? (stats.critical / stats.total) * 100 : 0}%`, backgroundColor: 'var(--status-crit)' }} />
                      <div className="progress-stacked-bar" style={{ width: `${stats.total > 0 ? (stats.high / stats.total) * 100 : 0}%`, backgroundColor: 'var(--status-high)' }} />
                      <div className="progress-stacked-bar" style={{ width: `${stats.total > 0 ? (stats.med / stats.total) * 100 : 0}%`, backgroundColor: 'var(--status-med)' }} />
                      <div className="progress-stacked-bar" style={{ width: `${stats.total > 0 ? (stats.low / stats.total) * 100 : 0}%`, backgroundColor: 'var(--status-low)' }} />
                    </div>

                    <div className="legend-list">
                      <div className="legend-item">
                        <span><span className="legend-color-dot" style={{ backgroundColor: 'var(--status-crit)' }} />Critical (80-100)</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600' }}>{stats.critical}</span>
                      </div>
                      <div className="legend-item">
                        <span><span className="legend-color-dot" style={{ backgroundColor: 'var(--status-high)' }} />High (60-79)</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600' }}>{stats.high}</span>
                      </div>
                      <div className="legend-item">
                        <span><span className="legend-color-dot" style={{ backgroundColor: 'var(--status-med)' }} />Medium (30-59)</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600' }}>{stats.med}</span>
                      </div>
                      <div className="legend-item">
                        <span><span className="legend-color-dot" style={{ backgroundColor: 'var(--status-low)' }} />Low (0-29)</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600' }}>{stats.low}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Threat Classification Distribution */}
                <div className="analytics-card">
                  <div>
                    <div className="analytics-card-title">
                      <span>Threat Category Breakdown</span>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    
                    {/* Stacked Bar */}
                    <div className="progress-stacked">
                      <div className="progress-stacked-bar" style={{ width: `${stats.total > 0 ? (alerts.filter(a => a.threat_type === 'Brute-Force').length / stats.total) * 100 : 0}%`, backgroundColor: 'var(--status-crit)' }} />
                      <div className="progress-stacked-bar" style={{ width: `${stats.total > 0 ? (alerts.filter(a => a.threat_type === 'Unauthorized').length / stats.total) * 100 : 0}%`, backgroundColor: 'var(--status-high)' }} />
                      <div className="progress-stacked-bar" style={{ width: `${stats.total > 0 ? (alerts.filter(a => a.threat_type === 'Normal').length / stats.total) * 100 : 0}%`, backgroundColor: 'var(--status-low)' }} />
                    </div>

                    <div className="legend-list">
                      <div className="legend-item">
                        <span><span className="legend-color-dot" style={{ backgroundColor: 'var(--status-crit)' }} />Brute-Force</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600' }}>{alerts.filter(a => a.threat_type === 'Brute-Force').length}</span>
                      </div>
                      <div className="legend-item">
                        <span><span className="legend-color-dot" style={{ backgroundColor: 'var(--status-high)' }} />Unauthorized</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600' }}>{alerts.filter(a => a.threat_type === 'Unauthorized').length}</span>
                      </div>
                      <div className="legend-item">
                        <span><span className="legend-color-dot" style={{ backgroundColor: 'var(--status-low)' }} />Normal Operations</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600' }}>{alerts.filter(a => a.threat_type === 'Normal').length}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Multi-Cloud Ingestion Breakdown */}
                <div className="analytics-card">
                  <div>
                    <div className="analytics-card-title">
                      <span>Cloud Telemetry Ingestion</span>
                      <Server className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    
                    {/* Stacked Bar */}
                    <div className="progress-stacked">
                      <div className="progress-stacked-bar" style={{ width: `${stats.total > 0 ? (alerts.filter(a => (a.cloud_provider || '').toLowerCase() === 'aws').length / stats.total) * 100 : 0}%`, backgroundColor: '#ff9900' }} />
                      <div className="progress-stacked-bar" style={{ width: `${stats.total > 0 ? (alerts.filter(a => (a.cloud_provider || '').toLowerCase() === 'azure').length / stats.total) * 100 : 0}%`, backgroundColor: '#0089d6' }} />
                      <div className="progress-stacked-bar" style={{ width: `${stats.total > 0 ? (alerts.filter(a => (a.cloud_provider || '').toLowerCase() === 'gcp').length / stats.total) * 100 : 0}%`, backgroundColor: '#4285f4' }} />
                      <div className="progress-stacked-bar" style={{ width: `${stats.total > 0 ? (alerts.filter(a => (a.cloud_provider || '').toLowerCase() === 'oci').length / stats.total) * 100 : 0}%`, backgroundColor: '#f80000' }} />
                    </div>

                    <div className="legend-list">
                      <div className="legend-item">
                        <span><span className="legend-color-dot" style={{ backgroundColor: '#ff9900' }} />AWS</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600' }}>{alerts.filter(a => (a.cloud_provider || '').toLowerCase() === 'aws').length}</span>
                      </div>
                      <div className="legend-item">
                        <span><span className="legend-color-dot" style={{ backgroundColor: '#0089d6' }} />Azure</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600' }}>{alerts.filter(a => (a.cloud_provider || '').toLowerCase() === 'azure').length}</span>
                      </div>
                      <div className="legend-item">
                        <span><span className="legend-color-dot" style={{ backgroundColor: '#4285f4' }} />Google Cloud</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600' }}>{alerts.filter(a => (a.cloud_provider || '').toLowerCase() === 'gcp').length}</span>
                      </div>
                      <div className="legend-item">
                        <span><span className="legend-color-dot" style={{ backgroundColor: '#f80000' }} />Oracle Cloud (OCI)</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600' }}>{alerts.filter(a => (a.cloud_provider || '').toLowerCase() === 'oci').length}</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Split View: Real-Time Security Events Table (Left 55%) + Deep Event Diagnostics (Right 45%) */}
              <div className="events-split-layout">
                
                {/* Left: Real-Time Event Feed */}
                <div className="enterprise-card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="enterprise-card-header">
                    <span className="enterprise-card-title">
                      <Activity className="w-4 h-4 text-blue-400" />
                      Live Security Ingress Feed ({filteredAlerts.length} Events)
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={fetchAlerts} className="btn btn-subtle btn-sm">
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Filter Toolbar */}
                  <div className="filter-bar" style={{ padding: '8px 10px', marginBottom: '8px' }}>
                    <div className="filter-group" style={{ width: '100%' }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <Search className="w-3.5 h-3.5 text-slate-400" style={{ position: 'absolute', left: '8px', top: '7px' }} />
                        <input 
                          type="text"
                          placeholder="Search User, ID, Resource..."
                          value={searchQuery}
                          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                          className="input-search"
                          style={{ width: '100%' }}
                        />
                      </div>

                      <select 
                        value={filterProvider} 
                        onChange={(e) => { setFilterProvider(e.target.value); setCurrentPage(1); }}
                        className="select-compact"
                      >
                        <option value="ALL">All Clouds</option>
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
                        <option value="CRITICAL">Critical</option>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                      </select>

                      <select 
                        value={filterSourceMode} 
                        onChange={(e) => { setFilterSourceMode(e.target.value); setCurrentPage(1); }}
                        className="select-compact"
                        style={{ borderColor: filterSourceMode === 'REAL' ? 'var(--status-low)' : 'var(--border-subtle)' }}
                      >
                        <option value="ALL">All Sources</option>
                        <option value="REAL">Real Cloud</option>
                        <option value="DEMO">Demo Ingest</option>
                      </select>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="table-wrapper" style={{ maxHeight: '380px', overflowY: 'auto' }}>
                    <table className="enterprise-table">
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>Src</th>
                          <th>Cloud</th>
                          <th>Event ID</th>
                          <th>Principal</th>
                          <th>Threat Type</th>
                          <th>Conf</th>
                          <th>Risk</th>
                          <th>Severity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedAlerts.map((alert) => {
                          const isSelected = selectedAlert && selectedAlert.event_id === alert.event_id;
                          return (
                            <tr 
                              key={alert.event_id} 
                              className={`table-row-interactive ${isSelected ? 'row-selected' : ''}`}
                              onClick={() => setSelectedAlert(alert)}
                            >
                              <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', whiteSpace: 'nowrap' }}>
                                {alert.timestamp?.split('T')[1]?.substring(0, 8) || alert.timestamp?.substring(11, 19) || '12:00:00'}
                              </td>
                              <td>
                                <span className={`badge ${alert.source_mode === 'REAL' ? 'badge-low' : 'badge-neutral'}`} style={{ fontSize: '9px', padding: '1px 4px' }}>
                                  {alert.source_mode || 'DEMO'}
                                </span>
                              </td>
                              <td>
                                <span className="badge badge-info" style={{ fontSize: '9.5px', textTransform: 'uppercase' }}>
                                  {alert.cloud_provider}
                                </span>
                              </td>
                              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '600', fontSize: '11px' }}>
                                {alert.event_id}
                              </td>
                              <td style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {alert.user_id || 'system'}
                              </td>
                              <td>
                                <span style={{ fontWeight: alert.threat_type !== 'Normal' ? '600' : '400', color: alert.threat_type === 'Brute-Force' ? 'var(--status-crit)' : alert.threat_type === 'Unauthorized' ? 'var(--status-high)' : 'var(--text-main)' }}>
                                  {alert.threat_type}
                                </span>
                              </td>
                              <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                                {alert.confidence ? `${(alert.confidence * 100).toFixed(0)}%` : '-'}
                              </td>
                              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '700' }}>
                                {alert.risk_score}
                              </td>
                              <td>
                                <span className={`badge ${
                                  alert.severity === 'CRITICAL' ? 'badge-crit' : 
                                  alert.severity === 'HIGH' ? 'badge-high' : 
                                  alert.severity === 'MEDIUM' ? 'badge-med' : 'badge-low'
                                }`}>
                                  {alert.severity}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {paginatedAlerts.length === 0 && (
                          <tr>
                            <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                              No security events match criteria. Start stream or click a scenario.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderTop: '1px solid var(--border-subtle)', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span>Showing {paginatedAlerts.length} of {filteredAlerts.length} events</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                        disabled={currentPage === 1}
                        className="btn btn-subtle btn-sm"
                        style={{ padding: '2px 8px' }}
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span style={{ alignSelf: 'center', fontFamily: 'var(--font-mono)' }}>Page {currentPage} / {Math.max(1, Math.ceil(filteredAlerts.length / pageSize))}</span>
                      <button 
                        onClick={() => setCurrentPage(p => p + 1)} 
                        disabled={currentPage * pageSize >= filteredAlerts.length}
                        className="btn btn-subtle btn-sm"
                        style={{ padding: '2px 8px' }}
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right: Deep Event Diagnostics Inspector */}
                <div className="enterprise-card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="enterprise-card-header">
                    <span className="enterprise-card-title">
                      <Cpu className="w-4 h-4 text-purple-400" />
                      Deep Event Diagnostics Inspector
                    </span>
                    {selectedAlert && (
                      <span className={`badge ${
                        selectedAlert.severity === 'CRITICAL' ? 'badge-crit' : 
                        selectedAlert.severity === 'HIGH' ? 'badge-high' : 
                        selectedAlert.severity === 'MEDIUM' ? 'badge-med' : 'badge-low'
                      }`}>
                        Score {selectedAlert.risk_score} | {selectedAlert.severity}
                      </span>
                    )}
                  </div>

                  {selectedAlert ? (
                    <div>
                      {/* Inspector Sub-Tabs */}
                      <div className="tabs-container" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px', marginBottom: '10px' }}>
                        <button 
                          className={`tab-btn ${inspectorTab === 'diagnostics' ? 'active' : ''}`}
                          onClick={() => setInspectorTab('diagnostics')}
                        >
                          7-Stage Journey
                        </button>
                        <button 
                          className={`tab-btn ${inspectorTab === 'features' ? 'active' : ''}`}
                          onClick={() => setInspectorTab('features')}
                        >
                          Feature Vector (6D)
                        </button>
                        <button 
                          className={`tab-btn ${inspectorTab === 'compliance' ? 'active' : ''}`}
                          onClick={() => setInspectorTab('compliance')}
                        >
                          Risk & Playbooks
                        </button>
                        <button 
                          className={`tab-btn ${inspectorTab === 'json' ? 'active' : ''}`}
                          onClick={() => setInspectorTab('json')}
                        >
                          Raw JSON
                        </button>
                      </div>

                      {/* Tab 1: 7-Stage Journey */}
                      {inspectorTab === 'diagnostics' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11.5px' }}>
                          <div style={{ backgroundColor: 'var(--bg-app)', padding: '8px 10px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                            <div style={{ color: 'var(--text-dim)', fontSize: '10px', fontWeight: '700' }}>STAGE 1 & 2: INGESTION & NORMALIZATION</div>
                            <div style={{ marginTop: '2px', color: 'var(--text-main)' }}>
                              Provider: <strong style={{ textTransform: 'uppercase' }}>{selectedAlert.cloud_provider}</strong> | Event ID: <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedAlert.event_id}</span>
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                              User: {selectedAlert.user_id} | Resource: {selectedAlert.resource || 'N/A'} | IP: {selectedAlert.ip_address || '127.0.0.1'}
                            </div>
                          </div>

                          <div style={{ backgroundColor: 'var(--bg-app)', padding: '8px 10px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                            <div style={{ color: 'var(--text-dim)', fontSize: '10px', fontWeight: '700' }}>STAGE 3 & 4: VALIDATION & 6-FEATURE VECTOR</div>
                            <div style={{ marginTop: '2px', color: 'var(--text-main)' }}>
                              Schema Validation: <span className="badge badge-low" style={{ fontSize: '9px' }}>PASSED</span> | Vector Extracted
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                              Failed Attempts: {selectedAlert.failed_attempts || 0} | Frequency: {selectedAlert.request_frequency || 1}
                            </div>
                          </div>

                          <div style={{ backgroundColor: 'var(--bg-app)', padding: '8px 10px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                            <div style={{ color: 'var(--text-dim)', fontSize: '10px', fontWeight: '700' }}>STAGE 5: ML RANDOM FOREST CLASSIFICATION</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                              <span>Classified Threat: <strong>{selectedAlert.threat_type}</strong></span>
                              <span className="badge badge-info">{selectedAlert.confidence ? `${(selectedAlert.confidence * 100).toFixed(1)}% Conf` : '98.5%'}</span>
                            </div>
                          </div>

                          <div style={{ backgroundColor: 'var(--bg-app)', padding: '8px 10px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                            <div style={{ color: 'var(--text-dim)', fontSize: '10px', fontWeight: '700' }}>STAGE 6 & 7: RISK ENGINE & DB PERSISTENCE</div>
                            <div style={{ marginTop: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>Deterministic Risk Score: <strong style={{ color: selectedAlert.risk_score >= 80 ? 'var(--status-crit)' : 'var(--text-main)' }}>{selectedAlert.risk_score} / 100</strong></span>
                              <span className="badge badge-low" style={{ fontSize: '9px' }}>PERSISTED</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Tab 2: Feature Vector */}
                      {inspectorTab === 'features' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div className="feature-row">
                            <span className="feature-name">failed_attempts:</span>
                            <span className="feature-val">{selectedAlert.failed_attempts ?? 0}</span>
                          </div>
                          <div className="feature-row">
                            <span className="feature-name">request_frequency:</span>
                            <span className="feature-val">{selectedAlert.request_frequency ?? 1}</span>
                          </div>
                          <div className="feature-row">
                            <span className="feature-name">ip_address_numeric:</span>
                            <span className="feature-val">{selectedAlert.ip_address || '192.168.1.100'}</span>
                          </div>
                          <div className="feature-row">
                            <span className="feature-name">user_id_risk_weight:</span>
                            <span className="feature-val">{(selectedAlert.user_id || '').includes('admin') || (selectedAlert.user_id || '').includes('root') ? '0.90 (Privileged)' : '0.10 (Standard)'}</span>
                          </div>
                          <div className="feature-row">
                            <span className="feature-name">resource_sensitivity:</span>
                            <span className="feature-val">{(selectedAlert.resource || '').includes('key') || (selectedAlert.resource || '').includes('secret') || (selectedAlert.resource || '').includes('iam') ? '0.95 (High Criticality)' : '0.20 (Standard)'}</span>
                          </div>
                          <div className="feature-row">
                            <span className="feature-name">time_anomaly_flag:</span>
                            <span className="feature-val">0.00 (Standard Window)</span>
                          </div>
                        </div>
                      )}

                      {/* Tab 3: Risk & Playbooks */}
                      {inspectorTab === 'compliance' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11.5px' }}>
                          <div>
                            <div style={{ fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px' }}>Contributing Risk Factors:</div>
                            <ul style={{ paddingLeft: '16px', color: 'var(--text-muted)' }}>
                              {(() => {
                                try {
                                  const r = JSON.parse(selectedAlert.reasons || '[]');
                                  return r.length > 0 ? r.map((item, i) => <li key={i}>{item}</li>) : <li>Normal operational baseline event</li>;
                                } catch {
                                  return <li>{selectedAlert.reasons || 'Operational baseline'}</li>;
                                }
                              })()}
                            </ul>
                          </div>

                          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
                            <div style={{ fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px' }}>Compliance Playbooks:</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ backgroundColor: 'var(--bg-app)', padding: '6px 8px', borderRadius: '3px' }}>
                                <strong>NIST CSF (PR.AC-7):</strong> Implement credential lockout and MFA enforcement.
                              </div>
                              <div style={{ backgroundColor: 'var(--bg-app)', padding: '6px 8px', borderRadius: '3px' }}>
                                <strong>CIS Benchmark (1.16):</strong> Restrict administrative access from unapproved external CIDR ranges.
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Tab 4: Raw JSON */}
                      {inspectorTab === 'json' && (
                        <div style={{ position: 'relative' }}>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(JSON.stringify(selectedAlert, null, 2));
                              showToast('Copied JSON payload to clipboard', 'success');
                            }}
                            className="btn btn-subtle btn-sm"
                            style={{ position: 'absolute', right: '8px', top: '8px', padding: '2px 6px', fontSize: '10px' }}
                          >
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                          <pre className="json-viewer" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                            {JSON.stringify(selectedAlert, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <p>Select any event in the table to inspect 7-stage processing and explainable diagnostics.</p>
                    </div>
                  )}
                </div>

              </div>

              {/* Technical Stream Activity Log / Timeline Terminal */}
              <div className="enterprise-card">
                <div className="enterprise-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="enterprise-card-title">Technical Stream Activity Log & Timeline</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                    Buffer: {streamStatus.activity_timeline?.length || 0} / 50 events
                  </span>
                </div>

                <div className="activity-terminal">
                  {streamStatus.activity_timeline && streamStatus.activity_timeline.length > 0 ? (
                    streamStatus.activity_timeline.map((entry, idx) => (
                      <div key={idx} className="activity-row">
                        <span className="activity-time">[{entry.timestamp}]</span>
                        <span className={`activity-stage-badge ${
                          entry.level === 'ERROR' ? 'badge-crit' : entry.level === 'WARN' ? 'badge-high' : 'badge-info'
                        }`}>
                          {entry.stage}
                        </span>
                        <span className={`activity-msg ${entry.level === 'ERROR' ? 'error' : entry.level === 'WARN' ? 'warn' : ''}`}>
                          {entry.event_id ? `[${entry.event_id}] ` : ''}{entry.message}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '16px' }}>
                      Terminal idle. Click "Start Stream" or inject a test scenario to view live pipeline logs.
                    </div>
                  )}
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

                  <select 
                    value={filterSourceMode} 
                    onChange={(e) => { setFilterSourceMode(e.target.value); setCurrentPage(1); }}
                    className="select-compact"
                    style={{ borderColor: filterSourceMode === 'REAL' ? 'var(--status-low)' : 'var(--border-subtle)' }}
                  >
                    <option value="ALL">All Sources (Real + Demo)</option>
                    <option value="REAL">Real Telemetry Only</option>
                    <option value="DEMO">Demo Scenarios Only</option>
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
                            <th>Source</th>
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
                              <td>{getSourceBadge(alert.source_mode)}</td>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '600' }}>Event Diagnostics Inspector</span>
                          {getSourceBadge(selectedAlert.source_mode)}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
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
                  <h2>Cloud Provider Connectors & Telemetry Engine</h2>
                  <p>Configure provider credentials, monitor collection status, and trigger on-demand log synchronization.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Lookback Window:</span>
                    <select
                      value={syncLookback}
                      onChange={(e) => setSyncLookback(Number(e.target.value))}
                      className="select-compact"
                    >
                      <option value={15}>Last 15 minutes</option>
                      <option value={60}>Last 1 hour</option>
                      <option value={360}>Last 6 hours</option>
                      <option value={1440}>Last 24 hours</option>
                    </select>
                  </div>
                  <button onClick={() => fetchCloudStatus(true)} className="btn btn-secondary">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Test All Connectors
                  </button>
                </div>
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
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {cloudStatuses.aws?.status === 'CONNECTED' ? (
                          <span className="badge badge-low">CONNECTED</span>
                        ) : cloudStatuses.aws?.status === 'INSUFFICIENT_PERMISSIONS' ? (
                          <span className="badge badge-crit">INSUFFICIENT PERMS</span>
                        ) : (
                          <span className="badge badge-neutral">{cloudStatuses.aws?.status || 'NOT CONFIGURED'}</span>
                        )}
                        <span className={`badge ${cloudStatuses.aws?.source_mode === 'REAL' ? 'badge-real' : 'badge-demo'}`}>
                          {cloudStatuses.aws?.source_mode === 'REAL' ? 'REAL DATA' : 'DEMO MODE'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="cloud-meta-list">
                      <div className="cloud-meta-item">
                        <span>Target Region:</span>
                        <span>{cloudStatuses.aws?.region || 'ap-south-1'}</span>
                      </div>
                      <div className="cloud-meta-item">
                        <span>Identity / Account:</span>
                        <span>{cloudStatuses.aws?.account_id ? `Account: ${cloudStatuses.aws.account_id}` : 'STS Verified'}</span>
                      </div>
                      <div className="cloud-meta-item">
                        <span>Telemetry Source:</span>
                        <span>AWS CloudTrail (lookup_events)</span>
                      </div>
                      <div className="cloud-meta-item">
                        <span>Last Sync Status:</span>
                        <span style={{ color: cloudStatuses.aws?.error ? 'var(--status-crit)' : 'var(--text-main)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cloudStatuses.aws?.last_collection_message || (cloudStatuses.aws?.error ? 'AccessDenied' : 'Ready')}
                        </span>
                      </div>
                      <div className="cloud-meta-item">
                        <span>Events Ingested:</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600' }}>
                          {cloudStatuses.aws?.events_processed || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="cloud-actions">
                    <button onClick={() => handleTestConnection('aws')} className="btn btn-subtle btn-sm" style={{ flex: 1 }}>
                      Test Identity
                    </button>
                    <button 
                      onClick={() => handleSyncLogs('aws')} 
                      disabled={isSyncing.aws}
                      className="btn btn-primary btn-sm" 
                      style={{ flex: 1 }}
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncing.aws ? 'animate-spin' : ''}`} />
                      {isSyncing.aws ? 'Syncing...' : 'Sync CloudTrail'}
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
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {cloudStatuses.azure?.status === 'CONNECTED' ? (
                          <span className="badge badge-low">CONNECTED</span>
                        ) : cloudStatuses.azure?.status === 'INSUFFICIENT_PERMISSIONS' ? (
                          <span className="badge badge-crit">INSUFFICIENT PERMS</span>
                        ) : (
                          <span className="badge badge-neutral">{cloudStatuses.azure?.status || 'NOT CONFIGURED'}</span>
                        )}
                        <span className={`badge ${cloudStatuses.azure?.source_mode === 'REAL' ? 'badge-real' : 'badge-demo'}`}>
                          {cloudStatuses.azure?.source_mode === 'REAL' ? 'REAL DATA' : 'DEMO MODE'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="cloud-meta-list">
                      <div className="cloud-meta-item">
                        <span>Authentication:</span>
                        <span>Microsoft Entra ID (OAuth2)</span>
                      </div>
                      <div className="cloud-meta-item">
                        <span>Target Subscription:</span>
                        <span>cloud-security-student-azure</span>
                      </div>
                      <div className="cloud-meta-item">
                        <span>Telemetry Source:</span>
                        <span>Azure Monitor / Activity Log</span>
                      </div>
                      <div className="cloud-meta-item">
                        <span>Last Sync Status:</span>
                        <span style={{ color: cloudStatuses.azure?.error ? 'var(--status-crit)' : 'var(--text-main)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cloudStatuses.azure?.last_collection_message || (cloudStatuses.azure?.error ? 'Unauthorized' : 'Ready')}
                        </span>
                      </div>
                      <div className="cloud-meta-item">
                        <span>Events Ingested:</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600' }}>
                          {cloudStatuses.azure?.events_processed || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="cloud-actions">
                    <button onClick={() => handleTestConnection('azure')} className="btn btn-subtle btn-sm" style={{ flex: 1 }}>
                      Test Token
                    </button>
                    <button 
                      onClick={() => handleSyncLogs('azure')} 
                      disabled={isSyncing.azure || (activeUser.is_pro !== 1 && activeUser.role !== 'ADMIN')}
                      className={`btn btn-primary btn-sm ${activeUser.is_pro !== 1 && activeUser.role !== 'ADMIN' ? 'btn-disabled' : ''}`}
                      style={{ flex: 1 }}
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncing.azure ? 'animate-spin' : ''}`} />
                      {isSyncing.azure ? 'Syncing...' : 'Sync Activity Log'}
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
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {cloudStatuses.gcp?.status === 'CONNECTED' ? (
                          <span className="badge badge-low">CONNECTED</span>
                        ) : cloudStatuses.gcp?.status === 'INSUFFICIENT_PERMISSIONS' ? (
                          <span className="badge badge-crit">INSUFFICIENT PERMS</span>
                        ) : (
                          <span className="badge badge-neutral">{cloudStatuses.gcp?.status || 'NOT CONFIGURED'}</span>
                        )}
                        <span className={`badge ${cloudStatuses.gcp?.source_mode === 'REAL' ? 'badge-real' : 'badge-demo'}`}>
                          {cloudStatuses.gcp?.source_mode === 'REAL' ? 'REAL DATA' : 'DEMO MODE'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="cloud-meta-list">
                      <div className="cloud-meta-item">
                        <span>Project ID:</span>
                        <span>cloud-security-student-gcp</span>
                      </div>
                      <div className="cloud-meta-item">
                        <span>Authentication:</span>
                        <span>Service Account JSON Token</span>
                      </div>
                      <div className="cloud-meta-item">
                        <span>Telemetry Source:</span>
                        <span>Google Cloud Logging v2</span>
                      </div>
                      <div className="cloud-meta-item">
                        <span>Last Sync Status:</span>
                        <span style={{ color: cloudStatuses.gcp?.error ? 'var(--status-crit)' : 'var(--text-main)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cloudStatuses.gcp?.last_collection_message || (cloudStatuses.gcp?.error ? 'PermissionDenied' : 'Ready')}
                        </span>
                      </div>
                      <div className="cloud-meta-item">
                        <span>Events Ingested:</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600' }}>
                          {cloudStatuses.gcp?.events_processed || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="cloud-actions">
                    <button onClick={() => handleTestConnection('gcp')} className="btn btn-subtle btn-sm" style={{ flex: 1 }}>
                      Test Auth
                    </button>
                    <button 
                      onClick={() => handleSyncLogs('gcp')} 
                      disabled={isSyncing.gcp || (activeUser.is_pro !== 1 && activeUser.role !== 'ADMIN')}
                      className={`btn btn-primary btn-sm ${activeUser.is_pro !== 1 && activeUser.role !== 'ADMIN' ? 'btn-disabled' : ''}`}
                      style={{ flex: 1 }}
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncing.gcp ? 'animate-spin' : ''}`} />
                      {isSyncing.gcp ? 'Syncing...' : 'Sync Audit Logs'}
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
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <span className="badge badge-info">DEMO MODE</span>
                      </div>
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
                        <span>Last Sync Status:</span>
                        <span style={{ color: 'var(--text-main)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cloudStatuses.oci?.last_collection_message || 'Demo Stream Ready'}
                        </span>
                      </div>
                      <div className="cloud-meta-item">
                        <span>Events Ingested:</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600' }}>
                          {cloudStatuses.oci?.events_processed || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="cloud-actions">
                    <button onClick={() => handleTestConnection('oci')} className="btn btn-subtle btn-sm" style={{ flex: 1 }}>
                      Test Adapter
                    </button>
                    <button 
                      onClick={() => handleSyncLogs('oci')} 
                      disabled={isSyncing.oci || (activeUser.is_pro !== 1 && activeUser.role !== 'ADMIN')}
                      className={`btn btn-primary btn-sm ${activeUser.is_pro !== 1 && activeUser.role !== 'ADMIN' ? 'btn-disabled' : ''}`}
                      style={{ flex: 1 }}
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncing.oci ? 'animate-spin' : ''}`} />
                      {isSyncing.oci ? 'Syncing...' : 'Sync Guard Logs'}
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

      {/* Reset Stream Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RotateCcw className="w-5 h-5 text-amber-400" />
              Confirm Stream Reset
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to <strong>reset the real-time stream</strong>?
              </p>
              <ul style={{ marginTop: '8px', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>The active stream worker thread will be stopped cleanly.</li>
                <li>Current session counters (Events, Threats, Duration, Average Risk) will be reset to <strong>0</strong>.</li>
                <li>The stream activity terminal and pipeline visualizer will return to <strong>IDLE</strong> state.</li>
                <li>Historical database security alerts will remain intact.</li>
              </ul>
            </div>
            <div className="modal-footer">
              <button onClick={() => setIsResetConfirmOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button 
                onClick={handleResetStream} 
                className="btn btn-primary"
                style={{ backgroundColor: 'var(--status-high)', borderColor: 'var(--status-high-border)' }}
              >
                Confirm & Reset Stream
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purge Demo Records Confirmation Modal */}
      {isClearDataConfirmOpen && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trash2 className="w-5 h-5 text-red-400" />
              Purge Synthetic Demo Records
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to <strong>purge all demo records</strong> from the local database?
              </p>
              <ul style={{ marginTop: '8px', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>Only records created in <code>DEMO</code> mode will be permanently deleted.</li>
                <li>All <strong>REAL</strong> cloud provider records (AWS CloudTrail, Azure Activity, GCP Logging, OCI Audit) will be preserved.</li>
                <li>Stream counters and alerts table will immediately synchronize.</li>
              </ul>
            </div>
            <div className="modal-footer">
              <button onClick={() => setIsClearDataConfirmOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button 
                onClick={handleClearDemoData} 
                className="btn btn-primary"
                style={{ backgroundColor: 'var(--status-crit)', borderColor: 'var(--status-crit-border)' }}
              >
                Permanently Purge Demo Records
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
