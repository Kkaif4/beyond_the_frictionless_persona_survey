import { NextRequest, NextResponse } from "next/server";
import { getCollections } from "@/lib/mongodb";
import { isValidAdminToken } from "@/lib/security";

export const dynamic = "force-dynamic";

export interface ScoredSubmission {
  responseId: string;
  submittedAt: string;
  answers: Record<string, any>;
  anonymizedHashSnippet?: string;
  isFailedCheck: boolean;
  scores: {
    aicds: number;
    maxAicds: number;
    isHighDependence: boolean;
    validation: number;
    maxValidation: number;
    isHighValidation: boolean;
    avoidance: number;
    maxAvoidance: number;
    isHighAvoidance: boolean;
    collab: number;
    maxCollab: number;
    isLowCollab: boolean;
  };
  profileBadge: "HIGH_TARGET_MATCH" | "MODERATE_MATCH" | "BASELINE_LOW_MATCH" | "INVALID";
  profileLabel: string;
  profileColor: "red" | "yellow" | "green" | "gray";
}

function scoreSubmission(record: any): ScoredSubmission {
  const answers = record.answers || {};

  // 1. Attention Check Filter (Flag if failed)
  const isFailedCheck =
    answers.attention_check !== undefined &&
    answers.attention_check !== 4 &&
    answers.attention_check !== "pass";

  // 2. AICDS (Dependence) Score: Sum 8 questions (Max 56). Threshold: Score >= 35 is High Dependence
  const aicdsItems = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => Number(answers[`aicds_${i}`]) || 0);
  const aicdsScore = aicdsItems.reduce((a, b) => a + b, 0);
  const isHighDependence = aicdsScore >= 35;

  // 3. Validation Score: Sum 4 MSPSS items (Max 28). Threshold: Score >= 18 is High Validation
  const mspssItems = [1, 2, 3, 4].map((i) => Number(answers[`mspss_${i}`]) || 0);
  const validationScore = mspssItems.reduce((a, b) => a + b, 0);
  const isHighValidation = validationScore >= 18;

  // 4. DUTCH Avoidance Score: Sum 4 avoidance items (Max 20). Threshold: Score >= 14 is High Avoidance
  const avoidanceItems = [1, 2, 3, 4].map((i) => Number(answers[`dutch_${i}`]) || 0);
  const avoidanceScore = avoidanceItems.reduce((a, b) => a + b, 0);
  const isHighAvoidance = avoidanceScore >= 14;

  // 5. DUTCH Problem-Solving Score: Sum 4 collaboration items (Max 20). Threshold: Score <= 10 is Low Collaboration
  const collabItems = [5, 6, 7, 8].map((i) => Number(answers[`dutch_${i}`]) || 0);
  const collabScore = collabItems.reduce((a, b) => a + b, 0);
  const isLowCollab = collabScore <= 10;

  // 6. Hypothesis Profiling:
  // 🔴 High Target Match: (High Dependence AND High Avoidance)
  // 🟡 Moderate Match: (High Dependence OR High Avoidance, but not both)
  // 🟢 Baseline / Low Match: (Low Dependence AND Low Avoidance)
  let profileBadge: ScoredSubmission["profileBadge"] = "BASELINE_LOW_MATCH";
  let profileLabel = "Baseline / Low Match";
  let profileColor: ScoredSubmission["profileColor"] = "green";

  if (isFailedCheck) {
    profileBadge = "INVALID";
    profileLabel = "Invalid / Failed Check";
    profileColor = "gray";
  } else if (isHighDependence && isHighAvoidance) {
    profileBadge = "HIGH_TARGET_MATCH";
    profileLabel = "High Target Match";
    profileColor = "red";
  } else if (isHighDependence || isHighAvoidance) {
    profileBadge = "MODERATE_MATCH";
    profileLabel = "Moderate Match";
    profileColor = "yellow";
  }

  return {
    responseId: record.responseId || "RES-ANON",
    submittedAt: record.submittedAt ? new Date(record.submittedAt).toISOString() : "",
    answers,
    anonymizedHashSnippet: record.anonymizedHashSnippet || record.ipHashPreview || "••••••••",
    isFailedCheck,
    scores: {
      aicds: aicdsScore,
      maxAicds: 56,
      isHighDependence,
      validation: validationScore,
      maxValidation: 28,
      isHighValidation,
      avoidance: avoidanceScore,
      maxAvoidance: 20,
      isHighAvoidance,
      collab: collabScore,
      maxCollab: 20,
      isLowCollab,
    },
    profileBadge,
    profileLabel,
    profileColor,
  };
}

export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get("admin_session")?.value;
  const authHeader = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const tokenQuery = req.nextUrl.searchParams.get("token");

  const providedToken = authHeader || sessionCookie || tokenQuery;

  if (!isValidAdminToken(providedToken)) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { responses: responsesCol } = await getCollections();
    const rawDocs = await responsesCol.find({}).sort({ submittedAt: -1 }).toArray();

    const scoredSubmissions = rawDocs.map(scoreSubmission);
    const validSubmissions = scoredSubmissions.filter((s) => !s.isFailedCheck);

    const totalValid = validSubmissions.length;
    const highTargetMatchCount = validSubmissions.filter(
      (s) => s.profileBadge === "HIGH_TARGET_MATCH"
    ).length;
    const moderateMatchCount = validSubmissions.filter(
      (s) => s.profileBadge === "MODERATE_MATCH"
    ).length;
    const baselineMatchCount = validSubmissions.filter(
      (s) => s.profileBadge === "BASELINE_LOW_MATCH"
    ).length;

    const highTargetPercent =
      totalValid > 0 ? Number(((highTargetMatchCount / totalValid) * 100).toFixed(1)) : 0;
    const moderatePercent =
      totalValid > 0 ? Number(((moderateMatchCount / totalValid) * 100).toFixed(1)) : 0;
    const baselinePercent =
      totalValid > 0 ? Number(((baselineMatchCount / totalValid) * 100).toFixed(1)) : 0;

    const totalAicds = validSubmissions.reduce((acc, s) => acc + s.scores.aicds, 0);
    const avgAicds = totalValid > 0 ? Number((totalAicds / totalValid).toFixed(1)) : 0;

    const totalAvoidance = validSubmissions.reduce((acc, s) => acc + s.scores.avoidance, 0);
    const avgAvoidance = totalValid > 0 ? Number((totalAvoidance / totalValid).toFixed(1)) : 0;

    const totalCollab = validSubmissions.reduce((acc, s) => acc + s.scores.collab, 0);
    const avgCollab = totalValid > 0 ? Number((totalCollab / totalValid).toFixed(1)) : 0;

    return NextResponse.json({
      success: true,
      summary: {
        totalSubmissions: scoredSubmissions.length,
        totalValidSubmissions: totalValid,
        failedCheckCount: scoredSubmissions.length - totalValid,
        highTargetMatchCount,
        highTargetMatchPercent: highTargetPercent,
        moderateMatchCount,
        moderateMatchPercent: moderatePercent,
        baselineMatchCount,
        baselineMatchPercent: baselinePercent,
        averageAicds: avgAicds,
        averageAvoidance: avgAvoidance,
        averageCollab: avgCollab,
      },
      submissions: scoredSubmissions,
    });
  } catch (error: any) {
    console.error("Admin metrics load error:", error);
    return NextResponse.json(
      {
        success: false,
        error: `Database connection error: ${error?.message || "Unable to reach MongoDB cluster."}`,
      },
      { status: 500 }
    );
  }
}
