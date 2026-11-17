import React from 'react';
import { Search, Calendar, QrCode, Scale, CreditCard } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export function HowItWorksPage() {
  const { t } = useLanguage();

  const steps = [
    {
      num: '1',
      title: 'Compare & Discover',
      desc: 'Farmers select crop and estimated quantity. The system applies a 40/30/20/10 multi-factor formula (Price, Proximity, Slot, Wait Time) to recommend optimal centers.',
      icon: Search,
    },
    {
      num: '2',
      title: 'Atomic Capacity Booking',
      desc: 'Book a 30-minute slot instantly. The engine atomically checks both maximum farmer count and crop volume caps, generating a unique signed QR token.',
      icon: Calendar,
    },
    {
      num: '3',
      title: 'Check-in & Smart Queue',
      desc: 'Arrive at the center within -15 to +15 minutes of slot start. The operator scans your QR, ordering the queue by scheduled slot, then arrival time.',
      icon: QrCode,
    },
    {
      num: '4',
      title: 'Weighing & Digital Receipt',
      desc: 'Crops are graded and weighed. Deductions are calculated with exact decimal arithmetic, issuing an immutable, traceable digital receipt.',
      icon: Scale,
    },
    {
      num: '5',
      title: 'Transparent Payment Tracking',
      desc: 'Follow transparent payment progression (pending -> processing -> paid) with recorded reference details and audit timestamps.',
      icon: CreditCard,
    },
  ];

  return (
    <div className="space-y-12 py-8">
      <div className="max-w-3xl space-y-2">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('nav.how_it_works')}</h1>
        <p className="text-sm text-slate-600">
          The 5-step automated workflow connecting farmers to verified procurement centers without queues or manual delays.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div key={step.num} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl gradient-agri text-white flex items-center justify-center font-bold">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-2xl font-black text-slate-200">0{step.num}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">{step.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{step.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
