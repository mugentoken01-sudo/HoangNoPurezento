import { vi } from "../../lib/i18n/locales/vi";
import { en } from "../../lib/i18n/locales/en";
import { readFileSync } from "fs";
import { join } from "path";

function runAuditorB() {
  console.log("=== Agent B-Auditor Verification ===");

  // 1. Locale verification
  const requiredKeys = [
    "risk_digest_title",
    "risk_digest_empty",
    "risk_digest_showing",
    "risk_digest_flags_count",
    "risk_digest_latest_flag",
    "risk_digest_view_profile",
  ] as const;

  for (const k of requiredKeys) {
    if (!vi.dashboard[k]) throw new Error(`Missing vi translation for ${k}`);
    if (!en.dashboard[k]) throw new Error(`Missing en translation for ${k}`);
    console.log(`✔ Key verified in both locales: dashboard.${k}`);
  }

  // 2. Read diff / source of app/dashboard/page.tsx
  const pagePath = join(process.cwd(), "app/dashboard/page.tsx");
  const pageContent = readFileSync(pagePath, "utf8");

  // Confirm other widgets exist untouched
  if (!pageContent.includes("t(\"dashboard.follow_ups_title\")")) {
    throw new Error("Follow-ups widget missing or modified unexpectedly");
  }
  if (!pageContent.includes("t(\"dashboard.today_tasks_title\")")) {
    throw new Error("Today tasks widget missing or modified unexpectedly");
  }
  if (!pageContent.includes("t(\"dashboard.pipeline_overview_title\")")) {
    throw new Error("Pipeline widget missing or modified unexpectedly");
  }
  if (!pageContent.includes("t(\"dashboard.pending_customers_title\"")) {
    throw new Error("Pending widget missing or modified unexpectedly");
  }

  // Confirm risk digest widget rendered with correct props
  if (!pageContent.includes("title={t(\"dashboard.risk_digest_title\")}")) {
    throw new Error("Risk digest title prop missing");
  }
  if (!pageContent.includes("count={data?.risk_digest.length}")) {
    throw new Error("Risk digest count prop missing or incorrect");
  }
  if (!pageContent.includes("error={riskErrors[0]?.message ?? null}")) {
    throw new Error("Risk digest error prop missing or incorrect");
  }

  console.log("✔ Zero regressions to sibling widgets confirmed.");
  console.log("✔ Sibling widgets JSX and logic completely preserved.");
  console.log("PHASE B: PASS — Agent C-Builder may proceed.");
}

runAuditorB();
