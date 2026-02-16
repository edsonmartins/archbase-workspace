export { AIAssistantService, getAIAssistantService } from './AIAssistantService';
export { buildSystemPrompt, getWorkspaceSnapshot } from './context/contextBuilder';
export { TOOL_DEFINITIONS } from './tools/toolDefinitions';
export { executeTool, executeToolCalls, resolveWindowId, resolveAppId } from './tools/toolExecutor';
export type {
  ChatMessage,
  ToolCallRequest,
  ToolCallResult,
  AIAssistantConfig,
  AIAssistantStatus,
  StreamEvent,
} from './types';
