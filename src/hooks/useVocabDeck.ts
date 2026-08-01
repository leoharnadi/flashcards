import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { WordEntry, StudyProgress, TabType, StoreMode, DeckData, DeckInfo } from '../types/vocab';
import { SEED_WORDS } from '../data/seedWords';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const STORAGE_KEY = 'gre-lexicon-v1';
const ACTIVE_DECK_KEY = 'gre-active-deck-v1';

export function useVocabDeck() {
  const [words, setWords] = useState<WordEntry[]>([]);
  const [prog, setProg] = useState<StudyProgress>({});
  const [order, setOrder] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [en2id, setEn2id] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>('study');
  const [storeMode, setStoreMode] = useState<StoreMode>('memory');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeDeck, setActiveDeck] = useState<DeckInfo | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 1600);
  }, []);

  // Initial Load
  useEffect(() => {
    let mode: StoreMode = 'memory';
    let raw: string | null = null;
    try {
      localStorage.setItem('_t', '1');
      localStorage.removeItem('_t');
      mode = 'local';
      raw = localStorage.getItem(STORAGE_KEY);
    } catch {
      mode = 'memory';
    }
    setStoreMode(mode);

    let initialWords: WordEntry[] = [];
    let initialProg: StudyProgress = {};

    if (raw) {
      try {
        const parsed: DeckData = JSON.parse(raw);
        if (Array.isArray(parsed.words) && parsed.words.length > 0) {
          initialWords = parsed.words;
          initialProg = parsed.prog || {};
        }
      } catch {
        // Fallback if corrupted
      }
    }

    if (!initialWords.length) {
      initialWords = SEED_WORDS;
    }

    // Restore saved active deck info if present
    try {
      const savedDeckRaw = localStorage.getItem(ACTIVE_DECK_KEY);
      if (savedDeckRaw) {
        setActiveDeck(JSON.parse(savedDeckRaw));
      }
    } catch {
      // Ignore error
    }

    setWords(initialWords);
    setProg(initialProg);
    setOrder(initialWords.map((_, i) => i));
  }, []);

  // Save changes to storage
  const saveDeck = useCallback((newWords: WordEntry[], newProg: StudyProgress) => {
    try {
      const raw = JSON.stringify({ words: newWords, prog: newProg });
      localStorage.setItem(STORAGE_KEY, raw);
    } catch {
      // Storage unavailable or full
    }
  }, []);

  const saveActiveDeckState = useCallback((deckInfo: DeckInfo | null) => {
    try {
      if (deckInfo) {
        localStorage.setItem(ACTIVE_DECK_KEY, JSON.stringify(deckInfo));
      } else {
        localStorage.removeItem(ACTIVE_DECK_KEY);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Current Card
  const currentCard = useMemo(() => {
    if (!order.length || currentIndex >= order.length) return null;
    return words[order[currentIndex]] || null;
  }, [words, order, currentIndex]);

  // Statistics
  const stats = useMemo(() => {
    const values = Object.values(prog);
    const gotItCount = values.filter((x) => x === 1).length;
    const learningCount = values.filter((x) => x === 2).length;
    const untouchedCount = Math.max(0, words.length - gotItCount - learningCount);
    return { gotItCount, learningCount, untouchedCount };
  }, [words, prog]);

  // Navigation
  const orderRef = useRef(order);
  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  const step = useCallback((n: number) => {
    const len = orderRef.current.length;
    if (!len) return;
    setCurrentIndex((prevIdx) => (prevIdx + n + len) % len);
    setIsRevealed(false);
  }, []);

  const markProgress = useCallback(
    (status: 1 | 2) => {
      if (!currentCard) return;
      const newProg = { ...prog, [currentCard.w]: status };
      setProg(newProg);
      saveDeck(words, newProg);
      step(1);
    },
    [currentCard, prog, words, saveDeck, step]
  );

  const shuffleDeck = useCallback(() => {
    setOrder((prevOrder) => {
      const newOrder = [...prevOrder];
      for (let i = newOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newOrder[i], newOrder[j]] = [newOrder[j], newOrder[i]];
      }
      return newOrder;
    });
    setCurrentIndex(0);
    setIsRevealed(false);
    showToast('Shuffled');
  }, [showToast]);

  const toggleDirection = useCallback(() => {
    setEn2id((prev) => !prev);
    setIsRevealed(false);
  }, []);

  const drillWeakWords = useCallback(() => {
    const weakIndices = words
      .map((card, idx) => ({ card, idx }))
      .filter(({ card }) => prog[card.w] === 2)
      .map(({ idx }) => idx);

    if (!weakIndices.length) {
      showToast('Nothing marked as still learning yet');
      return;
    }
    setOrder(weakIndices);
    setCurrentIndex(0);
    setIsRevealed(false);
    showToast(`${weakIndices.length} weak words`);
  }, [words, prog, showToast]);

  const wholeDeck = useCallback(() => {
    setOrder(words.map((_, i) => i));
    setCurrentIndex(0);
    setIsRevealed(false);
  }, [words]);

  const clearProgress = useCallback(() => {
    setProg({});
    saveDeck(words, {});
    showToast('Progress cleared');
  }, [words, saveDeck, showToast]);

  const addWord = useCallback(
    (w: string, m: string, g: string, e: string) => {
      const trimmedW = w.trim();
      if (!trimmedW) return false;

      const newRecord: WordEntry = {
        w: trimmedW,
        m: m.trim(),
        g: g.trim(),
        e: e.trim(),
      };

      const existingIndex = words.findIndex(
        (c) => c.w.toLowerCase() === trimmedW.toLowerCase()
      );

      let newWords: WordEntry[];
      if (existingIndex >= 0) {
        newWords = [...words];
        newWords[existingIndex] = newRecord;
      } else {
        newWords = [...words, newRecord];
      }

      setWords(newWords);
      setOrder(newWords.map((_, i) => i));
      saveDeck(newWords, prog);
      return true;
    },
    [words, prog, saveDeck]
  );

  const bulkAddWords = useCallback(
    (text: string) => {
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      let count = 0;
      const tempWords = [...words];

      lines.forEach((line) => {
        const parts = line.split('|').map((s) => s.trim());
        const w = parts[0];
        if (w) {
          const rec: WordEntry = {
            w,
            m: parts[1] || '',
            g: parts[2] || '',
            e: parts[3] || '',
          };
          const at = tempWords.findIndex((c) => c.w.toLowerCase() === w.toLowerCase());
          if (at >= 0) {
            tempWords[at] = rec;
          } else {
            tempWords.push(rec);
          }
          count++;
        }
      });

      if (!count) {
        showToast('Nothing to add');
        return;
      }

      setWords(tempWords);
      setOrder(tempWords.map((_, i) => i));
      saveDeck(tempWords, prog);
      showToast(`${count} added`);
    },
    [words, prog, saveDeck, showToast]
  );

  const deleteWord = useCallback(
    (index: number) => {
      const targetWord = words[index];
      if (!targetWord) return;

      const newWords = words.filter((_, i) => i !== index);
      const newProg = { ...prog };
      delete newProg[targetWord.w];

      setWords(newWords);
      setProg(newProg);
      setOrder(newWords.map((_, i) => i));
      setCurrentIndex(0);
      saveDeck(newWords, newProg);
      showToast(`Removed ${targetWord.w}`);
    },
    [words, prog, saveDeck, showToast]
  );

  const updateWord = useCallback(
    (index: number, updatedEntry: WordEntry) => {
      const oldWord = words[index];
      if (!oldWord) return false;

      const trimmedW = updatedEntry.w.trim();
      if (!trimmedW) {
        showToast('Word cannot be empty');
        return false;
      }

      const newRecord: WordEntry = {
        w: trimmedW,
        m: updatedEntry.m.trim(),
        g: updatedEntry.g.trim(),
        e: updatedEntry.e.trim(),
      };

      const newWords = [...words];
      newWords[index] = newRecord;

      const newProg = { ...prog };
      if (oldWord.w !== trimmedW && newProg[oldWord.w] !== undefined) {
        newProg[trimmedW] = newProg[oldWord.w];
        delete newProg[oldWord.w];
      }

      setWords(newWords);
      setProg(newProg);
      saveDeck(newWords, newProg);
      showToast(`Updated "${trimmedW}"`);
      return true;
    },
    [words, prog, saveDeck, showToast]
  );

  const restoreBackup = useCallback(
    (jsonString: string) => {
      try {
        const parsed: DeckData = JSON.parse(jsonString);
        if (!Array.isArray(parsed.words)) throw new Error('Invalid format');

        setWords(parsed.words);
        setProg(parsed.prog || {});
        setOrder(parsed.words.map((_, i) => i));
        setCurrentIndex(0);
        saveDeck(parsed.words, parsed.prog || {});
        showToast(`Restored ${parsed.words.length} entries`);
        return true;
      } catch {
        showToast("That text isn't a valid backup");
        return false;
      }
    },
    [saveDeck, showToast]
  );

  // --- SUPABASE CLOUD DECK FUNCTIONS ---

  const loadDeckByCode = useCallback(
    async (code: string): Promise<boolean> => {
      if (!isSupabaseConfigured) {
        showToast('Supabase is not configured yet');
        return false;
      }

      try {
        // Fetch deck details
        const { data: deck, error: deckErr } = await supabase
          .from('decks')
          .select('id, code, name')
          .eq('code', code.trim().toLowerCase())
          .single();

        if (deckErr || !deck) {
          showToast(`Deck '${code}' not found`);
          return false;
        }

        // Fetch words for this deck
        const { data: wordsData, error: wordsErr } = await supabase
          .from('words')
          .select('w, m, g, e')
          .eq('deck_id', deck.id)
          .order('created_at', { ascending: true });

        if (wordsErr) {
          showToast('Failed to load words for deck');
          return false;
        }

        const loadedWords: WordEntry[] = (wordsData || []).map((row) => ({
          w: row.w,
          m: row.m || '',
          g: row.g || '',
          e: row.e || '',
        }));

        const newDeckInfo: DeckInfo = {
          id: deck.id,
          code: deck.code,
          name: deck.name,
        };

        setWords(loadedWords);
        setOrder(loadedWords.map((_, i) => i));
        setCurrentIndex(0);
        setIsRevealed(false);
        setActiveDeck(newDeckInfo);
        saveActiveDeckState(newDeckInfo);
        saveDeck(loadedWords, prog);
        showToast(`Loaded deck '${deck.name}' (${loadedWords.length} words)`);
        return true;
      } catch (err: unknown) {
        const error = err as Error;
        showToast(error.message || 'Error loading deck');
        return false;
      }
    },
    [saveActiveDeckState, saveDeck, prog, showToast]
  );

  const saveDeckToCloud = useCallback(
    async (password: string): Promise<boolean> => {
      if (!isSupabaseConfigured) {
        showToast('Supabase is not configured yet');
        return false;
      }
      if (!activeDeck) {
        showToast('No active cloud deck selected');
        return false;
      }

      try {
        const { data, error } = await supabase.rpc('update_deck_words', {
          p_code: activeDeck.code,
          p_password: password,
          p_words: words,
        });

        if (error) {
          showToast(error.message || 'Error saving to Supabase');
          return false;
        }

        if (data === true) {
          showToast(`Updated '${activeDeck.name}' on Supabase`);
          return true;
        } else {
          showToast('Incorrect deck password');
          return false;
        }
      } catch (err: unknown) {
        const error = err as Error;
        showToast(error.message || 'Failed to save to Supabase');
        return false;
      }
    },
    [activeDeck, words, showToast]
  );

  const updateDeckSettings = useCallback(
    async (currentPassword: string, newName: string, newPassword: string): Promise<boolean> => {
      if (!isSupabaseConfigured) {
        showToast('Supabase is not configured yet');
        return false;
      }
      if (!activeDeck) {
        showToast('No active cloud deck selected');
        return false;
      }

      try {
        const { data, error } = await supabase.rpc('update_deck_settings', {
          p_code: activeDeck.code,
          p_password: currentPassword,
          p_new_name: newName.trim() || null,
          p_new_password: newPassword || null,
        });

        if (error) {
          showToast(error.message || 'Error updating deck settings');
          return false;
        }

        if (data !== true) {
          showToast('Incorrect deck password');
          return false;
        }

        // Reflect a name change locally; password itself is never stored client-side
        if (newName.trim()) {
          const updatedDeckInfo: DeckInfo = { ...activeDeck, name: newName.trim() };
          setActiveDeck(updatedDeckInfo);
          saveActiveDeckState(updatedDeckInfo);
        }

        return true;
      } catch (err: unknown) {
        const error = err as Error;
        showToast(error.message || 'Failed to update deck settings');
        return false;
      }
    },
    [activeDeck, saveActiveDeckState, showToast]
  );

  const createNewDeck = useCallback(
    async (code: string, name: string, password: string, useCurrentWords: boolean): Promise<boolean> => {
      if (!isSupabaseConfigured) {
        showToast('Supabase is not configured yet');
        return false;
      }

      try {
        const { data, error } = await supabase.rpc('create_deck', {
          p_code: code.trim().toLowerCase(),
          p_name: name.trim() || 'Untitled deck',
          p_password: password,
          p_words: useCurrentWords ? words : [],
        });

        if (error) {
          showToast(error.message || 'Error creating deck');
          return false;
        }

        const newDeckInfo: DeckInfo = {
          id: typeof data === 'string' ? data : undefined,
          code: code.trim().toLowerCase(),
          name: name.trim() || 'Untitled deck',
        };

        setActiveDeck(newDeckInfo);
        saveActiveDeckState(newDeckInfo);

        // Keep local state in sync with what was actually created on Supabase —
        // otherwise an "empty" deck would still show the old words locally,
        // and a subsequent Save would push them back up.
        if (!useCurrentWords) {
          setWords([]);
          setOrder([]);
          setCurrentIndex(0);
          setProg({});
          saveDeck([], {});
        }

        showToast(`Created deck '${newDeckInfo.name}' on Supabase`);
        return true;
      } catch (err: unknown) {
        const error = err as Error;
        showToast(error.message || 'Failed to create deck');
        return false;
      }
    },
    [words, saveActiveDeckState, saveDeck, showToast]
  );

  const resetToLocalSeed = useCallback(() => {
    setActiveDeck(null);
    saveActiveDeckState(null);
    setWords(SEED_WORDS);
    setOrder(SEED_WORDS.map((_, i) => i));
    setCurrentIndex(0);
    setIsRevealed(false);
    saveDeck(SEED_WORDS, prog);
    showToast('Reset to default local deck');
  }, [saveActiveDeckState, saveDeck, prog, showToast]);

  return {
    words,
    prog,
    order,
    currentIndex,
    currentCard,
    isRevealed,
    setIsRevealed,
    en2id,
    activeTab,
    setActiveTab,
    storeMode,
    toastMessage,
    showToast,
    searchTerm,
    setSearchTerm,
    activeDeck,
    loadDeckByCode,
    saveDeckToCloud,
    updateDeckSettings,
    createNewDeck,
    resetToLocalSeed,
    stats,
    step,
    markProgress,
    shuffleDeck,
    toggleDirection,
    drillWeakWords,
    wholeDeck,
    clearProgress,
    addWord,
    bulkAddWords,
    deleteWord,
    updateWord,
    restoreBackup,
  };
}