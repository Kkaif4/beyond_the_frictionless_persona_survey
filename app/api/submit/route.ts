import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getCollections } from "@/lib/mongodb";
import { hashIntegrity, verifyRecaptchaToken } from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { answers, fingerprint, recaptchaToken, turnstileToken } = body;
    const token = recaptchaToken || turnstileToken;

    if (!answers || typeof answers !== "object") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid answers payload." },
        { status: 400 }
      );
    }

    // 1. Client IP Extraction
    const forwarded = req.headers.get("x-forwarded-for");
    const cfIp = req.headers.get("cf-connecting-ip");
    const realIp = req.headers.get("x-real-ip");
    const clientIp = (cfIp || (forwarded ? forwarded.split(",")[0] : realIp) || "127.0.0.1").trim();

    // 2. Google reCAPTCHA v3 Verification
    const recaptchaResult = await verifyRecaptchaToken(token, clientIp);
    if (!recaptchaResult.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            recaptchaResult.error ||
            "Security verification failed. Please complete the reCAPTCHA check and try again.",
        },
        { status: 403 }
      );
    }

    // 3. Demographic & Inclusion Screening Check
    const ageValue = answers["demo_age"];
    if (ageValue === "Under 18" || ageValue === "Over 25") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Inclusion Criteria Notice: This academic study specifically investigates emerging adults aged 18 to 25. Thank you for your interest.",
        },
        { status: 422 }
      );
    }

    // 4. Anti-Duplication Integrity Check (SHA-256 Hashed IP + Fingerprint)
    const integrityHash = hashIntegrity(clientIp, fingerprint || "browser_client");
    const { integrity: integrityCol, responses: responsesCol } = await getCollections();

    // Ensure unique index exists on integrity collection
    try {
      await integrityCol.createIndex({ hash: 1 }, { unique: true });
    } catch {
      // index might already exist
    }

    const existingSubmission = await integrityCol.findOne({ hash: integrityHash });
    if (existingSubmission) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Duplicate Submission: Our verification system indicates a response has already been submitted from this device or network. In accordance with data integrity guidelines, each participant may only submit once.",
        },
        { status: 429 }
      );
    }

    // 5. Atomic record creation
    const now = new Date();
    await integrityCol.insertOne({
      hash: integrityHash,
      createdAt: now,
    });

    const responseId = `RES-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    // Store strictly anonymized answers without raw PII
    await responsesCol.insertOne({
      responseId,
      answers,
      submittedAt: now,
      anonymizedHashSnippet: integrityHash.substring(0, 8),
      recaptchaScore: recaptchaResult.score ?? 1.0,
    });

    return NextResponse.json({
      success: true,
      responseId,
      message: "Survey response recorded successfully.",
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      // Mongo unique constraint collision on integrity hash
      return NextResponse.json(
        {
          success: false,
          error:
            "Duplicate Submission: A response from this device or network has already been received.",
        },
        { status: 429 }
      );
    }

    console.error("Survey submission server error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An internal server error occurred while recording your response. Please try again.",
      },
      { status: 500 }
    );
  }
}
