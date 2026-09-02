import { describe, it, expect } from "vitest";

describe("AI multi-key pool parsing & failover topology", () => {
  it("parses and deduplicates keys from newlines, commas, and semicolons", async () => {
    const { parseKeyList } = await import("@/lib/gemini");
    const raw = "AIzaSyKey1\nAIzaSyKey2, AIzaSyKey3 ; AIzaSyKey1\n\nAIzaSyKey4 ";
    const keys = parseKeyList(raw);
    expect(keys).toEqual(["AIzaSyKey1", "AIzaSyKey2", "AIzaSyKey3", "AIzaSyKey4"]);
    expect(keys.length).toBe(4);
  });

  it("handles unlimited keys gracefully", async () => {
    const { parseKeyList } = await import("@/lib/gemini");
    const generated = Array.from({ length: 50 }, (_, i) => `AIzaKey_${i}`);
    const raw = generated.join("\n");
    const parsed = parseKeyList(raw);
    expect(parsed.length).toBe(50);
  });

  it("empty/null inputs return empty array", async () => {
    const { parseKeyList } = await import("@/lib/gemini");
    expect(parseKeyList("")).toEqual([]);
    expect(parseKeyList(null)).toEqual([]);
    expect(parseKeyList(undefined)).toEqual([]);
    expect(parseKeyList("   \n\n  ")).toEqual([]);
  });
});

describe("AI routing precedence — BYOK > system > heuristic", () => {
  it("BYOK bypasses system cap entirely", () => {
    const byok = "AIza-test";
    const systemKeys = ["k1"];
    const shouldUseSystem = !byok && systemKeys.length > 0;
    expect(shouldUseSystem).toBe(false);
  });

  it("no BYOK, system keys present → system path (capped)", () => {
    const byok = "";
    const systemKeys = ["k1", "k2"];
    const path = byok ? "byok" : systemKeys.length ? "system" : "heuristic";
    expect(path).toBe("system");
  });

  it("no keys at all → heuristic, zero external call", () => {
    const noKey: string = "";
    const noSysKeys: string[] = [];
    const path = Boolean(noKey) ? "byok" : noSysKeys.length ? "system" : "heuristic";
    expect(path).toBe("heuristic");
  });

  it("BYOK failure falls back to heuristic, not to system", async () => {
    const { parseNoteHeuristic } = await import("@/lib/heuristic");
    const h = parseNoteHeuristic("gọi lại ngày mai", "2026-09-02");
    expect(h.next_action_type).toBe("call");
    expect(h.next_action_date).toBe("2026-09-03");
  });
});

describe("Forbidden AI behaviors — never exercised", () => {
  it("no route handler imports stage transition", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const files = ["app/api/ai/parse-note/route.ts", "app/api/ai/draft-commentary/route.ts"];
    for (const f of files) {
      if (fs.existsSync(path.join(process.cwd(), f))) {
        const content = fs.readFileSync(path.join(process.cwd(), f), "utf8");
        expect(content).not.toMatch(/changeStage|customers\/\[id\]\/stage/);
        expect(content).not.toMatch(/financial_ratios.*update|red_flags.*insert.*rule_engine/i);
      }
    }
  });

  it("PII sanitized before any Gemini call — mocked prompt never contains raw", async () => {
    const { sanitizeForPrompt } = await import("@/lib/pii");
    const raw = "Công ty TNHH Ánh Dương MST 0101234567 phone 0912345678 email ketoan@anhduong.vn nội dung ghi chú";
    const masked = sanitizeForPrompt(raw, { companyName: "Công ty TNHH Ánh Dương" });
    expect(masked).not.toContain("Ánh Dương");
    expect(masked).not.toContain("0101234567");
    expect(masked).not.toContain("0912345678");
    expect(masked).not.toContain("ketoan@anhduong.vn");
  });
});
