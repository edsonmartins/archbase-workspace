import { useState, useCallback, useEffect, useRef } from 'react';
import {
  getAIAssistantService,
  type ChatMessage,
  type AIAssistantStatus,
  type StreamEvent,
} from '@archbase/ai-assistant';
import { useSettingsStore } from '@archbase/workspace-state';

export function useAIChat() {
  const serviceRef = useRef(getAIAssistantService());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<AIAssistantStatus>('idle');
  const [streamingContent, setStreamingContent] = useState('');

  // Reactively track isConfigured via settings store subscription
  const apiKey = useSettingsStore((s) => s.getValue<string>('ai-assistant.apiKey'));
  const isConfigured = !!apiKey && apiKey.trim().length > 0;

  useEffect(() => {
    const service = serviceRef.current;
    const unsub = service.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });
    return unsub;
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const service = serviceRef.current;
    setStreamingContent('');

    await service.sendMessage(text, (event: StreamEvent) => {
      switch (event.type) {
        case 'content_delta':
          setStreamingContent(event.content || '');
          break;
        case 'tool_call_start':
        case 'tool_call_complete':
          // Refresh messages to show tool call badges immediately
          setMessages(service.getHistory());
          break;
        case 'done':
          setStreamingContent('');
          break;
      }
    });

    setMessages(service.getHistory());
  }, []);

  const cancel = useCallback(() => {
    serviceRef.current.cancel();
    setMessages(serviceRef.current.getHistory());
    setStreamingContent('');
  }, []);

  const clearHistory = useCallback(() => {
    serviceRef.current.clearHistory();
    setMessages([]);
    setStreamingContent('');
  }, []);

  return {
    messages,
    status,
    streamingContent,
    isConfigured,
    sendMessage,
    cancel,
    clearHistory,
  };
}
