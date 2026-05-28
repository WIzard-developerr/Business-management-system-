import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, TrendingDown, ClipboardList, Package, 
  DollarSign, Activity, Sparkles, RefreshCw, Calendar, ArrowUpRight, ShieldAlert 
} from 'lucide-react';

interface Stats {
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  outstandingReceivables: number;
  lowStockThresholdCount: number;
  pendingTasks: number;
  overdueTasks: number;
  leadRatingCount: number;
  totalClients: number;
  activeProductsCount: number;
}

interface ChartPoint {
  month: string;
  income: number;
  expense: number;
}

interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  entity: string;
  entityId: string;
  timestamp: string;
}

interface DashboardTabProps {
  token: string;
  companyCurrency: string;
  onNavigateTab: (tab: string) => void;
}

export function DashboardTab({ token, companyCurrency, onNavigateTab }: DashboardTabProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const authHeader = { 'Authorization': `Bearer ${token}` };
      
      const statsRes = await fetch('/api/dashboard/stats', { headers: authHeader });
      const statsData = await statsRes.json();
      
      const chartRes = await fetch('/api/dashboard/charts', { headers: authHeader });
      const chartDataPayload = await chartRes.json();
      
      setStats(statsData);
      setChartData(chartDataPayload.monthlyTrend);
      setRecentLogs(chartDataPayload.recentActivity);
    } catch (e) {
      console.error('Failed to coordinate statistics updates:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center p-12 min-h-[50vh]">
        <div id="dashboard-loader" className="flex flex-col items-center space-y-4">
          <RefreshCw className="h-10 w-10 text-blue-600 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Assembling ERP Ledger Indexes...</p>
        </div>
      </div>
    );
  }

  // Helper formatting currencies
  const formatVal = (v: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: companyCurrency || 'USD' }).format(v);
  };

  // Find max chart height for scaling
  const maxVal = Math.max(...chartData.map(d => Math.max(d.income, d.expense)), 1000) * 1.1;

  return (
    <div id="dashboard-viewport" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Executive Console</h1>
          <p className="text-sm text-slate-500">Real-time analytical summaries spanning across organization structures</p>
        </div>
        <button
          id="refresh-dashboard"
          onClick={fetchDashboardData}
          className="flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 border border-slate-200 bg-white shadow-sm hover:bg-slate-50 rounded-lg text-slate-700 transition"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Reload Ledger</span>
        </button>
      </div>

      {/* Primary KPIs Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* REVENUE */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Revenues</p>
              <h3 className="text-2xl font-bold text-slate-950 mt-1">{formatVal(stats.totalRevenue)}</h3>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-center space-x-1 text-xs text-emerald-600 font-semibold mt-4">
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>Cash inflows registered</span>
          </div>
          {/* Subtle Sparkline Background SVG */}
          <div className="absolute bottom-0 right-0 left-0 h-10 select-none pointer-events-none opacity-20">
            <svg viewBox="0 0 100 10" className="w-full h-full text-blue-600" preserveAspectRatio="none">
              <path d="M0,8 Q15,4 30,7 T60,2 T100,6 L100,10 L0,10 Z" fill="currentColor" stroke="currentColor" strokeWidth="0.5" />
            </svg>
          </div>
        </div>

        {/* EXPENSES */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Disbursed Expenses</p>
              <h3 className="text-2xl font-bold text-slate-950 mt-1">{formatVal(stats.totalExpense)}</h3>
            </div>
            <div className="p-2 bg-red-50 text-red-600 rounded-xl">
              <TrendingDown className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-center space-x-1 text-xs text-slate-500 mt-4">
            <Calendar className="h-3.5 w-3.5" />
            <span>Operational costs mapped</span>
          </div>
          <div className="absolute bottom-0 right-0 left-0 h-10 select-none pointer-events-none opacity-20">
            <svg viewBox="0 0 100 10" className="w-full h-full text-red-600" preserveAspectRatio="none">
              <path d="M0,9 Q20,3 40,8 T80,4 T100,9 L100,10 L0,10 Z" fill="currentColor" stroke="currentColor" strokeWidth="0.5" />
            </svg>
          </div>
        </div>

        {/* NET PROFIT */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Operating Profit</p>
              <h3 className={`text-2xl font-bold mt-1 ${stats.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatVal(stats.netProfit)}
              </h3>
            </div>
            <div className={`p-2 rounded-xl ${stats.netProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-center space-x-1 text-xs text-slate-500 mt-4">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Pre-tax ledger variance</span>
          </div>
          <div className="absolute bottom-0 right-0 left-0 h-10 select-none pointer-events-none opacity-20">
            <svg viewBox="0 0 100 10" className="w-full h-full text-emerald-600" preserveAspectRatio="none">
              <path d="M0,7 Q25,2 50,7 T100,1 L100,10 L0,10 Z" fill="currentColor" stroke="currentColor" strokeWidth="0.5" />
            </svg>
          </div>
        </div>

        {/* CRM/WORKLOAD ALERTS */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Critical Alarms</p>
              <h3 className="text-2xl font-bold text-slate-950 mt-1">
                {stats.lowStockThresholdCount + stats.pendingTasks}
              </h3>
            </div>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs mt-4">
            <button onClick={() => onNavigateTab('products')} className="text-amber-700 hover:underline font-semibold">
              {stats.lowStockThresholdCount} low stocks
            </button>
            <button onClick={() => onNavigateTab('projects')} className="text-blue-700 hover:underline font-semibold">
              {stats.pendingTasks} tasks pending
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Analytical Chart & Recent Activities Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Finances Operating Runway</h4>
              <p className="text-xs text-slate-500">Comparing gross cash collections against overhead expenditures</p>
            </div>
            <div className="flex items-center space-x-4 text-xs">
              <div className="flex items-center space-x-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600 inline-block"></span>
                <span className="text-slate-600">Revenues</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400 inline-block"></span>
                <span className="text-slate-600">Expenses</span>
              </div>
            </div>
          </div>

          {/* Handcraft bespoke custom SVG chart of extreme visual polish */}
          {chartData.length > 0 ? (
            <div className="relative h-64 w-full flex flex-col justify-between mt-4">
              {/* Coordinates lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none border-b border-l border-slate-200">
                {[0, 1, 2, 3].map((idx) => (
                  <div key={idx} className="w-full border-t border-slate-100 h-0 text-[10px] text-slate-400 pl-1" style={{ position: 'relative' }}>
                    <span className="absolute -left-12 -top-2.5 w-10 text-right">{formatVal((maxVal / 3) * (3 - idx)).split('.')[0]}</span>
                  </div>
                ))}
              </div>

              {/* Vector Bars representing monthly income and expense side-by-side */}
              <div className="relative h-full flex justify-around items-end pt-4 pb-1 pl-4">
                {chartData.map((d, index) => {
                  const incomeHeight = `${(d.income / maxVal) * 100}%`;
                  const expenseHeight = `${(d.expense / maxVal) * 100}%`;

                  return (
                    <div key={index} className="flex flex-col items-center space-y-2 w-1/5 group relative h-full justify-end">
                      <div className="flex items-end justify-center space-x-3 w-full h-full">
                        {/* Revenues Bar */}
                        <div 
                          className="w-4 bg-blue-600 rounded-t-sm group-hover:bg-blue-700 transition-all duration-300 relative"
                          style={{ height: incomeHeight }}
                        >
                          {/* Tooltip on Hover */}
                          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-20 font-mono">
                            Rev: {formatVal(d.income)}
                          </div>
                        </div>

                        {/* Expenses Bar */}
                        <div 
                          className="w-4 bg-red-400 rounded-t-sm group-hover:bg-red-500 transition-all duration-300 relative"
                          style={{ height: expenseHeight }}
                        >
                          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-20 font-mono">
                            Exp: {formatVal(d.expense)}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500">{d.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              Insufficient historical data for trend forecasting
            </div>
          )}
        </div>

        {/* Audit Trail Timeline Stream */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h4 className="font-bold text-slate-900 text-sm">System Audit Stream</h4>
            <p className="text-xs text-slate-500">Real-time immutable administrative trail logs</p>
          </div>

          <div id="audit-feed" className="flow-root overflow-y-auto max-h-[290px] pr-1 space-y-4">
            {recentLogs.length > 0 ? (
              <ul className="-mb-8">
                {recentLogs.map((log, logIdx) => (
                  <li key={log.id}>
                    <div className="relative pb-8">
                      {logIdx !== recentLogs.length - 1 ? (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200" aria-hidden="true" />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs shrink-0 ring-4 ring-white">
                            <Activity className="h-4 w-4" />
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 pt-1.5">
                          <p className="text-xs text-slate-800 font-semibold truncate">
                            {log.action} <span className="text-blue-600">by {log.userName}</span>
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{log.details}</p>
                          <div className="text-[10px] font-mono text-slate-400 mt-1">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                Audit ledger initialization completed. Awaiting user events tracing.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
