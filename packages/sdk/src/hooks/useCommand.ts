import { useEffect, useRef } from 'react';
import type { CommandHandler } from '@archbase/workspace-types';
import { useWorkspace } from './useWorkspace';

/**
 * Register a command handler that auto-unregisters on unmount.
 * Must be used within a <WorkspaceProvider>.
 */
export function useCommand(commandId: string, handler: CommandHandler): void {
  const sdk = useWorkspace();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const unregister = sdk.commands.register(commandId, (...args: unknown[]) =>
      handlerRef.current(...args),
    );
    return unregister;
  }, [sdk, commandId]);
}
