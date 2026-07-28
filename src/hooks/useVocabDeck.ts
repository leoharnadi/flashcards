import { useState, useEffect, useCallback, useMemo } from 'react';
import type { WordEntry, StudyProgress, TabType, StoreMode, DeckData } from '../types/vocab';
import { SEED_WORDS } from '../data/seedWords';

const STORAGE_KEY = 'gre-lexicon-v1';

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
  const step = useCallback((n: number) => {
    setOrder((prevOrder) => {
      if (!prevOrder.length) return prevOrder;
      setCurrentIndex((prevIdx) => (prevIdx + n + prevOrder.length) % prevOrder.length);
      setIsRevealed(false);
      return prevOrder;
    });
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
      let tempWords = [...words];

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
    restoreBackup,
  };
}
