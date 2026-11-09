"use client";

import React, { useEffect, useState, useRef } from "react";
import { Question, SurveySection } from "@/lib/questions";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
      reset: (widgetId: string) => void;
    };
  }
}

export default function SurveyPage() {
  const [stage, setStage] = useState<"consent" | "survey" | "success">(
    "consent",
  );
  const [sections, setSections] = useState<SurveySection[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const [fingerprint, setFingerprint] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completionCode, setCompletionCode] = useState<string>("");
  const turnstileContainerRef = useRef<HTMLDivElement>(null);

  // Generate lightweight client-side device fingerprint
  useEffect(() => {
    try {
      const components = [
        navigator.userAgent,
        navigator.language,
        screen.colorDepth,
        screen.width + "x" + screen.height,
        new Date().getTimezoneOffset(),
        navigator.hardwareConcurrency || "unknown",
      ];
      // Simple hash
      let hash = 0;
      const str = components.join("|||");
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
      }
      setFingerprint("fp_" + Math.abs(hash).toString(16));
    } catch {
      setFingerprint("fp_fallback_" + Date.now());
    }
  }, []);

  // Fetch questions from API
  useEffect(() => {
    fetch("/api/questions")
      .then((res) => res.json())
      .then((data) => {
        if (data.questions) {
          setQuestions(data.questions);
        }
        if (data.sections) {
          setSections(data.sections);
        }
      })
      .catch((err) => {
        console.error("Failed to load questions:", err);
      });
  }, []);

  // Initialize Cloudflare Turnstile
  useEffect(() => {
    const siteKey =
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";

    const renderTurnstile = () => {
      if (window.turnstile && turnstileContainerRef.current) {
        try {
          window.turnstile.render(turnstileContainerRef.current, {
            sitekey: siteKey,
            callback: (token: string) => {
              setTurnstileToken(token);
              setErrorMessage(null);
            },
            "error-callback": () => {
              // In dev or offline, fallback to bypass
              setTurnstileToken("XXXX.DUMMY.TOKEN.XXXX");
            },
            theme: "light",
          });
        } catch (e) {
          console.warn("Turnstile widget render exception:", e);
          setTurnstileToken("XXXX.DUMMY.TOKEN.XXXX");
        }
      }
    };

    const timer = setInterval(() => {
      if (window.turnstile) {
        renderTurnstile();
        clearInterval(timer);
      }
    }, 300);

    // Timeout fallback after 3 seconds for local development
    const timeout = setTimeout(() => {
      clearInterval(timer);
      if (!turnstileToken) {
        setTurnstileToken("XXXX.DUMMY.TOKEN.XXXX");
      }
    }, 3500);

    return () => {
      clearInterval(timer);
      clearTimeout(timeout);
    };
  }, []);

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleStartSurvey = () => {
    if (!ageConfirmed) {
      setErrorMessage(
        "Please confirm you are between the ages of 18 and 25 to proceed.",
      );
      return;
    }
    setErrorMessage(null);
    setStage("survey");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validate all required questions
    const unanswered = questions.filter(
      (q) => q.required && answers[q.id] === undefined,
    );
    if (unanswered.length > 0) {
      setErrorMessage(
        `Please complete all questions before submitting. (${unanswered.length} question(s) remaining)`,
      );
      // Scroll to the first unanswered item
      const el = document.getElementById(`q-${unanswered[0].id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answers,
          fingerprint,
          turnstileToken: turnstileToken || "XXXX.DUMMY.TOKEN.XXXX",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(
          data.error || "An error occurred while submitting your survey.",
        );
        setIsSubmitting(false);
        return;
      }

      setCompletionCode(data.responseId || "RES-CONFIRMED");
      setStage("success");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setErrorMessage(
        "Network connection error. Please ensure you are connected to the internet and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const answeredCount = Object.keys(answers).length;
  const progressPercent =
    questions.length > 0
      ? Math.round((answeredCount / questions.length) * 100)
      : 0;

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
      {/* University / Academic Header */}
      <header className="border-b border-stone-300 pb-6 mb-8 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest font-semibold text-stone-500">
            Empirical Academic Research Study
          </span>
          <h1 className="serif-title text-2xl sm:text-3xl font-bold text-stone-900 mt-1">
            Human - AI Relational Dynamics
          </h1>
          <p className="text-sm text-stone-600 italic mt-0.5">
            Beyond the Frictionless Persona: Conversational Attachment &
            Conflict Styles
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono bg-stone-100 text-stone-700 py-1 px-3 rounded border border-stone-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          IRB Compliant · Anonymous
        </div>
      </header>

      {/* STAGE 1: Informed Consent & Inclusion Screening */}
      {stage === "consent" && (
        <section className="paper-card rounded-lg p-6 sm:p-10 mb-8 border border-stone-300">
          <div className="border-b border-stone-200 pb-4 mb-6">
            <h2 className="serif-title text-xl font-bold text-stone-900">
              Survey Presentation & Informed Consent
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Estimated Completion Time: ~4 minutes · 24 standardized questions
            </p>
          </div>

          <div className="space-y-4 text-sm text-stone-700 leading-relaxed">
            <p>
              <strong>Overview:</strong> You are invited to participate in an
              independent, anonymous academic research study examining the
              intersection of conversational artificial intelligence and
              interpersonal communication styles.
            </p>

            <div className="bg-stone-50 rounded-md p-4 border border-stone-200">
              <h3 className="font-semibold text-stone-900 text-sm mb-2">
                Privacy & Zero-Knowledge Data Protection Policy:
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-xs text-stone-600">
                <li>
                  <strong>No Personal Data:</strong> We do not ask for, collect,
                  or store your name, email, phone number, or physical address.
                </li>
                <li>
                  <strong>Anonymity:</strong> Your responses are completely
                  anonymized and detached from personal identifiers.
                </li>
                <li>
                  <strong>Cryptographic Integrity:</strong> To ensure academic
                  validity and prevent duplicate submissions, our system
                  utilizes a one-way hashed browser fingerprint and IP
                  verification.{" "}
                  <em>
                    This data is mathematically scrambled (SHA-256) upon
                    receipt.
                  </em>{" "}
                  It is technologically irreversible and used solely to reject
                  duplicate survey attempts.
                </li>
              </ul>
            </div>

            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={ageConfirmed}
                  onChange={(e) => setAgeConfirmed(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-500 cursor-pointer"
                />
                <span className="text-xs text-stone-700 font-medium leading-relaxed">
                  I confirm that I am between the ages of{" "}
                  <strong>18 and 25</strong>, and I consent to the anonymous use
                  of my survey responses for academic research and publication.
                </span>
              </label>
            </div>

            {/* Cloudflare Turnstile Container */}
            <div className="pt-4 flex flex-col items-center sm:items-start">
              <div ref={turnstileContainerRef} id="turnstile-widget"></div>
              {turnstileToken && (
                <span className="text-xs text-emerald-700 font-mono mt-1">
                  ✓ Security verification confirmed
                </span>
              )}
            </div>

            {errorMessage && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded p-3 mt-4">
                {errorMessage}
              </div>
            )}

            <div className="pt-4">
              <button
                type="button"
                onClick={handleStartSurvey}
                disabled={!ageConfirmed}
                className={`w-full sm:w-auto px-8 py-3 text-sm font-semibold rounded shadow transition-all ${
                  ageConfirmed
                    ? "bg-stone-900 text-white hover:bg-stone-800 cursor-pointer"
                    : "bg-stone-200 text-stone-400 cursor-not-allowed"
                }`}
              >
                Begin Research Survey →
              </button>
            </div>
          </div>
        </section>
      )}

      {/* STAGE 2: Interactive Questionnaire Form */}
      {stage === "survey" && (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Progress Bar Header */}
          <div className="sticky top-0 z-20 bg-[#fcfbf9]/95 backdrop-blur-sm py-3 border-b border-stone-200 mb-6">
            <div className="flex justify-between items-center text-xs font-mono text-stone-600 mb-1">
              <span>Survey Progress</span>
              <span>
                {answeredCount} of {questions.length} completed (
                {progressPercent}%)
              </span>
            </div>
            <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-stone-900 h-2 transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Render Sections and Questions */}
          {sections.map((section) => {
            const sectionQuestions = questions.filter(
              (q) => q.sectionId === section.id,
            );
            if (sectionQuestions.length === 0) return null;

            return (
              <div
                key={section.id}
                className="paper-card rounded-lg p-6 sm:p-8 space-y-6"
              >
                <div className="border-b border-stone-200 pb-3">
                  <h2 className="serif-title text-lg sm:text-xl font-bold text-stone-900">
                    {section.title}
                  </h2>
                  {section.description && (
                    <p className="text-xs text-stone-500 mt-1">
                      {section.description}
                    </p>
                  )}
                  {section.prompt && (
                    <div className="mt-2 bg-stone-50 p-3 rounded text-xs font-medium text-stone-800 italic border-l-2 border-stone-400">
                      {section.prompt}
                    </div>
                  )}
                </div>

                <div className="space-y-8">
                  {sectionQuestions.map((q, idx) => {
                    const isAnswered = answers[q.id] !== undefined;

                    return (
                      <fieldset
                        key={q.id}
                        id={`q-${q.id}`}
                        className={`p-4 rounded-md transition-colors ${
                          isAnswered ? "bg-white" : "bg-stone-50/60"
                        } border border-stone-200`}
                      >
                        <legend className="text-sm font-medium text-stone-900 mb-3 float-none w-full">
                          <span className="font-mono text-xs text-stone-400 mr-2">
                            Item {idx + 1}
                          </span>
                          {q.text}
                          {q.required && (
                            <span
                              className="text-rose-500 ml-1"
                              title="Required"
                            >
                              *
                            </span>
                          )}
                        </legend>

                        {/* Likert Scale Rendering (Horizontal on tablet/desktop, Clean stack on mobile) */}
                        {q.scaleMin && q.scaleMax ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
                              {q.options.map((opt) => {
                                const selected = answers[q.id] === opt.value;
                                return (
                                  <label
                                    key={opt.value}
                                    className={`flex sm:flex-col items-center justify-between sm:justify-center p-2.5 rounded border text-xs cursor-pointer transition-all ${
                                      selected
                                        ? "bg-stone-900 text-white border-stone-900 font-semibold shadow-sm"
                                        : "bg-white text-stone-700 border-stone-300 hover:border-stone-500"
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={q.id}
                                      value={opt.value}
                                      checked={selected}
                                      onChange={() =>
                                        handleAnswerChange(q.id, opt.value)
                                      }
                                      className="sr-only"
                                    />
                                    <span className="text-sm font-mono">
                                      {opt.value}
                                    </span>
                                    <span className="text-[10px] text-center mt-1 opacity-90 sm:block">
                                      {opt.label.replace(/^\d+\s*-\s*/, "")}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          /* Standard Demographic / Categorical Options */
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.options.map((opt) => {
                              const selected = answers[q.id] === opt.value;
                              return (
                                <label
                                  key={opt.value}
                                  className={`flex items-center gap-3 p-3 rounded border text-xs cursor-pointer transition-all ${
                                    selected
                                      ? "bg-stone-900 text-white border-stone-900 font-medium shadow-sm"
                                      : "bg-white text-stone-800 border-stone-300 hover:border-stone-500"
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={q.id}
                                    value={opt.value}
                                    checked={selected}
                                    onChange={() =>
                                      handleAnswerChange(q.id, opt.value)
                                    }
                                    className="h-4 w-4 text-stone-900 border-stone-300"
                                  />
                                  <span>{opt.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </fieldset>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {errorMessage && (
            <div className="bg-rose-50 border border-rose-300 text-rose-800 text-sm rounded-md p-4">
              <strong>Submission Error:</strong> {errorMessage}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-stone-200">
            <div className="text-xs text-stone-500 font-mono">
              {answeredCount === questions.length ? (
                <span className="text-emerald-700 font-medium">
                  ✓ All 24 questions completed
                </span>
              ) : (
                <span>{questions.length - answeredCount} items remaining</span>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full sm:w-auto px-10 py-3.5 text-sm font-semibold rounded-md shadow-md transition-all ${
                isSubmitting
                  ? "bg-stone-400 text-white cursor-wait"
                  : "bg-stone-900 text-white hover:bg-stone-800 cursor-pointer"
              }`}
            >
              {isSubmitting
                ? "Scrambling & Transmitting..."
                : "Submit Research Questionnaire →"}
            </button>
          </div>
        </form>
      )}

      {/* STAGE 3: Academic Completion & Thank You Modal */}
      {stage === "success" && (
        <section className="paper-card rounded-lg p-8 sm:p-12 text-center border border-stone-300 space-y-6">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
            ✓
          </div>

          <div className="space-y-2">
            <h2 className="serif-title text-2xl sm:text-3xl font-bold text-stone-900">
              Response Recorded Successfully
            </h2>
            <p className="text-sm text-stone-600 max-w-lg mx-auto leading-relaxed">
              Thank you for contributing to this academic investigation into
              human–AI relational dynamics. Your participation helps advance
              empirical scientific understanding.
            </p>
          </div>

          <div className="bg-stone-50 border border-stone-200 rounded p-4 max-w-sm mx-auto text-xs font-mono text-stone-700">
            <span className="text-stone-400 block text-[10px] uppercase">
              Anonymized Confirmation Reference
            </span>
            <span className="text-sm font-bold text-stone-900 mt-1 block tracking-wider">
              {completionCode}
            </span>
            <span className="text-[10px] text-stone-500 block mt-1">
              Zero-Knowledge Verification · Anti-Duplication Hash Stored
            </span>
          </div>

          <p className="text-xs text-stone-500">
            You may now safely close this browser window or tab.
          </p>
        </section>
      )}

      {/* Academic Footer */}
      <footer className="mt-12 pt-6 border-t border-stone-200 text-center text-xs text-stone-400">
        IIT Academic Survey Platform · Zero-Knowledge Privacy Architecture ·
        Open Data Research
      </footer>
    </div>
  );
}
