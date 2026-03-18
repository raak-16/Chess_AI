import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function History() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const downloadPgn = async (gameId) => {
    const userName = localStorage.getItem("chess_user_name") || "guest";
    try {
      const response = await fetch(`/api/history/${gameId}/pgn?user_name=${encodeURIComponent(userName)}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.detail || "Failed to export PGN");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `game_${gameId}.pgn`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PGN export failed:", err);
      alert(err.message || "PGN export failed");
    }
  };

  useEffect(() => {
    const userName = localStorage.getItem("chess_user_name") || "guest";
    fetch(`/api/history?user_name=${encodeURIComponent(userName)}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch history data:", err);
        setLoading(false);
      });
  }, []);

  if (loading || !data) {
    return (
      <div className="flex-grow flex items-center justify-center p-8 text-slate-500">
        Loading...
      </div>
    );
  }

  const gamesPlayed = Number(data?.stats?.games_played || 0);
  const wins = Number(data?.stats?.wins || 0);
  const losses = Number(data?.stats?.losses || 0);
  const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;
  const lossRate = gamesPlayed > 0 ? Math.round((losses / gamesPlayed) * 100) : 0;

  const winStreak = (() => {
    let streak = 0;
    for (const game of data.games) {
      if (game.result === "Win") {
        streak += 1;
      } else {
        break;
      }
    }
    return streak;
  })();

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(data.games.length / pageSize));
  const pageNumbers = Array.from({ length: totalPages }, (_, idx) => idx + 1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Game History</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Review your previous matches against the AI and analyze your performance.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <select className="appearance-none bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-sm pl-4 pr-10 py-2 focus:ring-primary focus:border-primary block w-full">
              <option>All Results</option>
              <option>Wins</option>
              <option>Losses</option>
              <option>Draws</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
              <span className="material-symbols-outlined text-sm">expand_more</span>
            </div>
          </div>
          <div className="relative">
            <select className="appearance-none bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-sm pl-4 pr-10 py-2 focus:ring-primary focus:border-primary block w-full">
              <option>Newest First</option>
              <option>Oldest First</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
              <span className="material-symbols-outlined text-sm">sort</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input
              className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-sm pl-10 pr-4 py-2 focus:ring-primary focus:border-primary w-64"
              placeholder="Search by Game ID..."
              type="text"
            />
          </div>
          <span className="text-xs font-semibold text-slate-500 px-2">
            Download PGN from each game row
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Game ID</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Result</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Moves</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Duration</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date Played</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {data.games.map((game, idx) => {
                let tone = "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
                if (game.result === "Win") {
                  tone = "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
                } else if (game.result === "Loss") {
                  tone = "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400";
                }
                return (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900 dark:text-white">#{game.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tone}`}>
                        {game.result}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-400">{game.moves}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-400">{game.duration}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-400">{game.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        
                        <Link
                          className="px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90"
                          to={`/replay/${game.id}`}
                        >
                          Replay Game
                        </Link>
                        <button
                          className="px-3 py-1.5 text-xs font-medium border border-primary/30 text-primary rounded-lg hover:bg-primary/10"
                          onClick={() => downloadPgn(game.id)}
                          type="button"
                        >
                          Download PGN
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Showing 1 to {data.games.length} of {gamesPlayed} results
          </p>
          <div className="flex gap-2">
            <button className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 text-slate-500" disabled>
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            {pageNumbers.map((page) => (
              <button
                key={page}
                className={`size-9 flex items-center justify-center text-sm font-semibold rounded-lg ${
                  page === 1
                    ? "bg-primary text-white"
                    : "hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
                disabled={page !== 1}
              >
                {page}
              </button>
            ))}
            <button className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-500" disabled>
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Games</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{data.stats.games_played}</p>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Total Wins</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {wins} <span className="text-sm font-medium text-slate-500">({winRate}%)</span>
          </p>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider mb-1">Total Losses</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {losses} <span className="text-sm font-medium text-slate-500">({lossRate}%)</span>
          </p>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Win Streak</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{winStreak}</p>
            <span className="material-symbols-outlined text-emerald-500">trending_up</span>
          </div>
        </div>
      </div>
    </div>
  );
}
