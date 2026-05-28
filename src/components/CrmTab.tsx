import React, { useEffect, useState } from 'react';
import { 
  Users, UserPlus, Heart, PhoneCall, Mail, Trash2, 
  MessageSquare, Star, Plus, Check, Filter, Search, Tag, ExternalLink 
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  companyName: string;
  email: string;
  phone: string;
  status: 'Lead' | 'Contact' | 'Customer' | 'Inactive';
  leadScore: number;
  stage: 'Prospect' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';
  tags: string[];
}

interface CommLog {
  id: string;
  type: string;
  content: string;
  createdBy: string;
  createdAt: string;
}

interface CrmTabProps {
  token: string;
  userRole: string;
}

export function CrmTab({ token, userRole }: CrmTabProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('All');
  
  // Selection details state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [comms, setComms] = useState<CommLog[]>([]);
  const [newCommText, setNewCommText] = useState('');
  const [newCommType, setNewCommType] = useState<'Email' | 'Call' | 'Note' | 'Meeting'>('Call');

  // Input states for Add/Update
  const [isAdding, setIsAdding] = useState(false);
  const [cName, setCName] = useState('');
  const [cCompany, setCCompany] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cStatus, setCStatus] = useState<'Lead' | 'Contact' | 'Customer' | 'Inactive'>('Lead');
  const [cStage, setCStage] = useState<'Prospect' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost'>('Prospect');
  const [cScore, setCScore] = useState(50);
  const [cTagsStr, setCTagsStr] = useState('Tech');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/crm/clients', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setClients(data);
      if (data.length > 0 && !selectedClient) {
        setSelectedClient(data[0]);
      }
    } catch (e) {
      console.error('Failed to coordinate client fetch:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommunications = async (clientId: string) => {
    try {
      const res = await fetch(`/api/crm/clients/${clientId}/communications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setComms(data);
    } catch (e) {
      console.error('Failed to pull connection historylogs:', e);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [token]);

  useEffect(() => {
    if (selectedClient) {
      fetchCommunications(selectedClient.id);
    }
  }, [selectedClient]);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!cName || !cEmail) {
      setErrorMsg('Client Name and email are required attributes.');
      return;
    }

    try {
      const res = await fetch('/api/crm/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: cName,
          companyName: cCompany,
          email: cEmail,
          phone: cPhone,
          status: cStatus,
          stage: cStage,
          leadScore: Number(cScore),
          tags: cTagsStr.split(',').map(t => t.trim()).filter(Boolean)
        })
      });

      if (!res.ok) throw new Error('Could not record client details.');
      
      const newClient = await res.json();
      setClients([newClient, ...clients]);
      setSelectedClient(newClient);
      setIsAdding(false);
      resetAddForm();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm('Are you absolutely sure you want to drop this client relationship trace?')) return;
    try {
      const res = await fetch(`/api/crm/clients/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Drop transaction failed.');
      
      const remaining = clients.filter(c => c.id !== id);
      setClients(remaining);
      if (selectedClient?.id === id) {
        setSelectedClient(remaining[0] || null);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePostCommLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !newCommText) return;

    try {
      const res = await fetch(`/api/crm/clients/${selectedClient.id}/communications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type: newCommType, content: newCommText })
      });
      
      const loggedObj = await res.json();
      setComms([loggedObj, ...comms]);
      setNewCommText('');
    } catch (e) {
      console.error('Communication log dispatch missed:', e);
    }
  };

  const resetAddForm = () => {
    setCName('');
    setCCompany('');
    setCEmail('');
    setCPhone('');
    setCStatus('Lead');
    setCStage('Prospect');
    setCScore(50);
    setCTagsStr('Tech');
  };

  // Drag simulation / rapid Stage progression update
  const advanceStage = async (clientId: string, nextStage: Client['stage']) => {
    try {
      const parent = clients.find(c => c.id === clientId);
      if (!parent) return;

      const res = await fetch(`/api/crm/clients/${clientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ stage: nextStage })
      });

      const updated = await res.json();
      setClients(clients.map(c => c.id === clientId ? updated : c));
      if (selectedClient?.id === clientId) {
        setSelectedClient(updated);
      }
    } catch (e) {
      console.error('Stage update fails:', e);
    }
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || 
                          c.companyName.toLowerCase().includes(search.toLowerCase()) ||
                          c.email.toLowerCase().includes(search.toLowerCase());
    
    if (filterStage === 'All') return matchesSearch;
    return matchesSearch && c.stage === filterStage;
  });

  const getLeadScoreBadge = (score: number) => {
    if (score >= 80) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (score >= 55) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  const getStageBadgeColor = (stage: Client['stage']) => {
    switch (stage) {
      case 'Won': return 'bg-emerald-500 text-white';
      case 'Lost': return 'bg-rose-500 text-white';
      case 'Negotiation': return 'bg-purple-500 text-white';
      case 'Proposal': return 'bg-blue-500 text-white';
      case 'Qualified': return 'bg-cyan-500 text-white';
      default: return 'bg-amber-500 text-white';
    }
  };

  return (
    <div id="crm-viewport" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Affiliate Relationship Console (CRM)</h1>
          <p className="text-sm text-slate-500">Qualify inbound leads, scoring corporate pipelines, and timeline interactions</p>
        </div>
        <button
          id="toggle-add-client"
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-md shadow-blue-100"
        >
          <UserPlus className="h-4 w-4" />
          <span>Capture Lead</span>
        </button>
      </div>

      {/* Slide-out Add Client Panel */}
      {isAdding && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Onboard CRM Client Ledger Item</h3>
          {errorMsg && <p className="text-xs font-semibold text-rose-500 bg-rose-50 p-2 rounded">{errorMsg}</p>}
          <form onSubmit={handleAddClient} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700">Client Contact Person</label>
              <input
                id="crm-add-name"
                type="text"
                required
                value={cName}
                onChange={(e) => setCName(e.target.value)}
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
                placeholder="Jane Foster"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Enterprise Company</label>
              <input
                id="crm-add-company"
                type="text"
                value={cCompany}
                onChange={(e) => setCCompany(e.target.value)}
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
                placeholder="Thor Logistics"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Direct Email</label>
              <input
                id="crm-add-email"
                type="email"
                required
                value={cEmail}
                onChange={(e) => setCEmail(e.target.value)}
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
                placeholder="jane@thor.org"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Telephone Line</label>
              <input
                id="crm-add-phone"
                type="text"
                value={cPhone}
                onChange={(e) => setCPhone(e.target.value)}
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
                placeholder="+1-555-4923"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Status Categorization</label>
              <select
                id="crm-add-status"
                value={cStatus}
                onChange={(e: any) => setCStatus(e.target.value)}
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 bg-white rounded-lg text-xs"
              >
                <option value="Lead">Inbound Lead</option>
                <option value="Contact">Negotiant Contact</option>
                <option value="Customer">Validated Customer</option>
                <option value="Inactive">Retention Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Sales Stage</label>
              <select
                id="crm-add-stage"
                value={cStage}
                onChange={(e: any) => setCStage(e.target.value)}
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 bg-white rounded-lg text-xs"
              >
                <option value="Prospect">Prospect</option>
                <option value="Qualified">Qualified</option>
                <option value="Proposal">Proposal</option>
                <option value="Negotiation">Negotiation</option>
                <option value="Won">Deals Won</option>
                <option value="Lost">Deals Lost</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Lead Score (0-100)</label>
              <input
                id="crm-add-score"
                type="number"
                min="0"
                max="100"
                value={cScore}
                onChange={(e) => setCScore(Number(e.target.value))}
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Tags (comma-separated)</label>
              <input
                id="crm-add-tags"
                type="text"
                value={cTagsStr}
                onChange={(e) => setCTagsStr(e.target.value)}
                className="mt-1 block w-full py-1.5 px-3 border border-slate-300 rounded-lg text-xs"
                placeholder="Tech, Outbound"
              />
            </div>
            <div className="md:col-span-4 flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                id="crm-add-cancel"
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                id="crm-add-submit"
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition shadow-sm"
              >
                Onboard CRM Client
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search & Filter Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            id="crm-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full pl-10 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
            placeholder="Search CRM Contacts, emails, and firms..."
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            id="crm-stage-filter"
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="block py-1.5 pl-3 pr-8 border border-slate-300 bg-white rounded-lg text-xs"
          >
            <option value="All">All Pipelines</option>
            <option value="Prospect">Prospect</option>
            <option value="Qualified">Qualified</option>
            <option value="Proposal">Proposal</option>
            <option value="Negotiation">Negotiation</option>
            <option value="Won">Won</option>
            <option value="Lost">Lost</option>
          </select>
        </div>
      </div>

      {/* Main workspace layout split list vs communications log details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clients Spreadsheet Grid */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm lg:col-span-2 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h4 className="font-bold text-slate-900 text-sm">Valid CRM Registry Accounts</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Contact / Corporate</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Metrics Score</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pipeline Stage</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200" id="crm-table-body">
                {filteredClients.map((client) => (
                  <tr 
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className={`hover:bg-blue-50/20 cursor-pointer transition ${selectedClient?.id === client.id ? 'bg-blue-50/40 font-medium' : ''}`}
                  >
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs ring-2 ring-slate-100">
                          {client.name[0]}
                        </div>
                        <div className="ml-3">
                          <p className="text-xs font-semibold text-slate-900">{client.name}</p>
                          <p className="text-[10px] text-slate-500">{client.companyName || 'Private Contact'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getLeadScoreBadge(client.leadScore)}`}>
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        {client.leadScore} pts
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <select
                        id={`crm-update-stage-${client.id}`}
                        onClick={(e) => e.stopPropagation()} // Stop row selections
                        value={client.stage}
                        onChange={(e: any) => advanceStage(client.id, e.target.value)}
                        className={`text-[10px] rounded px-2 py-0.5 font-bold outline-none border border-transparent ${getStageBadgeColor(client.stage)}`}
                      >
                        <option value="Prospect">Prospect</option>
                        <option value="Qualified">Qualified</option>
                        <option value="Proposal">Proposal</option>
                        <option value="Negotiation">Negotiation</option>
                        <option value="Won">Won</option>
                        <option value="Lost">Lost</option>
                      </select>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right text-xs">
                      <div className="flex items-center justify-end space-x-2" onClick={e => e.stopPropagation()}>
                        {(userRole === 'Admin' || userRole === 'Manager' || userRole === 'Super_Admin') && (
                          <button
                            id={`crm-delete-btn-${client.id}`}
                            onClick={() => handleDeleteClient(client.id)}
                            className="text-slate-400 hover:text-red-500 p-1 rounded"
                            title="Drop details mapping"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <span className="text-slate-300">|</span>
                        <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-6 text-center text-xs text-slate-500 font-medium">
                      No CRM contacts resolved matching searches.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Customer Relationship Timelines Profile */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 h-fit space-y-4">
          {selectedClient ? (
            <div id="crm-profile-panel" className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <Heart className="h-4.5 w-4.5 text-blue-600 fill-blue-50" />
                  <h4 className="font-bold text-slate-900 text-sm">Account Engagement Timeline</h4>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">Contact profiles: {selectedClient.name}</p>
              </div>

              {/* Direct profiles contact info */}
              <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-2 border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Corporate:</span>
                  <span className="font-semibold text-slate-800">{selectedClient.companyName || 'Unassigned'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Email:</span>
                  <a href={`mailto:${selectedClient.email}`} className="text-blue-600 hover:underline">{selectedClient.email}</a>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Direct Telephone:</span>
                  <span className="font-mono text-slate-800">{selectedClient.phone || 'Unavailable'}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-1">
                  {selectedClient.tags.map((tg, i) => (
                    <span key={i} className="inline-flex items-center px-1.5 py-0.25 bg-blue-50 border border-blue-100 text-[9px] text-blue-700 font-semibold rounded">
                      <Tag className="h-2 w-2 mr-1" />
                      {tg}
                    </span>
                  ))}
                </div>
              </div>

              {/* Interaction log submit form */}
              <form onSubmit={handlePostCommLog} className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700">Log Engagement Action</label>
                  <select
                    id="crm-comm-type"
                    value={newCommType}
                    onChange={(e: any) => setNewCommType(e.target.value)}
                    className="text-[10px] pl-1 pr-4 py-0.5 bg-slate-50 border border-slate-200 rounded"
                  >
                    <option value="Call">Phone Call</option>
                    <option value="Email">Email Thread</option>
                    <option value="Meeting">Direct Meeting</option>
                    <option value="Note">Internal Notes</option>
                  </select>
                </div>
                <textarea
                  id="crm-comm-text"
                  required
                  value={newCommText}
                  onChange={(e) => setNewCommText(e.target.value)}
                  className="block w-full text-xs p-2 border border-slate-300 rounded-lg h-16 resize-none placeholder-slate-400 focus:outline-none"
                  placeholder="Record summary details of this interaction..."
                />
                <button
                  id="crm-comm-submit"
                  type="submit"
                  className="w-full flex items-center justify-center space-x-1 py-1.5 bg-slate-800 hover:bg-slate-900 border border-transparent rounded-lg text-white font-semibold text-xs transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Log Activity</span>
                </button>
              </form>

              {/* Flow Timeline logs */}
              <div className="flow-root pt-2 border-t border-slate-100 max-h-48 overflow-y-auto">
                <ul className="space-y-3">
                  {comms.map((log) => (
                    <li key={log.id} className="text-xs">
                      <div className="flex items-start space-x-2">
                        <div className="bg-slate-100 rounded-md p-1 shrink-0 mt-0.5 text-slate-700">
                          {log.type === 'Call' ? <PhoneCall className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-semibold text-slate-800">
                            {log.createdBy} <span className="text-[9px] font-normal text-slate-400">({log.type})</span>
                          </p>
                          <p className="text-[11px] text-slate-600 mt-0.5 leading-tight">{log.content}</p>
                          <p className="text-[9px] text-slate-400 mt-1 font-mono">
                            {new Date(log.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                  {comms.length === 0 && (
                    <p className="text-center text-[10px] text-slate-400 py-4">No logged interactions trace found.</p>
                  )}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-center text-xs text-slate-500 py-8">Select contact file node to review interaction trail metrics.</p>
          )}
        </div>
      </div>
    </div>
  );
}
