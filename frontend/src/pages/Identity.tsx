import React, { useEffect, useState } from 'react';
import { Users, ShieldCheck, UserX, Key, Search, Plus, Check, X as XIcon } from 'lucide-react';
import DataTable from '../components/DataTable';
import StatCard from '../components/StatCard';
import GaugeChart from '../components/GaugeChart';
import { formatDate, formatRelativeTime } from '../utils/format';
import { useAuthStore, isStaff, isManager } from '../store';
import api from '../services/api';
import clsx from 'clsx';

const demoUsers = [
  { id: '1', firstName: 'Alex', lastName: 'Admin', email: 'admin@company.com', role: 'ADMIN', department: 'IT', mfaEnabled: true, isActive: true, lastLogin: new Date().toISOString() },
  { id: '2', firstName: 'Sam', lastName: 'Tech', email: 'tech@company.com', role: 'IT_STAFF', department: 'IT', mfaEnabled: true, isActive: true, lastLogin: new Date(Date.now() - 3600000).toISOString() },
  { id: '3', firstName: 'Morgan', lastName: 'Manager', email: 'manager@company.com', role: 'MANAGER', department: 'Engineering', mfaEnabled: false, isActive: true, lastLogin: new Date(Date.now() - 86400000).toISOString() },
  { id: '4', firstName: 'Val', lastName: 'Viewer', email: 'viewer@company.com', role: 'READ_ONLY', department: 'Marketing', mfaEnabled: false, isActive: true, lastLogin: new Date(Date.now() - 172800000).toISOString() },
  { id: '5', firstName: 'Jordan', lastName: 'Dev', email: 'jordan@company.com', role: 'IT_STAFF', department: 'Engineering', mfaEnabled: true, isActive: true, lastLogin: new Date(Date.now() - 7200000).toISOString() },
];

const demoRequests = [
  { id: '1', requester: { firstName: 'Morgan', lastName: 'Manager' }, resourceName: 'AWS Console', accessLevel: 'Read-Only', status: 'PENDING', createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: '2', requester: { firstName: 'Val', lastName: 'Viewer' }, resourceName: 'Salesforce', accessLevel: 'Standard', status: 'PENDING', createdAt: new Date(Date.now() - 14400000).toISOString() },
  { id: '3', requester: { firstName: 'Jordan', lastName: 'Dev' }, resourceName: 'GitHub Org', accessLevel: 'Admin', status: 'APPROVED', createdAt: new Date(Date.now() - 86400000).toISOString() },
];

export default function Identity() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<'directory' | 'requests' | 'orphaned'>('directory');
  const [search, setSearch] = useState('');
  const [users] = useState(demoUsers);
  const [requests] = useState(demoRequests);

  const mfaAdoption = Math.round((users.filter(u => u.mfaEnabled).length / users.length) * 100);

  const userColumns = [
    {
      key: 'name', header: 'Name',
      render: (u: any) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center text-xs font-medium text-white">
            {u.firstName[0]}{u.lastName[0]}
          </div>
          <div>
            <span className="font-medium text-slate-200">{u.firstName} {u.lastName}</span>
            <div className="text-xs text-slate-500">{u.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role', header: 'Role',
      render: (u: any) => <span className="badge badge-info">{u.role.replace('_', ' ')}</span>,
    },
    { key: 'department', header: 'Department' },
    {
      key: 'mfaEnabled', header: 'MFA',
      render: (u: any) => (
        <span className={u.mfaEnabled ? 'text-emerald-400 flex items-center gap-1' : 'text-red-400 flex items-center gap-1'}>
          {u.mfaEnabled ? <><Check size={14} /> Enabled</> : <><XIcon size={14} /> Off</>}
        </span>
      ),
    },
    {
      key: 'lastLogin', header: 'Last Active',
      render: (u: any) => <span className="text-slate-400">{formatRelativeTime(u.lastLogin)}</span>,
    },
    {
      key: 'isActive', header: 'Status',
      render: (u: any) => (
        <span className={clsx('badge', u.isActive ? 'badge-low' : 'badge-high')}>
          {u.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  const requestColumns = [
    {
      key: 'requester', header: 'Requester',
      render: (r: any) => <span className="text-slate-200">{r.requester.firstName} {r.requester.lastName}</span>,
    },
    { key: 'resourceName', header: 'Resource' },
    { key: 'accessLevel', header: 'Access Level' },
    {
      key: 'status', header: 'Status',
      render: (r: any) => (
        <span className={clsx('badge', r.status === 'PENDING' ? 'badge-medium' : r.status === 'APPROVED' ? 'badge-low' : 'badge-high')}>
          {r.status}
        </span>
      ),
    },
    {
      key: 'createdAt', header: 'Requested',
      render: (r: any) => <span className="text-slate-400">{formatRelativeTime(r.createdAt)}</span>,
    },
    {
      key: 'actions', header: 'Actions',
      render: (r: any) => r.status === 'PENDING' && isManager(user?.role) ? (
        <div className="flex gap-2">
          <button className="btn-primary text-xs py-1 px-2">Approve</button>
          <button className="btn-danger text-xs py-1 px-2">Deny</button>
        </div>
      ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Identity & Access</h1>
          <p className="text-sm text-slate-500 mt-1">Manage users, access requests, and security policies</p>
        </div>
        {isStaff(user?.role) && (
          <button className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add User
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={users.length} icon={Users} color="blue" />
        <StatCard label="MFA Adoption" value={`${mfaAdoption}%`} icon={ShieldCheck} color={mfaAdoption >= 80 ? 'green' : 'yellow'} tooltip="Percentage of users with multi-factor authentication enabled" />
        <StatCard label="Pending Requests" value={requests.filter(r => r.status === 'PENDING').length} icon={Key} color="purple" />
        <StatCard label="Orphaned Accounts" value={0} icon={UserX} color="green" tooltip="Accounts in external services without matching active users" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-900 p-1 rounded-lg w-fit">
        {(['directory', 'requests', 'orphaned'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              tab === t ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
            )}
          >
            {t === 'directory' ? 'User Directory' : t === 'requests' ? 'Access Requests' : 'Orphaned Accounts'}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-surface-850 rounded-lg px-3 py-2 max-w-xs">
        <Search size={16} className="text-slate-500" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none flex-1" />
      </div>

      {tab === 'directory' && <DataTable columns={userColumns} data={users.filter(u => !search || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase())) as any} />}
      {tab === 'requests' && <DataTable columns={requestColumns} data={requests as any} emptyMessage="No access requests" />}
      {tab === 'orphaned' && (
        <div className="card text-center py-12">
          <UserX size={48} className="mx-auto text-slate-700 mb-3" />
          <p className="text-slate-400">No orphaned accounts detected</p>
          <p className="text-xs text-slate-600 mt-1">Accounts are checked against your identity provider daily</p>
        </div>
      )}
    </div>
  );
}
