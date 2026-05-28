import React, { useEffect, useState } from 'react';
import { History, Search, RefreshCw, FileText } from 'lucide-react';

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

interface AuditTabProps {
  token: string;
}

export function AuditTab({ token }: AuditTabProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/audit-logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setLogs(data);
    } catch (e) {
      console.error('Failed to coordinate secure audits pull:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [token]);

  const filteredLogs = logs.filter(l => 
    l.action.toLowerCase().includes(search.toLowerCase()) || 
    l.userName.toLowerCase().includes(search.toLowerCase()) ||
    l.details.toLowerCase().includes(search.toLowerCase()) ||
    l.entity.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div id="audit-viewport" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Administrative Audit Trails</h1>
          <p className="text-sm text-slate-500 font-sans">Immutable, serialized logging indexing administrative workspace activities</p>
        </div>
        <button
          id="refresh-audit"
          onClick={fetchLogs}
          className="flex items-center space-x-1 border hover:bg-slate-50 border-slate-200 bg-white font-semibold px-4 py-2 rounded-xl text-xs transition shadow-sm"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Reload stream</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="relative w-72">
            <input
              id="audit-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter actions, usernames, details..."
              className="text-xs p-1.5 pl-3 border border-slate-300 rounded-lg w-full outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2.5 py-0.5 rounded-full border">
            {filteredLogs.length} events traced
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Timestamp Period</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Responsible User</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Core Event Action</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Audit details context</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Identified Entity</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200" id="audit-table-body">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-500 font-mono">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-6 w-6 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center mr-2">
                        {log.userName[0]}
                      </div>
                      <span className="text-xs font-semibold text-slate-905">{log.userName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 border border-blue-100 text-blue-700 font-mono">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-620 max-w-sm">
                    {log.details}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-500 font-mono">
                    {log.entity} ({log.entityId.substring(0, 8)})
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-xs text-slate-500">
                    No tracing logged event streams matched searches.
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
