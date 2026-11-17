import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Pause,
  Play,
  ShieldAlert,
  CheckCircle2,
  BarChart3,
  TrendingUp,
  Clock,
  Users,
} from 'lucide-react';
import api from '../../services/api';

export function EmergencyControls({ centerId, center, onCenterStateChange }) {
  const [activeState, setActiveState] = useState(center?.active_state || 'active');
  const [pauseReason, setPauseReason] = useState('');
  const [closeReason, setCloseReason] = useState('');
  const [targetDate, setTargetDate] = useState(new Date().toISOString().slice(0, 10));
  const [loadingAction, setLoadingAction] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (center?.active_state) {
      setActiveState(center.active_state);
    }
    if (centerId) {
      loadAnalytics();
    }
  }, [centerId, center]);

  async function loadAnalytics() {
    try {
      const res = await api.get(`/centers/${centerId}/analytics`);
      if (res.data?.analytics) {
        setAnalytics(res.data.analytics);
      }
    } catch (err) {
      console.warn('Analytics fetch error:', err.message);
    }
  }

  const handlePause = async () => {
    setError('');
    setMessage('');
    setLoadingAction(true);
    try {
      const res = await api.post(`/centers/${centerId}/pause`, {
        reason: pauseReason || 'Operational pause declared by operator',
      });
      setActiveState('paused');
      setMessage('Center operations temporarily PAUSED. Check-ins blocked.');
      if (onCenterStateChange) onCenterStateChange('paused');
      loadAnalytics();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Pause failed');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleResume = async () => {
    setError('');
    setMessage('');
    setLoadingAction(true);
    try {
      await api.post(`/centers/${centerId}/resume`);
      setActiveState('active');
      setMessage('Center operations RESUMED. Check-in active.');
      if (onCenterStateChange) onCenterStateChange('active');
      loadAnalytics();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Resume failed');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleEmergencyClose = async (e) => {
    e.preventDefault();
    if (!closeReason.trim()) return;

    if (!window.confirm('Declare emergency closure? All confirmed farmer appointments for this date will be safely protected and marked for rescheduling without penalty.')) {
      return;
    }

    setError('');
    setMessage('');
    setLoadingAction(true);

    try {
      const res = await api.post(`/centers/${centerId}/emergency-close`, {
        reason: closeReason.trim(),
        targetDate,
      });

      setActiveState('closed');
      setMessage(
        `Emergency closure confirmed. ${res.data?.affectedCount || 0} farmer bookings protected and notified to reschedule.`
      );
      setCloseReason('');
      if (onCenterStateChange) onCenterStateChange('closed');
      loadAnalytics();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Emergency closure failed');
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Status Alerts */}
      {message && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Center Operational State Controller */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                  activeState === 'active'
                    ? 'bg-emerald-100 text-emerald-800'
                    : activeState === 'paused'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                Operational State: {activeState}
              </span>
            </div>
            <h3 className="text-xl font-black text-slate-900">Center Pause & Contingency Desk</h3>
            <p className="text-xs text-slate-500">
              Manage temporary pauses for weather delays or equipment calibration.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeState === 'paused' ? (
              <button
                type="button"
                disabled={loadingAction}
                onClick={handleResume}
                className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                <span>Resume Normal Operations</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={loadingAction}
                onClick={handlePause}
                className="py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                <Pause className="w-4 h-4" />
                <span>Pause Mandi Operations</span>
              </button>
            )}
          </div>
        </div>

        {/* Temporary Pause Form */}
        {activeState !== 'paused' && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 block">
              Reason for Pause (shown on gate scanner when farmers scan QR)
            </label>
            <input
              type="text"
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
              placeholder="e.g. Heavy rain delay / Generator diesel refueling / Weighbridge recalibration"
              className="w-full px-4 py-2 rounded-xl border border-slate-300 text-xs font-medium"
            />
          </div>
        )}
      </div>

      {/* Emergency Closure Declaration (AT-12) */}
      <div className="bg-red-50/60 rounded-3xl border border-red-200 p-6 sm:p-8 space-y-6">
        <div className="border-b border-red-200/80 pb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-black text-red-950">
              Declare Emergency Mandi Closure (AT-12 Workflow)
            </h3>
          </div>
          <p className="text-xs text-red-800 mt-1 leading-relaxed">
            CRITICAL SAFETY RULE: Under emergency closure (flash flood, structural breakdown, extreme weather), all booked farmer appointments are protected from false no-show penalties, transitioned to <span className="font-black">RESCHEDULING_REQUIRED</span>, and auto-notified with slot capacity released atomically.
          </p>
        </div>

        <form onSubmit={handleEmergencyClose} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-red-900 block">
                Target Closure Date *
              </label>
              <input
                type="date"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-red-300 bg-white text-xs font-bold text-slate-900"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-red-900 block">
                Mandatory Emergency Reason *
              </label>
              <input
                type="text"
                required
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                placeholder="e.g. Severe flooding damaged approach road and weighbridge"
                className="w-full px-4 py-2 rounded-xl border border-red-300 bg-white text-xs font-medium text-slate-900"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loadingAction}
              className="py-2.5 px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Confirm Emergency Closure & Protect Farmers</span>
            </button>
          </div>
        </form>
      </div>

      {/* Mandi Intelligence & Live Analytics (Phase 7 Analytics) */}
      {analytics && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-agri-700" />
              <h3 className="text-xl font-bold text-slate-900">
                Center Operations Analytics & Key Performance Metrics
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Live statistics calculated from actual PostgreSQL appointment records.
            </p>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 block text-xs font-semibold">Total Bookings</span>
              <span className="text-2xl font-black text-slate-900">{analytics.totalBookings}</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
              <span className="text-emerald-700 block text-xs font-semibold">Completed Intake</span>
              <span className="text-2xl font-black text-emerald-900">{analytics.statusCounts?.completed || 0}</span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
              <span className="text-amber-800 block text-xs font-semibold">No-Show Rate</span>
              <span className="text-2xl font-black text-amber-900">{analytics.noShowRate}%</span>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
              <span className="text-blue-800 block text-xs font-semibold">Rescheduling Req.</span>
              <span className="text-2xl font-black text-blue-900">
                {analytics.statusCounts?.rescheduling_required || 0}
              </span>
            </div>
          </div>

          {/* Crop Procured Table */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Procured Quantity & Disbursements by Crop Variety
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {analytics.cropProcurements?.map((cp) => (
                <div key={cp.cropNameEn} className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-800 text-sm">{cp.cropNameEn}</div>
                  <div className="text-xs text-slate-500">{cp.cropNameHi}</div>
                  <div className="text-lg font-black text-slate-900 mt-2">
                    {cp.totalQuintals.toFixed(2)} <span className="text-xs font-normal text-slate-400">Quintals</span>
                  </div>
                  <div className="text-xs font-bold text-emerald-700">
                    Disbursed: ₹{cp.totalPayable.toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
