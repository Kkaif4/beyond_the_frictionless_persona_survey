import { MongoClient } from "mongodb";
import fs from "fs";

// Simple manual .env parser if not already in process.env
function loadEnv() {
  const envPath = fs.existsSync(".env.local") ? ".env.local" : (fs.existsSync(".env") ? ".env" : null);
  if (envPath) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [key, ...rest] = trimmed.split("=");
      if (key && rest.length > 0) {
        const val = rest.join("=").replace(/^["']|["']$/g, "");
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}
loadEnv();

const uri =
  process.env.DATABASE_URI ||
  "mongodb+srv://Admin:mongodbPASS@auth.rnlfnk4.mongodb.net/iit_research";

const surveySections = [
  {
    id: "demo",
    title: "Part 1: General Background",
    description: "A few basic questions to understand your background and AI usage.",
    order: 1,
  },
  {
    id: "aicds",
    title: "Part 2: Your AI Companion Habits",
    description: "How you interact with conversational AI chatbots in your daily life.",
    order: 2,
  },
  {
    id: "mspss",
    title: "Part 3: Comfort & Emotional Support from AI",
    description: "How supported or understood you feel when chatting with an AI companion.",
    prompt: "Think about the AI chatbot or companion you interact with most frequently when answering these questions:",
    order: 3,
  },
  {
    id: "dutch",
    title: "Part 4: Handling Everyday Disagreements",
    description: "How you typically handle differences of opinion or conflict in real life.",
    prompt: "Think about how you typically handle disagreements or friction with your real-life friends, family, or romantic partners:",
    order: 4,
  },
];

const standardQuestions = [
  // SECTION 1: Demographic & Inclusion (4 items)
  {
    id: "demo_age",
    sectionId: "demo",
    sectionTitle: "Part 1: General Background",
    order: 1,
    text: "What is your current age? (Target age group: 18–25 years)",
    type: "radio",
    required: true,
    options: [
      { value: "Under 18", label: "Under 18" },
      { value: "18", label: "18 years" },
      { value: "19", label: "19 years" },
      { value: "20", label: "20 years" },
      { value: "21", label: "21 years" },
      { value: "22", label: "22 years" },
      { value: "23", label: "23 years" },
      { value: "24", label: "24 years" },
      { value: "25", label: "25 years" },
      { value: "Over 25", label: "Over 25" },
    ],
  },
  {
    id: "demo_freq",
    sectionId: "demo",
    sectionTitle: "Part 1: General Background",
    order: 2,
    text: "How often do you interact with AI chatbots or companions (e.g., ChatGPT, Character.AI, Replika) for conversation or emotional support?",
    type: "radio",
    required: true,
    options: [
      { value: "Never", label: "Never" },
      { value: "Rarely (Monthly)", label: "Rarely (Monthly)" },
      { value: "Occasionally (Weekly)", label: "Occasionally (Weekly)" },
      { value: "Daily", label: "Daily" },
      { value: "Multiple times a day", label: "Multiple times a day" },
    ],
  },
  {
    id: "demo_rel",
    sectionId: "demo",
    sectionTitle: "Part 1: General Background",
    order: 3,
    text: "Which of the following best describes your relationship status?",
    type: "radio",
    required: true,
    options: [
      { value: "Single", label: "Single" },
      { value: "In a committed relationship", label: "In a relationship" },
      { value: "Married", label: "Married" },
      { value: "Other", label: "Other" },
    ],
  },
  {
    id: "demo_hours",
    sectionId: "demo",
    sectionTitle: "Part 1: General Background",
    order: 4,
    text: "On average, how many hours per week do you spend chatting with an AI companion?",
    type: "radio",
    required: true,
    options: [
      { value: "0 hours (Never)", label: "0 hours (Never)" },
      { value: "Less than 1 hour", label: "Less than 1 hour" },
      { value: "1-3 hours", label: "1–3 hours" },
      { value: "4-7 hours", label: "4–7 hours" },
      { value: "8-14 hours", label: "8–14 hours" },
      { value: "15+ hours", label: "15+ hours" },
    ],
  },

  // SECTION 2: AICDS (8 items) - 7-point Likert
  ...[
    "I find myself thinking about my AI companion or chatbot even when I am not interacting with it.",
    "I feel a strong, irresistible urge to interact with my AI chatbot when I am stressed, anxious, or upset.",
    "I have attempted to reduce the amount of time I spend talking to my AI companion but have been unsuccessful.",
    "I feel restless, irritable, or anxious when I am temporarily unable to access my AI companion.",
    "I frequently spend more time interacting with my AI companion than I initially intended to.",
    "I increasingly prefer talking to my AI companion over spending time with my real-life friends, family, or partner.",
    "My reliance on my AI companion has caused friction or problems in my offline human relationships.",
    "I use my AI companion specifically as a way to escape from real-world problems or numb negative emotions.",
  ].map((text, idx) => ({
    id: `aicds_${idx + 1}`,
    sectionId: "aicds",
    sectionTitle: "Part 2: Your AI Companion Habits",
    order: 10 + idx,
    text,
    type: "radio",
    required: true,
    scaleMin: 1,
    scaleMax: 7,
    options: [
      { value: 1, label: "1 - Strongly Disagree" },
      { value: 2, label: "2 - Disagree" },
      { value: 3, label: "3 - Somewhat Disagree" },
      { value: 4, label: "4 - Neutral" },
      { value: 5, label: "5 - Somewhat Agree" },
      { value: 6, label: "6 - Agree" },
      { value: 7, label: "7 - Strongly Agree" },
    ],
  })),

  // SECTION 3: Adapted MSPSS (4 items) - 7-point Likert
  ...[
    "My AI companion is always around when I am in need of emotional support.",
    "I have a safe space to share my deepest joys and sorrows with my AI companion.",
    "My AI companion is a real and highly effective source of comfort to me.",
    "I feel that my AI companion genuinely understands and cares about my feelings.",
  ].map((text, idx) => ({
    id: `mspss_${idx + 1}`,
    sectionId: "mspss",
    sectionTitle: "Part 3: Comfort & Emotional Support from AI",
    sectionPrompt: "Think about the AI chatbot or companion you interact with most frequently when answering these questions:",
    order: 20 + idx,
    text,
    type: "radio",
    required: true,
    scaleMin: 1,
    scaleMax: 7,
    options: [
      { value: 1, label: "1 - Strongly Disagree" },
      { value: 2, label: "2 - Disagree" },
      { value: 3, label: "3 - Somewhat Disagree" },
      { value: 4, label: "4 - Neutral" },
      { value: 5, label: "5 - Somewhat Agree" },
      { value: 6, label: "6 - Agree" },
      { value: 7, label: "7 - Strongly Agree" },
    ],
  })),

  // SECTION 4: DUTCH (8 items) - 5-point Likert
  // Subscale A: Avoiding (items 1-4)
  ...[
    "I actively avoid confrontations about our differences.",
    "I avoid differences of opinion as much as possible.",
    "I try to make our differences loom less severe rather than addressing them directly.",
    "I try to avoid any confrontation with the other person.",
  ].map((text, idx) => ({
    id: `dutch_${idx + 1}`,
    sectionId: "dutch",
    sectionTitle: "Part 4: Handling Everyday Disagreements",
    sectionPrompt: "Think about how you typically handle disagreements or friction with your real-life friends, family, or romantic partners:",
    order: 30 + idx,
    text,
    type: "radio",
    required: true,
    scaleMin: 1,
    scaleMax: 5,
    options: [
      { value: 1, label: "1 - Not at all" },
      { value: 2, label: "2 - Slightly" },
      { value: 3, label: "3 - Moderately" },
      { value: 4, label: "4 - Considerably" },
      { value: 5, label: "5 - Very much" },
    ],
  })),
  // Subscale B: Problem Solving (items 5-8)
  ...[
    "I examine issues deeply until I find a solution that really satisfies me and the other party.",
    "I stand up for my own goals and interests while also actively supporting the other person's goals.",
    "I examine ideas from both sides to find a mutually optimal solution.",
    "I work out a solution that serves my own as well as the other's interests as well as possible.",
  ].map((text, idx) => ({
    id: `dutch_${idx + 5}`,
    sectionId: "dutch",
    sectionTitle: "Part 4: Handling Everyday Disagreements",
    sectionPrompt: "Think about how you typically handle disagreements or friction with your real-life friends, family, or romantic partners:",
    order: 34 + idx,
    text,
    type: "radio",
    required: true,
    scaleMin: 1,
    scaleMax: 5,
    options: [
      { value: 1, label: "1 - Not at all" },
      { value: 2, label: "2 - Slightly" },
      { value: 3, label: "3 - Moderately" },
      { value: 4, label: "4 - Considerably" },
      { value: 5, label: "5 - Very much" },
    ],
  })),
];

async function seedDatabase() {
  console.log("Connecting to MongoDB Atlas...");
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db("iit_research");
    const questionsCol = db.collection("questions_collection");
    const sectionsCol = db.collection("sections_collection");

    console.log("Seeding sections into 'sections_collection'...");
    for (const section of surveySections) {
      await sectionsCol.updateOne(
        { id: section.id },
        { $set: section },
        { upsert: true }
      );
    }
    console.log(`✓ Seeded ${surveySections.length} sections successfully.`);

    console.log("Seeding questions into 'questions_collection'...");
    for (const q of standardQuestions) {
      await questionsCol.updateOne(
        { id: q.id },
        { $set: q },
        { upsert: true }
      );
    }
    console.log(`✓ Seeded ${standardQuestions.length} questions successfully into MongoDB.`);

    // Verify by reading directly from DB
    const totalQuestionsInDb = await questionsCol.countDocuments();
    const totalSectionsInDb = await sectionsCol.countDocuments();
    console.log(`\nVerification:`);
    console.log(`- Questions in DB: ${totalQuestionsInDb}`);
    console.log(`- Sections in DB: ${totalSectionsInDb}`);
    console.log(`MongoDB Database 'iit_research' is now fully seeded!`);
  } catch (error) {
    console.error("Seeding failed with error:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedDatabase();
