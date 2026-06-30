// 自動清理 DB 裡 options 不完整的測驗
// 條件：picture_choice 的 options 沒有任何一個有 imageKey → 刪除
//       matching 的 options 沒有任何一個有 left 或 right → 刪除

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

const dryRun = !process.argv.includes("--apply");

console.log(`\n=== 模式: ${dryRun ? "DRY RUN（不實際刪除）" : "APPLY（真的刪除）"} ===\n`);

// 找 picture_choice 沒有任何 imageKey 的題目
const pcBroken = await sql`
  SELECT id, "questionText", options
  FROM questions
  WHERE "questionType" = 'picture_choice'
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(options) elem
      WHERE elem->>'imageKey' IS NOT NULL
    )
`;
console.log(`📷 picture_choice 沒有任何 imageKey 的題目：${pcBroken.length}`);
for (const q of pcBroken) {
  console.log(`  [${q.id}] "${q.questionText}"`);
}

// 找 matching 沒有任何 left 或 right 的題目
const mtBroken = await sql`
  SELECT id, "questionText", options
  FROM questions
  WHERE "questionType" = 'matching'
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(options) elem
      WHERE elem->>'left' IS NOT NULL AND elem->>'right' IS NOT NULL
        AND (elem->>'left' <> '' OR elem->>'right' <> '')
    )
`;
console.log(`\n🔗 matching 沒有任何 left/right 的題目：${mtBroken.length}`);
for (const q of mtBroken) {
  console.log(`  [${q.id}] "${q.questionText}"`);
}

const allBrokenIds = [...pcBroken, ...mtBroken].map((q) => q.id);
if (allBrokenIds.length === 0) {
  console.log("\n✅ 沒有壞測驗");
  await sql.end();
  process.exit(0);
}

// 找出這些題目所屬的測驗
const affectedAssessments = await sql`
  SELECT DISTINCT "assessmentId"
  FROM questions
  WHERE id = ANY(${allBrokenIds})
`;
console.log(`\n受影響的測驗：${affectedAssessments.length} 個`);

// 列出測驗是否只有這些壞題目（如果是空殼測驗，整個刪除）
const emptyAssessments: number[] = [];
for (const a of affectedAssessments) {
  const countRes = await sql`
    SELECT COUNT(*)::int as total,
           COUNT(*) FILTER (WHERE id = ANY(${allBrokenIds}))::int as broken
    FROM questions
    WHERE "assessmentId" = ${a.assessmentId}
  `;
  const r = countRes[0];
  if (r.total === r.broken) {
    emptyAssessments.push(a.assessmentId);
    const aInfo = await sql`SELECT id, title FROM assessments WHERE id = ${a.assessmentId}`;
    console.log(`  測驗 [${aInfo[0].id}] "${aInfo[0].title}" — 所有題目都壞，整個刪除`);
  } else {
    const aInfo = await sql`SELECT id, title FROM assessments WHERE id = ${a.assessmentId}`;
    console.log(`  測驗 [${aInfo[0].id}] "${aInfo[0].title}" — 只刪壞題目，保留其他`);
  }
}

if (dryRun) {
  console.log("\n👉 加上 --apply 參數實際執行刪除");
  console.log("   例如：npx tsx scripts/clean-broken.ts --apply");
} else {
  // 刪除壞題目
  if (allBrokenIds.length > 0) {
    await sql`DELETE FROM student_answers WHERE "questionId" = ANY(${allBrokenIds})`;
    await sql`DELETE FROM questions WHERE id = ANY(${allBrokenIds})`;
    console.log(`\n✅ 已刪除 ${allBrokenIds.length} 個壞題目`);
  }
  // 刪除空殼測驗
  for (const aid of emptyAssessments) {
    await sql`DELETE FROM student_answers WHERE "questionId" IN (SELECT id FROM questions WHERE "assessmentId" = ${aid})`;
    await sql`DELETE FROM student_submissions WHERE "assessmentId" = ${aid}`;
    await sql`DELETE FROM questions WHERE "assessmentId" = ${aid}`;
    await sql`DELETE FROM assessments WHERE id = ${aid}`;
    console.log(`  ✅ 已刪除空殼測驗 [${aid}]`);
  }
}

await sql.end();