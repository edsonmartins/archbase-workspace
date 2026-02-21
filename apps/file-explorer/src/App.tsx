import { useState, useCallback } from 'react';
import { useWorkspace, useCommand, useStorage, useTheme } from '@archbase/workspace-sdk';

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

const DEFAULT_FS: FileNode[] = [
  {
    id: 'root-docs',
    name: 'Documents',
    type: 'folder',
    children: [
      { id: 'doc-readme', name: 'README.txt', type: 'file' },
      { id: 'doc-notes', name: 'notes.txt', type: 'file' },
    ],
  },
  {
    id: 'root-images',
    name: 'Images',
    type: 'folder',
    children: [
      { id: 'img-photo', name: 'photo.png', type: 'file' },
    ],
  },
  { id: 'root-todo', name: 'todo.txt', type: 'file' },
];

export default function FileExplorer() {
  const sdk = useWorkspace();
  const { isDark } = useTheme();
  const [files, setFiles] = useStorage<FileNode[]>('filesystem', DEFAULT_FS);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const c = isDark
    ? {
        bg: '#0f172a', toolbarBg: '#1e293b', toolbarBorder: '#334155',
        btnBg: '#1e293b', btnBorder: '#475569', btnText: '#e2e8f0',
        breadcrumbText: '#94a3b8', breadcrumbBorder: '#1e293b',
        itemText: '#e2e8f0', selectedBg: '#334155', emptyText: '#64748b',
        deleteBorder: '#ef4444', deleteFg: '#f87171',
      }
    : {
        bg: '#ffffff', toolbarBg: '#f9fafb', toolbarBorder: '#e5e7eb',
        btnBg: '#fff', btnBorder: '#d1d5db', btnText: '#1f2937',
        breadcrumbText: '#6b7280', breadcrumbBorder: '#f3f4f6',
        itemText: '#1f2937', selectedBg: '#e5e7eb', emptyText: '#9ca3af',
        deleteBorder: '#ef4444', deleteFg: '#ef4444',
      };

  // Navigate into current path
  const getCurrentFolder = useCallback((): FileNode[] => {
    let current = files;
    for (const segment of currentPath) {
      const folder = current.find((f) => f.id === segment);
      if (folder?.children) {
        current = folder.children;
      }
    }
    return current;
  }, [files, currentPath]);

  const currentItems = getCurrentFolder();

  const handleNewFile = useCallback(() => {
    const name = `file-${Date.now().toString(36)}.txt`;
    const newFile: FileNode = { id: crypto.randomUUID(), name, type: 'file' };

    const addToPath = (nodes: FileNode[], path: string[], depth: number): FileNode[] => {
      if (depth >= path.length) return [...nodes, newFile];
      return nodes.map((n) =>
        n.id === path[depth] && n.children
          ? { ...n, children: addToPath(n.children, path, depth + 1) }
          : n,
      );
    };

    setFiles(addToPath(files, currentPath, 0));
    sdk.notifications.info('File Explorer', `Created ${name}`);
  }, [files, currentPath, setFiles, sdk]);

  const handleNewFolder = useCallback(() => {
    const name = `folder-${Date.now().toString(36)}`;
    const newFolder: FileNode = { id: crypto.randomUUID(), name, type: 'folder', children: [] };

    const addToPath = (nodes: FileNode[], path: string[], depth: number): FileNode[] => {
      if (depth >= path.length) return [...nodes, newFolder];
      return nodes.map((n) =>
        n.id === path[depth] && n.children
          ? { ...n, children: addToPath(n.children, path, depth + 1) }
          : n,
      );
    };

    setFiles(addToPath(files, currentPath, 0));
    sdk.notifications.info('File Explorer', `Created ${name}/`);
  }, [files, currentPath, setFiles, sdk]);

  const handleDelete = useCallback(
    (id: string) => {
      const removeFromPath = (nodes: FileNode[], path: string[], depth: number): FileNode[] => {
        if (depth >= path.length) return nodes.filter((n) => n.id !== id);
        return nodes.map((n) =>
          n.id === path[depth] && n.children
            ? { ...n, children: removeFromPath(n.children, path, depth + 1) }
            : n,
        );
      };

      setFiles(removeFromPath(files, currentPath, 0));
      if (selectedId === id) setSelectedId(null);
    },
    [files, currentPath, selectedId, setFiles],
  );

  const handleDoubleClick = useCallback(
    (item: FileNode) => {
      if (item.type === 'folder') {
        setCurrentPath((prev) => [...prev, item.id]);
        setSelectedId(null);
      }
    },
    [],
  );

  const handleGoUp = useCallback(() => {
    setCurrentPath((prev) => prev.slice(0, -1));
    setSelectedId(null);
  }, []);

  // Register commands
  useCommand('file-explorer.newFile', handleNewFile);
  useCommand('file-explorer.newFolder', handleNewFolder);

  // Get breadcrumb path names
  const breadcrumbs = ['Root'];
  let traversal = files;
  for (const segment of currentPath) {
    const folder = traversal.find((f) => f.id === segment);
    if (folder) {
      breadcrumbs.push(folder.name);
      traversal = folder.children || [];
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif', background: c.bg }}>
      {/* Toolbar */}
      <div
        style={{
          padding: '6px 12px',
          borderBottom: `1px solid ${c.toolbarBorder}`,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          background: c.toolbarBg,
        }}
      >
        <button
          onClick={handleGoUp}
          disabled={currentPath.length === 0}
          style={{
            border: `1px solid ${c.btnBorder}`,
            background: c.btnBg,
            color: c.btnText,
            borderRadius: 4,
            padding: '4px 8px',
            cursor: currentPath.length === 0 ? 'default' : 'pointer',
            opacity: currentPath.length === 0 ? 0.4 : 1,
            fontSize: 12,
          }}
        >
          Up
        </button>
        <button
          onClick={handleNewFile}
          style={{
            border: `1px solid ${c.btnBorder}`,
            background: c.btnBg,
            color: c.btnText,
            borderRadius: 4,
            padding: '4px 8px',
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          + File
        </button>
        <button
          onClick={handleNewFolder}
          style={{
            border: `1px solid ${c.btnBorder}`,
            background: c.btnBg,
            color: c.btnText,
            borderRadius: 4,
            padding: '4px 8px',
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          + Folder
        </button>
        {selectedId && (
          <button
            onClick={() => handleDelete(selectedId)}
            style={{
              border: `1px solid ${c.deleteBorder}`,
              background: c.btnBg,
              color: c.deleteFg,
              borderRadius: 4,
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Delete
          </button>
        )}
      </div>

      {/* Breadcrumb */}
      <div style={{ padding: '4px 12px', fontSize: 11, color: c.breadcrumbText, borderBottom: `1px solid ${c.breadcrumbBorder}` }}>
        {breadcrumbs.join(' / ')}
      </div>

      {/* File list */}
      <div style={{ flex: 1, overflow: 'auto', padding: 4 }}>
        {currentItems.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: c.emptyText, fontSize: 13 }}>
            Empty folder
          </div>
        ) : (
          currentItems
            .sort((a, b) => {
              if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
              return a.name.localeCompare(b.name);
            })
            .map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                onDoubleClick={() => handleDoubleClick(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  cursor: 'pointer',
                  borderRadius: 4,
                  background: selectedId === item.id ? c.selectedBg : 'transparent',
                  fontSize: 13,
                  color: c.itemText,
                }}
              >
                <span style={{ fontSize: 16 }}>
                  {item.type === 'folder' ? '📁' : '📄'}
                </span>
                <span>{item.name}</span>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
