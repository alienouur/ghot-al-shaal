import { useState } from 'react';
import { GAME_CONFIG } from '../config';

export default function StartScreen({ onStart, muted, onToggleMute, onLeaderboard, onEditor }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const valid = name.trim().length >= 2;

  const start = (type) => {
    if (!valid) {
      setError('Please enter your name (at least 2 characters).');
      return;
    }
    onStart(name.trim(), type);
  };

  return (
    <div className="screen start-screen">
      <button className="icon-btn corner" onClick={onToggleMute} aria-label="Toggle sound">
        {muted ? '🔇' : '🔊'}
      </button>
      <div className="panel">
        <h1 className="title">
          CELL ANATOMY
          <span>3D CHALLENGE</span>
        </h1>
        <label className="name-label" htmlFor="player-name">
          Enter your name:
        </label>
        <input
          id="player-name"
          className="name-input"
          type="text"
          maxLength={20}
          value={name}
          placeholder="Your name"
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
          onKeyDown={(e) => e.key === 'Enter' && start('quick')}
          autoComplete="off"
        />
        {error && <p className="error-text" role="alert">{error}</p>}
        <h2 className="subtitle">Choose Test</h2>
        <div className="test-buttons">
          <button className="big-btn" disabled={!valid} onClick={() => start('quick')}>
            QUICK TEST
            <small>
              {GAME_CONFIG.quickQuestions} Questions · {GAME_CONFIG.timePerQuestion}s / Question
            </small>
          </button>
          <button className="big-btn" disabled={!valid} onClick={() => start('full')}>
            FULL TEST
            <small>
              {GAME_CONFIG.fullQuestions} Questions · {GAME_CONFIG.timePerQuestion}s / Question
            </small>
          </button>
        </div>
        <button className="link-btn" onClick={onLeaderboard}>
          View Leaderboard
        </button>
        <button className="link-btn" onClick={onEditor}>
          🛠 Model Editor
        </button>
      </div>
    </div>
  );
}
