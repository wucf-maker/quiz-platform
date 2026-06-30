// 排查：看 DB 裡 questions 實際存的 options / imageUrl

// 簡易 .env 載入
import fs from "fs";
import path from "path";
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) { throw new Error("DATABASE_URL not set"); }

const sql = postgres(url);

// 看 picture_choice 題目的 options
console.log("\n=== picture_choice questions ===");
const pc = await sql`
  SELECT id, "questionText", options
  FROM questions
  WHERE "questionType" = 'picture_choice'
  LIMIT 5
`;
for (const q of pc) {
  console.log(`\n[${q.id}] ${q.questionText}`);
  console.log("  options:", JSON.stringify(q.options, null, 2).slice(0, 500));
}

// 看 matching 題目的 options
console.log("\n=== matching questions ===");
const mt = await sql`
  SELECT id, "questionText", options
  FROM questions
  WHERE "questionType" = 'matching'
  LIMIT 5
`;
for (const q of mt) {
  console.log(`\n[${q.id}] ${q.questionText}`);
  console.log("  options:", JSON.stringify(q.options, null, 2).slice(0, 500));
}

// 看題目圖片
console.log("\n=== questions with image ===");
const qi = await sql`
  SELECT id, "questionText", "questionImageUrl", "questionImageKey"
  FROM questions
  WHERE "questionImageKey" IS NOT NULL OR "questionImageUrl" IS NOT NULL
  LIMIT 5
`;
for (const q of qi) {
  console.log(`\n[${q.id}] ${q.questionText}`);
  console.log("  image_url:", q.questionImageUrl);
  console.log("  image_key:", q.questionImageKey);
}

await sql.end();