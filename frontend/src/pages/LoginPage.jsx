import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const formData = new FormData(event.currentTarget);
    const userName = String(formData.get("username") || "").trim();
    const password = String(formData.get("password") || "");

    if (!userName || !password) {
      setError("Please enter username and password.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_name: userName, password }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.detail || "Login failed");
      }

      localStorage.setItem("chess_user_name", payload.user_name || userName);
      navigate("/dashboard");
    } catch (submitError) {
      setError(submitError.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex-grow flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[460px] bg-white dark:bg-slate-900/50 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 md:p-10">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Authentication</p>
          <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100">Login</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Use your account to continue training.</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2" htmlFor="username">Username</label>
            <input
              className="w-full px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
              id="username"
              name="username"
              placeholder="Enter your username"
              type="text"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2" htmlFor="password">Password</label>
            <input
              className="w-full px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
              id="password"
              name="password"
              placeholder="Enter your password"
              type="password"
              autoComplete="current-password"
            />
          </div>

          {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}

          <button
            className="w-full py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/25 transition-all"
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-600 dark:text-slate-400 text-center">
          New player? <Link className="text-primary font-bold hover:underline" to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
