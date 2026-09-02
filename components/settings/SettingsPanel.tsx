"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/FormField";
import { useI18n } from "@/lib/i18n";
import { LOCAL_STORAGE_GEMINI_KEY, getCustomGeminiKey } from "./ApiKeyModal";

export function SettingsPanel() {
  const { lang, t } = useI18n();
  const [val, setVal] = useState("");
  const [saved, setSaved] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    function loadKey() {
      setVal(getCustomGeminiKey());
    }
    loadKey();
    window.addEventListener("gemini-key-updated", loadKey);
    return () => window.removeEventListener("gemini-key-updated", loadKey);
  }, []);

  function onSave() {
    try {
      const trimmed = val.trim();
      if (trimmed) {
        localStorage.setItem(LOCAL_STORAGE_GEMINI_KEY, trimmed);
        setSaved(true);
        setMsg({
          text: lang === "vi" ? "✔ Đã lưu API Key vào trình duyệt (localStorage)." : "✔ Saved to browser (localStorage).",
          ok: true,
        });
      } else {
        localStorage.removeItem(LOCAL_STORAGE_GEMINI_KEY);
        setMsg({
          text: lang === "vi" ? "Đã xóa API Key cá nhân." : "Custom API Key cleared.",
          ok: false,
        });
      }
      window.dispatchEvent(new Event("gemini-key-updated"));
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setMsg({ text: e.message || String(e), ok: false });
    }
  }

  function onClear() {
    try {
      localStorage.removeItem(LOCAL_STORAGE_GEMINI_KEY);
      setVal("");
      setMsg({
        text: lang === "vi" ? "Đã xóa API Key cá nhân." : "Custom API Key cleared.",
        ok: false,
      });
      setTestResult(null);
      window.dispatchEvent(new Event("gemini-key-updated"));
    } catch {}
  }

  async function onTest() {
    const keyToTest = val.trim();
    if (!keyToTest) {
      setTestResult({
        ok: false,
        msg: lang === "vi" ? "Vui lòng nhập API Key trước khi thử nghiệm." : "Please enter an API Key before testing.",
      });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(keyToTest)}`,
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
        setTestResult({
          ok: true,
          msg: lang === "vi" ? "✔ Kết nối thành công! Google Gemini API Key hoạt động bình thường." : "✔ Connection successful! Google Gemini API Key is working.",
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

  const hasKey = Boolean(val.trim());
  const masked = hasKey ? `••••••••${val.slice(-4)}` : "— chưa cấu hình —";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#dfd8c8] bg-[#ffffff] p-6 shadow-2xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eee8db] pb-4">
          <div>
            <h3 className="text-base font-serif font-bold text-[#182615]">
              {lang === "vi" ? "🔑 Google Gemini AI — Bring Your Own Key (BYOK)" : "🔑 Google Gemini AI — Bring Your Own Key (BYOK)"}
            </h3>
            <p className="text-xs text-[#576750] mt-0.5">
              {lang === "vi"
                ? "Sử dụng key cá nhân của bạn để mở khóa tính năng AI không giới hạn hạn ngạch."
                : "Use your personal key for unlimited AI features with no quota restrictions."}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${
              hasKey
                ? "bg-[#edf5ed] text-[#1b4e20] border-[#c0dec0]"
                : "bg-[#f5f1e8] text-[#576750] border-[#dfd8c8]"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${hasKey ? "bg-[#265e2b]" : "bg-[#8b9b84]"}`} />
            {hasKey ? (lang === "vi" ? "Đang dùng BYOK" : "BYOK Active") : (lang === "vi" ? "Dùng System Quota" : "System Pool")}
          </span>
        </div>

        <div className="space-y-4">
          <FormField
            label={lang === "vi" ? "Gemini API Key cá nhân" : "Personal Gemini API Key"}
            hint={lang === "vi" ? "Lấy key tại aistudio.google.com → Get API key. Lưu trữ an toàn trong localStorage." : "Get a key at aistudio.google.com → Get API key. Stored in localStorage."}
            required
          >
            <Input
              type="text"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              placeholder="AIzaSy... hoặc AQ.Ab8..."
              autoComplete="off"
              spellCheck={false}
              className="font-mono text-xs"
            />
          </FormField>

          <div className="flex items-center justify-between text-xs text-[#576750] bg-[#f7f4ed] border border-[#dfd8c8] px-3.5 py-2 rounded-xl font-mono">
            <span>{lang === "vi" ? "Trạng thái key:" : "Key preview:"} <strong className="text-[#182615]">{masked}</strong></span>
            {saved && <span className="text-[#265e2b] font-bold">✓ {lang === "vi" ? "Đã lưu" : "Saved"}</span>}
          </div>

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

          {msg && (
            <div
              className={`rounded-xl border px-3.5 py-2 text-xs font-medium ${
                msg.ok ? "bg-[#edf5ed] border-[#c0dec0] text-[#1b4e20]" : "bg-[#f5f1e8] border-[#dfd8c8] text-[#576750]"
              }`}
            >
              {msg.text}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button size="sm" onClick={onSave} className="cursor-pointer">
              {lang === "vi" ? "Lưu vào trình duyệt" : "Save locally"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={onTest}
              disabled={testing || !hasKey}
              className="cursor-pointer"
            >
              {testing ? (lang === "vi" ? "Đang thử..." : "Testing...") : (lang === "vi" ? "🧪 Kiểm tra Key" : "🧪 Test Key")}
            </Button>
            {hasKey && (
              <Button size="sm" variant="danger" onClick={onClear} className="cursor-pointer">
                {lang === "vi" ? "Xóa Key" : "Clear key"}
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[#dfd8c8] bg-[#faf8f3] p-4 text-xs text-[#576750] space-y-2">
          <p className="font-bold text-[#182615]">
            {lang === "vi" ? "🛡️ Bảo mật & Cơ chế Định tuyến:" : "🛡️ Security & Routing Precedence:"}
          </p>
          <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed">
            <li>
              <strong>BYOK:</strong> {lang === "vi" ? "Key không bao giờ lưu trên máy chủ hay database; chỉ gửi kèm theo request AI qua header bảo mật." : "Key is never saved on database/server; only sent per request via secure header."}
            </li>
            <li>
              <strong>System Pool:</strong> {lang === "vi" ? "Nếu để trống, hệ thống sẽ dùng quota chung (tối đa 10 lượt/ngày theo giờ Việt Nam)." : "If empty, system quota is used (10 requests/day in Asia/Ho_Chi_Minh)."}
            </li>
            <li>
              <strong>Heuristic Fallback:</strong> {lang === "vi" ? "Khi hết hạn ngạch hoặc mất kết nối mạng, hệ thống tự động nhận diện ngày hẹn và loại hành động bằng quy tắc ngôn ngữ nội bộ." : "When quota is reached, local linguistic rules extract meeting dates & actions with zero external calls."}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
