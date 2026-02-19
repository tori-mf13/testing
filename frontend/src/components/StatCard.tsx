import React from 'react';
import clsx from 'clsx';
import { HelpCircle } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<Record<string, unknown>>;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  tooltip?: string;
  trend?: { value: number; isPositive: boolean };
}

const colorMap = {
  blue: 'from-blue-600/20 to-blue-600/5 border-blue-800/50',
  green: 'from-emerald-600/20 to-emerald-600/5 border-emerald-800/50',
  red: 'from-red-600/20 to-red-600/5 border-red-800/50',
  yellow: 'from-yellow-600/20 to-yellow-600/5 border-yellow-800/50',
  purple: 'from-purple-600/20 to-purple-600/5 border-purple-800/50',
};

const iconColorMap = {
  blue: 'text-blue-400',
  green: 'text-emerald-400',
  red: 'text-red-400',
  yellow: 'text-yellow-400',
  purple: 'text-purple-400',
};

export default function StatCard({ label, value, subtitle, icon: Icon, color = 'blue', tooltip, trend }: StatCardProps) {
  return (
    <div className={clsx('card bg-gradient-to-br', colorMap[color])}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-sm text-slate-400 font-medium">{label}</p>
            {tooltip && (
              <span className="tooltip" data-tooltip={tooltip}>
                <HelpCircle size={12} className="text-slate-600" />
              </span>
            )}
          </div>
          <p className="text-2xl font-bold mt-1 text-white">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
          {trend && (
            <p className={clsx('text-xs mt-1 font-medium', trend.isPositive ? 'text-emerald-400' : 'text-red-400')}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% from last month
            </p>
          )}
        </div>
        <div className={clsx('p-2 rounded-lg bg-surface-900/50', iconColorMap[color])}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}
