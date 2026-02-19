import React, { useState } from 'react';
import { Server, Cloud, HardDrive, Cpu, Search } from 'lucide-react';
import DataTable from '../components/DataTable';
import StatCard from '../components/StatCard';
import GaugeChart from '../components/GaugeChart';
import clsx from 'clsx';

const demoServers = [
  { id: '1', hostname: 'prod-web-01', ipAddress: '10.0.1.10', type: 'Web Server', os: 'Ubuntu 22.04', cpuCores: 8, ramGB: 32, cpuUsagePct: 45, ramUsagePct: 68, diskUsagePct: 42, environment: 'Production', cloudProvider: null, status: 'ONLINE' },
  { id: '2', hostname: 'prod-db-01', ipAddress: '10.0.1.20', type: 'Database', os: 'Ubuntu 22.04', cpuCores: 16, ramGB: 64, cpuUsagePct: 72, ramUsagePct: 85, diskUsagePct: 65, environment: 'Production', cloudProvider: null, status: 'ONLINE' },
  { id: '3', hostname: 'prod-api-01', ipAddress: '10.0.1.30', type: 'API Server', os: 'Ubuntu 22.04', cpuCores: 8, ramGB: 16, cpuUsagePct: 35, ramUsagePct: 55, diskUsagePct: 30, environment: 'Production', cloudProvider: null, status: 'ONLINE' },
  { id: '4', hostname: 'staging-web-01', ipAddress: '10.0.2.10', type: 'Web Server', os: 'Ubuntu 22.04', cpuCores: 4, ramGB: 8, cpuUsagePct: 15, ramUsagePct: 40, diskUsagePct: 25, environment: 'Staging', cloudProvider: null, status: 'ONLINE' },
  { id: '5', hostname: 'aws-worker-01', ipAddress: '172.31.1.50', type: 'Worker', os: 'Amazon Linux 2', cpuCores: 4, ramGB: 16, cpuUsagePct: 88, ramUsagePct: 72, diskUsagePct: 45, environment: 'Production', cloudProvider: 'AWS', status: 'ONLINE' },
  { id: '6', hostname: 'legacy-dc-01', ipAddress: '192.168.1.100', type: 'Domain Controller', os: 'Windows Server 2019', cpuCores: 4, ramGB: 16, cpuUsagePct: 25, ramUsagePct: 55, diskUsagePct: 70, environment: 'Production', cloudProvider: null, status: 'ONLINE' },
];

export default function Infrastructure() {
  const [search, setSearch] = useState('');
  const [envFilter, setEnvFilter] = useState('');

  const filtered = demoServers.filter((s) => {
    if (search && !`${s.hostname} ${s.ipAddress}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (envFilter && s.environment !== envFilter) return false;
    return true;
  });

  const onPrem = demoServers.filter(s => !s.cloudProvider).length;
  const cloud = demoServers.filter(s => s.cloudProvider).length;
  const avgCpu = Math.round(demoServers.reduce((s, srv) => s + srv.cpuUsagePct, 0) / demoServers.length);
  const avgRam = Math.round(demoServers.reduce((s, srv) => s + srv.ramUsagePct, 0) / demoServers.length);

  const columns = [
    {
      key: 'hostname', header: 'Server',
      render: (s: any) => (
        <div className="flex items-center gap-2">
          <div className={clsx('w-2 h-2 rounded-full', s.status === 'ONLINE' ? 'bg-emerald-400' : s.status === 'DEGRADED' ? 'bg-yellow-400' : 'bg-red-400')} />
          <div>
            <span className="font-medium text-slate-200">{s.hostname}</span>
            <div className="text-xs text-slate-500">{s.ipAddress} · {s.type}</div>
          </div>
        </div>
      ),
    },
    { key: 'os', header: 'OS' },
    { key: 'environment', header: 'Environment', render: (s: any) => <span className="badge badge-info">{s.environment}</span> },
    { key: 'cloudProvider', header: 'Platform', render: (s: any) => <span className="text-slate-400">{s.cloudProvider || 'On-Prem'}</span> },
    {
      key: 'cpuUsagePct', header: 'CPU',
      render: (s: any) => (
        <div className="flex items-center gap-2">
          <div className="w-12 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className={clsx('h-full rounded-full', s.cpuUsagePct > 80 ? 'bg-red-500' : s.cpuUsagePct > 60 ? 'bg-yellow-500' : 'bg-emerald-500')} style={{ width: `${s.cpuUsagePct}%` }} />
          </div>
          <span className="text-xs text-slate-400">{s.cpuUsagePct}%</span>
        </div>
      ),
    },
    {
      key: 'ramUsagePct', header: 'Memory',
      render: (s: any) => (
        <div className="flex items-center gap-2">
          <div className="w-12 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className={clsx('h-full rounded-full', s.ramUsagePct > 80 ? 'bg-red-500' : s.ramUsagePct > 60 ? 'bg-yellow-500' : 'bg-emerald-500')} style={{ width: `${s.ramUsagePct}%` }} />
          </div>
          <span className="text-xs text-slate-400">{s.ramUsagePct}%</span>
        </div>
      ),
    },
    {
      key: 'diskUsagePct', header: 'Disk',
      render: (s: any) => (
        <div className="flex items-center gap-2">
          <div className="w-12 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className={clsx('h-full rounded-full', s.diskUsagePct > 80 ? 'bg-red-500' : s.diskUsagePct > 60 ? 'bg-yellow-500' : 'bg-emerald-500')} style={{ width: `${s.diskUsagePct}%` }} />
          </div>
          <span className="text-xs text-slate-400">{s.diskUsagePct}%</span>
        </div>
      ),
    },
    {
      key: 'status', header: 'Status',
      render: (s: any) => <span className={clsx('badge', s.status === 'ONLINE' ? 'badge-low' : s.status === 'DEGRADED' ? 'badge-medium' : 'badge-high')}>{s.status}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">On-Prem / Hybrid Infrastructure</h1>
        <p className="text-sm text-slate-500 mt-1">Monitor servers, VMs, and cloud workloads</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Servers" value={demoServers.length} icon={Server} color="blue" />
        <StatCard label="On-Premise" value={onPrem} icon={HardDrive} color="purple" />
        <StatCard label="Cloud Workloads" value={cloud} icon={Cloud} color="green" />
        <StatCard label="Average CPU" value={`${avgCpu}%`} icon={Cpu} color={avgCpu > 70 ? 'red' : 'blue'} />
      </div>

      {/* Resource Gauges */}
      <div className="card">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Average Resource Utilization</h3>
        <div className="flex justify-around">
          <GaugeChart value={avgCpu} label="CPU" />
          <GaugeChart value={avgRam} label="Memory" />
          <GaugeChart value={Math.round(demoServers.reduce((s, srv) => s + srv.diskUsagePct, 0) / demoServers.length)} label="Disk" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-surface-850 rounded-lg px-3 py-2 flex-1 max-w-xs">
          <Search size={16} className="text-slate-500" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search servers..." className="bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none flex-1" />
        </div>
        <select value={envFilter} onChange={(e) => setEnvFilter(e.target.value)} className="input text-sm">
          <option value="">All Environments</option>
          <option value="Production">Production</option>
          <option value="Staging">Staging</option>
          <option value="Development">Development</option>
        </select>
      </div>

      <DataTable columns={columns} data={filtered as any} />
    </div>
  );
}
