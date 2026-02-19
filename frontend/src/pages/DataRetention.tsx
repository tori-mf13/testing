import React, { useState } from 'react';
import { Database, Plus, Shield, Trash2, Archive } from 'lucide-react';
import DataTable from '../components/DataTable';
import StatCard from '../components/StatCard';
import clsx from 'clsx';

const demoPolicies = [
  { id: '1', name: 'Employee Records', dataType: 'HR Data', retentionDays: 2555, action: 'ARCHIVE', isActive: true, description: 'Retain for 7 years per labor law' },
  { id: '2', name: 'Customer PII', dataType: 'Personal Data', retentionDays: 1095, action: 'ANONYMIZE', isActive: true, description: 'GDPR - anonymize after 3 years of inactivity' },
  { id: '3', name: 'System Logs', dataType: 'Logs', retentionDays: 365, action: 'DELETE', isActive: true, description: 'Delete system logs after 1 year' },
  { id: '4', name: 'Financial Records', dataType: 'Financial', retentionDays: 2555, action: 'ARCHIVE', isActive: true, description: 'SOX compliance - 7 year retention' },
  { id: '5', name: 'Marketing Consent', dataType: 'Consent Records', retentionDays: 1825, action: 'DELETE', isActive: true, description: 'Delete 5 years after last interaction' },
];

const demoErasureRequests = [
  { id: '1', subjectName: 'Jane Doe', subjectEmail: 'jane@example.com', requestType: 'GDPR Right to Erasure', status: 'Pending', dataSystems: ['CRM', 'Email', 'Analytics'], createdAt: new Date(Date.now() - 172800000).toISOString() },
  { id: '2', subjectName: 'John Smith', subjectEmail: 'john@example.com', requestType: 'GDPR Right to Erasure', status: 'In Progress', dataSystems: ['CRM', 'Billing'], createdAt: new Date(Date.now() - 432000000).toISOString() },
  { id: '3', subjectName: 'Alice Brown', subjectEmail: 'alice@example.com', requestType: 'CCPA Deletion', status: 'Completed', dataSystems: ['CRM', 'Email', 'Analytics', 'Billing'], createdAt: new Date(Date.now() - 864000000).toISOString() },
];

export default function DataRetention() {
  const [tab, setTab] = useState<'policies' | 'erasure'>('policies');

  const actionIcon = (action: string) => {
    switch (action) {
      case 'DELETE': return <Trash2 size={14} className="text-red-400" />;
      case 'ARCHIVE': return <Archive size={14} className="text-blue-400" />;
      case 'ANONYMIZE': return <Shield size={14} className="text-purple-400" />;
      default: return null;
    }
  };

  const policyColumns = [
    { key: 'name', header: 'Policy Name', render: (p: any) => <span className="font-medium text-slate-200">{p.name}</span> },
    { key: 'dataType', header: 'Data Type', render: (p: any) => <span className="badge badge-info">{p.dataType}</span> },
    { key: 'retentionDays', header: 'Retention Period', render: (p: any) => <span>{Math.round(p.retentionDays / 365)} years</span> },
    { key: 'action', header: 'Expiry Action', render: (p: any) => <div className="flex items-center gap-1.5">{actionIcon(p.action)}<span>{p.action}</span></div> },
    { key: 'description', header: 'Notes', render: (p: any) => <span className="text-slate-500 text-xs">{p.description}</span> },
    { key: 'isActive', header: 'Status', render: (p: any) => <span className={clsx('badge', p.isActive ? 'badge-low' : 'badge-info')}>{p.isActive ? 'Active' : 'Disabled'}</span> },
  ];

  const erasureColumns = [
    { key: 'subjectName', header: 'Subject', render: (r: any) => <div><span className="text-slate-200">{r.subjectName}</span><div className="text-xs text-slate-500">{r.subjectEmail}</div></div> },
    { key: 'requestType', header: 'Type', render: (r: any) => <span className="badge badge-info">{r.requestType}</span> },
    { key: 'dataSystems', header: 'Systems', render: (r: any) => <span className="text-xs text-slate-400">{r.dataSystems.join(', ')}</span> },
    { key: 'status', header: 'Status', render: (r: any) => <span className={clsx('badge', r.status === 'Completed' ? 'badge-low' : r.status === 'In Progress' ? 'badge-medium' : 'badge-high')}>{r.status}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Data Retention</h1>
          <p className="text-sm text-slate-500 mt-1">Manage retention policies and data erasure requests</p>
        </div>
        <button className="btn-primary flex items-center gap-2"><Plus size={16} /> New Policy</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Policies" value={demoPolicies.filter(p => p.isActive).length} icon={Database} color="blue" />
        <StatCard label="Pending Erasure Requests" value={demoErasureRequests.filter(r => r.status !== 'Completed').length} icon={Trash2} color="yellow" />
        <StatCard label="Completed Erasures" value={demoErasureRequests.filter(r => r.status === 'Completed').length} icon={Shield} color="green" />
        <StatCard label="Data Types Covered" value={new Set(demoPolicies.map(p => p.dataType)).size} icon={Archive} color="purple" />
      </div>

      <div className="flex gap-1 bg-surface-900 p-1 rounded-lg w-fit">
        {(['policies', 'erasure'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={clsx('px-4 py-2 text-sm font-medium rounded-md transition-colors', tab === t ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white')}>
            {t === 'policies' ? 'Retention Policies' : 'Erasure Requests'}
          </button>
        ))}
      </div>

      {tab === 'policies' && <DataTable columns={policyColumns} data={demoPolicies as any} />}
      {tab === 'erasure' && <DataTable columns={erasureColumns} data={demoErasureRequests as any} />}
    </div>
  );
}
