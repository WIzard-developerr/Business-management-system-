import React, { useEffect, useState } from 'react';
import { 
  Package, Search, Filter, AlertTriangle, ArrowUpDown, 
  Warehouse, ShieldAlert, Plus, Edit, RefreshCw 
} from 'lucide-react';

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  price: number;
  cost: number;
  stockQty: number;
  lowStockThreshold: number;
  warehouse: string;
  supplierName?: string;
}

interface InventoryTabProps {
  token: string;
  userRole: string;
  companyCurrency: string;
}

export function InventoryTab({ token, userRole, companyCurrency }: InventoryTabProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');

  // Adjust Stock state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newStockQty, setNewStockQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState('BMS inventory verification');

  // Create Product states
  const [isAdding, setIsAdding] = useState(false);
  const [pSku, setPSku] = useState('');
  const [pName, setPName] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pCat, setPCat] = useState('Hardware');
  const [pPrice, setPPrice] = useState(0);
  const [pCost, setPCost] = useState(0);
  const [pQty, setPQty] = useState(0);
  const [pThreshold, setPThreshold] = useState(5);
  const [pWarehouse, setPWarehouse] = useState('Main Warehouse NYC');
  const [pSupplier, setPSupplier] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/inventory/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setProducts(data);
    } catch (e) {
      console.error('Failed to resolve merchandise stocks data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [token]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!pSku || !pName || pPrice === undefined || pQty === undefined) {
      setErrorMsg('SKU, Name, Price and Initial Stock quantity are required.');
      return;
    }

    try {
      const res = await fetch('/api/inventory/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sku: pSku,
          name: pName,
          description: pDesc,
          category: pCat,
          price: Number(pPrice),
          cost: Number(pCost),
          stockQty: Number(pQty),
          lowStockThreshold: Number(pThreshold),
          warehouse: pWarehouse,
          supplierName: pSupplier
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit product creation.');

      setProducts([data, ...products]);
      setIsAdding(false);
      resetAddForm();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    try {
      const res = await fetch(`/api/inventory/products/${selectedProduct.id}/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ stockQty: Number(newStockQty), notes: adjustReason })
      });

      if (!res.ok) throw new Error('Adjust stock request failed.');

      const updated = await res.json();
      setProducts(products.map(p => p.id === selectedProduct.id ? updated : p));
      setSelectedProduct(null);
    } catch (e) {
      console.error('Stock adjustment missed:', e);
    }
  };

  const resetAddForm = () => {
    setPSku('');
    setPName('');
    setPDesc('');
    setPCat('Hardware');
    setPPrice(0);
    setPCost(0);
    setPQty(0);
    setPThreshold(5);
    setPSupplier('');
  };

  const triggerAdjustState = (p: Product) => {
    setSelectedProduct(p);
    setNewStockQty(p.stockQty);
    setAdjustReason('Physical stock audits verified');
  };

  // Derived stock aggregations
  const totalStockSKUs = products.length;
  const lowStockCountAlm = products.filter(p => p.stockQty <= p.lowStockThreshold).length;
  const totalAssetValues = products.reduce((sum, p) => sum + (p.stockQty * p.cost), 0);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.sku.toLowerCase().includes(search.toLowerCase()) ||
                          p.category.toLowerCase().includes(search.toLowerCase());
    
    if (filterCat === 'All') return matchesSearch;
    return matchesSearch && p.category === filterCat;
  });

  const uniqueCategories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  const fmt = (v: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: companyCurrency || 'USD' }).format(v);
  };

  return (
    <div id="inventory-viewport" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">SKU Catalogue & Warehouses</h1>
          <p className="text-sm text-slate-500">Track raw hardware, configure margins, manage vendor suppliers and balance logistics</p>
        </div>
        <button
          id="toggle-add-product"
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-md shadow-blue-100"
        >
          <Plus className="h-4 w-4" />
          <span>Add Product</span>
        </button>
      </div>

      {/* Quick summary bento alerts cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Indexed SKU Catalog</p>
            <h4 className="text-xl font-extrabold text-slate-950">{totalStockSKUs} distinct products</h4>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <Package className="h-5 w-5" />
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Asset Carry Inventory Value</p>
            <h4 className="text-xl font-extrabold text-slate-950">{fmt(totalAssetValues)}</h4>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <Warehouse className="h-5 w-5" />
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Low-Stock Exceptions</p>
            <h4 className={`text-xl font-extrabold ${lowStockCountAlm > 0 ? 'text-rose-600' : 'text-slate-950'}`}>
              {lowStockCountAlm} items below alert floor
            </h4>
          </div>
          <div className={`p-3 rounded-xl ${lowStockCountAlm > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
            <ShieldAlert className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Slide Product Sheet Form */}
      {isAdding && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Add New Product SKU</h3>
          {errorMsg && <p className="text-xs font-semibold text-rose-500 bg-rose-50 p-2 rounded">{errorMsg}</p>}
          <form onSubmit={handleCreateProduct} className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-medium">Unique SKU Code (*)</label>
              <input
                id="inv-add-sku"
                type="text"
                required
                value={pSku}
                onChange={(e) => setPSku(e.target.value)}
                placeholder="SRV-ENT-XXX"
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium">Product / Service Name (*)</label>
              <input
                id="inv-add-name"
                type="text"
                required
                value={pName}
                onChange={(e) => setPName(e.target.value)}
                placeholder="Enterprise Server Node"
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium">Category</label>
              <input
                id="inv-add-cat"
                type="text"
                value={pCat}
                onChange={(e) => setPCat(e.target.value)}
                placeholder="Hardware"
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium">Physical Warehouse Storage</label>
              <input
                id="inv-add-warehouse"
                type="text"
                value={pWarehouse}
                onChange={(e) => setPWarehouse(e.target.value)}
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium">Sales Price Price (*)</label>
              <input
                id="inv-add-price"
                type="number"
                required
                min="0"
                value={pPrice}
                onChange={(e) => setPPrice(Number(e.target.value))}
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium">Cost Price (COGS)</label>
              <input
                id="inv-add-cost"
                type="number"
                min="0"
                value={pCost}
                onChange={(e) => setPCost(Number(e.target.value))}
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium">Initial Stock Quantity (*)</label>
              <input
                id="inv-add-qty"
                type="number"
                required
                min="0"
                value={pQty}
                onChange={(e) => setPQty(Number(e.target.value))}
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium">Alarm Low-Stock floor</label>
              <input
                id="inv-add-threshold"
                type="number"
                min="0"
                value={pThreshold}
                onChange={(e) => setPThreshold(Number(e.target.value))}
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-slate-700 font-medium">Vendor Supplier Name</label>
              <input
                id="inv-add-supplier"
                type="text"
                value={pSupplier}
                onChange={(e) => setPSupplier(e.target.value)}
                placeholder="Silicon Microchips Corp"
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-slate-700 font-medium">Catalog Description</label>
              <input
                id="inv-add-desc"
                type="text"
                value={pDesc}
                onChange={(e) => setPDesc(e.target.value)}
                placeholder="Extended warranty, specifications..."
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div className="md:col-span-4 flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                id="inv-add-cancel"
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-1.5 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                id="inv-add-submit"
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
              >
                Assemble SKU Node
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Interactive Stock adjustment drawer popover */}
      {selectedProduct && (
        <div id="stock-adjustment-drawer" className="bg-slate-50 border border-blue-200 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold text-slate-900">
              Trigger Stock Audit Correction - <span className="text-blue-600 font-mono">{selectedProduct.sku}</span>
            </h4>
            <button id="close-adjust" className="text-slate-400 font-bold text-xs" onClick={() => setSelectedProduct(null)}>✕</button>
          </div>
          <p className="text-[11px] text-slate-500">Amending stock of parent container '{selectedProduct.name}' stored at {selectedProduct.warehouse}</p>
          <form onSubmit={handleAdjustStock} className="flex flex-wrap items-end gap-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700">Audit Stock Level Count</label>
              <input
                id="inv-adjust-qty"
                type="number"
                required
                min="0"
                value={newStockQty}
                onChange={(e) => setNewStockQty(Number(e.target.value))}
                className="mt-1 block w-32 py-1 px-2 border border-slate-300 rounded h-8 text-xs font-bold"
              />
            </div>
            <div className="flex-1">
              <label className="block font-medium text-slate-700">Trigger Audit Cause / Reason</label>
              <input
                id="inv-adjust-reason"
                type="text"
                required
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="mt-1 block w-full py-1 px-2 border border-slate-300 rounded h-8 text-xs"
              />
            </div>
            <button
              id="inv-adjust-submit"
              type="submit"
              className="py-1 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded h-8 transition"
            >
              Amend Stocks
            </button>
          </form>
        </div>
      )}

      {/* Products list table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border-b border-slate-100">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              id="inv-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-10 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs"
              placeholder="Search SKUs, categories, suppliers..."
            />
          </div>
          <div className="flex items-center space-x-2 text-xs shrink-0 bg-slate-100 p-1 rounded-lg">
            {uniqueCategories.map(cat => (
              <button
                id={`inv-cat-filter-${cat}`}
                key={cat}
                onClick={() => setFilterCat(cat)}
                className={`px-3 py-1 bg-transparent rounded font-bold transition ${filterCat === cat ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">SKU / Catalog Name</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Category</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Wholesale Cost (COGS)</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Sales Price</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Stock units</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Alert indicator</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase text-right">Amends</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200 animate-fade-in" id="inventory-table-body">
              {filteredProducts.map((p) => {
                const isUnderStock = p.stockQty <= p.lowStockThreshold;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 font-mono tracking-wider">{p.sku}</span>
                        <p className="text-xs font-semibold text-slate-900 mt-0.5">{p.name}</p>
                        <p className="text-[10px] text-slate-500">{p.warehouse}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-600 font-medium">
                      {p.category}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-500 font-mono">
                      {fmt(p.cost)}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-xs font-bold text-slate-900 font-mono">
                      {fmt(p.price)}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-xs font-bold text-slate-800 font-mono">
                      {p.stockQty} unit{p.stockQty !== 1 && 's'}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {isUnderStock ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                          Low Stock Alarm
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-50 text-[9px] text-slate-500 font-semibold">
                          Optimal Stock Level
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right text-xs">
                      {(userRole === 'Admin' || userRole === 'Manager' || userRole === 'Super_Admin') && (
                        <button
                          id={`product-adjust-${p.id}`}
                          onClick={() => triggerAdjustState(p)}
                          className="text-blue-600 hover:text-blue-800 font-bold text-xs flex items-center space-x-1 ml-auto bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded transition"
                        >
                          <Edit className="h-3 w-3" />
                          <span>Audit</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-6 text-center text-xs text-slate-500 font-semibold bg-white">
                    No matching catalog entries cataloged.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
