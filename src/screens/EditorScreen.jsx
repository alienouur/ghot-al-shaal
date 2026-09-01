import { useCallback, useState } from 'react';
import CellScene from '../cell/CellScene';
import { UNIT_LABELS, DEFAULT_LAYOUT, saveLayout, resetLayout } from '../cell/layout';

export default function EditorScreen({ layout, onLayoutChange, onBack }) {
  const [selected, setSelected] = useState(null);
  const [savedMsg, setSavedMsg] = useState('');

  const onMoveUnit = useCallback(
    (unit, x, y) => {
      onLayoutChange((prev) => ({ ...prev, [unit]: { ...prev[unit], x, y } }));
      setSavedMsg('');
    },
    [onLayoutChange]
  );

  const onSelectUnit = useCallback((unit) => {
    setSelected(unit);
    setSavedMsg('');
  }, []);

  const setScale = (s) => {
    if (!selected) return;
    onLayoutChange((prev) => ({ ...prev, [selected]: { ...prev[selected], s } }));
    setSavedMsg('');
  };

  const save = () => {
    const ok = saveLayout(layout);
    setSavedMsg(ok ? 'Layout saved ✓' : 'Could not save (storage unavailable)');
  };

  const resetSelected = () => {
    if (!selected) return;
    onLayoutChange((prev) => ({ ...prev, [selected]: { ...DEFAULT_LAYOUT[selected] } }));
    setSavedMsg('');
  };

  const resetAll = () => {
    onLayoutChange(() => resetLayout());
    setSelected(null);
    setSavedMsg('Layout reset to default');
  };

  return (
    <div className="editor-screen">
      <div className="scene-container">
        <CellScene
          onSelect={() => {}}
          flashId={null}
          interactive={false}
          resetSignal={0}
          layout={layout}
          editorApi={{ selected, onSelectUnit, onMoveUnit }}
        />
      </div>
      <div className="editor-panel">
        <h2>Model Editor</h2>
        <p className="editor-hint">Drag any part to move it. Tap a part to select it.</p>
        <div className="editor-selected">
          {selected ? (
            <>
              <strong>{UNIT_LABELS[selected]}</strong>
              <label className="editor-scale">
                Size
                <input
                  type="range"
                  min="0.5"
                  max="1.8"
                  step="0.05"
                  value={layout[selected].s}
                  onChange={(e) => setScale(Number(e.target.value))}
                />
              </label>
              <button className="link-btn" onClick={resetSelected}>
                Reset this part
              </button>
            </>
          ) : (
            <em>No part selected</em>
          )}
        </div>
        <div className="editor-actions">
          <button className="big-btn" onClick={save}>
            SAVE LAYOUT
          </button>
          <button className="big-btn secondary" onClick={resetAll}>
            RESET ALL
          </button>
          <button className="big-btn secondary" onClick={onBack}>
            BACK
          </button>
        </div>
        {savedMsg && <p className="editor-saved">{savedMsg}</p>}
      </div>
    </div>
  );
}
