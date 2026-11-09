"use client";

import React, { useState, useEffect } from "react";

interface Submission {
  responseId: string;
  submittedAt: string;
  answers: Record<string, any>;
  anonymizedHashSnippet?: string;
  recaptchaScore?: number;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [token, setToken] = useState<string>("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [dbError, setDbError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [metrics, setMetrics] = useState<{
    totalCount: number;
    latestTimestamp: string | null;
    recentSubmissions: Submission[];
  }>({
    totalCount: 0,
    latestTimestamp: null,
    recentSubmissions: [],
  });

  const loadMetrics = async (activeToken: string) => {
    setIsLoading(true);
    setDbError(null);
    try {
      const res = await fetch(`/api/admin/metrics?token=${encodeURIComponent(activeToken)}`, {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });

      if (res.status === 401) {
        setIsAuthenticated(false);
        localStorage.removeItem("iit_admin_token");
        setToken("");
        return;
      }

      const data = await res.json();

      if (!res.ok || !data.success) {
        // Authenticated, but DB query issue occurred
        setIsAuthenticated(true);
        setDbError(data.error || "Unable to reach database.");
        return;
      }

      setIsAuthenticated(true);
      setMetrics({
        totalCount: data.totalCount || 0,
        latestTimestamp: data.latestTimestamp,
        recentSubmissions: data.recentSubmissions || [],
      });
    } catch (err: any) {
      setIsAuthenticated(true);
      setDbError("Network error while loading metrics.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem("iit_admin_token");
    if (savedToken) {
      setToken(savedToken);
      loadMetrics(savedToken);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (res.ok && data.success && data.token) {
        const receivedToken = data.token;
        localStorage.setItem("iit_admin_token", receivedToken);
        setToken(receivedToken);
        setIsAuthenticated(true);
        await loadMetrics(receivedToken);
      } else {
        setLoginError(data.error || "Invalid administrative credentials.");
      }
    } catch {
      setLoginError("Login request failed. Check server connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/login", { method: "DELETE" });
    } catch {}
    localStorage.removeItem("iit_admin_token");
    setIsAuthenticated(false);
    setToken("");
    setPassword("");
  };

  const handleDownloadCsv = () => {
    if (!token) return;
    window.location.href = `/api/admin/export?token=${encodeURIComponent(token)}`;
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono text-xs text-stone-500">
        Authenticating session...
      </div>
    );
  }

  // 1. Login Screen with Password Eye Toggle
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="paper-card rounded-lg p-6 sm:p-8 max-w-sm w-full border border-stone-300 shadow-md">
          <div className="border-b border-stone-200 pb-3 mb-5">
            <span className="text-[10px] uppercase font-mono text-stone-400 block tracking-wider">
              IIT Research Administration
            </span>
            <h1 className="serif-title text-xl font-bold text-stone-900 mt-1">
              Admin Control Center
            </h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Administrative Password
              </label>

              {/* Password Input with Eye Toggle */}
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password..."
                  className="w-full pl-3 pr-10 py-2.5 text-xs sm:text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-900 transition"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-700 cursor-pointer focus:outline-none"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    /* Eye-Slash Icon */
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                      />
                    </svg>
                  ) : (
                    /* Eye Icon */
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-2.5">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-2.5 text-xs font-semibold rounded text-white transition ${
                isLoading
                  ? "bg-stone-500 cursor-wait"
                  : "bg-stone-900 hover:bg-stone-800 cursor-pointer active:scale-[0.99]"
              }`}
            >
              {isLoading ? "Verifying..." : "Authenticate & Enter →"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Authenticated Admin Dashboard
  return (
    <div className="min-h-screen py-6 sm:py-10 px-3 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <header className="border-b border-stone-300 pb-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <span className="text-[10px] uppercase font-mono text-stone-400 block tracking-wider">
            IIT Research Platform · Data Control
          </span>
          <h1 className="serif-title text-xl sm:text-2xl font-bold text-stone-900">
            Survey Responses Administration
          </h1>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <button
            onClick={handleDownloadCsv}
            className="bg-emerald-800 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-semibold rounded shadow flex items-center gap-1.5 cursor-pointer transition active:scale-95"
          >
            <span>↓</span> Download SPSS/R CSV
          </button>
          <button
            onClick={handleLogout}
            className="border border-stone-300 hover:bg-stone-100 text-stone-700 px-3 py-2 text-xs rounded transition cursor-pointer"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Database Error Banner if any */}
      {dbError && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 text-xs rounded p-3 mb-6 flex items-start gap-2">
          <span className="font-bold">⚠️</span>
          <div>
            <div className="font-semibold">Database Notice</div>
            <div>{dbError}</div>
          </div>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className="paper-card rounded-lg p-4 sm:p-5 border border-stone-200">
          <span className="text-[10px] font-mono uppercase text-stone-500">Total Valid Responses</span>
          <div className="text-2xl sm:text-3xl font-bold text-stone-900 mt-1 font-mono">
            {metrics.totalCount}
          </div>
          <span className="text-[10px] text-stone-400 block mt-0.5">
            Deduplicated & integrity verified
          </span>
        </div>

        <div className="paper-card rounded-lg p-4 sm:p-5 border border-stone-200">
          <span className="text-[10px] font-mono uppercase text-stone-500">Latest Submission</span>
          <div className="text-xs sm:text-sm font-medium text-stone-800 mt-2 truncate">
            {metrics.latestTimestamp
              ? new Date(metrics.latestTimestamp).toLocaleString()
              : "No responses yet"}
          </div>
          <span className="text-[10px] text-stone-400 block mt-0.5">UTC timestamp</span>
        </div>

        <div className="paper-card rounded-lg p-4 sm:p-5 border border-stone-200">
          <span className="text-[10px] font-mono uppercase text-stone-500">Analysis Ready</span>
          <div className="text-xs sm:text-sm font-semibold text-stone-900 mt-2">
            SPSS & R Compatible
          </div>
          <span className="text-[10px] text-stone-500 block mt-0.5">
            24 battery variables + reCAPTCHA score
          </span>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="paper-card rounded-lg border border-stone-200 overflow-hidden shadow-sm">
        <div className="p-3 sm:p-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center">
          <h2 className="serif-title text-sm sm:text-base font-bold text-stone-900">
            Recent Submissions
          </h2>
          <button
            onClick={() => loadMetrics(token)}
            disabled={isLoading}
            className="text-xs text-stone-600 hover:text-stone-900 underline cursor-pointer"
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100 text-stone-600 uppercase font-mono text-[10px] tracking-wider border-b border-stone-200">
              <tr>
                <th className="p-2.5 sm:p-3">ID</th>
                <th className="p-2.5 sm:p-3">Timestamp</th>
                <th className="p-2.5 sm:p-3">Age</th>
                <th className="p-2.5 sm:p-3">AI Freq</th>
                <th className="p-2.5 sm:p-3">Relationship</th>
                <th className="p-2.5 sm:p-3">Hours</th>
                <th className="p-2.5 sm:p-3">AICDS (Avg)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {metrics.recentSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-stone-400 italic text-xs">
                    No survey responses recorded yet.
                  </td>
                </tr>
              ) : (
                metrics.recentSubmissions.map((sub) => {
                  const answers = sub.answers || {};
                  const aicdsValues = [1, 2, 3, 4, 5, 6, 7, 8]
                    .map((i) => Number(answers[`aicds_${i}`]))
                    .filter((v) => !isNaN(v) && v > 0);
                  const aicdsAvg =
                    aicdsValues.length > 0
                      ? (aicdsValues.reduce((a, b) => a + b, 0) / aicdsValues.length).toFixed(1)
                      : "—";

                  return (
                    <tr key={sub.responseId} className="hover:bg-stone-50 transition">
                      <td className="p-2.5 sm:p-3 font-mono font-medium text-stone-900 whitespace-nowrap">
                        {sub.responseId}
                      </td>
                      <td className="p-2.5 sm:p-3 text-stone-600 whitespace-nowrap">
                        {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="p-2.5 sm:p-3 text-stone-800">{answers.demo_age || "—"}</td>
                      <td className="p-2.5 sm:p-3 text-stone-800">{answers.demo_freq || "—"}</td>
                      <td className="p-2.5 sm:p-3 text-stone-800">{answers.demo_rel || "—"}</td>
                      <td className="p-2.5 sm:p-3 text-stone-800">{answers.demo_hours || "—"}</td>
                      <td className="p-2.5 sm:p-3 font-mono font-semibold text-stone-900">
                        {aicdsAvg}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
