import { NextResponse } from "next/server";
import { getCollections } from "@/lib/mongodb";
import { standardQuestions, surveySections } from "@/lib/questions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { questions: questionsCol } = await getCollections();
    const count = await questionsCol.countDocuments();

    if (count === 0) {
      // Auto-seed questions collection if empty
      await questionsCol.insertMany(standardQuestions.map((q) => ({ ...q })));
    }

    const docs = await questionsCol.find({}).sort({ order: 1 }).toArray();

    // Map out Mongo internal _id for clean API response
    const questions = docs.map(({ _id, ...rest }) => rest);

    return NextResponse.json({
      success: true,
      sections: surveySections,
      questions: questions.length > 0 ? questions : standardQuestions,
    });
  } catch (error) {
    console.error("Error loading questions from MongoDB, using fallback:", error);
    return NextResponse.json({
      success: true,
      sections: surveySections,
      questions: standardQuestions,
      fallback: true,
    });
  }
}
