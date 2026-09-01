export default function ResultsScreen({ state, onPlayAgain, onHome, onLeaderboard }) {
  const accuracy = Math.round((state.correctAnswers / state.totalQuestions) * 100);
  return (
    <div className="screen results-screen">
      <div className="panel pop-in">
        <h1 className="title small">TEST COMPLETE</h1>
        <p className="congrats">Congratulations, {state.playerName}!</p>
        <div className="stats-grid">
          <div className="stat">
            <span className="stat-label">Score</span>
            <span className="stat-value">
              {state.score} / {state.totalQuestions}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Accuracy</span>
            <span className="stat-value">{accuracy}%</span>
          </div>
          <div className="stat">
            <span className="stat-label">Correct Answers</span>
            <span className="stat-value good">{state.correctAnswers}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Wrong Answers</span>
            <span className="stat-value bad">{state.wrongAnswers}</span>
          </div>
        </div>
        <div className="test-buttons column">
          <button className="big-btn" onClick={onPlayAgain}>
            PLAY AGAIN
          </button>
          <button className="big-btn secondary" onClick={onHome}>
            HOME
          </button>
          <button className="big-btn secondary" onClick={onLeaderboard}>
            LEADERBOARD
          </button>
        </div>
      </div>
    </div>
  );
}
