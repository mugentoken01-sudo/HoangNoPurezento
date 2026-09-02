import { SettingsPanel } from "@/components/settings/SettingsPanel";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <div className="border-b border-[#dfd8c8] pb-4">
        <h1 className="text-2xl font-serif font-bold tracking-tight text-[#182615]">
          ⚙️ Cài đặt Hệ thống & AI (Settings)
        </h1>
        <p className="mt-1 text-sm text-[#576750]">
          Quản lý khóa API Google Gemini cá nhân (BYOK), cấu hình định tuyến AI và tùy chọn làm việc của Relationship Manager.
        </p>
      </div>
      <SettingsPanel />
    </div>
  );
}
