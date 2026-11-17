import React, { useState, useEffect } from 'react';
import { Building2, MapPin, Phone, ShieldCheck, Filter, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { BookSlotModal } from '../farmer/BookSlotModal';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

export function CentersPage() {
  const { t, language } = useLanguage();
  const { isAuthenticated, role } = useAuth();
  const navigate = useNavigate();

  const [centers, setCenters] = useState([]);
  const [crops, setCrops] = useState([]);
  const [selectedCrop, setSelectedCrop] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookingModalCenter, setBookingModalCenter] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [cropsRes, centersRes] = await Promise.all([
          api.get('/crops'),
          api.get('/centers'),
        ]);

        if (cropsRes.data?.crops) {
          setCrops(cropsRes.data.crops);
        }
        if (centersRes.data?.centers) {
          setCenters(centersRes.data.centers);
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load centers');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleBookClick = (center) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (role !== 'farmer') {
      alert('Only farmers can reserve procurement appointments.');
      return;
    }
    setBookingModalCenter(center);
  };

  const filteredCenters = centers.filter((c) => {
    if (selectedType && c.type !== selectedType) return false;
    if (selectedCrop && !c.crops?.some((cr) => cr.code === selectedCrop)) return false;
    return true;
  });

  return (
    <div className="space-y-8 py-8">
      {/* Header */}
      <div className="max-w-3xl space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Verified Mandi Directory</span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('nav.centers')}</h1>
        <p className="text-sm text-slate-600">
          Compare verified government procurement centers and private agrilogistics hubs. View published indicative rates and reserve available 30-minute capacity slots.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        {/* Crop Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedCrop('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedCrop === ''
                ? 'bg-agri-700 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Crops
          </button>
          {crops.map((cr) => (
            <button
              key={cr.id}
              onClick={() => setSelectedCrop(cr.code)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedCrop === cr.code
                  ? 'bg-agri-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {language === 'hi' ? cr.name_hi : cr.name_en}
            </button>
          ))}
        </div>

        {/* Center Type Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-agri-500"
          >
            <option value="">All Center Types</option>
            <option value="government">Government Mandi</option>
            <option value="private">Private Hub</option>
          </select>
        </div>
      </div>

      {/* Centers Grid */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center p-6">
          <div className="w-10 h-10 border-4 border-agri-600 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">{t('common.loading')}</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 text-xs">
          {error}
        </div>
      ) : filteredCenters.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-2">
          <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">No procurement centers match filters</h3>
          <p className="text-xs text-slate-500">Try selecting "All Crops" or resetting the center type.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCenters.map((center) => (
            <div
              key={center.id}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                {/* Type & Verification Badges */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      center.type === 'government'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    <Building2 className="w-3 h-3" />
                    {center.type === 'government' ? 'Government Mandi' : 'Private Hub'}
                  </span>

                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 leading-snug">{center.name}</h3>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>{center.address}, {center.district}</span>
                  </div>
                  {center.contact_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{center.contact_phone}</span>
                    </div>
                  )}
                </div>

                {/* Published Indicative Crop Rates */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Published Indicative Rates
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {center.crops?.map((cr) => (
                      <div
                        key={cr.crop_id}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] flex items-center gap-1.5"
                      >
                        <span className="font-semibold text-slate-700">
                          {language === 'hi' ? cr.name_hi : cr.name_en.split(' ')[0]}:
                        </span>
                        <span className="font-extrabold text-agri-700">
                          ₹{cr.price_per_quintal || 'N/A'}/q
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Button: Open Slot Booking Modal */}
              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleBookClick(center)}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-agri-50 text-agri-800 border border-agri-200 font-bold text-xs hover:bg-agri-600 hover:text-white transition-all group"
                >
                  <span>Book 30-Min Slot at this Center</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Interactive Slot Booking Modal */}
      {bookingModalCenter && (
        <BookSlotModal
          center={bookingModalCenter}
          onClose={() => setBookingModalCenter(null)}
        />
      )}
    </div>
  );
}
