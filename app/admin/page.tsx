"use client";

import React, { useState, useEffect } from "react";
import { ScoredSubmission } from "@/app/api/admin/metrics/route";

interface SummaryMetrics {
  totalSubmissions: number;
  totalValidSubmissions: number;
  failedCheckCount: number;
  highTargetMatchCount: number;
  highTargetMatchPercent: number;
  moderateMatchCount: number;
  moderateMatchPercent: number;
  baselineMatchCount: number;
  baselineMatchPercent: number;
  averageAicds: number;
  averageAvoidance: number;
  averageCollab: number;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [token, setToken] = useState<string>("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [dbError, setDbError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [badgeFilter, setBadgeFilter] = useState("ALL");

  const [summary, setSummary] = useState<SummaryMetrics>({
    totalSubmissions: 0,
    totalValidSubmissions: 0,
    failedCheckCount: 0,
    highTargetMatchCount: 0,
    highTargetMatchPercent: 0,
    moderateMatchCount: 0,
    moderateMatchPercent: 0,
    baselineMatchCount: 0,
    baselineMatchPercent: 0,
    averageAicds: 0,
    averageAvoidance: 0,
    averageCollab: 0,
  });

  const [submissions, setSubmissions] = useState<ScoredSubmission[]>([]);

  const loadData = async (activeToken: string) => {
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
        setIsAuthenticated(true);
        setDbError(data.error || "Unable to reach database.");
        return;
      }

      setIsAuthenticated(true);
      if (data.summary) setSummary(data.summary);
      if (data.submissions) setSubmissions(data.submissions);
    } catch {
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
      loadData(savedToken);
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
        await loadData(receivedToken);
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

  const filteredSubmissions = submissions.filter((item) => {
    const matchesId = item.responseId.toLowerCase().includes(searchQuery.toLowerCase().trim());
    const matchesBadge = badgeFilter === "ALL" || item.profileBadge === badgeFilter;
    return matchesId && matchesBadge;
  });

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono text-xs text-stone-500">
        Authenticating session...
      </div>
    );
  }

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="paper-card rounded-lg p-6 sm:p-8 max-w-sm w-full border border-stone-300 shadow-md">
          <div className="border-b border-stone-200 pb-3 mb-5">
            <span className="text-[10px] uppercase font-mono text-stone-400 block tracking-wider">
              Research Administration
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

  // Authenticated Dashboard
  return (
    <div className="min-h-screen py-6 sm:py-10 px-3 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <header className="border-b border-stone-300 pb-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <span className="text-[10px] uppercase font-mono text-stone-400 block tracking-wider">
            Beyond the Frictionless Persona · Empirical Research
          </span>
          <h1 className="serif-title text-xl sm:text-2xl font-bold text-stone-900">
            Hypothesis Profiling & Survey Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <button
            onClick={handleDownloadCsv}
            className="bg-emerald-800 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-semibold rounded shadow flex items-center gap-1.5 cursor-pointer transition active:scale-95"
          >
            <span>↓</span> Export to CSV (SPSS/R)
          </button>
          <button
            onClick={() => loadData(token)}
            disabled={isLoading}
            className="border border-stone-300 hover:bg-stone-100 text-stone-700 px-3 py-2 text-xs rounded transition cursor-pointer"
          >
            {isLoading ? "⟳ ..." : "⟳ Refresh"}
          </button>
          <button
            onClick={handleLogout}
            className="border border-stone-300 hover:bg-stone-100 text-stone-700 px-3 py-2 text-xs rounded transition cursor-pointer"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Database Error Banner */}
      {dbError && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 text-xs rounded p-3 mb-6 flex items-start gap-2">
          <span className="font-bold">⚠️</span>
          <div>
            <div className="font-semibold">Notice</div>
            <div>{dbError}</div>
          </div>
        </div>
      )}

      {/* 3 Header Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className="paper-card rounded-lg p-4 sm:p-5 border border-stone-200">
          <span className="text-[10px] font-mono uppercase text-stone-500">
            Total Valid Submissions
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-stone-900 mt-1 font-mono">
            {summary.totalValidSubmissions}
          </div>
          <span className="text-[10px] text-stone-400 block mt-0.5">
            {summary.failedCheckCount > 0
              ? `${summary.failedCheckCount} excluded (failed attention check)`
              : "All attention checks passed"}
          </span>
        </div>

        <div className="paper-card rounded-lg p-4 sm:p-5 border border-stone-200">
          <span className="text-[10px] font-mono uppercase text-stone-500">
            High Target Match Ratio
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-rose-700 mt-1 font-mono">
            {summary.highTargetMatchPercent}%
          </div>
          <span className="text-[10px] text-stone-400 block mt-0.5">
            High Dependence (≥35) & High Avoidance (≥14)
          </span>
        </div>

        <div className="paper-card rounded-lg p-4 sm:p-5 border border-stone-200">
          <span className="text-[10px] font-mono uppercase text-stone-500">
            Average AICDS Score
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-stone-900 mt-1 font-mono">
            {summary.averageAicds} <span className="text-sm font-normal text-stone-400">/ 56</span>
          </div>
          <span className="text-[10px] text-stone-400 block mt-0.5">
            Dependence mean across valid participants
          </span>
        </div>
      </div>

      {/* Summary Report Section: Visual Breakdown of Hypothesis Inclination */}
      <div className="paper-card rounded-lg p-4 sm:p-6 border border-stone-200 mb-6 space-y-4">
        <h2 className="serif-title text-sm sm:text-base font-bold text-stone-900">
          Hypothesis Inclination Breakdown (Profile Distribution)
        </h2>

        <div className="space-y-3">
          {/* High Target Match */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium text-stone-800">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
                🔴 High Target Match (Dependence ≥ 35 & Avoidance ≥ 14)
              </span>
              <span className="font-mono text-stone-900 font-semibold">
                {summary.highTargetMatchCount} ({summary.highTargetMatchPercent}%)
              </span>
            </div>
            <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-rose-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${summary.highTargetMatchPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Moderate Match */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium text-stone-800">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                🟡 Moderate Match (High Dependence OR High Avoidance)
              </span>
              <span className="font-mono text-stone-900 font-semibold">
                {summary.moderateMatchCount} ({summary.moderateMatchPercent}%)
              </span>
            </div>
            <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${summary.moderateMatchPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Baseline / Low Match */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium text-stone-800">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                🟢 Baseline / Low Match (Low Dependence & Low Avoidance)
              </span>
              <span className="font-mono text-stone-900 font-semibold">
                {summary.baselineMatchCount} ({summary.baselineMatchPercent}%)
              </span>
            </div>
            <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${summary.baselineMatchPercent}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Respondent Data Table */}
      <div className="paper-card rounded-lg border border-stone-200 overflow-hidden shadow-sm">
        <div className="p-3 sm:p-4 border-b border-stone-200 bg-stone-50 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
          <h2 className="serif-title text-sm sm:text-base font-bold text-stone-900">
            Respondent Psychological Profiles
          </h2>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search User ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-stone-300 rounded bg-white focus:outline-none focus:border-stone-900"
            />
            <select
              value={badgeFilter}
              onChange={(e) => setBadgeFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-stone-300 rounded bg-white focus:outline-none focus:border-stone-900"
            >
              <option value="ALL">All Profiles</option>
              <option value="HIGH_TARGET_MATCH">🔴 High Target</option>
              <option value="MODERATE_MATCH">🟡 Moderate</option>
              <option value="BASELINE_LOW_MATCH">🟢 Baseline</option>
              <option value="INVALID">⚪ Invalid</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100 text-stone-600 uppercase font-mono text-[10px] tracking-wider border-b border-stone-200">
              <tr>
                <th className="p-2.5 sm:p-3">Timestamp</th>
                <th className="p-2.5 sm:p-3">Hashed User ID</th>
                <th className="p-2.5 sm:p-3">AICDS Score</th>
                <th className="p-2.5 sm:p-3">Avoidance</th>
                <th className="p-2.5 sm:p-3">Collab</th>
                <th className="p-2.5 sm:p-3">Validation</th>
                <th className="p-2.5 sm:p-3">Profile Badge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-stone-400 italic text-xs">
                    No survey responses match the criteria.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub) => {
                  const s = sub.scores;

                  let badgeEl = null;
                  if (sub.profileBadge === "HIGH_TARGET_MATCH") {
                    badgeEl = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                        🔴 High Target Match
                      </span>
                    );
                  } else if (sub.profileBadge === "MODERATE_MATCH") {
                    badgeEl = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        🟡 Moderate Match
                      </span>
                    );
                  } else if (sub.profileBadge === "BASELINE_LOW_MATCH") {
                    badgeEl = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        🟢 Baseline Match
                      </span>
                    );
                  } else {
                    badgeEl = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-600 border border-stone-300">
                        ⚪ Failed Check
                      </span>
                    );
                  }

                  return (
                    <tr key={sub.responseId} className="hover:bg-stone-50 transition">
                      <td className="p-2.5 sm:p-3 text-stone-600 whitespace-nowrap">
                        {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="p-2.5 sm:p-3 font-mono font-semibold text-stone-900 whitespace-nowrap">
                        {sub.responseId}
                      </td>
                      <td className="p-2.5 sm:p-3">
                        <span className="font-mono font-medium">{s.aicds}/56</span>{" "}
                        <span className="text-[10px] text-stone-500">
                          ({s.isHighDependence ? "High" : "Normal"})
                        </span>
                      </td>
                      <td className="p-2.5 sm:p-3">
                        <span className="font-mono font-medium">{s.avoidance}/20</span>{" "}
                        <span className="text-[10px] text-stone-500">
                          ({s.isHighAvoidance ? "High" : "Normal"})
                        </span>
                      </td>
                      <td className="p-2.5 sm:p-3">
                        <span className="font-mono font-medium">{s.collab}/20</span>{" "}
                        <span className="text-[10px] text-stone-500">
                          ({s.isLowCollab ? "Low" : "Normal"})
                        </span>
                      </td>
                      <td className="p-2.5 sm:p-3 font-mono text-stone-700">{s.validation}/28</td>
                      <td className="p-2.5 sm:p-3 whitespace-nowrap">{badgeEl}</td>
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
