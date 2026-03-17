import { useState, useEffect } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";

export default function GamePage() {
  const [game, setGame] = useState(new Chess());
  const [whiteTime, setWhiteTime] = useState(600); // 10 minutes
  const [blackTime, setBlackTime] = useState(600);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [lastAiMove, setLastAiMove] = useState("--");
  const [optionSquares, setOptionSquares] = useState({});
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
        makeRandomMove();
        setIsAiThinking(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [game]);

  function makeRandomMove() {
    const possibleMoves = game.moves();
    if (game.isGameOver() || game.isDraw() || possibleMoves.length === 0) return;

    const randomIndex = Math.floor(Math.random() * possibleMoves.length);
    const move = possibleMoves[randomIndex];

    const gameCopy = new Chess();
    gameCopy.loadPgn(game.pgn());
    const aiMoveRes = gameCopy.move(move);

    if (aiMoveRes) {
      setGame(gameCopy);
      setLastAiMove(aiMoveRes.san);
    }
  }

  function onDrop(sourceSquare, targetSquare, piece) {
    if (game.turn() === "b") return false; // Not your turn!

    let moveRes = null;
    let promo = "q";
    if (piece && typeof piece === 'string' && piece.length >= 2) {
      promo = piece[1].toLowerCase();
    } else if (piece && piece.pieceType) {
      promo = piece.pieceType[1] ? piece.pieceType[1].toLowerCase() : "q";
    }

    try {
      // Test the move on a clone first to see if it's valid
      const gameCopy = new Chess();
      gameCopy.loadPgn(game.pgn());
      
      moveRes = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: promo,
      });

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
      setOptionSquares({ [square]: { background: "rgba(255, 255, 0, 0.4)" } });
      setPieceSquare(square);
      return false;
    }

    const newSquares = {};
    moves.forEach((move) => {
      newSquares[move.to] = {
        background:
          game.get(move.to) && game.get(move.to).color !== piece.color
            ? "radial-gradient(circle, rgba(0,0,0,.2) 85%, transparent 85%)"
            : "radial-gradient(circle, rgba(0,0,0,.2) 25%, transparent 25%)",
        borderRadius: "50%",
      };
    });
    newSquares[square] = { background: "rgba(255, 255, 0, 0.4)" };
    
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
        const moveRes = gameCopy.move({
          from: pieceSquare,
          to: square,
          promotion: "q",
        });

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
  }

  function restartGame() {
    setGame(new Chess());
    setWhiteTime(600);
    setBlackTime(600);
    setLastAiMove("--");
    setIsAiThinking(false);
    setOptionSquares({});
    setPieceSquare("");
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
            className="w-full max-w-[600px] bg-slate-200 border-8 border-slate-800 dark:border-slate-900 rounded-xl overflow-hidden shadow-2xl relative"
            onPointerDown={(e) => {
              // Manually intercept clicks to bypass react-dnd / React 19 event swallowing
              const squareEl = e.target.closest('[data-square]');
              if (squareEl) {
                const square = squareEl.getAttribute('data-square');
                if (square) {
                  onSquareClick(square);
                }
              }
            }}
          >
            <Chessboard 
              position={game.fen()} 
              onPieceDrop={(args) => {
                // To support both v3 (sourceSquare, targetSquare, piece) and v5 ({piece, sourceSquare, targetSquare})
                let sourceSquare, targetSquare, piece;
                if (args && args.sourceSquare && args.targetSquare) {
                  sourceSquare = args.sourceSquare;
                  targetSquare = args.targetSquare;
                  piece = args.piece;
                } else if (arguments.length >= 2) {
                  sourceSquare = arguments[0];
                  targetSquare = arguments[1];
                  piece = arguments[2];
                }
                return onDrop(sourceSquare, targetSquare, piece);
              }}
              customSquareStyles={{ ...optionSquares }}
              customDarkSquareStyle={{ backgroundColor: "#779556" }}
              customLightSquareStyle={{ backgroundColor: "#ebecd0" }}
              boardOrientation="white"
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
            <button onClick={restartGame} className="py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-lg">flag</span>
              Resign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
