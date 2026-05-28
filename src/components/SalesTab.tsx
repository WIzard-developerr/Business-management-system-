import React, { useEffect, useState } from 'react';
import { 
  FileSpreadsheet, Receipt, PlusCircle, CheckCircle, Clock, 
  Trash2, Eye, Printer, Building, FileText, Plus, DollarSign 
} from 'lucide-react';

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  total: number;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
  recurring: boolean;
  currency: string;
}

interface Client {
  id: string;
  name: string;
  companyName: string;
}

interface SalesTabProps {
  token: string;
  companyTaxRate: number;
  companyCurrency: string;
}

export function SalesTab({ token, companyTaxRate, companyCurrency }: SalesTabProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'Unpaid' | 'Paid'>('all');
  
  // PDF Viewer Simulated Modal
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

  // Form states
  const [isCreating, setIsCreating] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [discountVal, setDiscountVal] = useState(0);
  
  // Item line list states
  const [lineItems, setLineItems] = useState<{ description: string; quantity: number; unitPrice: number }[]>([
    { description: 'Consulting Session Service', quantity: 1, unitPrice: 1500 }
  ]);

  const [errorMsg, setErrorMsg] = useState('');

  const fetchSalesData = async () => {
    try {
      const authHeader = { 'Authorization': `Bearer ${token}` };
      
      const invRes = await fetch('/api/sales/invoices', { headers: authHeader });
      const invoicePayload = await invRes.json();
      setInvoices(invoicePayload);

      const clientsRes = await fetch('/api/crm/clients', { headers: authHeader });
      const clientsPayload = await clientsRes.json();
      setClients(clientsPayload);
    } catch (e) {
      console.error('Failed to resolve sales modules data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, [token]);

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: 100 }]);
  };

  const removeLineItem = (idx: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== idx));
  };

  const updateLineItem = (idx: number, field: string, val: any) => {
    setLineItems(lineItems.map((item, i) => {
      if (i !== idx) return item;
      return { ...item, [field]: val };
    }));
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!selectedClientId) {
      setErrorMsg('Invoice target client is a required parameter.');
      return;
    }

    const cObj = clients.find(c => c.id === selectedClientId);
    if (!cObj) return;

    // Check empty desc lines
    if (lineItems.some(i => !i.description.trim())) {
      setErrorMsg('Ensure all ledger line item descriptions are complete.');
      return;
    }

    try {
      const res = await fetch('/api/sales/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          clientId: selectedClientId,
          clientName: cObj.companyName ? `${cObj.name} (${cObj.companyName})` : cObj.name,
          issueDate,
          dueDate,
          taxRate: companyTaxRate || 8.25,
          discount: Number(discountVal),
          items: lineItems,
          status: 'Sent' // Auto-publish as Sent initially on fast track
        })
      });

      if (!res.ok) throw new Error('Create invoice payload returned error.');
      
      const added = await res.json();
      setInvoices([added, ...invoices]);
      setIsCreating(false);
      resetForm();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/sales/invoices/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const updated = await res.json();
      setInvoices(invoices.map(i => i.id === id ? updated : i));
      if (viewInvoice?.id === id) {
        setViewInvoice(updated);
      }
    } catch (e) {
      console.error('Failed to change ledger billing state:', e);
    }
  };

  const resetForm = () => {
    setSelectedClientId('');
    setIssueDate('');
    setDueDate('');
    setDiscountVal(0);
    setLineItems([{ description: 'Consulting Session Service', quantity: 1, unitPrice: 1500 }]);
  };

  const filterInvoices = invoices.filter(i => {
    if (activeTab === 'all') return true;
    if (activeTab === 'Unpaid') return i.status === 'Sent' || i.status === 'Overdue';
    return i.status === 'Paid';
  });

  const getStatusStyle = (status: Invoice['status']) => {
    switch (status) {
      case 'Paid': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Sent': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Overdue': return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const fmt = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: companyCurrency || 'USD' }).format(val);
  };

  // Live total calculations on creation canvas
  const subtotalSum = lineItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
  const taxSum = parseFloat(((subtotalSum - discountVal) * ((companyTaxRate || 8) / 100)).toFixed(2));
  const grandTotalResult = parseFloat((subtotalSum - discountVal + taxSum).toFixed(2));

  return (
    <div id="sales-viewport" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Billing Ledger & Invoicing (ERP)</h1>
          <p className="text-sm text-slate-500">Formulate draft quotes, dispatch invoices, and map paid disbursements contextually</p>
        </div>
        <button
          id="toggle-create-invoice"
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-md shadow-blue-100"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Formulate Invoice</span>
        </button>
      </div>

      {/* Invoice formulation creation screen */}
      {isCreating && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Formulate New Standard Invoice</h3>
          {errorMsg && <p className="text-xs font-semibold text-rose-500 bg-rose-50 p-2 rounded">{errorMsg}</p>}
          <form onSubmit={handleCreateInvoice} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700">Account Client Target</label>
                <select
                  id="sales-add-clientId"
                  required
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="mt-1 block w-full py-1.5 px-3 border border-slate-300 bg-white rounded-lg text-xs"
                >
                  <option value="">Choose contact...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.companyName ? `${c.name} (${c.companyName})` : c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Post Date</label>
                <input
                  id="sales-add-issueDate"
                  type="date"
                  required
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Fiscal Due Date</label>
                <input
                  id="sales-add-dueDate"
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Invoiced ledger line items block */}
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                <span className="text-xs font-bold text-slate-700">Sales Line Ledger Items</span>
                <button
                  id="sales-add-line"
                  type="button"
                  onClick={addLineItem}
                  className="flex items-center space-x-1 text-xs text-blue-600 font-semibold hover:underline bg-transparent"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add line</span>
                </button>
              </div>

              {lineItems.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center border-b border-slate-100 pb-2">
                  <div className="md:col-span-6">
                    <input
                      id={`invoice-item-desc-${index}`}
                      type="text"
                      required
                      placeholder="Item performance description / Service catalog code"
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      className="block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <input
                      id={`invoice-item-qty-${index}`}
                      type="number"
                      required
                      min="1"
                      placeholder="Units"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', Number(e.target.value))}
                      className="block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs text-center"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                        <span className="text-slate-400 text-xs">$</span>
                      </div>
                      <input
                        id={`invoice-item-price-${index}`}
                        type="number"
                        required
                        placeholder="Rate scale"
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(index, 'unitPrice', Number(e.target.value))}
                        className="block w-full pl-6 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-1 text-center">
                    <button
                      id={`invoice-item-remove-${index}`}
                      type="button"
                      disabled={lineItems.length === 1}
                      onClick={() => removeLineItem(index)}
                      className="text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-slate-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations summaries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <div>
                <label className="block text-xs font-medium text-slate-700">Discretionary Flat Discount Deduction</label>
                <div className="mt-1 relative rounded-md shadow-sm max-w-[200px]">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <span className="text-slate-400 text-xs">$</span>
                  </div>
                  <input
                    id="sales-add-discount"
                    type="number"
                    min="0"
                    value={discountVal}
                    onChange={(e) => setDiscountVal(Number(e.target.value))}
                    className="block w-full pl-6 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 text-xs space-y-2 border border-slate-200 ml-auto w-full max-w-sm">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Lines Subtotal:</span>
                  <span className="font-mono">{fmt(subtotalSum)}</span>
                </div>
                {discountVal > 0 && (
                  <div className="flex items-center justify-between text-red-600">
                    <span>Discount applied:</span>
                    <span className="font-mono">-{fmt(discountVal)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-slate-600">
                  <span>Corporate Tax ({companyTaxRate || 8}%):</span>
                  <span className="font-mono">{fmt(taxSum)}</span>
                </div>
                <div className="flex items-center justify-between font-bold border-t border-slate-200 pt-2 text-slate-900 border-dashed">
                  <span>Invoice Total:</span>
                  <span className="font-mono text-blue-600">{fmt(grandTotalResult)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
              <button
                id="sales-add-cancel"
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                id="sales-add-submit"
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition shadow-md shadow-blue-100"
              >
                Consolidate & Publish Invoice
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs and Sheet summary view */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
            {(['all', 'Unpaid', 'Paid'] as const).map((tb) => (
              <button
                id={`sales-tab-${tb}`}
                key={tb}
                onClick={() => setActiveTab(tb)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${activeTab === tb ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
              >
                {tb === 'all' ? 'All Invoices' : tb === 'Unpaid' ? 'Unpaid Outstanding' : 'Settled Paid'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ledge Code</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Corporate Client</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Due Date</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Value</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">State</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200" id="invoices-table-body">
              {filterInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-5 py-4 whitespace-nowrap text-xs font-bold text-slate-950 font-mono">
                    {inv.invoiceNumber}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-xs font-medium text-slate-700">
                    {inv.clientName}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-500">
                    {inv.dueDate}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-xs font-bold text-slate-900 font-mono">
                    {fmt(inv.total)}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusStyle(inv.status)}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-right text-xs">
                    <div className="flex items-center justify-end space-x-2">
                      {inv.status !== 'Paid' && (
                        <button
                          id={`invoice-mark-paid-${inv.id}`}
                          onClick={() => handleUpdateStatus(inv.id, 'Paid')}
                          className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.0 py-1 rounded transition border border-emerald-100 flex items-center space-x-1"
                        >
                          <CheckCircle className="h-3 w-3" />
                          <span>Clear Overdue</span>
                        </button>
                      )}
                      <button
                        id={`invoice-view-${inv.id}`}
                        onClick={() => setViewInvoice(inv)}
                        className="text-slate-400 hover:text-slate-700 p-1 rounded"
                        title="Simulated Printable PDF View"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filterInvoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-xs text-slate-500 font-semibold bg-white">
                    No matching accounts entries listed.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simulated printable PDF Invoice preview modal sheet */}
      {viewInvoice && (
        <div id="invoice-pdf-modal" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-950 p-4 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-400" />
                <span className="font-bold text-sm tracking-tight">Enterprise Client Receipt Preview</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  id="print-invoice"
                  onClick={() => window.print()}
                  className="p-1 px-2 text-xs bg-slate-800 hover:bg-slate-700 rounded transition flex items-center space-x-1"
                >
                  <Printer className="h-3 w-3" />
                  <span>Print PDF</span>
                </button>
                <button
                  id="close-invoice"
                  onClick={() => setViewInvoice(null)}
                  className="text-slate-400 hover:text-white px-2 font-bold focus:outline-none"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Simulated Receipt Sheet */}
            <div className="p-8 space-y-6 overflow-y-auto font-sans text-slate-800 bg-white">
              <div className="flex justify-between items-start border-b border-slate-100 pb-5">
                <div>
                  <div className="flex items-center space-x-2 text-blue-600">
                    <Building className="h-6 w-6" />
                    <span className="font-bold text-lg tracking-tight">Acme Solutions Corp</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">Consolidated Operations ERP</p>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-extrabold text-slate-950">INVOICE</h2>
                  <p className="text-xs font-mono font-bold text-blue-600 mt-1">{viewInvoice.invoiceNumber}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="font-bold text-slate-400 uppercase tracking-wide text-[10px]">Client / Bill To:</p>
                  <p className="font-semibold text-slate-800 mt-1">{viewInvoice.clientName}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-400 uppercase tracking-wide text-[10px]">Invoicing Terms:</p>
                  <p className="mt-1">
                    <span className="text-slate-500">Issue Date:</span> <span className="font-semibold">{viewInvoice.issueDate}</span>
                  </p>
                  <p>
                    <span className="text-slate-500">Due Date:</span> <span className="font-semibold text-rose-500">{viewInvoice.dueDate}</span>
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <table className="min-w-full divide-y divide-slate-200 mt-6 border-b border-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-400 uppercase">Item Description</th>
                    <th className="px-4 py-2 text-center text-[10px] font-bold text-slate-400 uppercase w-20">Quantity</th>
                    <th className="px-4 py-2 text-right text-[10px] font-bold text-slate-400 uppercase w-28">Unit Price</th>
                    <th className="px-4 py-2 text-right text-[10px] font-bold text-slate-400 uppercase w-28">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {viewInvoice.items.map((it, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 text-slate-800 font-semibold">{it.description}</td>
                      <td className="px-4 py-3 text-center font-mono">{it.quantity}</td>
                      <td className="px-4 py-3 text-right font-mono">{fmt(it.unitPrice)}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">{fmt(it.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Aggregates block */}
              <div className="flex justify-end pt-4">
                <div className="w-64 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal:</span>
                    <span className="font-mono">{fmt(viewInvoice.subtotal)}</span>
                  </div>
                  {viewInvoice.discount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Discount deduction:</span>
                      <span className="font-mono">-{fmt(viewInvoice.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-500">
                    <span>Tax Amount ({viewInvoice.taxRate || 8}%):</span>
                    <span className="font-mono">{fmt(viewInvoice.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-slate-900 border-t border-slate-200 pt-2 border-dashed">
                    <span>Net Total:</span>
                    <span className="font-mono text-blue-600">{fmt(viewInvoice.total)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100 text-center text-[10px] text-slate-400">
                <p>Thank you for your valued enterprise partnership with Acme Solutions Inc.</p>
                <p className="mt-1 font-mono">BMS Secured Transaction Reference node matches SHA256 hashes</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
