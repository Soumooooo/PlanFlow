import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Kanban, CheckSquare, Sparkles, ArrowRight, ShieldCheck, Users, Zap, Eye, EyeOff } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) throw new Error('Please enter your full name');
        if (password.length < 6) throw new Error('Password must be at least 6 characters');
        await register(name.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setError(null);
    setEmail(demoEmail);
    setPassword('password123');
    setLoading(true);
    try {
      await login(demoEmail, 'password123');
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white shadow-md mb-4">
          <Kanban className="w-6 h-6" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
          PlanFlow
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Real-time collaborative project management for modern teams
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Quick Demo Switcher Card */}
        <div className="mb-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-900 mb-2">
            <Zap className="w-4 h-4 text-indigo-600" />
            <span>Quick 1-Click Demo Accounts:</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('alex@planflow.io')}
              disabled={loading}
              className="text-left p-2 rounded-xl bg-white border border-indigo-100 hover:border-indigo-300 hover:shadow-xs transition text-xs group"
            >
              <span className="font-semibold text-slate-800 block group-hover:text-indigo-600">Alex R.</span>
              <span className="text-[10px] text-slate-500 block truncate">Product Lead</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('sarah@planflow.io')}
              disabled={loading}
              className="text-left p-2 rounded-xl bg-white border border-indigo-100 hover:border-indigo-300 hover:shadow-xs transition text-xs group"
            >
              <span className="font-semibold text-slate-800 block group-hover:text-indigo-600">Sarah C.</span>
              <span className="text-[10px] text-slate-500 block truncate">Senior Dev</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('david@planflow.io')}
              disabled={loading}
              className="text-left p-2 rounded-xl bg-white border border-indigo-100 hover:border-indigo-300 hover:shadow-xs transition text-xs group"
            >
              <span className="font-semibold text-slate-800 block group-hover:text-indigo-600">David K.</span>
              <span className="text-[10px] text-slate-500 block truncate">UI Designer</span>
            </button>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200/80 rounded-2xl sm:px-8">
          <div className="flex border-b border-slate-100 mb-6">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setError(null);
              }}
              className={`flex-1 pb-3 text-sm font-semibold border-b-2 text-center transition ${
                !isRegister
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true);
                setError(null);
              }}
              className={`flex-1 pb-3 text-sm font-semibold border-b-2 text-center transition ${
                isRegister
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                {isRegister && (
                  <span className="text-[10px] text-slate-400">Min 6 characters</span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition"
            >
              {loading ? (
                <span>Loading...</span>
              ) : (
                <>
                  <span>{isRegister ? 'Create Account' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              SQLite & JWT Auth
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              Live Multi-User
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
