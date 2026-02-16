import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSettingsStore, useWindowsStore, useAppRegistryStore } from '@archbase/workspace-state';
import { AIAssistantService } from '../AIAssistantService';

// Track the most recent mock instance
let mockCreateFn: ReturnType<typeof vi.fn>;

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: (...args: unknown[]) => mockCreateFn(...args),
        },
      };
    },
  };
});

describe('AIAssistantService', () => {
  let service: AIAssistantService;

  beforeEach(() => {
    service = new AIAssistantService();
    mockCreateFn = vi.fn();

    // Reset settings
    useSettingsStore.getState().registerSettings('ai-assistant', [
      { key: 'ai-assistant.apiKey', type: 'string', default: '', description: 'API Key' },
      { key: 'ai-assistant.model', type: 'string', default: 'gpt-4o', description: 'Model' },
    ]);
    // Ensure API key is reset to empty
    useSettingsStore.getState().resetToDefault('ai-assistant.apiKey');
  });

  it('isConfigured returns false without API key', () => {
    expect(service.isConfigured()).toBe(false);
  });

  it('isConfigured returns true with API key', () => {
    useSettingsStore.getState().setValue('ai-assistant.apiKey', 'sk-test-key');
    expect(service.isConfigured()).toBe(true);
  });

  it('getHistory returns empty array initially', () => {
    expect(service.getHistory()).toEqual([]);
  });

  it('clearHistory empties the history', async () => {
    useSettingsStore.getState().setValue('ai-assistant.apiKey', 'sk-test-key');

    mockCreateFn.mockResolvedValue({
      choices: [{ message: { content: 'Hello!', tool_calls: null } }],
    });

    await service.sendMessage('Hi');
    expect(service.getHistory().length).toBeGreaterThan(0);

    service.clearHistory();
    expect(service.getHistory()).toEqual([]);
  });

  it('sendMessage returns error without config', async () => {
    const result = await service.sendMessage('Hello');
    expect(result.role).toBe('assistant');
    expect(result.content).toContain('configure');
    expect(service.getStatus()).toBe('error');
  });

  it('getStatus returns idle initially', () => {
    expect(service.getStatus()).toBe('idle');
  });

  it('onStatusChange fires on status changes', async () => {
    const handler = vi.fn();
    const unsub = service.onStatusChange(handler);

    // Trigger a status change by sending without config
    await service.sendMessage('test');

    expect(handler).toHaveBeenCalled();
    unsub();
  });

  it('cancel resets status to idle', () => {
    service.cancel();
    expect(service.getStatus()).toBe('idle');
  });

  it('sendMessage with config calls OpenAI (text response)', async () => {
    useSettingsStore.getState().setValue('ai-assistant.apiKey', 'sk-test-key');

    mockCreateFn.mockResolvedValue({
      choices: [{ message: { content: 'Hi there!', tool_calls: null } }],
    });

    const result = await service.sendMessage('Hello');

    expect(result.role).toBe('assistant');
    expect(result.content).toBe('Hi there!');

    const history = service.getHistory();
    expect(history.length).toBe(2);
    expect(history[0].role).toBe('user');
    expect(history[0].content).toBe('Hello');
    expect(history[1].role).toBe('assistant');
    expect(history[1].content).toBe('Hi there!');
  });

  it('sendMessage handles tool calls and continues loop', async () => {
    useSettingsStore.getState().setValue('ai-assistant.apiKey', 'sk-test-key');

    // Register an app so list_apps tool can find it
    useAppRegistryStore.getState().registerManifest({
      id: 'dev.archbase.calculator',
      name: 'calculator',
      version: '0.1.0',
      entrypoint: './src/App.tsx',
      remoteEntry: 'http://localhost:3002/mf-manifest.json',
      displayName: 'Calculator',
      icon: '🧮',
      source: 'local',
      permissions: [],
    });

    // First call: OpenAI returns a tool call
    mockCreateFn.mockResolvedValueOnce({
      choices: [{
        message: {
          content: '',
          tool_calls: [{
            id: 'call_1',
            type: 'function',
            function: {
              name: 'list_apps',
              arguments: '{}',
            },
          }],
        },
      }],
    });

    // Second call: OpenAI returns text response after seeing tool results
    mockCreateFn.mockResolvedValueOnce({
      choices: [{ message: { content: 'Here are your apps!', tool_calls: null } }],
    });

    const result = await service.sendMessage('What apps are available?');

    expect(result.content).toBe('Here are your apps!');
    expect(mockCreateFn).toHaveBeenCalledTimes(2);

    // History should have: user, assistant(tool_calls), tool(result), assistant(text)
    const history = service.getHistory();
    expect(history.length).toBe(4);
    expect(history[0].role).toBe('user');
    expect(history[1].role).toBe('assistant');
    expect(history[1].toolCalls).toBeDefined();
    expect(history[1].toolCalls!.length).toBe(1);
    expect(history[2].role).toBe('tool');
    expect(history[2].toolCallId).toBe('call_1');
    expect(history[3].role).toBe('assistant');
    expect(history[3].content).toBe('Here are your apps!');

    // Cleanup
    useAppRegistryStore.getState().unregister('dev.archbase.calculator');
  });

  it('sendMessage respects max tool rounds', async () => {
    useSettingsStore.getState().setValue('ai-assistant.apiKey', 'sk-test-key');

    // Always return tool calls to trigger the max rounds limit
    mockCreateFn.mockResolvedValue({
      choices: [{
        message: {
          content: '',
          tool_calls: [{
            id: 'call_loop',
            type: 'function',
            function: {
              name: 'list_windows',
              arguments: '{}',
            },
          }],
        },
      }],
    });

    const result = await service.sendMessage('Do something');

    // Should hit the max rounds limit (5) and return a graceful message
    expect(result.content).toContain('maximum');
    expect(mockCreateFn).toHaveBeenCalledTimes(5);
    expect(service.getStatus()).toBe('idle');
  });

  it('sendMessage handles OpenAI API errors', async () => {
    useSettingsStore.getState().setValue('ai-assistant.apiKey', 'sk-test-key');

    mockCreateFn.mockRejectedValue(new Error('Rate limit exceeded'));

    const result = await service.sendMessage('Hello');

    expect(result.role).toBe('assistant');
    expect(result.content).toContain('Rate limit exceeded');
    expect(service.getStatus()).toBe('error');
  });

  it('sendMessage calls onStream with events', async () => {
    useSettingsStore.getState().setValue('ai-assistant.apiKey', 'sk-test-key');

    mockCreateFn.mockResolvedValue({
      choices: [{ message: { content: 'Response!', tool_calls: null } }],
    });

    const streamEvents: Array<{ type: string }> = [];
    await service.sendMessage('Hello', (event) => {
      streamEvents.push({ type: event.type });
    });

    expect(streamEvents).toContainEqual({ type: 'content_delta' });
    expect(streamEvents).toContainEqual({ type: 'done' });
  });

  it('sendMessage handles abort correctly', async () => {
    useSettingsStore.getState().setValue('ai-assistant.apiKey', 'sk-test-key');

    mockCreateFn.mockRejectedValue(new Error('The user aborted a request.'));

    const result = await service.sendMessage('Hello');

    expect(result.content).toBe('Request cancelled.');
    expect(service.getStatus()).toBe('idle');
  });

  it('onStatusChange unsubscribe stops notifications', () => {
    const handler = vi.fn();
    const unsub = service.onStatusChange(handler);
    unsub();

    // Force status change by calling cancel
    service.cancel();

    // The handler should NOT have been called after cancel
    // (it may have been called 0 times since cancel sets to idle which is already idle)
    const callsAfterUnsub = handler.mock.calls.length;
    service.cancel();
    expect(handler.mock.calls.length).toBe(callsAfterUnsub);
  });

  it('sendMessage handles empty choices array', async () => {
    useSettingsStore.getState().setValue('ai-assistant.apiKey', 'sk-test-key');

    mockCreateFn.mockResolvedValue({ choices: [] });

    const result = await service.sendMessage('Hello');

    expect(result.role).toBe('assistant');
    expect(result.content).toContain('Error');
    expect(service.getStatus()).toBe('error');
  });
});
