import { useCallback, useEffect, useRef } from 'react';
import { usePendingPrompt, usePermissionsStore } from '@archbase/workspace-state';
import type { Permission } from '@archbase/workspace-types';

const PERMISSION_LABELS: Record<Permission, string> = {
  notifications: 'Show Notifications',
  storage: 'Access Local Storage',
  'clipboard.read': 'Read Clipboard',
  'clipboard.write': 'Write to Clipboard',
  'filesystem.read': 'Read Files',
  'filesystem.write': 'Write Files',
  network: 'Access Network',
  camera: 'Use Camera',
  microphone: 'Use Microphone',
};

const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  notifications: 'This app wants to display desktop notifications.',
  storage: 'This app wants to store data locally on your device.',
  'clipboard.read': 'This app wants to read from your clipboard.',
  'clipboard.write': 'This app wants to write to your clipboard.',
  'filesystem.read': 'This app wants to read files from your device.',
  'filesystem.write': 'This app wants to write files to your device.',
  network: 'This app wants to make network requests.',
  camera: 'This app wants to access your camera.',
  microphone: 'This app wants to access your microphone.',
};

export function PermissionPrompt() {
  const prompt = usePendingPrompt();
  const resolvePrompt = usePermissionsStore((s) => s.resolvePrompt);
  const dialogRef = useRef<HTMLDivElement>(null);
  const denyBtnRef = useRef<HTMLButtonElement>(null);

  const handleGrant = useCallback(() => {
    resolvePrompt('granted');
  }, [resolvePrompt]);

  const handleDeny = useCallback(() => {
    resolvePrompt('denied');
  }, [resolvePrompt]);

  // Auto-focus the Deny button when prompt appears (safer default)
  useEffect(() => {
    if (prompt) {
      denyBtnRef.current?.focus();
    }
  }, [prompt]);

  // Escape key dismisses (denies) the prompt
  useEffect(() => {
    if (!prompt) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDeny();
      }
      // Focus trap: Tab/Shift+Tab cycles within the dialog
      if (e.key === 'Tab') {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusable = dialog.querySelectorAll<HTMLElement>('button');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prompt, handleDeny]);

  if (!prompt) return null;

  const label = PERMISSION_LABELS[prompt.permission] ?? prompt.permission;
  const description = PERMISSION_DESCRIPTIONS[prompt.permission] ?? '';

  return (
    <div className="permission-prompt-overlay">
      <div
        ref={dialogRef}
        className="permission-prompt-card"
        role="alertdialog"
        aria-modal="true"
        aria-label="Permission Request"
        aria-describedby="permission-prompt-desc"
      >
        <div className="permission-prompt-header">
          {prompt.appIcon && <span className="permission-prompt-icon">{prompt.appIcon}</span>}
          <span className="permission-prompt-app-name">{prompt.appDisplayName}</span>
        </div>

        <div className="permission-prompt-body">
          <div className="permission-prompt-label">{label}</div>
          <div className="permission-prompt-description" id="permission-prompt-desc">{description}</div>
        </div>

        <div className="permission-prompt-actions">
          <button
            ref={denyBtnRef}
            className="permission-prompt-btn permission-prompt-deny"
            onClick={handleDeny}
          >
            Deny
          </button>
          <button className="permission-prompt-btn permission-prompt-allow" onClick={handleGrant}>
            Allow
          </button>
        </div>
      </div>
    </div>
  );
}
