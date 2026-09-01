import { useCallback, useState } from 'react';
import CellScene from '../cell/CellScene';
import {
  UNIT_LABELS,
  DEFAULT_LAYOUT,
  saveLayout,
  resetLayout,
  saveRemoteLayout,
  verifyPassword,
} from '../cell/layout';

export default function EditorScreen({ layout, onLayoutChange, onBack }) {
  const [selected, setSelected] = useState(null);
  const [savedMsg, setSavedMsg] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [checking, setChecking] = useState(false);

  const unlock = async () => {
    if (!password) return;
    setChecking(true);
    setAuthError('');
    const ok = await verifyPassword(password);
    setChecking(false);
    if (ok) setUnlocked(true);
    else setAuthError('Wrong password / كلمة السر غير صحيحة');
  };

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

  const save = async () => {
    setSavedMsg('Saving…');
    saveLayout(layout);
    const ok = await saveRemoteLayout(layout, password);
    setSavedMsg(
      ok ? 'Layout saved for everyone ✓' : 'Could not save to server — try again'
    );
  };

  const resetSelected = () => {
    if (!selected) return;
    onLayoutChange((prev) => ({ ...prev, [selected]: { ...DEFAULT_LAYOUT[selected] } }));
    setSavedMsg('');
  };

  const resetAll = async () => {
    const defaults = resetLayout();
    onLayoutChange(() => defaults);
    setSelected(null);
    setSavedMsg('Saving…');
    const ok = await saveRemoteLayout(defaults, password);
    setSavedMsg(ok ? 'Layout reset to default ✓' : 'Could not save to server — try again');
  };

  if (!unlocked) {
    return (
      <div className="screen start-screen">
        <div className="panel">
          <h2 className="subtitle">Model Editor</h2>
          <label className="name-label" htmlFor="editor-password">
            Enter password / أدخل كلمة السر:
          </label>
          <input
            id="editor-password"
            className="name-input"
            type="password"
            value={password}
            placeholder="Password"
            onChange={(e) => {
              setPassword(e.target.value);
              setAuthError('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && unlock()}
            autoComplete="off"
          />
          {authError && (
            <p className="error-text" role="alert">
              {authError}
            </p>
          )}
          <div className="editor-actions">
            <button className="big-btn" disabled={!password || checking} onClick={unlock}>
              {checking ? 'CHECKING…' : 'ENTER'}
            </button>
            <button className="big-btn secondary" onClick={onBack}>
              BACK
            </button>
          </div>
        </div>
      </div>
    );
  }

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
