import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Infographic, type InfographicData } from "../client/src/components/infographic/Infographic";

globalThis.React = React;

describe("RAWAHEL Pulse report templates", () => {
  it("renders the Arabic donor template without crashing", () => {
    const data: InfographicData = {
      title: "تقرير أثر الداعمين",
      month: 6,
      year: 2026,
      templateKey: "donor",
      audience: "donor",
      summary: {
        totalBeneficiaries: 120,
        programsExecuted: 8,
        volunteers: 12,
        contentProduced: 4,
        goalAchievementRate: 64,
      },
      departments: [],
      items: [],
      monthlyGrowth: [],
      pulse: {
        totals: {
          totalBeneficiaries: 120,
          totalActivities: 8,
          totalEducationHours: 240,
          totalGraduates: 12,
          approvedValueCount: 3,
          approvedEvidenceCount: 1,
          dataCompletenessScore: 72,
          pendingSubmissionCount: 0,
          donorFacing: {
            totalBeneficiaries: 120,
            totalActivities: 8,
            totalEducationHours: 240,
            totalGraduates: 12,
          },
        },
        activeEntities: [{ id: 1, nameAr: "مبادرة تعليمية", type: "initiative", color: "#2e7d6b" }],
        entityHighlights: [{
          entityId: 1,
          nameAr: "مبادرة تعليمية",
          type: "initiative",
          valueTotal: 120,
          metricNames: ["المستفيدون"],
          goalNames: ["توسيع الوصول التعليمي"],
          evidenceCount: 1,
        }],
        goalProgress: [{
          goalId: 1,
          nameAr: "توسيع الوصول التعليمي",
          actual: 120,
          target: 200,
          progress: 60,
          status: "amber",
          linkedMetricNames: ["المستفيدون"],
        }],
        evidence: [{
          id: 1,
          titleAr: "قصة أثر معتمدة",
          descriptionAr: "شاهد مختصر يصلح للداعمين.",
          url: "https://example.com/evidence",
          isDonorFacing: true,
        }],
      },
    };

    const html = renderToStaticMarkup(React.createElement(Infographic, { data }));

    expect(html).toContain("تقرير أثر الداعمين");
    expect(html).toContain("أين صنع الدعم أثرًا؟");
    expect(html).toContain("يُحسب هذا الهدف من:");
    expect(html).toContain("قصة أثر معتمدة");
  });

  it("keeps Arabic template selectors and PDF/PNG export buttons in preview", () => {
    const previewSource = readFileSync(
      path.resolve(import.meta.dirname, "../client/src/pages/Preview.tsx"),
      "utf8"
    );

    expect(previewSource).toContain("التقرير الشهري");
    expect(previewSource).toContain("تقرير أثر الداعمين");
    expect(previewSource).toContain("التقرير الاستراتيجي");
    expect(previewSource).toContain("تصدير صورة PNG");
    expect(previewSource).toContain("تصدير PDF");
  });
});
