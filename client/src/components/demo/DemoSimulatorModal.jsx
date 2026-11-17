import React, { useState, useEffect } from 'react';
import {
  Clock,
  FastForward,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Play,
  Layers,
  X,
  Users,
  Building2,
  Receipt,
  Scale,
} from 'lucide-react';
import api from '../../services/api';

export function DemoSimulatorModal({ isOpen, onClose }) {
  const [demoState, setDemoState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadDemoState();
    }
  }, [isOpen]);

  async function loadDemoState() {
    try {
      setLoading(true);
      const res = await api.get('/demo/state');
      if (res.data) {
        setDemoState(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch demo state');
    } finally {
      setLoading(false);
    }
  }

  const handleAdvance = async (minutes) => {
    setError('');
    setActionMessage('');
    try {
      const res = await api.post('/demo/time/advance', { minutes });
      setActionMessage(`Virtual clock fast-forwarded by +${minutes} minutes!`);
      loadDemoState();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Advance failed');
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset demo virtual clock to real-time?')) return;
    setError('');
    setActionMessage('');
    try {
      await api.post('/demo/reset');
      setActionMessage('Virtual clock reset to real-time.');
      loadDemoState();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Reset failed');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider block">
                College Project Evaluation Console (AT-20)
              </span>
              <h3 className="text-xl font-black text-slate-900">
                Isolated Demo Simulator & Virtual Clock
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {actionMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Virtual Clock Display */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Virtual Simulation Clock
            </span>
            <div className="text-2xl sm:text-3xl font-mono font-black">
              {demoState?.virtualTime
                ? new Date(demoState.virtualTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                : 'Loading...'}
            </div>
            <div className="text-xs text-slate-400">
              {demoState?.virtualTime
                ? new Date(demoState.virtualTime).toLocaleDateString([], {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : ''}
            </div>
          </div>

          {/* Time Advancement Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleAdvance(15)}
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 flex items-center gap-1 transition-all"
            >
              <FastForward className="w-3.5 h-3.5 text-amber-400" />
              <span>+15 Min</span>
            </button>

            <button
              onClick={() => handleAdvance(60)}
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 flex items-center gap-1 transition-all"
            >
              <FastForward className="w-3.5 h-3.5 text-amber-400" />
              <span>+1 Hour</span>
            </button>

            <button
              onClick={() => handleAdvance(1440)}
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 flex items-center gap-1 transition-all"
            >
              <FastForward className="w-3.5 h-3.5 text-amber-400" />
              <span>+1 Day</span>
            </button>

            <button
              onClick={handleReset}
              className="py-2 px-3 rounded-xl bg-red-950/70 hover:bg-red-900 text-red-200 text-xs font-bold border border-red-800 flex items-center gap-1 transition-all"
              title="Reset virtual time to real time"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Real-time State Metrics */}
        {demoState?.simulationMetrics && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Simulation Environment Metrics
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block font-medium">Farmers</span>
                <span className="text-xl font-black text-slate-900">
                  {demoState.simulationMetrics.farmerCount}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block font-medium">Procurement Mandis</span>
                <span className="text-xl font-black text-slate-900">
                  {demoState.simulationMetrics.centerCount}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block font-medium">Total Bookings</span>
                <span className="text-xl font-black text-slate-900">
                  {demoState.simulationMetrics.totalBookings}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                <span className="text-emerald-700 block font-medium">Total Disbursed</span>
                <span className="text-xl font-black text-emerald-900">
                  ₹{demoState.simulationMetrics.totalDisbursed.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 leading-relaxed">
          <strong>Isolation Guarantee:</strong> Virtual time manipulation occurs inside the isolated <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-300">demo_scenarios</code> domain and does not corrupt production clock synchronization.
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="py-2.5 px-6 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800"
          >
            Close Console
          </button>
        </div>
      </div>
    </div>
  );
}
