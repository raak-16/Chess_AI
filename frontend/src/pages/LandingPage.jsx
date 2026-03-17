import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="w-full flex-grow flex flex-col items-center justify-center px-6 py-12">
      <div className="text-center max-w-3xl mb-12 flex flex-col items-center">
        <span className="inline-block py-1 px-3 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase mb-4">
          Next-Gen Neural Engine
        </span>
        <h1 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-slate-100 leading-tight mb-6 tracking-tight">
          Adaptive Chess AI
        </h1>
        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed">
          Play against an AI that learns your playstyle and responds like a Grandmaster. Elevate your game with every move.
        </p>
      </div>

      <div className="w-full max-w-[440px] bg-white dark:bg-slate-900/50 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 p-8 md:p-10">
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Welcome back</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Sign in to continue your training</p>
        </div>

        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); window.location.href = '/dashboard'; }}>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2" htmlFor="username">Username</label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-4 text-slate-400 text-xl">person</span>
              <input
                className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                id="username"
                name="username"
                placeholder="Enter your username"
                type="text"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300" htmlFor="password">Password</label>
              <a className="text-xs font-semibold text-primary hover:underline" href="#">Forgot?</a>
            </div>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-4 text-slate-400 text-xl">lock</span>
              <input
                className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                id="password"
                name="password"
                placeholder="........"
                type="password"
              />
            </div>
          </div>

          <button
            className="w-full py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/25 transition-all transform hover:-translate-y-0.5 active:scale-[0.98]"
            type="submit"
          >
            Sign In to Board
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Don't have an account?{" "}
            <Link className="text-primary font-bold hover:underline" to="/dashboard">
              Enter demo dashboard
            </Link>
          </p>
        </div>
      </div>

      <div className="mt-12 max-w-md text-center">
        <div className="flex justify-center gap-4 mb-4">
          <div className="flex items-center gap-1 text-slate-400">
            <span className="material-symbols-outlined text-sm">bolt</span>
            <span className="text-[10px] font-bold uppercase tracking-widest">Real-time Analysis</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <span className="material-symbols-outlined text-sm">psychology</span>
            <span className="text-[10px] font-bold uppercase tracking-widest">Cognitive Adaptation</span>
          </div>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 italic">
          "Our neural engine doesn't just calculate moves; it mimics the psychological nuances and strategic depth of human masters, adjusting its difficulty to provide the perfect learning curve for your specific style."
        </p>
      </div>
      
      <div className="fixed top-0 left-0 -z-10 opacity-20 pointer-events-none">
        <div className="w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2"></div>
      </div>
      <div className="fixed bottom-0 right-0 -z-10 opacity-20 pointer-events-none">
        <div className="w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] translate-x-1/3 translate-y-1/3"></div>
      </div>
    </div>
  );
}
