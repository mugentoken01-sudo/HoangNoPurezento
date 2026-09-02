// RM Cockpit Module 5 — PII sanitization (pure, server-side only)
// Masks company name, tax code, phone, email → stable placeholders before any Gemini call.
// NEVER log raw key, raw BYOK header, or unmasked prompt.

export type SanitizeContext = {
  companyName?: string | null;
};

const PLACEHOLDERS = {
  company: "[COMPANY]",
  tax: "[TAX_ID]",
  phone: "[PHONE]",
  email: "[EMAIL]",
} as const;

// Vietnamese tax code: 10 digits optionally dash + 3 (MST 10 số hoặc 10-3)
// Phone: +84, 84, 03/05/07/08/09 with 10 digits total or formatted
// Email: standard RFC-ish
const PHONE_RE = /(?:\+84[\s.-]?[35789]|(?:\b|(?<=\s))(?:0[35789]))(?:[\s.-]*\d){8}\b/gi;
const TAX_RE = /\b\d{10}(?:-\d{3})?\b/g;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

export function sanitizeForPrompt(text: string, ctx: SanitizeContext = {}): string {
  if (!text) return text;
  let out = text;

  // Company name → [COMPANY] (case-insensitive, whole phrase)
  if (ctx.companyName && ctx.companyName.trim()) {
    const escaped = ctx.companyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, "gi");
    out = out.replace(re, PLACEHOLDERS.company);
  }

  // Email first (so phone regex doesn't eat parts)
  out = out.replace(EMAIL_RE, PLACEHOLDERS.email);

  // Phone next (0[35789] and +84) before general 10-digit tax codes
  out = out.replace(PHONE_RE, PLACEHOLDERS.phone);

  // Tax code
  out = out.replace(TAX_RE, PLACEHOLDERS.tax);

  return out;
}

// For tests: verify payload never contains raw values
export function containsRawPII(masked: string, raw: { companyName?: string; tax?: string; phone?: string; email?: string }): boolean {
  if (raw.companyName && masked.toLowerCase().includes(raw.companyName.toLowerCase())) return true;
  if (raw.tax && masked.includes(raw.tax)) return true;
  if (raw.phone) {
    const digits = raw.phone.replace(/\D/g, "");
    if (digits && masked.replace(/\D/g, "").includes(digits.slice(-8))) return true;
  }
  if (raw.email && masked.toLowerCase().includes(raw.email.toLowerCase())) return true;
  return false;
}

export const PII_PLACEHOLDERS = PLACEHOLDERS;
