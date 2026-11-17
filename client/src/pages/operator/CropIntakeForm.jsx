import React, { useState, useEffect } from 'react';
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Clock,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  FileText,
} from 'lucide-react';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

export function CropIntakeForm({ centerId, onIntakeComplete }) {
  const { language } = useLanguage();
  const [activeQueue, setActiveQueue] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [receiptResult, setReceiptResult] = useState(null);

  // Form Fields
  const [grossWeight, setGrossWeight] = useState('');
  const [tareWeight, setTareWeight] = useState('0.00');
  const [qualityGrade, setQualityGrade] = useState('Grade A');
  const [outcome, setOutcome] = useState('accepted');
  const [acceptedQuantity, setAcceptedQuantity] = useState('');
  const [deductionAmount, setDeductionAmount] = useState('0.00');
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');

  // Payment update state inside receipt modal
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [paymentRef, setPaymentRef] = useState('');
  const [updatingPayment, setUpdatingPayment] = useState(false);

  useEffect(() => {
    if (centerId) {
      loadActiveQueue();
    }
  }, [centerId]);

  async function loadActiveQueue() {
    try {
      setLoading(true);
      const res = await api.get(`/queue/center/${centerId}`);
      if (res.data?.queue) {
        // Show called, serving, and waiting farmers
        const intakeEligible = res.data.queue.filter((q) =>
          ['called', 'serving', 'waiting'].includes(q.status)
        );
        setActiveQueue(intakeEligible);
        if (intakeEligible.length > 0 && !selectedEntry) {
          const called = intakeEligible.find((q) => q.status === 'called' || q.status === 'serving');
          selectBooking(called || intakeEligible[0]);
        }
      }
    } catch (err) {
      console.warn('Intake queue load error:', err.message);
    } finally {
      setLoading(false);
    }
  }

  const selectBooking = (entry) => {
    setSelectedEntry(entry);
    setReceiptResult(null);
    setError('');
    const est = entry.estimated_quintals || '';
    setGrossWeight(est);
    setTareWeight('0.00');
    setAcceptedQuantity(est);
    setDeductionAmount('0.00');
    setOutcome('accepted');
    setRejectionReason('');
    setNotes('');
  };

  // Live Calculations
  const gross = parseFloat(grossWeight) || 0;
  const tare = parseFloat(tareWeight) || 0;
  const net = Math.max(0, parseFloat((gross - tare).toFixed(2)));
  const rate = selectedEntry?.price_snapshot || 0;
  const accepted = outcome === 'rejected' ? 0 : parseFloat(acceptedQuantity) || 0;
  const deductions = parseFloat(deductionAmount) || 0;
  const grossPayable = parseFloat((accepted * rate).toFixed(2));
  const payableAmount = outcome === 'rejected' ? 0 : Math.max(0, parseFloat((grossPayable - deductions).toFixed(2)));

  const handleGrossChange = (val) => {
    setGrossWeight(val);
    const newNet = Math.max(0, (parseFloat(val) || 0) - tare);
    setAcceptedQuantity(newNet.toFixed(2));
  };

  const handleTareChange = (val) => {
    setTareWeight(val);
    const newNet = Math.max(0, gross - (parseFloat(val) || 0));
    setAcceptedQuantity(newNet.toFixed(2));
  };

  const handleSubmitIntake = async (e) => {
    e.preventDefault();
    if (!selectedEntry) return;

    setError('');
    setSubmitting(true);

    try {
      const payload = {
        bookingId: selectedEntry.booking_id,
        grossWeight: parseFloat(grossWeight),
        tareWeight: parseFloat(tareWeight) || 0,
        qualityGrade,
        outcome,
        acceptedQuantity: outcome === 'rejected' ? 0 : parseFloat(acceptedQuantity),
        deductionAmount: parseFloat(deductionAmount) || 0,
        rejectionReason: outcome === 'rejected' ? rejectionReason : null,
        notes,
      };

      const res = await api.post('/procurement/intake', payload);
      setReceiptResult(res.data);
      if (res.data?.payment) {
        setPaymentStatus(res.data.payment.payment_status);
        setPaymentRef(res.data.payment.reference_id || '');
      }
      loadActiveQueue();
      if (onIntakeComplete) onIntakeComplete();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Intake recording failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePayment = async (newStatus) => {
    if (!receiptResult?.payment?.id) return;
    setUpdatingPayment(true);
    try {
      const res = await api.patch(`/payments/${receiptResult.payment.id}/status`, {
        status: newStatus,
        referenceId: paymentRef || `UTR-${Date.now()}`,
        notes: `Updated from operator desk to ${newStatus}`,
      });
      setPaymentStatus(res.data.payment.payment_status);
      alert(`Payment status successfully updated to: ${newStatus.toUpperCase()}`);
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to update payment');
    } finally {
      setUpdatingPayment(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Eligible Tokens Bar */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
          Select Checked-in / Called Token for Weighing & Inspection
        </span>

        {loading ? (
          <div className="p-4 text-center text-xs text-slate-400">Loading eligible tokens...</div>
        ) : activeQueue.length === 0 ? (
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500">
            No checked-in farmers waiting for intake. Scan farmer QR code at gate first.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {activeQueue.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => selectBooking(q)}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  selectedEntry?.id === q.id
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-emerald-400'
                    : q.status === 'called' || q.status === 'serving'
                    ? 'bg-amber-50 border-amber-300 text-slate-900'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black">#{q.token_number}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                      q.status === 'called' ? 'bg-amber-400 text-slate-900' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {q.status}
                  </span>
                </div>
                <div className="text-[11px] font-semibold truncate mt-1">{q.farmer_name}</div>
                <div className="text-[10px] text-slate-400 truncate">{q.estimated_quintals}q {q.crop_name_en}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Selected Token Weighing Form */}
      {selectedEntry && !receiptResult && (
        <form onSubmit={handleSubmitIntake} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
          {/* Header & Farmer Reference */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-900 text-white">
                  Token #{selectedEntry.token_number}
                </span>
                <span className="text-xs font-bold text-slate-600">
                  Ref: {selectedEntry.booking_reference}
                </span>
              </div>
              <h3 className="text-xl font-black text-slate-900">
                {selectedEntry.farmer_name} — {selectedEntry.farmer_mobile || selectedEntry.farmer_phone}
              </h3>
              <p className="text-xs text-slate-500">
                Reserved {selectedEntry.estimated_quintals}q {selectedEntry.crop_name_en} • Guaranteed Rate: ₹{selectedEntry.price_snapshot}/quintal
              </p>
            </div>

            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-right">
              <span className="text-[10px] font-bold text-emerald-800 uppercase block">Locked Price Guarantee</span>
              <span className="text-2xl font-black text-emerald-900">₹{selectedEntry.price_snapshot}</span>
              <span className="text-[10px] text-emerald-700 block">per quintal</span>
            </div>
          </div>

          {/* Weighbridge & Grading Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Gross Weight */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Gross Weight (q) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                required
                value={grossWeight}
                onChange={(e) => handleGrossChange(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400">Total scale reading with vehicle</span>
            </div>

            {/* Tare Weight */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Tare Weight (q)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={tareWeight}
                onChange={(e) => handleTareChange(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400">Empty vehicle / trolley weight</span>
            </div>

            {/* Net Weighed (Calculated) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Net Weighed (q)
              </label>
              <div className="px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 font-black text-slate-900 text-sm">
                {net.toFixed(2)} quintals
              </div>
              <span className="text-[10px] text-slate-400">Gross - Tare</span>
            </div>

            {/* Quality Grade */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Quality Grade *
              </label>
              <select
                value={qualityGrade}
                onChange={(e) => setQualityGrade(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="Grade A">Grade A (Premium / FAQ)</option>
                <option value="Grade B">Grade B (Standard)</option>
                <option value="Grade C">Grade C (Slight Moisture)</option>
                <option value="Substandard">Substandard</option>
              </select>
            </div>
          </div>

          {/* Outcome & Quantity Deductions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {/* Outcome */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Intake Decision / Outcome *
              </label>
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="accepted">Accepted (Full Intake)</option>
                <option value="partially_accepted">Partially Accepted</option>
                <option value="rejected">Rejected (Does Not Meet Standards)</option>
              </select>
            </div>

            {/* Accepted Quantity */}
            {outcome !== 'rejected' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Accepted Quantity (q) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={net}
                  required
                  value={acceptedQuantity}
                  onChange={(e) => setAcceptedQuantity(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400">Must be ≤ {net.toFixed(2)} quintals</span>
              </div>
            )}

            {/* Deduction Amount */}
            {outcome !== 'rejected' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Moisture / Cleaning Deduction (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={deductionAmount}
                  onChange={(e) => setDeductionAmount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Rejection Reason if rejected */}
          {outcome === 'rejected' && (
            <div className="space-y-1 bg-red-50 p-4 rounded-2xl border border-red-200">
              <label className="text-xs font-black text-red-900 uppercase tracking-wider block">
                Mandatory Rejection Reason *
              </label>
              <textarea
                required
                rows={2}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="State specific deficiency (e.g. moisture > 18%, fungal infection, non-conforming foreign matter)"
                className="w-full p-3 rounded-xl border border-red-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Inspection Notes / Lab Slip Reference
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Moisture 11.2%, dockage 0.4%, visual inspection passed"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800"
            />
          </div>

          {/* Real-time Exact Calculation Summary Card */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                  Deterministic Financial Summary (AT-14)
                </span>
                <h4 className="text-lg font-black">Authorized Payment Calculation</h4>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block font-semibold">Net Payable to Farmer</span>
                <span className="text-3xl font-black text-emerald-400">
                  ₹{payableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block">Accepted Quantity</span>
                <span className="font-bold text-white text-base">{accepted.toFixed(2)} q</span>
              </div>
              <div>
                <span className="text-slate-400 block">Applied Rate</span>
                <span className="font-bold text-white text-base">₹{rate.toFixed(2)}/q</span>
              </div>
              <div>
                <span className="text-slate-400 block">Gross Payable</span>
                <span className="font-bold text-white text-base">₹{grossPayable.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Quality Deductions</span>
                <span className="font-bold text-amber-400 text-base">- ₹{deductions.toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="py-3 px-8 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-black text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <span>Processing & Snapshotting...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Issue Immutable Receipt & Complete Intake</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Generated Receipt Display & Payment Transition Modal */}
      {receiptResult && (
        <div className="bg-white rounded-3xl border border-emerald-300 p-6 sm:p-8 space-y-6 shadow-xl ring-2 ring-emerald-500/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-black text-emerald-700 uppercase tracking-wider block">
                  Intake Completed & Digitally Certified
                </span>
                <h3 className="text-2xl font-black text-slate-900">
                  {receiptResult.receipt.receipt_number}
                </h3>
              </div>
            </div>

            <button
              onClick={() => {
                setReceiptResult(null);
                setSelectedEntry(null);
              }}
              className="py-2 px-4 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              Process Next Farmer
            </button>
          </div>

          {/* Receipt Specifications */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 block font-semibold">Farmer</span>
              <span className="font-black text-slate-900 text-sm">
                {receiptResult.procurementRecord?.farmer_name || selectedEntry?.farmer_name}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold">Crop</span>
              <span className="font-black text-slate-900 text-sm">
                {selectedEntry?.crop_name_en} ({receiptResult.procurementRecord.quality_grade})
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold">Accepted Quantity</span>
              <span className="font-black text-slate-900 text-sm">
                {receiptResult.procurementRecord.accepted_quantity} Quintals
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold">Payable Amount</span>
              <span className="font-black text-emerald-800 text-lg">
                ₹{Number(receiptResult.procurementRecord.payable_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Payment Lifecycle Controller (AT-15) */}
          <div className="p-6 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-700" />
                <h4 className="text-sm font-black text-amber-900 uppercase tracking-wider">
                  Direct Beneficiary Payment Status (AT-15)
                </h4>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                  paymentStatus === 'paid'
                    ? 'bg-emerald-600 text-white'
                    : paymentStatus === 'processing'
                    ? 'bg-blue-600 text-white'
                    : 'bg-amber-400 text-slate-900'
                }`}
              >
                Status: {paymentStatus}
              </span>
            </div>

            <p className="text-xs text-slate-600">
              Payments initiate as PENDING upon intake. Operators or Treasury can record banking transaction references (NEFT/RTGS/DBT) to transition to PROCESSING and PAID.
              <span className="block mt-1 text-[11px] text-amber-700 font-bold">
                (Simulated Payment Event: Academic demonstration only. No real banking transaction occurs).
              </span>
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <input
                type="text"
                placeholder="Transaction UTR / Bank Batch Ref"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                disabled={paymentStatus === 'paid'}
                className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white"
              />

              {paymentStatus === 'pending' && (
                <button
                  type="button"
                  disabled={updatingPayment}
                  onClick={() => handleUpdatePayment('processing')}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 disabled:opacity-50"
                >
                  Mark as Processing (Treasury Batch)
                </button>
              )}

              {(paymentStatus === 'pending' || paymentStatus === 'processing') && (
                <button
                  type="button"
                  disabled={updatingPayment}
                  onClick={() => handleUpdatePayment('paid')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 disabled:opacity-50"
                >
                  Mark as Paid (Disbursed)
                </button>
              )}

              {paymentStatus === 'paid' && (
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Settled to Farmer Bank Account
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
