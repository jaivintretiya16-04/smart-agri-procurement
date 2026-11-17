import React, { useState, useEffect } from 'react';
import { Shield, Building, CheckCircle, XCircle, AlertTriangle, Users, FileText, CheckCircle2, RotateCcw } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export function AdminDashboard() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [centers, setCenters] = useState([]);
  const [crops, setCrops] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState(null); // { center, decision: 'approved' | 'suspended' | 'rejected' }
  const [reviewReason, setReviewReason] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    loadAdminData();
  }, [selectedStatus]);

  async function loadAdminData() {
    try {
      setLoading(true);
      const url = selectedStatus ? `/centers?status=${selectedStatus}` : '/centers';
      const [centersRes, cropsRes] = await Promise.all([
        api.get(url),
        api.get('/crops'),
      ]);

      if (centersRes.data?.centers) {
        setCenters(centersRes.data.centers);
      }
      if (cropsRes.data?.crops) {
        setCrops(cropsRes.data.crops);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewModal || !reviewReason.trim()) return;

    try {
      await api.post(`/centers/${reviewModal.center.id}/verify`, {
        decision: reviewModal.decision,
        reason: reviewReason.trim(),
      });

      setFeedback(`Center "${reviewModal.center.name}" successfully updated to ${reviewModal.decision.toUpperCase()}`);
      setReviewModal(null);
      setReviewReason('');
      loadAdminData();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Verification update failed');
    }
  };

  return (
    <div className="space-y-8 py-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-800 text-white p-6 sm:p-8 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 text-xs font-bold border border-purple-400/20">
            <Shield className="w-3.5 h-3.5" />
            <span>{t('roles.admin')} Governance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">
            Platform Administration Console
          </h1>
          <p className="text-sm text-purple-100 max-w-xl">
            Oversee government & private mandi verification, audit compliance, maintain reference crop information, and manage platform security.
          </p>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
            <span className="font-semibold">{feedback}</span>
          </div>
          <button onClick={() => setFeedback('')} className="text-purple-600 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Center Governance & Verification Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Procurement Center Onboarding & Governance</h2>
            <p className="text-xs text-slate-500">Review centers and approve, reject, or suspend operations.</p>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Center Statuses</option>
              <option value="pending_verification">Pending Verification</option>
              <option value="approved">Approved</option>
              <option value="suspended">Suspended</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 font-medium">Loading centers...</div>
        ) : centers.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 font-medium">No centers found for this filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Center Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">District</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {centers.map((center) => (
                  <tr key={center.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{center.name}</td>
                    <td className="py-3.5 px-4">
                      <span className="capitalize font-semibold text-slate-700">{center.type}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{center.district}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          center.verification_status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : center.verification_status === 'pending_verification'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {center.verification_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      {center.verification_status !== 'approved' && (
                        <button
                          onClick={() => setReviewModal({ center, decision: 'approved' })}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700"
                        >
                          Approve
                        </button>
                      )}
                      {center.verification_status === 'approved' && (
                        <button
                          onClick={() => setReviewModal({ center, decision: 'suspended' })}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 text-white font-bold hover:bg-amber-600"
                        >
                          Suspend
                        </button>
                      )}
                      {center.verification_status === 'pending_verification' && (
                        <button
                          onClick={() => setReviewModal({ center, decision: 'rejected' })}
                          className="px-2.5 py-1 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700"
                        >
                          Reject
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

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              Confirm {reviewModal.decision.toUpperCase()} Decision
            </h3>
            <p className="text-xs text-slate-600">
              Center: <span className="font-bold text-slate-800">{reviewModal.center.name}</span>
            </p>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Mandatory Review Reason / Audit Note *
                </label>
                <textarea
                  required
                  minLength={5}
                  rows={3}
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                  placeholder="Provide verifiable justification for this governance decision..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReviewModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-700 text-white text-xs font-bold hover:bg-purple-800"
                >
                  Confirm Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Master Crop Catalog Display */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900">Master Agricultural Crop Catalog (FR-03)</h3>
        <p className="text-xs text-slate-500">
          The 5 core crops supported across the platform with bilingual labeling and standardized procurement units.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
          {crops.map((crop) => (
            <div key={crop.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-agri-700 uppercase block">{crop.code}</span>
              <span className="font-black text-sm text-slate-900 block">{crop.name_en}</span>
              <span className="text-xs font-medium text-slate-600 block">{crop.name_hi}</span>
              <span className="text-[10px] text-slate-400 block pt-1">Standard: {crop.unit}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
