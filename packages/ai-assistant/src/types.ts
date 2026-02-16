export interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: number;
  toolCallId?: string;
  toolCalls?: ToolCallRequest[];
}

export interface ToolCallRequest {
  id: string;
  name: string;
  arguments: string;
}

export interface ToolCallResult {
  toolCallId: string;
  name: string;
  result: string;
  success: boolean;
}

export interface AIAssistantConfig {
  apiKey: string;
  model: string;
  provider: 'openai';
}

export type AIAssistantStatus = 'idle' | 'thinking' | 'executing' | 'streaming' | 'error';

export interface StreamEvent {
  type: 'content_delta' | 'tool_call_start' | 'tool_call_complete' | 'done' | 'error';
  content?: string;
  toolCall?: ToolCallRequest;
  toolResult?: ToolCallResult;
  error?: string;
}
