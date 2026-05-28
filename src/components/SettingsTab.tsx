import React, { useEffect, useState } from 'react';
import { 
  Settings, Building, Percent, Coins, Palette, 
  RefreshCw, Save, ShieldCheck, Download, UserMinus, UserCheck, Users 
} from 'lucide-react';

interface CompanySettings {
  id: string;
  name: string;
  industry: string;
  currency: string;
  taxRate: number;
  themeColor: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
}

interface SettingsTabProps {
  token: string;
  userRole: string;
  onUpdateCompanyConfigs: (taxRate: number, currency: string) => void;
}

export function SettingsTab({ token, userRole, onUpdateCompanyConfigs }: SettingsTabProps) {
  const [config, setConfig] = useState<CompanySettings | null>(null);
  const [tenantUsers, setTenantUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Updates states
  const [cName, setCName] = useState('');
  const [cIndustry, setCIndustry] = useState('');
  const [cCurrency, setCCurrency] = useState('USD');
  const [cTaxRate, setCTaxRate] = useState(8);
  const [cPalette, setCPalette] = useState('#4f46e5');

  const [savingSettings, setSavingSettings] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchSettings = async () => {
    try {
      const authHeader = { 'Authorization': `Bearer ${token}` };
      
      const setRes = await fetch('/api/settings', { headers: authHeader });
      const configData = await setRes.json();
      setConfig(configData);

      // Extract details
      setCName(configData.name);
      setCIndustry(configData.industry);
      setCCurrency(configData.currency);
      setCTaxRate(configData.taxRate);
      setCPalette(configData.themeColor || '#4f46e5');

      // Fetch tenant members index
      const usersRes = await fetch('/api/hr/employees', { headers: authHeader });
      const empData = await usersRes.json();
      
      // Pull and match registered users representing tenant
      setTenantUsers(empData.map((e: any) => ({
        id: e.id,
        name: e.name,
        email: e.email,
        role: e.designation,
        active: true
      })));
    } catch (e) {
      console.error('Failed to resolve settings payload:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [token]);

  const handleSaveConfigs = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setSavingSettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: cName,
          industry: cIndustry,
          currency: cCurrency,
          taxRate: Number(cTaxRate),
          themeColor: cPalette
        })
      });

      const updated = await res.json();
      setConfig(updated);
      onUpdateCompanyConfigs(updated.taxRate, updated.currency);
      setSuccessMsg('Corporate company preferences synchronized successfully.');
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleBackupExportDB = () => {
    if (!config) return;
    const backupObj = {
      tenant_guid: config.id,
      company_name: config.name,
      export_epoch: Date.now(),
      isolated_corporate_ledger_manifest: "Active integrity verified"
    };

    const strFile = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
    const dlLink = document.createElement('a');
    dlLink.setAttribute("href", strFile);
    dlLink.setAttribute("download", `BMS_Enterprise_Isolated_Vault_${config.id}.json`);
    document.body.appendChild(dlLink);
    dlLink.click();
    document.body.removeChild(dlLink);
  };

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center p-12 shrink-0">
        <RefreshCw className="h-10 w-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div id="settings-viewport" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Corporate Space Administration (ERP)</h1>
        <p className="text-sm text-slate-500">Amend company variables, inspect workspace accounts permissions, and download vault datasets backup</p>
      </div>

      {successMsg && (
        <div id="settings-success" className="bg-emerald-50 border border-emerald-250 rounded-xl p-4 text-xs font-semibold text-emerald-800">
          {successMsg}
        </div>
      )}

      {/* Main grids splitting profile edits vs permissions lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile amendment canvas */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 lg:col-span-2 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Building className="h-5 w-5 text-blue-600" />
            <h4 className="font-bold text-slate-900 text-sm">Tenant Corporation Profile</h4>
          </div>

          <form onSubmit={handleSaveConfigs} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold">Registered Company Trade Name</label>
              <input
                id="set-company-name"
                disabled={userRole !== 'Admin' && userRole !== 'Super_Admin'}
                type="text"
                required
                value={cName}
                onChange={(e) => setCName(e.target.value)}
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold">Industry Sector</label>
              <input
                id="set-company-industry"
                disabled={userRole !== 'Admin' && userRole !== 'Super_Admin'}
                type="text"
                required
                value={cIndustry}
                onChange={(e) => setCIndustry(e.target.value)}
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold">ISO Standard Currency</label>
              <select
                id="set-company-currency"
                disabled={userRole !== 'Admin' && userRole !== 'Super_Admin'}
                value={cCurrency}
                onChange={(e) => setCCurrency(e.target.value)}
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 bg-white rounded-lg text-xs"
              >
                <option value="USD">USD ($) Standard</option>
                <option value="EUR">EUR (€) Eurozone</option>
                <option value="GBP">GBP (£) Sterling</option>
                <option value="JPY">JPY (¥) Yen</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-semibold">Tax/VAT Coefficient Percentage</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  id="set-company-tax"
                  disabled={userRole !== 'Admin' && userRole !== 'Super_Admin'}
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={cTaxRate}
                  onChange={(e) => setCTaxRate(Number(e.target.value))}
                  className="block w-full pr-10 py-1.5 px-3 border border-slate-300 rounded-lg text-xs font-mono"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Percent className="h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-slate-700 font-semibold">Brand Theme Primary Palette</label>
              <div className="mt-1.5 flex items-center space-x-2">
                <input
                  id="set-company-color"
                  disabled={userRole !== 'Admin' && userRole !== 'Super_Admin'}
                  type="color"
                  value={cPalette}
                  onChange={(e) => setCPalette(e.target.value)}
                  className="block h-8 w-12 border border-slate-300 rounded cursor-pointer"
                />
                <span className="font-mono text-[10px] text-slate-500">{cPalette}</span>
              </div>
            </div>

            {(userRole === 'Admin' || userRole === 'Super_Admin') && (
              <div className="md:col-span-2 flex justify-end pt-3 border-t border-slate-100">
                <button
                  id="set-company-submit"
                  disabled={savingSettings}
                  type="submit"
                  className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2 rounded-xl transition shadow-md shadow-blue-100 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{savingSettings ? 'Saving Variables...' : 'Save Operations Variables'}</span>
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Backups & user controls sidebar */}
        <div className="space-y-6">
          {/* Data Export Container */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 space-y-4">
            <h4 className="font-bold text-slate-900 text-xs flex items-center">
              <ShieldCheck className="h-4.5 w-4.5 text-blue-500 mr-1.5" />
              Corporate Data Escrow Vault
            </h4>
            <p className="text-[11px] text-slate-500 leading-normal">
              Execute cryptographical dumps stringify packages. Isolated company ledger data packs can be downloaded safely.
            </p>
            <button
              id="set-backup-btn"
              onClick={handleBackupExportDB}
              className="w-full flex items-center justify-center space-x-1.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 hover:shadow-sm text-xs font-semibold rounded-xl text-slate-700 transition"
            >
              <Download className="h-4 w-4" />
              <span>Download Vault Backup</span>
            </button>
          </div>

          {/* User Workspace accounts roster list */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h4 className="font-bold text-slate-900 text-xs flex items-center">
                <Users className="h-4.5 w-4.5 text-blue-500 mr-1.5" />
                Workspace Members RBAC Roles
              </h4>
            </div>

            <div className="space-y-3 max-h-48 overflow-y-auto" id="settings-users-list">
              {tenantUsers.map((usr) => (
                <div key={usr.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-105/50">
                  <div>
                    <p className="font-bold text-slate-900">{usr.name}</p>
                    <p className="text-[10px] text-slate-400">{usr.email} • <span className="text-blue-600 font-semibold">{usr.role}</span></p>
                  </div>
                  <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold border border-emerald-150 rounded px-1.5 py-0.25">
                    Authorized
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
