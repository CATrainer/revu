// frontend/app/(dashboard)/ai-assistant/page.tsx
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
'use client';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Brain, Sparkles, Send, Loader2, AlertCircle, Plus, Menu, Trash2, MessageSquare, X, Edit2, Check, TrendingUp, Users, Video, Zap, Copy, CheckCheck, Settings2, GitBranch, ChevronRight, Star, Archive, Search, Upload, Download, Share2 } from 'lucide-react';
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
import { generateBranchSuggestions } from '@/lib/branchSuggestions';
import { FollowUpSuggestions } from '@/components/ai/FollowUpSuggestions';
import { ConversationSummary } from '@/components/ai/ConversationSummary';
import { MessageActions } from '@/components/ai/MessageActions';
import { ResponseRating } from '@/components/ai/ResponseRating';
import { TemplateLibrary } from '@/components/ai/TemplateLibrary';
import { PreferencesDialog } from '@/components/ai/PreferencesDialog';
import { FileUpload } from '@/components/ai/FileUpload';
import { SearchBar } from '@/components/ai/SearchBar';
import { ExportDialog } from '@/components/ai/ExportDialog';
import { ShareDialog } from '@/components/ai/ShareDialog';
import { TagManager } from '@/components/ai/TagManager';
import { EnhancedMarkdown } from '@/components/ai/EnhancedMarkdown';
import { MessageEditor } from '@/components/ai/MessageEditor';
import { CommentThread } from '@/components/ai/CommentThread';
import { CollaborationPanel } from '@/components/ai/CollaborationPanel';
import { ThreadSwitcher } from '@/components/ai/ThreadSwitcher';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error' | 'streaming';
  error?: string;
  isRegenerating?: boolean;
  canRegenerate?: boolean;
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
  starred?: boolean;
  archived?: boolean;
  tags?: any[];
}

// Session state manager for tracking active streams and loading states
interface SessionState {
  isStreaming: boolean;
  isLoading: boolean;
  abortController?: AbortController;
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [splitPaneInput, setSplitPaneInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionStates, setSessionStates] = useState<Map<string, SessionState>>(new Map());
  const [messageCache, setMessageCache] = useState<Map<string, Message[]>>(new Map());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [activeView, setActiveView] = useState<'chat' | 'context'>('chat');
  const [collapsedSessions, setCollapsedSessions] = useState<Set<string>>(new Set());
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [splitPaneSession, setSplitPaneSession] = useState<string | null>(null);
  const [splitPaneMessages, setSplitPaneMessages] = useState<Message[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Initialize from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ai-assistant-sidebar-collapsed');
      return saved === 'true';
    }
    return false;
  });
  const [showBranchSuggestions, setShowBranchSuggestions] = useState(false);
  const [pendingSession, setPendingSession] = useState<{parentId?: string, branchFromMessageId?: string, branchName?: string, openInSplitPane?: boolean} | null>(null);
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [initializing, setInitializing] = useState(true);
  // Enhancement states
  const [attachments, setAttachments] = useState<any[]>([]);
  const [userTags, setUserTags] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const isLoadingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const splitPaneMessagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const splitPaneInputRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const splitPaneContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const shouldAutoScrollSplitPaneRef = useRef(true);

  // Check if user is near bottom of scroll container
  const isNearBottom = (container: HTMLDivElement | null) => {
    if (!container) return true;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const threshold = 150; // pixels from bottom
    return scrollHeight - scrollTop - clientHeight < threshold;
  };

  // Smart scroll - only scroll if user is already at bottom
  const scrollToBottom = (force = false) => {
    if (force || shouldAutoScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollSplitPaneToBottom = (force = false) => {
    if (force || shouldAutoScrollSplitPaneRef.current) {
      splitPaneMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Update auto-scroll state when user scrolls
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      shouldAutoScrollRef.current = isNearBottom(container);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const container = splitPaneContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      shouldAutoScrollSplitPaneRef.current = isNearBottom(container);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Only scroll if user is near bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    scrollSplitPaneToBottom();
  }, [splitPaneMessages]);

  // Detect scroll position for scroll-to-bottom button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom && messages.length > 3);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [messages.length]);

  // Save sidebar collapsed state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ai-assistant-sidebar-collapsed', String(sidebarCollapsed));
    }
  }, [sidebarCollapsed]);

  // Load sessions on mount
  useEffect(() => {
    let mounted = true;
    const initializeApp = async () => {
      if (!mounted) return;
      setInitializing(true);
      await loadSessions();
      await loadUserTags();
      if (mounted) {
        setInitializing(false);
      }
    };
    initializeApp();
    return () => { mounted = false; };
  }, []);

  // Poll for updates when session is streaming - REMOVED BAD DEPENDENCY
  useEffect(() => {
    if (!sessionId) return;
    
    const sessionState = sessionStates.get(sessionId);
    if (!sessionState?.isStreaming) return;
    
    let previousContent = '';
    let unchangedCount = 0;
    
    // Poll every 2 seconds while streaming
    const pollInterval = setInterval(async () => {
      try {
        const response = await api.get(`/chat/messages/${sessionId}`);
        const latestMessages: Message[] = (response.data.messages || []).map((msg: { id: string; role: string; content: string; created_at: string }) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.created_at),
          status: 'sent',
        }));
        
        if (latestMessages.length === 0) return;
        
        const lastMsg = latestMessages[latestMessages.length - 1];
        
        // Check if content hasn't changed for 2 consecutive polls
        if (lastMsg.content === previousContent) {
          unchangedCount++;
          if (unchangedCount >= 2) {
            // Message stable - stop streaming
            setSessionStates(prev => new Map(prev).set(sessionId, { 
              isStreaming: false, 
              isLoading: false 
            }));
          }
        } else {
          unchangedCount = 0;
          previousContent = lastMsg.content;
        }
        
        setMessages(latestMessages);
        setMessageCache(prev => new Map(prev).set(sessionId, latestMessages));
      } catch (err) {
        console.error('Failed to poll messages:', err);
        setSessionStates(prev => new Map(prev).set(sessionId, { 
          isStreaming: false, 
          isLoading: false 
        }));
      }
    }, 2000);
    
    return () => clearInterval(pollInterval);
  }, [sessionId, sessionStates]);

  const loadSessions = async (skipAutoLoad = false) => {
    try {
      setSessionsLoading(true);
      const response = await api.get('/chat/sessions');
      const fetchedSessions = response.data.items || [];
      setSessions(fetchedSessions);
      
      // Only auto-load on initial mount if no session is active and not skipping
      if (!skipAutoLoad && initializing && !sessionId && !pendingSession && fetchedSessions.length > 0) {
        const mostRecent = fetchedSessions[0];
        await loadSession(mostRecent.id);
      } else if (!skipAutoLoad && initializing && !sessionId && !pendingSession && fetchedSessions.length === 0) {
        // No sessions exist, show empty state
        setMessages([]);
        setSessionId(null);
        setPendingSession({});
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setSessionsLoading(false);
    }
  };

  const prepareNewSession = async (parentSessionId?: string, branchFromMessageId?: string, branchName?: string, openInSplitPane = false) => {
    // For threads (openInSplitPane with parent), create immediately with auto_start
    if (openInSplitPane && parentSessionId) {
      setSplitPaneSession('pending');
      setSplitPaneMessages([]);
      setShowBranchSuggestions(false);
      
      try {
        // Create thread session immediately with auto_start
        const { sessionId: newSessionId, initialMessage } = await createNewSession(
          parentSessionId,
          branchFromMessageId,
          branchName,
          true // auto_start for threads
        );
        
        setSplitPaneSession(newSessionId);
        
        // Add initial AI message if present
        if (initialMessage) {
          setSplitPaneMessages([{
            id: Date.now().toString(),
            role: 'assistant',
            content: initialMessage,
            timestamp: new Date(),
            status: 'sent',
          }]);
        }
        
        await loadSessions(true); // Refresh session list but don't auto-switch
      } catch (err) {
        console.error('Failed to create thread:', err);
        setSplitPaneSession(null);
      }
    } else if (openInSplitPane) {
      // Non-thread split pane (shouldn't happen but handle it)
      setSplitPaneSession('pending');
      setSplitPaneMessages([]);
      setPendingSession({ parentId: parentSessionId, branchFromMessageId, branchName, openInSplitPane: true });
      setShowBranchSuggestions(false);
    } else {
      // Prepare main session (don't create until first message) - IMMEDIATE STATE UPDATE
      setSessionId(null);
      setCurrentSession(null);
      setMessages([]);
      setSplitPaneSession(null);
      setError(null);
      setPendingSession({ parentId: parentSessionId, branchFromMessageId, branchName, openInSplitPane: false });
      setShowBranchSuggestions(false);
      setIsLoading(false);
      // Clear any streaming states
      setSessionStates(new Map());
    }
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
      await prepareNewSession(splitPaneSession, messageId, branchName, true);
    } else {
      // Creating from main chat, open in split pane
      await prepareNewSession(sourceSessionId, messageId, branchName, true);
    }
    setShowBranchSuggestions(false);
  };

  const loadSession = useCallback(async (id: string) => {
    // Prevent concurrent loads
    if (isLoadingRef.current) return;
    if (sessionId === id) return; // Already loaded
    
    isLoadingRef.current = true;
    
    // Abort any ongoing streaming
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setIsLoading(false);
    setIsGenerating(false);
    
    try {
      setLoadingSessionId(id);
      
      // Immediately update to show we're switching - BATCH state updates
      setSessionId(id);
      const session = sessions.find(s => s.id === id);
      setCurrentSession(session || null);
      setSplitPaneSession(null);
      setShowBranchSuggestions(false);
      setPendingSession(null);
      setError(null);
      
      // Clear streaming states for old session
      setSessionStates(new Map());
      
      // Check cache first for instant display
      const cachedMessages = messageCache.get(id);
      if (cachedMessages && cachedMessages.length > 0) {
        setMessages(cachedMessages);
      } else {
        // Show loading state if no cache
        setMessages([]);
      }
      
      // Fetch fresh data in background
      const response = await api.get(`/chat/messages/${id}`);
      const loadedMessages: Message[] = (response.data.messages || []).map((msg: { id: string; role: string; content: string; created_at: string }) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        status: 'sent',
      }));
      
      // Only update if we're still on this session (prevent race condition)
      if (sessionId === id) {
        setMessages(loadedMessages);
        setMessageCache(prev => new Map(prev).set(id, loadedMessages));
      }
    } catch (err) {
      console.error('Failed to load session:', err);
      setError('Failed to load chat history');
    } finally {
      setLoadingSessionId(null);
      isLoadingRef.current = false;
    }
  }, [sessions, messageCache, sessionId, abortController]);

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

  const stopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setIsGenerating(false);
    setIsLoading(false);
  };

  const regenerateMessage = async (messageIndex: number) => {
    if (!sessionId) return;
    
    // Remove this message and all messages after it
    const newMessages = messages.slice(0, messageIndex);
    setMessages(newMessages);
    
    // Get the last user message before this point
    const lastUserMessage = [...newMessages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage) return;
    
    // Resend that message
    const formEvent = new Event('submit', { bubbles: true, cancelable: true }) as unknown as React.FormEvent;
    setInput(lastUserMessage.content);
    // We'll trigger regeneration by setting a flag
    setTimeout(() => {
      setInput('');
      handleSubmit(formEvent, false);
    }, 100);
  };

  const editMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditingContent(content);
  };

  const saveEditedMessage = async (messageId: string) => {
    if (!editingContent.trim()) return;
    
    // Find the message index
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;
    
    // Update the message content
    const updatedMessages = [...messages];
    updatedMessages[messageIndex] = {
      ...updatedMessages[messageIndex],
      content: editingContent.trim()
    };
    
    // Remove all messages after this one
    setMessages(updatedMessages.slice(0, messageIndex + 1));
    setEditingMessageId(null);
    setEditingContent('');
    
    // Regenerate from this point
    await regenerateMessage(messageIndex + 1);
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    // Could show a toast here
  };

  // Enhancement handlers
  const handleToggleStar = async () => {
    if (!sessionId) return;
    try {
      await api.post(`/chat/sessions/${sessionId}/star`, {
        starred: !currentSession?.starred
      });
      loadSessions();
    } catch (error) {
      console.error('Failed to toggle star:', error);
    }
  };

  const handleToggleArchive = async () => {
    if (!sessionId) return;
    try {
      await api.post(`/chat/sessions/${sessionId}/archive`, {
        archived: !currentSession?.archived
      });
      loadSessions();
    } catch (error) {
      console.error('Failed to toggle archive:', error);
    }
  };

  const handleTagsChange = async (tags: any[]) => {
    if (!sessionId) return;
    try {
      await api.post(`/chat/sessions/${sessionId}/tags`, {
        tag_ids: tags.map(t => t.id)
      });
      loadSessions();
    } catch (error) {
      console.error('Failed to update tags:', error);
    }
  };

  const handleShare = async (settings: any) => {
    if (!sessionId) return;
    try {
      const response = await api.post(`/chat/sessions/${sessionId}/share`, settings);
      return response.data.share_url;
    } catch (error) {
      console.error('Failed to create share link:', error);
      throw error;
    }
  };

  const handleEditMessage = async (messageId: string, content: string) => {
    try {
      await api.put(`/chat/messages/${messageId}`, { content });
      setEditingMessageId(null);
      if (sessionId) {
        loadSession(sessionId);
      }
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  };

  const handleAddComment = async (messageId: string, content: string) => {
    try {
      await api.post(`/chat/messages/${messageId}/comments`, { content });
      if (sessionId) {
        loadSession(sessionId);
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleSearch = async (query: string, filters: any) => {
    try {
      const response = await api.get('/chat/search', {
        params: { q: query, ...filters }
      });
      setSearchResults(response.data);
    } catch (error) {
      console.error('Failed to search:', error);
    }
  };

  const loadUserTags = async () => {
    try {
      const response = await api.get('/chat/tags');
      setUserTags(response.data);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent, isForSplitPane: boolean = false) => {
    e.preventDefault();
    
    // Get the correct input value based on which pane is submitting
    const currentInput = isForSplitPane ? splitPaneInput : input;
    if (!currentInput.trim()) return;
    
    // Prevent multiple submissions
    if (isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: currentInput.trim(),
      timestamp: new Date(),
      status: 'sending',
    };

    // Add message to correct pane
    if (isForSplitPane) {
      setSplitPaneMessages((prev) => [...prev, userMessage]);
      setSplitPaneInput('');
    } else {
      setMessages((prev) => {
        const newMessages = [...prev, userMessage];
        // Update cache immediately
        if (sessionId) {
          setMessageCache(prevCache => new Map(prevCache).set(sessionId, newMessages));
        }
        return newMessages;
      });
      setInput('');
    }
    
    setIsLoading(true);
    setError(null);

    // Track if this is the first message for auto-titling later
    const isFirstMessage = isForSplitPane ? splitPaneMessages.length === 0 : messages.length === 0;

    try {
      let actualSessionId = isForSplitPane ? splitPaneSession : sessionId;
      
      // If there's a pending session (only for main chat now, split pane created immediately)
      if (pendingSession && !isForSplitPane) {
        const { parentId, branchFromMessageId, branchName } = pendingSession;
        const { sessionId: newSessionId, initialMessage } = await createNewSession(
          parentId,
          branchFromMessageId,
          branchName,
          false // main chat doesn't auto_start
        );
        
        actualSessionId = newSessionId;
        setSessionId(newSessionId);
        
        if (initialMessage) {
          setMessages((prev) => {
            const userMsg = prev[prev.length - 1];
            return [{
              id: (Date.now() - 1).toString(),
              role: 'assistant',
              content: initialMessage,
              timestamp: new Date(),
              status: 'sent',
            }, userMsg];
          });
        }
        
        setPendingSession(null);
        await loadSessions(); // Refresh the session list
      }
      
      if (!actualSessionId || actualSessionId === 'pending') {
        setIsLoading(false);
        return;
      }

      // Create abort controller for this request
      const controller = new AbortController();
      setAbortController(controller);

      // Use fetch for streaming responses
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
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend error:', errorText);
        throw new Error(`Failed to send message: ${response.status} - ${errorText}`);
      }

      // Mark session as streaming
      if (actualSessionId && actualSessionId !== 'pending') {
        setSessionStates(prev => new Map(prev).set(actualSessionId, { 
          isStreaming: true, 
          isLoading: false 
        }));
      }

      // Create assistant message that will be updated with streaming content
      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        status: 'streaming',
      };
      
      if (isForSplitPane) {
        setSplitPaneMessages((prev) => [...prev, assistantMessage]);
      } else {
        setMessages((prev) => {
          const newMessages = [...prev, assistantMessage];
          // Update cache with streaming message
          if (actualSessionId && actualSessionId !== 'pending') {
            setMessageCache(prevCache => new Map(prevCache).set(actualSessionId, newMessages));
          }
          return newMessages;
        });
      }

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
                  // Append delta to assistant message in the correct pane
                  if (isForSplitPane) {
                    setSplitPaneMessages((prev) => 
                      prev.map((msg) => 
                        msg.id === assistantMessageId
                          ? { ...msg, content: msg.content + data.delta, status: 'streaming' as const }
                          : msg
                      )
                    );
                  } else {
                    setMessages((prev) => {
                      const updatedMessages = prev.map((msg) => 
                        msg.id === assistantMessageId
                          ? { ...msg, content: msg.content + data.delta, status: 'streaming' as const }
                          : msg
                      );
                      // Update cache during streaming
                      if (actualSessionId && actualSessionId !== 'pending') {
                        setMessageCache(prevCache => new Map(prevCache).set(actualSessionId, updatedMessages));
                      }
                      return updatedMessages;
                    });
                  }
                } else if (data.event === 'done') {
                  // Streaming complete - mark message as sent
                  if (isForSplitPane) {
                    setSplitPaneMessages((prev) => 
                      prev.map((msg) => 
                        msg.id === assistantMessageId
                          ? { ...msg, status: 'sent' as const }
                          : msg
                      )
                    );
                  } else {
                    setMessages((prev) => {
                      const finalMessages = prev.map((msg) => 
                        msg.id === assistantMessageId
                          ? { ...msg, status: 'sent' as const }
                          : msg
                      );
                      // Final cache update
                      if (actualSessionId && actualSessionId !== 'pending') {
                        setMessageCache(prevCache => new Map(prevCache).set(actualSessionId, finalMessages));
                      }
                      return finalMessages;
                    });
                  }
                  // Mark streaming as complete
                  if (actualSessionId && actualSessionId !== 'pending') {
                    setSessionStates(prev => new Map(prev).set(actualSessionId, { 
                      isStreaming: false, 
                      isLoading: false 
                    }));
                  }
                  console.log('Streaming complete, latency:', data.latency_ms);
                }
              } catch (err) {
                console.error('Error parsing SSE data:', err);
              }
            }
          }
        }
      }
    } catch (err: unknown) {
      // Ignore abort errors (user initiated)
      if ((err as Error).name === 'AbortError') {
        console.log('Request aborted by user');
        return;
      }
      
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
      
      // Remove the last user message on error
      if (isForSplitPane) {
        setSplitPaneMessages((prev) => prev.slice(0, -1));
      } else {
        setMessages((prev) => prev.slice(0, -1));
      }
    } finally {
      setAbortController(null);
      setIsLoading(false);
      if (!isForSplitPane) {
        inputRef.current?.focus();
      } else {
        splitPaneInputRef.current?.focus();
      }
      
      // Force scroll to bottom after sending a message
      setTimeout(() => {
        if (isForSplitPane) {
          shouldAutoScrollSplitPaneRef.current = true;
          scrollSplitPaneToBottom(true);
        } else {
          shouldAutoScrollRef.current = true;
          scrollToBottom(true);
        }
      }, 100);
      
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

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const formEvent = new Event('submit', { bubbles: true, cancelable: true }) as unknown as React.FormEvent;
      handleSubmit(formEvent, false);
    }
  }, []);

  return (
    <div className="fixed inset-0 top-16 left-0 flex overflow-hidden bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
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
                disabled={loadingSessionId !== null || isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 transition-all"
              >
                {loadingSessionId || isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                New Chat
              </Button>
              {sessionId && !pendingSession && (
                <Button
                  onClick={() => prepareNewSession(sessionId, undefined, 'New Thread', true)}
                  variant="outline"
                  disabled={loadingSessionId !== null || isLoading}
                  className="w-full disabled:opacity-50 transition-all"
                >
                  {loadingSessionId || isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <GitBranch className="h-4 w-4 mr-2" />
                  )}
                  New Thread
                </Button>
              )}
              
              {/* Template Library */}
              <TemplateLibrary
                onSelectTemplate={async (template: { sessionId: string }) => {
                  // Load the new session created from template
                  await loadSession(template.sessionId);
                }}
              />
            </div>
          )}

          {/* Search Bar */}
          {!sidebarCollapsed && (
            <div className="mb-4">
              <SearchBar
                onSearch={handleSearch}
                onClear={() => setSearchResults(null)}
                availableTags={userTags}
              />
            </div>
          )}

          {/* Sessions Tree */}
          {!sidebarCollapsed && (
            <div className="flex-1 overflow-y-auto">
            {sessionsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800/50 rounded-lg animate-pulse"></div>
                ))}
              </div>
            ) : (
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
            )}
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
          
          {/* Sidebar Footer - Preferences */}
          {!sidebarCollapsed && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
              <PreferencesDialog />
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
            <div className={cn("flex flex-col overflow-hidden transition-all duration-300 relative", splitPaneSession ? "flex-1" : "w-full")}>
              <ThreadSwitcher 
                sessions={sessions}
                activeSessionId={sessionId}
                onSelectSession={loadSession}
              />
              
              {/* Action Buttons */}
              {sessionId && currentSession && (
                <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex-1 flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={handleToggleStar}
                      title={currentSession.starred ? "Unstar" : "Star"}
                    >
                      <Star className={cn(
                        "h-4 w-4", 
                        currentSession.starred && "fill-yellow-400 text-yellow-400"
                      )} />
                    </Button>
                    
                    <TagManager
                      sessionId={sessionId}
                      currentTags={currentSession.tags || []}
                      availableTags={userTags}
                      onTagsChange={handleTagsChange}
                    />
                    
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={handleToggleArchive}
                      title="Archive"
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                    
                    <ExportDialog
                      sessionId={sessionId}
                      sessionTitle={currentSession.title || 'Chat'}
                      messages={messages}
                    />
                    
                    <ShareDialog
                      sessionId={sessionId}
                      sessionTitle={currentSession.title || 'Chat'}
                      onShare={handleShare}
                    />
                  </div>
                </div>
              )}
        
        {/* Messages Area */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden">
          {initializing || (loadingSessionId && messages.length === 0) ? (
            <div className="w-full py-6 px-4 space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4 items-start animate-pulse">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700"></div>
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 && !sessionId ? (
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
            <div className="w-full py-6 px-4 space-y-6">
              {/* Conversation Summary */}
              {sessionId && messages.length >= 10 && (
                <div className="mb-6">
                  <ConversationSummary 
                    sessionId={sessionId} 
                    messageCount={messages.length}
                  />
                </div>
              )}
              
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
                            <EnhancedMarkdown content={message.content} />
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
                    
                    {/* Message Actions - appears on hover */}
                    <div className="absolute -right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MessageActions
                        messageId={message.id}
                        content={message.content || ''}
                        role={message.role}
                        canRegenerate={message.role === 'assistant' && idx === messages.length - 1}
                        onCopy={copyMessage}
                        onEdit={editMessage}
                        onRegenerate={() => regenerateMessage(idx)}
                      />
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
                  
                  {/* Response Rating - for assistant messages */}
                  {message.role === 'assistant' && message.status === 'sent' && (
                    <div className="mt-2 flex items-center gap-3">
                      <ResponseRating messageId={message.id} />
                    </div>
                  )}
                  
                  {/* Comment Thread - for all messages */}
                  <CommentThread
                    messageId={message.id}
                    comments={[]}
                    currentUserId={"current-user"}  // TODO: Get from auth context
                    onAddComment={async (content) => {
                      // Handle adding comment to message
                      console.log('Add comment:', content);
                    }}
                    onEditComment={async (commentId, content) => {
                      // Handle editing comment
                      console.log('Edit comment:', commentId, content);
                    }}
                    onDeleteComment={async (commentId) => {
                      // Handle deleting comment
                      console.log('Delete comment:', commentId);
                    }}
                  />
                  
                  {/* Follow-up Suggestions - for last assistant message */}
                  {message.role === 'assistant' && idx === messages.length - 1 && !isLoading && message.status === 'sent' && (
                    <FollowUpSuggestions
                      messageId={message.id}
                      onSelect={(suggestion: string) => {
                        setInput(suggestion);
                        inputRef.current?.focus();
                      }}
                    />
                  )}
                  
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

        {/* Scroll to Bottom Button */}
        {showScrollButton && (
          <button
            onClick={() => {
              shouldAutoScrollRef.current = true;
              scrollToBottom(true);
            }}
            className="absolute bottom-24 right-8 z-10 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 active:scale-95"
            title="Scroll to bottom"
          >
            <ChevronRight className="h-5 w-5 rotate-90 text-slate-700 dark:text-slate-300" />
          </button>
        )}

        {/* Input Area */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-gradient-to-b from-white/95 to-white dark:from-slate-900/95 dark:to-slate-900 backdrop-blur-xl">
          <div className="w-full px-4 py-5">
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

            {/* File Upload */}
            <div className="flex items-center gap-2 mb-3">
              <FileUpload
                onFilesSelected={setAttachments}
                maxFiles={5}
                maxSize={10}
              />
              {attachments.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <span>{attachments.length} file(s) attached</span>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => setAttachments([])}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

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
                  className="h-[60px] w-[60px] rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none active:scale-95"
                  disabled={isLoading || !input.trim() || (!sessionId && !pendingSession)}
                >
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Send className="h-6 w-6 transition-transform group-hover:translate-x-0.5" />
                  )}
                </Button>
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
                <div ref={splitPaneContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden">
                  <div className="w-full py-6 px-4 space-y-6">
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

                {/* Split Pane Input */}
                <div className="border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                  <div className="w-full px-4 py-5">
                    <form onSubmit={(e) => handleSubmit(e, true)} className="relative">
                      <div className="flex gap-3 items-end">
                        <div className="flex-1 relative">
                          <textarea
                            ref={splitPaneInputRef}
                            value={splitPaneInput}
                            onChange={(e) => setSplitPaneInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                const formEvent = new Event('submit', { bubbles: true, cancelable: true }) as unknown as React.FormEvent;
                                handleSubmit(formEvent, true);
                              }
                            }}
                            placeholder="Continue the thread conversation..."
                            className="w-full min-h-[60px] max-h-40 px-5 py-4 text-[15px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-slate-50 dark:bg-slate-800/50 border-2 border-purple-200 dark:border-purple-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-600/30 focus:border-purple-500 dark:focus:border-purple-600 resize-none transition-all shadow-sm"
                            disabled={isLoading}
                            rows={1}
                          />
                        </div>
                        <Button
                          type="submit"
                          size="icon"
                          className="h-[60px] w-[60px] rounded-2xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none active:scale-95"
                          disabled={isLoading || !splitPaneInput.trim() || splitPaneSession === 'pending'}
                        >
                          {isLoading ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                          ) : (
                            <Send className="h-6 w-6 transition-transform group-hover:translate-x-0.5" />
                          )}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
