import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, QrCode, XCircle, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { QRCodeDisplay } from '../../components/common/QRCodeSvg';
import { useLanguage } from '../../context/LanguageContext';

export function MyBookingsPage() {
  const { t, language, localizeCenterName, localizeCenterAddress } = useLanguage();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedQrBooking, setSelectedQrBooking] = useState(null);
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const getStatusLabel = (status) => {
    if (language !== 'hi') return status.replace('_', ' ').toUpperCase();
    switch (status) {
      case 'confirmed': return 'पुष्टि हुई';
      case 'checked_in': return 'गेट चेक-इन';
      case 'in_service': return 'तौल जारी';
      case 'completed': return 'सफल संपन्न';
      case 'cancelled': return 'रद्द किया गया';
      case 'no_show': return 'अनुपस्थित';
      case 'rescheduling_required': return 'पुनर्निर्धारण आवश्यक';
      default: return status.replace('_', ' ').toUpperCase();
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    try {
      setLoading(true);
      const res = await api.get('/bookings/my');
      if (res.data?.bookings) {
        setBookings(res.data.bookings);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancellingBooking || !cancelReason.trim()) return;

    try {
      await api.post(`/bookings/${cancellingBooking.id}/cancel`, {
        reason: cancelReason.trim(),
      });
      setActionSuccess(
        language === 'hi'
          ? `बुकिंग ${cancellingBooking.booking_reference} सफलतापूर्वक रद्द कर दी गई एवं स्लॉट क्षमता पुनः जारी कर दी गई।`
          : `Booking ${cancellingBooking.booking_reference} cancelled and capacity released.`
      );
      setCancellingBooking(null);
      setCancelReason('');
      loadBookings();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Cancellation failed');
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'active') return ['confirmed', 'checked_in', 'in_service'].includes(b.status);
    if (activeTab === 'completed') return b.status === 'completed';
    if (activeTab === 'cancelled') return ['cancelled', 'no_show', 'rescheduling_required'].includes(b.status);
    return true;
  });

  return (
    <div className="space-y-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('my_bookings.title')}</h1>
          <p className="text-sm text-slate-500">{t('my_bookings.subtitle')}</p>
        </div>

        <Link
          to="/centers"
          className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl gradient-agri text-white font-bold text-xs shadow-md hover:opacity-95"
        >
          <span>{t('my_bookings.book_new_btn')}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess('')} className="text-emerald-700 font-bold hover:underline">
            {language === 'hi' ? 'हटाएं' : 'Dismiss'}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'all', label: t('my_bookings.tab_all') },
          { id: 'active', label: t('my_bookings.tab_active') },
          { id: 'completed', label: t('my_bookings.tab_completed') },
          { id: 'cancelled', label: t('my_bookings.tab_cancelled') },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500 font-medium">{t('my_bookings.loading')}</div>
      ) : filteredBookings.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">{t('my_bookings.no_bookings_title')}</h3>
          <p className="text-xs text-slate-500">{t('my_bookings.no_bookings_desc')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBookings.map((b) => (
            <div
              key={b.id}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                {/* Header: Reference and Status */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                    {b.booking_reference}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      b.status === 'confirmed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : b.status === 'checked_in'
                        ? 'bg-blue-100 text-blue-800'
                        : b.status === 'completed'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {getStatusLabel(b.status)}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900">{localizeCenterName(b.center_name)}</h3>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>
                      {new Date(b.starts_at).toLocaleDateString(language === 'hi' ? 'hi-IN' : [], {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>
                      {new Date(b.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                      {new Date(b.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{localizeCenterAddress(b.center_name, `${b.center_address}, ${b.center_district}`)}</span>
                  </div>
                </div>

                {/* Crop & Price Snapshot */}
                <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-slate-50">
                    <span className="text-[10px] text-slate-400 font-bold block">{t('my_bookings.card_crop')}</span>
                    <span className="font-extrabold text-slate-800">
                      {language === 'hi' ? b.crop_name_hi : b.crop_name_en?.split(' ')[0]}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50">
                    <span className="text-[10px] text-slate-400 font-bold block">{t('my_bookings.card_quantity')}</span>
                    <span className="font-extrabold text-slate-800">{b.estimated_quintals} {language === 'hi' ? 'क्विंटल' : 'q'}</span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50">
                    <span className="text-[10px] text-slate-400 font-bold block">{t('my_bookings.card_rate')}</span>
                    <span className="font-extrabold text-agri-700">₹{b.price_snapshot}/q</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                {['confirmed', 'checked_in', 'in_service'].includes(b.status) ? (
                  <>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedQrBooking(b)}
                        className="inline-flex items-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>{t('my_bookings.view_qr_btn')}</span>
                      </button>

                      <Link
                        to={`/farmer/queue?bookingId=${b.id}&centerId=${b.center_id}`}
                        className="inline-flex items-center gap-1.5 py-2 px-3 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 font-bold text-xs hover:bg-blue-100"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>{t('my_bookings.track_queue_btn')}</span>
                      </Link>
                    </div>

                    {b.status === 'confirmed' && (
                      <button
                        onClick={() => setCancellingBooking(b)}
                        className="py-2 px-3 rounded-xl border border-red-200 text-red-600 font-bold text-xs hover:bg-red-50"
                      >
                        {t('my_bookings.cancel_slot_btn')}
                      </button>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-slate-400 font-medium">
                    {b.cancellation_reason
                      ? `${language === 'hi' ? 'कारण:' : 'Reason:'} ${b.cancellation_reason}`
                      : (language === 'hi' ? 'बुकिंग संग्रहीत' : 'Booking archived')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR Code Presentation Modal */}
      {selectedQrBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900">
              {language === 'hi' ? 'डिजिटल अपॉइंटमेंट टोकन' : 'Digital Appointment Token'}
            </h3>
            <p className="text-xs text-slate-500">
              {language === 'hi'
                ? 'मंडी आगमन पर सुरक्षा गेट स्कैनर अथवा केंद्र ऑपरेटर को यह हस्ताक्षरित क्यूआर टोकन दिखाएं।'
                : 'Present this signed QR token to the center operator upon arrival at the mandi.'}
            </p>

            <div className="py-2 flex justify-center">
              <QRCodeDisplay
                token={selectedQrBooking.qr_token_hash}
                reference={selectedQrBooking.booking_reference}
                size={200}
              />
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-left space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">{language === 'hi' ? 'खरीद केंद्र:' : 'Center:'}</span>
                <span className="font-bold text-slate-800">{localizeCenterName(selectedQrBooking.center_name)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{language === 'hi' ? 'समय स्लॉट:' : 'Slot Window:'}</span>
                <span className="font-bold text-slate-800">
                  {new Date(selectedQrBooking.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{language === 'hi' ? 'आरक्षित दर:' : 'Locked Rate:'}</span>
                <span className="font-bold text-agri-700">
                  ₹{selectedQrBooking.price_snapshot}/{language === 'hi' ? 'क्विंटल' : 'quintal'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedQrBooking(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800"
            >
              {language === 'hi' ? 'पूर्ण / बंद करें' : 'Done / Close'}
            </button>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancellingBooking && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              {t('my_bookings.cancel_modal_title')}
            </h3>
            <p className="text-xs text-slate-600">
              {language === 'hi' ? (
                <>
                  क्या आप वास्तव में बुकिंग <span className="font-bold text-slate-800">{cancellingBooking.booking_reference}</span> को रद्द करना चाहते हैं? आपकी आरक्षित स्लॉट क्षमता अन्य किसान भाइयों के लिए पुनः जारी कर दी जाएगी।
                </>
              ) : (
                <>
                  Are you sure you want to cancel booking <span className="font-bold text-slate-800">{cancellingBooking.booking_reference}</span>? Your reserved slot capacity will be released back to other farmers.
                </>
              )}
            </p>

            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  {t('my_bookings.cancel_reason_label')}
                </label>
                <textarea
                  required
                  rows={2}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder={
                    language === 'hi'
                      ? 'उदा. ट्रैक्टर परिवहन में देरी, मौसम संबंधी समस्या, फसल सुखाने में समय...'
                      : 'e.g. Transport tractor delayed, weather issues...'
                  }
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCancellingBooking(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700"
                >
                  {t('my_bookings.keep_slot_btn')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700"
                >
                  {t('my_bookings.confirm_cancel_btn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
