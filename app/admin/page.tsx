"use client";

import React, { useState, useEffect } from "react";

interface Submission {
  responseId: string;
  submittedAt: string;
  answers: Record<string, any>;
  anonymizedHashSnippet?: string;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
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

  const checkAuthAndLoadMetrics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/metrics");
      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(true);
        setMetrics({
          totalCount: data.totalCount || 0,
          latestTimestamp: data.latestTimestamp,
          recentSubmissions: data.recentSubmissions || [],
        });
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthAndLoadMetrics();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        checkAuthAndLoadMetrics();
      } else {
        setLoginError(data.error || "Invalid administrative credentials.");
      }
    } catch {
      setLoginError("Login request failed. Check server connection.");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    setIsAuthenticated(false);
    setPassword("");
  };

  const handleDownloadCsv = () => {
    window.location.href = "/api/admin/export";
  };

  if (isAuthenticated === null && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono text-sm text-stone-500">
        Loading administration console...
      </div>
    );
  }

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="paper-card rounded-lg p-8 max-w-md w-full border border-stone-300 shadow-md">
          <div className="border-b border-stone-200 pb-4 mb-6">
            <span className="text-xs uppercase font-mono text-stone-400 block tracking-wider">
              Research Administration
            </span>
            <h1 className="serif-title text-xl font-bold text-stone-900 mt-1">
              Survey Control Center
            </h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Administrative Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password..."
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-900"
                autoFocus
              />
            </div>

            {loginError && (
              <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-2.5">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-stone-900 hover:bg-stone-800 text-white text-sm font-semibold py-2.5 rounded transition cursor-pointer"
            >
              Authenticate & Enter →
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Authenticated Admin Dashboard
  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
      {/* Header */}
      <header className="border-b border-stone-300 pb-6 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs uppercase font-mono text-stone-400 block tracking-wider">
            IIT Research Platform · Data Control
          </span>
          <h1 className="serif-title text-2xl sm:text-3xl font-bold text-stone-900">
            Survey Response Administration
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadCsv}
            className="bg-emerald-800 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-semibold rounded shadow flex items-center gap-2 cursor-pointer transition"
          >
            <span>↓</span> Download SPSS / R CSV
          </button>
          <button
            onClick={handleLogout}
            className="border border-stone-300 hover:bg-stone-100 text-stone-700 px-3 py-2 text-xs rounded transition cursor-pointer"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="paper-card rounded-lg p-6 border border-stone-200">
          <span className="text-xs font-mono uppercase text-stone-500">Total Valid Responses</span>
          <div className="text-3xl font-bold text-stone-900 mt-2 font-mono">
            {metrics.totalCount}
          </div>
          <span className="text-[11px] text-stone-400 block mt-1">
            Deduplicated & integrity verified
          </span>
        </div>

        <div className="paper-card rounded-lg p-6 border border-stone-200">
          <span className="text-xs font-mono uppercase text-stone-500">Latest Submission</span>
          <div className="text-sm font-medium text-stone-800 mt-3">
            {metrics.latestTimestamp
              ? new Date(metrics.latestTimestamp).toLocaleString()
              : "No responses yet"}
          </div>
          <span className="text-[11px] text-stone-400 block mt-1">UTC synchronization active</span>
        </div>

        <div className="paper-card rounded-lg p-6 border border-stone-200">
          <span className="text-xs font-mono uppercase text-stone-500">Statistical Format</span>
          <div className="text-sm font-semibold text-stone-900 mt-3">
            SPSS / R Numerical Columns
          </div>
          <span className="text-[11px] text-stone-500 block mt-1">
            24 battery variables ready for analysis
          </span>
        </div>
      </div>

      {/* Recent Submissions Table */}
      <div className="paper-card rounded-lg border border-stone-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-stone-200 bg-stone-50/50 flex justify-between items-center">
          <h2 className="serif-title text-base font-bold text-stone-900">
            Recent Submissions (Latest 20)
          </h2>
          <button
            onClick={checkAuthAndLoadMetrics}
            className="text-xs text-stone-600 hover:text-stone-900 underline cursor-pointer"
          >
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100 text-stone-600 uppercase font-mono text-[10px] tracking-wider border-b border-stone-200">
              <tr>
                <th className="p-3">Reference ID</th>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Age</th>
                <th className="p-3">AI Frequency</th>
                <th className="p-3">Relationship</th>
                <th className="p-3">Weekly Hours</th>
                <th className="p-3">AICDS Avg (1-7)</th>
                <th className="p-3">Integrity Snippet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {metrics.recentSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-stone-400 italic">
                    No survey responses recorded yet. When participants complete the questionnaire,
                    they will populate here in real-time.
                  </td>
                </tr>
              ) : (
                metrics.recentSubmissions.map((sub) => {
                  const answers = sub.answers || {};

                  // Calculate quick AICDS average
                  const aicdsValues = [1, 2, 3, 4, 5, 6, 7, 8]
                    .map((i) => Number(answers[`aicds_${i}`]))
                    .filter((v) => !isNaN(v) && v > 0);
                  const aicdsAvg =
                    aicdsValues.length > 0
                      ? (
                          aicdsValues.reduce((a, b) => a + b, 0) / aicdsValues.length
                        ).toFixed(2)
                      : "—";

                  return (
                    <tr key={sub.responseId} className="hover:bg-stone-50 transition">
                      <td className="p-3 font-mono font-medium text-stone-900">
                        {sub.responseId}
                      </td>
                      <td className="p-3 text-stone-600 whitespace-nowrap">
                        {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : "—"}
                      </td>
                      <td className="p-3 text-stone-800">{answers.demo_age || "—"}</td>
                      <td className="p-3 text-stone-800">{answers.demo_freq || "—"}</td>
                      <td className="p-3 text-stone-800">{answers.demo_rel || "—"}</td>
                      <td className="p-3 text-stone-800">{answers.demo_hours || "—"}</td>
                      <td className="p-3 font-mono text-stone-900 font-semibold">{aicdsAvg}</td>
                      <td className="p-3 font-mono text-stone-400">
                        {sub.anonymizedHashSnippet || "••••••••"}
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
