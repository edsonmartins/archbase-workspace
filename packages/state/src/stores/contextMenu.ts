import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type { ContextMenuItem } from '@archbase/workspace-types';

// ============================================================
// Types
// ============================================================

interface ContextMenuStoreState {
  visible: boolean;
  position: { x: number; y: number };
  items: ContextMenuItem[];
}

interface ContextMenuStoreActions {
  open: (position: { x: number; y: number }, items: ContextMenuItem[]) => void;
  close: () => void;
}

type ContextMenuStore = ContextMenuStoreState & ContextMenuStoreActions;

const INITIAL_STATE: ContextMenuStoreState = {
  visible: false,
  position: { x: 0, y: 0 },
  items: [],
};

// ============================================================
// Store
// ============================================================

export const useContextMenuStore = create<ContextMenuStore>()(
  devtools(
    subscribeWithSelector((set) => ({
      ...INITIAL_STATE,

      open: (position, items) => {
        set({ visible: true, position, items });
      },

      close: () => {
        set(INITIAL_STATE);
      },
    })),
    { name: 'ContextMenuStore' },
  ),
);
