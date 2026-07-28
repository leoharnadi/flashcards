export interface WordEntry {
  w: string; // Word
  m: string; // Meaning / Definition
  g: string; // Bahasa Indonesia translation
  e: string; // Sentence example
}

export type StudyStatus = 0 | 1 | 2; // 0 = Untouched, 1 = Got it, 2 = Still learning

export type StudyProgress = Record<string, StudyStatus>;

export type TabType = 'study' | 'list' | 'add' | 'data';

export type StoreMode = 'cloud' | 'local' | 'memory';

export interface DeckData {
  words: WordEntry[];
  prog: StudyProgress;
}
