import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore, useThemeStore, useSidebarStore, isStaff, isAdmin } from '../store';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import {
  LayoutDashboard, Cloud, Users, Monitor, ShieldCheck, Server,
  Network, ShoppingCart, KeyRound, Database, Headphones, Zap,
  BarChart3, Settings, Menu, Sun, Moon, Bell, Search,
  LogOut, MessageSquare, ChevronLeft, X, HelpCircle
} from 'lucide-react';
import clsx from 'clsx';
import AIChatSidebar from './AIChatSidebar';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  roles?: string[];
  shortcut?: string;
}

const navItems: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, shortcut: 'Alt+D' },
  { path: '/saas', label: 'SaaS Management', icon: Cloud, shortcut: 'Alt+S' },
  { path: '/identity', label: 'Identity & Access', icon: Users, shortcut: 'Alt+I' },
  { path: '/assets', label: 'Assets', icon: Monitor, shortcut: 'Alt+A' },
  { path: '/security', label: 'Security & Compliance', icon: ShieldCheck, shortcut: 'Alt+E' },
  { path: '/infrastructure', label: 'On-Prem / Hybrid', icon: Server },
  { path: '/network', label: 'Network', icon: Network, shortcut: 'Alt+N' },
  { path: '/procurement', label: 'Procurement', icon: ShoppingCart },
  { path: '/passwords', label: 'Password Management', icon: KeyRound, roles: ['ADMIN', 'IT_STAFF'] },
  { path: '/retention', label: 'Data Retention', icon: Database, roles: ['ADMIN'] },
  { path: '/tickets', label: 'Help Desk', icon: Headphones, shortcut: 'Alt+T' },
  { path: '/workflows', label: 'AI Automation', icon: Zap, shortcut: 'Alt+W' },
  { path: '/reports', label: 'Reports', icon: BarChart3, shortcut: 'Alt+R' },
  { path: '/settings', label: 'Settings', icon: Settings, roles: ['ADMIN'] },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const { isDark, toggle: toggleTheme } = useThemeStore();
  const { isCollapsed, toggleCollapse } = useSidebarStore();
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  useKeyboardShortcuts();

  useEffect(() => {
    const handler = () => setAiChatOpen((p) => !p);
    window.addEventListener('toggle-ai-chat', handler);
    return () => window.removeEventListener('toggle-ai-chat', handler);
  }, []);

  // Apply theme on mount
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.classList.toggle('light', !isDark);
  }, [isDark]);

  const filteredNav = navItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role || '');
  });

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        'fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-surface-900 dark:bg-surface-900 light:bg-white border-r border-slate-800 dark:border-slate-800 light:border-slate-200 transition-all duration-200',
        isCollapsed ? 'w-16' : 'w-64',
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className={clsx('flex items-center h-16 px-4 border-b border-slate-800', isCollapsed && 'justify-center')}>
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center font-bold text-white text-sm">U</div>
              <span className="text-lg font-semibold text-white">UnifyIT</span>
            </div>
          )}
          {isCollapsed && (
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center font-bold text-white text-sm">U</div>
          )}
          <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden ml-auto text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {filteredNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5',
                isActive
                  ? 'bg-brand-600/20 text-brand-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50',
                isCollapsed && 'justify-center px-2'
              )}
              title={isCollapsed ? `${item.label}${item.shortcut ? ` (${item.shortcut})` : ''}` : undefined}
            >
              <item.icon size={20} />
              {!isCollapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {item.shortcut && <span className="text-[10px] text-slate-600">{item.shortcut.replace('Alt+', '⌥')}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle */}
        <div className="hidden lg:block p-2 border-t border-slate-800">
          <button onClick={toggleCollapse} className="w-full flex items-center justify-center py-2 text-slate-500 hover:text-slate-300 transition-colors">
            <ChevronLeft size={18} className={clsx('transition-transform', isCollapsed && 'rotate-180')} />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-slate-800 dark:border-slate-800 bg-surface-900 dark:bg-surface-900 light:bg-white light:border-slate-200">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden text-slate-400 hover:text-white">
              <Menu size={22} />
            </button>

            {/* Search */}
            <div className="hidden sm:flex items-center gap-2 bg-surface-850 dark:bg-surface-850 light:bg-slate-100 rounded-lg px-3 py-2 w-72">
              <Search size={16} className="text-slate-500" />
              <input
                type="text"
                placeholder="Search anything... (Alt+K for AI)"
                className="bg-transparent text-sm text-slate-300 dark:text-slate-300 light:text-slate-700 placeholder-slate-500 outline-none flex-1"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* AI Chat toggle */}
            <button
              onClick={() => setAiChatOpen(!aiChatOpen)}
              className={clsx(
                'p-2 rounded-lg transition-colors',
                aiChatOpen ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )}
              title="AI Assistant (Alt+K)"
            >
              <MessageSquare size={20} />
            </button>

            {/* Theme toggle */}
            <button onClick={toggleTheme} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Toggle theme">
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Notifications */}
            <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors relative" title="Notifications">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* Help */}
            <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Help & shortcuts">
              <HelpCircle size={20} />
            </button>

            {/* User menu */}
            <div className="flex items-center gap-2 ml-2 pl-3 border-l border-slate-700">
              <div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center text-sm font-medium text-white">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div className="hidden md:block">
                <div className="text-sm font-medium text-slate-200">{user?.firstName} {user?.lastName}</div>
                <div className="text-xs text-slate-500">{user?.role?.replace('_', ' ')}</div>
              </div>
              <button onClick={() => { logout(); navigate('/login'); }} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors" title="Sign out">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-surface-950 dark:bg-surface-950 light:bg-slate-50">
          <div className="p-4 lg:p-6 max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* AI Chat Sidebar */}
      {aiChatOpen && <AIChatSidebar onClose={() => setAiChatOpen(false)} />}
    </div>
  );
}
