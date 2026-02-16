import { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage } from '@archbase/ai-assistant';
import { useAIChat } from './hooks/useAIChat';
import './styles/chat.css';

function SetupPrompt() {
  return (
    <div className="ai-chat-setup">
      <div className="ai-chat-setup-icon">🤖</div>
      <div className="ai-chat-setup-title">AI Desktop Assistant</div>
      <div className="ai-chat-setup-desc">
        Configure your OpenAI API key to start chatting with the AI assistant.
      </div>
      <div className="ai-chat-setup-steps">
        1. Open <code>Settings</code> (Cmd+,)<br />
        2. Set <code>ai-assistant.apiKey</code> to your OpenAI key<br />
        3. Optionally set <code>ai-assistant.model</code> (default: gpt-4o)
      </div>
    </div>
  );
}

function ToolCallBadge({ name, success }: { name: string; success?: boolean }) {
  const className = success === false
    ? 'ai-chat-tool-badge ai-chat-tool-badge-fail'
    : 'ai-chat-tool-badge';
  const icon = success === false ? '✗' : '✓';

  return (
    <div className={className}>
      <span className="ai-chat-tool-badge-icon">{icon}</span>
      {name}
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="ai-chat-thinking">
      <div className="ai-chat-thinking-dot" />
      <div className="ai-chat-thinking-dot" />
      <div className="ai-chat-thinking-dot" />
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'system') return null;

  if (message.role === 'tool') {
    const isError = message.content.startsWith('Error') || message.content.includes('not found');
    return (
      <ToolCallBadge name={message.content.slice(0, 60)} success={!isError} />
    );
  }

  if (message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0) {
    return (
      <>
        {message.content && (
          <div className="ai-chat-msg ai-chat-msg-assistant">{message.content}</div>
        )}
        {message.toolCalls.map((tc) => (
          <ToolCallBadge key={tc.id} name={tc.name} />
        ))}
      </>
    );
  }

  const isError = message.role === 'assistant' && message.content.startsWith('Error:');
  const className = message.role === 'user'
    ? 'ai-chat-msg ai-chat-msg-user'
    : isError
      ? 'ai-chat-msg ai-chat-msg-error'
      : 'ai-chat-msg ai-chat-msg-assistant';

  return <div className={className}>{message.content}</div>;
}

function EmptyState() {
  return (
    <div className="ai-chat-empty">
      <div className="ai-chat-empty-icon">🤖</div>
      <div className="ai-chat-empty-text">How can I help you?</div>
      <div className="ai-chat-empty-hint">
        Try: "Open the calculator" or "Tile all windows"
      </div>
    </div>
  );
}

function StreamingBubble({ content }: { content: string }) {
  if (!content) return null;
  return <div className="ai-chat-msg ai-chat-msg-assistant">{content}</div>;
}

export default function AIAssistantApp() {
  const { messages, status, streamingContent, isConfigured, sendMessage, cancel, clearHistory } = useAIChat();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isLoading = status === 'thinking' || status === 'executing' || status === 'streaming';

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    sendMessage(text);
  }, [input, isLoading, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  if (!isConfigured) {
    return (
      <div className="ai-chat">
        <SetupPrompt />
      </div>
    );
  }

  // Filter out system messages for display
  const visibleMessages = messages.filter((m) => m.role !== 'system');

  return (
    <div className="ai-chat">
      <div className="ai-chat-header">
        <div className="ai-chat-header-title">
          🤖 AI Assistant
        </div>
        {visibleMessages.length > 0 && (
          <button className="ai-chat-clear-btn" onClick={clearHistory} aria-label="Clear chat history">
            Clear
          </button>
        )}
      </div>

      <div className="ai-chat-messages">
        {visibleMessages.length === 0 && !isLoading ? (
          <EmptyState />
        ) : (
          visibleMessages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
        {streamingContent && <StreamingBubble content={streamingContent} />}
        {isLoading && !streamingContent && <ThinkingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      <div className="ai-chat-input-area">
        <textarea
          ref={textareaRef}
          className="ai-chat-textarea"
          placeholder="Ask me to open apps, arrange windows, or run commands..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={isLoading}
        />
        {isLoading ? (
          <button className="ai-chat-cancel-btn" onClick={cancel} aria-label="Cancel request">
            Cancel
          </button>
        ) : (
          <button
            className="ai-chat-send-btn"
            onClick={handleSend}
            disabled={!input.trim()}
            aria-label="Send message"
          >
            Send
          </button>
        )}
      </div>
    </div>
  );
}
