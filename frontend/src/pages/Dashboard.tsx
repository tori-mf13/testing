import React, { useEffect, useState } from 'react';
import {
  Monitor, Cloud, AlertTriangle, Headphones, Users, ShieldCheck,
  TrendingUp, Sparkles, Activity, Loader2
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StatCard from '../components/StatCard';
import GaugeChart from '../components/GaugeChart';
import { formatCurrency, formatRelativeTime, severityColor } from '../utils/format';
import type { DashboardStats, AIInsight, ActivityItem } from '../types';
import api from '../services/api';

// Demo data for charts
const spendTrend = [
  { month: 'Sep', cost: 14200 }, { month: 'Oct', cost: 15100 },
  { month: 'Nov', cost: 14800 }, { month: 'Dec', cost: 16200 },
  { month: 'Jan', cost: 15900 }, { month: 'Feb', cost: 15400 },
];

const ticketTrend = [
  { day: 'Mon', opened: 12, resolved: 10 }, { day: 'Tue', opened: 8, resolved: 15 },
  { day: 'Wed', opened: 15, resolved: 12 }, { day: 'Thu', opened: 10, resolved: 11 },
  { day: 'Fri', opened: 6, resolved: 8 },
];

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [alertsSummary, setAlertsSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, i, a, al] = await Promise.all([
          api.get<DashboardStats>('/dashboard/stats'),
          api.get<AIInsight[]>('/ai/insights'),
          api.get<ActivityItem[]>('/dashboard/activity'),
          api.get<Record<string, number>>('/dashboard/alerts-summary'),
        ]);
        setStats(s);
        setInsights(i);
        setActivity(a);
        setAlertsSummary(al);
      } catch {
        // Use demo data on error
        setStats({
          totalAssets: 247, totalSaaSApps: 32, monthlySaaSSpend: 15400,
          openAlerts: 5, openTickets: 12, healthScore: 82, complianceScore: 79, activeUsers: 186,
        });
        setInsights([
          { id: '1', type: 'cost_saving', title: 'Underused software detected', description: '3 apps have less than 30% utilization', impact: 'Save $2,100/month', priority: 'high' },
          { id: '2', type: 'security', title: 'Critical alerts need attention', description: '2 critical security alerts are unresolved', impact: 'High risk', priority: 'high' },
        ]);
        setActivity([
          { id: '1', type: 'alert', title: 'Critical CVE detected on prod-web-01', module: 'security', createdAt: new Date(Date.now() - 3600000).toISOString() },
          { id: '2', type: 'ticket', title: 'New ticket: Cannot connect to VPN', module: 'helpdesk', createdAt: new Date(Date.now() - 7200000).toISOString() },
          { id: '3', type: 'workflow', title: 'License Reclamation completed', module: 'automation', createdAt: new Date(Date.now() - 14400000).toISOString() },
        ]);
        setAlertsSummary({ critical: 2, high: 3, medium: 5, low: 8, info: 12 });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-brand-400" size={32} />
      </div>
    );
  }

  const s = stats!;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Your IT environment at a glance</p>
      </div>

      {/* AI Insights Banner */}
      {insights.length > 0 && (
        <div className="card bg-gradient-to-r from-brand-900/40 to-purple-900/40 border-brand-800/50">
          <div className="flex items-start gap-3">
            <Sparkles className="text-brand-400 mt-0.5 shrink-0" size={20} />
            <div className="flex-1">
              <h3 className="font-semibold text-sm text-brand-300 mb-2">AI Insights</h3>
              <div className="space-y-2">
                {insights.slice(0, 3).map((insight) => (
                  <div key={insight.id} className="flex items-start gap-2 text-sm">
                    <span className={`badge ${insight.priority === 'high' ? 'badge-high' : 'badge-medium'} text-[10px]`}>
                      {insight.type.replace('_', ' ')}
                    </span>
                    <span className="text-slate-300">{insight.title} — <span className="text-slate-500">{insight.impact}</span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Assets" value={s.totalAssets} icon={Monitor} color="blue" tooltip="All tracked hardware and devices" />
        <StatCard label="SaaS Apps" value={s.totalSaaSApps} subtitle={`${formatCurrency(s.monthlySaaSSpend)}/mo`} icon={Cloud} color="purple" tooltip="Active software subscriptions" />
        <StatCard label="Open Alerts" value={s.openAlerts} icon={AlertTriangle} color={s.openAlerts > 10 ? 'red' : 'yellow'} tooltip="Unresolved security alerts" />
        <StatCard label="Open Tickets" value={s.openTickets} icon={Headphones} color="green" tooltip="Help desk tickets awaiting resolution" />
      </div>

      {/* Second row: Health Gauges + Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Health Gauges */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">System Health</h3>
          <div className="flex justify-around">
            <GaugeChart value={s.healthScore} label="Overall Health" />
            <GaugeChart value={s.complianceScore} label="Compliance" />
            <GaugeChart value={85} label="Patch Status" />
          </div>
        </div>

        {/* SaaS Spend Trend */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Monthly SaaS Spend</h3>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={spendTrend}>
              <defs>
                <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }} />
              <Area type="monotone" dataKey="cost" stroke="#8b5cf6" fill="url(#spendGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Ticket Trend */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Tickets This Week</h3>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={ticketTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }} />
              <Bar dataKey="opened" fill="#ef4444" radius={[3, 3, 0, 0]} name="Opened" />
              <Bar dataKey="resolved" fill="#10b981" radius={[3, 3, 0, 0]} name="Resolved" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Third row: Alert Summary + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Alert Summary */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Open Alerts by Severity</h3>
          <div className="space-y-3">
            {[
              { key: 'critical', label: 'Critical', color: 'bg-red-500' },
              { key: 'high', label: 'High', color: 'bg-orange-500' },
              { key: 'medium', label: 'Medium', color: 'bg-yellow-500' },
              { key: 'low', label: 'Low', color: 'bg-blue-500' },
            ].map(({ key, label, color }) => {
              const count = alertsSummary[key] || 0;
              const max = Math.max(...Object.values(alertsSummary), 1);
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-sm text-slate-400 w-16">{label}</span>
                  <div className="flex-1 h-5 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${(count / max) * 100}%` }} />
                  </div>
                  <span className="text-sm font-medium text-slate-300 w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {activity.slice(0, 8).map((item) => (
              <div key={item.id} className="flex items-start gap-3 group">
                <div className="w-2 h-2 rounded-full bg-brand-500 mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300 truncate">{item.title}</p>
                  <p className="text-xs text-slate-600">{item.module} · {formatRelativeTime(item.createdAt)}</p>
                </div>
              </div>
            ))}
            {activity.length === 0 && <p className="text-sm text-slate-500">No recent activity</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
