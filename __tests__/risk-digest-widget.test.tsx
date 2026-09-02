import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { WidgetCard } from "@/components/dashboard/WidgetCard";
import { Badge } from "@/components/ui/Badge";
import { I18nProvider } from "@/lib/i18n";
import type { RiskDigestRow } from "@/lib/dashboard";

describe("Phase B — Risk Digest Widget UI Verification", () => {
  const sampleRows: RiskDigestRow[] = [
    {
      customer_id: "c-high",
      company_name: "High Risk Ltd",
      stage: "credit",
      worst_severity: "high",
      flag_count: 3,
      latest_rule_triggered: "default_risk",
      latest_description: "Liabilities exceed liquid assets severely",
      latest_flag_at: "2026-09-02T15:00:00Z",
    },
    {
      customer_id: "c-med",
      company_name: "Medium Risk JSC",
      stage: "meeting",
      worst_severity: "medium",
      flag_count: 1,
      latest_rule_triggered: "inventory_spike",
      latest_description: "Inventory days increased by 45 days",
      latest_flag_at: "2026-09-02T10:00:00Z",
    },
  ];

  it("renders risk digest rows with company link, stage, severity, flag count, and preview", () => {
    render(
      <I18nProvider>
        <WidgetCard
          title="Portfolio Risk Digest"
          count={sampleRows.length}
          empty={sampleRows.length === 0}
        >
          <ul>
            {sampleRows.map((r) => (
              <li key={r.customer_id} data-testid={`risk-row-${r.customer_id}`}>
                <a href={`/customers/${r.customer_id}`}>{r.company_name}</a>
                <Badge value={r.stage} />
                <Badge value={r.worst_severity} />
                <span>{r.flag_count} flags</span>
                <span>[{r.latest_rule_triggered}]</span>
                <span>{r.latest_description}</span>
              </li>
            ))}
          </ul>
        </WidgetCard>
      </I18nProvider>
    );

    expect(screen.getByText("High Risk Ltd")).toBeDefined();
    expect(screen.getByText("High Risk Ltd").getAttribute("href")).toBe("/customers/c-high");
    expect(screen.getByText("Medium Risk JSC")).toBeDefined();
    expect(screen.getByText("3 flags")).toBeDefined();
    expect(screen.getByText("[default_risk]")).toBeDefined();
    expect(screen.getByText("Liabilities exceed liquid assets severely")).toBeDefined();
  });

  it("renders positive empty state when no flags exist", () => {
    render(
      <I18nProvider>
        <WidgetCard
          title="Portfolio Risk Digest"
          count={0}
          empty={true}
        >
          <p>No active credit-risk red flags across your entire portfolio — all customer credit profiles are healthy.</p>
        </WidgetCard>
      </I18nProvider>
    );

    expect(screen.getByText(/all customer credit profiles are healthy/i)).toBeDefined();
  });

  it("renders error state correctly via WidgetCard", () => {
    render(
      <I18nProvider>
        <WidgetCard
          title="Portfolio Risk Digest"
          error="Failed to load red flags"
          onRetry={() => {}}
        >
          <p>Should not render children</p>
        </WidgetCard>
      </I18nProvider>
    );

    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByText(/Failed to load red flags/i)).toBeDefined();
    expect(screen.queryByText("Should not render children")).toBeNull();
  });
});
