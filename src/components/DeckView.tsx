import { useEffect, useState } from 'react';
import type { DeckInfo } from '../types/vocab';
import { isSupabaseConfigured } from '../lib/supabase';

const RECENT_DECKS_KEY = 'gre-lexicon-recent-decks';
const MAX_RECENT_DECKS = 8;

interface RecentDeck {
  code: string;
  name: string;
}

function loadRecentDecks(): RecentDeck[] {
  try {
    const raw = localStorage.getItem(RECENT_DECKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function pushRecentDeck(deck: RecentDeck): RecentDeck[] {
  const existing = loadRecentDecks().filter((d) => d.code !== deck.code);
  const updated = [deck, ...existing].slice(0, MAX_RECENT_DECKS);
  try {
    localStorage.setItem(RECENT_DECKS_KEY, JSON.stringify(updated));
  } catch {
    // storage unavailable — history just won't persist this session
  }
  return updated;
}

function removeRecentDeck(code: string): RecentDeck[] {
  const updated = loadRecentDecks().filter((d) => d.code !== code);
  try {
    localStorage.setItem(RECENT_DECKS_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
  return updated;
}

interface DeckViewProps {
  activeDeck: DeckInfo | null;
  loadDeckByCode: (code: string) => Promise<boolean>;
  saveDeckToCloud: (password: string) => Promise<boolean>;
  createNewDeck: (code: string, name: string, password: string, useCurrentWords: boolean) => Promise<boolean>;
  updateDeckSettings: (currentPassword: string, newName: string, newPassword: string) => Promise<boolean>;
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
  updateDeckSettings,
  resetToLocalSeed,
  wordsCount,
  showToast,
  hidden,
}) => {
  // Load deck form
  const [loadCode, setLoadCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Recently loaded decks (local to this browser only)
  const [recentDecks, setRecentDecks] = useState<RecentDeck[]>(() => loadRecentDecks());

  useEffect(() => {
    if (activeDeck) {
      setRecentDecks(pushRecentDeck({ code: activeDeck.code, name: activeDeck.name }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDeck?.code, activeDeck?.name]);

  const handleRemoveRecent = (code: string) => {
    setRecentDecks(removeRecentDeck(code));
  };

  // Update deck words form
  const [updatePassword, setUpdatePassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Update deck settings (name / password) form
  const [settingsCurrentPassword, setSettingsCurrentPassword] = useState('');
  const [settingsNewName, setSettingsNewName] = useState('');
  const [settingsNewPassword, setSettingsNewPassword] = useState('');
  const [settingsConfirmPassword, setSettingsConfirmPassword] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Create deck form
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [useCurrentWords, setUseCurrentWords] = useState(true);
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

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDeck) {
      showToast('No active cloud deck selected');
      return;
    }
    if (!settingsCurrentPassword) {
      showToast('Enter the current deck password');
      return;
    }
    const nameChanged = settingsNewName.trim().length > 0;
    const passwordChanged = settingsNewPassword.length > 0;

    if (!nameChanged && !passwordChanged) {
      showToast('Enter a new name and/or new password');
      return;
    }
    if (passwordChanged && settingsNewPassword !== settingsConfirmPassword) {
      showToast("New passwords don't match");
      return;
    }

    setIsSavingSettings(true);
    const success = await updateDeckSettings(
      settingsCurrentPassword,
      settingsNewName.trim(),
      settingsNewPassword
    );
    setIsSavingSettings(false);
    if (success) {
      setSettingsCurrentPassword('');
      setSettingsNewName('');
      setSettingsNewPassword('');
      setSettingsConfirmPassword('');
      showToast('Deck settings updated');
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
    const success = await createNewDeck(code, name, password, useCurrentWords);
    setIsCreating(false);
    if (success) {
      setNewCode('');
      setNewName('');
      setNewPassword('');
      setUseCurrentWords(true);
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
              {activeDeck ? activeDeck.name : 'Default Vocabulary'}
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
      <form onSubmit={handleLoadDeck} className="field" style={{ marginBottom: '16px' }}>
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

      {/* Recently loaded decks (remembered on this device only) */}
      {recentDecks.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <div className="meta" style={{ marginBottom: '8px' }}>Recently Loaded on This Device</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {recentDecks.map((deck) => (
              <div key={deck.code} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => loadDeckByCode(deck.code)}
                  style={{ fontSize: '13px' }}
                >
                  {deck.name} <span className="meta" style={{ textTransform: 'none' }}>({deck.code})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveRecent(deck.code)}
                  aria-label={`Remove ${deck.code} from history`}
                  style={{ fontSize: '12px', padding: '2px 6px' }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rule" style={{ margin: '24px 0' }} />

      {activeDeck && (
        <>
          {/* 2. Edit / Save Deck Words */}
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

          {/* 2b. Update Deck Name / Password */}
          <form onSubmit={handleSaveSettings} style={{ marginBottom: '28px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>
              Update Deck Name / Password
            </label>
            <p className="note" style={{ margin: '4px 0 10px' }}>
              Requires the current password. Leave a field blank to keep it unchanged.
              There's no password recovery — double-check before submitting.
            </p>
            <div className="field">
              <label htmlFor="f-settings-current-pass">Current Password</label>
              <input
                id="f-settings-current-pass"
                type="password"
                placeholder="Required to authorize changes"
                value={settingsCurrentPassword}
                onChange={(e) => setSettingsCurrentPassword(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="f-settings-name">New Display Name</label>
              <input
                id="f-settings-name"
                placeholder={activeDeck.name}
                value={settingsNewName}
                onChange={(e) => setSettingsNewName(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="f-settings-new-pass">New Password</label>
              <input
                id="f-settings-new-pass"
                type="password"
                placeholder="Leave blank to keep current password"
                value={settingsNewPassword}
                onChange={(e) => setSettingsNewPassword(e.target.value)}
              />
            </div>
            {settingsNewPassword.length > 0 && (
              <div className="field">
                <label htmlFor="f-settings-confirm-pass">Confirm New Password</label>
                <input
                  id="f-settings-confirm-pass"
                  type="password"
                  placeholder="Re-enter new password"
                  value={settingsConfirmPassword}
                  onChange={(e) => setSettingsConfirmPassword(e.target.value)}
                />
              </div>
            )}
            <button type="submit" className="solid" disabled={isSavingSettings}>
              {isSavingSettings ? 'Updating...' : 'Update Deck Settings'}
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
          Create a shareable deck protected by password.
        </p>
        <div className="field">
          <label>Initial Content</label>
          <div style={{ display: 'flex', gap: '20px', fontSize: '13px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 400 }}>
              <input
                type="radio"
                name="initial-content"
                checked={useCurrentWords}
                onChange={() => setUseCurrentWords(true)}
              />
              Use current {wordsCount} words
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 400 }}>
              <input
                type="radio"
                name="initial-content"
                checked={!useCurrentWords}
                onChange={() => setUseCurrentWords(false)}
              />
              Start empty
            </label>
          </div>
        </div>
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