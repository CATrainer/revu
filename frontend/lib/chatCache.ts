/**
 * IndexedDB-based chat message cache for offline persistence and instant loading
 * Provides ChatGPT-like UX with seamless session switching
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'streaming' | 'completed' | 'error';
  session_id: string;
}

interface ChatCacheDB extends DBSchema {
  messages: {
    key: string; // message_id
    value: Message;
    indexes: { 
      'by-session': string; // session_id
      'by-timestamp': Date;
    };
  };
  sessions: {
    key: string; // session_id
    value: {
      id: string;
      title: string;
      last_accessed: Date;
      message_count: number;
    };
  };
  activeStreams: {
    key: string; // session_id:message_id
    value: {
      session_id: string;
      message_id: string;
      status: string;
      started_at: Date;
    };
  };
}

class ChatCache {
  private db: IDBPDatabase<ChatCacheDB> | null = null;
  private readonly DB_NAME = 'repruv-chat-cache';
  private readonly DB_VERSION = 1;

  async init() {
    if (this.db) return;

    this.db = await openDB<ChatCacheDB>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        // Messages store
        if (!db.objectStoreNames.contains('messages')) {
          const messageStore = db.createObjectStore('messages', { keyPath: 'id' });
          messageStore.createIndex('by-session', 'session_id');
          messageStore.createIndex('by-timestamp', 'timestamp');
        }

        // Sessions store
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'id' });
        }

        // Active streams store
        if (!db.objectStoreNames.contains('activeStreams')) {
          db.createObjectStore('activeStreams', { keyPath: 'key' });
        }
      },
    });
  }

  /**
   * Get all messages for a session from cache
   */
  async getSessionMessages(sessionId: string): Promise<Message[]> {
    await this.init();
    if (!this.db) return [];

    const messages = await this.db.getAllFromIndex('messages', 'by-session', sessionId);
    return messages.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  /**
   * Save/update a message in cache
   */
  async saveMessage(message: Message): Promise<void> {
    await this.init();
    if (!this.db) return;

    await this.db.put('messages', message);

    // Update session metadata
    const session = await this.db.get('sessions', message.session_id);
    if (session) {
      session.last_accessed = new Date();
      await this.db.put('sessions', session);
    }
  }

  /**
   * Save multiple messages in batch
   */
  async saveMessages(messages: Message[]): Promise<void> {
    await this.init();
    if (!this.db) return;

    const tx = this.db.transaction('messages', 'readwrite');
    await Promise.all(messages.map(msg => tx.store.put(msg)));
    await tx.done;
  }

  /**
   * Update session metadata
   */
  async updateSession(sessionId: string, data: { title?: string; message_count?: number }) {
    await this.init();
    if (!this.db) return;

    let session = await this.db.get('sessions', sessionId);
    if (!session) {
      session = {
        id: sessionId,
        title: data.title || 'New Chat',
        last_accessed: new Date(),
        message_count: data.message_count || 0,
      };
    } else {
      if (data.title) session.title = data.title;
      if (data.message_count !== undefined) session.message_count = data.message_count;
      session.last_accessed = new Date();
    }

    await this.db.put('sessions', session);
  }

  /**
   * Mark a stream as active
   */
  async markStreamActive(sessionId: string, messageId: string, status: string) {
    await this.init();
    if (!this.db) return;

    await this.db.put('activeStreams', {
      key: `${sessionId}:${messageId}`,
      session_id: sessionId,
      message_id: messageId,
      status,
      started_at: new Date(),
    });
  }

  /**
   * Remove an active stream
   */
  async removeActiveStream(sessionId: string, messageId: string) {
    await this.init();
    if (!this.db) return;

    await this.db.delete('activeStreams', `${sessionId}:${messageId}`);
  }

  /**
   * Get all active streams
   */
  async getActiveStreams() {
    await this.init();
    if (!this.db) return [];

    return await this.db.getAll('activeStreams');
  }

  /**
   * Clear old cache data (keep last 50 sessions)
   */
  async cleanup() {
    await this.init();
    if (!this.db) return;

    // Get all sessions sorted by last_accessed
    const sessions = await this.db.getAll('sessions');
    sessions.sort((a, b) => 
      new Date(b.last_accessed).getTime() - new Date(a.last_accessed).getTime()
    );

    // Delete messages from old sessions (keep last 50)
    if (sessions.length > 50) {
      const oldSessions = sessions.slice(50);
      const tx = this.db.transaction('messages', 'readwrite');
      
      for (const session of oldSessions) {
        const cursor = await tx.store.index('by-session').openCursor(session.id);
        if (cursor) {
          await cursor.delete();
        }
      }
      
      await tx.done;

      // Delete old session metadata
      const sessionTx = this.db.transaction('sessions', 'readwrite');
      await Promise.all(oldSessions.map(s => sessionTx.store.delete(s.id)));
      await sessionTx.done;
    }

    // Clean up stale active streams (older than 1 hour)
    const streams = await this.db.getAll('activeStreams');
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const staleStreams = streams.filter(s => new Date(s.started_at) < oneHourAgo);
    
    if (staleStreams.length > 0) {
      const tx = this.db.transaction('activeStreams', 'readwrite');
      await Promise.all(staleStreams.map(s => tx.store.delete(s.key)));
      await tx.done;
    }
  }

  /**
   * Clear all cache data
   */
  async clearAll() {
    await this.init();
    if (!this.db) return;

    await this.db.clear('messages');
    await this.db.clear('sessions');
    await this.db.clear('activeStreams');
  }
}

// Export singleton instance
export const chatCache = new ChatCache();

// Initialize on import
if (typeof window !== 'undefined') {
  chatCache.init().catch(console.error);
  
  // Cleanup old data on page load
  chatCache.cleanup().catch(console.error);
}
