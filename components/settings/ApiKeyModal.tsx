"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField, Textarea } from "@/components/ui/FormField";
import { useI18n } from "@/lib/i18n";

export const LOCAL_STORAGE_GEMINI_KEYS = "rm_custom_gemini_keys";
export const LOCAL_STORAGE_GEMINI_KEY = "rm_custom_gemini_key"; // Legacy single key fallback

export function parseKeysFromInput(raw: string): string[] {
  if (!raw) return [];
  const parts = raw.split(/[\r\n,;]+/).map((s) => s.trim()).filter(Boolean);
  return Array.from(new Set(parts));
}

export function getCustomGeminiKeys(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const rawMulti = localStorage.getItem(LOCAL_STORAGE_GEMINI_KEYS) ?? "";
    const rawSingle = localStorage.getItem(LOCAL_STORAGE_GEMINI_KEY) ?? "";
    const combined = [rawMulti, rawSingle].filter(Boolean).join("\n");
    return parseKeysFromInput(combined);
  } catch {
    return [];
  }
}

export function saveCustomGeminiKeys(keys: string[]) {
  if (typeof window === "undefined") return;
  const clean = Array.from(new Set(keys.map((k) => k.trim()).filter(Boolean)));
  if (clean.length > 0) {
    localStorage.setItem(LOCAL_STORAGE_GEMINI_KEYS, clean.join("\n"));
    localStorage.setItem(LOCAL_STORAGE_GEMINI_KEY, clean[0]); // legacy compat
  } else {
    localStorage.removeItem(LOCAL_STORAGE_GEMINI_KEYS);
    localStorage.removeItem(LOCAL_STORAGE_GEMINI_KEY);
  }
  window.dispatchEvent(new Event("gemini-key-updated"));
}

export function ApiKeyModal({
  open,
  isOpen,
  onClose,
}: {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
}) {
  const isModalOpen = Boolean(open ?? isOpen);
  const { lang, t } = useI18n();
  const [rawInput, setRawInput] = useState("");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<Array<{ key: string; ok: boolean; msg: string }> | null>(null);

  useEffect(() => {
    if (isModalOpen) {
      const keys = getCustomGeminiKeys();
      setRawInput(keys.join("\n"));
      setSavedMsg(null);
      setTestResults(null);
    }
  }, [isModalOpen]);

  const parsedKeys = parseKeysFromInput(rawInput);

  function handleSave() {
    try {
      saveCustomGeminiKeys(parsedKeys);
      setSavedMsg(
        parsedKeys.length > 0
          ? lang === "vi"
            ? `✔ Đã lưu ${parsedKeys.length} API Key vào Pool trình duyệt thành công!`
            : `✔ Saved ${parsedKeys.length} API Keys to Browser Pool successfully!`
          : lang === "vi"
          ? "Đã xóa toàn bộ Key cá nhân. Sẽ dùng quota hệ thống hoặc Heuristic."
          : "All custom keys cleared."
      );
      setTimeout(() => setSavedMsg(null), 2500);
    } catch (e: any) {
      setSavedMsg(`Lỗi: ${e.message}`);
    }
  }

  function handleClear() {
    setRawInput("");
    saveCustomGeminiKeys([]);
    setSavedMsg(lang === "vi" ? "Đã xóa toàn bộ API Keys." : "All API Keys cleared.");
    setTestResults(null);
  }

  async function handleTestAll() {
    if (parsedKeys.length === 0) {
      setSavedMsg(lang === "vi" ? "Vui lòng nhập ít nhất 1 API key trước khi kiểm tra." : "Please enter at least 1 API key to test.");
      return;
    }
    setTesting(true);
    setTestResults(null);
    try {
      const results = await Promise.all(
        parsedKeys.map(async (key) => {
          try {
            const res = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${encodeURIComponent(key)}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{ role: "user", parts: [{ text: "ping" }] }],
                  generationConfig: { maxOutputTokens: 5 },
                }),
              }
            );
            if (res.ok) {
              return { key, ok: true, msg: "200 OK — Sẵn sàng (Active)" };
            } else {
              const text = await res.text().catch(() => "");
              return { key, ok: false, msg: `HTTP ${res.status}: ${text.slice(0, 100)}` };
            }
          } catch (err: any) {
            return { key, ok: false, msg: err.message || "Network error" };
          }
        })
      );
      setTestResults(results);
    } finally {
      setTesting(false);
    }
  }

  return (
    <Modal
      open={isModalOpen}
      onClose={onClose}
      title={lang === "vi" ? "🔑 Quản lý Key Pool Google Gemini (Đa Key & Tự động Xoay Vòng)" : "🔑 Google Gemini Key Pool & Fallback Topology"}
    >
      <div className="space-y-4">
        <p className="text-xs text-[#576750] leading-relaxed">
          {lang === "vi"
            ? "Nhập danh sách Google Gemini API Keys của bạn (không giới hạn số lượng). Hệ thống sẽ tự động xoay vòng (Round-Robin) và tự động chuyển sang key dự phòng (Failover/Swap) khi một key chạm hạn ngạch (Rate Limit 429/503)."
            : "Enter your list of Google Gemini API Keys (unlimited). The engine automatically rotates keys and swaps to fallback keys upon rate limits (429/503)."}
        </p>

        <FormField
          label={
            <div className="flex items-center justify-between">
              <span>{lang === "vi" ? "Danh sách API Keys (Mỗi dòng 1 key hoặc cách nhau bởi dấu phẩy)" : "API Keys List (One per line or comma-separated)"}</span>
              <span className="text-[11px] font-mono text-[#265e2b] font-bold">
                {parsedKeys.length} {lang === "vi" ? "Key trong Pool" : "Keys in Pool"}
              </span>
            </div>
          }
          hint={lang === "vi" ? "Dán danh sách các key: AIzaSy... hoặc AQ.Ab8... Lấy key tại aistudio.google.com" : "Paste your keys list. Get free keys at aistudio.google.com"}
          required
        >
          <Textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            rows={4}
            placeholder={`AIzaSyKey1...\nAIzaSyKey2...\nAQ.Ab8Key3...`}
            className="font-mono text-xs leading-relaxed"
            autoComplete="off"
            spellCheck={false}
          />
        </FormField>

        {parsedKeys.length > 0 && (
          <div className="space-y-1.5 rounded-xl bg-[#f7f4ed] border border-[#dfd8c8] p-3 max-h-36 overflow-y-auto">
            <p className="text-[11px] font-bold text-[#182615] flex items-center justify-between">
              <span>{lang === "vi" ? "Topology Key Pool hiện tại:" : "Active Key Pool Topology:"}</span>
              <span className="text-[#265e2b]">✓ {parsedKeys.length} {lang === "vi" ? "khả dụng" : "available"}</span>
            </p>
            <div className="space-y-1">
              {parsedKeys.map((k, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white border border-[#eee8db] rounded-lg px-2.5 py-1 text-xs">
                  <span className="font-mono text-[11px] text-[#576750]">
                    #{idx + 1}: {k.length > 12 ? `${k.slice(0, 4)}••••${k.slice(-6)}` : "••••••••"}
                  </span>
                  <span className="text-[10px] text-[#265e2b] font-semibold bg-[#edf5ed] border border-[#c0dec0] rounded px-1.5 py-0.5">
                    {idx === 0 ? (lang === "vi" ? "Primary" : "Primary") : (lang === "vi" ? `Fallback #${idx}` : `Fallback #${idx}`)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {testResults && (
          <div className="space-y-1.5 rounded-xl border border-[#dfd8c8] bg-white p-3 text-xs max-h-36 overflow-y-auto">
            <p className="font-bold text-[#182615] text-[11px]">
              {lang === "vi" ? "Kết quả kiểm tra từng Key:" : "Individual Key Verification Results:"}
            </p>
            {testResults.map((r, i) => (
              <div
                key={i}
                className={`flex items-center justify-between rounded-lg px-2.5 py-1 text-[11px] border ${
                  r.ok ? "bg-[#edf5ed] border-[#c0dec0] text-[#1b4e20]" : "bg-[#faedea] border-[#f0c7be] text-[#a13d28]"
                }`}
              >
                <span className="font-mono truncate max-w-[180px]">
                  Key #{i + 1} ({r.key.slice(-6)}):
                </span>
                <span className="font-semibold">{r.msg}</span>
              </div>
            ))}
          </div>
        )}

        {savedMsg && (
          <div className="rounded-xl border border-[#c0dec0] bg-[#edf5ed] px-3.5 py-2 text-xs font-semibold text-[#1b4e20]">
            {savedMsg}
          </div>
        )}

        <div className="rounded-xl border border-[#dfd8c8] bg-[#faf8f3] p-3 text-xs space-y-1 text-[#576750]">
          <p className="font-bold text-[#182615]">
            {lang === "vi" ? "🔄 Cơ chế Xoay Vòng & Tự Phục Hồi:" : "🔄 Failover & Rotation Topology:"}
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-[11px]">
            <li><strong>Auto-Failover:</strong> {lang === "vi" ? "Nếu Key #1 lỗi hoặc chạm rate-limit 429, tự động chuyển sang Key #2 ngay lập tức." : "If Key #1 fails or hits 429, auto-swaps to Key #2 immediately."}</li>
            <li><strong>Không giới hạn số key:</strong> {lang === "vi" ? "Có thể thêm 2, 5, 10 hoặc nhiều key tùy ý." : "Add 2, 5, 10 or unlimited keys to the pool."}</li>
            <li><strong>Bảo mật:</strong> {lang === "vi" ? "Toàn bộ danh sách key lưu trong trình duyệt (localStorage), không lưu trên database server." : "Saved exclusively in your browser (localStorage)."}</li>
          </ul>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#eee8db]">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleTestAll}
              disabled={testing || parsedKeys.length === 0}
              className="cursor-pointer"
            >
              {testing ? (lang === "vi" ? "Đang kiểm tra..." : "Testing...") : (lang === "vi" ? "🧪 Kiểm tra tất cả Key" : "🧪 Test All Keys")}
            </Button>
            {parsedKeys.length > 0 && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleClear}
                className="cursor-pointer"
              >
                {lang === "vi" ? "Xóa tất cả" : "Clear All"}
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="cursor-pointer"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                handleSave();
                onClose();
              }}
              className="cursor-pointer"
            >
              {t("common.save")}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
