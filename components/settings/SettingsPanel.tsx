"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, Textarea } from "@/components/ui/FormField";
import { useI18n } from "@/lib/i18n";
import {
  getCustomGeminiKeys,
  saveCustomGeminiKeys,
  parseKeysFromInput,
} from "./ApiKeyModal";

export function SettingsPanel() {
  const { lang } = useI18n();
  const [rawInput, setRawInput] = useState("");
  const [saved, setSaved] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<Array<{ key: string; ok: boolean; msg: string }> | null>(null);

  useEffect(() => {
    function loadKeys() {
      const keys = getCustomGeminiKeys();
      setRawInput(keys.join("\n"));
    }
    loadKeys();
    window.addEventListener("gemini-key-updated", loadKeys);
    return () => window.removeEventListener("gemini-key-updated", loadKeys);
  }, []);

  const parsedKeys = parseKeysFromInput(rawInput);

  function onSave() {
    try {
      saveCustomGeminiKeys(parsedKeys);
      setSaved(true);
      setMsg({
        text:
          parsedKeys.length > 0
            ? lang === "vi"
              ? `✔ Đã lưu ${parsedKeys.length} API Key vào Pool trình duyệt (localStorage).`
              : `✔ Saved ${parsedKeys.length} API Keys to browser pool (localStorage).`
            : lang === "vi"
            ? "Đã xóa toàn bộ Key cá nhân."
            : "Custom API Keys cleared.",
        ok: true,
      });
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setMsg({ text: e.message || String(e), ok: false });
    }
  }

  function onClear() {
    setRawInput("");
    saveCustomGeminiKeys([]);
    setMsg({
      text: lang === "vi" ? "Đã xóa toàn bộ API Keys cá nhân." : "All custom API Keys cleared.",
      ok: false,
    });
    setTestResults(null);
  }

  async function onTestAll() {
    if (parsedKeys.length === 0) {
      setMsg({
        text: lang === "vi" ? "Vui lòng nhập ít nhất 1 API Key trước khi kiểm tra." : "Please enter at least 1 API Key before testing.",
        ok: false,
      });
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
              return { key, ok: true, msg: "200 OK — Hoạt động tốt (Active)" };
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

  const hasKeys = parsedKeys.length > 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#dfd8c8] bg-[#ffffff] p-6 shadow-2xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eee8db] pb-4">
          <div>
            <h3 className="text-base font-serif font-bold text-[#182615]">
              {lang === "vi" ? "🔑 Google Gemini Key Pool & Failover Topology (Đa Key)" : "🔑 Google Gemini Key Pool & Failover Topology"}
            </h3>
            <p className="text-xs text-[#576750] mt-0.5">
              {lang === "vi"
                ? "Nhập danh sách không giới hạn số lượng API Keys. Hệ thống tự động xoay vòng và tự phục hồi (swap key) khi gặp 429."
                : "Enter unlimited API Keys. The engine rotates keys and automatically swaps to fallback keys on rate limits."}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${
              hasKeys
                ? "bg-[#edf5ed] text-[#1b4e20] border-[#c0dec0]"
                : "bg-[#f5f1e8] text-[#576750] border-[#dfd8c8]"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${hasKeys ? "bg-[#265e2b]" : "bg-[#8b9b84]"}`} />
            {hasKeys
              ? lang === "vi"
                ? `BYOK Pool (${parsedKeys.length} Keys Active)`
                : `BYOK Pool (${parsedKeys.length} Keys Active)`
              : lang === "vi"
              ? "Dùng System Quota"
              : "System Pool"}
          </span>
        </div>

        <div className="space-y-4">
          <FormField
            label={
              <div className="flex items-center justify-between">
                <span>{lang === "vi" ? "Danh sách API Keys (Mỗi dòng 1 key hoặc cách nhau bởi dấu phẩy)" : "API Keys List (One per line or comma-separated)"}</span>
                <span className="text-[11px] font-mono text-[#265e2b] font-bold">
                  {parsedKeys.length} {lang === "vi" ? "Key trong Pool" : "Keys in Pool"}
                </span>
              </div>
            }
            hint={lang === "vi" ? "Lấy key tại aistudio.google.com → Get API key. Lưu trữ an toàn trong localStorage." : "Get keys at aistudio.google.com → Get API key. Stored in localStorage."}
            required
          >
            <Textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              rows={4}
              placeholder={`AIzaSyKey1...\nAIzaSyKey2...\nAQ.Ab8Key3...`}
              autoComplete="off"
              spellCheck={false}
              className="font-mono text-xs leading-relaxed"
            />
          </FormField>

          {hasKeys && (
            <div className="space-y-1.5 rounded-xl bg-[#f7f4ed] border border-[#dfd8c8] p-3 max-h-44 overflow-y-auto">
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
                      {idx === 0 ? (lang === "vi" ? "Primary Key" : "Primary Key") : (lang === "vi" ? `Fallback Key #${idx}` : `Fallback Key #${idx}`)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {testResults && (
            <div className="space-y-1.5 rounded-xl border border-[#dfd8c8] bg-white p-3 text-xs max-h-44 overflow-y-auto">
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
              onClick={onTestAll}
              disabled={testing || !hasKeys}
              className="cursor-pointer"
            >
              {testing ? (lang === "vi" ? "Đang kiểm tra..." : "Testing...") : (lang === "vi" ? "🧪 Kiểm tra tất cả Key" : "🧪 Test All Keys")}
            </Button>
            {hasKeys && (
              <Button size="sm" variant="danger" onClick={onClear} className="cursor-pointer">
                {lang === "vi" ? "Xóa tất cả" : "Clear All"}
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[#dfd8c8] bg-[#faf8f3] p-4 text-xs text-[#576750] space-y-2">
          <p className="font-bold text-[#182615]">
            {lang === "vi" ? "🛡️ Bảo mật & Cơ chế Xoay Vòng Topology:" : "🛡️ Security & Topology Mechanics:"}
          </p>
          <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed">
            <li>
              <strong>Đa Key & Fallback:</strong> {lang === "vi" ? "Khi gửi yêu cầu AI, toàn bộ key trong pool sẽ được gửi đến backend. Nếu key đầu tiên gặp lỗi rate-limit 429 hoặc timeout, backend sẽ tự động tráo sang key tiếp theo trong danh sách mà không làm gián đoạn người dùng." : "If Key #1 encounters 429 or timeout, backend auto-swaps to next key in pool seamlessly."}
            </li>
            <li>
              <strong>Không giới hạn:</strong> {lang === "vi" ? "Bạn có thể dán 2, 5, 20 hoặc bất kỳ số lượng key nào từ nhiều tài khoản/dự án Google Cloud khác nhau để mở rộng hạn ngạch." : "Add 2, 5, 20 or unlimited keys from multiple Google accounts to scale throughput."}
            </li>
            <li>
              <strong>Bảo mật máy khách:</strong> {lang === "vi" ? "Toàn bộ danh sách key lưu trong trình duyệt cá nhân (localStorage), không lưu trên database server." : "Saved exclusively in your browser localStorage."}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
