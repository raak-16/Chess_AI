import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function Profile() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch profile data:", err);
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
    <div className="p-8 max-w-7xl mx-auto space-y-8 w-full">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">Player Profile</h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-2xl">
          The AI analyzes your playstyle to adapt its strategy. Review your personal metrics and tactical trends below.
        </p>
      </div>

      <section>
        <div className="flex items-center gap-2 mb-6">
          <span className="material-symbols-outlined text-primary">analytics</span>
          <h2 className="text-xl font-bold">Player Behavior Metrics</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {data.metrics.map((metric, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">{metric.icon}</span>
                </div>
                <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{metric.value}%</span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1">{metric.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{metric.description}</p>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: `${metric.value}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 h-full">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-lg font-bold">Playstyle Visualization</h2>
              <span className="text-xs font-semibold px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Live Analysis
              </span>
            </div>
            <div className="relative flex items-center justify-center py-4">
              <div className="w-full max-w-md aspect-square relative flex items-center justify-center">
                <div className="flex items-end justify-between w-full h-64 gap-4">
                  {data.bars.map((bar, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-3">
                      <div className={`w-full ${bar.tone} rounded-t-lg relative group`} style={{ height: `${bar.value}%` }}>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white px-2 py-1 rounded">
                          {bar.value}
                        </div>
                      </div>
                      <span className="text-xs font-medium text-slate-500 text-center">{bar.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-primary"></div>
                <span className="text-xs text-slate-500">Current Player Trend</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                <span className="text-xs text-slate-500">Global Average</span>
              </div>
            </div>
          </div>
        </section>

        <section className="lg:col-span-1">
          <div className="bg-slate-900 dark:bg-black p-8 rounded-xl text-white h-full flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-primary">description</span>
              <h2 className="text-lg font-bold">Profile Summary</h2>
            </div>
            <div className="flex-1">
              <div className="space-y-6">
                <div className="relative pl-6 border-l-2 border-primary/30">
                  <p className="text-slate-300 leading-relaxed italic">
                    "The player tends to play aggressively and prefers early central pawn pushes. The AI has noted a high success rate in tactical complications."
                  </p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-3">AI Counter-Strategy</h4>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3 text-sm text-slate-300">
                      <span className="material-symbols-outlined text-green-500 text-sm mt-0.5">check_circle</span>
                      Avoid early central tension
                    </li>
                    <li className="flex items-start gap-3 text-sm text-slate-300">
                      <span className="material-symbols-outlined text-green-500 text-sm mt-0.5">check_circle</span>
                      Prioritize king safety in the opening
                    </li>
                    <li className="flex items-start gap-3 text-sm text-slate-300">
                      <span className="material-symbols-outlined text-green-500 text-sm mt-0.5">check_circle</span>
                      Simplify into endgame transitions
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="mt-8">
              <Link
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                to="/game"
              >
                <span className="material-symbols-outlined">rocket_launch</span>
                Practice Against This Profile
              </Link>
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
          <h3 className="font-bold mb-4">Top Openings</h3>
          <div className="space-y-4">
            {data.openings.map((opening, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-sm font-medium">{opening.name}</span>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                  {opening.games} Games
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
          <h3 className="font-bold mb-4">Adaptation Progress</h3>
          <div className="flex items-center gap-6">
            <div className="size-20 rounded-full border-4 border-primary border-r-transparent flex items-center justify-center">
              <span className="text-sm font-bold">{data.sync_complete}%</span>
            </div>
            <div>
              <p className="text-sm font-medium">AI Sync Complete</p>
              <p className="text-xs text-slate-500">The engine has high confidence in your predicted moves for the first 15 plies.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
