import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useThemeStore } from '../store';
import { Sun, Moon, Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('admin@unifyit.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const { login, register } = useAuthStore();
  const { isDark, toggle: toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await register({ email, password, firstName, lastName });
        setIsRegister(false);
        setError('Account created! Please sign in.');
      } else {
        await login(email, password);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  // Demo login shortcut
  function demoLogin(role: string) {
    const accounts: Record<string, { email: string; password: string }> = {
      admin: { email: 'admin@unifyit.com', password: 'admin123' },
      staff: { email: 'tech@unifyit.com', password: 'staff123' },
      manager: { email: 'manager@unifyit.com', password: 'staff123' },
      readonly: { email: 'viewer@unifyit.com', password: 'staff123' },
    };
    const acc = accounts[role];
    if (acc) {
      setEmail(acc.email);
      setPassword(acc.password);
    }
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

        {/* Form */}
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-200 mb-6">{isRegister ? 'Create Account' : 'Sign In'}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">First Name</label>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="input w-full" required />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Last Name</label>
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="input w-full" required />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm text-slate-400 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input w-full" placeholder="you@company.com" required />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input w-full" placeholder="Enter your password" required />
            </div>

            {error && (
              <div className={`text-sm p-2.5 rounded-lg ${error.includes('created') ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'}`}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button onClick={() => setIsRegister(!isRegister)} className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
              {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
            </button>
          </div>
        </div>

        {/* Demo accounts */}
        <div className="mt-6">
          <p className="text-xs text-slate-600 text-center mb-3">Quick login with demo accounts:</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { role: 'admin', label: 'Admin', desc: 'Full access to everything' },
              { role: 'staff', label: 'IT Staff', desc: 'Technical operations' },
              { role: 'manager', label: 'Manager', desc: 'Approvals & oversight' },
              { role: 'readonly', label: 'Read Only', desc: 'View-only access' },
            ].map((acc) => (
              <button
                key={acc.role}
                onClick={() => demoLogin(acc.role)}
                className="p-2.5 bg-surface-900 border border-slate-800 rounded-lg text-left hover:border-slate-700 transition-colors"
              >
                <span className="text-xs font-medium text-slate-300">{acc.label}</span>
                <p className="text-[10px] text-slate-600">{acc.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
