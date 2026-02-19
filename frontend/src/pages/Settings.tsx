import React, { useState } from 'react';
import { Settings as SettingsIcon, Key, Users, Bell, Shield, Plug, Search } from 'lucide-react';
import DataTable from '../components/DataTable';
import clsx from 'clsx';

const demoIntegrations = [
  { id: '1', name: 'Okta SSO', type: 'Identity Provider', isActive: true, lastSyncAt: '2026-02-19T10:00:00Z' },
  { id: '2', name: 'Anthropic (Claude AI)', type: 'AI Engine', isActive: true, lastSyncAt: null },
  { id: '3', name: 'Bitwarden', type: 'Password Manager', isActive: true, lastSyncAt: '2026-02-19T08:00:00Z' },
  { id: '4', name: 'Jira', type: 'Project Management', isActive: true, lastSyncAt: '2026-02-19T09:30:00Z' },
  { id: '5', name: 'Slack', type: 'Communication', isActive: true, lastSyncAt: '2026-02-19T09:45:00Z' },
  { id: '6', name: 'AWS', type: 'Cloud Provider', isActive: false, lastSyncAt: null },
  { id: '7', name: 'Azure AD', type: 'Directory Service', isActive: false, lastSyncAt: null },
  { id: '8', name: 'HaveIBeenPwned', type: 'Security', isActive: true, lastSyncAt: '2026-02-18T22:00:00Z' },
];

const demoAuditLog = [
  { id: '1', user: 'Alex Admin', action: 'LOGIN', resource: 'auth', createdAt: '2026-02-19T10:30:00Z' },
  { id: '2', user: 'Alex Admin', action: 'UPDATE', resource: 'integration', details: 'Updated Okta config', createdAt: '2026-02-19T10:15:00Z' },
  { id: '3', user: 'Sam Tech', action: 'CREATE', resource: 'ticket', details: 'Created ticket: VPN issue', createdAt: '2026-02-19T09:00:00Z' },
  { id: '4', user: 'Alex Admin', action: 'CHANGE_ROLE', resource: 'user', details: 'Changed Val to READ_ONLY', createdAt: '2026-02-18T16:00:00Z' },
  { id: '5', user: 'Sam Tech', action: 'RECLAIM_LICENSE', resource: 'saas_license', details: 'Reclaimed Notion license', createdAt: '2026-02-18T14:00:00Z' },
];

export default function Settings() {
  const [tab, setTab] = useState<'integrations' | 'users' | 'notifications' | 'audit'>('integrations');

  const tabs = [
    { key: 'integrations', label: 'Integrations', icon: Plug },
    { key: 'users', label: 'User Roles', icon: Users },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'audit', label: 'Audit Log', icon: Shield },
  ];

  const auditColumns = [
    { key: 'user', header: 'User', render: (a: any) => <span className="text-slate-200">{a.user}</span> },
    { key: 'action', header: 'Action', render: (a: any) => <span className="badge badge-info">{a.action}</span> },
    { key: 'resource', header: 'Resource' },
    { key: 'details', header: 'Details', render: (a: any) => <span className="text-slate-400 text-xs">{a.details || '-'}</span> },
    { key: 'createdAt', header: 'Time', render: (a: any) => <span className="text-slate-400 text-xs">{new Date(a.createdAt).toLocaleString()}</span> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage integrations, user roles, notifications, and audit trail</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-900 p-1 rounded-lg w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={clsx('flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors', tab === t.key ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white')}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Integrations */}
      {tab === 'integrations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {demoIntegrations.map((intg) => (
            <div key={intg.id} className="card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold', intg.isActive ? 'bg-brand-600/20 text-brand-400' : 'bg-slate-800 text-slate-500')}>
                  {intg.name[0]}
                </div>
                <div>
                  <h3 className="font-medium text-slate-200">{intg.name}</h3>
                  <p className="text-xs text-slate-500">{intg.type}</p>
                  {intg.lastSyncAt && <p className="text-[10px] text-slate-600">Last sync: {new Date(intg.lastSyncAt).toLocaleString()}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={clsx('w-2 h-2 rounded-full', intg.isActive ? 'bg-emerald-400' : 'bg-slate-600')} />
                <button className="btn-secondary text-xs py-1 px-3">{intg.isActive ? 'Configure' : 'Connect'}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* User Roles */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold text-slate-300 mb-4">Role Permissions</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left py-2 px-3 text-slate-500 font-medium">Feature</th>
                    <th className="text-center py-2 px-3 text-slate-500 font-medium">Admin</th>
                    <th className="text-center py-2 px-3 text-slate-500 font-medium">IT Staff</th>
                    <th className="text-center py-2 px-3 text-slate-500 font-medium">Manager</th>
                    <th className="text-center py-2 px-3 text-slate-500 font-medium">Read Only</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: 'View Dashboard', admin: true, staff: true, manager: true, readonly: true },
                    { feature: 'Manage SaaS Apps', admin: true, staff: true, manager: false, readonly: false },
                    { feature: 'Approve Access Requests', admin: true, staff: false, manager: true, readonly: false },
                    { feature: 'Manage Assets', admin: true, staff: true, manager: false, readonly: false },
                    { feature: 'View Security Alerts', admin: true, staff: true, manager: true, readonly: false },
                    { feature: 'Manage Workflows', admin: true, staff: true, manager: false, readonly: false },
                    { feature: 'View Reports', admin: true, staff: true, manager: true, readonly: true },
                    { feature: 'Manage Settings', admin: true, staff: false, manager: false, readonly: false },
                    { feature: 'View Audit Log', admin: true, staff: false, manager: false, readonly: false },
                    { feature: 'Approve Purchases', admin: true, staff: false, manager: true, readonly: false },
                  ].map((row) => (
                    <tr key={row.feature} className="border-b border-slate-800/50">
                      <td className="py-2 px-3 text-slate-300">{row.feature}</td>
                      {[row.admin, row.staff, row.manager, row.readonly].map((val, i) => (
                        <td key={i} className="text-center py-2 px-3">
                          <span className={val ? 'text-emerald-400' : 'text-slate-700'}>{val ? '✓' : '—'}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {tab === 'notifications' && (
        <div className="card">
          <h3 className="font-semibold text-slate-300 mb-4">Notification Preferences</h3>
          <div className="space-y-4">
            {[
              { label: 'Security Alerts', desc: 'Get notified about new security alerts', enabled: true },
              { label: 'Ticket Updates', desc: 'Notifications when your tickets are updated', enabled: true },
              { label: 'Approval Requests', desc: 'New access or purchase requests needing approval', enabled: true },
              { label: 'Workflow Completions', desc: 'When automated workflows finish running', enabled: false },
              { label: 'License Renewals', desc: 'Upcoming SaaS license renewals', enabled: true },
              { label: 'Asset Warranties', desc: 'Assets approaching warranty expiration', enabled: false },
            ].map((pref) => (
              <div key={pref.label} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                <div>
                  <span className="text-sm text-slate-200">{pref.label}</span>
                  <p className="text-xs text-slate-500">{pref.desc}</p>
                </div>
                <button className={clsx('w-11 h-6 rounded-full transition-colors relative', pref.enabled ? 'bg-brand-600' : 'bg-slate-700')}>
                  <div className={clsx('w-4 h-4 bg-white rounded-full absolute top-1 transition-transform', pref.enabled ? 'translate-x-6' : 'translate-x-1')} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit Log */}
      {tab === 'audit' && <DataTable columns={auditColumns} data={demoAuditLog as any} />}
    </div>
  );
}
