import type { ChatCompletionTool } from 'openai/resources/chat/completions';

export const TOOL_DEFINITIONS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'open_app',
      description: 'Opens an application in a new window. Match by app name or ID.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'App display name or ID to open' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'close_window',
      description: 'Closes a window by title or ID. If not specified, closes the focused window.',
      parameters: {
        type: 'object',
        properties: {
          identifier: { type: 'string', description: 'Window title or ID' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'focus_window',
      description: 'Brings a window to focus by title or ID.',
      parameters: {
        type: 'object',
        properties: {
          identifier: { type: 'string', description: 'Window title or ID' },
        },
        required: ['identifier'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'minimize_window',
      description: 'Minimizes a window by title or ID. If not specified, minimizes the focused window.',
      parameters: {
        type: 'object',
        properties: {
          identifier: { type: 'string', description: 'Window title or ID' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'maximize_window',
      description: 'Maximizes a window by title or ID. If not specified, maximizes the focused window.',
      parameters: {
        type: 'object',
        properties: {
          identifier: { type: 'string', description: 'Window title or ID' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'restore_window',
      description: 'Restores a minimized or maximized window to its normal state.',
      parameters: {
        type: 'object',
        properties: {
          identifier: { type: 'string', description: 'Window title or ID' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'tile_windows',
      description: 'Arranges all non-minimized windows in a tiled layout.',
      parameters: {
        type: 'object',
        properties: {
          layout: {
            type: 'string',
            enum: ['horizontal', 'vertical', 'grid'],
            description: 'Tiling layout type',
          },
        },
        required: ['layout'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cascade_windows',
      description: 'Arranges all non-minimized windows in a cascading layout.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'minimize_all',
      description: 'Minimizes all open windows.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'execute_command',
      description: 'Executes a registered command by its ID.',
      parameters: {
        type: 'object',
        properties: {
          commandId: { type: 'string', description: 'The command ID to execute' },
        },
        required: ['commandId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_windows',
      description: 'Lists all open windows with their state.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_apps',
      description: 'Lists all available applications.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_notification',
      description: 'Sends a toast notification to the user.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Notification title' },
          message: { type: 'string', description: 'Notification message' },
          type: {
            type: 'string',
            enum: ['info', 'success', 'warning', 'error'],
            description: 'Notification type',
          },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_setting',
      description: 'Reads a workspace setting by key.',
      parameters: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'The setting key' },
        },
        required: ['key'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_setting',
      description: 'Updates a workspace setting.',
      parameters: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'The setting key' },
          value: { description: 'The new value (string, number, or boolean)' },
        },
        required: ['key', 'value'],
      },
    },
  },
];
