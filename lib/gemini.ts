// RM Cockpit Module 5 — Server-only Gemini client (never import in "use client")
// Handles BYOK or system key pool, timeout, retry, sanitization is done by caller.
// No key, prompt, or unmasked content is ever logged.

const GEMINI_MODEL = "gemini-1.5-flash";
const GEMINI_TIMEOUT_MS = 8000;
const GEMINI_RETRIES = 1;

export type GeminiCallResult = { text: string; source: string };

function geminiUrl(apiKey: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
}

export async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  let lastErr: string | null = null;
  for (let attempt = 0; attempt <= GEMINI_RETRIES; attempt++) {
    try {
      const res = await fetch(geminiUrl(apiKey), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        // 429 quota is retryable once with next key in pool (handled by caller), not here
        if (res.status === 429 || res.status >= 500) {
          lastErr = `Gemini ${res.status}: ${body.slice(0, 300)}`;
          continue;
        }
        throw new Error(`Gemini ${res.status}: ${body.slice(0, 500)}`);
      }
      const json = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = json.candidates?.[0]?.content?.parts?.map(p => p.text ?? "").join("") ?? "";
      if (!text) throw new Error("Gemini returned empty content");
      clearTimeout(t);
      return text;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("abort")) {
        lastErr = "Gemini timeout";
        continue;
      }
      lastErr = msg;
      if (attempt < GEMINI_RETRIES) continue;
      break;
    }
  }
  clearTimeout(t);
  throw new Error(lastErr ?? "Gemini call failed");
}

// Pool of system keys — redundancy-only (same project → no extra quota) unless keys are from distinct projects.
// Env: GEMINI_API_KEY (single) or GEMINI_API_KEYS (comma-separated). Trim empty.
export function getSystemKeys(): string[] {
  const single = process.env.GEMINI_API_KEY?.trim();
  const pool = process.env.GEMINI_API_KEYS?.trim();
  const keys: string[] = [];
  if (pool) keys.push(...pool.split(",").map(s => s.trim()).filter(Boolean));
  if (single && !keys.includes(single)) keys.push(single);
  return keys;
}

export async function callGeminiWithPool(prompt: string, keys: string[]): Promise<{ text: string; keyIndex: number }> {
  let lastErr: Error | null = null;
  for (let i = 0; i < keys.length; i++) {
    try {
      const text = await callGemini(prompt, keys[i]);
      return { text, keyIndex: i };
    } catch (e: unknown) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      // Try next key on 429 / 5xx / timeout
      continue;
    }
  }
  throw lastErr ?? new Error("All system keys failed");
}
