import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Volume2,
  ArrowLeft,
  Building2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import api from '../../services/api';
import { QRCodeDisplay } from '../../components/common/QRCodeSvg';
import { useLanguage } from '../../context/LanguageContext';

export function LiveQueueTrackerPage() {
  const { t, language, localizeCenterName, localizeCenterAddress } = useLanguage();
  const [searchParams] = useSearchParams();
  const centerIdParam = searchParams.get('centerId');
  const bookingIdParam = searchParams.get('bookingId');

  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [queueState, setQueueState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [audioNotification, setAudioNotification] = useState(false);

  const getStatusLabel = (status) => {
    if (language !== 'hi') return status?.replace('_', ' ')?.toUpperCase();
    switch (status) {
      case 'confirmed': return 'पुष्टि हुई';
      case 'checked_in': return 'गेट चेक-इन';
      case 'in_service': return 'तौल जारी';
      case 'completed': return 'सफल संपन्न';
      case 'cancelled': return 'रद्द';
      default: return status?.replace('_', ' ')?.toUpperCase();
    }
  };

  // Load farmer's active bookings
  useEffect(() => {
    async function loadActiveBookings() {
      try {
        setLoading(true);
        const res = await api.get('/bookings/my');
        if (res.data?.bookings) {
          const active = res.data.bookings.filter((b) =>
            ['confirmed', 'checked_in', 'in_service'].includes(b.status)
          );
          setBookings(active);

          if (bookingIdParam) {
            const matched = active.find((b) => b.id === bookingIdParam);
            if (matched) setSelectedBooking(matched);
            else if (active.length > 0) setSelectedBooking(active[0]);
          } else if (centerIdParam) {
            const matched = active.find((b) => b.center_id === centerIdParam);
            if (matched) setSelectedBooking(matched);
            else if (active.length > 0) setSelectedBooking(active[0]);
          } else if (active.length > 0) {
            setSelectedBooking(active[0]);
          }
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load bookings');
      } finally {
        setLoading(false);
      }
    }

    loadActiveBookings();
  }, [bookingIdParam, centerIdParam]);

  // Poll center queue status
  useEffect(() => {
    if (!selectedBooking?.center_id) return;

    let isMounted = true;

    async function fetchQueue() {
      try {
        const res = await api.get(`/queue/center/${selectedBooking.center_id}`);
        if (res.data && isMounted) {
          setQueueState(res.data);

          // Check if my token is called
          const myEntry = res.data.queue?.find(
            (q) => q.booking_id === selectedBooking.id
          );
          if (myEntry?.status === 'called' && !audioNotification) {
            setAudioNotification(true);
            try {
              // Play brief notification tone if supported
              const ctx = new (window.AudioContext || window.webkitAudioContext)();
              const osc = ctx.createOscillator();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(880, ctx.currentTime);
              osc.connect(ctx.destination);
              osc.start();
              osc.stop(ctx.currentTime + 0.5);
            } catch (e) {
              // Audio context might be restricted before user gesture
            }
          }
        }
      } catch (err) {
        console.warn('Queue tracking poll error:', err.message);
      }
    }

    fetchQueue();
    const interval = setInterval(fetchQueue, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedBooking, audioNotification]);

  // Find my entry in the queue
  const myQueueEntry = queueState?.queue?.find(
    (q) => q.booking_id === selectedBooking?.id
  );

  // Calculate my position ahead
  const waitingEntries = (queueState?.queue || []).filter(
    (q) => q.status === 'waiting'
  );
  const myWaitingIndex = myQueueEntry && myQueueEntry.status === 'waiting'
    ? waitingEntries.findIndex((q) => q.id === myQueueEntry.id)
    : -1;

  const currentServing = (queueState?.queue || []).find(
    (q) => q.status === 'called' || q.status === 'serving'
  );

  const estimatedWaitMinutes = myWaitingIndex >= 0 ? (myWaitingIndex + 1) * 15 : 0;

  return (
    <div className="space-y-8 py-8 max-w-4xl mx-auto">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/farmer"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-agri-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('queue_tracker.back_to_portal')}</span>
        </Link>

        <Link
          to="/farmer/bookings"
          className="text-xs font-bold text-agri-700 hover:underline"
        >
          {t('queue_tracker.view_all_bookings')}
        </Link>
      </div>

      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold mb-2">
          <Clock className="w-3.5 h-3.5" />
          <span>{t('queue_tracker.badge')}</span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          {t('queue_tracker.title')}
        </h1>
        <p className="text-sm text-slate-500">
          {t('queue_tracker.subtitle')}
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500 font-semibold bg-white rounded-3xl border border-slate-200">
          {language === 'hi' ? 'सक्रिय कतार की जानकारी लोड हो रही है...' : 'Loading active queue information...'}
        </div>
      ) : bookings.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 space-y-4">
          <p className="text-sm text-slate-600">
            {language === 'hi'
              ? 'वर्तमान में आपकी कोई सक्रिय या चेक-इन अपॉइंटमेंट नहीं है।'
              : 'You currently have no active or checked-in bookings.'}
          </p>
          <Link
            to="/centers"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-agri text-white font-bold text-xs shadow-md"
          >
            {language === 'hi' ? 'केंद्र खोजें और स्लॉट बुक करें' : 'Find Centers & Book Slot'}
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Booking Selector if multiple */}
          {bookings.length > 1 && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-slate-500">
                {language === 'hi' ? 'अपॉइंटमेंट चुनें:' : 'Select Appointment:'}
              </span>
              {bookings.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBooking(b)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedBooking?.id === b.id
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {localizeCenterName(b.center_name)} ({new Date(b.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                </button>
              ))}
            </div>
          )}

          {/* Called Alert Banner */}
          {myQueueEntry?.status === 'called' && (
            <div className="p-6 rounded-3xl bg-amber-500 text-white shadow-xl animate-bounce flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Volume2 className="w-8 h-8 shrink-0" />
                <div>
                  <h3 className="text-xl font-black">
                    {language === 'hi' ? 'आपका टोकन बुलाया गया है!' : 'YOUR TOKEN HAS BEEN CALLED!'}
                  </h3>
                  <p className="text-xs text-amber-100">
                    {language === 'hi'
                      ? `टोकन #${myQueueEntry.token_number} — कृपया तुरंत निरीक्षण एवं तौल कांटे पर पहुंचें।`
                      : `Token #${myQueueEntry.token_number} — Please proceed immediately to the inspection & weighing scale.`}
                  </p>
                </div>
              </div>
              <div className="text-3xl font-black bg-white/20 px-4 py-2 rounded-2xl">
                #{myQueueEntry.token_number}
              </div>
            </div>
          )}

          {/* Main Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* My Token Number */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  {language === 'hi' ? 'मेरा आवंटित टोकन' : 'My Assigned Token'}
                </span>
                <div className="text-4xl font-black text-slate-900 mt-2">
                  {myQueueEntry ? `#${myQueueEntry.token_number}` : (language === 'hi' ? 'चेक-इन नहीं' : 'Not Checked In')}
                </div>
              </div>
              <div className="text-xs font-semibold">
                {myQueueEntry ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {language === 'hi' ? 'गेट चेक-इन समय:' : 'Checked in at'}{' '}
                    {new Date(myQueueEntry.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                ) : (
                  <span className="text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {language === 'hi' ? 'गेट स्कैनर पर क्यूआर कोड दिखाएं' : 'Present QR at gate scanner'}
                  </span>
                )}
              </div>
            </div>

            {/* Currently Serving */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  {language === 'hi' ? 'मंडी में वर्तमान सेवारत टोकन' : 'Now Serving at Mandi'}
                </span>
                <div className="text-4xl font-black text-blue-600 mt-2">
                  {currentServing ? `#${currentServing.token_number}` : (language === 'hi' ? 'प्रतीक्षारत' : 'Standby')}
                </div>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {currentServing
                  ? (language === 'hi'
                      ? `टोकन #${currentServing.token_number} निरीक्षण एवं तौल डेस्क पर है।`
                      : `Token #${currentServing.token_number} is at inspection desk.`)
                  : (language === 'hi'
                      ? 'मंडी कतार अगले आगमन के लिए तैयार है।'
                      : 'Center queue is ready for next arrivals.')}
              </p>
            </div>

            {/* Estimated Wait Time */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  {language === 'hi' ? 'अनुमानित प्रतीक्षा समय' : 'Estimated Waiting Time'}
                </span>
                <div className="text-4xl font-black text-agri-700 mt-2">
                  {myWaitingIndex >= 0
                    ? `~${estimatedWaitMinutes} ${language === 'hi' ? 'मिनट' : 'min'}`
                    : `0 ${language === 'hi' ? 'मिनट' : 'min'}`}
                </div>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {myWaitingIndex >= 0
                  ? (language === 'hi'
                      ? `कतार में आपसे आगे ${myWaitingIndex} किसान भाई हैं।`
                      : `${myWaitingIndex} farmer${myWaitingIndex === 1 ? '' : 's'} ahead of you in line.`)
                  : myQueueEntry?.status === 'serving'
                  ? (language === 'hi' ? 'वर्तमान में तौल प्रक्रिया जारी है!' : 'Currently being served!')
                  : myQueueEntry?.status === 'completed'
                  ? (language === 'hi' ? 'तौल एवं खरीद प्रक्रिया संपन्न।' : 'Intake completed.')
                  : (language === 'hi'
                      ? 'लाइव कतार में शामिल होने के लिए गेट पर चेक-इन करें।'
                      : 'Check in upon arrival to join live queue.')}
              </p>
            </div>
          </div>

          {/* Appointment & Mandi Details */}
          {selectedBooking && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                      {language === 'hi' ? 'संदर्भ:' : 'Ref:'} {selectedBooking.booking_reference}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        selectedBooking.status === 'checked_in'
                          ? 'bg-blue-100 text-blue-800'
                          : selectedBooking.status === 'in_service'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {language === 'hi' ? 'स्थिति:' : 'Status:'} {getStatusLabel(selectedBooking.status)}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{localizeCenterName(selectedBooking.center_name)}</h3>
                  <p className="text-xs text-slate-500">
                    {localizeCenterAddress(selectedBooking.center_name, `${selectedBooking.center_address}, ${selectedBooking.center_district}`)}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 block font-medium">
                    {language === 'hi' ? 'निर्धारित समय' : 'Scheduled Window'}
                  </span>
                  <span className="text-sm font-black text-slate-800">
                    {new Date(selectedBooking.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                    {new Date(selectedBooking.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {new Date(selectedBooking.starts_at).toLocaleDateString(language === 'hi' ? 'hi-IN' : [], {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {/* QR Token Presentation for Gate Check-in */}
              {!myQueueEntry && (
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-center space-y-4">
                  <div className="max-w-md mx-auto space-y-1">
                    <h4 className="text-sm font-black text-slate-900">
                      {language === 'hi' ? 'गेट चेक-इन क्यूआर टोकन' : 'Gate Check-in QR Token'}
                    </h4>
                    <p className="text-xs text-slate-600">
                      {language === 'hi'
                        ? 'स्लॉट समय से -15 से +15 मिनट के भीतर मंडी गेट स्कैनर पर यह क्यूआर कोड दिखाकर अपना क्रमबद्ध टोकन प्राप्त करें।'
                        : 'Show this QR code to the mandi gate scanner within the check-in window (-15 mins to +15 mins from slot start) to receive your sequential queue token.'}
                    </p>
                  </div>

                  <div className="flex justify-center py-2">
                    <QRCodeDisplay
                      token={selectedBooking.qr_token_hash}
                      reference={selectedBooking.booking_reference}
                      size={180}
                    />
                  </div>

                  <p className="text-[11px] text-slate-400 font-mono">
                    {language === 'hi' ? 'टोकन हैश:' : 'Token Hash:'} {selectedBooking.qr_token_hash?.slice(0, 24)}...
                  </p>
                </div>
              )}

              {/* Booking Specifications */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block font-medium">
                    {language === 'hi' ? 'फसल किस्म' : 'Crop Variety'}
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    {language === 'hi' ? selectedBooking.crop_name_hi : selectedBooking.crop_name_en}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block font-medium">
                    {language === 'hi' ? 'आरक्षित मात्रा' : 'Reserved Quantity'}
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    {selectedBooking.estimated_quintals} {language === 'hi' ? 'क्विंटल' : 'Quintals'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block font-medium">
                    {language === 'hi' ? 'मूल्य गारंटी' : 'Price Guarantee'}
                  </span>
                  <span className="text-sm font-bold text-agri-700">₹{selectedBooking.price_snapshot}/q</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block font-medium">
                    {language === 'hi' ? 'अनुमानित कुल' : 'Estimated Gross'}
                  </span>
                  <span className="text-sm font-bold text-emerald-700">
                    ₹{(selectedBooking.estimated_quintals * selectedBooking.price_snapshot).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
