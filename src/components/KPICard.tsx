import React from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';
import { KPICardData } from '../types';

interface KPICardProps {
  data: KPICardData;
  icon?: React.ReactNode;
  accentColor?: 'blue' | 'teal' | 'purple' | 'green';
}

export const KPICard: React.FC<KPICardProps> = ({
  data,
  icon,
  accentColor = 'blue'
}) => {
  const isUp = data.trend === 'up';

  const accentStyles = {
    blue: 'border-l-4 border-l-blue-600',
    teal: 'border-l-4 border-l-teal-500',
    purple: 'border-l-4 border-l-purple-600',
    green: 'border-l-4 border-l-emerald-600'
  };

  const iconBgStyles = {
    blue: 'bg-blue-50 text-blue-600',
    teal: 'bg-teal-50 text-teal-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-emerald-50 text-emerald-600'
  };

  return (
    <div className={`bg-white rounded-xl p-5 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md transition duration-200 ${accentStyles[accentColor]}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {data.title}
        </span>
        {icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBgStyles[accentColor]}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900 tracking-tight">
          {data.value}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs">
        <span
          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-semibold ${
            isUp
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-rose-50 text-rose-700'
          }`}
        >
          {isUp ? (
            <ArrowUpRight className="w-3.5 h-3.5" />
          ) : (
            <ArrowDownRight className="w-3.5 h-3.5" />
          )}
          {Math.abs(data.changePercentage)}%
        </span>
        <span className="text-slate-400 font-normal">
          {data.subtext} ({data.previousValue})
        </span>
      </div>
    </div>
  );
};
