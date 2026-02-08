'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

const CATEGORIES = ['Labor', 'Springs', 'Rollers', 'Cables', 'Hardware', 'Seals', 'Openers', 'Electronics'];

const emptyPart = () => ({
  part_name: '',
  category: 'Labor',
  cost_price: 0,
  retail_price: 0,
  stock_qty: 0,
});

export default function InventoryPage() {
  const router = useRouter();
  const [parts, setParts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [editing, setEditing] = useState<any>(null);
  const [addForm, setAddForm] = useState(emptyPart());
  const [saving, setSaving] = useState(false);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('tech_user') || '{}');
      if (user.role !== 'admin') {
        router.replace('/');
        return;
      }
      setAllowed(true);
    } catch {
      router.replace('/');
    }
  }, [router]);

  useEffect(() => {
    if (!allowed) return;
    load();
  }, [allowed]);

  async function load() {
    const { data } = await supabase.from('inventory').select('*').order('part_name');
    if (data) setParts(data);
  }

  async function addPart(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('inventory').insert({
      part_name: addForm.part_name.trim(),
      category: addForm.category,
      cost_price: Number(addForm.cost_price) || 0,
      retail_price: Number(addForm.retail_price) || 0,
      stock_qty: Number(addForm.stock_qty) || 0,
    });
    setSaving(false);
    if (error) {
      alert('Failed to add: ' + error.message);
      return;
    }
    setAddForm(emptyPart());
    load();
  }

  async function saveEdit() {
    if (!editing?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from('inventory')
      .update({
        part_name: editing.part_name?.trim() ?? '',
        category: editing.category ?? 'Labor',
        cost_price: Number(editing.cost_price) ?? 0,
        retail_price: Number(editing.retail_price) ?? 0,
        stock_qty: Number(editing.stock_qty) ?? 0,
      })
      .eq('id', editing.id);
    setSaving(false);
    if (error) {
      alert('Failed to save: ' + error.message);
      return;
    }
    setEditing(null);
    load();
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    const { error } = await supabase.from('inventory').delete().eq('id', id);
    if (!error) load();
    else alert('Delete failed.');
  }

  const filtered = parts.filter((p) => {
    const matchSearch = p.part_name?.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'All' || p.category === category;
    return matchSearch && matchCat;
  });

  const totalCostValue = filtered.reduce((sum, p) => sum + (Number(p.cost_price) || 0) * (Number(p.stock_qty) || 0), 0);
  const totalRetailValue = filtered.reduce((sum, p) => sum + (Number(p.retail_price) || 0) * (Number(p.stock_qty) || 0), 0);
  const netProfit = totalRetailValue - totalCostValue;

  const inputClass = 'w-full bg-black border border-neutral-800 p-3 sm:p-4 text-white font-semibold text-sm outline-none focus:border-red-600 rounded-sm';

  if (allowed !== true) return null;

  return (
    <div className="max-w-5xl mx-auto pb-6">
      <div className="mb-6 sm:mb-8 border-b border-neutral-800 pb-4">
        <h1 className="text-2xl sm:text-4xl font-bold uppercase text-white tracking-tight">
          <span className="text-red-600">Inventory</span>
        </h1>
        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mt-1">
          Master parts list — cost (what you pay), retail (what you charge), net profit
        </p>
      </div>

      {/* Net profit summary — admin only */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-neutral-950 border border-neutral-800 p-4 sm:p-6 rounded-sm text-center sm:text-left">
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Total cost value</p>
          <p className="text-xl sm:text-2xl font-bold text-neutral-400 mt-1">
            ${totalCostValue.toFixed(2)}
          </p>
          <p className="text-[10px] text-neutral-600 mt-0.5">What you paid for current stock</p>
        </div>
        <div className="bg-neutral-950 border border-neutral-800 p-4 sm:p-6 rounded-sm text-center sm:text-left">
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Total retail value</p>
          <p className="text-xl sm:text-2xl font-bold text-white mt-1">
            ${totalRetailValue.toFixed(2)}
          </p>
          <p className="text-[10px] text-neutral-600 mt-0.5">At master retail prices</p>
        </div>
        <div className="bg-neutral-950 border border-green-900/50 p-4 sm:p-6 rounded-sm text-center sm:text-left">
          <p className="text-[10px] font-bold text-green-500 uppercase tracking-wider">Net profit (margin)</p>
          <p className="text-xl sm:text-2xl font-bold text-green-500 mt-1">
            ${netProfit.toFixed(2)}
          </p>
          <p className="text-[10px] text-neutral-600 mt-0.5">Retail − cost on current stock</p>
        </div>
      </div>

      {/* Add new part */}
      <div className="bg-neutral-950 border border-neutral-800 p-4 sm:p-6 mb-6 rounded-sm">
        <h2 className="text-sm font-bold uppercase text-red-600 tracking-wider mb-4">+ Add part</h2>
        <form onSubmit={addPart} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
          <div>
            <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Part name</label>
            <input
              className={inputClass}
              placeholder="e.g. Torsion Spring"
              value={addForm.part_name}
              onChange={(e) => setAddForm((f) => ({ ...f, part_name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Category</label>
            <select
              className={inputClass}
              value={addForm.category}
              onChange={(e) => setAddForm((f) => ({ ...f, category: e.target.value }))}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Cost $</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className={inputClass}
              value={addForm.cost_price || ''}
              onChange={(e) => setAddForm((f) => ({ ...f, cost_price: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Retail $</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className={inputClass}
              value={addForm.retail_price || ''}
              onChange={(e) => setAddForm((f) => ({ ...f, retail_price: parseFloat(e.target.value) || 0 }))}
              required
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Stock</label>
            <input
              type="number"
              min="0"
              className={inputClass}
              value={addForm.stock_qty || ''}
              onChange={(e) => setAddForm((f) => ({ ...f, stock_qty: parseInt(e.target.value, 10) || 0 }))}
            />
          </div>
          <button type="submit" disabled={saving} className="bg-red-600 hover:bg-red-500 py-3 font-bold uppercase text-xs text-white rounded-sm disabled:opacity-50">
            {saving ? 'Adding…' : 'Add part'}
          </button>
        </form>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
            Search
          </label>
          <input
            className={inputClass}
            placeholder="Part name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-56">
          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
            Category
          </label>
          <select
            className={inputClass}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="All">All</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-neutral-950 border border-neutral-800 rounded-sm overflow-hidden">
        <div className="hidden sm:grid sm:grid-cols-7 gap-4 p-3 sm:p-4 bg-neutral-900 text-[10px] font-bold uppercase text-neutral-500 tracking-wider">
          <div className="col-span-2">Part</div>
          <div>Stock</div>
          <div>Cost</div>
          <div>Retail</div>
          <div>Profit</div>
          <div className="text-right">Edit / Delete</div>
        </div>

        <div className="divide-y divide-neutral-800">
          {filtered.map((part) => {
            const profit = ((part.retail_price ?? 0) - (part.cost_price ?? 0)).toFixed(2);
            return (
              <div key={part.id} className="p-4 sm:p-5 hover:bg-neutral-900/50">
                <div className="hidden sm:grid sm:grid-cols-7 gap-4 items-center">
                  <div className="col-span-2">
                    <span className="text-[10px] text-neutral-500 uppercase block">{part.category}</span>
                    <span className="font-bold text-white uppercase text-sm">{part.part_name}</span>
                  </div>
                  <div className={part.stock_qty < 5 ? 'text-red-600 font-bold' : 'text-neutral-400'}>{part.stock_qty}</div>
                  <div className="text-neutral-400 text-sm">${part.cost_price}</div>
                  <div className="text-white font-bold">${part.retail_price}</div>
                  <div className="text-green-500 font-bold">+${profit}</div>
                  <div className="text-right flex gap-2 justify-end">
                    <button type="button" onClick={() => setEditing({ ...part })} className="text-[10px] font-bold uppercase text-neutral-400 hover:text-white">
                      Edit
                    </button>
                    <button type="button" onClick={() => remove(part.id, part.part_name)} className="text-[10px] font-bold uppercase text-neutral-500 hover:text-red-600">
                      Delete
                    </button>
                  </div>
                </div>

                <div className="sm:hidden space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase block">{part.category}</span>
                      <span className="font-bold text-white uppercase">{part.part_name}</span>
                    </div>
                    <span className={`text-lg font-bold ${part.stock_qty < 5 ? 'text-red-600' : 'text-white'}`}>
                      Stock {part.stock_qty}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="bg-black/50 p-2 rounded-sm">
                      <span className="text-[10px] text-neutral-500 block">Cost</span>
                      <span className="text-neutral-400">${part.cost_price}</span>
                    </div>
                    <div className="bg-black/50 p-2 rounded-sm">
                      <span className="text-[10px] text-neutral-500 block">Retail</span>
                      <span className="text-white font-bold">${part.retail_price}</span>
                    </div>
                    <div className="bg-black/50 p-2 rounded-sm">
                      <span className="text-[10px] text-neutral-500 block">Profit</span>
                      <span className="text-green-500 font-bold">+${profit}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setEditing({ ...part })} className="flex-1 py-2 text-[10px] font-bold uppercase bg-neutral-800 text-white border border-neutral-700 rounded-sm">
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(part.id, part.part_name)}
                      className="flex-1 py-2 text-[10px] font-bold uppercase text-red-600 border border-red-900/30 rounded-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit part modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-950 border border-neutral-800 p-6 w-full max-w-md rounded-sm">
            <h3 className="font-bold uppercase text-white mb-4">Edit part — master price</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Part name</label>
                <input
                  className={inputClass}
                  value={editing.part_name ?? ''}
                  onChange={(e) => setEditing((p: any) => ({ ...p, part_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Category</label>
                <select
                  className={inputClass}
                  value={editing.category ?? 'Labor'}
                  onChange={(e) => setEditing((p: any) => ({ ...p, category: e.target.value }))}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Cost $</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={inputClass}
                    value={editing.cost_price ?? ''}
                    onChange={(e) => setEditing((p: any) => ({ ...p, cost_price: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Retail $</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={inputClass}
                    value={editing.retail_price ?? ''}
                    onChange={(e) => setEditing((p: any) => ({ ...p, retail_price: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Stock</label>
                  <input
                    type="number"
                    min="0"
                    className={inputClass}
                    value={editing.stock_qty ?? ''}
                    onChange={(e) => setEditing((p: any) => ({ ...p, stock_qty: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setEditing(null)} className="flex-1 py-3 bg-neutral-800 text-white font-bold uppercase text-sm rounded-sm">
                Cancel
              </button>
              <button type="button" onClick={saveEdit} disabled={saving} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold uppercase text-sm rounded-sm disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
