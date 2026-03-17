import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch dashboard data:", err);
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

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="bg-gradient-to-r from-primary/10 via-background-light to-transparent dark:from-primary/20 dark:via-background-dark p-8 rounded-xl border border-primary/10">
          <h2 className="text-3xl font-black mb-2">Welcome back, {data.user_name}</h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Review your latest playstyle statistics or jump straight into a match against our adaptive engine.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-primary/10 shadow-sm">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Games Played</p>
              <p className="text-3xl font-bold">{data.stats.games_played}</p>
              <div className="mt-2 text-xs text-emerald-600 font-medium flex items-center">
                <span className="material-symbols-outlined text-xs mr-1">trending_up</span> +12% this week
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-primary/10 shadow-sm">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Wins</p>
              <p className="text-3xl font-bold text-primary">{data.stats.wins}</p>
              <div className="mt-2 text-xs text-slate-400">Win rate: 50%</div>
            </div>
            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-primary/10 shadow-sm">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Losses</p>
              <p className="text-3xl font-bold">{data.stats.losses}</p>
              <div className="mt-2 text-xs text-rose-500 font-medium flex items-center">
                <span className="material-symbols-outlined text-xs mr-1">trending_down</span> -4% improvement
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-primary/10 shadow-sm">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Draws</p>
              <p className="text-3xl font-bold">{data.stats.draws}</p>
              <div className="mt-2 text-xs text-slate-400">Stalemate: 17%</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-primary/10 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-primary/10 flex justify-between items-center">
              <h3 className="text-lg font-bold">Recent Games</h3>
              <Link className="text-primary text-sm font-semibold hover:underline" to="/history">
                View All
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-primary/5 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Game ID</th>
                    <th className="px-6 py-4 font-semibold">Result</th>
                    <th className="px-6 py-4 font-semibold">Total Moves</th>
                    <th className="px-6 py-4 font-semibold">Date</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-primary/10">
                  {data.recent_games.map((game, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors">
                      <td className="px-6 py-4 font-mono text-sm">#{game.id}</td>
                      <td className="px-6 py-4">
                        {game.result === "Win" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                            {game.result}
                          </span>
                        ) : game.result === "Loss" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
                            {game.result}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                            {game.result}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{game.moves} Moves</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{game.date}</td>
                      <td className="px-6 py-4 text-right">
                         <Link className="text-slate-400 hover:text-primary" to="/history">
                           <span className="material-symbols-outlined">analytics</span>
                         </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-slate-900 text-white rounded-xl p-8 shadow-xl relative overflow-hidden group border border-primary/20">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <span className="material-symbols-outlined text-8xl rotate-12">chess</span>
            </div>
            <h3 className="text-2xl font-bold mb-4 relative z-10">Challenge the AI</h3>
            <p className="text-slate-300 mb-8 relative z-10">
              Test your skills against our neural network that learns and adapts to your opening repertoire and tactical style.
            </p>
            <Link
              to="/game"
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 relative z-10"
            >
              <span className="material-symbols-outlined">play_arrow</span>
              Start New Game
            </Link>
            <div className="mt-6 flex items-center justify-center gap-6 text-sm text-slate-400">
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-primary">bolt</span> Adaptive
              </div>
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-primary">history_edu</span> Analytical
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-primary/10 p-6 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">ELO Progression</h3>
            <div className="h-48 flex items-end gap-2 px-2">
              {data.elo_points.map((height, idx) => (
                <div key={idx} className={`flex-1 bg-primary/${(idx + 1) * 10} rounded-t-sm`} style={{ height }}></div>
              ))}
            </div>
            <div className="mt-4 flex justify-between text-xs text-slate-400">
              <span>Jun</span>
              <span>Jul</span>
              <span>Aug</span>
              <span>Sep</span>
              <span>Oct</span>
              <span className="text-primary font-bold">Now</span>
            </div>
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-primary/10">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Current ELO</span>
                <span className="text-lg font-bold text-primary">2,145</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-primary/10 p-6 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">Tactical DNA</h3>
            <div className="space-y-4">
              {data.tactical_dna.map((item, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>{item.label}</span>
                    <span>{item.value}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                    <div className={`${item.tone} h-1.5 rounded-full`} style={{ width: `${item.value}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
