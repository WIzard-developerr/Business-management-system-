import React, { useState, useEffect } from 'react';
import { 
  Building2, LayoutDashboard, Users, FileSpreadsheet, Package, 
  TrendingUp, Contact, FolderGit2, History, Settings, LogOut, 
  Search, Bell, Sparkles, Sliders, Menu, X, Cloud
} from 'lucide-react';

// Modular Component imports
import { LoginScreen } from './components/LoginScreen.js';
import { DashboardTab } from './components/DashboardTab.js';
import { CrmTab } from './components/CrmTab.js';
import { SalesTab } from './components/SalesTab.js';
import { InventoryTab } from './components/InventoryTab.js';
import { FinanceTab } from './components/FinanceTab.js';
import { HrTab } from './components/HrTab.js';
import { ProjectsTab } from './components/ProjectsTab.js';
import { SettingsTab } from './components/SettingsTab.js';
import { AuditTab } from './components/AuditTab.js';
import { WorkspaceTab } from './components/WorkspaceTab.js';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
}

interface Tenant {
  id: string;
  name: string;
  industry: string;
  currency: string;
  taxRate: number;
}

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('bms_token'));
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(!!token);

  // Layout states
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileSidebar, setMobileSidebar] = useState(false);

  // Global search triggers
  const [globalQuery, setGlobalQuery] = useState('');
  const [globalResults, setGlobalResults] = useState<{
    clients: any[];
    products: any[];
    projects: any[];
    invoices: any[];
  } | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);

  useEffect(() => {
    if (token) {
      localStorage.setItem('bms_token', token);
      verifySession();
    } else {
      localStorage.removeItem('bms_token');
      setUser(null);
      setTenant(null);
      setLoading(false);
    }
  }, [token]);

  const verifySession = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error('Verification failed.');
      }
      const data = await res.json();
      setUser(data.user);
      setTenant(data.tenant);
    } catch {
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (userToken: string, userDetails: User, tenantDetails: Tenant) => {
    setUser(userDetails);
    setTenant(tenantDetails);
    setToken(userToken);
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('bms_token');
    setActiveTab('dashboard');
  };

  // Perform Real Global Search API across models
  const triggerGlobalSearch = async (val: string) => {
    setGlobalQuery(val);
    if (!val.trim()) {
      setGlobalResults(null);
      return;
    }

    try {
      const res = await fetch(`/api/global-search?query=${val}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setGlobalResults(data);
      setShowSearchResults(true);
    } catch (e) {
      console.error('Failed to trigger global enterprise queries: ', e);
    }
  };

  const focusMatchedItem = (tab: string) => {
    setActiveTab(tab);
    setGlobalQuery('');
    setGlobalResults(null);
    setShowSearchResults(false);
  };

  // Synchronise settings back to client context on modifications
  const handleUpdateTenantState = (taxRate: number, currency: string) => {
    if (tenant) {
      setTenant({ ...tenant, taxRate, currency });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center font-sans space-y-4">
        <div id="app-bootstrap-loader" className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-500">Securing workspace cryptographic connections...</p>
      </div>
    );
  }

  if (!token || !user || !tenant) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // RBAC Gating sidebar listings
  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'crm', label: 'CRM', icon: Users, roles: ['Admin', 'Manager', 'Super_Admin'] },
    { id: 'sales', label: 'Sales & Billing', icon: FileSpreadsheet, roles: ['Admin', 'Accountant', 'Super_Admin'] },
    { id: 'products', label: 'Inventory', icon: Package, roles: ['Admin', 'Manager', 'Super_Admin'] },
    { id: 'finance', label: 'Finance & Ledger', icon: TrendingUp, roles: ['Admin', 'Accountant', 'Super_Admin'] },
    { id: 'hr', label: 'Human Resources', icon: Contact, roles: ['Admin', 'Manager', 'Accountant', 'Super_Admin'] },
    { id: 'projects', label: 'Projects & Tasks', icon: FolderGit2 },
    { id: 'workspace', label: 'Google Workspace', icon: Cloud },
    { id: 'audit', label: 'Audit Trail', icon: History, roles: ['Admin', 'Super_Admin'] },
    { id: 'settings', label: 'Administration', icon: Settings, roles: ['Admin', 'Super_Admin'] }
  ];

  const sidebarTabsToRender = navigationItems.filter(
    item => !item.roles || item.roles.includes(user.role)
  );

  return (
    <div id="bms-workspace-container" className="min-h-screen bg-slate-50 flex flex-col font-sans select-none text-slate-900">
      
      {/* Upper Horizontal Quick Actions & Brand Header */}
      <header className="bg-white border-b border-slate-200 h-16 shrink-0 flex items-center justify-between px-6 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center space-x-3">
          <button 
            id="mobile-menu-toggle" 
            onClick={() => setMobileSidebar(!mobileSidebar)}
            className="md:hidden text-slate-500 hover:text-slate-900 focus:outline-none p-1.5 rounded-lg hover:bg-slate-100"
          >
            {mobileSidebar ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          
          <div className="flex items-center space-x-2.5 text-blue-600">
            <div className="bg-blue-600 rounded-lg p-1.5 text-white shadow-sm shadow-blue-100 flex items-center justify-center">
              <Building2 className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-sm md:text-md">{tenant.name}</span>
              <p className="text-[9px] text-slate-400 font-bold font-mono tracking-wider uppercase leading-none">{tenant.industry}</p>
            </div>
          </div>
        </div>

        {/* Global Search form input with popping absolute panels */}
        <div className="relative flex-1 max-w-md mx-6 hidden sm:block">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            id="global-search-query"
            type="text"
            value={globalQuery}
            onChange={(e) => triggerGlobalSearch(e.target.value)}
            className="block w-full pl-10 pr-3.5 py-1.5 bg-slate-100/80 border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-150"
            placeholder="Search anything (Invoices, clients, products, roadmaps...)"
          />

          {/* Real Global search result panel */}
          {showSearchResults && globalResults && (
            <div id="global-search-results" className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 shadow-2xl rounded-xl z-50 max-h-96 overflow-y-auto p-4 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-400">GLOBAL SEARCH FINDER</span>
                <button className="text-[10px] text-slate-500 hover:text-blue-600 font-bold" onClick={() => setShowSearchResults(false)}>Clear</button>
              </div>

              {/* Invoices */}
              {globalResults.invoices.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Invoices Mapped</p>
                  {globalResults.invoices.map((inv: any) => (
                    <button 
                      key={inv.id} 
                      onClick={() => focusMatchedItem('sales')}
                      className="w-full text-left py-1 px-2 rounded hover:bg-slate-50 text-xs font-semibold flex justify-between"
                    >
                      <span className="text-blue-600">{inv.invoiceNumber}</span>
                      <span className="text-slate-500">{inv.clientName}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Clients */}
              {globalResults.clients.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">CRM contacts</p>
                  {globalResults.clients.map((c: any) => (
                    <button 
                      key={c.id} 
                      onClick={() => focusMatchedItem('crm')}
                      className="w-full text-left py-1 px-2 rounded hover:bg-slate-50 text-xs font-semibold flex justify-between"
                    >
                      <span className="text-slate-800">{c.name}</span>
                      <span className="text-slate-400">{c.companyName}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Products */}
              {globalResults.products.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Merchandise catalog SKUs</p>
                  {globalResults.products.map((p: any) => (
                    <button 
                      key={p.id} 
                      onClick={() => focusMatchedItem('products')}
                      className="w-full text-left py-1 px-2 rounded hover:bg-slate-50 text-xs font-semibold flex justify-between"
                    >
                      <span className="text-slate-800">{p.name} ({p.sku})</span>
                      <span className="text-slate-500">Stock: {p.stockQty}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Projects */}
              {globalResults.projects.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Project roadmaps</p>
                  {globalResults.projects.map((p: any) => (
                    <button 
                      key={p.id} 
                      onClick={() => focusMatchedItem('projects')}
                      className="w-full text-left py-1 px-2 rounded hover:bg-slate-50 text-xs font-semibold flex justify-between"
                    >
                      <span>{p.name}</span>
                      <span className="text-blue-600 font-mono">{p.progress}% done</span>
                    </button>
                  ))}
                </div>
              )}

              {Object.values(globalResults).every(arr => (arr as any[]).length === 0) && (
                <p className="text-center text-xs text-slate-400 py-4">No matching business node indexes resolved.</p>
              )}
            </div>
          )}
        </div>
 
        <div className="flex items-center space-x-4">
          {/* Quick Notification indicator */}
          <div className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500 cursor-pointer hidden sm:block relative">
            <Bell className="h-4 w-4" />
            <span className="absolute h-1.5 w-1.5 rounded-full bg-rose-500 top-1.5 right-1.5 animate-ping"></span>
          </div>

          <div className="flex items-center space-x-3 border-l border-slate-200 pl-4">
            <div className="hidden md:block text-right">
              <span className="text-xs font-bold text-slate-900 block">{user.name}</span>
              <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-wider select-none font-mono">
                {user.role}
              </span>
            </div>
            <button
              id="logout-btn"
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition cursor-pointer"
              title="Logout Session"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main split: Sidebar vs workspace Viewport */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        
        {/* Left Desktop Sidebar - Styled Dark Premium inspired by Design HTML */}
        <aside className="w-64 bg-slate-900 text-slate-300 shrink-0 hidden md:flex flex-col justify-between py-6">
          <div className="px-4 space-y-4">
            <div className="px-2 pb-4 border-b border-slate-800 flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white font-bold select-none text-md">
                {tenant.name.substring(0, 1).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <span className="text-sm font-bold text-white tracking-tight truncate block">{tenant.name}</span>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Enterprise Ops</p>
              </div>
            </div>

            <span className="text-[9px] font-extrabold text-slate-500 tracking-widest uppercase px-2 block">CORE FUNCTIONS</span>
            <div className="space-y-1">
              {sidebarTabsToRender.map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    id={`sidebar-tab-${tab.id}`}
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMobileSidebar(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${isActive ? 'bg-slate-800 text-white shadow-sm border border-slate-700/50' : 'text-slate-400 hover:text-white hover:bg-slate-800/40'}`}
                  >
                    <TabIcon className={`h-4.5 w-4.5 shrink-0 transition-colors ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-6 flex items-center justify-between text-slate-600 text-[9px] font-mono border-t border-slate-800 pt-4">
            <span>ERP INTEGRITY CHECK</span>
            <span className="text-emerald-500 font-bold animate-pulse">● ONLINE</span>
          </div>
        </aside>

        {/* Left Mobile Sidebar overlay */}
        {mobileSidebar && (
          <aside className="md:hidden fixed inset-y-16 left-0 w-64 bg-slate-900 text-slate-300 border-r border-slate-800 shadow-2xl z-50 py-6 px-4 flex flex-col justify-between animate-slide-in">
            <div className="space-y-4">
              <span className="text-[9px] font-semibold text-slate-500 tracking-wider px-2 block">ERP CORE FUNCTIONS</span>
              <div className="space-y-1">
                {sidebarTabsToRender.map((tab) => {
                  const TabIcon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      id={`mobile-tab-${tab.id}`}
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setMobileSidebar(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${isActive ? 'bg-slate-800 text-white shadow-sm border border-slate-700/50' : 'text-slate-400 hover:text-white hover:bg-slate-800/40'}`}
                    >
                      <TabIcon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="p-3 text-slate-600 text-[10px] text-center border-t border-slate-800">
              Vault Sandbox Node Mapped
            </div>
          </aside>
        )}

        {/* Right main viewing canvas workflow viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 outline-none">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <DashboardTab token={token} companyCurrency={tenant.currency} onNavigateTab={setActiveTab} />
            )}
            {activeTab === 'crm' && (
              <CrmTab token={token} userRole={user.role} />
            )}
            {activeTab === 'sales' && (
              <SalesTab token={token} companyTaxRate={tenant.taxRate} companyCurrency={tenant.currency} />
            )}
            {activeTab === 'products' && (
              <InventoryTab token={token} userRole={user.role} companyCurrency={tenant.currency} />
            )}
            {activeTab === 'finance' && (
              <FinanceTab token={token} userRole={user.role} companyCurrency={tenant.currency} />
            )}
            {activeTab === 'hr' && (
              <HrTab token={token} userRole={user.role} companyCurrency={tenant.currency} />
            )}
            {activeTab === 'projects' && (
              <ProjectsTab token={token} />
            )}
            {activeTab === 'workspace' && (
              <WorkspaceTab />
            )}
            {activeTab === 'audit' && (
              <AuditTab token={token} />
            )}
            {activeTab === 'settings' && (
              <SettingsTab token={token} userRole={user.role} onUpdateCompanyConfigs={handleUpdateTenantState} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
