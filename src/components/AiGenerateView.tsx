import { useState } from 'react';
import type { WordEntry } from '../types/vocab';
import { generatePrompt, generateWordsViaApi, isAiConfigured } from '../lib/ai';

interface AiGenerateViewProps {
  bulkAddWords: (text: string) => void;
  showToast: (msg: string) => void;
}

interface GeneratedItem extends WordEntry {
  id: string;
  selected: boolean;
}

export const AiGenerateView: React.FC<AiGenerateViewProps> = ({
  bulkAddWords,
  showToast,
}) => {
  const [rawWordsInput, setRawWordsInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewItems, setPreviewItems] = useState<GeneratedItem[]>([]);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);

  const getCleanWordList = (): string[] => {
    return rawWordsInput
      .split(/[\n,]+/)
      .map((w) => w.trim())
      .filter(Boolean);
  };

  const handleCopyPrompt = async () => {
    const wordList = getCleanWordList();
    if (!wordList.length) {
      showToast('Enter at least one word to generate prompt');
      return;
    }

    const prompt = generatePrompt(wordList);
    setGeneratedPrompt(prompt);
    try {
      await navigator.clipboard.writeText(prompt);
      showToast('Prompt copied to clipboard!');
    } catch {
      showToast('Prompt generated (select & copy manually)');
    }
  };

  const parsePipeLines = (rawText: string): GeneratedItem[] => {
    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
    const items: GeneratedItem[] = [];

    lines.forEach((line, idx) => {
      // Remove any leading numbers like "1. word | ..." if present
      const cleanLine = line.replace(/^\d+[\.\)]\s*/, '');
      const parts = cleanLine.split('|').map((s) => s.trim());
      if (parts[0]) {
        items.push({
          id: `${parts[0]}-${idx}-${Date.now()}`,
          w: parts[0],
          m: parts[1] || '',
          g: parts[2] || '',
          e: parts[3] || '',
          selected: true,
        });
      }
    });

    return items;
  };

  const handleGenerateViaApi = async () => {
    const wordList = getCleanWordList();
    if (!wordList.length) {
      showToast('Enter at least one word first');
      return;
    }

    setIsLoading(true);
    try {
      const rawResponse = await generateWordsViaApi(wordList);
      const parsed = parsePipeLines(rawResponse);
      if (!parsed.length) {
        showToast('No valid flashcards returned from AI');
      } else {
        setPreviewItems(parsed);
        showToast(`Generated ${parsed.length} flashcards for review`);
      }
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message || 'AI Generation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    setPreviewItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleToggleAll = (select: boolean) => {
    setPreviewItems((prev) => prev.map((item) => ({ ...item, selected: select })));
  };

  const handleUpdateItem = (id: string, field: keyof WordEntry, value: string) => {
    setPreviewItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleAddSelectedToDeck = () => {
    const selected = previewItems.filter((item) => item.selected && item.w.trim());
    if (!selected.length) {
      showToast('No items selected');
      return;
    }

    const pipeString = selected
      .map((item) => `${item.w.trim()} | ${item.m.trim()} | ${item.g.trim()} | ${item.e.trim()}`)
      .join('\n');

    bulkAddWords(pipeString);
    setPreviewItems([]);
    setRawWordsInput('');
    showToast(`Added ${selected.length} AI cards to deck`);
  };

  return (
    <div style={{ marginTop: '30px', marginBottom: '30px' }}>
      <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
        ✨ AI Flashcard Generator
      </label>
      <p className="note" style={{ margin: '4px 0 10px' }}>
        Type or paste words below (comma or newline separated). Use AI to instantly generate definitions, Indonesian translations, and sentence examples.
      </p>

      <div className="field">
        <textarea
          rows={3}
          placeholder="e.g. perspicacious, obfuscate, ephemeral, recalcitrant"
          value={rawWordsInput}
          onChange={(e) => setRawWordsInput(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {isAiConfigured ? (
          <button
            type="button"
            className="solid"
            disabled={isLoading}
            onClick={handleGenerateViaApi}
          >
            {isLoading ? 'Generating with Gemini...' : '✨ Generate with Gemini API'}
          </button>
        ) : (
          <button
            type="button"
            disabled
            title="Set VITE_GEMINI_API_KEY in .env to enable direct API generation"
          >
            ✨ Generate with Gemini (API key required)
          </button>
        )}

        <button type="button" onClick={handleCopyPrompt}>
          📋 Copy LLM Prompt (Free / Manual)
        </button>
      </div>

      {!isAiConfigured && (
        <p className="note" style={{ color: 'var(--amber)', fontSize: '12px' }}>
          💡 Note: Direct API generation requires <code>VITE_GEMINI_API_KEY</code> in your <code>.env</code> file. You can still use the <strong>"Copy LLM Prompt"</strong> button anytime for free with ChatGPT or Claude!
        </p>
      )}

      {/* Generated Prompt Modal/Box */}
      {generatedPrompt && (
        <div style={{ background: 'var(--paper-2)', border: '1px solid var(--rule-2)', borderRadius: '4px', padding: '14px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span className="meta">Copied Prompt</span>
            <button type="button" onClick={() => setGeneratedPrompt(null)} style={{ padding: '2px 8px', fontSize: '11px' }}>
              Close
            </button>
          </div>
          <textarea
            rows={5}
            readOnly
            value={generatedPrompt}
            style={{ fontSize: '12px', fontFamily: 'var(--mono)' }}
          />
        </div>
      )}

      {/* Editable Preview Table */}
      {previewItems.length > 0 && (
        <div style={{ background: 'var(--paper-2)', border: '1px solid var(--green)', borderRadius: '4px', padding: '18px', marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
            <h4 style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: '18px', color: 'var(--green)' }}>
              Review AI Generated Cards ({previewItems.filter((i) => i.selected).length} / {previewItems.length} selected)
            </h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={() => handleToggleAll(true)} style={{ fontSize: '11px', padding: '4px 8px' }}>
                Select all
              </button>
              <button type="button" onClick={() => handleToggleAll(false)} style={{ fontSize: '11px', padding: '4px 8px' }}>
                Deselect all
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '450px', overflowY: 'auto', paddingRight: '4px' }}>
            {previewItems.map((item) => (
              <div
                key={item.id}
                style={{
                  border: '1px solid var(--rule-2)',
                  borderRadius: '4px',
                  padding: '12px',
                  background: item.selected ? 'var(--paper)' : 'opacity 0.6',
                  opacity: item.selected ? 1 : 0.65,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => handleToggleSelect(item.id)}
                    style={{ width: 'auto', cursor: 'pointer' }}
                  />
                  <input
                    style={{ fontWeight: 600, fontSize: '15px', fontFamily: 'var(--serif)' }}
                    value={item.w}
                    onChange={(e) => handleUpdateItem(item.id, 'w', e.target.value)}
                    placeholder="Word"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  <div>
                    <label style={{ fontSize: '9px' }}>Meaning</label>
                    <input
                      style={{ fontSize: '13px' }}
                      value={item.m}
                      onChange={(e) => handleUpdateItem(item.id, 'm', e.target.value)}
                      placeholder="Meaning"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '9px' }}>Indonesian</label>
                    <input
                      style={{ fontSize: '13px' }}
                      value={item.g}
                      onChange={(e) => handleUpdateItem(item.id, 'g', e.target.value)}
                      placeholder="Indonesian"
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '9px' }}>Example Sentence</label>
                  <input
                    style={{ fontSize: '13px' }}
                    value={item.e}
                    onChange={(e) => handleUpdateItem(item.id, 'e', e.target.value)}
                    placeholder="Example sentence"
                  />
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={() => setPreviewItems([])}>
              Cancel
            </button>
            <button type="button" className="solid" onClick={handleAddSelectedToDeck}>
              Add Selected ({previewItems.filter((i) => i.selected).length}) to Deck
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
