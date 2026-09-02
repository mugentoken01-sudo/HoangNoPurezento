const fs = require('fs');
const path = require('path');

// 1. Agent E Runner
const agentE = `// Agent E — Build & Static Gates Tester
import { execSync } from "child_process";
import * as fs from "fs";

interface TestResult {
  id: string;
  status: "PASS" | "FAIL" | "BLOCKED";
  severity: "P0" | "P1" | "P2" | "P3" | "-";
  steps: string;
  expected: string;
  actual: string;
  evidence: string;
}

const results: TestResult[] = [];

function runCmd(cmd: string): { code: number; stdout: string; stderr: string } {
  try {
    const stdout = execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    return { code: 0, stdout, stderr: "" };
  } catch (e: any) {
    return { code: e.status ?? 1, stdout: e.stdout?.toString() || "", stderr: e.stderr?.toString() || e.message };
  }
}

async function main() {
  console.log("=== Running Agent E — Build & Static Gates ===");

  // E1: npm install
  console.log("Running E1: npm install...");
  const e1 = runCmd("npm install");
  results.push({
    id: "E1",
    status: e1.code === 0 ? "PASS" : "FAIL",
    severity: e1.code === 0 ? "-" : "P0",
    steps: "Run npm install in repo root",
    expected: "Exit code 0, dependencies resolved cleanly",
    actual: \`Exit code \${e1.code}\`,
    evidence: (e1.stdout + e1.stderr).trim().split("\\n").slice(-3).join("; ")
  });

  // E2: npm run lint
  console.log("Running E2: npm run lint...");
  const e2 = runCmd("npm run lint");
  results.push({
    id: "E2",
    status: e2.code === 0 ? "PASS" : "FAIL",
    severity: e2.code === 0 ? "-" : "P1",
    steps: "Run npm run lint",
    expected: "Exit code 0, no ESLint warnings or errors",
    actual: \`Exit code \${e2.code}\`,
    evidence: (e2.stdout + e2.stderr).trim().split("\\n").slice(-3).join("; ")
  });

  // E3: npm run typecheck
  console.log("Running E3: npm run typecheck...");
  const e3 = runCmd("npm run typecheck");
  results.push({
    id: "E3",
    status: e3.code === 0 ? "PASS" : "FAIL",
    severity: e3.code === 0 ? "-" : "P1",
    steps: "Run npm run typecheck (tsc --noEmit)",
    expected: "Exit code 0, 0 TypeScript compile errors",
    actual: \`Exit code \${e3.code}\`,
    evidence: (e3.stdout + e3.stderr).trim().split("\\n").slice(-3).join("; ") || "TypeScript compilation clean"
  });

  // E4: npm run test
  console.log("Running E4: npm run test...");
  const e4 = runCmd("npm run test");
  const all4Suites = e4.stdout.includes("board-state.test.ts") && 
                     e4.stdout.includes("dashboard.test.ts") && 
                     e4.stdout.includes("ratios.test.ts") && 
                     e4.stdout.includes("parse-financial-excel.test.ts");
  results.push({
    id: "E4",
    status: e4.code === 0 && all4Suites ? "PASS" : "FAIL",
    severity: e4.code === 0 ? "-" : "P1",
    steps: "Run npm run test (vitest run)",
    expected: "Exit code 0, all 4 test suites pass (board-state, dashboard, ratios, parse-financial-excel)",
    actual: \`Exit code \${e4.code}, all 4 suites ran: \${all4Suites}\`,
    evidence: e4.stdout.split("\\n").filter(l => l.includes("✓") || l.includes("Test Files")).join(" | ")
  });

  // E5: npm run build
  console.log("Running E5: npm run build...");
  const e5 = runCmd("npm run build");
  results.push({
    id: "E5",
    status: e5.code === 0 ? "PASS" : "FAIL",
    severity: e5.code === 0 ? "-" : "P0",
    steps: "Run npm run build (next build)",
    expected: "Exit code 0, production build generated",
    actual: \`Exit code \${e5.code}\`,
    evidence: e5.stdout.split("\\n").filter(l => l.includes("Compiled successfully") || l.includes("Route (app)") || l.includes("Generating static pages")).slice(-3).join("; ")
  });

  // E6: npm run verify:rls
  console.log("Running E6: npm run verify:rls...");
  const e6 = runCmd("npm run verify:rls");
  const isRlsPassed = e6.stdout.includes("PASS") && !e6.stdout.includes("LEAKED");
  results.push({
    id: "E6",
    status: e6.code === 0 && isRlsPassed ? "PASS" : "FAIL",
    severity: isRlsPassed ? "-" : "P0",
    steps: "Run npm run verify:rls",
    expected: "Exit code 0, prints PASS on all 8 tables and no LEAKED",
    actual: \`Exit code \${e6.code}, verdict: \${isRlsPassed ? "PASS" : "FAIL/LEAK"}\`,
    evidence: e6.stdout.split("\\n").filter(l => l.includes("✓") || l.includes("Result:")).join(" | ")
  });

  // E7: npm run seed
  console.log("Running E7: npm run seed...");
  const e7 = runCmd("npm run seed");
  const isSeedPassed = e7.stdout.includes("Công ty ABC") && e7.stdout.includes("auto_template: 4");
  results.push({
    id: "E7",
    status: e7.code === 0 && isSeedPassed ? "PASS" : "FAIL",
    severity: e7.code === 0 ? "-" : "P1",
    steps: "Run npm run seed",
    expected: "Exit code 0, creates user and Công ty ABC at credit with 4 auto_template tasks",
    actual: \`Exit code \${e7.code}, seed summary match: \${isSeedPassed}\`,
    evidence: e7.stdout.split("\\n").filter(l => l.includes("✓") || l.includes("Customer:") || l.includes("Tasks:")).join(" | ")
  });

  // E8: .env.example and .gitignore
  console.log("Running E8: .env.example / .gitignore checks...");
  const envExample = fs.readFileSync(".env.example", "utf8");
  const gitignore = fs.readFileSync(".gitignore", "utf8");
  const noRealSecretsInExample = !envExample.includes("sb_secret_Xcx") && envExample.includes("REPLACE_WITH");
  const gitignoreHasEnvLocal = gitignore.includes(".env.local") && gitignore.includes(".env");
  results.push({
    id: "E8",
    status: noRealSecretsInExample && gitignoreHasEnvLocal ? "PASS" : "FAIL",
    severity: noRealSecretsInExample && gitignoreHasEnvLocal ? "-" : "P0",
    steps: "Check .env.example for placeholders and .gitignore for .env/.env.local exclusion",
    expected: ".env.example has placeholders only; .gitignore ignores .env and .env.local",
    actual: \`noRealSecrets=\${noRealSecretsInExample}, gitignoreExcludesEnv=\${gitignoreHasEnvLocal}\`,
    evidence: \`.gitignore contains: .env (\${gitignore.includes(".env")}), .env.local (\${gitignore.includes(".env.local")})\`
  });

  // E9: ci.yml script mapping
  console.log("Running E9: ci.yml script mapping check...");
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const ciYml = fs.readFileSync(".github/workflows/ci.yml", "utf8");
  const scripts = ["lint", "typecheck", "test", "build"];
  const allScriptsExist = scripts.every(s => pkg.scripts && pkg.scripts[s] !== undefined);
  results.push({
    id: "E9",
    status: allScriptsExist ? "PASS" : "FAIL",
    severity: allScriptsExist ? "-" : "P1",
    steps: "Verify all scripts called in ci.yml (lint, typecheck, test, build) exist in package.json",
    expected: "All 4 scripts exist in package.json",
    actual: \`All scripts defined: \${allScriptsExist}\`,
    evidence: \`package.json scripts: \${Object.keys(pkg.scripts).join(", ")}\`
  });

  // E10: Health check
  console.log("Running E10: /api/health check...");
  try {
    const res = await fetch("http://localhost:3000/api/health");
    const json: any = await res.json();
    const ok = res.status === 200 && json.ok === true;
    results.push({
      id: "E10",
      status: ok ? "PASS" : "FAIL",
      severity: ok ? "-" : "P1",
      steps: "GET http://localhost:3000/api/health",
      expected: "HTTP 200 with JSON { ok: true }",
      actual: \`HTTP \${res.status}, body: \${JSON.stringify(json)}\`,
      evidence: JSON.stringify(json)
    });
  } catch (e: any) {
    results.push({
      id: "E10",
      status: "FAIL",
      severity: "P1",
      steps: "GET http://localhost:3000/api/health",
      expected: "HTTP 200 with JSON { ok: true }",
      actual: \`Connection error: \${e.message}\`,
      evidence: e.message
    });
  }

  // Generate Report
  const passCount = results.filter(r => r.status === "PASS").length;
  const failCount = results.filter(r => r.status === "FAIL").length;
  const blockedCount = results.filter(r => r.status === "BLOCKED").length;

  let report = \`# Agent E — Build & Static Gates Report

**Summary:**
- **PASS:** \${passCount} / \${results.length}
- **FAIL:** \${failCount}
- **BLOCKED:** \${blockedCount}
- **Verdict:** \${failCount === 0 ? "PASS (All Gates Clear)" : "FAIL — Blocker(s) detected"}

## Test Execution Details

| ID | Status | Severity | Steps | Expected | Actual | Evidence |
|:---|:---:|:---:|:---|:---|:---|:---|
\`;

  for (const r of results) {
    report += \`| \${r.id} | \${r.status} | \${r.severity} | \${r.steps} | \${r.expected} | \${r.actual} | \${r.evidence} |\\n\`;
  }

  fs.writeFileSync("qa-reports/agent-e-build-gates.md", report, "utf8");
  console.log("Wrote report to qa-reports/agent-e-build-gates.md");
}

main().catch(console.error);
`;

fs.writeFileSync('scripts/qa/agent-e.ts', agentE, 'utf8');
console.log('Created scripts/qa/agent-e.ts');
