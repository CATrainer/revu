// frontend/app/(dashboard)/ai-assistant/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Brain, Sparkles, Send, Loader2, AlertCircle, Plus, Menu, Trash2, MessageSquare, X, Edit2, Check, TrendingUp, Users, Video, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
      if (!sessionId && response.data.items?.length > 0) {
        const mostRecent = response.data.items[0];
        await loadSession(mostRecent.id);
      } else if (!sessionId) {
        // No sessions exist, create a new one
        await createNewSession();
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  };

  const createNewSession = async (autoSwitch = true) => {
    try {
      const response = await api.post('/chat/sessions', {
        title: 'New Chat',
        mode: 'general',
      });
      const newSessionId = response.data.session_id;
      
      await loadSessions(); // Refresh session list
      
      if (autoSwitch) {
        setSessionId(newSessionId);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to create session:', err);
      setError('Failed to create new chat session');
    }
  };

  const loadSession = async (id: string) => {
    try {
      setSessionId(id);
      const response = await api.get(`/chat/messages/${id}`);
      const loadedMessages: Message[] = (response.data.messages || []).map((msg: { id: string; role: string; content: string; created_at: string }) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at),
      }));
      setMessages(loadedMessages);
    } catch (err) {
      console.error('Failed to load messages:', err);
      setError('Failed to load conversation');
    }
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
      // Note: You'll need to add an update endpoint to the backend
      // For now, we'll just update locally
      setSessions(sessions.map(s => s.id === id ? { ...s, title: newTitle } : s));
      setEditingSessionId(null);
    } catch (err) {
      console.error('Failed to update session title:', err);
    }
  };

  const generateSessionTitle = (firstMessage: string): string => {
    // Generate a smart title based on the first message
    const maxLength = 40;
    let title = firstMessage.trim();
    
    // Remove common question words and clean up
    title = title.replace(/^(can you|could you|please|help me|how do i|how to|what|why|when|where)/gi, '');
    title = title.trim();
    
    // Capitalize first letter
    title = title.charAt(0).toUpperCase() + title.slice(1);
    
    // Truncate if too long
    if (title.length > maxLength) {
      title = title.substring(0, maxLength).trim() + '...';
    }
    
    return title || 'New Chat';
  };

  const formatMessageContent = (content: string) => {
    // Simple markdown-like formatting
    const lines = content.split('\n');
    const formatted: JSX.Element[] = [];
    let listItems: string[] = [];
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let codeLanguage = '';

    const flushList = () => {
      if (listItems.length > 0) {
        formatted.push(
          <ul key={formatted.length} className="list-disc list-inside space-y-1 my-2">
            {listItems.map((item, i) => (
              <li key={i} className="text-slate-700 dark:text-slate-300">{item}</li>
            ))}
          </ul>
        );
        listItems = [];
      }
    };

    const flushCodeBlock = () => {
      if (codeBlockContent.length > 0) {
        formatted.push(
          <div key={formatted.length} className="my-3">
            {codeLanguage && (
              <div className="bg-slate-800 text-slate-300 px-3 py-1 text-xs font-mono rounded-t-lg border-b border-slate-700">
                {codeLanguage}
              </div>
            )}
            <pre className={cn(
              "bg-slate-900 text-slate-100 p-4 overflow-x-auto font-mono text-sm",
              codeLanguage ? "rounded-b-lg" : "rounded-lg"
            )}>
              <code>{codeBlockContent.join('\n')}</code>
            </pre>
          </div>
        );
        codeBlockContent = [];
        codeLanguage = '';
      }
    };

    lines.forEach((line, index) => {
      // Code block detection
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          flushCodeBlock();
          inCodeBlock = false;
        } else {
          flushList();
          inCodeBlock = true;
          codeLanguage = line.trim().substring(3).trim();
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        return;
      }

      // Bold text
      line = line.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-900 dark:text-slate-100">$1</strong>');
      
      // Italic text
      line = line.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');
      
      // Inline code
      line = line.replace(/`(.+?)`/g, '<code class="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');

      // Headings
      if (line.startsWith('### ')) {
        flushList();
        formatted.push(
          <h3 key={index} className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-4 mb-2">
            {line.substring(4)}
          </h3>
        );
        return;
      } else if (line.startsWith('## ')) {
        flushList();
        formatted.push(
          <h2 key={index} className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-4 mb-2">
            {line.substring(3)}
          </h2>
        );
        return;
      } else if (line.startsWith('# ')) {
        flushList();
        formatted.push(
          <h1 key={index} className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-4 mb-2">
            {line.substring(2)}
          </h1>
        );
        return;
      }

      // List items
      if (line.trim().match(/^[-*]\s+/)) {
        listItems.push(line.trim().substring(2));
        return;
      }

      // Numbered lists
      if (line.trim().match(/^\d+\.\s+/)) {
        flushList();
        const match = line.trim().match(/^\d+\.\s+(.+)/);
        if (match) {
          listItems.push(match[1]);
        }
        return;
      }

      // Regular paragraph
      flushList();
      if (line.trim()) {
        formatted.push(
          <p
            key={index}
            className="text-slate-700 dark:text-slate-300 leading-relaxed mb-2"
            dangerouslySetInnerHTML={{ __html: line }}
          />
        );
      } else {
        formatted.push(<br key={index} />);
      }
    });

    flushList();
    flushCodeBlock();

    return <div className="space-y-1">{formatted}</div>;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !sessionId) return;

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

    // Auto-generate title if this is the first message
    const isFirstMessage = messages.length === 0;
    if (isFirstMessage) {
      const newTitle = generateSessionTitle(userMessage.content);
      setSessions(sessions.map(s => 
        s.id === sessionId ? { ...s, title: newTitle } : s
      ));
    }

    try {
      // Use EventSource for streaming responses
      const response = await fetch(`${api.defaults.baseURL}/chat/messages?stream=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          session_id: sessionId,
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
      // Refresh session list to update message counts
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
    <div className="h-[calc(100vh-4rem)] flex bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Sidebar */}
      <div
        className={cn(
          'flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 ease-in-out overflow-hidden',
          sidebarOpen ? 'w-80' : 'w-0'
        )}
      >
        <div className="h-full flex flex-col p-4 w-80">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Conversations
            </h2>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* New Chat Button */}
          <Button
            onClick={() => createNewSession(true)}
            className="w-full mb-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto space-y-1">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  'group relative rounded-lg p-3 cursor-pointer transition-all',
                  session.id === sessionId
                    ? 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
                )}
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
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {session.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {session.message_count || 0} messages
                        </p>
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
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 overflow-hidden flex flex-col relative">
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

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
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
              {messages.map((message) => (
                <div
                  key={message.id}
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
                          <div className="prose prose-slate dark:prose-invert max-w-none">
                            {formatMessageContent(message.content)}
                          </div>
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
                    disabled={isLoading || !sessionId}
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
                  disabled={isLoading || !input.trim() || !sessionId}
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
                {!isLoading && sessionId && (
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Powered by Claude AI
                  </p>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}