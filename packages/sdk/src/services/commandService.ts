import { useCommandRegistryStore } from '@archbase/workspace-state';
import type { CommandHandler } from '@archbase/workspace-types';

export function createCommandService(appId: string) {
  return {
    register(commandId: string, handler: CommandHandler): () => void {
      const store = useCommandRegistryStore.getState();
      const existing = store.getCommand(commandId);
      if (existing) {
        store.setHandler(commandId, handler);
      } else {
        store.register({
          id: commandId,
          title: commandId,
          source: appId,
          enabled: true,
          handler,
        });
      }
      return () => {
        // Only remove handler, don't unregister the command
        // (it may have been declared in the manifest)
        const cmd = useCommandRegistryStore.getState().getCommand(commandId);
        if (cmd && cmd.source === appId) {
          useCommandRegistryStore.getState().setHandler(commandId, undefined);
        }
      };
    },

    async execute(commandId: string, ...args: unknown[]) {
      await useCommandRegistryStore.getState().execute(commandId, ...args);
    },
  };
}
