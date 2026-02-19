import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useThemeStore } from '../store';
import { Sun, Moon, Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, demoLogin } = useAuthStore();
  const { isDark, toggle: toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function handleDemoLogin(role: string) {
    demoLogin(role);
    navigate('/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950 dark:bg-surface-950 light:bg-slate-50 px-4">
      <div className="absolute top-4 right-4">
        <button onClick={toggleTheme} className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors">
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center font-bold text-white text-2xl mx-auto mb-4">U</div>
          <h1 className="text-3xl font-bold text-white dark:text-white light:text-slate-900">UnifyIT</h1>
          <p className="text-sm text-slate-500 mt-2">Unified IT Management Platform</p>
        </div>

        {/* Demo login — prominent, no backend needed */}
        <div className="card mb-4">
          <h2 className="text-lg font-semibold text-slate-200 mb-2">Try the Demo</h2>
          <p className="text-sm text-slate-500 mb-4">No account or server needed. Pick a role to explore:</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { role: 'admin', label: 'Admin', desc: 'Full access to everything', color: 'from-brand-600 to-brand-700' },
              { role: 'staff', label: 'IT Staff', desc: 'Technical operations', color: 'from-emerald-600 to-emerald-700' },
              { role: 'manager', label: 'Manager', desc: 'Approvals & oversight', color: 'from-purple-600 to-purple-700' },
              { role: 'readonly', label: 'Read Only', desc: 'View-only access', color: 'from-slate-600 to-slate-700' },
            ].map((acc) => (
              <button
                key={acc.role}
                onClick={() => handleDemoLogin(acc.role)}
                className={`p-3 bg-gradient-to-br ${acc.color} rounded-lg text-left hover:opacity-90 transition-opacity`}
              >
                <span className="text-sm font-semibold text-white">{acc.label}</span>
                <p className="text-[11px] text-white/70 mt-0.5">{acc.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Regular login form — secondary, for when backend is running */}
        <details className="group">
          <summary className="text-xs text-slate-600 text-center cursor-pointer hover:text-slate-400 transition-colors list-none">
            Or sign in with credentials (requires backend) ▾
          </summary>
          <div className="card mt-3">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input w-full" placeholder="you@company.com" required />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input w-full" placeholder="Enter your password" required />
              </div>
              {error && (
                <div className="text-sm p-2.5 rounded-lg bg-red-900/30 text-red-400">{error}</div>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading && <Loader2 size={16} className="animate-spin" />}
                Sign In
              </button>
            </form>
          </div>
        </details>
      </div>
    </div>
  );
}
