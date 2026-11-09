import { NextRequest, NextResponse } from "next/server";
import { getCollections } from "@/lib/mongodb";
import { isValidAdminToken } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Check auth via cookie, header, or query param
  const sessionCookie = req.cookies.get("admin_session")?.value;
  const authHeader = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const tokenQuery = req.nextUrl.searchParams.get("token");

  const providedToken = authHeader || sessionCookie || tokenQuery;

  if (!isValidAdminToken(providedToken)) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { responses: responsesCol } = await getCollections();
    const totalCount = await responsesCol.countDocuments();
    const latestDocs = await responsesCol.find({}).sort({ submittedAt: -1 }).limit(25).toArray();

    return NextResponse.json({
      success: true,
      totalCount,
      latestTimestamp: latestDocs.length > 0 ? latestDocs[0].submittedAt : null,
      recentSubmissions: latestDocs.map(({ _id, ...rest }) => rest),
    });
  } catch (error: any) {
    console.error("Metrics load error:", error);
    return NextResponse.json(
      {
        success: false,
        error: `Database connection error: ${error?.message || "Unable to reach MongoDB cluster."}`,
      },
      { status: 500 }
    );
  }
}
