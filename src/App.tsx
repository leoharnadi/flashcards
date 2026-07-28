import { useVocabDeck } from './hooks/useVocabDeck';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { StudyView } from './components/StudyView';
import { ListView } from './components/ListView';
import { AddView } from './components/AddView';
import { DataView } from './components/DataView';
import { Toast } from './components/Toast';

export function App() {
  const {
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
  } = useVocabDeck();

  return (
    <div className="wrap">
      <Header totalCount={words.length} />

      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      <StudyView
        hidden={activeTab !== 'study'}
        currentCard={currentCard}
        currentIndex={currentIndex}
        totalCards={order.length}
        isRevealed={isRevealed}
        setIsRevealed={setIsRevealed}
        en2id={en2id}
        stats={stats}
        step={step}
        markProgress={markProgress}
        shuffleDeck={shuffleDeck}
        toggleDirection={toggleDirection}
        drillWeakWords={drillWeakWords}
        wholeDeck={wholeDeck}
        clearProgress={clearProgress}
      />

      <ListView
        hidden={activeTab !== 'list'}
        words={words}
        prog={prog}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        deleteWord={deleteWord}
      />

      <AddView
        hidden={activeTab !== 'add'}
        addWord={addWord}
        bulkAddWords={bulkAddWords}
        showToast={showToast}
      />

      <DataView
        hidden={activeTab !== 'data'}
        words={words}
        prog={prog}
        storeMode={storeMode}
        restoreBackup={restoreBackup}
        showToast={showToast}
      />

      <Toast message={toastMessage} />
    </div>
  );
}

export default App;
