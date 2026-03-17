import { Link, Outlet, useLocation } from "react-router-dom";

export default function Layout() {
  const location = useLocation();
  const activePage = location.pathname;
  
  // Basic user simulation for this iteration
  const userName = "Grandmaster";

  const navItems = [
    { label: "Dashboard", endpoint: "/dashboard", active: activePage === "/dashboard" },
    { label: "Play Game", endpoint: "/game", active: activePage === "/game" },
    { label: "Opponent Profile", endpoint: "/profile", active: activePage === "/profile" },
    { label: "Game History", endpoint: "/history", active: activePage === "/history" },
  ];

  return (
    <div className="font-display">
      <header className="border-b border-slate-200 dark:border-primary/20 bg-white dark:bg-background-dark sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-xl">grid_view</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight">
                Adaptive Chess <span className="text-primary">AI</span>
              </h1>
            </Link>

            <nav className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.endpoint}
                  to={item.endpoint}
                  className={
                    item.active
                      ? "text-primary font-semibold border-b-2 border-primary py-5"
                      : "text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary font-medium py-5 transition-colors"
                  }
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-4">
              <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-primary/10 rounded-full">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <div className="flex items-center gap-2 cursor-pointer group">
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border border-primary/30 text-primary font-bold">
                  {userName.substring(0, 2).toUpperCase()}
                </div>
                <span className="text-sm font-semibold">{userName}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center">
        <Outlet />
      </main>

      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-slate-200 dark:border-primary/10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-50">
            <div className="w-6 h-6 bg-slate-400 rounded-sm flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-sm">grid_view</span>
            </div>
            <span className="text-sm font-bold">
              Adaptive Chess AI &copy; {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex gap-8 text-sm text-slate-500 dark:text-slate-400">
            <a className="hover:text-primary transition-colors" href="#">
              Documentation
            </a>
            <a className="hover:text-primary transition-colors" href="#">
              Privacy Policy
            </a>
            <a className="hover:text-primary transition-colors" href="#">
              Terms of Service
            </a>
            <a className="hover:text-primary transition-colors" href="#">
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
