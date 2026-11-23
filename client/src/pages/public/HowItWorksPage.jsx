import React from 'react';
import { Search, Calendar, QrCode, Scale, CreditCard } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export function HowItWorksPage() {
  const { t } = useLanguage();

  const steps = [
    {
      num: '1',
      titleKey: 'how_it_works_page.step1_title',
      descKey: 'how_it_works_page.step1_desc',
      icon: Search,
    },
    {
      num: '2',
      titleKey: 'how_it_works_page.step2_title',
      descKey: 'how_it_works_page.step2_desc',
      icon: Calendar,
    },
    {
      num: '3',
      titleKey: 'how_it_works_page.step3_title',
      descKey: 'how_it_works_page.step3_desc',
      icon: QrCode,
    },
    {
      num: '4',
      titleKey: 'how_it_works_page.step4_title',
      descKey: 'how_it_works_page.step4_desc',
      icon: Scale,
    },
    {
      num: '5',
      titleKey: 'how_it_works_page.step5_title',
      descKey: 'how_it_works_page.step5_desc',
      icon: CreditCard,
    },
  ];

  return (
    <div className="space-y-12 py-8">
      <div className="max-w-3xl space-y-2">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('how_it_works_page.title')}</h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          {t('how_it_works_page.subtitle')}
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
              <h3 className="text-lg font-bold text-slate-900">{t(step.titleKey)}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{t(step.descKey)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
