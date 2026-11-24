import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Receipt,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Building2,
  Printer,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

export function ReceiptsPage() {
  const { t, language, localizeCenterName } = useLanguage();
  const [receipts, setReceipts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('receipts'); // 'receipts' | 'payments'
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [recRes, payRes] = await Promise.all([
        api.get('/procurement/receipts/my'),
        api.get('/payments/my/list'),
      ]);
      setReceipts(recRes.data?.receipts || []);
      setPayments(payRes.data?.payments || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load records');
    } finally {
      setLoading(false);
    }
  }

  const printReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-8 py-8 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/farmer"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-agri-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('receipts_page.back_to_portal')}</span>
        </Link>

        <Link
          to="/farmer/bookings"
          className="text-xs font-bold text-agri-700 hover:underline"
        >
          {t('receipts_page.view_appointments')}
        </Link>
      </div>

      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-2">
          <Receipt className="w-3.5 h-3.5" />
          <span>{t('receipts_page.badge')}</span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          {t('receipts_page.title')}
        </h1>
        <p className="text-sm text-slate-500">
          {t('receipts_page.subtitle')}
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('receipts')}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'receipts'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          {t('receipts_page.tab_receipts')} ({receipts.length})
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'payments'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          {t('receipts_page.tab_payments')} ({payments.length})
        </button>
      </div>

      {activeTab === 'payments' && (
        <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 flex items-center gap-2.5">
          <CreditCard className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="font-semibold">
            {language === 'hi' ? (
              <>
                <strong>शैक्षणिक प्रदर्शन (सिमुलेशन):</strong> प्रत्यक्ष लाभ अंतरण (DBT) संवितरण और बैंक संदर्भ UTR मूल्यांकन उद्देश्य हेतु सिमुलेटेड हैं। कोई वास्तविक मौद्रिक लेनदेन नहीं होता है।
              </>
            ) : (
              <>
                <strong>Simulated Academic Demonstration:</strong> Direct Beneficiary Transfer (DBT) disbursements and bank reference UTRs are simulated for collegiate evaluation. No real financial currency transfers take place.
              </>
            )}
          </span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500 font-semibold bg-white rounded-3xl border border-slate-200">
          {language === 'hi' ? 'खरीद रसीदें एवं भुगतान विवरण लोड हो रहे हैं...' : 'Loading receipts and payment ledger...'}
        </div>
      ) : activeTab === 'receipts' ? (
        receipts.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
            <p className="text-sm text-slate-600 font-medium">
              {language === 'hi' ? 'अभी तक आपकी कोई खरीद रसीद नहीं है।' : 'You have no procurement receipts yet.'}
            </p>
            <p className="text-xs text-slate-400">
              {language === 'hi'
                ? 'मंडी में फसल सुपुर्दगी, तौल और ऑपरेटर निरीक्षण के बाद डिजिटल रसीद स्वतः जारी हो जाती है।'
                : 'Receipts are issued automatically upon crop delivery, weighing, and operator inspection at the mandi.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {receipts.map((r) => {
              const snapshot = r.content_snapshot || {};
              const fin = snapshot.financials || {};
              const weights = snapshot.weights || {};
              const grading = snapshot.grading || {};

              return (
                <div
                  key={r.id}
                  className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:border-emerald-300 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 uppercase block">
                          {language === 'hi' ? 'रसीद संख्या' : 'Receipt Identifier'}
                        </span>
                        <span className="text-base font-black text-slate-900">{r.receipt_number}</span>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase ${
                          r.outcome === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {language === 'hi'
                          ? (r.outcome === 'accepted' ? 'स्वीकृत' : r.outcome === 'rejected' ? 'अस्वीकृत' : r.outcome)
                          : r.outcome}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-slate-900">{localizeCenterName(r.center_name)}</h4>
                      <p className="text-xs text-slate-500">
                        {language === 'hi' ? r.crop_name_hi : r.crop_name_en} • {language === 'hi' ? 'संदर्भ:' : 'Ref:'} {r.booking_reference}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block font-medium">
                          {language === 'hi' ? 'शुद्ध तौल' : 'Net Weighed'}
                        </span>
                        <span className="font-bold text-slate-800">
                          {weights.netWeightQuintals || r.accepted_quantity} {language === 'hi' ? 'क्विंटल' : 'q'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">
                          {language === 'hi' ? 'स्वीकृत मात्रा' : 'Accepted Qty'}
                        </span>
                        <span className="font-bold text-slate-800">
                          {r.accepted_quantity} {language === 'hi' ? 'क्विंटल' : 'q'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">
                          {language === 'hi' ? 'दर / क्विंटल' : 'Rate / Quintal'}
                        </span>
                        <span className="font-bold text-slate-800">₹{fin.ratePerQuintal || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">
                          {language === 'hi' ? 'कुल देय राशि' : 'Payable Total'}
                        </span>
                        <span className="font-black text-emerald-700">
                          ₹{Number(r.payable_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(r.issued_at).toLocaleDateString(language === 'hi' ? 'hi-IN' : [], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="font-semibold text-slate-600">
                        {language === 'hi' ? 'भुगतान:' : 'Payment:'}{' '}
                        <span className="uppercase text-emerald-700 font-bold">
                          {language === 'hi'
                            ? (r.payment_status === 'paid' ? 'सफल' : r.payment_status === 'processing' ? 'प्रक्रियाधीन' : 'लंबित')
                            : (r.payment_status || 'pending')}
                        </span>
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedReceipt(r)}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>{language === 'hi' ? 'प्रमाणित वाउचर देखें' : 'View Certified Voucher'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Payments Tab */
        payments.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-500 font-medium">
            {language === 'hi' ? 'अभी तक कोई भुगतान रिकॉर्ड नहीं है।' : 'No payments recorded yet.'}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-4">{language === 'hi' ? 'रसीद संदर्भ' : 'Receipt Ref'}</th>
                    <th className="px-6 py-4">{language === 'hi' ? 'खरीद केंद्र' : 'Center'}</th>
                    <th className="px-6 py-4">{language === 'hi' ? 'फसल' : 'Crop'}</th>
                    <th className="px-6 py-4">{language === 'hi' ? 'देय राशि' : 'Payable Amount'}</th>
                    <th className="px-6 py-4">{language === 'hi' ? 'भुगतान स्थिति' : 'Payment Status'}</th>
                    <th className="px-6 py-4">{language === 'hi' ? 'संदर्भ यूटीआर' : 'Reference UTR'}</th>
                    <th className="px-6 py-4">{language === 'hi' ? 'दिनांक' : 'Date'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-4 font-bold text-slate-900">{p.receipt_number || p.booking_reference}</td>
                      <td className="px-6 py-4">{localizeCenterName(p.center_name)}</td>
                      <td className="px-6 py-4">{language === 'hi' ? p.crop_name_hi : p.crop_name_en}</td>
                      <td className="px-6 py-4 font-black text-emerald-700">
                        ₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            p.payment_status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.payment_status === 'processing'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {language === 'hi'
                            ? (p.payment_status === 'paid' ? 'सफल' : p.payment_status === 'processing' ? 'प्रक्रियाधीन' : 'लंबित')
                            : p.payment_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-[11px] text-slate-500">{p.reference_id || '—'}</td>
                      <td className="px-6 py-4 text-slate-400">
                        {new Date(p.created_at).toLocaleDateString(language === 'hi' ? 'hi-IN' : [], {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Printable Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-black text-slate-900">
                  {language === 'hi' ? 'आधिकारिक खरीद रसीद' : 'Official Procurement Receipt'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Receipt Body */}
            <div id="printable-voucher" className="space-y-4 text-xs">
              <div className="text-center space-y-1 border-b border-slate-100 pb-4">
                <div className="font-black text-base text-slate-900">
                  {localizeCenterName(selectedReceipt.center_name)}
                </div>
                <div className="font-mono text-xs font-bold text-emerald-800">
                  {language === 'hi' ? 'रसीद संख्या:' : 'Receipt No:'} {selectedReceipt.receipt_number}
                </div>
                <div className="text-slate-400 text-[11px]">
                  {language === 'hi' ? 'जारी करने का समय:' : 'Issued on'}{' '}
                  {new Date(selectedReceipt.issued_at).toLocaleString(language === 'hi' ? 'hi-IN' : [])}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 py-2 border-b border-slate-100">
                <div>
                  <span className="text-slate-400 block font-medium">
                    {language === 'hi' ? 'बुकिंग संदर्भ' : 'Booking Reference'}
                  </span>
                  <span className="font-bold text-slate-800">{selectedReceipt.booking_reference}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">
                    {language === 'hi' ? 'निर्णय / ग्रेड' : 'Decision / Grade'}
                  </span>
                  <span className="font-bold text-slate-800">
                    {language === 'hi'
                      ? (selectedReceipt.outcome === 'accepted' ? 'स्वीकृत' : 'अस्वीकृत')
                      : selectedReceipt.outcome?.toUpperCase()}{' '}
                    ({selectedReceipt.content_snapshot?.grading?.qualityGrade || 'Grade A'})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">
                    {language === 'hi' ? 'फसल किस्म' : 'Crop Variety'}
                  </span>
                  <span className="font-bold text-slate-800">
                    {language === 'hi' ? selectedReceipt.crop_name_hi : selectedReceipt.crop_name_en}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">
                    {language === 'hi' ? 'स्वीकृत मात्रा' : 'Accepted Quantity'}
                  </span>
                  <span className="font-bold text-slate-800">
                    {selectedReceipt.accepted_quantity} {language === 'hi' ? 'क्विंटल' : 'Quintals'}
                  </span>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="space-y-2 py-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">
                    {language === 'hi' ? 'दर प्रति क्विंटल:' : 'Rate per Quintal:'}
                  </span>
                  <span className="font-bold text-slate-800">
                    ₹{selectedReceipt.content_snapshot?.financials?.ratePerQuintal}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">
                    {language === 'hi' ? 'सकल देय राशि:' : 'Gross Payable:'}
                  </span>
                  <span className="font-bold text-slate-800">
                    ₹{selectedReceipt.content_snapshot?.financials?.grossPayable?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">
                    {language === 'hi' ? 'गुणवत्ता / नमी कटौती:' : 'Quality / Moisture Deductions:'}
                  </span>
                  <span className="font-bold text-amber-700">
                    - ₹{selectedReceipt.content_snapshot?.financials?.deductionAmount?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-black pt-2 border-t border-slate-200">
                  <span className="text-slate-900">
                    {language === 'hi' ? 'कुल शुद्ध देय राशि:' : 'Total Net Amount Payable:'}
                  </span>
                  <span className="text-emerald-700">
                    ₹{Number(selectedReceipt.payable_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center text-[10px] text-slate-400">
                {language === 'hi'
                  ? 'यह दस्तावेज़ स्मार्ट मंडी प्रणाली द्वारा जारी कृषि खरीद का प्रमाणित डिजिटल रिकॉर्ड है।'
                  : 'This document is a certified digital record of agricultural procurement generated by the Smart Mandi System.'}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={printReceipt}
                className="py-2.5 px-4 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>{language === 'hi' ? 'वाउचर प्रिंट करें' : 'Print Voucher'}</span>
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="py-2.5 px-6 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800"
              >
                {language === 'hi' ? 'बंद करें' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
