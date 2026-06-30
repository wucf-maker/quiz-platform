// Quick DB schema inspector — used for deployment verification only.
// Reads DATABASE_URL from env, NEVER hardcode credentials.

// 簡易 .env 載入（避免需要 dotenv 套件）
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
    // 去引號
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = postgres(url);

try {
  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;
  console.log("\nTables:", tables.map((t) => t.table_name).join(", "));

  const enums = await sql`
    SELECT t.typname as name,
           ARRAY(SELECT e.enumlabel FROM pg_enum e WHERE e.enumtypid = t.oid ORDER BY e.enumsortorder) as labels
    FROM pg_type t
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typtype = 'e' AND n.nspname = 'public'
  `;
  console.log("\nEnums:");
  for (const e of enums) {
    console.log(`  ${e.name}: [${e.labels.join(", ")}]`);
  }

  const counts = await sql`
    SELECT
      (SELECT count(*) FROM users) as users,
      (SELECT count(*) FROM assessments) as assessments,
      (SELECT count(*) FROM questions) as questions,
      (SELECT count(*) FROM student_submissions) as submissions,
      (SELECT count(*) FROM classes) as classes
  `;
  console.log("\nRow counts:", counts[0]);
} finally {
  await sql.end();
}