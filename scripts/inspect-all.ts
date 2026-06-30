// 排查：看 DB 裡 questions 實際存的完整 options

import fs from "fs";
import path from "path";
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
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

// 看所有題目完整資料
console.log("\n=== ALL questions ===");
const all = await sql`
  SELECT id, "questionText", "questionType", options, "questionImageUrl", "questionImageKey", "correctAnswer"
  FROM questions
  ORDER BY id
`;
for (const q of all) {
  console.log(`\n[${q.id}] type=${q.questionType} "${q.questionText}"`);
  console.log("  options:", JSON.stringify(q.options, null, 2));
  console.log("  imageUrl:", q.questionImageUrl);
  console.log("  imageKey:", q.questionImageKey);
  console.log("  correctAnswer:", JSON.stringify(q.correctAnswer, null, 2));
}

// 看 file 系統有什麼檔案
console.log("\n=== uploads dir ===");
import { readdirSync, statSync } from "fs";
function walk(dir: string, depth = 0): void {
  if (depth > 3) return;
  try {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        console.log(`  ${"  ".repeat(depth)}📁 ${entry}/`);
        walk(full, depth + 1);
      } else {
        console.log(`  ${"  ".repeat(depth)}📄 ${entry} (${st.size} bytes)`);
      }
    }
  } catch (e: any) {
    console.log(`  (cannot read ${dir}: ${e.message})`);
  }
}
walk("./uploads");

await sql.end();