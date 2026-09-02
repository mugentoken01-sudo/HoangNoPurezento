import { describe, it, expect } from "vitest";
import { parseNoteHeuristic, draftCommentaryHeuristic } from "@/lib/heuristic";

describe("parseNoteHeuristic — Vietnamese expressions", () => {
  const today = "2026-09-02";

  it("detects gọi lại + ngày mai", () => {
    const r = parseNoteHeuristic("Nhớ gọi lại cho khách ngày mai nhé", today);
    expect(r.next_action_type).toBe("call");
    expect(r.next_action_date).toBe("2026-09-03");
    expect(r.confidence).toBe("high");
  });

  it("detects hẹn gặp + tuần sau", () => {
    const r = parseNoteHeuristic("Hẹn gặp khách tuần sau tại VP", today);
    expect(r.next_action_type).toBe("meeting");
    expect(r.next_action_date).toBe("2026-09-09");
  });

  it("detects gửi email", () => {
    const r = parseNoteHeuristic("Cần gửi email báo giá", today);
    expect(r.next_action_type).toBe("email");
  });

  it("parses explicit dd/mm", () => {
    const r = parseNoteHeuristic("Hẹn 15/09 gặp", today);
    expect(r.next_action_date).toBe("2026-09-15");
  });

  it("parses explicit dd/mm/yyyy", () => {
    const r = parseNoteHeuristic("Gọi 01/01/2027", today);
    expect(r.next_action_date).toBe("2027-01-01");
  });

  it("handles ngày mốt = +2", () => {
    const r = parseNoteHeuristic("Ngày mốt gọi lại", today);
    expect(r.next_action_date).toBe("2026-09-04");
  });

  it("never throws — worst case returns nulls low", () => {
    const r = parseNoteHeuristic("Khách rất hài lòng, không cần gì", today);
    expect(r.next_action_type).toBeNull();
    expect(r.next_action_date).toBeNull();
    expect(r.confidence).toBe("low");
  });

  it("handles empty / nonsense without throw", () => {
    expect(() => parseNoteHeuristic("", today)).not.toThrow();
    expect(() => parseNoteHeuristic("...!!!", today)).not.toThrow();
  });

  it("is deterministic — same input same output", () => {
    const a = parseNoteHeuristic("gọi lại ngày mai", today);
    const b = parseNoteHeuristic("gọi lại ngày mai", today);
    expect(a).toEqual(b);
  });
});

describe("draftCommentaryHeuristic — template-based, deterministic", () => {
  it("produces paragraph with ratios and flags, labeled heuristic", () => {
    const text = draftCommentaryHeuristic({
      companyName: "Công ty ABC",
      period: "2023",
      ratios: { current_ratio: 0.9, quick_ratio: 0.6, debt_to_equity: 1.2, interest_coverage: 1.5, receivable_days: 40, inventory_days: 50, revenue_growth: 0.12, net_income_growth: 0.05 },
      redFlags: [{ rule_triggered: "current_ratio_below_1", severity: "high", description: "Current ratio 0.90 < 1", period: "2023" }],
      prevPeriod: "2022",
    });
    expect(text).toContain("[COMPANY]");
    expect(text).not.toContain("Công ty ABC");
    expect(text).toContain("2023");
    expect(text).toContain("current_ratio");
    expect(text).toContain("heuristic");
  });

  it("handles no ratios / no flags gracefully", () => {
    const text = draftCommentaryHeuristic({ companyName: null, period: "2024", ratios: {}, redFlags: [] });
    expect(text).toContain("No rule-engine red flags");
    expect(() => draftCommentaryHeuristic({ companyName: null, period: "2024", ratios: {}, redFlags: [] })).not.toThrow();
  });

  it("is deterministic", () => {
    const input = { companyName: "X", period: "2023", ratios: { current_ratio: 1.5 }, redFlags: [] as never[], prevPeriod: null as string | null };
    expect(draftCommentaryHeuristic(input)).toBe(draftCommentaryHeuristic(input));
  });
});
