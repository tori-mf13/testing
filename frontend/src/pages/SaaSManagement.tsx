import React, { useEffect, useState } from 'react';
import { Cloud, AlertTriangle, Recycle, Search, Filter, Plus, TrendingDown, DollarSign } from 'lucide-react';
import DataTable from '../components/DataTable';
import StatCard from '../components/StatCard';
import { formatCurrency, formatPercent, formatDate, statusColor } from '../utils/format';
import type { SaaSApplication, PaginatedResponse } from '../types';
import api from '../services/api';
import clsx from 'clsx';

const demoApps: SaaSApplication[] = [
  { id: '1', name: 'Slack', vendor: 'Salesforce', owner: 'IT', category: 'Communication', licenseCount: 200, activeUsers: 185, monthlyCost: 2400, annualCost: 28800, utilizationPct: 92.5, status: 'ACTIVE', isShadowIT: false, ssoEnabled: true },
  { id: '2', name: 'Jira', vendor: 'Atlassian', owner: 'Engineering', category: 'Project Management', licenseCount: 150, activeUsers: 120, monthlyCost: 1500, annualCost: 18000, utilizationPct: 80, status: 'ACTIVE', isShadowIT: false, ssoEnabled: true },
  { id: '3', name: 'Salesforce', vendor: 'Salesforce', owner: 'Sales', category: 'CRM', licenseCount: 100, activeUsers: 78, monthlyCost: 7500, annualCost: 90000, utilizationPct: 78, status: 'ACTIVE', isShadowIT: false, ssoEnabled: true },
  { id: '4', name: 'Notion', vendor: 'Notion', owner: 'Product', category: 'Documentation', licenseCount: 200, activeUsers: 45, monthlyCost: 2000, annualCost: 24000, utilizationPct: 22.5, status: 'ACTIVE', isShadowIT: false, ssoEnabled: false },
  { id: '5', name: 'Figma', vendor: 'Figma', owner: 'Design', category: 'Design', licenseCount: 30, activeUsers: 22, monthlyCost: 450, annualCost: 5400, utilizationPct: 73, status: 'ACTIVE', isShadowIT: false, ssoEnabled: false },
  { id: '6', name: 'Zoom', vendor: 'Zoom', owner: 'IT', category: 'Communication', licenseCount: 100, activeUsers: 95, monthlyCost: 2000, annualCost: 24000, utilizationPct: 95, status: 'ACTIVE', isShadowIT: false, ssoEnabled: true },
  { id: '7', name: 'Canva', vendor: 'Canva', owner: 'Unknown', category: 'Design', licenseCount: 10, activeUsers: 3, monthlyCost: 130, annualCost: 1560, utilizationPct: 30, status: 'SHADOW_IT', isShadowIT: true, ssoEnabled: false },
  { id: '8', name: 'Monday.com', vendor: 'Monday', owner: 'Unknown', category: 'Project Management', licenseCount: 15, activeUsers: 2, monthlyCost: 300, annualCost: 3600, utilizationPct: 13, status: 'SHADOW_IT', isShadowIT: true, ssoEnabled: false },
];

export default function SaaSManagement() {
  const [apps, setApps] = useState<SaaSApplication[]>(demoApps);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<PaginatedResponse<SaaSApplication>>('/saas');
        if (res.data.length > 0) setApps(res.data as SaaSApplication[]);
      } catch { /* use demo data */ }
    }
    load();
  }, []);

  const filtered = apps.filter((app) => {
    if (filter && !app.name.toLowerCase().includes(filter.toLowerCase())) return false;
    if (statusFilter && app.status !== statusFilter) return false;
    return true;
  });

  const totalSpend = apps.reduce((sum, a) => sum + a.monthlyCost, 0);
  const shadowCount = apps.filter((a) => a.isShadowIT).length;
  const underutilized = apps.filter((a) => a.utilizationPct < 30);
  const reclaimableValue = underutilized.reduce((sum, a) => sum + a.monthlyCost * 0.5, 0);

  const columns = [
    {
      key: 'name', header: 'Application',
      render: (app: SaaSApplication) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-xs font-bold text-brand-400">
            {app.name[0]}
          </div>
          <div>
            <span className="font-medium text-slate-200">{app.name}</span>
            {app.isShadowIT && <span className="ml-2 badge badge-high text-[10px]">Shadow IT</span>}
            <div className="text-xs text-slate-500">{app.vendor} · {app.category}</div>
          </div>
        </div>
      ),
    },
    { key: 'owner', header: 'Owner' },
    {
      key: 'licenseCount', header: 'Licenses',
      render: (app: SaaSApplication) => <span>{app.activeUsers} / {app.licenseCount}</span>,
    },
    {
      key: 'monthlyCost', header: 'Monthly Cost',
      render: (app: SaaSApplication) => <span className="font-medium">{formatCurrency(app.monthlyCost)}</span>,
    },
    {
      key: 'utilizationPct', header: 'Utilization',
      render: (app: SaaSApplication) => (
        <div className="flex items-center gap-2">
          <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={clsx('h-full rounded-full', app.utilizationPct >= 70 ? 'bg-emerald-500' : app.utilizationPct >= 40 ? 'bg-yellow-500' : 'bg-red-500')}
              style={{ width: `${app.utilizationPct}%` }}
            />
          </div>
          <span className="text-xs text-slate-400">{formatPercent(app.utilizationPct)}</span>
        </div>
      ),
    },
    {
      key: 'status', header: 'Status',
      render: (app: SaaSApplication) => (
        <span className={clsx('badge', app.status === 'ACTIVE' ? 'badge-low' : app.status === 'SHADOW_IT' ? 'badge-high' : 'badge-info')}>
          {app.status.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'ssoEnabled', header: 'SSO',
      render: (app: SaaSApplication) => (
        <span className={app.ssoEnabled ? 'text-emerald-400' : 'text-slate-600'}>
          {app.ssoEnabled ? 'Enabled' : 'No'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">SaaS Management</h1>
          <p className="text-sm text-slate-500 mt-1">Track and optimize your software subscriptions</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Application
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Monthly Spend" value={formatCurrency(totalSpend)} icon={DollarSign} color="purple" />
        <StatCard label="Active Apps" value={apps.filter(a => a.status === 'ACTIVE').length} icon={Cloud} color="blue" />
        <StatCard label="Shadow IT Detected" value={shadowCount} icon={AlertTriangle} color={shadowCount > 0 ? 'red' : 'green'} tooltip="Software used without IT approval" />
        <StatCard label="Reclaimable Savings" value={formatCurrency(reclaimableValue) + '/mo'} icon={Recycle} color="green" tooltip="Estimated savings from reclaiming underused licenses" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-surface-850 rounded-lg px-3 py-2 flex-1 max-w-xs">
          <Search size={16} className="text-slate-500" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search applications..."
            className="bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none flex-1"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input text-sm"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SHADOW_IT">Shadow IT</option>
          <option value="INACTIVE">Inactive</option>
          <option value="PENDING_REVIEW">Pending Review</option>
        </select>
      </div>

      {/* Table */}
      <DataTable columns={columns} data={filtered as Record<string, unknown>[]} />

      {/* Cost Optimization Recommendations */}
      {underutilized.length > 0 && (
        <div className="card border-yellow-800/50">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={18} className="text-yellow-400" />
            <h3 className="font-semibold text-sm text-yellow-300">Cost Optimization Recommendations</h3>
          </div>
          <div className="space-y-2">
            {underutilized.map((app) => (
              <div key={app.id} className="flex items-center justify-between text-sm py-2 border-b border-slate-800 last:border-0">
                <div>
                  <span className="text-slate-300">{app.name}</span>
                  <span className="text-slate-600 ml-2">— {formatPercent(app.utilizationPct)} utilization, {app.activeUsers}/{app.licenseCount} licenses used</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-yellow-400 font-medium">Save ~{formatCurrency(app.monthlyCost * 0.5)}/mo</span>
                  <button className="btn-secondary text-xs py-1 px-2">Review</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
