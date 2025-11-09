'use client';

import { useState } from 'react';
import { Opportunity } from '@/lib/monetization-api';

interface Props {
  onSendMessage: (message: string) => Promise<void>;
  opportunities: Opportunity[];
  loading?: boolean;
}

const suggestedPrompts = [
  "Can I do multiple opportunities at once?",
  "Show me lower effort options",
  "I want something I can launch faster",
  "Give me options that don't require much budget",
];

export default function ConversationalInterface({
  onSendMessage,
  opportunities,
  loading = false
}: Props) {
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  async function handleSend() {
    if (!message.trim() || isProcessing || loading) return;

    setIsProcessing(true);
    try {
      await onSendMessage(message);
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsProcessing(false);
    }
  }

  function handlePromptClick(prompt: string) {
    setMessage(prompt);
    // Auto-send after a brief delay
    setTimeout(() => {
      if (!isProcessing && !loading) {
        handleSend();
      }
    }, 100);
  }

  const isDisabled = loading || isProcessing;

  return (
    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
      <h3 className="font-semibold text-lg mb-4 text-gray-900">
        Have questions about these opportunities?
      </h3>

      <div className="flex gap-3 mb-4">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask anything..."
          disabled={isDisabled}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <button
          onClick={handleSend}
          disabled={isDisabled || !message.trim()}
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition font-medium"
        >
          {isProcessing || loading ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Thinking...
            </span>
          ) : (
            'Ask'
          )}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-gray-600 mr-2 self-center">Suggested:</span>
        {suggestedPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handlePromptClick(prompt)}
            disabled={isDisabled}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-md hover:border-emerald-500 hover:text-emerald-700 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {prompt}
          </button>
        ))}
      </div>

      {(isProcessing || loading) && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Regenerating opportunities based on your feedback...
          </p>
        </div>
      )}
    </div>
  );
}
