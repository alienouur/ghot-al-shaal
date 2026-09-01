export default function HUD({
  playerName,
  questionNumber,
  totalQuestions,
  questionLabel,
  timeRemaining,
  urgent,
  score,
  muted,
  onToggleMute,
  onResetView,
}) {
  return (
    <>
      <div className="hud">
        <div className="hud-row">
          <span className="hud-player">{playerName}</span>
          <span className="hud-progress">
            Question {questionNumber} / {totalQuestions}
          </span>
        </div>
        <div className="hud-question">{questionLabel}</div>
        <div className="hud-row">
          <span className={urgent ? 'hud-timer urgent' : 'hud-timer'}>
            Time: {timeRemaining}
          </span>
          <span className="hud-score">Score: {score}</span>
        </div>
      </div>
      <div className="hud-controls">
        <button className="icon-btn" onClick={onResetView}>
          RESET VIEW
        </button>
        <button className="icon-btn" onClick={onToggleMute} aria-label="Toggle sound">
          {muted ? '🔇' : '🔊'}
        </button>
      </div>
    </>
  );
}
