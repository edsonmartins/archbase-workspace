import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockStore = {
  getCommand: vi.fn(),
  setHandler: vi.fn(),
  register: vi.fn(),
  execute: vi.fn().mockResolvedValue(undefined),
};

vi.mock('@archbase/workspace-state', () => ({
  useCommandRegistryStore: { getState: () => mockStore },
}));

import { createCommandService } from '../services/commandService';

describe('createCommandService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers a new command when it does not exist', () => {
    mockStore.getCommand.mockReturnValue(undefined);
    const service = createCommandService('my-app');
    const handler = vi.fn();

    service.register('app.doSomething', handler);

    expect(mockStore.getCommand).toHaveBeenCalledWith('app.doSomething');
    expect(mockStore.register).toHaveBeenCalledWith({
      id: 'app.doSomething',
      title: 'app.doSomething',
      source: 'my-app',
      enabled: true,
      handler,
    });
    expect(mockStore.setHandler).not.toHaveBeenCalled();
  });

  it('updates handler when command already exists', () => {
    const existingCommand = { id: 'app.doSomething', title: 'Do Something', source: 'my-app' };
    mockStore.getCommand.mockReturnValue(existingCommand);
    const service = createCommandService('my-app');
    const newHandler = vi.fn();

    service.register('app.doSomething', newHandler);

    expect(mockStore.setHandler).toHaveBeenCalledWith('app.doSomething', newHandler);
    expect(mockStore.register).not.toHaveBeenCalled();
  });

  it('register returns an unregister function', () => {
    mockStore.getCommand.mockReturnValue(undefined);
    const service = createCommandService('my-app');
    const handler = vi.fn();

    const unregister = service.register('app.action', handler);

    expect(typeof unregister).toBe('function');
  });

  it('unregister clears handler only when source matches appId', () => {
    // First call during register: command does not exist
    mockStore.getCommand.mockReturnValueOnce(undefined);
    const service = createCommandService('my-app');
    const handler = vi.fn();
    const unregister = service.register('app.action', handler);

    // When unregister is called, getCommand returns the command with matching source
    mockStore.getCommand.mockReturnValue({ id: 'app.action', source: 'my-app', handler });

    unregister();

    expect(mockStore.setHandler).toHaveBeenCalledWith('app.action', undefined);
  });

  it('unregister does not clear handler when source does not match appId', () => {
    mockStore.getCommand.mockReturnValueOnce(undefined);
    const service = createCommandService('my-app');
    const handler = vi.fn();
    const unregister = service.register('app.action', handler);

    vi.clearAllMocks();

    // When unregister is called, the command source is different
    mockStore.getCommand.mockReturnValue({ id: 'app.action', source: 'other-app', handler });

    unregister();

    expect(mockStore.setHandler).not.toHaveBeenCalled();
  });

  it('execute calls store.execute with args', async () => {
    const service = createCommandService('my-app');

    await service.execute('app.doSomething', 'arg1', 42);

    expect(mockStore.execute).toHaveBeenCalledWith('app.doSomething', 'arg1', 42);
  });

  it('multiple commands can be registered independently', () => {
    mockStore.getCommand.mockReturnValue(undefined);
    const service = createCommandService('my-app');
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    service.register('app.action1', handler1);
    service.register('app.action2', handler2);

    expect(mockStore.register).toHaveBeenCalledTimes(2);
    expect(mockStore.register).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'app.action1', handler: handler1 }),
    );
    expect(mockStore.register).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'app.action2', handler: handler2 }),
    );
  });
});
