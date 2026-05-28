import React, { useState } from 'react';
import { ShieldCheck, User, Sparkles, Building2, KeyRound } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (token: string, user: any, tenant: any) => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Quick seed autofills for immediate BMS exploration
  const demoAccounts = [
    { label: 'Sarah Connor (Admin)', email: 'admin@bms.com', pass: 'admin123', color: 'from-blue-500 to-purple-600' },
    { label: 'Michael Scott (Accounting)', email: 'accountant@bms.com', pass: 'acc123', color: 'from-emerald-500 to-teal-600' },
    { label: 'Jim Halpert (Manager)', email: 'manager@bms.com', pass: 'mgr123', color: 'from-sky-500 to-cyan-600' },
    { label: 'Pam Beesly (Employee)', email: 'employee@bms.com', pass: 'emp123', color: 'from-amber-500 to-orange-600' }
  ];

  const handleDemoAuth = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    handleLogin(null, demoEmail, demoPass);
  };

  const handleLogin = async (e: React.FormEvent | null, customEmail?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const activeEmail = customEmail || email;
    const activePass = customPass || password;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: activeEmail, password: activePass })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication credentials failed.');
      }
      onLoginSuccess(data.token, data.user, data.tenant);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, industry, email, password, name })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed.');
      }
      onLoginSuccess(data.token, data.user, data.tenant);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login-container" className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-slate-900 font-sans">
          {isRegistering ? 'Register Your Company' : 'Business Management System'}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          {isRegistering ? 'Enterprise tenant isolation, dynamic workspaces' : 'Unified ERP & CRM Operations Console'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-slate-200 rounded-xl sm:px-10">
          {errorMsg && (
            <div id="auth-error" className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded-r-md text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          {!isRegistering ? (
            <form onSubmit={(e) => handleLogin(e)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700">Corporate Email Address</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="you@company.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Secret Password</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    id="login-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <button
                  id="submit-login"
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg text-white bg-blue-600 hover:bg-blue-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition shadow-md shadow-blue-100 disabled:opacity-50"
                >
                  {loading ? 'Authenticating Secures...' : 'Enter Console'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Company Name</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building2 className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    id="register-company"
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Stark Industries"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Industry Sector</label>
                <select
                  id="register-industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="mt-1 block w-full py-2 px-3 border border-slate-300 bg-white rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">Select industry...</option>
                  <option value="Technology">Technology & SaaS</option>
                  <option value="Consulting">Consulting & Finance</option>
                  <option value="Retail">Retail & E-commerce</option>
                  <option value="Manufacturing">Manufacturing & Logistics</option>
                  <option value="Healthcare">Healthcare & Biotech</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Administrator Name</label>
                <input
                  id="register-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full py-2 px-3 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Tony Stark"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Admin Email Address</label>
                <input
                  id="register-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full py-2 px-3 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="tony@stark.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Access Password</label>
                <input
                  id="register-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full py-2 px-3 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Password (minimum 6 charts)"
                />
              </div>

              <div>
                <button
                  id="submit-register"
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg text-white bg-blue-600 hover:bg-blue-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition shadow-md shadow-blue-100 disabled:opacity-50"
                >
                  {loading ? 'Creating workspace...' : 'Register Company & Log In'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              {isRegistering ? 'Already have a firm workspace?' : 'Want a dedicated environment?'}
            </span>
            <button
              id="switch-auth-mode"
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setErrorMsg('');
              }}
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              {isRegistering ? 'Back to Login' : 'Register Org Tenant'}
            </button>
          </div>
        </div>

        {/* Dynamic Seeding Fast-Login Panels */}
        {!isRegistering && (
          <div className="mt-8 bg-transparent max-w-sm mx-auto">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-slate-50 text-slate-500 font-medium">EXPLORE DEMO PROFILES</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {demoAccounts.map((acc, index) => (
                <button
                  id={`demo-auth-${index}`}
                  key={index}
                  onClick={() => handleDemoAuth(acc.email, acc.pass)}
                  className="flex items-center space-x-2 p-2.5 bg-white border border-slate-200 hover:border-blue-300 rounded-lg text-left hover:shadow-sm transition select-none group focus:outline-none"
                >
                  <div className={`p-1 rounded-md bg-gradient-to-br ${acc.color} text-white text-xs shrink-0`}>
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-blue-600">
                      {acc.label.split(' ')[0]}
                    </p>
                    <p className="text-[10px] text-slate-500">{acc.label.split(' (')[1].replace(')', '')}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
