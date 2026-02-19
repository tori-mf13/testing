import React, { useEffect, useState } from 'react';
import { Monitor, Laptop, Server, Smartphone, Search, Plus, AlertTriangle } from 'lucide-react';
import DataTable from '../components/DataTable';
import StatCard from '../components/StatCard';
import { formatDate, formatCurrency, statusColor } from '../utils/format';
import type { Asset, PaginatedResponse } from '../types';
import api from '../services/api';
import clsx from 'clsx';

const demoAssets: Asset[] = [
  { id: '1', name: 'MacBook Pro 16"', assetTag: 'AST-001', type: 'LAPTOP', manufacturer: 'Apple', model: 'MacBook Pro 16" M3 Max', serialNumber: 'FVFXM2XXXXX', assignedUser: { firstName: 'Alex', lastName: 'Admin', email: 'admin@company.com' }, department: 'IT', purchaseDate: '2024-06-15', purchaseCost: 3499, warrantyExpiry: '2027-06-15', osName: 'macOS', osVersion: '15.1', patchStatus: 'Up to date', status: 'IN_USE' },
  { id: '2', name: 'ThinkPad X1 Carbon', assetTag: 'AST-002', type: 'LAPTOP', manufacturer: 'Lenovo', model: 'X1 Carbon Gen 11', serialNumber: 'PF4XXXXX', assignedUser: { firstName: 'Sam', lastName: 'Tech', email: 'tech@company.com' }, department: 'IT', purchaseDate: '2024-03-01', purchaseCost: 1849, warrantyExpiry: '2027-03-01', osName: 'Windows', osVersion: '11 Pro', patchStatus: 'Up to date', status: 'IN_USE' },
  { id: '3', name: 'Dell PowerEdge R750', assetTag: 'AST-003', type: 'SERVER', manufacturer: 'Dell', model: 'PowerEdge R750', serialNumber: 'DELLSRV001', department: 'IT', purchaseDate: '2023-01-15', purchaseCost: 12500, warrantyExpiry: '2026-01-15', osName: 'Ubuntu', osVersion: '22.04 LTS', patchStatus: 'Needs update', status: 'IN_USE' },
  { id: '4', name: 'iPhone 15 Pro', assetTag: 'AST-004', type: 'MOBILE', manufacturer: 'Apple', model: 'iPhone 15 Pro', serialNumber: 'APLMOB001', assignedUser: { firstName: 'Morgan', lastName: 'Manager', email: 'manager@company.com' }, department: 'Engineering', purchaseDate: '2024-09-20', purchaseCost: 1199, warrantyExpiry: '2026-09-20', osName: 'iOS', osVersion: '18.1', patchStatus: 'Up to date', status: 'IN_USE' },
  { id: '5', name: 'Dell OptiPlex 7010', assetTag: 'AST-005', type: 'DESKTOP', manufacturer: 'Dell', model: 'OptiPlex 7010', serialNumber: 'DELLDT001', department: 'Finance', purchaseDate: '2021-06-01', purchaseCost: 1200, warrantyExpiry: '2024-06-01', osName: 'Windows', osVersion: '11 Pro', patchStatus: 'Outdated', status: 'IN_USE' },
];

export default function Assets() {
  const [assets, setAssets] = useState<Asset[]>(demoAssets);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<PaginatedResponse<Asset>>('/assets');
        if (res.data.length > 0) setAssets(res.data);
      } catch { /* use demo */ }
    }
    load();
  }, []);

  const filtered = assets.filter((a) => {
    if (search && !`${a.name} ${a.assetTag} ${a.serialNumber}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter && a.type !== typeFilter) return false;
    return true;
  });

  const totalValue = assets.reduce((s, a) => s + (a.purchaseCost || 0), 0);
  const warrantyExpiring = assets.filter((a) => {
    if (!a.warrantyExpiry) return false;
    const exp = new Date(a.warrantyExpiry);
    return exp <= new Date(Date.now() + 90 * 86400000) && exp >= new Date();
  });
  const patchedPct = Math.round((assets.filter(a => a.patchStatus === 'Up to date').length / assets.length) * 100);

  const columns = [
    {
      key: 'name', header: 'Asset',
      render: (a: Asset) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400">
            {a.type === 'LAPTOP' ? <Laptop size={16} /> : a.type === 'SERVER' ? <Server size={16} /> : a.type === 'MOBILE' ? <Smartphone size={16} /> : <Monitor size={16} />}
          </div>
          <div>
            <span className="font-medium text-slate-200">{a.name}</span>
            <div className="text-xs text-slate-500">{a.assetTag} · {a.manufacturer} {a.model}</div>
          </div>
        </div>
      ),
    },
    { key: 'serialNumber', header: 'Serial Number' },
    {
      key: 'assignedUser', header: 'Assigned To',
      render: (a: Asset) => a.assignedUser ? <span>{a.assignedUser.firstName} {a.assignedUser.lastName}</span> : <span className="text-slate-600">Unassigned</span>,
    },
    {
      key: 'osName', header: 'OS',
      render: (a: Asset) => <span className="text-slate-400">{a.osName} {a.osVersion}</span>,
    },
    {
      key: 'patchStatus', header: 'Patch Status',
      render: (a: Asset) => (
        <span className={clsx('badge', a.patchStatus === 'Up to date' ? 'badge-low' : a.patchStatus === 'Outdated' ? 'badge-high' : 'badge-medium')}>
          {a.patchStatus}
        </span>
      ),
    },
    {
      key: 'warrantyExpiry', header: 'Warranty',
      render: (a: Asset) => {
        if (!a.warrantyExpiry) return <span className="text-slate-600">N/A</span>;
        const expired = new Date(a.warrantyExpiry) < new Date();
        return <span className={expired ? 'text-red-400' : 'text-slate-400'}>{formatDate(a.warrantyExpiry)}{expired && ' (Expired)'}</span>;
      },
    },
    {
      key: 'status', header: 'Status',
      render: (a: Asset) => <span className={clsx('badge', a.status === 'IN_USE' ? 'badge-low' : a.status === 'AVAILABLE' ? 'badge-info' : 'badge-medium')}>{a.status.replace('_', ' ')}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Asset Management</h1>
          <p className="text-sm text-slate-500 mt-1">Track hardware inventory and lifecycle</p>
        </div>
        <button className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Asset</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Assets" value={assets.length} icon={Monitor} color="blue" />
        <StatCard label="Total Value" value={formatCurrency(totalValue)} icon={Monitor} color="purple" />
        <StatCard label="Warranty Expiring Soon" value={warrantyExpiring.length} icon={AlertTriangle} color={warrantyExpiring.length > 0 ? 'yellow' : 'green'} tooltip="Assets with warranty expiring in the next 90 days" />
        <StatCard label="Patch Compliance" value={`${patchedPct}%`} icon={Monitor} color={patchedPct >= 80 ? 'green' : 'red'} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-surface-850 rounded-lg px-3 py-2 flex-1 max-w-xs">
          <Search size={16} className="text-slate-500" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, tag, or serial..." className="bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none flex-1" />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input text-sm">
          <option value="">All Types</option>
          <option value="LAPTOP">Laptops</option>
          <option value="DESKTOP">Desktops</option>
          <option value="SERVER">Servers</option>
          <option value="MOBILE">Mobile</option>
          <option value="NETWORK_DEVICE">Network</option>
        </select>
      </div>

      <DataTable columns={columns} data={filtered as any} />
    </div>
  );
}
