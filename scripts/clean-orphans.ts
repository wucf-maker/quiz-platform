// 列出壞測驗（無題目、無提交），不刪除
import postgres from "postgres";
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

const url = process.env.DATABASE_URL;
if (!url) { throw new Error("DATABASE_URL not set"); }

const sql = postgres(url);

console.log("=== 所有測驗 ===");
const all = await sql`SELECT id, title, "createdAt" FROM assessments ORDER BY id`;
for (const a of all) {
  console.log(`  [${a.id}] ${a.title}`);
}

console.log("\n=== 壞測驗（無題目、無提交）===");
const orphans = await sql`
  SELECT a.id, a.title
  FROM assessments a
  WHERE NOT EXISTS (SELECT 1 FROM questions q WHERE q."assessmentId" = a.id)
    AND NOT EXISTS (SELECT 1 FROM student_submissions s WHERE s."assessmentId" = a.id)
`;

if (orphans.length === 0) {
  console.log("  ✅ 沒有壞測驗");
} else {
  for (const o of orphans) {
    console.log(`  [${o.id}] ${o.title}`);
  }
  console.log(`\n要刪除這些壞測驗，告訴我編號，我寫 SQL 刪`);
  console.log(`或你也可以在 TeacherDashboard UI 直接刪除`);
}

await sql.end();