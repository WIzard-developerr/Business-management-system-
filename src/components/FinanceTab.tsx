import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Wallet, 
  BarChart3, RefreshCw, FileSpreadsheet, PlusCircle, CheckCircle, Search 
} from 'lucide-react';

interface Transaction {
  id: string;
  type: 'Income' | 'Expense';
  category: string;
  amount: number;
  date: string;
  reference: string;
  description: string;
}

interface Budget {
  id: string;
  category: string;
  limitAmount: number;
  spentAmount: number;
  year: number;
  month: number;
}

interface FinanceTabProps {
  token: string;
  userRole: string;
  companyCurrency: string;
}

export function FinanceTab({ token, userRole, companyCurrency }: FinanceTabProps) {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Creation forms toggles
  const [isAddingTx, setIsAddingTx] = useState(false);
  const [txType, setTxType] = useState<'Income' | 'Expense'>('Income');
  const [txCat, setTxCat] = useState('Consulting');
  const [txAmount, setTxAmount] = useState(100);
  const [txDate, setTxDate] = useState('');
  const [txRef, setTxRef] = useState('');
  const [txDesc, setTxDesc] = useState('');

  const [isAddingBudget, setIsAddingBudget] = useState(false);
  const [bCat, setBCat] = useState('Cloud Infrastructure');
  const [bLimit, setBLimit] = useState(1000);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchFinanceData = async () => {
    try {
      const res = await fetch('/api/finance/ledger', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setTxs(data.transactions);
      setBudgets(data.budgets);
    } catch (e) {
      console.error('Failed to coordinate finance records:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, [token]);

  const handleCreateTx = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!txCat || !txAmount || !txDate) {
      setErrorMsg('Category, Amount and Date are crucial fields.');
      return;
    }

    try {
      const res = await fetch('/api/finance/ledger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: txType,
          category: txCat,
          amount: Number(txAmount),
          date: txDate,
          reference: txRef,
          description: txDesc
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit transactional ledger entry.');

      setTxs([data, ...txs]);
      // Refetch budgets since spentAmount can increase dynamically with expense txn creation
      fetchFinanceData();
      setIsAddingTx(false);
      resetTxForm();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await fetch('/api/finance/budgets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          category: bCat,
          limitAmount: Number(bLimit),
          year: new Date().getFullYear(),
          month: new Date().getMonth() + 1
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to bind budget boundaries.');

      setBudgets([...budgets, data]);
      setIsAddingBudget(false);
      setBLimit(1000);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const resetTxForm = () => {
    setTxCat('Consulting');
    setTxAmount(100);
    setTxDate('');
    setTxRef('');
    setTxDesc('');
  };

  const handleExportCSV = () => {
    if (txs.length === 0) return;
    const headers = ['id', 'type', 'category', 'amount', 'date', 'reference', 'description'];
    const rows = txs.map(t => [t.id, t.type, t.category, t.amount, t.date, t.reference, t.description]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.map(cell => `"${cell || ''}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BMS_Financial_Ledger_Export_${new Date().toISOString().substring(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Aggregations
  const totalRevenues = txs.filter(t => t.type === 'Income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = txs.filter(t => t.type === 'Expense').reduce((sum, t) => sum + t.amount, 0);
  const carryNetProfits = totalRevenues - totalExpenses;

  const filteredTxs = txs.filter(t => 
    t.category.toLowerCase().includes(search.toLowerCase()) || 
    t.reference.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  );

  const fmt = (v: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: companyCurrency || 'USD' }).format(v);
  };

  return (
    <div id="finance-viewport" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Double-Entry Financial Ledgers</h1>
          <p className="text-sm text-slate-500">Record discretionary transactions, trace actual spent indexes, and define fiscal limits</p>
        </div>
        <div className="flex space-x-2">
          <button
            id="export-csv-btn"
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:shadow-sm text-xs font-semibold px-4 py-2 rounded-xl transition shadow-sm"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
          
          {(userRole === 'Admin' || userRole === 'Accountant' || userRole === 'Super_Admin') && (
            <button
              id="toggle-add-tx"
              className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-md shadow-blue-100"
              onClick={() => setIsAddingTx(!isAddingTx)}
            >
              <PlusCircle className="h-4 w-4" />
              <span>Record Ledger Transaction</span>
            </button>
          )}
        </div>
      </div>

      {/* Balanced books totals row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm relative overflow-hidden">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Aggregate Gross Cash Inflow</p>
          <h3 className="text-2xl font-bold mt-1 text-emerald-400">{fmt(totalRevenues)}</h3>
          <div className="absolute right-3 bottom-3 p-2 bg-slate-800 rounded-lg text-emerald-400">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>
        <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm relative overflow-hidden">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Overhead Carry Expenditure Outflow</p>
          <h3 className="text-2xl font-bold mt-1 text-red-400">{fmt(totalExpenses)}</h3>
          <div className="absolute right-3 bottom-3 p-2 bg-slate-800 rounded-lg text-red-400">
            <TrendingDown className="h-5 w-5" />
          </div>
        </div>
        <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm relative overflow-hidden">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Pre-tax Net Vault Assets</p>
          <h3 className={`text-2xl font-bold mt-1 ${carryNetProfits >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
            {fmt(carryNetProfits)}
          </h3>
          <div className="absolute right-3 bottom-3 p-2 bg-slate-800 rounded-lg text-blue-400">
            <Wallet className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Slide Ledger Addition Form */}
      {isAddingTx && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Record General Ledger Entry</h3>
          {errorMsg && <p className="text-xs font-semibold text-rose-500 bg-rose-50 p-2 rounded">{errorMsg}</p>}
          <form onSubmit={handleCreateTx} className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-medium">Debit / Credit Category</label>
              <select
                id="tx-add-type"
                value={txType}
                onChange={(e: any) => setTxType(e.target.value)}
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 bg-white rounded-lg text-xs"
              >
                <option value="Income">Income (Credit Cash Receiver)</option>
                <option value="Expense">Expense (Debit Cash Disburser)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-medium">Operations Ledger Category</label>
              <select
                id="tx-add-cat"
                value={txCat}
                onChange={(e) => setTxCat(e.target.value)}
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 bg-white rounded-lg text-xs"
              >
                <option value="Sales & Invoices">Sales & Invoiced income</option>
                <option value="Consulting">Consulting fee receipts</option>
                <option value="Cloud Infrastructure">AWS / Hosting Servers expenses</option>
                <option value="Rent & Office">HQ Workspace facility rents</option>
                <option value="Marketing">Campaign promotional budgets</option>
                <option value="Payroll & Wages">Workforce salaries wages disbursement</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-medium">Value Amount (*)</label>
              <input
                id="tx-add-amount"
                type="number"
                required
                min="1"
                value={txAmount}
                onChange={(e) => setTxAmount(Number(e.target.value))}
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium">Value Day Date (*)</label>
              <input
                id="tx-add-date"
                type="date"
                required
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-slate-700 font-medium">Banking Settlement Reference</label>
              <input
                id="tx-add-ref"
                type="text"
                placeholder="TX-BARL-8910"
                value={txRef}
                onChange={(e) => setTxRef(e.target.value)}
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-slate-700 font-medium">Operations Transaction Description</label>
              <input
                id="tx-add-desc"
                type="text"
                placeholder="Acquisition of specialized assets..."
                value={txDesc}
                onChange={(e) => setTxDesc(e.target.value)}
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div className="md:col-span-4 flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                id="tx-add-cancel"
                type="button"
                onClick={() => setIsAddingTx(false)}
                className="px-4 py-1.5 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                id="tx-add-submit"
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
              >
                Commit Ledger Entry
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main split dashboard: Transaction list vs Budget Limit progress bars */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ledger Transaction audit logs spreadsheet */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm lg:col-span-2 overflow-hidden flex flex-col justify-between">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h4 className="font-bold text-slate-900 text-sm">General Transaction Ledger Registry</h4>
            <div className="relative w-48">
              <input
                id="tx-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ledger reference..."
                className="pl-2 pr-2 py-1 border border-slate-300 rounded text-[10px] w-full"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Valuation Day</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Settlement Reference</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Division category</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase text-right">Debit/Credit Value</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200" id="ledger-table-body">
                {filteredTxs.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-500 font-mono">
                      {t.date}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-xs font-bold text-slate-950 font-mono">
                      {t.reference}
                      <p className="text-[10px] text-slate-500 font-normal mt-0.5">{t.description}</p>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-600 font-medium">
                      {t.category}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-xs text-right font-mono font-bold">
                      <span className={t.type === 'Income' ? 'text-emerald-600' : 'text-rose-500'}>
                        {t.type === 'Income' ? '+' : '-'}{fmt(t.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dynamic Budget Limit ring indicators */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4.5 w-4.5 text-blue-500" />
              <h4 className="font-bold text-slate-900 text-sm">Monthly Budget Boundaries</h4>
            </div>
            
            {(userRole === 'Admin' || userRole === 'Accountant' || userRole === 'Super_Admin') && (
              <button
                id="toggle-add-budget"
                onClick={() => setIsAddingBudget(!isAddingBudget)}
                className="text-[10px] font-bold bg-blue-50 text-blue-700 rounded p-1 border border-blue-100 hover:bg-blue-100 transition whitespace-nowrap shrink-0"
              >
                Configure Bounds
              </button>
            )}
          </div>

          {/* Quick budget bounds adding widget inside panel */}
          {isAddingBudget && (
            <div id="add-budget-panel" className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] space-y-2">
              <div className="flex justify-between font-bold text-slate-800">
                <span>Configure Category Boundaries</span>
                <button type="button" onClick={() => setIsAddingBudget(false)}>✕</button>
              </div>
              <form onSubmit={handleCreateBudget} className="space-y-2">
                <div>
                  <label>Ledger Category</label>
                  <select
                    id="budget-add-cat"
                    value={bCat}
                    onChange={(e) => setBCat(e.target.value)}
                    className="mt-0.5 bg-white text-slate-900 select p-1 border border-slate-300 rounded w-full"
                  >
                    <option value="Cloud Infrastructure">Cloud Infrastructure</option>
                    <option value="Rent & Office">Rent & Office</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Payroll & Wages">Payroll & Wages</option>
                  </select>
                </div>
                <div>
                  <label>Max Budget Allocation</label>
                  <input
                    id="budget-add-limit"
                    type="number"
                    min="1"
                    required
                    value={bLimit}
                    onChange={(e) => setBLimit(Number(e.target.value))}
                    className="mt-0.5 bg-white text-slate-900 p-1 border border-slate-300 rounded w-full"
                  />
                </div>
                <button
                  id="budget-add-submit"
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-1 rounded font-sans cursor-pointer text-center"
                >
                  Set Budget limit
                </button>
              </form>
            </div>
          )}

          {/* Budget progress loops */}
          <div className="space-y-4" id="budgets-container">
            {budgets.map((b) => {
              const ratio = Math.min(100, Math.round((b.spentAmount / b.limitAmount) * 100));
              const isOver = b.spentAmount > b.limitAmount;

              return (
                <div key={b.id} className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-slate-700 font-medium">
                    <span className="truncate max-w-[150px]">{b.category}</span>
                    <span className="font-mono text-[10px]">
                      {fmt(b.spentAmount)} / <span className="font-bold">{fmt(b.limitAmount)}</span>
                    </span>
                  </div>

                  {/* HTML raw linear gauge bar */}
                  <div className="w-full h-2 rounded bg-slate-100 overflow-hidden relative border border-slate-200/50">
                    <div 
                      className={`h-full rounded transition-all duration-500 ${isOver ? 'bg-rose-500' : ratio >= 85 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                      style={{ width: `${ratio}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[9px]">
                    <span className="text-slate-400 font-mono">Month Period: {b.month}/{b.year}</span>
                    <span className={`font-bold font-mono ${isOver ? 'text-rose-500' : ratio >= 85 ? 'text-amber-500' : 'text-emerald-600'}`}>
                      {isOver ? 'EXPENDED BREAKOUT' : `${ratio}% utilized`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
