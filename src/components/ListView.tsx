import { useState } from 'react';
import type { WordEntry, StudyProgress } from '../types/vocab';

interface ListViewProps {
  words: WordEntry[];
  prog: StudyProgress;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  deleteWord: (index: number) => void;
  updateWord: (index: number, updatedEntry: WordEntry) => boolean;
  hidden: boolean;
}

export const ListView: React.FC<ListViewProps> = ({
  words,
  prog,
  searchTerm,
  setSearchTerm,
  deleteWord,
  updateWord,
  hidden,
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<WordEntry>({ w: '', m: '', g: '', e: '' });

  if (hidden) return null;

  const handleStartEdit = (originalIndex: number, word: WordEntry) => {
    setEditingIndex(originalIndex);
    setEditForm({ ...word });
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditForm({ w: '', m: '', g: '', e: '' });
  };

  const handleSaveEdit = (originalIndex: number) => {
    const success = updateWord(originalIndex, editForm);
    if (success) {
      setEditingIndex(null);
    }
  };

  const query = searchTerm.toLowerCase().trim();
  const filteredList = words
    .map((word, originalIndex) => ({ word, originalIndex }))
    .filter(
      ({ word }) =>
        !query ||
        `${word.w} ${word.m} ${word.g}`.toLowerCase().includes(query)
    );

  return (
    <section id="v-list">
      <div className="field">
        <input
          id="search"
          placeholder="Search words, meanings, or Indonesian"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div id="list">
        {filteredList.length === 0 ? (
          <div className="empty">Nothing matches that.</div>
        ) : (
          filteredList.map(({ word, originalIndex }) => {
            const isEditing = editingIndex === originalIndex;
            const status = prog[word.w];

            if (isEditing) {
              return (
                <div
                  key={`edit-${word.w}-${originalIndex}`}
                  className="item"
                  style={{
                    flexDirection: 'column',
                    background: 'var(--paper-2)',
                    border: '1px solid var(--green)',
                    borderRadius: '4px',
                    padding: '16px',
                    marginBottom: '12px',
                  }}
                >
                  <div className="field" style={{ width: '100%' }}>
                    <label style={{ fontSize: '9px' }}>Word</label>
                    <input
                      style={{ fontWeight: 600, fontSize: '16px', fontFamily: 'var(--serif)' }}
                      value={editForm.w}
                      onChange={(e) => setEditForm({ ...editForm, w: e.target.value })}
                      placeholder="Word"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%', marginBottom: '10px' }}>
                    <div className="field" style={{ margin: 0 }}>
                      <label style={{ fontSize: '9px' }}>Meaning</label>
                      <input
                        style={{ fontSize: '13px' }}
                        value={editForm.m}
                        onChange={(e) => setEditForm({ ...editForm, m: e.target.value })}
                        placeholder="Meaning"
                      />
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                      <label style={{ fontSize: '9px' }}>Bahasa Indonesia</label>
                      <input
                        style={{ fontSize: '13px' }}
                        value={editForm.g}
                        onChange={(e) => setEditForm({ ...editForm, g: e.target.value })}
                        placeholder="Bahasa Indonesia"
                      />
                    </div>
                  </div>

                  <div className="field" style={{ width: '100%', marginBottom: '12px' }}>
                    <label style={{ fontSize: '9px' }}>Sentence Example</label>
                    <textarea
                      rows={2}
                      style={{ fontSize: '13px' }}
                      value={editForm.e}
                      onChange={(e) => setEditForm({ ...editForm, e: e.target.value })}
                      placeholder="Example sentence"
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
                    <button type="button" onClick={handleCancelEdit}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="solid"
                      onClick={() => handleSaveEdit(originalIndex)}
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={`${word.w}-${originalIndex}`} className="item">
                <div className="n">{originalIndex + 1}</div>
                <div className="body">
                  <div className="w">
                    {word.w}
                    {status === 1 && <span className="tag k">got it</span>}
                    {status === 2 && <span className="tag l">learning</span>}
                  </div>
                  <div className="m">{word.m}</div>
                  {word.g && <div className="g">{word.g}</div>}
                  {word.e && <div className="e">{word.e}</div>}
                </div>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <button
                    type="button"
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                    onClick={() => handleStartEdit(originalIndex, word)}
                    aria-label={`Edit ${word.w}`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="x"
                    onClick={() => deleteWord(originalIndex)}
                    aria-label={`Delete ${word.w}`}
                  >
                    &times;
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
