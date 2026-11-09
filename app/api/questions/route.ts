import { NextResponse } from "next/server";
import { getCollections } from "@/lib/mongodb";
import { standardQuestions, surveySections } from "@/lib/questions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { questions: questionsCol, sections: sectionsCol } = await getCollections();

    // 1. Fetch sections from MongoDB
    const sectionDocs = await sectionsCol.find({}).sort({ order: 1 }).toArray();
    const sections =
      sectionDocs.length > 0
        ? sectionDocs.map(({ _id, ...rest }) => rest)
        : surveySections;

    // 2. Fetch questions from MongoDB
    const questionDocs = await questionsCol.find({}).sort({ order: 1 }).toArray();
    const questions =
      questionDocs.length > 0
        ? questionDocs.map(({ _id, ...rest }) => rest)
        : standardQuestions;

    return NextResponse.json({
      success: true,
      source: questionDocs.length > 0 ? "mongodb" : "fallback",
      sections,
      questions,
    });
  } catch (error) {
    console.error("Error loading questions from MongoDB, using fallback:", error);
    return NextResponse.json({
      success: true,
      source: "fallback",
      sections: surveySections,
      questions: standardQuestions,
    });
  }
}
