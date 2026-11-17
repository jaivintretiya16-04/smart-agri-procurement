import React, { useState, useEffect } from 'react';
import { Building2, QrCode, Users, Scale, AlertTriangle, ShieldCheck, Edit3, CheckCircle2, Clock, Calendar } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { LiveQueueManager } from './LiveQueueManager';
import { CropIntakeForm } from './CropIntakeForm';
import { EmergencyControls } from './EmergencyControls';

export function OperatorDashboard() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [centers, setCenters] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingPrices, setEditingPrices] = useState(false);
  const [priceForm, setPriceForm] = useState({});
  const [saveStatus, setSaveStatus] = useState('');
  const [activeTab, setActiveTab] = useState('queue'); // 'queue', 'rates', 'intake', 'emergency'

  useEffect(() => {
    loadOperatorCenters();
  }, []);

  async function loadOperatorCenters() {
    try {
      setLoading(true);
      const res = await api.get('/centers');
      if (res.data?.centers?.length > 0) {
        setCenters(res.data.centers);
        // Load full details for first center
        const detailRes = await api.get(`/centers/${res.data.centers[0].id}`);
        if (detailRes.data?.center) {
          setSelectedCenter(detailRes.data.center);
          initPriceForm(detailRes.data.center.crops);
        }
      }
    } catch (err) {
      console.error('Failed to load operator centers:', err);
    } finally {
      setLoading(false);
    }
  }

  const initPriceForm = (crops) => {
    const form = {};
    crops?.forEach((c) => {
      form[c.id || c.crop_id] = c.rate_per_quintal || c.price_per_quintal || '';
    });
    setPriceForm(form);
  };

  const handlePriceUpdate = async (e) => {
    e.preventDefault();
    setSaveStatus('');
    try {
      const cropPrices = Object.entries(priceForm).map(([cropId, rate]) => ({
        cropId,
        ratePerQuintal: parseFloat(rate),
      }));

      await api.put(`/centers/${selectedCenter.id}/prices`, { cropPrices });
      setSaveStatus('Prices updated and snapshotted successfully!');
      setEditingPrices(false);

      // Reload center details
      const detailRes = await api.get(`/centers/${selectedCenter.id}`);
      if (detailRes.data?.center) {
        setSelectedCenter(detailRes.data.center);
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Price update failed');
    }
  };

  return (
    <div className="space-y-8 py-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-amber-900 to-amber-700 text-white p-6 sm:p-8 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-200 text-xs font-bold border border-amber-400/20">
            <Building2 className="w-3.5 h-3.5" />
            <span>{t('roles.operator')} Control Desk</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">
            Operator Console — {user?.name || 'Center Operator'}
          </h1>
          <p className="text-sm text-amber-100 max-w-xl">
            {selectedCenter
              ? `Active Mandi: ${selectedCenter.name} (${selectedCenter.type.toUpperCase()})`
              : 'Managing assigned agricultural procurement center'}
          </p>
        </div>
      </div>

      {saveStatus && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{saveStatus}</span>
        </div>
      )}

      {/* Operator Modules Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('queue')}
          className={`p-5 rounded-2xl border text-left transition-all ${
            activeTab === 'queue'
              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500 shadow-md'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold mb-3">
            <QrCode className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">Live Queue & QR Scanner</h3>
          <p className="text-xs text-slate-500">Scan tokens (-15m/+15m window) and call sequential tokens.</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rates')}
          className={`p-5 rounded-2xl border text-left transition-all ${
            activeTab === 'rates'
              ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-500 shadow-md'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold mb-3">
            <Building2 className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">Center Rates & Schedules</h3>
          <p className="text-xs text-slate-500">Update advertised rates with snapshots and view capacities.</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('intake')}
          className={`p-5 rounded-2xl border text-left transition-all ${
            activeTab === 'intake'
              ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-500 shadow-md'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold mb-3">
            <Scale className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">Crop Weighing & Intake</h3>
          <p className="text-xs text-slate-500">Record gross, tare, accepted quantity and issue digital receipt.</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('emergency')}
          className={`p-5 rounded-2xl border text-left transition-all ${
            activeTab === 'emergency'
              ? 'bg-red-50 border-red-400 ring-2 ring-red-500 shadow-md'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-800 flex items-center justify-center font-bold mb-3">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">Emergency Closures</h3>
          <p className="text-xs text-slate-500">Declare temporary pauses or emergency closures with auto re-accommodation.</p>
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-slate-500 font-medium">Loading center details...</div>
      ) : selectedCenter ? (
        <>
          {/* TAB 1: Live Queue & Scanner */}
          {activeTab === 'queue' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                  <span>Real-Time Mandi Queue Dispatch: {selectedCenter.name}</span>
                </h2>
              </div>
              <LiveQueueManager centerId={selectedCenter.id} />
            </div>
          )}

          {/* TAB 2: Rates & Schedules */}
          {activeTab === 'rates' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                      {selectedCenter.type.toUpperCase()}
                    </span>
                    <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Verified & Active
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">{selectedCenter.name}</h2>
                  <p className="text-xs text-slate-500">{selectedCenter.address}, {selectedCenter.district}</p>
                </div>

                <button
                  onClick={() => setEditingPrices(!editingPrices)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-300 font-bold text-xs hover:bg-amber-100 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{editingPrices ? 'Cancel Editing' : 'Update Published Rates'}</span>
                </button>
              </div>

              {/* Price Update Form */}
              {editingPrices ? (
                <form onSubmit={handlePriceUpdate} className="bg-amber-50/50 p-6 rounded-2xl border border-amber-200/80 space-y-4">
                  <h3 className="text-sm font-bold text-amber-900">Set Effective Crop Procurement Rates (₹/Quintal)</h3>
                  <p className="text-xs text-slate-600">
                    Notice: Updating advertised prices archives prior rates and applies only to new bookings. Existing bookings preserve their historical price snapshot.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedCenter.crops?.map((cr) => {
                      const cropId = cr.id || cr.crop_id;
                      return (
                        <div key={cropId} className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                          <label className="text-xs font-bold text-slate-700 block">
                            {language === 'hi' ? cr.name_hi : cr.name_en}
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                            <input
                              type="number"
                              step="0.01"
                              required
                              value={priceForm[cropId] || ''}
                              onChange={(e) => setPriceForm({ ...priceForm, [cropId]: e.target.value })}
                              className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingPrices(false)}
                      className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-amber-600 text-white text-xs font-extrabold shadow-sm hover:bg-amber-700"
                    >
                      Save & Publish New Rates
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Current Published Rates at this Center
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {selectedCenter.crops?.map((cr) => (
                      <div key={cr.id || cr.crop_id} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <span className="text-xs font-semibold text-slate-600 block mb-1">
                          {language === 'hi' ? cr.name_hi : cr.name_en.split(' ')[0]}
                        </span>
                        <span className="text-lg font-black text-slate-900 block">
                          ₹{cr.rate_per_quintal || cr.price_per_quintal || '—'}
                        </span>
                        <span className="text-[10px] text-slate-400">per quintal</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Operating Schedules & Capacity */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Weekly Slot Schedules & Dual Capacity Limits
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName, idx) => {
                    const daySchedule = selectedCenter.schedules?.find((s) => s.day_of_week === idx + 1);
                    return (
                      <div key={dayName} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                        <span className="font-bold text-slate-800 block">{dayName}</span>
                        <span className="text-[11px] text-slate-600 block">
                          {daySchedule ? `${daySchedule.open_time.slice(0, 5)} - ${daySchedule.close_time.slice(0, 5)}` : 'Closed'}
                        </span>
                        <span className="text-[10px] text-agri-700 font-semibold block">
                          Max: {daySchedule?.default_max_farmers || 10} farmers / {daySchedule?.default_max_quintals || 100}q
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Crop Weighing & Intake */}
          {activeTab === 'intake' && (
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-purple-600" />
                  <span>Crop Inspection, Weighing & Digital Intake (Phase 6, AT-14)</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Select a checked-in farmer, record gross & tare weights, apply deductions, and issue an immutable digital receipt.
                </p>
              </div>
              <CropIntakeForm centerId={selectedCenter.id} />
            </div>
          )}

          {/* TAB 4: Emergency Closures & Analytics */}
          {activeTab === 'emergency' && (
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span>Emergency Mandi Closures & Operational Contingency (Phase 7, AT-12)</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Pause gate operations, declare emergency closures, safely protect farmer bookings, and view center analytics.
                </p>
              </div>
              <EmergencyControls
                centerId={selectedCenter.id}
                center={selectedCenter}
                onCenterStateChange={(newState) => {
                  setSelectedCenter((prev) => ({ ...prev, active_state: newState }));
                }}
              />
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
