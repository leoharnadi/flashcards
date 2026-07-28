import type { TabType } from '../types/vocab';

interface NavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  return (
    <nav role="tablist">
      <button
        role="tab"
        id="t-study"
        aria-selected={activeTab === 'study'}
        onClick={() => setActiveTab('study')}
      >
        Study
      </button>
      <button
        role="tab"
        id="t-list"
        aria-selected={activeTab === 'list'}
        onClick={() => setActiveTab('list')}
      >
        All words
      </button>
      <button
        role="tab"
        id="t-add"
        aria-selected={activeTab === 'add'}
        onClick={() => setActiveTab('add')}
      >
        Add words
      </button>
      <button
        role="tab"
        id="t-data"
        aria-selected={activeTab === 'data'}
        onClick={() => setActiveTab('data')}
      >
        Backup
      </button>
    </nav>
  );
};
