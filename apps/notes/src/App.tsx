import { useState, useCallback } from 'react';

interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([
    {
      id: '1',
      title: 'Welcome',
      content: 'Welcome to Notes! Start typing to create your first note.',
      updatedAt: Date.now(),
    },
  ]);
  const [activeNoteId, setActiveNoteId] = useState<string>('1');

  const activeNote = notes.find((n) => n.id === activeNoteId);

  const handleAddNote = useCallback(() => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: 'New Note',
      content: '',
      updatedAt: Date.now(),
    };
    setNotes((prev) => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
  }, []);

  const handleDeleteNote = useCallback(
    (id: string) => {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (activeNoteId === id) {
        setActiveNoteId(notes[0]?.id ?? '');
      }
    },
    [activeNoteId, notes],
  );

  const handleUpdateContent = useCallback(
    (content: string) => {
      setNotes((prev) =>
        prev.map((n) =>
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
    [activeNoteId],
  );

  return (
    <div style={{ display: 'flex', height: '100%', fontFamily: 'sans-serif' }}>
      {/* Sidebar */}
      <div
        style={{
          width: 180,
          borderRight: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
          background: '#f9fafb',
        }}
      >
        <div
          style={{
            padding: '8px 12px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Notes</span>
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
                background: note.id === activeNoteId ? '#e5e7eb' : 'transparent',
                borderBottom: '1px solid #f3f4f6',
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#1f2937',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {note.title}
              </div>
              <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
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
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 11, color: '#9ca3af' }}>
                {new Date(activeNote.updatedAt).toLocaleString()}
              </span>
              <button
                onClick={() => handleDeleteNote(activeNote.id)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#ef4444',
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
                color: '#1f2937',
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
              color: '#9ca3af',
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
