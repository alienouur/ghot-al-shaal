export default function FeedbackBanner({ feedback }) {
  const { correct, structure, timedOut } = feedback;
  return (
    <div className={`feedback ${correct ? 'ok' : 'no'}`} role="status">
      <div className="feedback-verdict">
        {correct ? '✓ CORRECT!  +1' : timedOut ? "✗ TIME'S UP" : '✗ INCORRECT'}
      </div>
      <div className="feedback-detail">
        <strong>{structure.name}</strong>
        <p>{structure.description}</p>
      </div>
    </div>
  );
}
