import React, { useState, useEffect } from 'react';
import { History, Search, Calendar, User, Activity, Globe, Eye, X, ArrowRight, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

interface AuditLog {
  id: number;
  user_id: number;
  user_email: string;
  action: string;
  resource_type: string;
  resource_id: string;
  old_value: any;
  new_value: any;
  ip_address: string;
  created_at: string;
}

export default function AuditLogs() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        ...(actionFilter && { action: actionFilter })
      });
      const res = await fetch(`/api/admin/audit-logs?${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('DELETE')) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    if (action.includes('CREATE')) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (action.includes('UPDATE')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col space-y-4">
        <Link to="/admin" className="flex items-center text-sm font-bold text-[#D4820A] hover:underline">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="bg-[#D4820A]/10 p-3 rounded-2xl text-[#D4820A]">
              <History className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-slate-100">Audit Trail</h1>
              <p className="text-gray-500 dark:text-slate-400">Track all administrative actions</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                className="pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-black/5 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#D4820A]/20 transition-all appearance-none"
              >
                <option value="">All Actions</option>
                <option value="CREATE_PRODUCT">Create Product</option>
                <option value="UPDATE_PRODUCT">Update Product</option>
                <option value="DELETE_PRODUCT">Delete Product</option>
                <option value="UPDATE_ORDER_STATUS">Update Order Status</option>
                <option value="CREATE_PROMO">Create Promo</option>
                <option value="DELETE_PROMO">Delete Promo</option>
                <option value="CREDIT_WALLET">Credit Wallet</option>
                <option value="CREATE_DELIVERY_STAFF">Create Delivery Staff</option>
                <option value="UPDATE_DELIVERY_ZONE">Update Delivery Zone</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-black/5 dark:border-white/10 overflow-hidden shadow-sm transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-900/50 border-b border-black/5 dark:border-white/5">
                <th className="p-6 font-bold text-gray-600 dark:text-white">Timestamp</th>
                <th className="p-6 font-bold text-gray-600 dark:text-white">Admin</th>
                <th className="p-6 font-bold text-gray-600 dark:text-white">Action</th>
                <th className="p-6 font-bold text-gray-600 dark:text-white">Resource</th>
                <th className="p-6 font-bold text-gray-600 dark:text-white">IP Address</th>
                <th className="p-6 font-bold text-gray-600 dark:text-white">Changes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="p-6"><div className="h-4 bg-gray-100 dark:bg-white/5 rounded w-full" /></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-500 dark:text-slate-400">
                    No audit logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-6">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="w-3 h-3 mr-2" />
                        {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-slate-100">{log.user_email}</span>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getActionColor(log.action)}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-6">
                      <div className="space-y-1">
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <Activity className="w-3 h-3 mr-1" />
                          {log.resource_type}
                        </div>
                        <div className="text-[10px] font-mono text-gray-400">ID: {log.resource_id}</div>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <Globe className="w-3 h-3 mr-1" />
                        {log.ip_address}
                      </div>
                    </td>
                    <td className="p-6">
                      {(log.old_value || log.new_value) ? (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="flex items-center space-x-1 text-[#D4820A] hover:underline text-xs font-bold"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Changes</span>
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No data</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-6 bg-gray-50 dark:bg-slate-900/50 border-t border-black/5 dark:border-white/5 flex justify-between items-center">
          <button
            disabled={page === 1 || loading}
            onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-400 disabled:opacity-50 hover:text-[#D4820A] transition-colors"
          >
            Previous
          </button>
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Page {page}</span>
          <button
            disabled={logs.length < 50 || loading}
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-400 disabled:opacity-50 hover:text-[#D4820A] transition-colors"
          >
            Next
          </button>
        </div>
      </div>

      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-black/5 dark:border-white/10 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Change Details</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">{selectedLog.action} on {selectedLog.resource_type} #{selectedLog.resource_id}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto">
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">Old Value</h4>
                <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-2xl border border-black/5 dark:border-white/5 overflow-x-auto">
                  {selectedLog.old_value ? (
                    <pre className="text-[10px] font-mono text-red-600 dark:text-red-400 whitespace-pre-wrap">
                      {JSON.stringify(selectedLog.old_value, null, 2)}
                    </pre>
                  ) : (
                    <span className="text-sm text-gray-400 italic">None</span>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">New Value</h4>
                <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-2xl border border-black/5 dark:border-white/5 overflow-x-auto">
                  {selectedLog.new_value ? (
                    <pre className="text-[10px] font-mono text-green-600 dark:text-green-400 whitespace-pre-wrap">
                      {JSON.stringify(selectedLog.new_value, null, 2)}
                    </pre>
                  ) : (
                    <span className="text-sm text-gray-400 italic">None</span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 dark:bg-slate-900/50 border-t border-black/5 dark:border-white/10 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
