import React, { useState } from 'react';
import { Network, Wifi, Shield, Radio, Search, AlertTriangle } from 'lucide-react';
import DataTable from '../components/DataTable';
import StatCard from '../components/StatCard';
import clsx from 'clsx';

const demoDevices = [
  { id: '1', name: 'Core Switch 01', type: 'SWITCH', manufacturer: 'Cisco', model: 'Catalyst 9300', ipAddress: '10.0.0.1', location: 'Main Office - MDF', isOnline: true, uptimePct: 99.99, bandwidthIn: 450, bandwidthOut: 320 },
  { id: '2', name: 'Edge Firewall', type: 'FIREWALL', manufacturer: 'Palo Alto', model: 'PA-3260', ipAddress: '10.0.0.2', location: 'Main Office - MDF', isOnline: true, uptimePct: 99.95, bandwidthIn: 800, bandwidthOut: 600 },
  { id: '3', name: 'Office AP Floor 1', type: 'ACCESS_POINT', manufacturer: 'Ubiquiti', model: 'U6 Pro', ipAddress: '10.0.0.50', location: 'Main Office - Floor 1', isOnline: true, uptimePct: 98.5, bandwidthIn: 120, bandwidthOut: 85 },
  { id: '4', name: 'Office AP Floor 2', type: 'ACCESS_POINT', manufacturer: 'Ubiquiti', model: 'U6 Pro', ipAddress: '10.0.0.51', location: 'Main Office - Floor 2', isOnline: false, uptimePct: 45.0, bandwidthIn: 0, bandwidthOut: 0 },
  { id: '5', name: 'VPN Gateway', type: 'VPN_GATEWAY', manufacturer: 'Cisco', model: 'ASA 5525-X', ipAddress: '10.0.0.3', location: 'Main Office - MDF', isOnline: true, uptimePct: 99.8, bandwidthIn: 200, bandwidthOut: 180 },
];

export default function NetworkManagement() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const filtered = demoDevices.filter((d) => {
    if (search && !`${d.name} ${d.ipAddress}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter && d.type !== typeFilter) return false;
    return true;
  });

  const online = demoDevices.filter(d => d.isOnline).length;
  const offline = demoDevices.filter(d => !d.isOnline).length;
  const avgUptime = (demoDevices.reduce((s, d) => s + d.uptimePct, 0) / demoDevices.length).toFixed(1);

  const typeIcon = (type: string) => {
    switch (type) {
      case 'SWITCH': return <Network size={14} />;
      case 'FIREWALL': return <Shield size={14} />;
      case 'ACCESS_POINT': return <Wifi size={14} />;
      case 'VPN_GATEWAY': return <Radio size={14} />;
      default: return <Network size={14} />;
    }
  };

  const columns = [
    {
      key: 'name', header: 'Device',
      render: (d: any) => (
        <div className="flex items-center gap-2">
          <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', d.isOnline ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400')}>
            {typeIcon(d.type)}
          </div>
          <div>
            <span className="font-medium text-slate-200">{d.name}</span>
            <div className="text-xs text-slate-500">{d.manufacturer} {d.model}</div>
          </div>
        </div>
      ),
    },
    { key: 'type', header: 'Type', render: (d: any) => <span className="badge badge-info">{d.type.replace('_', ' ')}</span> },
    { key: 'ipAddress', header: 'IP Address', render: (d: any) => <span className="font-mono text-xs text-slate-400">{d.ipAddress}</span> },
    { key: 'location', header: 'Location' },
    {
      key: 'uptimePct', header: 'Uptime',
      render: (d: any) => <span className={d.uptimePct >= 99 ? 'text-emerald-400' : d.uptimePct >= 90 ? 'text-yellow-400' : 'text-red-400'}>{d.uptimePct}%</span>,
    },
    {
      key: 'bandwidth', header: 'Bandwidth (In/Out)',
      render: (d: any) => <span className="text-slate-400 text-xs">{d.bandwidthIn} / {d.bandwidthOut} Mbps</span>,
    },
    {
      key: 'isOnline', header: 'Status',
      render: (d: any) => (
        <div className="flex items-center gap-1.5">
          <div className={clsx('w-2 h-2 rounded-full', d.isOnline ? 'bg-emerald-400' : 'bg-red-400')} />
          <span className={d.isOnline ? 'text-emerald-400' : 'text-red-400'}>{d.isOnline ? 'Online' : 'Offline'}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Network Management</h1>
        <p className="text-sm text-slate-500 mt-1">Monitor switches, firewalls, access points, and VPN gateways</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Devices" value={demoDevices.length} icon={Network} color="blue" />
        <StatCard label="Online" value={online} icon={Wifi} color="green" />
        <StatCard label="Offline / Degraded" value={offline} icon={AlertTriangle} color={offline > 0 ? 'red' : 'green'} />
        <StatCard label="Average Uptime" value={`${avgUptime}%`} icon={Radio} color="blue" />
      </div>

      {offline > 0 && (
        <div className="card border-red-800/50 bg-red-900/10">
          <div className="flex items-center gap-2 text-red-300">
            <AlertTriangle size={18} />
            <span className="font-medium text-sm">{offline} device(s) offline</span>
          </div>
          <div className="mt-2 space-y-1">
            {demoDevices.filter(d => !d.isOnline).map(d => (
              <p key={d.id} className="text-sm text-slate-400">• {d.name} ({d.ipAddress}) — {d.location}</p>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-surface-850 rounded-lg px-3 py-2 flex-1 max-w-xs">
          <Search size={16} className="text-slate-500" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search devices..." className="bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none flex-1" />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input text-sm">
          <option value="">All Types</option>
          <option value="SWITCH">Switches</option>
          <option value="FIREWALL">Firewalls</option>
          <option value="ACCESS_POINT">Access Points</option>
          <option value="VPN_GATEWAY">VPN Gateways</option>
        </select>
      </div>

      <DataTable columns={columns} data={filtered as any} />
    </div>
  );
}
