import React, { useState } from 'react';
import { Zap, Plus, Play, Clock, DollarSign, TrendingUp, Sparkles, Search } from 'lucide-react';
import StatCard from '../components/StatCard';
import { formatCurrency } from '../utils/format';
import clsx from 'clsx';

const demoWorkflows = [
  { id: '1', name: 'New Employee Onboarding', description: 'Automatically provision accounts, assign hardware, and send welcome email', triggerType: 'event', isActive: true, isBuiltIn: true, runCount: 47, hoursSaved: 94, costRecovered: 4700 },
  { id: '2', name: 'Employee Offboarding', description: 'Deactivate accounts, reclaim licenses, collect hardware', triggerType: 'event', isActive: true, isBuiltIn: true, runCount: 12, hoursSaved: 36, costRecovered: 1800 },
  { id: '3', name: 'License Reclamation', description: 'Detect and reclaim unused SaaS licenses weekly', triggerType: 'schedule', isActive: true, isBuiltIn: true, runCount: 52, hoursSaved: 26, costRecovered: 15600 },
  { id: '4', name: 'MFA Enrollment Nudge', description: 'Remind users without MFA to enable it', triggerType: 'schedule', isActive: true, isBuiltIn: true, runCount: 24, hoursSaved: 12, costRecovered: 0 },
  { id: '5', name: 'Patch Alert Notification', description: 'Alert IT staff when critical patches are available', triggerType: 'event', isActive: true, isBuiltIn: true, runCount: 8, hoursSaved: 4, costRecovered: 0 },
];

export default function Workflows() {
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState('');

  const totalRuns = demoWorkflows.reduce((s, w) => s + w.runCount, 0);
  const totalHours = demoWorkflows.reduce((s, w) => s + w.hoursSaved, 0);
  const totalCost = demoWorkflows.reduce((s, w) => s + w.costRecovered, 0);

  async function handleNLQuery() {
    if (!query.trim()) return;
    // In production, this calls /api/ai/chat
    setQueryResult('Based on current data, you are spending approximately $2,430/month on licenses with less than 30% utilization. The biggest savings opportunity is Notion ($2,000/mo, 22.5% utilization) and Monday.com ($300/mo, 13% utilization). Reclaiming unused licenses could save ~$1,300/month.');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Automation Engine</h1>
          <p className="text-sm text-slate-500 mt-1">Automate IT workflows and track ROI</p>
        </div>
        <button className="btn-primary flex items-center gap-2"><Plus size={16} /> Create Workflow</button>
      </div>

      {/* ROI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Workflows" value={demoWorkflows.filter(w => w.isActive).length} icon={Zap} color="blue" />
        <StatCard label="Total Executions" value={totalRuns} icon={Play} color="purple" />
        <StatCard label="Hours Saved" value={totalHours} icon={Clock} color="green" tooltip="Total automated work hours saved" />
        <StatCard label="Cost Recovered" value={formatCurrency(totalCost)} icon={DollarSign} color="green" tooltip="Money saved through automation" />
      </div>

      {/* Natural Language Query */}
      <div className="card bg-gradient-to-r from-brand-900/40 to-purple-900/40 border-brand-800/50">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={18} className="text-brand-400" />
          <h3 className="font-semibold text-sm text-brand-300">Ask anything in plain English</h3>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNLQuery()}
            placeholder='Try: "How much are we spending on unused licenses?"'
            className="input flex-1"
          />
          <button onClick={handleNLQuery} className="btn-primary">Ask</button>
        </div>
        {queryResult && (
          <div className="mt-3 p-3 bg-surface-900/50 rounded-lg text-sm text-slate-300 leading-relaxed">
            {queryResult}
          </div>
        )}
      </div>

      {/* Workflows Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {demoWorkflows.map((wf) => (
          <div key={wf.id} className="card hover:border-slate-700 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', wf.isActive ? 'bg-brand-600/20 text-brand-400' : 'bg-slate-800 text-slate-500')}>
                  <Zap size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-200">{wf.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{wf.description}</p>
                </div>
              </div>
              <span className={clsx('badge', wf.isActive ? 'badge-low' : 'badge-info')}>
                {wf.isActive ? 'Active' : 'Paused'}
              </span>
            </div>

            <div className="flex items-center gap-6 mt-4 pt-3 border-t border-slate-800">
              <div className="text-center">
                <span className="text-lg font-bold text-white">{wf.runCount}</span>
                <p className="text-[10px] text-slate-500 uppercase">Runs</p>
              </div>
              <div className="text-center">
                <span className="text-lg font-bold text-emerald-400">{wf.hoursSaved}h</span>
                <p className="text-[10px] text-slate-500 uppercase">Saved</p>
              </div>
              <div className="text-center">
                <span className="text-lg font-bold text-purple-400">{formatCurrency(wf.costRecovered)}</span>
                <p className="text-[10px] text-slate-500 uppercase">Recovered</p>
              </div>
              <div className="ml-auto flex gap-2">
                <button className="btn-secondary text-xs py-1.5">Configure</button>
                <button className="btn-primary text-xs py-1.5 flex items-center gap-1"><Play size={12} /> Run</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pre-built workflows */}
      <div className="card">
        <h3 className="font-semibold text-slate-300 mb-3">Available Workflow Templates</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { name: 'Certificate Renewal Alert', desc: 'Monitor SSL certs and alert before expiry' },
            { name: 'Compliance Report Generator', desc: 'Auto-generate compliance reports weekly' },
            { name: 'New Device Setup', desc: 'Configure and enroll new devices automatically' },
            { name: 'Shadow IT Scanner', desc: 'Detect unauthorized SaaS usage' },
            { name: 'Backup Verification', desc: 'Verify backup integrity daily' },
            { name: 'Cost Anomaly Alert', desc: 'Alert on unusual spending patterns' },
          ].map((tpl) => (
            <div key={tpl.name} className="p-3 bg-surface-850 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer">
              <h4 className="text-sm font-medium text-slate-300">{tpl.name}</h4>
              <p className="text-xs text-slate-500 mt-1">{tpl.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
