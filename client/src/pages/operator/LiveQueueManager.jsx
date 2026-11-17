import React, { useState, useEffect } from 'react';
import { QrCode, Users, Clock, CheckCircle2, AlertCircle, ArrowRight, Play, Volume2 } from 'lucide-react';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

export function LiveQueueManager({ centerId }) {
  const { language } = useLanguage();
  const [queue, setQueue] = useState([]);
  const [qrInput, setQrInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [calling, setCalling] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (centerId) {
      loadQueue();
      const interval = setInterval(loadQueue, 5000); // Polling fallback for live queue
      return () => clearInterval(interval);
    }
  }, [centerId]);

  async function loadQueue() {
    try {
      const res = await api.get(`/queue/center/${centerId}`);
      if (res.data?.queue) {
        setQueue(res.data.queue);
      }
    } catch (err) {
      console.warn('Queue poll error:', err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleQrCheckIn = async (e) => {
    e.preventDefault();
    if (!qrInput.trim()) return;

    setError('');
    setScanResult(null);
    setCheckingIn(true);

    try {
      const res = await api.post('/queue/check-in', {
        centerId,
        qrToken: qrInput.trim(),
      });

      setScanResult(res.data);
      setQrInput('');
      loadQueue();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Check-in failed');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCallNext = async () => {
    setError('');
    setCalling(true);
    try {
      const res = await api.post(`/queue/center/${centerId}/call-next`);
      if (res.data?.calledEntry) {
        alert(`Token #${res.data.calledEntry.token_number} called!`);
      } else {
        alert('No waiting farmers in queue to call.');
      }
      loadQueue();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Call failed');
    } finally {
      setCalling(false);
    }
  };

  const handleStatusChange = async (queueEntryId, newStatus) => {
    try {
      await api.patch(`/queue/${queueEntryId}/status`, {
        centerId,
        status: newStatus,
      });
      loadQueue();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Status update failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar: Call Next & QR Scanner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Call Next Token Card */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 flex flex-col justify-between space-y-4 shadow-md">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5" /> Queue Dispatch Controller
            </span>
            <h3 className="text-xl font-black">Active Mandi Token Caller</h3>
            <p className="text-xs text-slate-400">
              Calls the next eligible checked-in farmer following strict scheduled slot order.
            </p>
          </div>

          <button
            onClick={handleCallNext}
            disabled={calling}
            className="w-full py-3.5 px-4 rounded-xl gradient-harvest text-slate-950 font-black text-sm shadow-md hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {calling ? (
              <span className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <Volume2 className="w-4 h-4" />
                <span>Call Next Waiting Token</span>
              </>
            )}
          </button>
        </div>

        {/* QR Scanner / Token Input Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-agri-700 uppercase tracking-wider flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5" /> Physical Check-In Terminal
            </span>
            <h3 className="text-lg font-bold text-slate-900">Scan Farmer QR Code</h3>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {scanResult && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">
                  {scanResult.isRepeat ? 'Repeat Scan Verified' : 'Check-In Confirmed'} — Token #{scanResult.tokenNumber}
                </span>
                <span className="text-[11px]">
                  Queue Position: #{scanResult.queuePosition} ({scanResult.queueStatus})
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleQrCheckIn} className="flex gap-2">
            <input
              type="text"
              required
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              placeholder="Paste or scan QR token (agri_qr_...)"
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-agri-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={checkingIn}
              className="px-4 py-2.5 rounded-xl gradient-agri text-white font-bold text-xs shadow-sm hover:opacity-95 disabled:opacity-50"
            >
              {checkingIn ? '...' : 'Verify'}
            </button>
          </form>
        </div>
      </div>

      {/* Live Queue Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-agri-700" />
            <h3 className="text-base font-bold text-slate-900">
              Live Priority Queue ({queue.length} Active in Mandi)
            </h3>
          </div>
          <span className="text-xs font-medium text-slate-400">
            Auto-refreshes every 5s • Priority: Scheduled Slot &gt; Arrival Time
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading live queue...</div>
        ) : queue.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No checked-in farmers waiting in queue right now.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Token #</th>
                  <th className="py-3 px-3">Farmer Name</th>
                  <th className="py-3 px-3">Crop Variety</th>
                  <th className="py-3 px-3">Scheduled Slot</th>
                  <th className="py-3 px-3">Check-in Time</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {queue.map((entry) => (
                  <tr
                    key={entry.queue_entry_id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      entry.queue_status === 'serving'
                        ? 'bg-purple-50/50'
                        : entry.queue_status === 'called'
                        ? 'bg-amber-50/50'
                        : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-mono font-black text-slate-900 text-sm">
                      #{entry.token_number}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-800">{entry.farmer_name || 'Farmer'}</td>
                    <td className="py-3 px-3 font-semibold text-slate-700">
                      {entry.estimated_quintals}q {entry.crop_name_en?.split(' ')[0]}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-600">
                      {new Date(entry.slot_starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {new Date(entry.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          entry.queue_status === 'serving'
                            ? 'bg-purple-100 text-purple-800'
                            : entry.queue_status === 'called'
                            ? 'bg-amber-100 text-amber-800 animate-pulse'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {entry.queue_status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-1.5">
                      {entry.queue_status === 'waiting' && (
                        <button
                          onClick={() => handleStatusChange(entry.queue_entry_id, 'called')}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 text-white font-bold text-[11px] hover:bg-amber-600"
                        >
                          Call
                        </button>
                      )}
                      {entry.queue_status === 'called' && (
                        <button
                          onClick={() => handleStatusChange(entry.queue_entry_id, 'serving')}
                          className="px-2.5 py-1 rounded-lg bg-purple-600 text-white font-bold text-[11px] hover:bg-purple-700"
                        >
                          Start Weighing
                        </button>
                      )}
                      {entry.queue_status === 'serving' && (
                        <button
                          onClick={() => handleStatusChange(entry.queue_entry_id, 'completed')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700"
                        >
                          Complete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
