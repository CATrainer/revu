// frontend/app/(dashboard)/ai-assistant/page.tsx
'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Brain, Sparkles, Send, Loader2, AlertCircle, Plus, Menu, Trash2, MessageSquare, X, Edit2, Check, TrendingUp, Users, Video, Zap, Copy, CheckCheck, Settings2, GitBranch, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ContextEditor } from '@/components/ai/ContextEditor';
import { SessionTree } from '@/components/ai/SessionTree';
import { BranchCard } from '@/components/ai/BranchCard';
import { ThreadSwitcher } from '@/components/ai/ThreadSwitcher';
import { generateBranchSuggestions } from '@/lib/branchSuggestions';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_activity: string | null;
  parent_session_id?: string | null;
  branch_point_message_id?: string | null;
  branch_name?: string | null;
  depth_level?: number;
  child_count?: number;
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [activeView, setActiveView] = useState<'chat' | 'context'>('chat');
  const [collapsedSessions, setCollapsedSessions] = useState<Set<string>>(new Set());
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [splitPaneSession, setSplitPaneSession] = useState<string | null>(null);
  const [splitPaneMessages, setSplitPaneMessages] = useState<Message[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showBranchSuggestions, setShowBranchSuggestions] = useState(false);
  const [pendingSession, setPendingSession] = useState<{parentId?: string, branchFromMessageId?: string, branchName?: string, openInSplitPane?: boolean} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const splitPaneMessagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const response = await api.get('/chat/sessions');
      setSessions(response.data.items || []);
      
      // If no active session and we have sessions, load the most recent one
      if (!sessionId && !pendingSession && response.data.items?.length > 0) {
        const mostRecent = response.data.items[0];
        await loadSession(mostRecent.id);
      } else if (!sessionId && !pendingSession) {
        // No sessions exist, prepare for a new one (but don't create it yet)
        setMessages([]);
        setSessionId(null);
        setPendingSession({});
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  };

  const prepareNewSession = (parentSessionId?: string, branchFromMessageId?: string, branchName?: string, openInSplitPane = false) => {
    // Don't create the session yet, just prepare the state
    if (openInSplitPane) {
      // Prepare split pane session
      setSplitPaneSession('pending');
      setSplitPaneMessages([]);
      setPendingSession({ parentId: parentSessionId, branchFromMessageId, branchName, openInSplitPane: true });
    } else {
      // Prepare main session
      setSessionId(null);
      setMessages([]);
      setSplitPaneSession(null);
      setCurrentSession(null);
      setPendingSession({ parentId: parentSessionId, branchFromMessageId, branchName, openInSplitPane: false });
    }
    setShowBranchSuggestions(false);
  };

  const createNewSession = async (parentSessionId?: string, branchFromMessageId?: string, branchName?: string, autoStart = false) => {
    try {
      const response = await api.post('/chat/sessions', {
        title: branchName || (parentSessionId ? 'Branch Chat' : 'New Chat'),
        mode: 'general',
        parent_session_id: parentSessionId,
        branch_point_message_id: branchFromMessageId,
        branch_name: branchName,
        inherit_messages: 5,
        auto_start: autoStart,
      });
      const newSessionId = response.data.session_id;
      const initialMessage = response.data.initial_message;
      
      return { sessionId: newSessionId, initialMessage };
    } catch (err) {
      console.error('Failed to create session:', err);
      setError('Failed to create new chat session');
      throw err;
    }
  };

  const loadSplitPaneSession = async (id: string) => {
    try {
      const response = await api.get(`/chat/messages/${id}`);
      const loadedMessages: Message[] = (response.data.messages || []).map((msg: { id: string; role: string; content: string; created_at: string }) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at),
      }));
      setSplitPaneMessages(loadedMessages);
    } catch (err) {
      console.error('Failed to load split pane session:', err);
    }
  };

  const createBranchFromMessage = async (messageId: string, topic?: string) => {
    const sourceSessionId = splitPaneSession === 'pending' ? null : (splitPaneSession || sessionId);
    if (!sourceSessionId) return;
    
    const branchName = topic || prompt('What would you like to explore?');
    if (!branchName) return;
    
    // If creating from split pane (thread), move current split pane to main and open new thread in split pane
    if (splitPaneSession && splitPaneSession !== 'pending') {
      setSessionId(splitPaneSession);
      setMessages(splitPaneMessages);
      setCurrentSession(sessions.find(s => s.id === splitPaneSession) || null);
      prepareNewSession(splitPaneSession, messageId, branchName, true);
    } else {
      // Creating from main chat, open in split pane
      prepareNewSession(sourceSessionId, messageId, branchName, true);
    }
    setShowBranchSuggestions(false);
  };

  const loadSession = async (id: string) => {
    try {
      setSessionId(id);
      const session = sessions.find(s => s.id === id);
      setCurrentSession(session || null);
      
      const response = await api.get(`/chat/messages/${id}`);
      const loadedMessages: Message[] = (response.data.messages || []).map((msg: { id: string; role: string; content: string; created_at: string }) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at),
      }));
      setMessages(loadedMessages);
      setError(null);
      setSplitPaneSession(null); // Close split pane when switching to a different main session
      setShowBranchSuggestions(false); // Reset branch suggestions
      setPendingSession(null); // Clear any pending session
    } catch (err) {
      console.error('Failed to load session:', err);
      setError('Failed to load chat history');
    }
  };

  const toggleSessionCollapse = (sessionId: string) => {
    setCollapsedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  const getSessionChildren = (parentId: string) => {
    return sessions.filter(s => s.parent_session_id === parentId);
  };

  const getRootSessions = () => {
    return sessions.filter(s => !s.parent_session_id);
  };

  const getBreadcrumbs = (session: ChatSession | null): ChatSession[] => {
    if (!session) return [];
    const path: ChatSession[] = [session];
    let current = session;
    
    while (current.parent_session_id) {
      const parent = sessions.find(s => s.id === current.parent_session_id);
      if (!parent) break;
      path.unshift(parent);
      current = parent;
    }
    
    return path;
  };

  const deleteSession = async (id: string) => {
    try {
      await api.delete(`/chat/sessions/${id}`);
      await loadSessions();
      
      // If we deleted the active session, create a new one
      if (id === sessionId) {
        await createNewSession();
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
      setError('Failed to delete conversation');
    }
  };

  const updateSessionTitle = async (id: string, newTitle: string) => {
    try {
      await api.put(`/chat/sessions/${id}/title`, { title: newTitle });
      setSessions(sessions.map(s => s.id === id ? { ...s, title: newTitle } : s));
      setEditingSessionId(null);
    } catch (err) {
      console.error('Failed to update session title:', err);
    }
  };

  const autoGenerateTitle = async (id: string) => {
    try {
      const response = await api.post(`/chat/sessions/${id}/generate-title`);
      const newTitle = response.data.title;
      setSessions(sessions.map(s => s.id === id ? { ...s, title: newTitle } : s));
      if (currentSession?.id === id) {
        setCurrentSession({ ...currentSession, title: newTitle });
      }
      return newTitle;
    } catch (err) {
      console.error('Failed to auto-generate title:', err);
      return null;
    }
  };

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    // Track if this is the first message for auto-titling later
    const isFirstMessage = messages.length === 0;

    try {
      let actualSessionId = sessionId;
      
      // If there's a pending session, create it now
      if (pendingSession) {
        const { parentId, branchFromMessageId, branchName, openInSplitPane } = pendingSession;
        const { sessionId: newSessionId, initialMessage } = await createNewSession(
          parentId,
          branchFromMessageId,
          branchName,
          !!parentId // auto_start if it's a thread
        );
        
        actualSessionId = newSessionId;
        
        if (openInSplitPane) {
          setSplitPaneSession(newSessionId);
          if (initialMessage) {
            setSplitPaneMessages([{
              id: Date.now().toString(),
              role: 'assistant',
              content: initialMessage,
              timestamp: new Date(),
            }, ...splitPaneMessages]);
          }
        } else {
          setSessionId(newSessionId);
          if (initialMessage) {
            setMessages((prev) => [{
              id: Date.now().toString(),
              role: 'assistant',
              content: initialMessage,
              timestamp: new Date(),
            }, ...prev]);
          }
        }
        
        setPendingSession(null);
        await loadSessions(); // Refresh the session list
      }
      
      if (!actualSessionId) return;

      // Use EventSource for streaming responses
      const response = await fetch(`${api.defaults.baseURL}/chat/messages?stream=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          session_id: actualSessionId,
          content: userMessage.content,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend error:', errorText);
        throw new Error(`Failed to send message: ${response.status} - ${errorText}`);
      }

      // Create assistant message that will be updated with streaming content
      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, assistantMessage]);

      // Read the streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.delta) {
                  // Append delta to assistant message
                  setMessages((prev) => 
                    prev.map((msg) => 
                      msg.id === assistantMessageId
                        ? { ...msg, content: msg.content + data.delta }
                        : msg
                    )
                  );
                } else if (data.event === 'done') {
                  // Streaming complete
                  console.log('Streaming complete, latency:', data.latency_ms);
                }
              } catch (err) {
                console.error('Error parsing SSE data:', err);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
      // Remove the last user message on error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
      
      // Auto-generate title after first message (delayed slightly to ensure message is saved)
      if (isFirstMessage && sessionId) {
        setTimeout(() => {
          autoGenerateTitle(sessionId);
        }, 1000);
      }
      
      // Refresh session list to update message counts and ordering
      loadSessions();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const formEvent = new Event('submit', { bubbles: true, cancelable: true }) as unknown as React.FormEvent;
      handleSubmit(formEvent);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Sidebar */}
      <div
        className={cn(
          'flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 ease-in-out overflow-hidden',
          sidebarOpen ? (sidebarCollapsed ? 'w-16' : 'w-80') : 'w-0'
        )}
      >
        <div className={cn("h-full flex flex-col transition-all duration-300", sidebarCollapsed ? "p-2 w-16" : "p-4 w-80")}>
          {/* Sidebar Header */}
          <div className="flex items-center justify-between mb-4">
            {!sidebarCollapsed && (
              <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Conversations
              </h2>
            )}
            <div className="flex gap-1">
              {!sidebarCollapsed && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setActiveView(activeView === 'chat' ? 'context' : 'chat')}
                  className="h-8 w-8 p-0"
                  title={activeView === 'chat' ? 'View Context' : 'View Chat'}
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="h-8 w-8 p-0"
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <ChevronRight className={cn("h-4 w-4 transition-transform", sidebarCollapsed ? "rotate-0" : "rotate-180")} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* New Chat Button */}
          {!sidebarCollapsed && (
            <div className="space-y-2 mb-4">
              <Button
                onClick={() => prepareNewSession()}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Chat
              </Button>
              {sessionId && !pendingSession && (
                <Button
                  onClick={() => prepareNewSession(sessionId, undefined, 'New Thread', true)}
                  variant="outline"
                  className="w-full"
                >
                  <GitBranch className="h-4 w-4 mr-2" />
                  New Thread
                </Button>
              )}
            </div>
          )}

          {/* Sessions Tree */}
          {!sidebarCollapsed && (
            <div className="flex-1 overflow-y-auto">
            <SessionTree
              sessions={sessions}
              activeSessionId={sessionId}
              collapsedSessions={collapsedSessions}
              onSelectSession={loadSession}
              onToggleCollapse={toggleSessionCollapse}
              onEdit={(id: string, title: string) => {
                setEditingSessionId(id);
                setEditingTitle(title);
              }}
              onDelete={deleteSession}
            />
            {/* Old list - keeping for reference, remove later
            {sessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  'group relative rounded-lg p-3 cursor-pointer transition-all',
                  session.id === sessionId
                    ? 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
                )}
                style={{ marginLeft: `${(session.depth_level || 0) * 12}px` }}
                onClick={() => loadSession(session.id)}
              >
                {editingSessionId === session.id ? (
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      className="flex-1 px-2 py-1 text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updateSessionTitle(session.id, editingTitle);
                        } else if (e.key === 'Escape') {
                          setEditingSessionId(null);
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => updateSessionTitle(session.id, editingTitle)}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          {session.depth_level && session.depth_level > 0 && (
                            <GitBranch className="h-3 w-3 text-purple-500 dark:text-purple-400 flex-shrink-0" />
                          )}
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {session.branch_name || session.title}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>{session.message_count || 0} messages</span>
                          {session.child_count && session.child_count > 0 && (
                            <span className="flex items-center gap-1">
                              · {session.child_count} {session.child_count === 1 ? 'thread' : 'threads'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSessionId(session.id);
                            setEditingTitle(session.title);
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Delete this conversation?')) {
                              deleteSession(session.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
            */}
            </div>
          )}
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 overflow-hidden flex relative">
        {/* Mobile Sidebar Toggle */}
        {!sidebarOpen && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSidebarOpen(true)}
            className="absolute top-4 left-4 z-10 bg-white dark:bg-slate-800 shadow-md"
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}

        {activeView === 'context' ? (
          /* Context Editor View */
          <div className="flex-1 overflow-y-auto p-8">
            <ContextEditor />
          </div>
        ) : (
          /* Chat View - Split Pane Support */
          <div className="flex-1 flex overflow-hidden">
            {/* Main Chat Pane */}
            <div className={cn("flex flex-col overflow-hidden transition-all duration-300", splitPaneSession ? "flex-1" : "w-full")}>
              <ThreadSwitcher 
                sessions={sessions}
                activeSessionId={sessionId}
                onSelectSession={loadSession}
              />
        
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center px-4 py-12">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-2xl opacity-20 animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 p-4 rounded-2xl shadow-lg">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                Repruv AI Assistant
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-center max-w-lg mb-8">
                Your intelligent companion for content strategy, audience insights, and creative inspiration
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-3xl px-4">
                <button
                  onClick={() => setInput('Analyze my content strategy and suggest improvements')}
                  className="group p-4 text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-0.5">
                        Content Strategy
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Get data-driven insights for growth
                      </p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => setInput('Help me come up with 10 viral video ideas for my niche')}
                  className="group p-4 text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-sm">
                      <Video className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-0.5">
                        Viral Ideas
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Brainstorm trending content concepts
                      </p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => setInput('How can I better engage with my audience and build community?')}
                  className="group p-4 text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-sm">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-0.5">
                        Audience Growth
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Build stronger connections
                      </p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => setInput('Create a 30-day content calendar optimized for maximum reach')}
                  className="group p-4 text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg shadow-sm">
                      <Zap className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-0.5">
                        Content Calendar
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Plan your posting schedule
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
              {messages.map((message, idx) => (
                <React.Fragment key={message.id}>
                  <div
                    key={message.id}
                    className="group relative"
                  >
                    <div
                      className={cn(
                        'flex gap-4 items-start animate-in fade-in slide-in-from-bottom-4 duration-500',
                        message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                      )}
                    >
                      {/* Avatar */}
                      <div
                        className={cn(
                          'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm',
                          message.role === 'user'
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                            : 'bg-gradient-to-br from-purple-500 to-purple-600 text-white'
                        )}
                      >
                        {message.role === 'user' ? (
                          <span className="text-xs font-bold">YOU</span>
                        ) : (
                          <Sparkles className="h-5 w-5" />
                        )}
                      </div>

                      {/* Message Content */}
                      <div className="flex-1 max-w-3xl">
                      <div
                        className={cn(
                          'rounded-2xl px-5 py-4',
                          message.role === 'user'
                            ? 'bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-800/80 text-slate-900 dark:text-slate-100 shadow-sm'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                        )}
                      >
                        {message.content ? (
                          message.role === 'assistant' ? (
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              className="prose prose-slate dark:prose-invert max-w-none"
                              components={{
                                h1: ({ node, ...props }) => (
                                  <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-6 mb-3 pb-2 border-b border-slate-200 dark:border-slate-700" {...props} />
                                ),
                                h2: ({ node, ...props }) => (
                                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-5 mb-2" {...props} />
                                ),
                                h3: ({ node, ...props }) => (
                                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-4 mb-2" {...props} />
                                ),
                                p: ({ node, ...props }) => (
                                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-3 text-[15px]" {...props} />
                                ),
                                ul: ({ node, ...props }) => (
                                  <ul className="space-y-2 my-4 ml-4" {...props} />
                                ),
                                ol: ({ node, ...props }) => (
                                  <ol className="space-y-2 my-4 ml-4 list-decimal" {...props} />
                                ),
                                li: ({ node, ...props }) => (
                                  <li className="text-slate-700 dark:text-slate-300 leading-relaxed pl-2" {...props} />
                                ),
                                strong: ({ node, ...props }) => (
                                  <strong className="font-semibold text-slate-900 dark:text-slate-100" {...props} />
                                ),
                                em: ({ node, ...props }) => (
                                  <em className="italic text-slate-700 dark:text-slate-300" {...props} />
                                ),
                                code: ({ node, inline, className, children, ...props }: {
                                  node?: unknown;
                                  inline?: boolean;
                                  className?: string;
                                  children?: React.ReactNode;
                                }) => {
                                  const match = /language-(\w+)/.exec(className || '');
                                  const language = match ? match[1] : '';
                                  const codeId = `code-${Math.random().toString(36).substr(2, 9)}`;
                                  
                                  return !inline && language ? (
                                    <div className="my-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                                      <div className="flex items-center justify-between bg-slate-800 px-4 py-2 border-b border-slate-700">
                                        <span className="text-xs font-mono text-slate-300 uppercase tracking-wide">
                                          {language}
                                        </span>
                                        <button
                                          onClick={() => copyToClipboard(String(children).replace(/\n$/, ''), codeId)}
                                          className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded transition-colors"
                                        >
                                          {copiedCode === codeId ? (
                                            <>
                                              <CheckCheck className="h-3 w-3" />
                                              Copied!
                                            </>
                                          ) : (
                                            <>
                                              <Copy className="h-3 w-3" />
                                              Copy
                                            </>
                                          )}
                                        </button>
                                      </div>
                                      <SyntaxHighlighter
                                        style={vscDarkPlus}
                                        language={language}
                                        PreTag="div"
                                        className="!m-0 !bg-slate-900"
                                        customStyle={{
                                          margin: 0,
                                          padding: '1rem',
                                          background: '#0f172a',
                                          fontSize: '14px',
                                          lineHeight: '1.6',
                                        }}
                                        {...props}
                                      >
                                        {String(children).replace(/\n$/, '')}
                                      </SyntaxHighlighter>
                                    </div>
                                  ) : (
                                    <code className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded text-sm font-mono" {...props}>
                                      {children}
                                    </code>
                                  );
                                },
                                blockquote: ({ node, ...props }) => (
                                  <blockquote className="border-l-4 border-blue-500 dark:border-blue-600 pl-4 py-2 my-4 bg-blue-50 dark:bg-blue-950/20 rounded-r-lg" {...props} />
                                ),
                                table: ({ node, ...props }) => (
                                  <div className="my-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700" {...props} />
                                  </div>
                                ),
                                thead: ({ node, ...props }) => (
                                  <thead className="bg-slate-50 dark:bg-slate-800" {...props} />
                                ),
                                th: ({ node, ...props }) => (
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider" {...props} />
                                ),
                                td: ({ node, ...props }) => (
                                  <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 border-t border-slate-200 dark:border-slate-700" {...props} />
                                ),
                                a: ({ node, ...props }) => (
                                  <a className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline font-medium" target="_blank" rel="noopener noreferrer" {...props} />
                                ),
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          ) : (
                            <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                              {message.content}
                            </p>
                          )
                        ) : (
                          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm font-medium">Thinking...</span>
                          </div>
                        )}
                      </div>
                    </div>
                    </div>
                    
                    {/* Branch Button - appears on hover */}
                    {!isLoading && message.content && (
                      <button
                        onClick={() => createBranchFromMessage(message.id)}
                        className="absolute -right-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 p-2 text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-lg hover:shadow-md"
                        title="Branch from here"
                      >
                        <GitBranch className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {message.role === 'assistant' && !isLoading && idx === messages.length - 1 && (
                    <div className="mt-2">
                      {!showBranchSuggestions ? (
                        <button
                          onClick={() => setShowBranchSuggestions(true)}
                          className="text-xs text-slate-500 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-400 flex items-center gap-1 transition-colors"
                        >
                          <GitBranch className="h-3 w-3" />
                          <span>Explore further...</span>
                        </button>
                      ) : (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                          <BranchCard
                            suggestions={generateBranchSuggestions(message.content)}
                            onBranch={(topic) => createBranchFromMessage(message.id, topic)}
                            messageId={message.id}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </React.Fragment>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-gradient-to-b from-white/95 to-white dark:from-slate-900/95 dark:to-slate-900 backdrop-blur-xl">
          <div className="max-w-4xl mx-auto px-4 py-5">
            {/* Error Display */}
            {error && (
              <div className="mb-4 flex items-start gap-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-4 py-3 rounded-xl border border-red-200 dark:border-red-900/50">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium mb-1">Error</p>
                  <p className="text-xs opacity-90">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="relative">
              <div className="flex gap-3 items-end">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about content strategy, viral ideas, audience growth..."
                    className="w-full min-h-[60px] max-h-40 px-5 py-4 text-[15px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-600/30 focus:border-blue-500 dark:focus:border-blue-600 resize-none transition-all shadow-sm"
                    disabled={isLoading}
                    rows={1}
                  />
                  {input.length > 0 && (
                    <div className="absolute bottom-2 right-3 text-xs text-slate-400 dark:text-slate-500">
                      {input.length} characters
                    </div>
                  )}
                </div>
                
                <Button
                  type="submit"
                  size="icon"
                  className="h-[60px] w-[60px] rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                  disabled={isLoading || !input.trim() || (!sessionId && !pendingSession)}
                >
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Send className="h-6 w-6" />
                  )}
                </Button>
              </div>
              
              <div className="flex items-center justify-between mt-3 px-1">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-[10px] font-medium shadow-sm">↵ Enter</kbd> to send · 
                  <kbd className="ml-1 px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-[10px] font-medium shadow-sm">Shift + ↵</kbd> for new line
                </p>
                {!isLoading && (sessionId || pendingSession) && (
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Powered by Claude AI
                  </p>
                )}
              </div>
            </form>
          </div>
        </div>
            </div>

            {/* Split Pane for Threads */}
            {splitPaneSession && (
              <div className="flex-1 flex flex-col overflow-hidden border-l-2 border-purple-500/30 bg-gradient-to-br from-purple-50/30 to-transparent dark:from-purple-950/10">
                {/* Split Pane Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Thread: {sessions.find(s => s.id === splitPaneSession)?.branch_name || 'Exploring...'}
                    </h3>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSplitPaneSession(null)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Split Pane Messages */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                  <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
                    {splitPaneMessages.map((message, idx) => (
                      <div key={message.id} className="group relative">
                        <div className={cn('flex gap-4 items-start animate-in fade-in slide-in-from-bottom-4 duration-500', message.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                          <div className={cn('flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm', message.role === 'user' ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' : 'bg-gradient-to-br from-purple-500 to-purple-600 text-white')}>
                            {message.role === 'user' ? <span className="text-xs font-bold">YOU</span> : <Sparkles className="h-5 w-5" />}
                          </div>
                          <div className="flex-1 max-w-3xl">
                            <div className={cn('rounded-2xl px-5 py-4', message.role === 'user' ? 'bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-800/80 text-slate-900 dark:text-slate-100 shadow-sm' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-sm')}>
                              {message.content ? (
                                <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                              ) : (
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span className="text-sm font-medium">Thinking...</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={splitPaneMessagesEndRef} />
                  </div>
                </div>

                {/* Split Pane Input - Placeholder for now */}
                <div className="border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4">
                  <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                    Split pane messaging coming soon...
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
