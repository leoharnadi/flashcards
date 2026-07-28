import { useState, useEffect } from 'react';
import type { WordEntry, StudyProgress, StoreMode } from '../types/vocab';

interface DataViewProps {
  words: WordEntry[];
  prog: StudyProgress;
  storeMode: StoreMode;
  restoreBackup: (jsonString: string) => boolean;
  showToast: (msg: string) => void;
  hidden: boolean;
}

export const DataView: React.FC<DataViewProps> = ({
  words,
  prog,
  storeMode,
  restoreBackup,
  showToast,
  hidden,
}) => {
  const [dumpText, setDumpText] = useState('');

  const generateDump = () => {
    return JSON.stringify({ words, prog }, null, 1);
  };

  useEffect(() => {
    if (!hidden) {
      setDumpText(generateDump());
    }
  }, [hidden, words, prog]);

  if (hidden) return null;

  const handleRefresh = () => {
    setDumpText(generateDump());
  };

  const handleRestore = () => {
    restoreBackup(dumpText);
  };

  const handleCopy = async () => {
    const text = generateDump();
    setDumpText(text);
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied');
    } catch {
      showToast('Select and copy manually');
    }
  };

  const notes: Record<StoreMode, string> = {
    cloud: 'Saved automatically in this artifact. It stays here between sessions.',
    local: 'Saved in this browser. Clearing site data will erase it, so keep a backup.',
    memory:
      'Storage is unavailable here, so changes last only until you close the page. Copy your backup text before leaving.',
  };

  return (
    <section id="v-data">
      <p className="note">
        Your deck saves automatically. Copy this text somewhere safe if you want a backup, or paste
        an old backup in and restore it.
      </p>
      <div className="field" style={{ marginTop: '16px' }}>
        <textarea
          id="dump"
          rows={8}
          spellCheck={false}
          value={dumpText}
          onChange={(e) => setDumpText(e.target.value)}
        />
      </div>
      <div className="tools" style={{ marginTop: 0 }}>
        <button id="refresh" onClick={handleRefresh}>
          Show current deck
        </button>
        <button id="restore" onClick={handleRestore}>
          Restore from text
        </button>
        <button id="copy" onClick={handleCopy}>
          Copy to clipboard
        </button>
      </div>
      <p className="note" id="storenote" style={{ marginTop: '18px' }}>
        {notes[storeMode]}
      </p>
    </section>
  );
};
