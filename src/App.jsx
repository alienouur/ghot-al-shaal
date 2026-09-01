import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GAME_CONFIG } from './config';
import { STRUCTURE_MAP, generateQuestions, questionText } from './data/structures';
import { LeaderboardStorage } from './storage/LeaderboardStorage';
import { Sound } from './game/sound';
import CellScene from './cell/CellScene';
import StartScreen from './screens/StartScreen';
import ResultsScreen from './screens/ResultsScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import HUD from './components/HUD';
import FeedbackBanner from './components/FeedbackBanner';
import './styles/app.css';

function webglAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

const initialState = {
  playerName: '',
  testType: 'quick',
  currentQuestion: 0,
  totalQuestions: GAME_CONFIG.quickQuestions,
  score: 0,
  correctAnswers: 0,
  wrongAnswers: 0,
  timeRemaining: GAME_CONFIG.timePerQuestion,
  gameStatus: 'START', // START | PLAYING | FEEDBACK | FINISHED | LEADERBOARD
};

export default function App() {
  const [state, setState] = useState(initialState);
  const [questions, setQuestions] = useState([]);
  const [feedback, setFeedback] = useState(null); // { correct, structure, timedOut }
  const [flashId, setFlashId] = useState(null);
  const [muted, setMuted] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const answeredRef = useRef(false);
  const startTimeRef = useRef(0);
  const hasWebGL = useMemo(() => webglAvailable(), []);

  const toggleMute = () => {
    setMuted((m) => {
      Sound.setMuted(!m);
      return !m;
    });
  };

  const startGame = useCallback((name, testType) => {
    const total =
      testType === 'full' ? GAME_CONFIG.fullQuestions : GAME_CONFIG.quickQuestions;
    setQuestions(generateQuestions(total));
    setFeedback(null);
    setFlashId(null);
    answeredRef.current = false;
    startTimeRef.current = Date.now();
    setState({
      ...initialState,
      playerName: name,
      testType,
      totalQuestions: total,
      gameStatus: 'PLAYING',
    });
  }, []);

  const finishGame = useCallback(
    (finalState) => {
      const durationSec = Math.round((Date.now() - startTimeRef.current) / 1000);
      const accuracy = Math.round(
        (finalState.correctAnswers / finalState.totalQuestions) * 100
      );
      LeaderboardStorage.saveResult({
        name: finalState.playerName,
        score: finalState.score,
        total: finalState.totalQuestions,
        testType: finalState.testType,
        accuracy,
        durationSec,
      });
      setState({ ...finalState, gameStatus: 'FINISHED' });
    },
    []
  );

  const advance = useCallback(() => {
    setFeedback(null);
    setFlashId(null);
    answeredRef.current = false;
    setState((s) => {
      if (s.currentQuestion + 1 >= s.totalQuestions) {
        // finishGame handles persistence; call after state settles
        setTimeout(() => finishGame(s), 0);
        return s;
      }
      return {
        ...s,
        currentQuestion: s.currentQuestion + 1,
        timeRemaining: GAME_CONFIG.timePerQuestion,
        gameStatus: 'PLAYING',
      };
    });
  }, [finishGame]);

  const processAnswer = useCallback(
    (selectedId, timedOut = false) => {
      if (answeredRef.current) return;
      answeredRef.current = true;
      const target = questions[state.currentQuestion];
      const correct = !timedOut && selectedId === target.id;
      if (correct) Sound.correct();
      else if (timedOut) Sound.timeout();
      else Sound.incorrect();
      if (selectedId) setFlashId(selectedId);
      setFeedback({ correct, structure: target, timedOut });
      setState((s) => ({
        ...s,
        score: s.score + (correct ? 1 : 0),
        correctAnswers: s.correctAnswers + (correct ? 1 : 0),
        wrongAnswers: s.wrongAnswers + (correct ? 0 : 1),
        gameStatus: 'FEEDBACK',
      }));
      setTimeout(advance, GAME_CONFIG.feedbackDuration);
    },
    [questions, state.currentQuestion, advance]
  );

  // countdown timer
  useEffect(() => {
    if (state.gameStatus !== 'PLAYING') return undefined;
    const interval = setInterval(() => {
      setState((s) => {
        if (s.gameStatus !== 'PLAYING') return s;
        if (s.timeRemaining <= 1) {
          setTimeout(() => processAnswer(null, true), 0);
          return { ...s, timeRemaining: 0 };
        }
        return { ...s, timeRemaining: s.timeRemaining - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [state.gameStatus, state.currentQuestion, processAnswer]);

  const handleSelect = useCallback(
    (id) => {
      if (state.gameStatus !== 'PLAYING') return;
      processAnswer(id);
    },
    [state.gameStatus, processAnswer]
  );

  if (!hasWebGL) {
    return (
      <div className="fatal-error">
        <h1>3D Not Supported</h1>
        <p>
          Your browser or device does not support WebGL, which is required for the 3D
          cell model. Please try a modern browser such as Chrome, Firefox, Safari, or
          Edge.
        </p>
      </div>
    );
  }

  const inGame = state.gameStatus === 'PLAYING' || state.gameStatus === 'FEEDBACK';
  const currentStructure = questions[state.currentQuestion];

  return (
    <div className="app">
      {inGame && (
        <>
          <div className="scene-container">
            <CellScene
              onSelect={handleSelect}
              flashId={flashId}
              interactive={state.gameStatus === 'PLAYING'}
              resetSignal={resetSignal}
            />
          </div>
          <HUD
            playerName={state.playerName}
            questionNumber={state.currentQuestion + 1}
            totalQuestions={state.totalQuestions}
            questionLabel={
              currentStructure
                ? questionText(currentStructure, state.currentQuestion)
                : ''
            }
            timeRemaining={state.timeRemaining}
            urgent={
              state.timeRemaining <= GAME_CONFIG.urgentThreshold &&
              state.gameStatus === 'PLAYING'
            }
            score={state.score}
            muted={muted}
            onToggleMute={toggleMute}
            onResetView={() => setResetSignal((n) => n + 1)}
          />
          {feedback && <FeedbackBanner feedback={feedback} />}
        </>
      )}

      {state.gameStatus === 'START' && (
        <StartScreen
          onStart={startGame}
          muted={muted}
          onToggleMute={toggleMute}
          onLeaderboard={() => setState((s) => ({ ...s, gameStatus: 'LEADERBOARD' }))}
        />
      )}

      {state.gameStatus === 'FINISHED' && (
        <ResultsScreen
          state={state}
          onPlayAgain={() => startGame(state.playerName, state.testType)}
          onHome={() => setState({ ...initialState, playerName: state.playerName })}
          onLeaderboard={() => setState((s) => ({ ...s, gameStatus: 'LEADERBOARD' }))}
        />
      )}

      {state.gameStatus === 'LEADERBOARD' && (
        <LeaderboardScreen
          onBack={() => setState({ ...initialState, playerName: state.playerName })}
        />
      )}
    </div>
  );
}

export { STRUCTURE_MAP };
