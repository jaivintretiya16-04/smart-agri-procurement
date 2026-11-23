import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sprout,
  Calendar,
  Clock,
  Receipt,
  Search,
  CheckCircle2,
  MapPin,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Info,
  Building2,
  Navigation,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export function FarmerDashboard() {
  const { user } = useAuth();
  const { t, language, localizeCenterName, localizeCenterAddress } = useLanguage();

  // Search & Recommendation State
  const [crops, setCrops] = useState([]);
  const [selectedCrop, setSelectedCrop] = useState('wheat');
  const [quantity, setQuantity] = useState('20');
  const [useGps, setUseGps] = useState(false);
  const [coords, setCoords] = useState(null);
  const [sortBy, setSortBy] = useState('score'); // 'score', 'price', 'distance', 'slot'
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadCrops() {
      try {
        const res = await api.get('/crops');
        if (res.data?.crops) {
          setCrops(res.data.crops);
        }
      } catch (err) {
        console.error('Failed to load crops:', err);
      }
    }
    loadCrops();
  }, []);

  // Request GPS
  const handleRequestGps = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setUseGps(true);
        },
        (err) => {
          alert('GPS permission not granted or location unavailable. District proximity will be used instead.');
          setUseGps(false);
          setCoords(null);
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  const handleSearchRecommendations = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        cropCode: selectedCrop,
        quantityQuintals: parseFloat(quantity),
        latitude: coords ? coords.latitude : user?.profile?.latitude || null,
        longitude: coords ? coords.longitude : user?.profile?.longitude || null,
        sortBy: sortBy === 'score' ? null : sortBy,
      };

      const res = await api.post('/recommendations', payload);
      if (res.data?.success) {
        setRecommendations(res.data.recommendations || []);
        setHasSearched(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch recommendations');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 py-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-900 to-agri-800 text-white p-6 sm:p-8 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 text-xs font-bold border border-emerald-400/20">
            <Sprout className="w-3.5 h-3.5" />
            <span>{t('farmer_dashboard.portal_badge')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">
            {t('farmer_dashboard.welcome')}, {user?.name || 'Farmer'}!
          </h1>
          <p className="text-sm text-emerald-100 max-w-xl">
            {t('farmer_dashboard.welcome_desc')}
          </p>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/farmer/bookings"
          className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-agri-300 hover:shadow-md transition-all flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-xs font-extrabold text-agri-700 uppercase tracking-wider block">{t('farmer_dashboard.nav_bookings_tag')}</span>
            <h4 className="text-sm font-black text-slate-900">{t('farmer_dashboard.nav_bookings_title')}</h4>
            <p className="text-xs text-slate-500">{t('farmer_dashboard.nav_bookings_desc')}</p>
          </div>
          <Calendar className="w-6 h-6 text-agri-600 group-hover:scale-110 transition-transform" />
        </Link>

        <Link
          to="/farmer/queue"
          className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-xs font-extrabold text-blue-700 uppercase tracking-wider block">{t('farmer_dashboard.nav_queue_tag')}</span>
            <h4 className="text-sm font-black text-slate-900">{t('farmer_dashboard.nav_queue_title')}</h4>
            <p className="text-xs text-slate-500">{t('farmer_dashboard.nav_queue_desc')}</p>
          </div>
          <Clock className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform" />
        </Link>

        <Link
          to="/farmer/receipts"
          className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-xs font-extrabold text-emerald-700 uppercase tracking-wider block">{t('farmer_dashboard.nav_receipts_tag')}</span>
            <h4 className="text-sm font-black text-slate-900">{t('farmer_dashboard.nav_receipts_title')}</h4>
            <p className="text-xs text-slate-500">{t('farmer_dashboard.nav_receipts_desc')}</p>
          </div>
          <Receipt className="w-6 h-6 text-emerald-600 group-hover:scale-110 transition-transform" />
        </Link>

        <Link
          to="/centers"
          className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-amber-300 hover:shadow-md transition-all flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-xs font-extrabold text-amber-700 uppercase tracking-wider block">{t('farmer_dashboard.nav_centers_tag')}</span>
            <h4 className="text-sm font-black text-slate-900">{t('farmer_dashboard.nav_centers_title')}</h4>
            <p className="text-xs text-slate-500">{t('farmer_dashboard.nav_centers_desc')}</p>
          </div>
          <Building2 className="w-6 h-6 text-amber-600 group-hover:scale-110 transition-transform" />
        </Link>
      </div>

      {/* Smart Balanced Recommendation Search Tool (Phase 3 Core) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-md p-6 sm:p-8 space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gradient-agri flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5 text-harvest-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {t('farmer_dashboard.recom_title')}
              </h2>
              <p className="text-xs text-slate-500">
                {t('farmer_dashboard.recom_subtitle')}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSearchRecommendations} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Select Crop */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                {t('farmer_dashboard.crop_label')}
              </label>
              <select
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 bg-white focus:ring-2 focus:ring-agri-500 focus:outline-none"
              >
                {crops.map((c) => (
                  <option key={c.id} value={c.code}>
                    {language === 'hi' ? c.name_hi : c.name_en}
                  </option>
                ))}
              </select>
            </div>

            {/* Estimated Quantity */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                {t('farmer_dashboard.qty_label')}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 25"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-agri-500 focus:outline-none"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                  {language === 'hi' ? 'क्विंटल' : 'Quintals'}
                </span>
              </div>
            </div>

            {/* Location Source */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                {t('farmer_dashboard.origin_label')}
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleRequestGps}
                  className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    useGps
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>{useGps ? t('farmer_dashboard.using_gps') : t('farmer_dashboard.use_gps')}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Info className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                {coords
                  ? `Search origin: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`
                  : user?.profile?.district
                  ? `Using saved location (${user.profile.district})`
                  : 'No coordinates provided — weights will renormalize automatically.'}
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl gradient-agri text-white font-extrabold text-sm shadow-md hover:opacity-95 disabled:opacity-50 transition-all"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>{t('farmer_dashboard.search_btn')}</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Results Section */}
        {hasSearched && (
          <div className="pt-6 border-t border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-base font-bold text-slate-900">
                Ranked Eligible Centers ({recommendations.length} Verified Options)
              </h3>

              {/* Sorting Overrides */}
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <span>Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setTimeout(() => handleSearchRecommendations(), 0);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-bold text-slate-700"
                >
                  <option value="score">Balanced Recommendation Score (40/30/20/10)</option>
                  <option value="price">Highest Published Price</option>
                  <option value="distance">Nearest Distance (Proximity)</option>
                  <option value="slot">Earliest Slot</option>
                </select>
              </div>
            </div>

            {recommendations.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500">
                No active centers currently accept {selectedCrop} for {quantity} quintals.
              </div>
            ) : (
              <div className="space-y-4">
                {recommendations.map((rec, index) => (
                  <div
                    key={rec.id}
                    className={`p-6 rounded-3xl border transition-all ${
                      index === 0
                        ? 'bg-emerald-50/40 border-emerald-300 shadow-md ring-1 ring-emerald-400/40'
                        : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left Details */}
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Rank Pill */}
                          <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center">
                            #{index + 1}
                          </span>

                          {/* Center Type */}
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              rec.type === 'government'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {rec.type === 'government' ? 'Government Mandi' : 'Private Hub'}
                          </span>

                          {/* Badges */}
                          {rec.badges?.map((badge, bIdx) => (
                            <span
                              key={bIdx}
                              className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200"
                            >
                              ★ {badge}
                            </span>
                          ))}
                        </div>

                        <h4 className="text-lg font-bold text-slate-900">{localizeCenterName(rec.name)}</h4>
                        <p className="text-xs text-slate-500">{localizeCenterAddress(rec.name, `${rec.address}, ${rec.district}`)}</p>

                        <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                          {/* Distance */}
                          <div className="flex items-center gap-1 font-semibold text-slate-700">
                            <MapPin className="w-3.5 h-3.5 text-agri-600" />
                            <span>
                              {rec.distanceKm !== null
                                ? `~${rec.distanceKm} km away`
                                : `District Proximity (${rec.district})`}
                            </span>
                          </div>

                          {/* Earliest Slot */}
                          <div className="flex items-center gap-1 font-semibold text-slate-700">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            <span>
                              {rec.earliestSlot
                                ? `Next Slot: ${new Date(rec.earliestSlot.starts_at).toLocaleDateString([], {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                  })} at ${new Date(rec.earliestSlot.starts_at).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}`
                                : 'Check daily availability'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Score, Earnings & Action Button */}
                      <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-3 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                        {/* Recommendation Score */}
                        <div className="text-left lg:text-right">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                            Recommendation Score
                          </span>
                          <span className="text-2xl font-black text-agri-800">
                            {rec.recommendationScore}
                            <span className="text-xs text-slate-400 font-normal"> / 100</span>
                          </span>
                        </div>

                        {/* Indicative Rate & Earnings */}
                        <div className="text-left lg:text-right">
                          <span className="text-xs font-black text-slate-900 block">
                            ₹{rec.matchedCrop?.price_per_quintal}/q
                          </span>
                          <span className="text-[11px] font-bold text-emerald-700 block">
                            Est. ₹{rec.estimatedEarnings?.toLocaleString('en-IN')}
                          </span>
                        </div>

                        {/* Select Slot to Book */}
                        <Link
                          to={`/centers`}
                          className="py-2.5 px-4 rounded-xl gradient-agri text-white font-bold text-xs shadow-sm hover:opacity-95 transition-all inline-flex items-center gap-1.5"
                        >
                          <span>Select Center</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Registered Farmer Profile Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900">Registered Farmer Profile</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block font-medium">District</span>
            <span className="font-bold text-slate-800">{user?.profile?.district || 'Lucknow'}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Village / Gram</span>
            <span className="font-bold text-slate-800">{user?.profile?.village || 'Bakshi Ka Talab'}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Mobile Contact</span>
            <span className="font-bold text-slate-800">{user?.profile?.mobile || '9876543210'}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Language</span>
            <span className="font-bold text-slate-800 uppercase">{user?.preferred_language || 'hi'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
