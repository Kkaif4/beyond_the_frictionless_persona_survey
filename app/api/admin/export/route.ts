import { NextRequest, NextResponse } from "next/server";
import { getCollections } from "@/lib/mongodb";

function escapeCsvValue(val: any): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: NextRequest) {
  try {
    const { responses: responsesCol } = await getCollections();
    const responses = await responsesCol.find({}).sort({ submittedAt: 1 }).toArray();

    // Standardized Column Headers for SPSS / R
    const questionKeys = [
      "demo_age",
      "demo_freq",
      "demo_rel",
      "demo_hours",
      "aicds_1",
      "aicds_2",
      "aicds_3",
      "aicds_4",
      "aicds_5",
      "aicds_6",
      "aicds_7",
      "aicds_8",
      "mspss_1",
      "mspss_2",
      "mspss_3",
      "mspss_4",
      "dutch_1",
      "dutch_2",
      "dutch_3",
      "dutch_4",
      "dutch_5",
      "dutch_6",
      "dutch_7",
      "dutch_8",
    ];

    const headers = ["Response_ID", "Submitted_At_UTC", ...questionKeys];
    const csvRows: string[] = [headers.join(",")];

    for (const record of responses) {
      const answers = record.answers || {};
      const row = [
        escapeCsvValue(record.responseId || ""),
        escapeCsvValue(record.submittedAt ? new Date(record.submittedAt).toISOString() : ""),
        ...questionKeys.map((key) => escapeCsvValue(answers[key] ?? "")),
      ];
      csvRows.push(row.join(","));
    }

    const csvContent = csvRows.join("\r\n");

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="iit_research_survey_export_${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    console.error("CSV Export failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate CSV export." },
      { status: 500 }
    );
  }
}
