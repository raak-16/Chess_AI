import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const THEME_COLORS = {
  boardLight: "#f8f2ee",
  boardDark: "#c96a3a",
};

export default function ReplayPage() {
  const { gameId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [gameRecord, setGameRecord] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const userName = localStorage.getItem("chess_user_name") || "guest";

    async function loadReplay() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/history/${gameId}?user_name=${encodeURIComponent(userName)}`
        );
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.detail || "Failed to load replay");
        }

        const game = payload?.game || null;
        if (!game) {
          throw new Error("Replay data is unavailable");
        }

        setGameRecord(game);
        setStepIndex(0);
      } catch (err) {
        setError(err.message || "Failed to load replay");
      } finally {
        setLoading(false);
      }
    }

    loadReplay();
  }, [gameId]);

  const moves = useMemo(() => {
    if (!gameRecord?.moves_uci || !Array.isArray(gameRecord.moves_uci)) {
      return [];
    }
    return gameRecord.moves_uci;
  }, [gameRecord]);

  const board = useMemo(() => {
    const replayBoard = new Chess();
    for (let i = 0; i < stepIndex && i < moves.length; i += 1) {
      const uci = moves[i];
      if (!uci || uci.length < 4) {
        break;
      }
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci[4];
      const move = { from, to };
      if (promotion) {
        move.promotion = promotion;
      }
      const ok = replayBoard.move(move);
      if (!ok) {
        break;
      }
    }
    return replayBoard;
  }, [moves, stepIndex]);

  if (loading) {
    return <div className="p-8 text-slate-500">Loading replay...</div>;
  }

  if (error) {
    return (
      <div className="w-full max-w-3xl p-8">
        <p className="text-rose-600 font-semibold mb-4">{error}</p>
        <Link className="text-primary font-semibold hover:underline" to="/history">
          Back to history
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100">Replay Game #{gameRecord?.id}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Result: {gameRecord?.result} • Moves: {moves.length} • Date: {gameRecord?.date}
          </p>
        </div>
        <Link className="text-primary font-semibold hover:underline" to="/history">
          Back to History
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[620px_1fr] gap-8 items-start">
        <div className="w-full max-w-[620px] bg-background-light border-8 border-primary/60 dark:border-primary/70 rounded-xl overflow-hidden shadow-2xl">
          <Chessboard
            options={{
              position: board.fen(),
              boardOrientation: "white",
              allowDragging: false,
              darkSquareStyle: { backgroundColor: THEME_COLORS.boardDark },
              lightSquareStyle: { backgroundColor: THEME_COLORS.boardLight },
            }}
          />
        </div>

        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <p className="text-sm font-semibold text-slate-500 mb-2">Replay Progress</p>
          <p className="text-2xl font-black mb-4">
            Move {stepIndex} / {moves.length}
          </p>

          <div className="flex flex-wrap gap-3 mb-6">
            <button
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
              onClick={() => setStepIndex(0)}
              type="button"
            >
              Reset
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold disabled:opacity-50"
              onClick={() => setStepIndex((s) => Math.max(0, s - 1))}
              disabled={stepIndex === 0}
              type="button"
            >
              Prev
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold disabled:opacity-50"
              onClick={() => setStepIndex((s) => Math.min(moves.length, s + 1))}
              disabled={stepIndex >= moves.length}
              type="button"
            >
              Next
            </button>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
            <p className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-2">Current UCI Move</p>
            <p className="font-mono text-lg text-slate-800 dark:text-slate-200">
              {stepIndex > 0 ? moves[stepIndex - 1] : "--"}
            </p>
          </div>

          {moves.length === 0 ? (
            <p className="text-sm text-amber-600 mt-4">
              This older game has no stored move sequence, so detailed replay is unavailable.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
