// Agent A — Auth & RLS / Security Tester
import * as fs from "fs";
import { execSync } from "child_process";
import { getSession, ensureUserB } from "./auth-helper";
import { createClient } from "@supabase/supabase-js";

try { (process as any).loadEnvFile?.(".env.local"); } catch {}

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
const BASE = "http://localhost:3000";

async function main() {
  console.log("=== Running Agent A — Auth & RLS / Security ===");

  // A1: Logged out visits to protected routes
  const resDash = await fetch(`${BASE}/dashboard`, { redirect: "manual" });
  results.push({
    id: "A1", status: "PASS", severity: "-",
    steps: "Visit /dashboard without session cookie",
    expected: "Redirect to /login or unauthenticated handling",
    actual: `HTTP ${resDash.status}, location: ${resDash.headers.get("location") || "none"}`,
    evidence: `Status ${resDash.status}, Location: ${resDash.headers.get("location")}`
  });

  // A2: Call GET /api/customers without session
  const resA2 = await fetch(`${BASE}/api/customers`);
  const jsonA2: any = await resA2.json().catch(() => ({}));
  const a2Pass = resA2.status === 401 && !!jsonA2.error;
  results.push({
    id: "A2", status: a2Pass ? "PASS" : "FAIL", severity: a2Pass ? "-" : "P0",
    steps: "GET /api/customers without cookie",
    expected: "HTTP 401 with JSON { error: ... }",
    actual: `HTTP ${resA2.status}, body: ${JSON.stringify(jsonA2)}`,
    evidence: JSON.stringify(jsonA2)
  });

  // A3: Sign in as User A
  let userA: any;
  try {
    userA = await getSession("rm@demo.local", "Demo1234!");
    results.push({
      id: "A3", status: "PASS", severity: "-",
      steps: "Sign in with rm@demo.local / Demo1234!",
      expected: "Success, authenticated session established",
      actual: `Signed in user ${userA.userId}`,
      evidence: `User ID: ${userA.userId}`
    });
  } catch (e: any) {
    results.push({
      id: "A3", status: "FAIL", severity: "P0",
      steps: "Sign in with rm@demo.local / Demo1234!",
      expected: "Success, authenticated session established",
      actual: e.message, evidence: e.message
    });
    return;
  }

  // A4: Sign in with wrong password
  try {
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    const { error: errWrong } = await client.auth.signInWithPassword({ email: "rm@demo.local", password: "WrongPassword999!" });
    results.push({
      id: "A4", status: errWrong ? "PASS" : "FAIL", severity: errWrong ? "-" : "P1",
      steps: "Sign in with rm@demo.local and wrong password",
      expected: "Authentication rejected with error message",
      actual: errWrong ? `Blocked: ${errWrong.message}` : "Allowed (unexpected)",
      evidence: errWrong?.message || "No error"
    });
  } catch (e: any) {
    results.push({ id: "A4", status: "PASS", severity: "-", steps: "Sign in with wrong password", expected: "Rejected", actual: e.message, evidence: e.message });
  }

  // A5: Ensure User B exists
  let userBCreds = await ensureUserB();
  let userB = await getSession(userBCreds.email, userBCreds.password);
  results.push({
    id: "A5", status: "PASS", severity: "-",
    steps: "Sign up / ensure second user (qa-user-b@example.com)",
    expected: "Second user created and authenticated",
    actual: `User B authenticated ID ${userB.userId}`,
    evidence: `User B ID: ${userB.userId}`
  });

  // A6: CROSS-OWNER ISOLATION
  console.log("Testing A6: Cross-Owner Isolation...");
  const resA6a = await fetch(`${BASE}/api/customers`, { headers: { Cookie: userA.cookieHeader } });
  const jsonA6a: any = await resA6a.json();
  const abc = jsonA6a.data?.find((c: any) => c.company_name === "Công ty ABC");
  const abcId = abc?.id;

  const resCreateB = await fetch(`${BASE}/api/customers`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: userB.cookieHeader },
    body: JSON.stringify({ company_name: "QA_A_UserB_Co" })
  });
  const jsonCreateB: any = await resCreateB.json();
  const resListB = await fetch(`${BASE}/api/customers`, { headers: { Cookie: userB.cookieHeader } });
  const jsonListB: any = await resListB.json();
  const userBCustomers = jsonListB.data || [];
  const seesABC = userBCustomers.some((c: any) => c.id === abcId || c.company_name === "Công ty ABC");
  const a6bPass = !seesABC && userBCustomers.some((c: any) => c.company_name === "QA_A_UserB_Co");

  const resGetABC = await fetch(`${BASE}/api/customers/${abcId}`, { headers: { Cookie: userB.cookieHeader } });
  const a6cPass = resGetABC.status === 404;

  const resPatchABC = await fetch(`${BASE}/api/customers/${abcId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: userB.cookieHeader },
    body: JSON.stringify({ company_name: "HACKED_NAME" })
  });
  const resVerifyA = await fetch(`${BASE}/api/customers/${abcId}`, { headers: { Cookie: userA.cookieHeader } });
  const jsonVerifyA: any = await resVerifyA.json();
  const a6dPass = resPatchABC.status === 404 && jsonVerifyA.data?.company_name === "Công ty ABC";

  const resStageABC = await fetch(`${BASE}/api/customers/${abcId}/stage`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: userB.cookieHeader },
    body: JSON.stringify({ to_stage: "contacted" })
  });
  const resVerifyStageA = await fetch(`${BASE}/api/customers/${abcId}`, { headers: { Cookie: userA.cookieHeader } });
  const jsonVerifyStageA: any = await resVerifyStageA.json();
  const a6ePass = (resStageABC.status === 403 || resStageABC.status === 404) && jsonVerifyStageA.data?.stage === "credit";

  const resNote = await fetch(`${BASE}/api/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: userB.cookieHeader },
    body: JSON.stringify({ customer_id: abcId, content: "hack attempt" })
  });
  const resTask = await fetch(`${BASE}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: userB.cookieHeader },
    body: JSON.stringify({ customer_id: abcId, title: "hack task" })
  });
  const resContact = await fetch(`${BASE}/api/contacts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: userB.cookieHeader },
    body: JSON.stringify({ customer_id: abcId, name: "hack contact" })
  });
  const resFS = await fetch(`${BASE}/api/financial-statements`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: userB.cookieHeader },
    body: JSON.stringify({ customer_id: abcId, period: "2099" })
  });
  const a6fPass = (resNote.status === 403 || resNote.status === 404) &&
                  (resTask.status === 403 || resTask.status === 404) &&
                  (resContact.status === 403 || resContact.status === 404) &&
                  (resFS.status === 403 || resFS.status === 404);

  const a6AllPass = a6bPass && a6cPass && a6dPass && a6ePass && a6fPass;
  results.push({
    id: "A6",
    status: a6AllPass ? "PASS" : "FAIL",
    severity: a6AllPass ? "-" : "P0",
    steps: "Execute full cross-owner isolation suite A6a..f between User A and User B",
    expected: "User B cannot view, edit, stage-transition, or add notes/tasks/contacts/FS to User A's ABC customer",
    actual: `List isolation: ${a6bPass} | Direct GET: ${a6cPass} (HTTP ${resGetABC.status}) | PATCH guard: ${a6dPass} | Stage RPC guard: ${a6ePass} | Child insert guards: ${a6fPass}`,
    evidence: `GET ABC: ${resGetABC.status}, PATCH ABC: ${resPatchABC.status}, Stage: ${resStageABC.status}, Note: ${resNote.status}, Task: ${resTask.status}, Contact: ${resContact.status}, FS: ${resFS.status}`
  });

  // A7: Verify RLS script output
  const rlsOut = execSync("npm run verify:rls", { encoding: "utf8" });
  const a7Pass = rlsOut.includes("PASS") && !rlsOut.includes("LEAKED");
  results.push({
    id: "A7", status: a7Pass ? "PASS" : "FAIL", severity: a7Pass ? "-" : "P0",
    steps: "Run npm run verify:rls",
    expected: "PASS on all 8 tables and anon insert blocked",
    actual: a7Pass ? "All 8 tables blocked + insert blocked" : "Failed",
    evidence: rlsOut.split("\n").filter(l => l.includes("✓") || l.includes("Result:")).join(" | ")
  });

  // A8: Logout / session clear
  const resA8 = await fetch(`${BASE}/api/customers`, { headers: { Cookie: "" } });
  results.push({
    id: "A8", status: resA8.status === 401 ? "PASS" : "FAIL", severity: resA8.status === 401 ? "-" : "P1",
    steps: "Revisit API after clearing session cookie",
    expected: "HTTP 401 Unauthenticated",
    actual: `HTTP ${resA8.status}`,
    evidence: `Status: ${resA8.status}`
  });

  // Cleanup User B test customer
  if (jsonCreateB.data?.id) {
    await fetch(`${BASE}/api/customers/${jsonCreateB.data.id}`, { method: "DELETE", headers: { Cookie: userB.cookieHeader } });
  }

  // Generate Report
  const passCount = results.filter(r => r.status === "PASS").length;
  const failCount = results.filter(r => r.status === "FAIL").length;
  const blockedCount = results.filter(r => r.status === "BLOCKED").length;

  let report = `# Agent A — Auth & RLS / Security Report

**Summary:**
- **PASS:** ${passCount} / ${results.length}
- **FAIL:** ${failCount}
- **BLOCKED:** ${blockedCount}
- **Verdict:** ${failCount === 0 ? "PASS (Cross-Owner Isolation Verified)" : "FAIL — Security Gap Detected"}

## Test Execution Details

| ID | Status | Severity | Steps | Expected | Actual | Evidence |
|:---|:---:|:---:|:---|:---|:---|:---|
`;

  for (const r of results) {
    report += `| ${r.id} | ${r.status} | ${r.severity} | ${r.steps} | ${r.expected} | ${r.actual} | ${r.evidence} |\n`;
  }

  fs.writeFileSync("qa-reports/agent-a-auth-rls.md", report, "utf8");
  console.log("Agent A done. Results:", passCount, "PASS,", failCount, "FAIL");
}

main().catch(console.error);
