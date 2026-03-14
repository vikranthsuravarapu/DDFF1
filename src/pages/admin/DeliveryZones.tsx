import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Trash2, Edit2, Save, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DeliveryZone {
  id: number;
  name: string;
  pincode: string;
  min_order_amount: number;
  delivery_fee: number;
  is_active: boolean;
}

export default function DeliveryZones() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    pincode: '',
    min_order_amount: 0,
    delivery_fee: 0
  });

  const fetchZones = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/delivery-zones', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch delivery zones');
      const data = await response.json();
      setZones(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/delivery-zones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (!response.ok) throw new Error('Failed to add delivery zone');
      await fetchZones();
      setIsAdding(false);
      setFormData({ name: '', pincode: '', min_order_amount: 0, delivery_fee: 0 });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdate = async (id: number, updates: Partial<DeliveryZone>) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/delivery-zones/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update delivery zone');
      await fetchZones();
      setEditingId(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this delivery zone?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/delivery-zones/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to delete delivery zone');
      await fetchZones();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4820A]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Delivery Zones</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Manage villages and delivery charges</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center px-6 py-3 bg-[#D4820A] text-white rounded-2xl font-bold hover:bg-[#F39C12] transition-all shadow-lg shadow-[#D4820A]/20"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add New Zone
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-2xl flex items-center text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-[#D4820A]/30 p-6 space-y-4"
            >
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">New Delivery Zone</h3>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Village Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#D4820A]"
                    placeholder="e.g. Guntur"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Pincode</label>
                  <input
                    type="text"
                    required
                    value={formData.pincode}
                    onChange={e => setFormData({ ...formData, pincode: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#D4820A]"
                    placeholder="e.g. 522001"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Min Order (₹)</label>
                    <input
                      type="number"
                      required
                      value={formData.min_order_amount}
                      onChange={e => setFormData({ ...formData, min_order_amount: Number(e.target.value) })}
                      className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#D4820A]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Fee (₹)</label>
                    <input
                      type="number"
                      required
                      value={formData.delivery_fee}
                      onChange={e => setFormData({ ...formData, delivery_fee: Number(e.target.value) })}
                      className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#D4820A]"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-[#D4820A] text-white py-2 rounded-xl font-bold hover:bg-[#F39C12] transition-all"
                  >
                    Save Zone
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {zones.map((zone) => (
            <motion.div
              layout
              key={zone.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white dark:bg-slate-900 rounded-3xl p-6 border border-black/5 dark:border-white/10 shadow-sm hover:shadow-md transition-all ${!zone.is_active ? 'opacity-60 grayscale' : ''}`}
            >
              {editingId === zone.id ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={zone.name}
                    onChange={e => {
                      const newZones = zones.map(z => z.id === zone.id ? { ...z, name: e.target.value } : z);
                      setZones(newZones);
                    }}
                    className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-gray-900 dark:text-white font-bold"
                  />
                  <input
                    type="text"
                    value={zone.pincode}
                    onChange={e => {
                      const newZones = zones.map(z => z.id === zone.id ? { ...z, pincode: e.target.value } : z);
                      setZones(newZones);
                    }}
                    className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-gray-900 dark:text-white"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="number"
                      value={zone.min_order_amount}
                      onChange={e => {
                        const newZones = zones.map(z => z.id === zone.id ? { ...z, min_order_amount: Number(e.target.value) } : z);
                        setZones(newZones);
                      }}
                      className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-gray-900 dark:text-white"
                    />
                    <input
                      type="number"
                      value={zone.delivery_fee}
                      onChange={e => {
                        const newZones = zones.map(z => z.id === zone.id ? { ...z, delivery_fee: Number(e.target.value) } : z);
                        setZones(newZones);
                      }}
                      className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdate(zone.id, zone)}
                      className="flex-1 bg-green-500 text-white py-2 rounded-xl font-bold hover:bg-green-600 transition-all flex items-center justify-center"
                    >
                      <Save className="w-4 h-4 mr-2" /> Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 rounded-xl font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-[#D4820A]/10 rounded-2xl text-[#D4820A]">
                        <MapPin className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{zone.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400 font-mono">{zone.pincode}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => setEditingId(zone.id)}
                        className="p-2 text-gray-400 hover:text-[#D4820A] hover:bg-[#D4820A]/10 rounded-xl transition-all"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(zone.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-2">
                    <div className="p-3 bg-gray-50 dark:bg-slate-800/50 rounded-2xl">
                      <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Min Order</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">₹{zone.min_order_amount}</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-slate-800/50 rounded-2xl">
                      <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Delivery Fee</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">₹{zone.delivery_fee}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${zone.is_active ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-slate-800'}`}>
                      {zone.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => handleUpdate(zone.id, { is_active: !zone.is_active })}
                      className={`text-sm font-bold transition-all ${zone.is_active ? 'text-red-500 hover:text-red-600' : 'text-green-500 hover:text-green-600'}`}
                    >
                      {zone.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
