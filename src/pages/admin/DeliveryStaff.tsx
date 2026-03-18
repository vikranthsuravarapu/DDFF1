import React, { useState, useEffect } from 'react';
import { Bike, Mail, Phone, Calendar, Shield, Sparkles, Loader2, X, UserPlus, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { analyzeAdminData } from '../../services/geminiService';
import ReactMarkdown from 'react-markdown';

export default function AdminDeliveryStaff() {
  const { token, apiFetch } = useAuth();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStaff();
  }, [token]);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/admin/delivery-boys');
      const data = await res.json();
      setStaff(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAIAnalysis = async () => {
    if (staff.length === 0) return;
    setIsAnalyzing(true);
    const result = await analyzeAdminData(staff, "Delivery Staff Performance & Capacity");
    setAiAnalysis(result || "Failed to analyze data.");
    setIsAnalyzing(false);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to remove this staff member?')) return;
    
    try {
      const res = await apiFetch(`/api/admin/delivery-boys/${id}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete staff');
      }
      
      fetchStaff();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await apiFetch('/api/admin/delivery-boys', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newStaff)
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add staff');
      }
      
      setIsAddingStaff(false);
      setNewStaff({ name: '', email: '', password: '', phone: '' });
      fetchStaff();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div className="animate-pulse h-96 bg-white dark:bg-slate-800 rounded-3xl transition-colors" />;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-slate-100">Manage Delivery Staff</h1>
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setIsAddingStaff(true)}
            className="flex items-center space-x-2 bg-[#D4820A] text-white px-4 py-2 rounded-xl hover:bg-[#B87008] transition-all shadow-lg"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Staff</span>
          </button>
          <button 
            onClick={handleAIAnalysis}
            disabled={isAnalyzing}
            className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700 transition-all disabled:opacity-50 shadow-lg"
          >
            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>AI Staff Analysis</span>
          </button>
        </div>
      </div>

      {aiAnalysis && (
        <div className="bg-purple-50 dark:bg-purple-900/20 p-8 rounded-3xl border border-purple-100 dark:border-purple-800/30 relative animate-in fade-in slide-in-from-top-4 transition-colors">
          <button onClick={() => setAiAnalysis(null)} className="absolute top-4 right-4 text-purple-400 hover:text-purple-600 dark:hover:text-purple-300"><X className="w-6 h-6" /></button>
          <div className="flex items-center space-x-2 text-purple-700 dark:text-purple-400 font-bold mb-4">
            <Sparkles className="w-5 h-5" />
            <span>AI Staff Insights</span>
          </div>
          <div className="prose prose-sm max-w-none prose-p:text-purple-900/70 dark:prose-p:text-purple-200/70 prose-li:text-purple-900/70 dark:prose-li:text-purple-200/70">
            <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
          </div>
        </div>
      )}

      {isAddingStaff && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Add New Delivery Staff</h2>
              <button onClick={() => setIsAddingStaff(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            
            <form onSubmit={handleAddStaff} className="space-y-4">
              {error && <p className="text-red-500 text-sm font-bold">{error}</p>}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={newStaff.name}
                  onChange={e => setNewStaff({...newStaff, name: e.target.value})}
                  className="w-full p-3 rounded-xl border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-all"
                  placeholder="Enter name"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Email Address</label>
                <input 
                  type="email" 
                  required
                  value={newStaff.email}
                  onChange={e => setNewStaff({...newStaff, email: e.target.value})}
                  className="w-full p-3 rounded-xl border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-all"
                  placeholder="staff@ddff.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Password</label>
                <input 
                  type="password" 
                  required
                  value={newStaff.password}
                  onChange={e => setNewStaff({...newStaff, password: e.target.value})}
                  className="w-full p-3 rounded-xl border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-all"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Phone Number</label>
                <input 
                  type="tel" 
                  required
                  value={newStaff.phone}
                  onChange={e => setNewStaff({...newStaff, phone: e.target.value})}
                  className="w-full p-3 rounded-xl border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-all"
                  placeholder="+91 98765 43210"
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-[#D4820A] text-white font-bold py-4 rounded-xl hover:bg-[#B87008] transition-all shadow-lg shadow-[#D4820A]/20 mt-4"
              >
                Create Staff Account
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-black/5 dark:border-white/10 overflow-hidden shadow-sm transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-900/50 border-b border-black/5 dark:border-white/5">
                <th className="p-6 font-bold text-gray-600 dark:text-white">Staff Member</th>
                <th className="p-6 font-bold text-gray-600 dark:text-white">Contact Info</th>
                <th className="p-6 font-bold text-gray-600 dark:text-white">Status</th>
                <th className="p-6 font-bold text-gray-600 dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {staff.map((member: any) => (
                <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <td className="p-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors">
                        <Bike className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-slate-100">{member.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Staff ID: #DS-{member.id.toString().padStart(3, '0')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Mail className="w-3 h-3 mr-2" />
                        {member.email}
                      </div>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Phone className="w-3 h-3 mr-2" />
                        {member.phone || 'No phone'}
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                      Active
                    </span>
                  </td>
                  <td className="p-6">
                    <button 
                      onClick={() => handleDelete(member.id)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-gray-500 dark:text-gray-400">
                    No delivery staff members found.
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
