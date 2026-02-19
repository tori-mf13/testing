import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, Bug, FileCheck, Search } from 'lucide-react';
import DataTable from '../components/DataTable';
import StatCard from '../components/StatCard';
import GaugeChart from '../components/GaugeChart';
import { formatRelativeTime, severityColor } from '../utils/format';
import clsx from 'clsx';

const demoAlerts = [
  { id: '1', title: 'Suspicious login from unusual location', source: 'Okta', severity: 'HIGH', status: 'OPEN', description: 'Login from IP 185.x.x.x (Russia)', affectedAsset: 'john@company.com', createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: '2', title: 'SSL certificate expiring in 7 days', source: 'Certificate Monitor', severity: 'MEDIUM', status: 'OPEN', description: 'Certificate for api.company.com', affectedAsset: 'api.company.com', createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: '3', title: 'Critical CVE on production server', source: 'Vulnerability Scanner', severity: 'CRITICAL', status: 'IN_PROGRESS', description: 'CVE-2025-1234: RCE in OpenSSL', affectedAsset: 'prod-web-01', createdAt: new Date(Date.now() - 14400000).toISOString() },
  { id: '4', title: 'Failed login brute force attempt', source: 'Firewall', severity: 'HIGH', status: 'OPEN', description: '150 failed attempts in 5 minutes', createdAt: new Date(Date.now() - 28800000).toISOString() },
  { id: '5', title: 'Unencrypted data transfer', source: 'DLP', severity: 'MEDIUM', status: 'OPEN', description: 'Sensitive data via HTTP', createdAt: new Date(Date.now() - 43200000).toISOString() },
];

const demoFrameworks = [
  { id: '1', name: 'SOC 2 Type II', totalControls: 64, passedControls: 52, failedControls: 4, progressPct: 81.25 },
  { id: '2', name: 'ISO 27001', totalControls: 114, passedControls: 89, failedControls: 10, progressPct: 78.07 },
  { id: '3', name: 'NIST CSF', totalControls: 108, passedControls: 75, failedControls: 15, progressPct: 69.44 },
  { id: '4', name: 'GDPR', totalControls: 45, passedControls: 40, failedControls: 2, progressPct: 88.89 },
];

export default function Security() {
  const [tab, setTab] = useState<'alerts' | 'compliance' | 'vulnerabilities'>('alerts');
  const [severityFilter, setSeverityFilter] = useState('');

  const filteredAlerts = demoAlerts.filter((a) => !severityFilter || a.severity === severityFilter);

  const alertColumns = [
    {
      key: 'severity', header: 'Severity',
      render: (a: any) => <span className={`badge ${severityColor(a.severity)}`}>{a.severity}</span>,
    },
    {
      key: 'title', header: 'Alert',
      render: (a: any) => (
        <div>
          <span className="font-medium text-slate-200">{a.title}</span>
          <div className="text-xs text-slate-500">{a.description}</div>
        </div>
      ),
    },
    { key: 'source', header: 'Source' },
    { key: 'affectedAsset', header: 'Affected', render: (a: any) => <span className="text-slate-400">{a.affectedAsset || '-'}</span> },
    {
      key: 'status', header: 'Status',
      render: (a: any) => <span className={clsx('badge', a.status === 'OPEN' ? 'badge-high' : a.status === 'IN_PROGRESS' ? 'badge-medium' : 'badge-low')}>{a.status.replace('_', ' ')}</span>,
    },
    {
      key: 'createdAt', header: 'Detected',
      render: (a: any) => <span className="text-slate-400">{formatRelativeTime(a.createdAt)}</span>,
    },
    {
      key: 'actions', header: '',
      render: () => <button className="btn-secondary text-xs py-1 px-2">Investigate</button>,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Security & Compliance</h1>
        <p className="text-sm text-slate-500 mt-1">Monitor threats, manage vulnerabilities, and track compliance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Open Alerts" value={demoAlerts.filter(a => a.status === 'OPEN').length} icon={AlertTriangle} color="red" />
        <StatCard label="Critical Issues" value={demoAlerts.filter(a => a.severity === 'CRITICAL').length} icon={AlertTriangle} color="red" />
        <StatCard label="Compliance Score" value="79%" icon={FileCheck} color="blue" />
        <StatCard label="Patch Compliance" value="85%" icon={ShieldCheck} color="green" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-900 p-1 rounded-lg w-fit">
        {(['alerts', 'compliance', 'vulnerabilities'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={clsx('px-4 py-2 text-sm font-medium rounded-md transition-colors', tab === t ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white')}>
            {t === 'alerts' ? 'Alert Queue' : t === 'compliance' ? 'Compliance' : 'Vulnerabilities'}
          </button>
        ))}
      </div>

      {tab === 'alerts' && (
        <>
          <div className="flex items-center gap-3">
            <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="input text-sm">
              <option value="">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
          <DataTable columns={alertColumns} data={filteredAlerts as any} />
        </>
      )}

      {tab === 'compliance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {demoFrameworks.map((fw) => (
            <div key={fw.id} className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-200">{fw.name}</h3>
                <GaugeChart value={fw.progressPct} label="" size={60} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Controls Passed</span>
                  <span className="text-emerald-400">{fw.passedControls}/{fw.totalControls}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Controls Failed</span>
                  <span className="text-red-400">{fw.failedControls}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">In Progress</span>
                  <span className="text-yellow-400">{fw.totalControls - fw.passedControls - fw.failedControls}</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full mt-3 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${fw.progressPct}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'vulnerabilities' && (
        <div className="card text-center py-12">
          <Bug size={48} className="mx-auto text-slate-700 mb-3" />
          <p className="text-slate-400">Vulnerability tracking syncs with your scanner</p>
          <p className="text-xs text-slate-600 mt-1">Connect your vulnerability scanner in Settings to see results here</p>
        </div>
      )}
    </div>
  );
}
