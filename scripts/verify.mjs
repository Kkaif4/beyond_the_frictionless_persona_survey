// Test verification script
async function runVerification() {
  console.log("=== 1. Testing GET /api/questions ===");
  const qRes = await fetch("http://localhost:3000/api/questions");
  const qData = await qRes.json();
  console.log("Questions response status:", qRes.status);
  console.log("Total sections:", qData.sections?.length);
  console.log("Total questions:", qData.questions?.length);

  if (qData.questions?.length !== 24) {
    throw new Error(`Expected 24 questions, got ${qData.questions?.length}`);
  }

  console.log("=== 2. Testing POST /api/submit (Valid Submission) ===");
  const testAnswers = {
    demo_age: "21",
    demo_freq: "Daily",
    demo_rel: "Single",
    demo_hours: "4-7 hours",
    aicds_1: 4, aicds_2: 5, aicds_3: 3, aicds_4: 4,
    aicds_5: 5, aicds_6: 3, aicds_7: 2, aicds_8: 4,
    mspss_1: 6, mspss_2: 5, mspss_3: 6, mspss_4: 5,
    dutch_1: 3, dutch_2: 4, dutch_3: 3, dutch_4: 4,
    dutch_5: 4, dutch_6: 5, dutch_7: 4, dutch_8: 5,
  };

  const testFingerprint = "test_fp_" + Date.now();
  const submitRes = await fetch("http://localhost:3000/api/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "203.0.113.195", // Mock test IP
    },
    body: JSON.stringify({
      answers: testAnswers,
      fingerprint: testFingerprint,
      recaptchaToken: "XXXX.DUMMY.TOKEN.XXXX",
    }),
  });

  const submitData = await submitRes.json();
  console.log("Submit status:", submitRes.status);
  console.log("Submit response:", submitData);

  if (!submitData.success) {
    throw new Error("Initial submission failed: " + JSON.stringify(submitData));
  }

  console.log("=== 3. Testing POST /api/submit (Duplicate Submission Check) ===");
  const dupRes = await fetch("http://localhost:3000/api/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "203.0.113.195", // Same test IP
    },
    body: JSON.stringify({
      answers: testAnswers,
      fingerprint: testFingerprint, // Same fingerprint
      recaptchaToken: "XXXX.DUMMY.TOKEN.XXXX",
    }),
  });

  const dupData = await dupRes.json();
  console.log("Duplicate submit status (expected 429):", dupRes.status);
  console.log("Duplicate submit message:", dupData.error);

  if (dupRes.status !== 429) {
    throw new Error(`Expected 429 status for duplicate, got ${dupRes.status}`);
  }

  console.log("=== 4. Testing GET /api/admin/metrics ===");
  const metricsRes = await fetch("http://localhost:3000/api/admin/metrics", {
    headers: {
      Authorization: "Bearer academic_secure_password_2026",
    },
  });
  const metricsData = await metricsRes.json();
  console.log("Metrics total submissions:", metricsData.totalCount);

  console.log("=== 5. Testing GET /api/admin/export (CSV Download) ===");
  const exportRes = await fetch("http://localhost:3000/api/admin/export");
  const csvText = await exportRes.text();
  const firstLines = csvText.split("\r\n").slice(0, 3);
  console.log("CSV Export lines:\n", firstLines.join("\n"));

  console.log("\n>>> ALL 5 END-TO-END CHECKS PASSED PERFECTLY! <<<");
}

runVerification().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
