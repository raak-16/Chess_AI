import { useState, useEffect, useRef } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const THEME_COLORS = {
  primary: "#ec5b13",
  boardLight: "#f8f2ee",
  boardDark: "#c96a3a",
  selectedSquare: "rgba(236, 91, 19, 0.28)",
  moveDot: "radial-gradient(circle, rgba(236, 91, 19, 0.35) 25%, transparent 25%)",
  captureDot: "radial-gradient(circle, rgba(236, 91, 19, 0.45) 85%, transparent 85%)",
};

export default function GamePage() {
  const [game, setGame] = useState(new Chess());
  const [whiteTime, setWhiteTime] = useState(600); // 10 minutes
  const [blackTime, setBlackTime] = useState(600);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [lastAiMove, setLastAiMove] = useState("--");
  const [optionSquares, setOptionSquares] = useState({});
  const [pieceSquare, setPieceSquare] = useState("");
  const gameEndRecordedRef = useRef(false);

  const getElapsedSeconds = () => Math.max(0, 1200 - (whiteTime + blackTime));

  async function recordGameResult(result, endedBy = "manual") {
    const userName = localStorage.getItem("chess_user_name") || "guest";

    try {
      await fetch(`${API_BASE_URL}/api/games/record`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_name: userName,
          result,
          moves: game.history().length,
          moves_uci: game.history({ verbose: true }).map((m) => m.from + m.to + (m.promotion || "")),
          duration_seconds: getElapsedSeconds(),
          ended_by: endedBy,
        }),
      });
    } catch (error) {
      console.warn("Failed to record game result:", error);
    }
  }

  useEffect(() => {
    if (gameEndRecordedRef.current) {
      return;
    }

    let finalResult = null;
    let endedBy = null;

    if (game.isCheckmate()) {
      // If it's white to move after checkmate, white got mated (user lost).
      finalResult = game.turn() === "w" ? "Loss" : "Win";
      endedBy = "checkmate";
    } else if (game.isDraw()) {
      finalResult = "Draw";
      endedBy = "draw";
    } else if (whiteTime === 0 || blackTime === 0) {
      finalResult = whiteTime === 0 ? "Loss" : "Win";
      endedBy = "timeout";
    }

    if (!finalResult) {
      return;
    }

    gameEndRecordedRef.current = true;
    void recordGameResult(finalResult, endedBy);
  }, [game, whiteTime, blackTime]);
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Timer interval
  useEffect(() => {
    if (game.isGameOver()) return;
    
    const interval = setInterval(() => {
      if (game.turn() === "w") {
        setWhiteTime((prev) => Math.max(0, prev - 1));
      } else {
        setBlackTime((prev) => Math.max(0, prev - 1));
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [game]);

  // Handle AI turn
  useEffect(() => {
    if (game.turn() === "b" && !game.isGameOver()) {
      setIsAiThinking(true);
      const timer = setTimeout(() => {
        makeAiMove();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [game]);

  async function makeAiMove() {
    if (game.isGameOver() || game.isDraw()) {
      setIsAiThinking(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/move`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          moves: game.history({ verbose: true }).map((m) => m.from + m.to + (m.promotion || "")),
          difficulty: 0,
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const data = await response.json();
      const predictedMove = data?.move;

      if (!predictedMove || predictedMove.length < 4) {
        throw new Error("Invalid move returned from backend");
      }

      const gameCopy = new Chess();
      gameCopy.loadPgn(game.pgn());
      const aiMoveRes = gameCopy.move({
        from: predictedMove.slice(0, 2),
        to: predictedMove.slice(2, 4),
        promotion: predictedMove[4] || "q",
      });

      if (!aiMoveRes) {
        throw new Error("Predicted move is illegal in current position");
      }

      setGame(gameCopy);
      setLastAiMove(aiMoveRes.san);
    } catch (error) {
      console.warn("AI move fetch failed. Falling back to random move.", error);
      const possibleMoves = game.moves();
      if (possibleMoves.length > 0) {
        const randomIndex = Math.floor(Math.random() * possibleMoves.length);
        const fallbackMove = possibleMoves[randomIndex];
        const gameCopy = new Chess();
        gameCopy.loadPgn(game.pgn());
        const aiMoveRes = gameCopy.move(fallbackMove);
        if (aiMoveRes) {
          setGame(gameCopy);
          setLastAiMove(aiMoveRes.san);
        }
      }
    } finally {
      setIsAiThinking(false);
    }
  }

  function buildMoveObject(chessInstance, sourceSquare, targetSquare) {
    const movingPiece = chessInstance.get(sourceSquare);
    const isPawnPromotion =
      movingPiece?.type === "p" && (targetSquare?.[1] === "8" || targetSquare?.[1] === "1");

    const move = {
      from: sourceSquare,
      to: targetSquare,
    };

    if (isPawnPromotion) {
      move.promotion = "q";
    }

    return move;
  }

  function onDrop(sourceSquare, targetSquare, piece) {
    if (game.turn() === "b") return false; // Not your turn!

    let moveRes = null;

    try {
      // Test the move on a clone first to see if it's valid
      const gameCopy = new Chess();
      gameCopy.loadPgn(game.pgn());
      
      moveRes = gameCopy.move(buildMoveObject(gameCopy, sourceSquare, targetSquare));

      if (moveRes) {
        setGame(gameCopy);
        setOptionSquares({});
        setPieceSquare("");
        return true;
      }
    } catch (e) {
      console.warn("Invalid move attempted:", e.message);
    }
    return false;
  }

  function getMoveOptions(square) {
    const moves = game.moves({
      square,
      verbose: true,
    });
    
    // Check if the user clicked their own piece
    const piece = game.get(square);
    if (!piece || piece.color !== "w") {
      setOptionSquares({});
      setPieceSquare("");
      return false;
    }
    
    if (moves.length === 0) {
      setOptionSquares({ [square]: { background: THEME_COLORS.selectedSquare } });
      setPieceSquare(square);
      return false;
    }

    const newSquares = {};
    moves.forEach((move) => {
      newSquares[move.to] = {
        background:
          game.get(move.to) && game.get(move.to).color !== piece.color
            ? THEME_COLORS.captureDot
            : THEME_COLORS.moveDot,
        borderRadius: "50%",
      };
    });
    newSquares[square] = { background: THEME_COLORS.selectedSquare };
    
    setOptionSquares(newSquares);
    setPieceSquare(square);
    return true;
  }

  function onSquareClick(square) {
    if (game.turn() === "b") return; // Not your turn

    // If pieceSquare is already set and user clicked a valid move destination:
    if (pieceSquare && optionSquares[square] && pieceSquare !== square) {
      try {
        const gameCopy = new Chess();
        gameCopy.loadPgn(game.pgn());
        const moveRes = gameCopy.move(buildMoveObject(gameCopy, pieceSquare, square));

        if (moveRes) {
          setGame(gameCopy);
          setOptionSquares({});
          setPieceSquare("");
          return;
        }
      } catch (e) {
        // move is invalid, just fall through to calculating new options
        console.warn("Invalid move attempted during click:", e.message);
      }
    }
    
    // Otherwise calculate new options for clicked square
    getMoveOptions(square);
  }

  function undoMove() {
    const gameCopy = new Chess();
    gameCopy.loadPgn(game.pgn());
    gameCopy.undo(); // Undo current or previous move
    if (gameCopy.turn() === "b") {
      gameCopy.undo(); // Ensure it comes back to our turn if AI just moved
    }
    setGame(gameCopy);
    setLastAiMove("--");
    setOptionSquares({});
    setPieceSquare("");
    gameEndRecordedRef.current = false;
  }

  function restartGame() {
    setGame(new Chess());
    setWhiteTime(600);
    setBlackTime(600);
    setLastAiMove("--");
    setIsAiThinking(false);
    setOptionSquares({});
    setPieceSquare("");
    gameEndRecordedRef.current = false;
  }

  async function resignGame() {
    gameEndRecordedRef.current = true;
    await recordGameResult("Loss", "resign");
    restartGame();
  }

  // Get game status string
  let gameStatus = "Live";
  if (game.isCheckmate()) gameStatus = "Checkmate!";
  else if (game.isDraw()) gameStatus = "Draw";
  else if (whiteTime === 0 || blackTime === 0) gameStatus = "Time Out";

  // Build Move History
  const historyRaw = game.history();
  const movePairs = [];
  for (let i = 0; i < historyRaw.length; i += 2) {
    movePairs.push({
      number: Math.floor(i / 2) + 1,
      white: historyRaw[i],
      black: historyRaw[i + 1] || "..."
    });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 w-full">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column: Board + Clocks */}
        <div className="flex-1 flex flex-col items-center">
          <div 
            className="w-full max-w-[600px] bg-background-light border-8 border-primary/60 dark:border-primary/70 rounded-xl overflow-hidden shadow-2xl relative"
          >
            <Chessboard 
              options={{
                position: game.fen(),
                boardOrientation: "white",
                onPieceDrop: ({ sourceSquare, targetSquare, piece }) =>
                  onDrop(sourceSquare, targetSquare, piece),
                onSquareClick: ({ square }) => onSquareClick(square),
                squareStyles: { ...optionSquares },
                darkSquareStyle: { backgroundColor: THEME_COLORS.boardDark },
                lightSquareStyle: { backgroundColor: THEME_COLORS.boardLight },
                allowDragging: game.turn() === "w" && !game.isGameOver(),
              }}
            />
          </div>
          
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-4 w-full max-w-[600px]">
            {/* Black Timer (AI) */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm w-full ${game.turn() === "b" ? "bg-primary/5 border border-primary/30" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"}`}>
              <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-slate-400">smart_toy</span>
              </div>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Adaptive AI</span>
              <span className={`ml-auto text-xs font-mono px-2 py-1 rounded ${game.turn() === 'b' ? 'bg-primary/20 text-primary font-bold' : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400'}`}>
                {formatTime(blackTime)}
              </span>
            </div>
            
            {/* White Timer (You) */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm w-full ${game.turn() === "w" ? "bg-primary/5 border border-primary/30" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"}`}>
              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">person</span>
              </div>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">You</span>
              <span className={`ml-auto text-xs font-mono px-2 py-1 rounded ${game.turn() === 'w' ? 'bg-primary/20 text-primary font-bold' : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400'}`}>
                {formatTime(whiteTime)}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Status + History + Actions */}
        <div className="w-full lg:w-96 flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white">Game Status</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-primary/10 text-primary">
                {gameStatus}
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {gameStatus === "Live" ? (
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                ) : (
                  <span className="material-symbols-outlined text-slate-400 text-lg">flag</span>
                )}
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {gameStatus === "Live" ? (game.turn() === "w" ? "Your turn (White to move)" : "AI turn (Black to move)") : "Game Over"}
                </p>
              </div>
              {isAiThinking && (
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-400 text-lg">psychology</span>
                  <p className="text-sm text-slate-500 dark:text-slate-400 italic">AI is thinking...</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col h-64">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white">Move History</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white dark:bg-slate-800 text-slate-400 text-xs text-left uppercase">
                  <tr>
                    <th className="p-2 font-medium">#</th>
                    <th className="p-2 font-medium">White</th>
                    <th className="p-2 font-medium">Black</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {movePairs.map((move, idx) => {
                    const isLast = idx === movePairs.length - 1;
                    return (
                      <tr key={idx} className={isLast ? "bg-primary/5" : "hover:bg-slate-50 dark:hover:bg-slate-700/30"}>
                        <td className="p-2 text-slate-400">{move.number}</td>
                        <td className={`p-2 ${isLast && game.turn() === 'b' ? "font-bold text-primary" : "font-medium text-slate-700 dark:text-slate-300"}`}>
                          {move.white}
                        </td>
                        <td className={`p-2 ${isLast && game.turn() === 'w' ? "font-bold text-primary" : "font-medium text-slate-700 dark:text-slate-300"}`}>
                          {move.black}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-primary/10 dark:bg-primary/5 p-5 rounded-xl border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="bg-primary rounded-lg p-2 text-white">
                <span className="material-symbols-outlined text-xl">smart_toy</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">Last AI Move</p>
                <p className="text-xl font-mono font-bold text-slate-900 dark:text-white">
                  {lastAiMove}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
               onClick={restartGame}
               className="col-span-2 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">restart_alt</span>
              Restart Game
            </button>
            <button onClick={undoMove} className="py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-lg">undo</span>
              Undo
            </button>
            <button onClick={resignGame} className="py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-lg">flag</span>
              Resign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
