import { useState } from 'react';
import { LeaderboardStorage } from '../storage/LeaderboardStorage';
import { GAME_CONFIG } from '../config';

function Board({ testType, total }) {
  const entries = LeaderboardStorage.getLeaderboard(testType);
  if (entries.length === 0) {
    return <p className="empty-board">No scores yet — be the first!</p>;
  }
  return (
    <ol className="board-list">
      {entries.map((e, i) => (
        <li key={i}>
          <span className="board-rank">{i + 1}.</span>
          <span className="board-name">{e.name}</span>
          <span className="board-score">
            {e.score} / {e.total ?? total}
          </span>
          <span className="board-acc">{e.accuracy}%</span>
        </li>
      ))}
    </ol>
  );
}

export default function LeaderboardScreen({ onBack }) {
  const [tab, setTab] = useState('quick');
  return (
    <div className="screen leaderboard-screen">
      <div className="panel">
        <h1 className="title small">LEADERBOARD</h1>
        <div className="tabs">
          <button
            className={tab === 'quick' ? 'tab active' : 'tab'}
            onClick={() => setTab('quick')}
          >
            QUICK TEST
          </button>
          <button
            className={tab === 'full' ? 'tab active' : 'tab'}
            onClick={() => setTab('full')}
          >
            FULL TEST
          </button>
        </div>
        <Board
          testType={tab}
          total={tab === 'full' ? GAME_CONFIG.fullQuestions : GAME_CONFIG.quickQuestions}
        />
        <button className="big-btn" onClick={onBack}>
          HOME
        </button>
      </div>
    </div>
  );
}
