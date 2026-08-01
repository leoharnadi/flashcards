import { useState } from 'react';
import { AiGenerateView } from './AiGenerateView';

interface AddViewProps {
  addWord: (w: string, m: string, g: string, e: string) => boolean;
  bulkAddWords: (text: string) => void;
  showToast: (msg: string) => void;
  hidden: boolean;
}

export const AddView: React.FC<AddViewProps> = ({
  addWord,
  bulkAddWords,
  showToast,
  hidden,
}) => {
  const [word, setWord] = useState('');
  const [meaning, setMeaning] = useState('');
  const [glossary, setGlossary] = useState('');
  const [example, setExample] = useState('');
  const [bulkText, setBulkText] = useState('');

  if (hidden) return null;

  const handleSave = () => {
    if (!word.trim()) {
      showToast('Enter a word first');
      return;
    }
    if (addWord(word, meaning, glossary, example)) {
      setWord('');
      setMeaning('');
      setGlossary('');
      setExample('');
      showToast('Added');
    }
  };

  const handleBulkAdd = () => {
    bulkAddWords(bulkText);
    setBulkText('');
  };

  return (
    <section id="v-add">
      <div className="field">
        <label htmlFor="f-w">Word</label>
        <input
          id="f-w"
          placeholder="perspicacious"
          value={word}
          onChange={(e) => setWord(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="f-m">Meaning</label>
        <input
          id="f-m"
          placeholder="having keen insight or judgment"
          value={meaning}
          onChange={(e) => setMeaning(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="f-g">Bahasa Indonesia</label>
        <input
          id="f-g"
          placeholder="tajam pikiran, cerdas"
          value={glossary}
          onChange={(e) => setGlossary(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="f-e">Sentence example</label>
        <textarea
          id="f-e"
          rows={2}
          placeholder="Her perspicacious reading of the market saved the fund millions."
          value={example}
          onChange={(e) => setExample(e.target.value)}
        />
      </div>
      <button className="solid" id="save" onClick={handleSave}>
        Add entry
      </button>

      <div className="rule" style={{ margin: '30px 0 18px' }} />

      {/* AI Generator Section */}
      <AiGenerateView bulkAddWords={bulkAddWords} showToast={showToast} />

      <div className="rule" style={{ margin: '30px 0 18px' }} />

      {/* Bulk Raw Input Section */}
      <div className="field">
        <label htmlFor="bulk">Paste many at once (Manual Bulk)</label>
        <p className="note" style={{ margin: '0 0 8px' }}>
          One word per line, fields separated by <code>|</code> — word | meaning | Indonesian |
          example. Missing fields are fine; you can fill them in later.
        </p>
        <textarea
          id="bulk"
          rows={4}
          placeholder="perspicacious | having keen insight | tajam pikiran | Her perspicacious reading saved the fund millions."
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
        />
      </div>
      <button id="bulkgo" onClick={handleBulkAdd}>
        Add all lines
      </button>
    </section>
  );
};
