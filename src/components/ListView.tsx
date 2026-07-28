import type { WordEntry, StudyProgress } from '../types/vocab';

interface ListViewProps {
  words: WordEntry[];
  prog: StudyProgress;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  deleteWord: (index: number) => void;
  hidden: boolean;
}

export const ListView: React.FC<ListViewProps> = ({
  words,
  prog,
  searchTerm,
  setSearchTerm,
  deleteWord,
  hidden,
}) => {
  if (hidden) return null;

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
            const status = prog[word.w];
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
                <button
                  className="x"
                  onClick={() => deleteWord(originalIndex)}
                  aria-label={`Delete ${word.w}`}
                >
                  &times;
                </button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
