import React, { useState } from 'react';
import { ShoppingCart, Plus, DollarSign, CheckCircle, Clock, Search } from 'lucide-react';
import DataTable from '../components/DataTable';
import StatCard from '../components/StatCard';
import { formatCurrency, formatDate, formatRelativeTime } from '../utils/format';
import clsx from 'clsx';

const demoRequests = [
  { id: '1', title: '10x Dell Monitors (P2722H)', vendor: 'Dell Technologies', estimatedCost: 3500, department: 'Engineering', status: 'PENDING_APPROVAL', requester: { firstName: 'Morgan', lastName: 'Manager' }, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: '2', title: 'Adobe Creative Cloud Licenses (5)', vendor: 'Adobe', estimatedCost: 3300, department: 'Design', status: 'APPROVED', requester: { firstName: 'Sam', lastName: 'Tech' }, createdAt: new Date(Date.now() - 172800000).toISOString() },
  { id: '3', title: 'Cisco Switch Replacement', vendor: 'Cisco', estimatedCost: 8500, department: 'IT', status: 'ORDERED', requester: { firstName: 'Alex', lastName: 'Admin' }, createdAt: new Date(Date.now() - 432000000).toISOString() },
  { id: '4', title: 'Standing Desks (20)', vendor: 'Ergotron', estimatedCost: 14000, department: 'Facilities', status: 'DRAFT', requester: { firstName: 'Val', lastName: 'Viewer' }, createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: '5', title: 'MacBook Air M3 (3)', vendor: 'Apple', estimatedCost: 4497, department: 'Marketing', status: 'RECEIVED', requester: { firstName: 'Morgan', lastName: 'Manager' }, createdAt: new Date(Date.now() - 864000000).toISOString() },
];

const demoVendors = [
  { id: '1', name: 'Dell Technologies', category: 'Hardware', rating: 4.5 },
  { id: '2', name: 'Apple', category: 'Hardware', rating: 4.8 },
  { id: '3', name: 'Cisco', category: 'Networking', rating: 4.2 },
  { id: '4', name: 'Adobe', category: 'Software', rating: 4.0 },
  { id: '5', name: 'Ergotron', category: 'Furniture', rating: 4.3 },
];

export default function Procurement() {
  const [tab, setTab] = useState<'requests' | 'vendors' | 'budget'>('requests');
  const [search, setSearch] = useState('');

  const totalSpend = demoRequests.filter(r => ['APPROVED', 'ORDERED', 'RECEIVED'].includes(r.status)).reduce((s, r) => s + r.estimatedCost, 0);
  const pending = demoRequests.filter(r => r.status === 'PENDING_APPROVAL').length;

  const statusBadge = (status: string) => {
    const map: Record<string, string> = { DRAFT: 'badge-info', PENDING_APPROVAL: 'badge-medium', APPROVED: 'badge-low', ORDERED: 'badge-low', RECEIVED: 'badge-low', REJECTED: 'badge-high', CANCELLED: 'badge-info' };
    return map[status] || 'badge-info';
  };

  const columns = [
    {
      key: 'title', header: 'Request',
      render: (r: any) => (
        <div>
          <span className="font-medium text-slate-200">{r.title}</span>
          <div className="text-xs text-slate-500">by {r.requester.firstName} {r.requester.lastName}</div>
        </div>
      ),
    },
    { key: 'vendor', header: 'Vendor' },
    { key: 'department', header: 'Department' },
    { key: 'estimatedCost', header: 'Cost', render: (r: any) => <span className="font-medium">{formatCurrency(r.estimatedCost)}</span> },
    { key: 'status', header: 'Status', render: (r: any) => <span className={`badge ${statusBadge(r.status)}`}>{r.status.replace('_', ' ')}</span> },
    { key: 'createdAt', header: 'Created', render: (r: any) => <span className="text-slate-400">{formatRelativeTime(r.createdAt)}</span> },
    {
      key: 'actions', header: '',
      render: (r: any) => r.status === 'PENDING_APPROVAL' ? (
        <div className="flex gap-2">
          <button className="btn-primary text-xs py-1 px-2">Approve</button>
          <button className="btn-danger text-xs py-1 px-2">Reject</button>
        </div>
      ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Procurement</h1>
          <p className="text-sm text-slate-500 mt-1">Purchase requests, vendor management, and budget tracking</p>
        </div>
        <button className="btn-primary flex items-center gap-2"><Plus size={16} /> New Request</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Requests" value={demoRequests.length} icon={ShoppingCart} color="blue" />
        <StatCard label="Pending Approval" value={pending} icon={Clock} color="yellow" />
        <StatCard label="Approved Spend" value={formatCurrency(totalSpend)} icon={DollarSign} color="purple" />
        <StatCard label="Active Vendors" value={demoVendors.length} icon={CheckCircle} color="green" />
      </div>

      <div className="flex gap-1 bg-surface-900 p-1 rounded-lg w-fit">
        {(['requests', 'vendors', 'budget'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={clsx('px-4 py-2 text-sm font-medium rounded-md transition-colors', tab === t ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white')}>
            {t === 'requests' ? 'Purchase Requests' : t === 'vendors' ? 'Vendor Directory' : 'Budget'}
          </button>
        ))}
      </div>

      {tab === 'requests' && <DataTable columns={columns} data={demoRequests.filter(r => !search || r.title.toLowerCase().includes(search.toLowerCase())) as any} />}

      {tab === 'vendors' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {demoVendors.map((v) => (
            <div key={v.id} className="card">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-200">{v.name}</h3>
                <span className="badge badge-info">{v.category}</span>
              </div>
              <div className="flex items-center gap-1 mt-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={i < Math.floor(v.rating) ? 'text-yellow-400' : 'text-slate-700'}>★</span>
                ))}
                <span className="text-xs text-slate-500 ml-1">{v.rating}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'budget' && (
        <div className="card">
          <h3 className="font-semibold text-slate-300 mb-4">Spending by Department</h3>
          <div className="space-y-4">
            {['IT', 'Engineering', 'Design', 'Marketing', 'Facilities'].map((dept) => {
              const spend = demoRequests.filter(r => r.department === dept && ['APPROVED', 'ORDERED', 'RECEIVED'].includes(r.status)).reduce((s, r) => s + r.estimatedCost, 0);
              const budget = 25000;
              return (
                <div key={dept}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300">{dept}</span>
                    <span className="text-slate-400">{formatCurrency(spend)} / {formatCurrency(budget)}</span>
                  </div>
                  <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                    <div className={clsx('h-full rounded-full', spend / budget > 0.9 ? 'bg-red-500' : spend / budget > 0.7 ? 'bg-yellow-500' : 'bg-brand-500')} style={{ width: `${Math.min(100, (spend / budget) * 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
