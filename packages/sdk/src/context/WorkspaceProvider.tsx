import React, { createContext, useContext } from 'react';
import type { WorkspaceSDK } from '@archbase/workspace-types';

const WorkspaceContext = createContext<WorkspaceSDK | null>(null);

export interface WorkspaceProviderProps {
  value: WorkspaceSDK;
  children: React.ReactNode;
}

export function WorkspaceProvider({ value, children }: WorkspaceProviderProps) {
  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceContext(): WorkspaceSDK | null {
  return useContext(WorkspaceContext);
}

export { WorkspaceContext };
