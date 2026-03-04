import React, { useState, useEffect } from 'react';
import { Users, Mail, Phone, Calendar, Shield, Sparkles, Loader2, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { analyzeAdminData } from '../../services/geminiService';
import ReactMarkdown from 'react-markdown';

export default function AdminUsers() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    fetch('/api/admin/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      setUsers(data);
      setLoading(true);
    })
    .catch(err => console.error(err))
    .finally(() => setLoading(false));
  }, [token]);

  const handleAIAnalysis = async () => {
    if (users.length === 0) return;
    setIsAnalyzing(true);
    const result = await analyzeAdminData(users, "User Demographics & Growth");
    setAiAnalysis(result || "Failed to analyze data.");
    setIsAnalyzing(false);
  };

  if (loading) return <div className="animate-pulse h-96 bg-white dark:bg-slate-800 rounded-3xl transition-colors" />;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-slate-100">Manage Customers</h1>
        <div className="flex items-center space-x-4">
          <button 
            onClick={handleAIAnalysis}
            disabled={isAnalyzing}
            className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700 transition-all disabled:opacity-50 shadow-lg"
          >
            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>AI User Analysis</span>
          </button>
          <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border border-black/5 dark:border-white/10 text-sm font-medium text-gray-500 dark:text-gray-400 transition-colors">
            Total Customers: {users.length}
          </div>
        </div>
      </div>

      {aiAnalysis && (
        <div className="bg-purple-50 dark:bg-purple-900/20 p-8 rounded-3xl border border-purple-100 dark:border-purple-800/30 relative animate-in fade-in slide-in-from-top-4 transition-colors">
          <button onClick={() => setAiAnalysis(null)} className="absolute top-4 right-4 text-purple-400 hover:text-purple-600 dark:hover:text-purple-300"><X className="w-6 h-6" /></button>
          <div className="flex items-center space-x-2 text-purple-700 dark:text-purple-400 font-bold mb-4">
            <Sparkles className="w-5 h-5" />
            <span>AI User Insights</span>
          </div>
          <div className="prose prose-sm max-w-none prose-p:text-purple-900/70 dark:prose-p:text-purple-200/70 prose-li:text-purple-900/70 dark:prose-li:text-purple-200/70">
            <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-black/5 dark:border-white/10 overflow-hidden shadow-sm transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-900/50 border-b border-black/5 dark:border-white/5">
                <th className="p-6 font-bold text-gray-600 dark:text-white">User</th>
                <th className="p-6 font-bold text-gray-600 dark:text-white">Contact</th>
                <th className="p-6 font-bold text-gray-600 dark:text-white">Joined</th>
                <th className="p-6 font-bold text-gray-600 dark:text-white">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {users.map((user: any) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <td className="p-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-[#D4820A]/10 flex items-center justify-center text-[#D4820A] font-bold">
                        {user.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-slate-100">{user.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">ID: #{user.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Mail className="w-3 h-3 mr-2" />
                        {user.email}
                      </div>
                      {user.phone && (
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <Phone className="w-3 h-3 mr-2" />
                          {user.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-6 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center">
                      <Calendar className="w-3 h-3 mr-2" />
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="p-6">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      user.role === 'admin' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    }`}>
                      <Shield className="w-3 h-3 inline mr-1" />
                      {user.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
