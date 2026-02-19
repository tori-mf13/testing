import React, { useState } from 'react';
import { Headphones, Plus, Clock, CheckCircle, AlertTriangle, Sparkles, Search } from 'lucide-react';
import DataTable from '../components/DataTable';
import StatCard from '../components/StatCard';
import { formatRelativeTime, severityColor } from '../utils/format';
import clsx from 'clsx';

const demoTickets = [
  { id: '1', title: 'Cannot connect to VPN', category: 'Network', priority: 'HIGH', status: 'OPEN', creator: { firstName: 'Morgan', lastName: 'Manager' }, assignee: null, aiSuggestion: 'Check if the VPN client is up to date and verify the user\'s certificate hasn\'t expired.', createdAt: new Date(Date.now() - 3600000).toISOString(), _count: { comments: 2 } },
  { id: '2', title: 'Need access to Salesforce', category: 'Access Request', priority: 'MEDIUM', status: 'IN_PROGRESS', creator: { firstName: 'Val', lastName: 'Viewer' }, assignee: { firstName: 'Sam', lastName: 'Tech' }, createdAt: new Date(Date.now() - 14400000).toISOString(), _count: { comments: 5 } },
  { id: '3', title: 'Laptop running slow', category: 'Hardware', priority: 'LOW', status: 'OPEN', creator: { firstName: 'Jordan', lastName: 'Dev' }, assignee: null, aiSuggestion: 'Run disk cleanup and check for malware. If the laptop is >3 years old, consider a replacement.', createdAt: new Date(Date.now() - 28800000).toISOString(), _count: { comments: 0 } },
  { id: '4', title: 'Email not syncing on phone', category: 'Email', priority: 'MEDIUM', status: 'RESOLVED', creator: { firstName: 'Morgan', lastName: 'Manager' }, assignee: { firstName: 'Sam', lastName: 'Tech' }, createdAt: new Date(Date.now() - 86400000).toISOString(), _count: { comments: 3 } },
  { id: '5', title: 'Printer on 3rd floor not working', category: 'Hardware', priority: 'LOW', status: 'OPEN', creator: { firstName: 'Val', lastName: 'Viewer' }, assignee: null, createdAt: new Date(Date.now() - 43200000).toISOString(), _count: { comments: 1 } },
  { id: '6', title: 'Suspicious email received', category: 'Security', priority: 'URGENT', status: 'OPEN', creator: { firstName: 'Jordan', lastName: 'Dev' }, assignee: null, aiSuggestion: 'Flag as potential phishing. Quarantine the email and check if other users received similar messages.', createdAt: new Date(Date.now() - 1800000).toISOString(), _count: { comments: 0 } },
];

export default function HelpDesk() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<typeof demoTickets[0] | null>(null);

  const filtered = demoTickets.filter((t) => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && t.status !== statusFilter) return false;
    return true;
  });

  const open = demoTickets.filter(t => t.status === 'OPEN').length;
  const inProgress = demoTickets.filter(t => t.status === 'IN_PROGRESS').length;
  const resolved = demoTickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status)).length;
  const urgent = demoTickets.filter(t => t.priority === 'URGENT').length;

  const columns = [
    {
      key: 'priority', header: '',
      render: (t: any) => (
        <div className={clsx('w-1 h-8 rounded-full', t.priority === 'URGENT' ? 'bg-red-500' : t.priority === 'HIGH' ? 'bg-orange-500' : t.priority === 'MEDIUM' ? 'bg-yellow-500' : 'bg-blue-500')} />
      ),
    },
    {
      key: 'title', header: 'Ticket',
      render: (t: any) => (
        <div>
          <span className="font-medium text-slate-200">{t.title}</span>
          {t.aiSuggestion && <Sparkles size={12} className="inline ml-1.5 text-brand-400" />}
          <div className="text-xs text-slate-500">{t.category} · by {t.creator.firstName} {t.creator.lastName}</div>
        </div>
      ),
    },
    { key: 'priority2', header: 'Priority', render: (t: any) => <span className={`badge ${severityColor(t.priority)}`}>{t.priority}</span> },
    {
      key: 'assignee', header: 'Assigned To',
      render: (t: any) => t.assignee ? <span>{t.assignee.firstName} {t.assignee.lastName}</span> : <span className="text-slate-600">Unassigned</span>,
    },
    {
      key: 'status', header: 'Status',
      render: (t: any) => <span className={clsx('badge', t.status === 'OPEN' ? 'badge-high' : t.status === 'IN_PROGRESS' ? 'badge-medium' : 'badge-low')}>{t.status.replace(/_/g, ' ')}</span>,
    },
    {
      key: 'comments', header: 'Replies',
      render: (t: any) => <span className="text-slate-400">{t._count.comments}</span>,
    },
    {
      key: 'createdAt', header: 'Created',
      render: (t: any) => <span className="text-slate-400">{formatRelativeTime(t.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Help Desk</h1>
          <p className="text-sm text-slate-500 mt-1">IT support ticket queue with AI-assisted responses</p>
        </div>
        <button className="btn-primary flex items-center gap-2"><Plus size={16} /> New Ticket</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Open Tickets" value={open} icon={Headphones} color="blue" />
        <StatCard label="In Progress" value={inProgress} icon={Clock} color="yellow" />
        <StatCard label="Resolved Today" value={resolved} icon={CheckCircle} color="green" />
        <StatCard label="Urgent" value={urgent} icon={AlertTriangle} color={urgent > 0 ? 'red' : 'green'} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-surface-850 rounded-lg px-3 py-2 flex-1 max-w-xs">
          <Search size={16} className="text-slate-500" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tickets..." className="bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none flex-1" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input text-sm">
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      <DataTable columns={columns} data={filtered as any} onRowClick={(t: any) => setSelectedTicket(t)} />

      {/* AI Suggestion panel */}
      {selectedTicket?.aiSuggestion && (
        <div className="card border-brand-800/50 bg-brand-900/10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-brand-400" />
            <span className="font-semibold text-sm text-brand-300">AI-Suggested Response</span>
          </div>
          <p className="text-sm text-slate-300">{selectedTicket.aiSuggestion}</p>
          <div className="flex gap-2 mt-3">
            <button className="btn-primary text-xs">Use This Response</button>
            <button className="btn-secondary text-xs">Edit & Send</button>
          </div>
        </div>
      )}
    </div>
  );
}
