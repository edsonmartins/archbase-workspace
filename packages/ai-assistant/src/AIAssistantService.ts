import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { useSettingsStore } from '@archbase/workspace-state';
import { useNotificationsStore } from '@archbase/workspace-state';
import { buildSystemPrompt } from './context/contextBuilder';
import { TOOL_DEFINITIONS } from './tools/toolDefinitions';
import { executeToolCalls } from './tools/toolExecutor';
import type { ChatMessage, AIAssistantStatus, StreamEvent, ToolCallRequest } from './types';

const MAX_TOOL_ROUNDS = 5;
const DEFAULT_MODEL = 'gpt-4o';

let _instance: AIAssistantService | null = null;

export function getAIAssistantService(): AIAssistantService {
  if (!_instance) {
    _instance = new AIAssistantService();
  }
  return _instance;
}

export class AIAssistantService {
  private history: ChatMessage[] = [];
  private status: AIAssistantStatus = 'idle';
  private statusListeners = new Set<(status: AIAssistantStatus) => void>();
  private abortController: AbortController | null = null;

  isConfigured(): boolean {
    const apiKey = useSettingsStore.getState().getValue<string>('ai-assistant.apiKey');
    return !!apiKey && apiKey.trim().length > 0;
  }

  getConfig(): { apiKey: string; model: string } | null {
    const settings = useSettingsStore.getState();
    const apiKey = settings.getValue<string>('ai-assistant.apiKey');
    if (!apiKey || apiKey.trim().length === 0) return null;
    const model = settings.getValue<string>('ai-assistant.model') || DEFAULT_MODEL;
    return { apiKey, model };
  }

  getHistory(): ChatMessage[] {
    return [...this.history];
  }

  getStatus(): AIAssistantStatus {
    return this.status;
  }

  clearHistory(): void {
    this.history = [];
    this.setStatus('idle');
  }

  onStatusChange(handler: (status: AIAssistantStatus) => void): () => void {
    this.statusListeners.add(handler);
    return () => {
      this.statusListeners.delete(handler);
    };
  }

  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.setStatus('idle');
  }

  async sendMessage(
    text: string,
    onStream?: (event: StreamEvent) => void,
  ): Promise<ChatMessage> {
    const config = this.getConfig();
    if (!config) {
      const errorMsg = this.createMessage('assistant', 'Please configure your OpenAI API key in Settings first.');
      this.history.push(errorMsg);
      this.setStatus('error');
      return errorMsg;
    }

    // Add user message
    const userMsg = this.createMessage('user', text);
    this.history.push(userMsg);

    const client = new OpenAI({
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: true,
    });

    this.abortController = new AbortController();
    this.setStatus('thinking');

    let toolRounds = 0;

    try {
      while (toolRounds < MAX_TOOL_ROUNDS) {
        // Build messages for API call
        const systemPrompt = buildSystemPrompt();
        const messages: ChatCompletionMessageParam[] = [
          { role: 'system', content: systemPrompt },
          ...this.history.map((m) => this.toChatCompletionMessage(m)),
        ];

        const response = await client.chat.completions.create(
          {
            model: config.model,
            messages,
            tools: TOOL_DEFINITIONS,
            stream: false,
          },
          { signal: this.abortController?.signal },
        );

        const choice = response.choices[0];
        if (!choice) {
          throw new Error('No response from OpenAI');
        }

        const assistantMessage = choice.message;

        // Check for tool calls
        if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
          this.setStatus('executing');

          const toolCalls: ToolCallRequest[] = assistantMessage.tool_calls.map((tc) => ({
            id: tc.id,
            name: tc.function.name,
            arguments: tc.function.arguments,
          }));

          // Add assistant message with tool calls to history
          const assistantMsg = this.createMessage(
            'assistant',
            assistantMessage.content || '',
          );
          assistantMsg.toolCalls = toolCalls;
          this.history.push(assistantMsg);

          // Notify stream listeners about tool calls
          for (const tc of toolCalls) {
            onStream?.({ type: 'tool_call_start', toolCall: tc });
          }

          // Execute all tool calls
          const results = await executeToolCalls(
            toolCalls.map((tc) => ({
              id: tc.id,
              name: tc.name,
              arguments: tc.arguments,
            })),
          );

          // Add tool results to history
          for (const result of results) {
            const toolMsg = this.createMessage('tool', result.result);
            toolMsg.toolCallId = result.toolCallId;
            this.history.push(toolMsg);
            onStream?.({ type: 'tool_call_complete', toolResult: result });
          }

          toolRounds++;
          this.setStatus('thinking');
          continue;
        }

        // No tool calls — this is the final text response
        const content = assistantMessage.content || '';
        const finalMsg = this.createMessage('assistant', content);
        this.history.push(finalMsg);

        onStream?.({ type: 'content_delta', content });
        onStream?.({ type: 'done' });

        this.setStatus('idle');
        return finalMsg;
      }

      // Max tool rounds exceeded
      const maxRoundsMsg = this.createMessage(
        'assistant',
        'I performed several actions but reached the maximum number of steps. Please let me know if you need anything else.',
      );
      this.history.push(maxRoundsMsg);
      onStream?.({ type: 'done' });
      this.setStatus('idle');
      return maxRoundsMsg;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      if (errorMessage === 'The user aborted a request.') {
        const cancelledMsg = this.createMessage('assistant', 'Request cancelled.');
        this.history.push(cancelledMsg);
        this.setStatus('idle');
        return cancelledMsg;
      }

      useNotificationsStore.getState().notify({
        type: 'error',
        title: 'AI Assistant Error',
        message: errorMessage,
      });

      const errorMsg = this.createMessage('assistant', `Error: ${errorMessage}`);
      this.history.push(errorMsg);
      onStream?.({ type: 'error', error: errorMessage });
      this.setStatus('error');
      return errorMsg;
    } finally {
      this.abortController = null;
    }
  }

  private setStatus(status: AIAssistantStatus): void {
    this.status = status;
    for (const listener of this.statusListeners) {
      listener(status);
    }
  }

  private createMessage(
    role: ChatMessage['role'],
    content: string,
  ): ChatMessage {
    return {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role,
      content,
      timestamp: Date.now(),
    };
  }

  private toChatCompletionMessage(msg: ChatMessage): ChatCompletionMessageParam {
    if (msg.role === 'tool' && msg.toolCallId) {
      return {
        role: 'tool',
        content: msg.content,
        tool_call_id: msg.toolCallId,
      };
    }

    if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
      return {
        role: 'assistant',
        content: msg.content || null,
        tool_calls: msg.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.name,
            arguments: tc.arguments,
          },
        })),
      };
    }

    return {
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    };
  }
}
