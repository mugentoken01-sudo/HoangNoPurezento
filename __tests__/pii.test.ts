import { describe, it, expect } from "vitest";
import { sanitizeForPrompt, containsRawPII, PII_PLACEHOLDERS } from "@/lib/pii";

describe("PII sanitization — pure function, never logs raw", () => {
  const fixture = {
    companyName: "Công ty TNHH Ánh Dương",
    tax: "0101234567",
    phone: "0912345678",
    email: "ketoan@anhduong.vn",
  };

  it("masks company, tax, phone, email → placeholders", () => {
    const raw = `Công ty TNHH Ánh Dương MST 0101234567 liên hệ 0912345678 email ketoan@anhduong.vn`;
    const masked = sanitizeForPrompt(raw, { companyName: fixture.companyName });
    expect(masked).not.toContain(fixture.companyName);
    expect(masked).not.toContain(fixture.tax);
    expect(masked).not.toContain(fixture.phone);
    expect(masked).not.toContain(fixture.email);
    expect(masked).toContain(PII_PLACEHOLDERS.company);
    expect(masked).toContain(PII_PLACEHOLDERS.tax);
    expect(masked).toContain(PII_PLACEHOLDERS.phone);
    expect(masked).toContain(PII_PLACEHOLDERS.email);
  });

  it("handles formatted phone and tax with dash", () => {
    const raw = `MST 0101234567-001, phone +84 912 345 678, email A@B.COM`;
    const masked = sanitizeForPrompt(raw, {});
    expect(masked).toContain(PII_PLACEHOLDERS.tax);
    expect(masked).toContain(PII_PLACEHOLDERS.phone);
    expect(masked).toContain(PII_PLACEHOLDERS.email);
  });

  it("is idempotent and case-insensitive for company", () => {
    const raw = "CONG TY TNHH ANH DUONG và Công ty TNHH Ánh Dương";
    const masked = sanitizeForPrompt(raw, { companyName: "Công ty TNHH Ánh Dương" });
    expect(masked.toLowerCase()).not.toContain("ánh dương");
  });

  it("empty / null inputs don't throw", () => {
    expect(sanitizeForPrompt("", {})).toBe("");
    expect(sanitizeForPrompt("hello", {})).toBe("hello");
  });

  it("containsRawPII helper detects leak", () => {
    const masked = sanitizeForPrompt(`Công ty TNHH Ánh Dương 0101234567`, { companyName: fixture.companyName });
    expect(containsRawPII(masked, fixture)).toBe(false);
    expect(containsRawPII("Công ty TNHH Ánh Dương raw", fixture)).toBe(true);
  });
});
