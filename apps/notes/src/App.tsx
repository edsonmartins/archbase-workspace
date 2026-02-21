import { useCallback } from 'react';
import { useWorkspace, useCommand, useStorage, useTheme } from '@archbase/workspace-sdk';

interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

const DEFAULT_NOTES: Note[] = [
  {
    id: '1',
    title: 'Welcome',
    content: 'Welcome to Notes! Start typing to create your first note.',
    updatedAt: Date.now(),
  },
];

export default function Notes() {
  const sdk = useWorkspace();
  const { isDark } = useTheme();
  const [notes, setNotes] = useStorage<Note[]>('notes', DEFAULT_NOTES);
  const [activeNoteId, setActiveNoteId] = useStorage<string>('activeNoteId', '1');

  const activeNote = notes.find((n) => n.id === activeNoteId);

  const handleAddNote = useCallback(() => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: 'New Note',
      content: '',
      updatedAt: Date.now(),
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
  }, [notes, setNotes, setActiveNoteId]);

  const handleDeleteNote = useCallback(
    (id: string) => {
      const remaining = notes.filter((n) => n.id !== id);
      setNotes(remaining);
      if (activeNoteId === id) {
        setActiveNoteId(remaining[0]?.id ?? '');
      }
    },
    [activeNoteId, notes, setNotes, setActiveNoteId],
  );

  const handleUpdateContent = useCallback(
    (content: string) => {
      setNotes(
        notes.map((n) =>
          n.id === activeNoteId
            ? {
                ...n,
                content,
                title: content.split('\n')[0]?.slice(0, 40) || 'Untitled',
                updatedAt: Date.now(),
              }
            : n,
        ),
      );
    },
    [activeNoteId, notes, setNotes],
  );

  // Register commands
  useCommand('notes.new', () => {
    handleAddNote();
    sdk.notifications.info('Notes', 'New note created');
  });

  useCommand('notes.delete', () => {
    if (activeNote) {
      handleDeleteNote(activeNote.id);
      sdk.notifications.info('Notes', 'Note deleted');
    }
  });

  const c = isDark
    ? {
        sidebarBg: '#1e293b', sidebarBorder: '#334155', sidebarItemBorder: '#1e293b',
        sidebarTitle: '#e2e8f0', activeBg: '#334155', text: '#e2e8f0', muted: '#64748b',
        editorBg: '#0f172a', editorBorder: '#334155', editorText: '#e2e8f0',
        deleteFg: '#f87171', emptyFg: '#64748b',
      }
    : {
        sidebarBg: '#f9fafb', sidebarBorder: '#e5e7eb', sidebarItemBorder: '#f3f4f6',
        sidebarTitle: '#374151', activeBg: '#e5e7eb', text: '#1f2937', muted: '#9ca3af',
        editorBg: '#ffffff', editorBorder: '#e5e7eb', editorText: '#1f2937',
        deleteFg: '#ef4444', emptyFg: '#9ca3af',
      };

  return (
    <div style={{ display: 'flex', height: '100%', fontFamily: 'sans-serif', background: c.editorBg }}>
      {/* Sidebar */}
      <div
        style={{
          width: 180,
          borderRight: `1px solid ${c.sidebarBorder}`,
          display: 'flex',
          flexDirection: 'column',
          background: c.sidebarBg,
        }}
      >
        <div
          style={{
            padding: '8px 12px',
            borderBottom: `1px solid ${c.sidebarBorder}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: c.sidebarTitle }}>Notes</span>
          <button
            onClick={handleAddNote}
            style={{
              border: 'none',
              background: '#3b82f6',
              color: '#fff',
              borderRadius: 4,
              width: 24,
              height: 24,
              cursor: 'pointer',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            +
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {notes.map((note) => (
            <div
              key={note.id}
              onClick={() => setActiveNoteId(note.id)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                background: note.id === activeNoteId ? c.activeBg : 'transparent',
                borderBottom: `1px solid ${c.sidebarItemBorder}`,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: c.text,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {note.title}
              </div>
              <div style={{ fontSize: 10, color: c.muted, marginTop: 2 }}>
                {new Date(note.updatedAt).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {activeNote ? (
          <>
            <div
              style={{
                padding: '6px 12px',
                borderBottom: `1px solid ${c.editorBorder}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 11, color: c.muted }}>
                {new Date(activeNote.updatedAt).toLocaleString()}
              </span>
              <button
                onClick={() => handleDeleteNote(activeNote.id)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: c.deleteFg,
                  cursor: 'pointer',
                  fontSize: 12,
                  padding: '2px 6px',
                  borderRadius: 4,
                }}
              >
                Delete
              </button>
            </div>
            <textarea
              value={activeNote.content}
              onChange={(e) => handleUpdateContent(e.target.value)}
              placeholder="Start typing..."
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                resize: 'none',
                padding: 16,
                fontSize: 14,
                lineHeight: 1.6,
                fontFamily: 'sans-serif',
                color: c.editorText,
                background: c.editorBg,
              }}
            />
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: c.emptyFg,
              fontSize: 14,
            }}
          >
            No note selected
          </div>
        )}
      </div>
    </div>
  );
}
