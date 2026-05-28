import React, { useState, useEffect, useRef } from 'react';
import { 
  Cloud, Calendar, MessageSquare, Folder, Plus, Search, Trash2, 
  ExternalLink, FileText, FileSpreadsheet, UploadCloud, CheckCircle, 
  Video, Send, RefreshCw, AlertCircle, Sparkles, LogIn, LogOut, Info, ShieldAlert
} from 'lucide-react';
import { googleSignIn, logout, getAccessToken, auth } from '../lib/workspaceAuth.js';
import { User } from 'firebase/auth';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  modifiedTime?: string;
  size?: string;
}

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  hangoutLink?: string;
  location?: string;
}

interface ChatSpace {
  name: string; // Resource name: e.g. "spaces/AAAAxxxx"
  displayName?: string;
  type?: string;
}

export function WorkspaceTab() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  // Tab states: 'drive' | 'calendar' | 'chat'
  const [subTab, setSubTab] = useState<'drive' | 'calendar' | 'chat'>('drive');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Drive States
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [driveSearch, setDriveSearch] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calendar States
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    summary: '',
    description: '',
    location: '',
    startDate: '',
    startTime: '10:00',
    endDate: '',
    endTime: '11:00',
    attendees: '',
    createMeet: true
  });

  // Chat States
  const [chatSpaces, setChatSpaces] = useState<ChatSpace[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState('');
  const [customSpaceId, setCustomSpaceId] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [chatLogs, setChatLogs] = useState<{ id: string; space: string; message: string; timestamp: string }[]>([]);

  // Modals / Dialog confirmations
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'file' | 'event'; id: string; name: string } | null>(null);

  // Check auth state from memory
  useEffect(() => {
    const checkAuth = async () => {
      const activeToken = await getAccessToken();
      if (activeToken && auth.currentUser) {
        setToken(activeToken);
        setUser(auth.currentUser);
        // Load initial drive subtab
        fetchDriveFiles(activeToken);
      }
    };
    checkAuth();
  }, []);

  const handleConnect = async () => {
    setIsAuthenticating(true);
    setError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setSuccessMsg("Connected Google Workspace successfully!");
        setTimeout(() => setSuccessMsg(null), 4000);
        // Trigger data load
        if (subTab === 'drive') fetchDriveFiles(result.accessToken);
        else if (subTab === 'calendar') fetchCalendarEvents(result.accessToken);
        else if (subTab === 'chat') fetchChatSpaces(result.accessToken);
      }
    } catch (err: any) {
      setError(err?.message || "Google Workspace Authentication connection aborted.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDisconnect = async () => {
    if (window.confirm("Disconnect your Google Workspace credentials?")) {
      await logout();
      setToken(null);
      setUser(null);
      setDriveFiles([]);
      setCalendarEvents([]);
      setChatSpaces([]);
      setSuccessMsg("Disconnected corporate Google Workspace account.");
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  // Subtab switching pulls fresh metadata
  const switchSubTab = (newSub: 'drive' | 'calendar' | 'chat') => {
    setSubTab(newSub);
    setError(null);
    if (!token) return;

    if (newSub === 'drive') {
      fetchDriveFiles(token);
    } else if (newSub === 'calendar') {
      fetchCalendarEvents(token);
    } else if (newSub === 'chat') {
      fetchChatSpaces(token);
    }
  };

  // ==================== DRIVE HANDLERS ====================
  const fetchDriveFiles = async (accessToken: string) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch files metadata list
      const queryParams = encodeURIComponent("trashed = false");
      const url = `https://www.googleapis.com/drive/v3/files?pageSize=20&fields=files(id,name,mimeType,webViewLink,modifiedTime,size)&q=${queryParams}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error("Could not list Google Drive files");
      const data = await res.json();
      setDriveFiles(data.files || []);
    } catch (err: any) {
      setError(err.message || "Failed to sync assets from Google Drive.");
    } finally {
      setLoading(false);
    }
  };

  // Trigger document scaffolding actions
  const handleDraftWorkspaceDoc = async (docType: 'doc' | 'sheet') => {
    if (!token) return;
    setLoading(true);
    try {
      const isSheet = docType === 'sheet';
      const fileMetadata = {
        name: isSheet ? `Corporate Budget Sheet - ${new Date().toLocaleDateString()}` : `BMS Operation Audit Report - ${new Date().toLocaleDateString()}`,
        mimeType: isSheet ? 'application/vnd.google-apps.spreadsheet' : 'application/vnd.google-apps.document',
      };

      const res = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fileMetadata)
      });

      if (!res.ok) throw new Error(`Could not scaffold corporate Google ${isSheet ? 'Sheet' : 'Doc'}`);
      const file = await res.json();

      setSuccessMsg(`Successfully designed a template Google ${isSheet ? 'Sheet' : 'Doc'}: ${file.name}`);
      setTimeout(() => setSuccessMsg(null), 5000);

      // Refresh list
      fetchDriveFiles(token);
    } catch (err: any) {
      setError(err.message || "Scaffolding file template failed.");
    } finally {
      setLoading(false);
    }
  };

  // Support local Drag-and-Drop and File click triggers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFileToDrive(e.dataTransfer.files[0]);
    }
  };

  const handleManualFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await uploadFileToDrive(e.target.files[0]);
    }
  };

  const uploadFileToDrive = async (file: File) => {
    if (!token) return;
    setIsUploading(true);
    setError(null);
    try {
      // Step A: Create matching file schema nodes on Google Drive
      const metadataSchema = {
        name: file.name,
        mimeType: file.type || 'application/octet-stream'
      };

      const metaRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadataSchema)
      });
      if (!metaRes.ok) throw new Error("Could not construct file placeholder on target cloud workspace");
      const createdFile = await metaRes.json();

      // Step B: Upload file raw buffer streams to designated ID node
      const uploadRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${createdFile.id}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': file.type || 'application/octet-stream'
        },
        body: file
      });
      if (!uploadRes.ok) throw new Error("Failed to post payload streams to placeholder location");

      setSuccessMsg(`File '${file.name}' completely cached & synced to Cloud Workspace!`);
      setTimeout(() => setSuccessMsg(null), 5000);
      fetchDriveFiles(token);
    } catch (err: any) {
      setError(err.message || "Sync failed during document streams uploading.");
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileDelete = (fileId: string, fileName: string) => {
    // Stage custom confirm dialog variables
    setDeleteTarget({ type: 'file', id: fileId, name: fileName });
  };

  const executeFileDelete = async (fileId: string) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Delete operation refused on Cloud drive elements");
      setSuccessMsg(`Asset successfully purged from Google Drive.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchDriveFiles(token);
    } catch (err: any) {
      setError(err.message || "Workspace file purge failed.");
    } finally {
      setLoading(false);
      setDeleteTarget(null);
    }
  };

  // ==================== CALENDAR HANDLERS ====================
  const fetchCalendarEvents = async (accessToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const nowString = new Date().toISOString();
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${nowString}&orderBy=startTime&singleEvents=true&maxResults=15`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error("Failed to fetch Google Calendar appointments registry");
      const data = await res.json();
      setCalendarEvents(data.items || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch corporate calendar workspace.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeetingEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      // Build Google Meet timings strings in correct pattern
      const startDateTime = `${newEvent.startDate}T${newEvent.startTime}:00`;
      const endDateTime = `${newEvent.endDate || newEvent.startDate}T${newEvent.endTime}:00`;
      // Extract attendee list
      const attendeesArray = newEvent.attendees
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 5)
        .map(email => ({ email }));

      const eventPayload: any = {
        summary: newEvent.summary || 'Business Operation Meeting',
        description: newEvent.description || 'Enterprise general workspace conference',
        location: newEvent.location || 'Google Meet Conference',
        start: {
          dateTime: startDateTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
        },
        end: {
          dateTime: endDateTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
        },
        attendees: attendeesArray
      };

      // Handle conference Meet links generation requests
      if (newEvent.createMeet) {
        eventPayload.conferenceData = {
          createRequest: {
            requestId: `bms-meet-request-${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        };
      }

      const postUrl = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1';
      const res = await fetch(postUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventPayload)
      });

      if (!res.ok) throw new Error("Failed to dispatch meeting event variables to core system");
      const savedEvent = await res.json();

      setSuccessMsg(`Created meeting event: '${savedEvent.summary}' with ${savedEvent.hangoutLink ? 'Google Meet details' : 'standard locations'}!`);
      setTimeout(() => setSuccessMsg(null), 5000);

      // Re-initialize event forms state
      setNewEvent({
        summary: '',
        description: '',
        location: '',
        startDate: '',
        startTime: '10:00',
        endDate: '',
        endTime: '11:00',
        attendees: '',
        createMeet: true
      });
      setShowEventModal(false);
      fetchCalendarEvents(token);
    } catch (err: any) {
      setError(err.message || "Failed to schedule Calendar corporate appointment.");
    } finally {
      setLoading(false);
    }
  };

  const triggerEventDelete = (eventId: string, eventSummary: string) => {
    setDeleteTarget({ type: 'event', id: eventId, name: eventSummary });
  };

  const executeEventDelete = async (eventId: string) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Delete request declined by Calendar Service");
      setSuccessMsg(`Calendar event canceled & removed successfully.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchCalendarEvents(token);
    } catch (err: any) {
      setError(err.message || "Failed to delete meeting node.");
    } finally {
      setLoading(false);
      setDeleteTarget(null);
    }
  };

  // ==================== CHAT HANDLERS ====================
  const fetchChatSpaces = async (accessToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('https://chat.googleapis.com/v1/spaces', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error("Failed to list Google Chat spaces");
      const data = await res.json();
      const fetchedSpaces = data.spaces || [];
      setChatSpaces(fetchedSpaces);
      if (fetchedSpaces.length > 0) {
        setSelectedSpaceId(fetchedSpaces[0].name);
      }
    } catch (err: any) {
      console.warn("Could not list chat spaces natively:", err);
      // Fail gracefully - list can be blank/restricted, user enters manually
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcastChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const activeSpace = customSpaceId.trim() || selectedSpaceId;
    if (!activeSpace) {
      setError("Please select an active space or enter your custom Space ID Resource Name.");
      return;
    }
    if (!chatMessage.trim()) return;

    setLoading(true);
    setError(null);
    try {
      // Endpoint: POST https://chat.googleapis.com/v1/spaces/{spaceId}/messages
      const res = await fetch(`https://chat.googleapis.com/v1/${activeSpace}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: chatMessage })
      });

      if (!res.ok) throw new Error("Google Chat rejected message post. Please verify Space permissions & formatting.");
      
      const newLog = {
        id: `chat-${Date.now()}`,
        space: activeSpace,
        message: chatMessage,
        timestamp: new Date().toLocaleTimeString()
      };
      setChatLogs(prev => [newLog, ...prev]);
      setChatMessage('');
      setSuccessMsg("Broadcasted message successfully to Google Chat space!");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || "Google Chat API post failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateChatBroadcast = () => {
    if (!chatMessage.trim()) return;
    const activeSpace = customSpaceId.trim() || selectedSpaceId || 'spaces/general-hq-simulation';
    const newLog = {
      id: `chat-${Date.now()}`,
      space: activeSpace,
      message: `${chatMessage} [Simulated Local Broadcast]`,
      timestamp: new Date().toLocaleTimeString()
    };
    setChatLogs(prev => [newLog, ...prev]);
    setChatMessage('');
    setSuccessMsg("Simulated corporate bulletin broadcast created locally!");
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const filteredDriveFiles = driveFiles.filter(f => 
    f.name.toLowerCase().includes(driveSearch.toLowerCase())
  );

  return (
    <div id="workspace-tab-container" className="space-y-6">
      
      {/* Tab bar header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-4 gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <Cloud className="h-6 w-6 text-blue-600" />
            <span>Google Workspace Operations Terminal</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real Google Drive documents, Calendar boards, and Chat Space links mapped directly into BMS logic.
          </p>
        </div>

        {user ? (
          <div className="flex items-center space-x-3 bg-white border border-slate-200 p-2 rounded-xl shadow-sm">
            {user.photoURL ? (
              <img src={user.photoURL} alt="Avatar" className="h-8 w-8 rounded-full border border-blue-100" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                {user.displayName?.substring(0, 1).toUpperCase() || 'U'}
              </div>
            )}
            <div className="text-left">
              <span className="text-xs font-bold text-slate-900 block truncate max-w-[150px]">{user.displayName || user.email}</span>
              <span className="text-[10px] text-slate-400 font-medium block truncate max-w-[150px]">{user.email}</span>
            </div>
            <button 
              id="workspace-disconnect-btn"
              onClick={handleDisconnect}
              className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-50 transition"
              title="Disconnect Account"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            id="workspace-connect-btn"
            onClick={handleConnect}
            disabled={isAuthenticating}
            className="flex items-center space-x-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-md shadow-blue-100"
          >
            <LogIn className="h-4 w-4" />
            <span>{isAuthenticating ? 'Launching Google Node...' : 'Connect Google Workspace Account'}</span>
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center space-x-2 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-xs leading-5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-lg text-xs leading-5">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {!user ? (
        <div className="bg-slate-100/50 rounded-2xl border border-slate-200 p-8 text-center space-y-4 max-w-2xl mx-auto mt-6">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <Cloud className="h-8 w-8 animate-pulse" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Corporate Authorization Required</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
              Unlock productivity modules on Google systems by connecting securely through standard Google Authentication parameters. Authorized permissions require Drive, Chat, and Calendar access blocks.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-4">
            <button 
              id="workspace-modal-btn"
              onClick={handleConnect}
              disabled={isAuthenticating}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-blue-100"
            >
              Sign in with Google API
            </button>
          </div>
          
          <div className="border-t border-slate-200 pt-5 mt-4 grid grid-cols-3 gap-2 text-slate-500 font-medium text-[10px]">
            <div className="space-y-1">
              <Folder className="h-4 w-4 mx-auto text-blue-500" />
              <span>Drive Explorer</span>
            </div>
            <div className="space-y-1">
              <Calendar className="h-4 w-4 mx-auto text-emerald-500" />
              <span>Schedules Sync</span>
            </div>
            <div className="space-y-1">
              <MessageSquare className="h-4 w-4 mx-auto text-sky-500" />
              <span>Chat Dispatcher</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Sub Navigation Left side */}
          <div className="lg:col-span-1 space-y-2">
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase px-2">WORKSPACE MODULES</span>
              
              <button
                id="subtab-drive"
                onClick={() => switchSubTab('drive')}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-bold transition ${subTab === 'drive' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <div className="flex items-center space-x-2.5">
                  <Folder className={`h-4.5 w-4.5 ${subTab === 'drive' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>Google Drive Documents</span>
                </div>
                {driveFiles.length > 0 && (
                  <span className="bg-blue-200/50 text-blue-700 text-[9px] font-bold px-1.5 py-0.25 rounded-full">{driveFiles.length}</span>
                )}
              </button>

              <button
                id="subtab-calendar"
                onClick={() => switchSubTab('calendar')}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-bold transition ${subTab === 'calendar' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <div className="flex items-center space-x-2.5">
                  <Calendar className={`h-4.5 w-4.5 ${subTab === 'calendar' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span>Google Calendar Board</span>
                </div>
                {calendarEvents.length > 0 && (
                  <span className="bg-emerald-100 text-emerald-700 text-[9px] font-bold px-1.5 py-0.25 rounded-full">{calendarEvents.length}</span>
                )}
              </button>

              <button
                id="subtab-chat"
                onClick={() => switchSubTab('chat')}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-bold transition ${subTab === 'chat' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <div className="flex items-center space-x-2.5">
                  <MessageSquare className={`h-4.5 w-4.5 ${subTab === 'chat' ? 'text-sky-600' : 'text-slate-400'}`} />
                  <span>Google Chat Spaces</span>
                </div>
                {chatSpaces.length > 0 && (
                  <span className="bg-sky-100 text-sky-700 text-[9px] font-bold px-1.5 py-0.25 rounded-full">{chatSpaces.length}</span>
                )}
              </button>
            </div>

            <div className="bg-blue-950 p-4 rounded-xl text-white space-y-2.5 text-xs shadow-sm">
              <div className="flex items-center space-x-1.5 text-blue-300 font-bold uppercase text-[9px]">
                <Sparkles className="h-3 w-3" />
                <span>BMS Automatic Scaffolder</span>
              </div>
              <p className="text-[11px] text-blue-200 leading-relaxed font-medium">Instantly generate structured workspace media formatted directly with system details!</p>
              
              <div className="pt-2 space-y-1.5">
                <button 
                  id="draft-doc-btn"
                  onClick={() => handleDraftWorkspaceDoc('doc')} 
                  disabled={loading}
                  className="w-full text-left p-2 bg-blue-900 hover:bg-blue-800 rounded font-semibold text-[10px] flex items-center justify-between group transition"
                >
                  <span className="flex items-center"><FileText className="h-3.5 w-3.5 mr-1.5 text-blue-300" />Draft Audit Report</span>
                  <span className="text-blue-400 group-hover:text-white">→</span>
                </button>
                <button 
                  id="draft-sheet-btn"
                  onClick={() => handleDraftWorkspaceDoc('sheet')} 
                  disabled={loading}
                  className="w-full text-left p-2 bg-blue-900 hover:bg-blue-800 rounded font-semibold text-[10px] flex items-center justify-between group transition"
                >
                  <span className="flex items-center"><FileSpreadsheet className="h-3.5 w-3.5 mr-1.5 text-emerald-300" />Draft Budget Grid</span>
                  <span className="text-blue-400 group-hover:text-white">→</span>
                </button>
              </div>
            </div>
          </div>

          {/* Core display Area */}
          <div className="lg:col-span-3">
            
            {/* DRIVE TABVIEW */}
            {subTab === 'drive' && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input 
                      id="drive-search-input"
                      type="text"
                      placeholder="Search Drive files..."
                      value={driveSearch}
                      onChange={(e) => setDriveSearch(e.target.value)}
                      className="pl-8.5 pr-3 py-1.5 text-xs border border-slate-200 bg-white rounded-lg w-full outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      id="draft-instant-doc-btn"
                      onClick={() => handleDraftWorkspaceDoc('doc')}
                      className="flex-1 sm:flex-none py-1.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                    >
                      + Form Audit Report
                    </button>
                    <button 
                      id="refresh-drive-btn"
                      onClick={() => fetchDriveFiles(token)}
                      className="p-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-slate-600 transition"
                      title="Sync Drive Metadata"
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Drag and Drop File Uploader Panel */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <div 
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition select-none ${dragActive ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'}`}
                  >
                    <input 
                      id="drive-hidden-file-input"
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleManualFileSelect}
                      className="hidden" 
                    />
                    <UploadCloud className={`h-7 w-7 mx-auto ${isUploading ? 'animate-bounce text-blue-500' : 'text-slate-400'}`} />
                    <p className="text-xs font-bold text-slate-700 mt-2">
                      {isUploading ? 'Sychronizing file payload to cloud storage...' : 'Drag & drop any attachment file here, or click to choose'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">Supports PDF, JSON, PNG, CSV, and logs backup files.</p>
                  </div>
                </div>

                <div className="overflow-x-auto min-h-[300px]">
                  {loading ? (
                    <div className="flex items-center justify-center py-20">
                      <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
                    </div>
                  ) : filteredDriveFiles.length === 0 ? (
                    <div className="text-center py-20 text-slate-400 space-y-1">
                      <Folder className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                      <p className="text-xs font-bold text-slate-600">No matching enterprise files located</p>
                      <p className="text-[11px] text-slate-400">Try changing your filter string or upload a new file.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-100 select-none">
                        <tr>
                          <th className="px-5 py-3">Asset Title</th>
                          <th className="px-5 py-3">Format Type</th>
                          <th className="px-5 py-3">Action links</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredDriveFiles.map((file) => {
                          const isDoc = file.mimeType.includes('document');
                          const isSheet = file.mimeType.includes('spreadsheet');
                          const isFolder = file.mimeType.includes('folder');
                          return (
                            <tr key={file.id} className="hover:bg-slate-50">
                              <td className="px-5 py-3.5 font-semibold text-slate-900 max-w-sm truncate">
                                <div className="flex items-center space-x-2">
                                  {isDoc ? <FileText className="h-4 w-4 text-blue-500" /> : isSheet ? <FileSpreadsheet className="h-4 w-4 text-emerald-500" /> : <Folder className="h-4 w-4 text-slate-400" />}
                                  <span className="truncate">{file.name}</span>
                                </div>
                              </td>
                              <td className="px-5 py-3.5 font-mono text-slate-500 text-[10px] max-w-[150px] truncate">
                                {file.mimeType.split('.').pop()?.split('/').pop()}
                              </td>
                              <td className="px-5 py-3.5 text-right w-[150px]">
                                <div className="flex items-center justify-end space-x-2">
                                  {file.webViewLink && (
                                    <a 
                                      id={`drive-open-${file.id}`}
                                      href={file.webViewLink} 
                                      target="_blank" 
                                      rel="noreferrer referrer" 
                                      className="p-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 border border-slate-200"
                                      title="Open in Workspace"
                                    >
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                  )}
                                  <button
                                    id={`drive-delete-${file.id}`}
                                    onClick={() => triggerFileDelete(file.id, file.name)}
                                    className="p-1 bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded border border-slate-200 hover:border-rose-200 transition"
                                    title="Purge File"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* CALENDAR TABVIEW */}
            {subTab === 'calendar' && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Upcoming Corporation Milestones</h3>
                  <div className="flex gap-2">
                    <button
                      id="open-event-modal-btn"
                      onClick={() => setShowEventModal(true)}
                      className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Schedule Meeting</span>
                    </button>
                    <button 
                      id="refresh-calendar-btn"
                      onClick={() => fetchCalendarEvents(token)}
                      className="p-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-slate-600 transition"
                      title="Sync Calendar"
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                <div className="p-5 min-h-[300px]">
                  {loading ? (
                    <div className="flex items-center justify-center py-20">
                      <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
                    </div>
                  ) : calendarEvents.length === 0 ? (
                    <div className="text-center py-20 text-slate-400 space-y-1">
                      <Calendar className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                      <p className="text-xs font-bold text-slate-600">Calendar timeline currently empty</p>
                      <p className="text-[11px] text-slate-400">Establish corporate alignments by scheduling a new board conference.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {calendarEvents.map((evt) => {
                        const eventDate = evt.start?.dateTime ? new Date(evt.start.dateTime) : evt.start?.date ? new Date(evt.start.date) : null;
                        return (
                          <div key={evt.id} className="border border-slate-200 hover:border-blue-300 rounded-xl p-4 shadow-sm hover:shadow transition bg-slate-50/50 flex flex-col justify-between">
                            <div className="space-y-2">
                              <div className="flex justify-between items-start gap-2">
                                <h4 className="font-bold text-slate-950 text-xs lines-clamp-1">{evt.summary || 'Meeting Alignment'}</h4>
                                <button
                                  id={`calendar-delete-${evt.id}`}
                                  onClick={() => triggerEventDelete(evt.id, evt.summary || 'Meeting')}
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 border border-transparent hover:border-rose-100 transition shrink-0"
                                  title="Cancel Appointment"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              
                              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                                {evt.description || 'No custom operational instructions described.'}
                              </p>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-medium">
                              <div className="space-y-0.5">
                                <span className="text-slate-500 block">TIMING STATUS</span>
                                <span className="font-bold text-slate-700 block font-mono">
                                  {eventDate ? eventDate.toLocaleDateString() : 'Continuous'} 
                                  {eventDate && evt.start?.dateTime && ` @ ${eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                </span>
                              </div>
                              
                              <div className="flex flex-col justify-end items-end">
                                {evt.hangoutLink ? (
                                  <a 
                                    id={`meet-link-${evt.id}`}
                                    href={evt.hangoutLink} 
                                    target="_blank" 
                                    rel="noreferrer referrer"
                                    className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold rounded border border-emerald-150 flex items-center space-x-1"
                                  >
                                    <Video className="h-3 w-3" />
                                    <span>Workspace Meet</span>
                                  </a>
                                ) : (
                                  <span className="text-slate-400 italic text-[9px] block">No video link</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CHAT TABVIEW */}
            {subTab === 'chat' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Broadcast controller */}
                <div className="md:col-span-1.5 space-y-4">
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 space-y-4">
                    <div className="border-b border-slate-100 pb-2">
                      <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <MessageSquare className="h-4.5 w-4.5 text-blue-500" />
                        <span>Bulletins Dispatch Center</span>
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Post real-time reports directly to Google Chat channels.</p>
                    </div>

                    <form onSubmit={handleBroadcastChatMessage} className="space-y-3.5 text-xs font-medium">
                      
                      {chatSpaces.length > 0 ? (
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 block">ACTIVE IN-SYSTEM SPACES</label>
                          <select
                            id="chat-spaces-select"
                            value={selectedSpaceId}
                            onChange={(e) => setSelectedSpaceId(e.target.value)}
                            className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                          >
                            {chatSpaces.map(sp => (
                              <option key={sp.name} value={sp.name}>{sp.displayName || sp.name}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-slate-500 leading-normal text-[11px]">
                          <span>No native Chat channels fetched (requires workspace permissions). Please customize Space resource name manually below.</span>
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 block">CUSTOM SPACE RESOURCE PATH (OPTIONAL)</label>
                        <input
                          id="chat-custom-space-input"
                          type="text"
                          placeholder="e.g. spaces/AAAAxxxxx"
                          value={customSpaceId}
                          onChange={(e) => setCustomSpaceId(e.target.value)}
                          className="w-full text-xs p-2.5 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                        />
                        <span className="text-[9px] text-slate-400 block mt-0.5 leading-normal">Override dropdown list using a direct Google Chat room resource reference.</span>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 block">BROADCAST BODY (MESSAGE TEXT)</label>
                        <textarea
                          id="chat-message-textarea"
                          rows={4}
                          placeholder="Enter bulletins text payload..."
                          value={chatMessage}
                          onChange={(e) => setChatMessage(e.target.value)}
                          className="w-full text-xs p-2.5 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed font-sans"
                        />
                      </div>

                      <div className="pt-2 flex gap-2">
                        <button
                          id="chat-submit-btn"
                          type="submit"
                          disabled={loading}
                          className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition shadow"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>Dispatch Message</span>
                        </button>
                        
                        <button
                          id="chat-simulate-btn"
                          type="button"
                          onClick={handleSimulateChatBroadcast}
                          className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-200 rounded-lg text-xs transition"
                          title="Simulate Broadcast Locally"
                        >
                          Simulate Test
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Audit Logs of transmissions */}
                <div className="md:col-span-1.5 space-y-4">
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 space-y-3 min-h-[350px] flex flex-col justify-between">
                    <div className="border-b border-slate-100 pb-2">
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-widest leading-none">Transmission Logs</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">History of broadcast transactions processed in this session.</p>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[280px] space-y-3 mt-2 pr-1">
                      {chatLogs.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 space-y-0.5 leading-normal">
                          <MessageSquare className="h-7 w-7 mx-auto text-slate-250 mb-1" />
                          <p className="text-[11px] font-bold text-slate-600 select-none">No records registered yet</p>
                          <p className="text-[10px] text-slate-400 select-none">Deploy message broadcasts to create operational trail logs.</p>
                        </div>
                      ) : (
                        chatLogs.map(log => (
                          <div key={log.id} className="border border-slate-150 rounded-lg p-3 bg-slate-50 space-y-1.5 text-[11px] hover:border-blue-200 transition">
                            <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                              <span className="font-mono text-blue-600 truncate max-w-[120px]">{log.space}</span>
                              <span>{log.timestamp}</span>
                            </div>
                            <p className="text-slate-800 font-sans leading-relaxed">{log.message}</p>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="p-2 bg-blue-50/50 border border-blue-100/50 rounded-lg flex items-start gap-1.5 text-[10px] text-blue-700 font-medium leading-relaxed">
                      <Info className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                      <span>Google Chat logs are stored locally during development for security and audit trailing purposes.</span>
                    </div>
                  </div>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

      {/* CREATE EVENT MODAL DIALOG */}
      {showEventModal && (
        <div id="calendar-event-modal" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-950 p-4 text-white flex justify-between items-center shrink-0 border-b">
              <span className="font-bold text-xs tracking-wider">SCHEDULE OPERATIONS MEETING</span>
              <button className="text-slate-400 hover:text-white font-bold" onClick={() => setShowEventModal(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateMeetingEvent} className="p-6 space-y-4 overflow-y-auto text-xs font-semibold text-slate-700 leading-normal">
              
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 block">CONFERENCE SUMMARY / TITLE *</label>
                <input 
                  id="event-title-input"
                  type="text" 
                  required
                  placeholder="e.g. Corporate Financial Audit"
                  value={newEvent.summary}
                  onChange={(e) => setNewEvent({...newEvent, summary: e.target.value})}
                  className="w-full p-2 border border-slate-200 rounded-lg text-slate-900 font-semibold outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 block">START DATE *</label>
                  <input 
                    id="event-start-date"
                    type="date" 
                    required
                    value={newEvent.startDate}
                    onChange={(e) => setNewEvent({...newEvent, startDate: e.target.value})}
                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-900 outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 block">START TIME *</label>
                  <input 
                    id="event-start-time"
                    type="time" 
                    required
                    value={newEvent.startTime}
                    onChange={(e) => setNewEvent({...newEvent, startTime: e.target.value})}
                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-900 outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 block">END DATE *</label>
                  <input 
                    id="event-end-date"
                    type="date" 
                    required
                    value={newEvent.endDate || newEvent.startDate}
                    onChange={(e) => setNewEvent({...newEvent, endDate: e.target.value})}
                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-900 outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 block">END TIME *</label>
                  <input 
                    id="event-end-time"
                    type="time" 
                    required
                    value={newEvent.endTime}
                    onChange={(e) => setNewEvent({...newEvent, endTime: e.target.value})}
                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-900 outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 block">PHYSICAL LOCATION (OPTIONAL)</label>
                <input 
                  id="event-location-input"
                  type="text" 
                  placeholder="e.g. Conference Room A, HQ Complex"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                  className="w-full p-2 border border-slate-200 rounded-lg text-slate-900 outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 block">ATTENDEE EMAIL LIST (COMMA SEPARATED)</label>
                <input 
                  id="event-attendees"
                  type="text" 
                  placeholder="e.g. manager@bms.com, pam@stark.corp"
                  value={newEvent.attendees}
                  onChange={(e) => setNewEvent({...newEvent, attendees: e.target.value})}
                  className="w-full p-2 border border-slate-200 rounded-lg text-slate-900 outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 block font-bold">MEETING NOTES / DESCRIPTION</label>
                <textarea 
                  id="event-desc-textarea"
                  rows={2}
                  placeholder="Enter meeting agenda logs..."
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                  className="w-full p-2 border border-slate-200 rounded-lg text-slate-900 outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                />
              </div>

              <div className="flex items-center space-x-2.5 pt-1 select-none">
                <input 
                  id="event-meet-checkbox"
                  type="checkbox" 
                  checked={newEvent.createMeet}
                  onChange={(e) => setNewEvent({...newEvent, createMeet: e.target.checked})}
                  className="h-4 w-4 border-slate-300 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="event-meet-checkbox" className="text-[11px] text-slate-600 font-bold cursor-pointer">
                  Natively generate Google Meet visual alignment details
                </label>
              </div>

              <div className="flex gap-2.5 pt-4">
                <button
                  id="event-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs text-center transition shadow-sm"
                >
                  Schedule Event
                </button>
                <button
                  id="event-cancel-modal-btn"
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-200 rounded-xl text-xs text-center transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANDATORY USER ACTIONS DESTRUCTIVE CONFIRMATION DIALOG MODAL */}
      {deleteTarget && (
        <div id="destruction-confirm-overlay" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white border border-rose-300 shadow-2xl rounded-2xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="bg-rose-600 p-4 text-white flex items-center space-x-2">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <span className="font-extrabold text-xs tracking-wider uppercase">Security Workspace Clearance required</span>
            </div>
            
            <div className="p-6 space-y-4 text-slate-700 leading-normal text-xs font-semibold">
              <p className="text-[13px] text-slate-900 font-bold">
                Are you completely sure you want to delete this {deleteTarget.type === 'file' ? 'Workspace File node' : 'Calendar meeting event'}?
              </p>
              
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg font-mono text-[10px] break-all">
                <span className="text-slate-500 uppercase block font-bold text-[9px] mb-1">Target Element Identification:</span>
                <span className="text-rose-600 font-bold">{deleteTarget.name}</span>
              </div>

              <p className="text-[10px] text-slate-400">
                Warning: Purging this asset executes mutations on your genuine Google Accounts endpoint structure, which cannot be automatically rolled back from this local application terminal.
              </p>

              <div className="flex gap-2.5 pt-2">
                <button
                  id="destruction-execute-btn"
                  onClick={() => {
                    if (deleteTarget.type === 'file') {
                      executeFileDelete(deleteTarget.id);
                    } else {
                      executeEventDelete(deleteTarget.id);
                    }
                  }}
                  className="flex-1 py-2 px-4 bg-rose-600 hover:bg-rose-700 border border-transparent text-white font-bold rounded-xl text-center shadow transition text-xs"
                >
                  Confirm Delete Action
                </button>
                <button
                  id="destruction-cancel-btn"
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-2 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-xl text-center transition text-xs"
                >
                  Cancel Action
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
