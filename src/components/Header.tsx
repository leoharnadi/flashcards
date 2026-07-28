
interface HeaderProps {
  totalCount: number;
}

export const Header: React.FC<HeaderProps> = ({ totalCount }) => {
  return (
    <header>
      <h1>
        Lexicon <em>— GRE vocabulary</em>
      </h1>
      <div className="meta">
        <span>{totalCount}</span> entries
      </div>
    </header>
  );
};
