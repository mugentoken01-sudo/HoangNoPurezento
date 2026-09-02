"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/FormField";
import { useI18n } from "@/lib/i18n";

export const LOCAL_STORAGE_GEMINI_KEY = "rm_custom_gemini_key";

export function getCustomGeminiKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(LOCAL_STORAGE_GEMINI_KEY) ?? "";
  } catch {
    return "";
  }
}

export function ApiKeyModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { lang, t } = useI18n();
  const [keyInput, setKeyInput] = useState("");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setKeyInput(getCustomGeminiKey());
      setSavedMsg(null);
      setTestResult(null);
    }
  }, [isOpen]);

  function handleSave() {
    const trimmed = keyInput.trim();
    try {
      if (trimmed) {
        localStorage.setItem(LOCAL_STORAGE_GEMINI_KEY, trimmed);
        setSavedMsg(lang === "vi" ? "✔ Đã lưu API Key vào trình duyệt thành công!" : "✔ API Key saved to browser successfully!");
      } else {
        localStorage.removeItem(LOCAL_STORAGE_GEMINI_KEY);
        setSavedMsg(lang === "vi" ? "Đã xóa API Key cá nhân. Sẽ dùng quota hệ thống (10 lượt/ngày) hoặc Heuristic." : "Custom key cleared. Will use system quota (10/day) or heuristic fallback.");
      }
      window.dispatchEvent(new Event("gemini-key-updated"));
      setTimeout(() => {
        setSavedMsg(null);
      }, 2500);
    } catch (e: any) {
      setSavedMsg(`Lỗi: ${e.message}`);
    }
  }

  function handleClear() {
    try {
      localStorage.removeItem(LOCAL_STORAGE_GEMINI_KEY);
      setKeyInput("");
      setSavedMsg(lang === "vi" ? "Đã xóa API Key." : "API Key cleared.");
      setTestResult(null);
      window.dispatchEvent(new Event("gemini-key-updated"));
    } catch {}
  }

  async function handleTest() {
    const keyToTest = keyInput.trim();
    if (!keyToTest) {
      setTestResult({
        ok: false,
        msg: lang === "vi" ? "Vui lòng nhập API key trước khi thử nghiệm." : "Please enter an API key before testing.",
      });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      // Direct client-side probe or ping via AI route
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(keyToTest)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "ping" }] }],
          generationConfig: { maxOutputTokens: 5 },
        }),
      });
      if (res.ok) {
        setTestResult({
          ok: true,
          msg: lang === "vi" ? "✔ Kết nối thành công! API Key của Google Gemini hoạt động hoàn hảo." : "✔ Connection successful! Google Gemini API Key is working perfectly.",
        });
      } else {
        const text = await res.text().catch(() => "");
        setTestResult({
          ok: false,
          msg: `HTTP ${res.status}: ${text.slice(0, 150)}`,
        });
      }
    } catch (e: any) {
      setTestResult({
        ok: false,
        msg: e.message || "Connection failed",
      });
    } finally {
      setTesting(false);
    }
  }

  const hasKey = Boolean(keyInput.trim());

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={lang === "vi" ? "🔑 Cấu hình Google Gemini AI Key" : "🔑 Configure Google Gemini AI Key"}
    >
      <div className="space-y-4">
        <p className="text-xs text-[#576750] leading-relaxed">
          {lang === "vi"
            ? "Nhập Google Gemini API Key cá nhân của bạn để sử dụng không giới hạn các tính năng AI (Gợi ý hành động từ Ghi chú & Soạn thảo nhận xét BCTC). Key được lưu cục bộ trong trình duyệt của bạn (localStorage), không lưu trên database server."
            : "Enter your personal Google Gemini API Key for unlimited AI features (Note action extraction & Financial commentary drafting). The key is stored locally in your browser (localStorage), never in the server database."}
        </p>

        <FormField
          label={lang === "vi" ? "Gemini API Key (BYOK)" : "Gemini API Key (BYOK)"}
          hint={lang === "vi" ? "Lấy key miễn phí tại aistudio.google.com" : "Get a free key at aistudio.google.com"}
          required
        >
          <Input
            type="text"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="AIzaSy... hoặc AQ.Ab8..."
            className="font-mono text-xs"
            autoComplete="off"
            spellCheck={false}
          />
        </FormField>

        {hasKey && (
          <div className="flex items-center justify-between rounded-xl bg-[#f7f4ed] border border-[#dfd8c8] px-3.5 py-2 text-xs">
            <span className="text-[#576750] font-mono">
              {keyInput.length > 10 ? `••••••••${keyInput.slice(-6)}` : "••••••••"}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#265e2b]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#265e2b]" />
              {lang === "vi" ? "Đã nhập key" : "Key set"}
            </span>
          </div>
        )}

        {testResult && (
          <div
            role="alert"
            className={`rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
              testResult.ok
                ? "bg-[#edf5ed] border-[#c0dec0] text-[#1b4e20]"
                : "bg-[#faedea] border-[#f0c7be] text-[#a13d28]"
            }`}
          >
            {testResult.msg}
          </div>
        )}

        {savedMsg && (
          <div className="rounded-xl border border-[#c0dec0] bg-[#edf5ed] px-3.5 py-2 text-xs font-semibold text-[#1b4e20]">
            {savedMsg}
          </div>
        )}

        <div className="rounded-xl border border-[#dfd8c8] bg-[#faf8f3] p-3 text-xs space-y-1 text-[#576750]">
          <p className="font-bold text-[#182615]">
            {lang === "vi" ? "⚡ Thứ tự ưu tiên xử lý AI:" : "⚡ AI Routing Precedence:"}
          </p>
          <ol className="list-decimal list-inside space-y-0.5 text-[11px]">
            <li><strong>BYOK (Key cá nhân):</strong> {lang === "vi" ? "Không giới hạn hạn ngạch." : "No daily cap."}</li>
            <li><strong>System Pool:</strong> {lang === "vi" ? "Dùng key hệ thống (tối đa 10 lượt/ngày)." : "System key pool (10 requests/day)."}</li>
            <li><strong>Heuristic Fallback:</strong> {lang === "vi" ? "Tự động phân tích theo quy tắc ngôn ngữ nội bộ nếu không có key." : "Deterministic local rule fallback if no key."}</li>
          </ol>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#eee8db]">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleTest}
              disabled={testing || !hasKey}
            >
              {testing ? (lang === "vi" ? "Đang thử..." : "Testing...") : (lang === "vi" ? "🧪 Kiểm tra Key" : "🧪 Test Key")}
            </Button>
            {hasKey && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleClear}
              >
                {lang === "vi" ? "Xóa Key" : "Clear Key"}
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
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
            >
              {t("common.save")}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
