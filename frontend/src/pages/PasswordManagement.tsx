import React from 'react';
import { KeyRound, AlertTriangle, Shield, Eye } from 'lucide-react';
import StatCard from '../components/StatCard';
import GaugeChart from '../components/GaugeChart';

const demoHealth = [
  { user: 'admin@company.com', totalPasswords: 45, weakPasswords: 2, reusedPasswords: 3, breachedCount: 0, healthScore: 88 },
  { user: 'tech@company.com', totalPasswords: 32, weakPasswords: 0, reusedPasswords: 1, breachedCount: 0, healthScore: 95 },
  { user: 'manager@company.com', totalPasswords: 28, weakPasswords: 5, reusedPasswords: 8, breachedCount: 2, healthScore: 52 },
  { user: 'dev@company.com', totalPasswords: 55, weakPasswords: 1, reusedPasswords: 4, breachedCount: 1, healthScore: 78 },
];

export default function PasswordManagement() {
  const avgHealth = Math.round(demoHealth.reduce((s, h) => s + h.healthScore, 0) / demoHealth.length);
  const totalBreached = demoHealth.reduce((s, h) => s + h.breachedCount, 0);
  const totalWeak = demoHealth.reduce((s, h) => s + h.weakPasswords, 0);
  const totalReused = demoHealth.reduce((s, h) => s + h.reusedPasswords, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Password Management</h1>
        <p className="text-sm text-slate-500 mt-1">Monitor password health and detect breached credentials</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Average Health Score" value={`${avgHealth}%`} icon={Shield} color={avgHealth >= 75 ? 'green' : 'yellow'} tooltip="Organization-wide password health score from Bitwarden" />
        <StatCard label="Breached Passwords" value={totalBreached} icon={AlertTriangle} color={totalBreached > 0 ? 'red' : 'green'} tooltip="Passwords found in known data breaches via HaveIBeenPwned" />
        <StatCard label="Weak Passwords" value={totalWeak} icon={KeyRound} color={totalWeak > 5 ? 'yellow' : 'green'} />
        <StatCard label="Reused Passwords" value={totalReused} icon={Eye} color={totalReused > 5 ? 'yellow' : 'green'} tooltip="Same password used across multiple services" />
      </div>

      <div className="card">
        <h3 className="font-semibold text-slate-300 mb-4">Password Health by User</h3>
        <div className="space-y-4">
          {demoHealth.map((h) => (
            <div key={h.user} className="flex items-center gap-4 py-2 border-b border-slate-800 last:border-0">
              <GaugeChart value={h.healthScore} label="" size={50} />
              <div className="flex-1">
                <span className="text-sm font-medium text-slate-200">{h.user}</span>
                <div className="flex gap-4 mt-1 text-xs text-slate-500">
                  <span>{h.totalPasswords} passwords</span>
                  {h.weakPasswords > 0 && <span className="text-yellow-400">{h.weakPasswords} weak</span>}
                  {h.reusedPasswords > 0 && <span className="text-orange-400">{h.reusedPasswords} reused</span>}
                  {h.breachedCount > 0 && <span className="text-red-400">{h.breachedCount} breached</span>}
                </div>
              </div>
              <button className="btn-secondary text-xs py-1 px-3">Notify</button>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-slate-300 mb-2">Integration Status</h3>
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-slate-400">Bitwarden: Connected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-slate-400">HaveIBeenPwned API: Active</span>
          </div>
        </div>
        <p className="text-xs text-slate-600 mt-2">Last scan: 2 hours ago · Next scan: in 22 hours</p>
      </div>
    </div>
  );
}
