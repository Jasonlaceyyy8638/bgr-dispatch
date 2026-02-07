'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminTechsPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({ name: '', pin: '', role: 'tech', phone: '' });
  const [editPin, setEditPin] = useState<{ user: any; pin: string } | null>(null);
  const [editPhone, setEditPhone] = useState<{ user: any; phone: string } | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase.from('tech_users').select('*').order('name');
    if (data) setUsers(data);
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newUser.name || !newUser.pin) {
      alert('Name and PIN required');
      return;
    }
    const { error } = await supabase.from('tech_users').insert({
      name: newUser.name,
      pin: newUser.pin,
      role: newUser.role,
      phone: newUser.phone?.trim() || null,
      must_change_pin: true,
    });
    if (error) {
      alert('Error: ' + error.message);
      return;
    }
    setNewUser({ name: '', pin: '', role: 'tech', phone: '' });
    load();
  }

  async function setRole(id: string, role: string) {
    await supabase.from('tech_users').update({ role }).eq('id', id);
    load();
  }

  async function savePin() {
    if (!editPin) return;
    const { error } = await supabase
      .from('tech_users')
      .update({ pin: editPin.pin, must_change_pin: false })
      .eq('id', editPin.user.id);
    if (!error) {
      setEditPin(null);
      load();
    }
  }

  async function savePhone() {
    if (!editPhone) return;
    const { error } = await supabase
      .from('tech_users')
      .update({ phone: editPhone.phone?.trim() || null })
      .eq('id', editPhone.user.id);
    if (!error) {
      setEditPhone(null);
      load();
    }
  }

  async function removeUser(id: string, name: string) {
    if (!confirm(`Remove ${name}? This will unassign them from all jobs (open and closed), then remove the user.`)) return;
    const { error: unassignError } = await supabase.from('jobs').update({ assigned_tech_id: null }).eq('assigned_tech_id', id);
    if (unassignError) {
      alert('Could not unassign jobs: ' + unassignError.message);
      return;
    }
    const { error } = await supabase.from('tech_users').delete().eq('id', id);
    if (error) {
      alert('Could not remove: ' + error.message);
      return;
    }
    load();
  }

  const inputClass = 'w-full bg-black border border-neutral-800 p-3 sm:p-4 text-white font-semibold text-sm outline-none focus:border-red-600 rounded-sm';

  return (
    <div className="max-w-5xl mx-auto pb-6">
      <div className="mb-6 sm:mb-8 border-b border-neutral-800 pb-4">
        <h1 className="text-2xl sm:text-4xl font-bold uppercase text-white tracking-tight">
          User <span className="text-red-600">Management</span>
        </h1>
        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mt-1">
          Techs & roles
        </p>
      </div>

      <div className="bg-neutral-950 border border-neutral-800 p-4 sm:p-6 mb-6 sm:mb-8 rounded-sm">
        <h3 className="text-[10px] font-bold uppercase text-red-600 tracking-wider mb-4">Add user</h3>
        <form onSubmit={createUser} className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
          <div>
            <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Name</label>
            <input
              className={inputClass}
              placeholder="Name"
              value={newUser.name}
              onChange={(e) => setNewUser((u) => ({ ...u, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">PIN</label>
            <input
              className={inputClass}
              placeholder="0000"
              maxLength={4}
              value={newUser.pin}
              onChange={(e) => setNewUser((u) => ({ ...u, pin: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Phone</label>
            <input
              className={inputClass}
              placeholder="937-555-1234"
              type="tel"
              value={newUser.phone}
              onChange={(e) => setNewUser((u) => ({ ...u, phone: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Role</label>
            <select
              className={inputClass}
              value={newUser.role}
              onChange={(e) => setNewUser((u) => ({ ...u, role: e.target.value }))}
            >
              <option value="tech">Tech</option>
              <option value="dispatcher">Dispatcher</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" className="bg-red-600 hover:bg-red-500 py-3 sm:py-4 font-bold uppercase text-sm text-white rounded-sm active:scale-[0.98]">
            Add
          </button>
        </form>
      </div>

      <div className="bg-neutral-950 border border-neutral-800 rounded-sm overflow-hidden">
        <div className="hidden sm:grid sm:grid-cols-5 gap-4 p-4 bg-neutral-900/50 text-[10px] font-bold uppercase text-neutral-500 tracking-wider border-b border-neutral-800">
          <div>Name</div>
          <div>Phone</div>
          <div>Role</div>
          <div>Status</div>
          <div className="text-right">Actions</div>
        </div>
        <div className="divide-y divide-neutral-800">
          {users.map((user) => (
            <div key={user.id} className="p-4 sm:p-5 hover:bg-neutral-900/30">
              <div className="hidden sm:grid sm:grid-cols-5 gap-4 items-center">
                <div className="font-bold text-white uppercase text-sm">{user.name}</div>
                <div className="text-neutral-400 text-sm font-mono">{user.phone || '—'}</div>
                <div className="flex gap-2 flex-wrap">
                  {['admin', 'tech', 'dispatcher'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(user.id, r)}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-sm border ${
                        user.role === r ? 'bg-red-600 border-red-600 text-white' : 'border-neutral-700 text-neutral-500 hover:text-white'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <div className={`text-[10px] font-bold uppercase ${user.must_change_pin ? 'text-amber-500' : 'text-green-600'}`}>
                  {user.must_change_pin ? 'Pending PIN' : 'Active'}
                </div>
                <div className="text-right flex gap-4 justify-end">
                  <button type="button" onClick={() => setEditPhone({ user, phone: user.phone || '' })} className="text-[10px] font-bold uppercase text-neutral-400 hover:text-white">
                    Phone
                  </button>
                  <button type="button" onClick={() => setEditPin({ user, pin: '' })} className="text-[10px] font-bold uppercase text-neutral-400 hover:text-white">
                    PIN
                  </button>
                  <button type="button" onClick={() => removeUser(user.id, user.name)} className="text-[10px] font-bold uppercase text-red-600 hover:text-red-500">
                    Remove
                  </button>
                </div>
              </div>
              <div className="sm:hidden space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-white uppercase">{user.name}</p>
                    <p className={`text-[10px] font-bold uppercase ${user.must_change_pin ? 'text-amber-500' : 'text-green-600'}`}>
                      {user.must_change_pin ? 'Pending PIN' : 'Active'}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button type="button" onClick={() => setEditPhone({ user, phone: user.phone || '' })} className="text-[10px] font-bold uppercase py-2 px-3 bg-neutral-800 rounded-sm">
                      Phone
                    </button>
                    <button type="button" onClick={() => setEditPin({ user, pin: '' })} className="text-[10px] font-bold uppercase py-2 px-3 bg-neutral-800 rounded-sm">
                      PIN
                    </button>
                    <button type="button" onClick={() => removeUser(user.id, user.name)} className="text-[10px] font-bold uppercase text-red-600">
                      Remove
                    </button>
                  </div>
                  {user.phone && <p className="text-[10px] text-neutral-500 font-mono mt-1">{user.phone}</p>}
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {['admin', 'tech', 'dispatcher'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(user.id, r)}
                      className={`text-[10px] font-bold px-4 py-2 rounded-sm border shrink-0 ${
                        user.role === r ? 'bg-red-600 border-red-600 text-white' : 'border-neutral-700 text-neutral-500'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editPin && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-950 border border-neutral-800 p-6 w-full max-w-sm rounded-sm">
            <h3 className="font-bold uppercase text-white mb-2">New PIN for {editPin.user.name}</h3>
            <input
              type="password"
              className={`${inputClass} mb-4`}
              placeholder="New PIN"
              value={editPin.pin}
              onChange={(e) => setEditPin((x) => x && { ...x, pin: e.target.value })}
            />
            <div className="flex gap-3">
              <button type="button" onClick={() => setEditPin(null)} className="flex-1 py-3 bg-neutral-800 font-bold uppercase text-sm text-white rounded-sm">
                Cancel
              </button>
              <button type="button" onClick={savePin} className="flex-1 py-3 bg-red-600 font-bold uppercase text-sm text-white rounded-sm">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {editPhone && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-950 border border-neutral-800 p-6 w-full max-w-sm rounded-sm">
            <h3 className="font-bold uppercase text-white mb-2">Phone for {editPhone.user.name}</h3>
            <input
              type="tel"
              className={`${inputClass} mb-4`}
              placeholder="937-555-1234"
              value={editPhone.phone}
              onChange={(e) => setEditPhone((x) => x && { ...x, phone: e.target.value })}
            />
            <div className="flex gap-3">
              <button type="button" onClick={() => setEditPhone(null)} className="flex-1 py-3 bg-neutral-800 font-bold uppercase text-sm text-white rounded-sm">
                Cancel
              </button>
              <button type="button" onClick={savePhone} className="flex-1 py-3 bg-red-600 font-bold uppercase text-sm text-white rounded-sm">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
