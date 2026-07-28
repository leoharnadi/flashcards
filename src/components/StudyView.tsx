import { useEffect } from 'react';
import type { WordEntry } from '../types/vocab';

interface StudyViewProps {
  currentCard: WordEntry | null;
  currentIndex: number;
  totalCards: number;
  isRevealed: boolean;
  setIsRevealed: (revealed: boolean) => void;
  en2id: boolean;
  stats: { gotItCount: number; learningCount: number; untouchedCount: number };
  step: (n: number) => void;
  markProgress: (status: 1 | 2) => void;
  shuffleDeck: () => void;
  toggleDirection: () => void;
  drillWeakWords: () => void;
  wholeDeck: () => void;
  clearProgress: () => void;
  hidden: boolean;
}

export const StudyView: React.FC<StudyViewProps> = ({
  currentCard,
  currentIndex,
  totalCards,
  isRevealed,
  setIsRevealed,
  en2id,
  stats,
  step,
  markProgress,
  shuffleDeck,
  toggleDirection,
  drillWeakWords,
  wholeDeck,
  clearProgress,
  hidden,
}) => {
  // Keyboard listeners for left/right arrow navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (hidden) return;
      const target = e.target as HTMLElement;
      if (target && /input|textarea/i.test(target.tagName)) return;

      if (e.key === 'ArrowRight') {
        step(1);
      } else if (e.key === 'ArrowLeft') {
        step(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hidden, step]);

  if (hidden) return null;

  const progressPercent = totalCards > 0 ? Math.round(((currentIndex + 1) / totalCards) * 100) : 0;

  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      setIsRevealed(!isRevealed);
    }
  };

  return (
    <section id="v-study">
      <div className="bar">
        <i id="fill" style={{ width: `${progressPercent}%` }} />
      </div>

      <div
        className="entry"
        id="card"
        role="button"
        tabIndex={0}
        aria-label="Flashcard, press Space or Enter to reveal"
        onClick={() => setIsRevealed(!isRevealed)}
        onKeyDown={handleCardKeyDown}
      >
        <div className="num" id="num">
          {totalCards > 0 ? `${currentIndex + 1} / ${totalCards}` : ''}
        </div>

        <div className={`head ${en2id ? '' : 'sm'}`} id="head">
          {currentCard
            ? en2id
              ? currentCard.w
              : currentCard.g || currentCard.m
            : 'No cards'}
        </div>

        {!isRevealed && (
          <div className="tap" id="tap">
            Tap or press space to reveal
          </div>
        )}

        {isRevealed && currentCard && (
          <div id="back">
            <div className="rule" />
            <div className="sense" id="sense">
              {currentCard.m}
            </div>
            <div className="gloss" id="gloss">
              {en2id ? currentCard.g : currentCard.w}
            </div>
            {currentCard.e && (
              <div className="quote" id="quote">
                {currentCard.e}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="row">
        <button className="narrow" id="prev" aria-label="Previous" onClick={() => step(-1)}>
          &larr;
        </button>
        <button id="hard" onClick={() => markProgress(2)}>
          Still learning
        </button>
        <button id="easy" onClick={() => markProgress(1)}>
          Got it
        </button>
        <button className="narrow" id="next" aria-label="Next" onClick={() => step(1)}>
          &rarr;
        </button>
      </div>

      <div className="stats">
        <div className="stat">
          <b id="s-k">{stats.gotItCount}</b>
          <span>Got it</span>
        </div>
        <div className="stat">
          <b id="s-l">{stats.learningCount}</b>
          <span>Still learning</span>
        </div>
        <div className="stat">
          <b id="s-n">{stats.untouchedCount}</b>
          <span>Untouched</span>
        </div>
      </div>

      <div className="tools">
        <button id="shuffle" onClick={shuffleDeck}>
          Shuffle
        </button>
        <button id="dir" onClick={toggleDirection}>
          {en2id ? 'English \u2192 Indonesian' : 'Indonesian \u2192 English'}
        </button>
        <button id="drill" onClick={drillWeakWords}>
          Drill weak words
        </button>
        <button id="whole" onClick={wholeDeck}>
          Whole deck
        </button>
        <button id="clearp" onClick={clearProgress}>
          Clear progress
        </button>
      </div>
    </section>
  );
};
