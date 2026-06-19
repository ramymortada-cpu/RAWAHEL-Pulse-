export const PRODUCT_NAME_EN = "RAWAHEL Pulse";
export const PRODUCT_NAME_AR = "نبض رواحل";

export const PULSE_TERMS = {
  strategicTracks: "المسارات الاستراتيجية",
  strategicGoals: "الأهداف الاستراتيجية",
  entities: "الكيانات التنفيذية",
  metrics: "مؤشرات الأداء",
  impact: "قياس الأثر",
  evidence: "شواهد الإنجاز",
  donorReports: "تقارير الداعمين",
  goalAchievement: "نسبة تحقيق الهدف",
  monthlyReport: "التقرير الشهري",
  quarterlyReport: "التقرير الربع سنوي",
  semiannualReport: "التقرير نصف السنوي",
  annualReport: "التقرير السنوي",
} as const;

export const REPORT_AUDIENCE_LABELS = {
  internal: "داخلي",
  donor: "الداعمون",
  board: "مجلس الإدارة",
  public: "عام",
} as const;

export const REPORT_PERIOD_LABELS = {
  monthly: "شهري",
  quarterly: "ربع سنوي",
  semiannual: "نصف سنوي",
  annual: "سنوي",
} as const;

export function pulseExportFileName(
  templateKey: "monthly" | "donor" | "annual" | string,
  period: string,
  extension: "pdf" | "png"
) {
  return `rawahel-pulse-${templateKey}-${period}.${extension}`;
}
