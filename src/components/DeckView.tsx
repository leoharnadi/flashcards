import { useState } from 'react';
import type { DeckInfo } from '../types/vocab';
import { isSupabaseConfigured } from '../lib/supabase';

interface DeckViewProps {
  activeDeck: DeckInfo | null;
  loadDeckByCode: (code: string) => Promise<boolean>;
  saveDeckToCloud: (password: string) => Promise<boolean>;
  createNewDeck: (code: string, name: string, password: string) => Promise<boolean>;
  resetToLocalSeed: () => void;
  wordsCount: number;
  showToast: (msg: string) => void;
  hidden: boolean;
}

export const DeckView: React.FC<DeckViewProps> = ({
  activeDeck,
  loadDeckByCode,
  saveDeckToCloud,
  createNewDeck,
  resetToLocalSeed,
  wordsCount,
  showToast,
  hidden,
}) => {
  // Load deck form
  const [loadCode, setLoadCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Update deck form
  const [updatePassword, setUpdatePassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Create deck form
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  if (hidden) return null;

  const handleLoadDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = loadCode.trim();
    if (!code) {
      showToast('Enter a deck code');
      return;
    }
    setIsLoading(true);
    const success = await loadDeckByCode(code);
    setIsLoading(false);
    if (success) {
      setLoadCode('');
    }
  };

  const handleSaveDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDeck) {
      showToast('No active cloud deck selected');
      return;
    }
    if (!updatePassword) {
      showToast('Enter deck password');
      return;
    }
    setIsUpdating(true);
    const success = await saveDeckToCloud(updatePassword);
    setIsUpdating(false);
    if (success) {
      setUpdatePassword('');
    }
  };

  const handleCreateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = newCode.trim().toLowerCase();
    const name = newName.trim() || 'Untitled deck';
    const password = newPassword;

    if (!code) {
      showToast('Enter a deck code (e.g. gre-2026)');
      return;
    }
    if (!password) {
      showToast('Set a password for your deck');
      return;
    }

    setIsCreating(true);
    const success = await createNewDeck(code, name, password);
    setIsCreating(false);
    if (success) {
      setNewCode('');
      setNewName('');
      setNewPassword('');
    }
  };

  return (
    <section id="v-deck">
      {!isSupabaseConfigured && (
        <div style={{ background: '#F5EBD8', border: '1px solid #9A6A0E', padding: '12px 16px', borderRadius: '4px', marginBottom: '20px', color: '#9A6A0E' }}>
          <strong>Supabase Configuration Notice:</strong>
          <p style={{ margin: '4px 0 0', fontSize: '13px' }}>
            Please ensure your <code>.env</code> file contains valid <code>VITE_SUPABASE_URL</code> (HTTPS API URL) and <code>VITE_SUPABASE_ANON_KEY</code> to enable cloud deck syncing.
          </p>
        </div>
      )}

      {/* Active Deck Banner */}
      <div style={{ background: 'var(--paper-2)', border: '1px solid var(--rule-2)', borderRadius: '4px', padding: '16px 20px', marginBottom: '24px' }}>
        <div className="meta" style={{ marginBottom: '6px' }}>Active Deck</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: '20px' }}>
              {activeDeck ? activeDeck.name : 'Default GRE Vocabulary'}
            </h3>
            <div className="meta" style={{ marginTop: '4px', textTransform: 'none' }}>
              Code: <code>{activeDeck ? activeDeck.code : 'local-seed'}</code> • {wordsCount} words
            </div>
          </div>
          {activeDeck && (
            <button onClick={resetToLocalSeed}>Switch to Default Local Deck</button>
          )}
        </div>
      </div>

      {/* 1. Load Deck by Code */}
      <form onSubmit={handleLoadDeck} className="field" style={{ marginBottom: '28px' }}>
        <label htmlFor="f-load-code">Load Deck by Code</label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            id="f-load-code"
            placeholder="Enter deck code (e.g. gre-vocab)"
            value={loadCode}
            onChange={(e) => setLoadCode(e.target.value)}
          />
          <button type="submit" disabled={isLoading} style={{ whiteSpace: 'nowrap' }}>
            {isLoading ? 'Loading...' : 'Load Deck'}
          </button>
        </div>
      </form>

      <div className="rule" style={{ margin: '24px 0' }} />

      {/* 2. Edit / Save Deck (if active deck is loaded) */}
      {activeDeck && (
        <>
          <form onSubmit={handleSaveDeck} style={{ marginBottom: '28px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>
              Save Current Deck Changes to Supabase
            </label>
            <p className="note" style={{ margin: '4px 0 10px' }}>
              This will update deck <code>{activeDeck.code}</code> on Supabase with your current {wordsCount} words.
            </p>
            <div className="field">
              <label htmlFor="f-upd-pass">Deck Password</label>
              <input
                id="f-upd-pass"
                type="password"
                placeholder="Enter password for this deck"
                value={updatePassword}
                onChange={(e) => setUpdatePassword(e.target.value)}
              />
            </div>
            <button type="submit" className="solid" disabled={isUpdating}>
              {isUpdating ? 'Saving to Supabase...' : 'Save to Supabase'}
            </button>
          </form>
          <div className="rule" style={{ margin: '24px 0' }} />
        </>
      )}

      {/* 3. Create New Deck */}
      <form onSubmit={handleCreateDeck}>
        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>
          Create New Deck on Supabase
        </label>
        <p className="note" style={{ margin: '4px 0 14px' }}>
          Create a shareable deck protected by password. Your current {wordsCount} words will be saved as initial content.
        </p>
        <div className="field">
          <label htmlFor="f-new-code">Deck Code (unique identifier for sharing)</label>
          <input
            id="f-new-code"
            placeholder="e.g. gre-quant-2026"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="f-new-name">Deck Display Name</label>
          <input
            id="f-new-name"
            placeholder="e.g. Advanced GRE Words"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="f-new-pass">Secret Password (required for editing later)</label>
          <input
            id="f-new-pass"
            type="password"
            placeholder="Choose a strong password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="solid" disabled={isCreating}>
          {isCreating ? 'Creating Deck...' : 'Create Deck'}
        </button>
      </form>
    </section>
  );
};
