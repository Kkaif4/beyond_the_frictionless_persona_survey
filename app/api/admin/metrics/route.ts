import { NextRequest, NextResponse } from "next/server";
import { getCollections } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  // Simple cookie/auth check
  const sessionCookie = req.cookies.get("admin_session")?.value;
  const authHeader = req.headers.get("authorization");
  const isAuthenticated = sessionCookie === "authenticated" || authHeader === `Bearer ${process.env.ADMIN_PASSWORD}`;

  if (!isAuthenticated && process.env.NODE_ENV === "production") {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { responses: responsesCol } = await getCollections();
    const totalCount = await responsesCol.countDocuments();
    const latestDocs = await responsesCol.find({}).sort({ submittedAt: -1 }).limit(20).toArray();

    return NextResponse.json({
      success: true,
      totalCount,
      latestTimestamp: latestDocs.length > 0 ? latestDocs[0].submittedAt : null,
      recentSubmissions: latestDocs.map(({ _id, ...rest }) => rest),
    });
  } catch (error) {
    console.error("Metrics load error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to retrieve metrics." },
      { status: 500 }
    );
  }
}
