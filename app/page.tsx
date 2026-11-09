"use client";

import React, { useEffect, useState } from "react";
import { Question, SurveySection } from "@/lib/questions";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

export default function SurveyPage() {
  const [stage, setStage] = useState<"consent" | "survey" | "success">("consent");
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [sections, setSections] = useState<SurveySection[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [fingerprint, setFingerprint] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completionCode, setCompletionCode] = useState<string>("");

  // Lightweight client-side device fingerprint
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
        if (data.questions) setQuestions(data.questions);
        if (data.sections) setSections(data.sections);
      })
      .catch((err) => {
        console.error("Failed to load questions:", err);
      });
  }, []);

  // Helper to obtain Google reCAPTCHA v3 score token
  const getRecaptchaToken = async (action: string = "submit_survey"): Promise<string> => {
    const siteKey =
      process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "6LeIxacZAAAAA_RECAPTCHA_SITE_KEY_PLACEHOLDER";

    if (typeof window !== "undefined" && window.grecaptcha && siteKey) {
      try {
        return await new Promise<string>((resolve) => {
          window.grecaptcha!.ready(() => {
            window
              .grecaptcha!.execute(siteKey, { action })
              .then((token: string) => {
                resolve(token);
              })
              .catch((err) => {
                console.warn("grecaptcha.execute warning:", err);
                resolve("XXXX.DUMMY.TOKEN.XXXX");
              });
          });
        });
      } catch {
        return "XXXX.DUMMY.TOKEN.XXXX";
      }
    }
    return "XXXX.DUMMY.TOKEN.XXXX";
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
    setErrorMessage(null);
  };

  const handleStartSurvey = () => {
    if (!ageConfirmed) {
      setErrorMessage("Please confirm you are between the ages of 18 and 25 to proceed.");
      return;
    }
    setErrorMessage(null);
    setStage("survey");
    setCurrentSectionIndex(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const currentSection = sections[currentSectionIndex];
  const currentSectionQuestions = questions.filter(
    (q) => currentSection && q.sectionId === currentSection.id
  );

  const validateCurrentSection = (): boolean => {
    const unanswered = currentSectionQuestions.filter(
      (q) => q.required && answers[q.id] === undefined
    );
    if (unanswered.length > 0) {
      setErrorMessage(
        `Please complete all items in this section before continuing. (${unanswered.length} unanswered)`
      );
      const el = document.getElementById(`q-${unanswered[0].id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return false;
    }
    setErrorMessage(null);
    return true;
  };

  const handleNextSection = () => {
    if (!validateCurrentSection()) return;
    if (currentSectionIndex < sections.length - 1) {
      setCurrentSectionIndex((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevSection = () => {
    setErrorMessage(null);
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCurrentSection()) return;

    // Final check for all questions
    const allUnanswered = questions.filter((q) => q.required && answers[q.id] === undefined);
    if (allUnanswered.length > 0) {
      setErrorMessage(
        `Please complete all questions before submitting. (${allUnanswered.length} items missing)`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const recaptchaToken = await getRecaptchaToken("submit_survey");

      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers,
          fingerprint,
          recaptchaToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "An error occurred while submitting your survey.");
        setIsSubmitting(false);
        return;
      }

      setCompletionCode(data.responseId || "RES-CONFIRMED");
      setStage("success");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setErrorMessage("Network error. Please check your internet connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const answeredCount = Object.keys(answers).length;
  const progressPercent =
    questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  return (
    <div className="min-h-screen py-4 sm:py-8 px-3 sm:px-6 lg:px-8 max-w-3xl mx-auto w-full flex flex-col justify-between">
      <div>
        {/* University / Academic Header */}
        <header className="border-b border-stone-300 pb-3 sm:pb-5 mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
          <div>
            <span className="text-[10px] sm:text-xs uppercase tracking-widest font-semibold text-stone-500">
              Empirical Research Study
            </span>
            <h1 className="serif-title text-xl sm:text-2xl font-bold text-stone-900 leading-tight">
              Human–AI Relational Dynamics
            </h1>
            <p className="text-xs text-stone-600 italic">
              Conversational Attachment & Interpersonal Conflict Styles
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono bg-stone-100 text-stone-700 py-0.5 px-2.5 rounded border border-stone-200 self-start sm:self-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Anonymous · IRB Compliant
          </div>
        </header>

        {/* STAGE 1: Informed Consent & Inclusion */}
        {stage === "consent" && (
          <section className="paper-card rounded-lg p-5 sm:p-8 mb-6 border border-stone-300">
            <div className="border-b border-stone-200 pb-3 mb-4">
              <h2 className="serif-title text-lg sm:text-xl font-bold text-stone-900">
                Informed Consent & Research Protocol
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Target Demographic: 18–25 years · ~4 minutes · 24 standardized questions
              </p>
            </div>

            <div className="space-y-3.5 text-xs sm:text-sm text-stone-700 leading-relaxed">
              <p>
                <strong>Study Overview:</strong> You are invited to participate in an anonymous
                academic research study examining how young adults interact with conversational AI
                chatbots and how this connects to real-world interpersonal conflict styles.
              </p>

              <div className="bg-stone-50 rounded p-3.5 border border-stone-200 text-xs space-y-1.5 text-stone-600">
                <div className="font-semibold text-stone-900 text-xs">
                  Zero-Knowledge Privacy Protection:
                </div>
                <p>• <strong>No PII:</strong> No name, email, phone, or address is ever collected.</p>
                <p>• <strong>Cryptographic Anonymity:</strong> Device/IP verification is irreversibly scrambled using SHA-256 server salt to reject duplicates while ensuring full confidentiality.</p>
              </div>

              <div className="pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer select-none bg-stone-50 p-3 rounded border border-stone-200 hover:border-stone-400 transition">
                  <input
                    type="checkbox"
                    checked={ageConfirmed}
                    onChange={(e) => setAgeConfirmed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-500 cursor-pointer flex-shrink-0"
                  />
                  <span className="text-xs text-stone-800 font-medium leading-normal">
                    I confirm that I am between <strong>18 and 25 years old</strong>, and I consent
                    to the anonymous use of my responses for academic research and publication.
                  </span>
                </label>
              </div>

              {/* Google reCAPTCHA v3 Security Badge & Terms */}
              <div className="pt-2">
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-stone-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Protected by Google reCAPTCHA v3</span>
                </div>
                <p className="text-[10px] text-stone-400 mt-0.5 leading-tight">
                  This site is protected by reCAPTCHA and the Google{" "}
                  <a
                    href="https://policies.google.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-stone-600"
                  >
                    Privacy Policy
                  </a>{" "}
                  and{" "}
                  <a
                    href="https://policies.google.com/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-stone-600"
                  >
                    Terms of Service
                  </a>{" "}
                  apply.
                </p>
              </div>

              {errorMessage && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded p-2.5">
                  {errorMessage}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleStartSurvey}
                  disabled={!ageConfirmed}
                  className={`w-full py-3 text-sm font-semibold rounded-md shadow-sm transition-all ${
                    ageConfirmed
                      ? "bg-stone-900 text-white hover:bg-stone-800 cursor-pointer active:scale-[0.99]"
                      : "bg-stone-200 text-stone-400 cursor-not-allowed"
                  }`}
                >
                  Begin Survey →
                </button>
              </div>
            </div>
          </section>
        )}

        {/* STAGE 2: Section-by-Section Questionnaire */}
        {stage === "survey" && currentSection && (
          <div className="space-y-4">
            {/* Sticky Compact Header for Mobile */}
            <div className="sticky top-0 z-30 bg-[#fcfbf9]/95 backdrop-blur-md py-2 border-b border-stone-200">
              <div className="flex justify-between items-center text-[11px] font-mono text-stone-600 mb-1">
                <span className="font-semibold text-stone-800">
                  Part {currentSectionIndex + 1} of {sections.length}: {currentSection.title.replace(/^\d+\.\s*/, "").split("(")[0]}
                </span>
                <span>
                  {answeredCount}/{questions.length} ({progressPercent}%)
                </span>
              </div>
              <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-stone-900 h-1.5 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>

            {/* Current Section Card */}
            <div className="paper-card rounded-lg p-4 sm:p-6 border border-stone-200 space-y-4">
              <div className="border-b border-stone-200 pb-2.5">
                <h2 className="serif-title text-base sm:text-lg font-bold text-stone-900">
                  {currentSection.title}
                </h2>
                {currentSection.description && (
                  <p className="text-xs text-stone-500 mt-0.5">{currentSection.description}</p>
                )}
                {currentSection.prompt && (
                  <div className="mt-2 bg-stone-50 p-2.5 rounded text-xs font-medium text-stone-800 italic border-l-2 border-stone-400 leading-relaxed">
                    {currentSection.prompt}
                  </div>
                )}
              </div>

              {/* Questions List for Current Section */}
              <div className="space-y-3.5">
                {currentSectionQuestions.map((q, idx) => {
                  const isAnswered = answers[q.id] !== undefined;
                  const selectedVal = answers[q.id];

                  return (
                    <fieldset
                      key={q.id}
                      id={`q-${q.id}`}
                      className={`p-3 sm:p-4 rounded-md transition-all ${
                        isAnswered ? "bg-white border-stone-300" : "bg-stone-50/70 border-stone-200"
                      } border`}
                    >
                      <legend className="text-xs sm:text-sm font-medium text-stone-900 mb-2 float-none w-full leading-snug">
                        <span className="font-mono text-[10px] sm:text-xs text-stone-400 mr-1.5">
                          #{q.order}
                        </span>
                        {q.text}
                        {q.required && (
                          <span className="text-rose-500 ml-1" title="Required">
                            *
                          </span>
                        )}
                      </legend>

                      {/* Compact Likert Number Track for 1-7 or 1-5 scales */}
                      {q.scaleMin && q.scaleMax ? (
                        <div className="space-y-1.5">
                          {/* Horizontal Rating Bar with Thumb-Friendly Tap Targets */}
                          <div
                            className={`grid ${
                              q.scaleMax === 7 ? "grid-cols-7 gap-1 sm:gap-1.5" : "grid-cols-5 gap-1.5 sm:gap-2"
                            }`}
                          >
                            {q.options.map((opt) => {
                              const selected = selectedVal === opt.value;
                              return (
                                <button
                                  type="button"
                                  key={opt.value}
                                  onClick={() => handleAnswerChange(q.id, opt.value)}
                                  className={`h-10 sm:h-11 rounded flex items-center justify-center font-mono text-xs sm:text-sm transition-all cursor-pointer select-none active:scale-95 ${
                                    selected
                                      ? "bg-stone-900 text-white font-bold shadow-sm ring-2 ring-stone-900"
                                      : "bg-white text-stone-700 border border-stone-300 hover:border-stone-500 hover:bg-stone-50"
                                  }`}
                                >
                                  {opt.value}
                                </button>
                              );
                            })}
                          </div>

                          {/* Endpoint Labels & Feedback below track */}
                          <div className="flex justify-between items-center text-[10px] text-stone-500 pt-0.5 px-0.5">
                            <span className="truncate max-w-[45%]">
                              1: {q.options[0]?.label.replace(/^\d+\s*-\s*/, "")}
                            </span>
                            {selectedVal ? (
                              <span className="font-semibold text-stone-900 text-[11px] truncate px-1">
                                {q.options.find((o) => o.value === selectedVal)?.label.replace(/^\d+\s*-\s*/, "")}
                              </span>
                            ) : (
                              <span className="text-stone-300">•</span>
                            )}
                            <span className="truncate max-w-[45%] text-right">
                              {q.scaleMax}: {q.options[q.options.length - 1]?.label.replace(/^\d+\s*-\s*/, "")}
                            </span>
                          </div>
                        </div>
                      ) : q.id === "demo_age" ? (
                        /* Age: Compact 5-column Pill Grid */
                        <div className="grid grid-cols-5 gap-1.5">
                          {q.options.map((opt) => {
                            const selected = selectedVal === opt.value;
                            return (
                              <button
                                type="button"
                                key={opt.value}
                                onClick={() => handleAnswerChange(q.id, opt.value)}
                                className={`h-9 sm:h-10 rounded text-xs transition-all font-medium select-none cursor-pointer ${
                                  selected
                                    ? "bg-stone-900 text-white font-bold shadow-sm"
                                    : "bg-white text-stone-800 border border-stone-300 hover:border-stone-500"
                                }`}
                              >
                                {opt.value}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        /* Other Demographics: Compact 2-column or list Options */
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {q.options.map((opt) => {
                            const selected = selectedVal === opt.value;
                            return (
                              <button
                                type="button"
                                key={opt.value}
                                onClick={() => handleAnswerChange(q.id, opt.value)}
                                className={`text-left p-2.5 rounded text-xs transition-all font-medium flex items-center justify-between border cursor-pointer select-none ${
                                  selected
                                    ? "bg-stone-900 text-white border-stone-900 shadow-sm"
                                    : "bg-white text-stone-800 border-stone-300 hover:border-stone-500 hover:bg-stone-50"
                                }`}
                              >
                                <span>{opt.label}</span>
                                {selected && <span className="font-mono text-xs">✓</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </fieldset>
                  );
                })}
              </div>
            </div>

            {errorMessage && (
              <div className="bg-rose-50 border border-rose-300 text-rose-800 text-xs rounded p-3">
                <strong>Notice:</strong> {errorMessage}
              </div>
            )}

            {/* Bottom Navigation Buttons (Always visible and thumb-friendly) */}
            <div className="flex items-center justify-between gap-3 pt-2 pb-6">
              {currentSectionIndex > 0 ? (
                <button
                  type="button"
                  onClick={handlePrevSection}
                  className="px-4 py-2.5 border border-stone-300 rounded text-xs font-semibold text-stone-700 bg-white hover:bg-stone-50 active:scale-95 transition cursor-pointer"
                >
                  ← Back
                </button>
              ) : (
                <div></div>
              )}

              {currentSectionIndex < sections.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNextSection}
                  className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded text-xs font-semibold shadow transition active:scale-95 cursor-pointer ml-auto"
                >
                  Continue to Part {currentSectionIndex + 2} →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className={`px-6 py-2.5 rounded text-xs font-semibold shadow transition active:scale-95 cursor-pointer ml-auto ${
                    isSubmitting
                      ? "bg-stone-400 text-white cursor-wait"
                      : "bg-emerald-800 hover:bg-emerald-700 text-white"
                  }`}
                >
                  {isSubmitting ? "Transmitting..." : "Submit Survey ✓"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* STAGE 3: Completion Modal */}
        {stage === "success" && (
          <section className="paper-card rounded-lg p-6 sm:p-10 text-center border border-stone-300 space-y-4 my-6">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              ✓
            </div>

            <div className="space-y-1">
              <h2 className="serif-title text-xl sm:text-2xl font-bold text-stone-900">
                Response Recorded Successfully
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
                Thank you for contributing to this academic study on human–AI relational dynamics.
                Your data has been safely recorded under zero-knowledge privacy.
              </p>
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded p-3 max-w-xs mx-auto text-xs font-mono text-stone-700">
              <span className="text-stone-400 block text-[9px] uppercase tracking-wider">
                Confirmation Reference
              </span>
              <span className="text-sm font-bold text-stone-900 mt-0.5 block tracking-wider">
                {completionCode}
              </span>
            </div>

            <p className="text-[11px] text-stone-400">
              You may now safely close this browser window or tab.
            </p>
          </section>
        )}
      </div>

      {/* Academic Footer */}
      <footer className="pt-4 border-t border-stone-200 text-center text-[10px] text-stone-400">
        IIT Academic Survey Platform · Zero-Knowledge Privacy Architecture
      </footer>
    </div>
  );
}
