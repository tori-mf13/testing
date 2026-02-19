import React, { useState } from 'react';
import { BarChart3, Download, Calendar, Mail, Plus, FileText } from 'lucide-react';
import StatCard from '../components/StatCard';
import clsx from 'clsx';

const demoTemplates = [
  { id: '1', name: 'SaaS Spend Overview', module: 'saas', description: 'Monthly spend breakdown by application and department', format: 'PDF', schedule: 'Monthly', lastRunAt: '2026-02-01' },
  { id: '2', name: 'Asset Inventory Report', module: 'assets', description: 'Complete hardware inventory with lifecycle status', format: 'CSV', schedule: 'Weekly', lastRunAt: '2026-02-17' },
  { id: '3', name: 'Security Posture Summary', module: 'security', description: 'Open alerts, compliance status, and vulnerability overview', format: 'PDF', schedule: 'Weekly', lastRunAt: '2026-02-17' },
  { id: '4', name: 'Help Desk Metrics', module: 'helpdesk', description: 'Ticket volume, resolution times, and CSAT scores', format: 'PDF', schedule: 'Monthly', lastRunAt: '2026-02-01' },
  { id: '5', name: 'Compliance Audit Report', module: 'security', description: 'Framework progress and control status for auditors', format: 'PDF', schedule: 'Quarterly', lastRunAt: '2026-01-01' },
  { id: '6', name: 'Procurement Summary', module: 'procurement', description: 'Purchase requests, spend by department, vendor performance', format: 'CSV', schedule: null, lastRunAt: null },
  { id: '7', name: 'Identity & Access Review', module: 'identity', description: 'User access audit, MFA adoption, orphaned accounts', format: 'PDF', schedule: 'Monthly', lastRunAt: '2026-02-01' },
  { id: '8', name: 'Automation ROI Report', module: 'automation', description: 'Workflow execution stats, hours saved, cost recovered', format: 'PDF', schedule: 'Monthly', lastRunAt: '2026-02-01' },
];

const moduleColors: Record<string, string> = {
  saas: 'bg-purple-900/50 text-purple-300',
  assets: 'bg-blue-900/50 text-blue-300',
  security: 'bg-red-900/50 text-red-300',
  helpdesk: 'bg-green-900/50 text-green-300',
  identity: 'bg-cyan-900/50 text-cyan-300',
  procurement: 'bg-yellow-900/50 text-yellow-300',
  automation: 'bg-brand-900/50 text-brand-300',
};

export default function Reports() {
  const [moduleFilter, setModuleFilter] = useState('');

  const filtered = demoTemplates.filter((t) => !moduleFilter || t.module === moduleFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Generate, schedule, and export reports across all modules</p>
        </div>
        <button className="btn-primary flex items-center gap-2"><Plus size={16} /> Custom Report</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Report Templates" value={demoTemplates.length} icon={FileText} color="blue" />
        <StatCard label="Scheduled Reports" value={demoTemplates.filter(t => t.schedule).length} icon={Calendar} color="purple" />
        <StatCard label="Reports This Month" value={14} icon={BarChart3} color="green" />
        <StatCard label="Email Deliveries" value={8} icon={Mail} color="blue" />
      </div>

      {/* Module filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-slate-500">Filter:</span>
        <button onClick={() => setModuleFilter('')} className={clsx('badge cursor-pointer', !moduleFilter ? 'bg-brand-600 text-white' : 'badge-info')}>All</button>
        {['saas', 'assets', 'security', 'helpdesk', 'identity', 'procurement', 'automation'].map((m) => (
          <button key={m} onClick={() => setModuleFilter(m)} className={clsx('badge cursor-pointer', moduleFilter === m ? 'bg-brand-600 text-white' : 'badge-info')}>
            {m === 'saas' ? 'SaaS' : m === 'helpdesk' ? 'Help Desk' : m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((tpl) => (
          <div key={tpl.id} className="card hover:border-slate-700 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-slate-200">{tpl.name}</h3>
                <p className="text-xs text-slate-500 mt-1">{tpl.description}</p>
              </div>
              <span className={clsx('badge text-[10px]', moduleColors[tpl.module] || 'badge-info')}>
                {tpl.module}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
              <span>Format: {tpl.format}</span>
              {tpl.schedule && <span>Schedule: {tpl.schedule}</span>}
              {tpl.lastRunAt && <span>Last run: {new Date(tpl.lastRunAt).toLocaleDateString()}</span>}
            </div>

            <div className="flex gap-2">
              <button className="btn-primary text-xs flex-1 flex items-center justify-center gap-1">
                <BarChart3 size={14} /> Generate
              </button>
              <button className="btn-secondary text-xs flex items-center gap-1">
                <Download size={14} /> Export
              </button>
              {tpl.schedule && (
                <button className="btn-secondary text-xs flex items-center gap-1">
                  <Mail size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Custom dashboard builder teaser */}
      <div className="card border-dashed border-slate-700 text-center py-8">
        <BarChart3 size={32} className="mx-auto text-slate-600 mb-2" />
        <h3 className="font-semibold text-slate-400">Custom Dashboard Builder</h3>
        <p className="text-sm text-slate-600 mt-1">Drag and drop widgets to create custom dashboards for your team</p>
        <button className="btn-secondary mt-3 text-sm">Create Custom Dashboard</button>
      </div>
    </div>
  );
}
