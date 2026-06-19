import { forwardRef } from "react";
import {
  DEPARTMENTS,
  DEPARTMENT_MAP,
  monthName,
  type ReportSummary,
} from "@shared/departments";
import { itemBeneficiaries, itemIconName, getItemHighlight } from "@shared/items";
import { LOGO_WHITE, LOGO_NAVY } from "@/lib/brand";
import { IslamicPatternBand, StarRosette, GoldDivider } from "./Decor";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import * as Icons from "lucide-react";

export type InfographicData = {
  title: string;
  month: number;
  year: number;
  templateKey?: "monthly" | "donor" | "annual";
  audience?: string;
  summary: ReportSummary;
  departments: {
    departmentKey: string;
    metrics: Record<string, number>;
    achievements: string[];
  }[];
  /** Named sub-items per department. */
  items?: {
    departmentKey: string;
    itemKey: string;
    itemNameAr: string;
    itemType: string;
    metrics: Record<string, number>;
  }[];
  /** Optional monthly beneficiary growth series (last months). */
  monthlyGrowth?: { label: string; value: number }[];
  pulse?: {
    totals: {
      totalBeneficiaries?: number;
      programsExecuted?: number;
      volunteers?: number;
      contentProduced?: number;
      goalAchievementRate?: number;
      totalEvidenceAssets?: number;
      donorFacingEvidenceCount?: number;
    };
    activeEntities: { id: number; nameAr: string; type: string; color?: string | null }[];
    goalProgress: { goalId: number; nameAr: string; actual: number; target: number; progress: number; status: string }[];
    evidence: { id: number; titleAr: string; descriptionAr?: string | null; url: string; isDonorFacing: boolean }[];
  };
};

function nf(n: number) {
  return new Intl.NumberFormat("ar-EG").format(n || 0);
}

function DeptIcon({ name, color }: { name: string; color: string }) {
  const Cmp = (Icons as any)[name] ?? Icons.Building2;
  return <Cmp className="h-5 w-5" style={{ color }} />;
}

function ItemIcon({ name, color }: { name: string; color: string }) {
  const Cmp = (Icons as any)[name] ?? Icons.CircleDot;
  return <Cmp style={{ color, width: 12, height: 12 }} />;
}

/**
 * A4 portrait infographic. Fixed width 794px (~210mm @ 96dpi).
 * Rendered to PDF via html2canvas. Keep all colors inline / hex to avoid
 * oklch parsing issues in html2canvas.
 */
export const Infographic = forwardRef<HTMLDivElement, { data: InfographicData }>(
  ({ data }, ref) => {
    const { summary } = data;
    const templateKey = data.templateKey ?? "monthly";
    const templateTitle =
      templateKey === "donor"
        ? "تقرير أثر الداعمين"
        : templateKey === "annual"
          ? "التقرير السنوي للأثر"
          : "التقرير الشهري للإنجازات";
    const pulseTotals = data.pulse?.totals;
    const displaySummary = {
      totalBeneficiaries: pulseTotals?.totalBeneficiaries ?? summary.totalBeneficiaries,
      programsExecuted: pulseTotals?.programsExecuted ?? summary.programsExecuted,
      volunteers: pulseTotals?.volunteers ?? summary.volunteers,
      contentProduced: pulseTotals?.contentProduced ?? summary.contentProduced,
      goalAchievementRate: pulseTotals?.goalAchievementRate ?? summary.goalAchievementRate,
    };

    // Build beneficiary distribution for pie (top departments)
    const beneficiaryDist = DEPARTMENTS.map((d) => {
      const found = data.departments.find((x) => x.departmentKey === d.key);
      return {
        name: d.shortName,
        value: found?.metrics?.beneficiaries ?? 0,
        color: d.color,
      };
    }).filter((x) => x.value > 0);

    // Goal achievement per department (progress bars)
    const goalRows = DEPARTMENTS.map((d) => {
      const found = data.departments.find((x) => x.departmentKey === d.key);
      const target = found?.metrics?.goalTarget ?? 0;
      const achieved = found?.metrics?.goalAchieved ?? 0;
      const pct = target > 0 ? Math.min(100, Math.round((achieved / target) * 100)) : 0;
      return { name: d.name, color: d.color, pct, target, achieved, has: !!found };
    }).filter((x) => x.has && (x.target > 0 || x.achieved > 0));

    // Programs per department for bar chart
    const programRows = DEPARTMENTS.map((d) => {
      const found = data.departments.find((x) => x.departmentKey === d.key);
      return {
        name: d.shortName,
        programs: found?.metrics?.programs ?? 0,
        color: d.color,
      };
    }).filter((x) => x.programs > 0);

    const growthRows = data.monthlyGrowth ?? [];
    const hasGrowth = growthRows.length >= 2;

    const filledDepts = data.departments
      .map((dd) => ({ def: DEPARTMENT_MAP[dd.departmentKey], data: dd }))
      .filter((x) => x.def);

    // Group named items by department, sorted by beneficiaries desc.
    const itemsByDept: Record<string, { name: string; value: number; icon: string; highlight: string }[]> = {};
    for (const it of data.items ?? []) {
      const ben = itemBeneficiaries(it.departmentKey, it.itemKey, it.metrics ?? {});
      const list = itemsByDept[it.departmentKey] ?? [];
      list.push({
        name: it.itemNameAr,
        value: ben,
        icon: itemIconName(it.departmentKey, it.itemKey, it.itemType),
        highlight: getItemHighlight(it.metrics ?? {}),
      });
      itemsByDept[it.departmentKey] = list;
    }
    for (const k of Object.keys(itemsByDept)) {
      itemsByDept[k].sort((a, b) => b.value - a.value);
    }

    return (
      <div
        ref={ref}
        style={{
          width: 794,
          backgroundColor: "#f7f2e7",
          color: "#16213e",
          fontFamily: "Tajawal, Cairo, sans-serif",
          direction: "rtl",
        }}
      >
        {/* ===== HEADER ===== */}
        <div
          style={{
            position: "relative",
            background: "linear-gradient(135deg, #1b2a5e 0%, #2c3f7a 100%)",
            padding: "32px 40px 28px",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", inset: 0, opacity: 0.5 }}>
            <IslamicPatternBand color="#d4a843" opacity={0.25} />
          </div>
          <div style={{ position: "absolute", top: -20, left: -20 }}>
            <StarRosette size={120} color="#d4a843" opacity={0.25} />
          </div>
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  color: "#d4a843",
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: 1,
                }}
              >
                {templateTitle}
              </div>
              <div
                style={{
                  color: "#ffffff",
                  fontSize: 34,
                  fontWeight: 800,
                  marginTop: 4,
                  lineHeight: 1.1,
                }}
              >
                {monthName(data.month)} {data.year}
              </div>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 6 }}>
                مؤسسة رواحل · RAWAHEL Pulse · تقرير موحد للكيانات والأهداف
              </div>
            </div>
            <div
              style={{
                backgroundColor: "rgba(255,255,255,0.95)",
                borderRadius: 16,
                padding: "12px 16px",
              }}
            >
              <img src={LOGO_NAVY} alt="رواحل" style={{ height: 48, objectFit: "contain" }} />
            </div>
          </div>
        </div>

        {/* ===== KPI ROW ===== */}
        <div style={{ padding: "24px 32px 8px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 12,
            }}
          >
            {[
              { label: "المستفيدون", value: displaySummary.totalBeneficiaries, color: "#1b2a5e", icon: "Users" },
              { label: "البرامج المنفذة", value: displaySummary.programsExecuted, color: "#4a90d9", icon: "Layers" },
              { label: "المتطوعون", value: displaySummary.volunteers, color: "#8e44ad", icon: "HeartHandshake" },
              { label: "المحتوى المنتَج", value: displaySummary.contentProduced, color: "#c0392b", icon: "Clapperboard" },
              { label: "تحقيق الأهداف", value: displaySummary.goalAchievementRate, suffix: "%", color: "#d4a843", icon: "Target" },
            ].map((k, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: 14,
                  padding: "14px 12px",
                  boxShadow: "0 2px 8px rgba(27,42,94,0.06)",
                  borderTop: `3px solid ${k.color}`,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: k.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 8px",
                  }}
                >
                  <DeptIcon name={k.icon} color="#ffffff" />
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#16213e" }}>
                  {nf(k.value)}
                  {k.suffix && <span style={{ fontSize: 15 }}>{k.suffix}</span>}
                </div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2, fontWeight: 500 }}>
                  {k.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== CHARTS ROW ===== */}
        <div style={{ padding: "16px 32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Pie: beneficiary distribution */}
          <div style={{ backgroundColor: "#ffffff", borderRadius: 16, padding: 16, boxShadow: "0 2px 8px rgba(27,42,94,0.06)" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1b2a5e", marginBottom: 4 }}>
              توزيع المستفيدين على الكيانات
            </div>
            <GoldDivider />
            <div style={{ height: 200, marginTop: 8 }}>
              {beneficiaryDist.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={beneficiaryDist}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                      isAnimationActive={false}
                    >
                      {beneficiaryDist.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 4 }}>
              {beneficiaryDist.slice(0, 6).map((b, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: b.color, display: "inline-block" }} />
                  <span style={{ color: "#4b5563" }}>{b.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bar: monthly beneficiary growth (falls back to programs per dept) */}
          <div style={{ backgroundColor: "#ffffff", borderRadius: 16, padding: 16, boxShadow: "0 2px 8px rgba(27,42,94,0.06)" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1b2a5e", marginBottom: 4 }}>
              {hasGrowth ? "نمو المستفيدين عبر الأشهر" : "البرامج والأنشطة لكل قسم"}
            </div>
            <GoldDivider />
            <div style={{ height: 230, marginTop: 8 }}>
              {hasGrowth ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={growthRows} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#4b5563" }} interval={0} height={30} />
                    <YAxis tick={{ fontSize: 9, fill: "#4b5563" }} width={30} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#4a90d9" isAnimationActive={false}>
                      {growthRows.map((_, i) => (
                        <Cell
                          key={i}
                          fill={i === growthRows.length - 1 ? "#d4a843" : "#4a90d9"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : programRows.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={programRows} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#4b5563" }} interval={0} angle={-25} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 9, fill: "#4b5563" }} width={24} />
                    <Tooltip />
                    <Bar dataKey="programs" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                      {programRows.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </div>
          </div>
        </div>

        {/* ===== GOAL ACHIEVEMENT PROGRESS ===== */}
        <div style={{ padding: "8px 32px 16px" }}>
          <div style={{ backgroundColor: "#ffffff", borderRadius: 16, padding: 18, boxShadow: "0 2px 8px rgba(27,42,94,0.06)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1b2a5e", marginBottom: 4 }}>
              نسب تحقيق الأهداف
            </div>
            <GoldDivider />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px", marginTop: 14 }}>
              {goalRows.map((g, i) => (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#16213e" }}>{g.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: g.color }}>{g.pct}%</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 6, backgroundColor: "#eef0f4", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${g.pct}%`, borderRadius: 6, backgroundColor: g.color }} />
                  </div>
                </div>
              ))}
              {goalRows.length === 0 && (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", color: "#9ca3af", fontSize: 12, padding: 16 }}>
                  لم يتم إدخال أهداف بعد
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== DEPARTMENT ACHIEVEMENT CARDS ===== */}
        <div style={{ padding: "0 32px 24px" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#1b2a5e", marginBottom: 10, textAlign: "center" }}>
            تفصيل الكيانات والعناصر
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "stretch" }}>
            {filledDepts.map(({ def, data: dd }) => (
              <div
                key={def.key}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: 14,
                  padding: 14,
                  boxShadow: "0 2px 8px rgba(27,42,94,0.06)",
                  borderRight: `4px solid ${def.color}`,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: `${def.color}18`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <DeptIcon name={def.icon} color={def.color} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#16213e", lineHeight: 1.25 }}>{def.name}</span>
                </div>
                {/* mini stats in a separated soft box */}
                {(dd.metrics?.beneficiaries || dd.metrics?.programs) ? (
                  <div
                    style={{
                      display: "flex",
                      gap: 18,
                      marginBottom: 10,
                      padding: "8px 12px",
                      backgroundColor: "#f7f8fb",
                      borderRadius: 10,
                    }}
                  >
                    {dd.metrics?.beneficiaries ? (
                      <MiniStat label="مستفيد" value={dd.metrics.beneficiaries} color={def.color} />
                    ) : null}
                    {dd.metrics?.programs ? (
                      <MiniStat label="برنامج" value={dd.metrics.programs} color={def.color} />
                    ) : null}
                  </div>
                ) : null}
                {(itemsByDept[def.key] ?? []).filter((x) => x.value > 0).length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {(itemsByDept[def.key] ?? [])
                      .filter((x) => x.value > 0)
                      .slice(0, 5)
                      .map((it, i) => (
                        <div
                          key={i}
                          style={{
                            borderBottom: "1px solid #f0f1f5",
                            paddingBottom: 4,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 8,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                              <span
                                style={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: 6,
                                  backgroundColor: `${def.color}18`,
                                  flexShrink: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <ItemIcon name={it.icon} color={def.color} />
                              </span>
                              <span
                                style={{
                                  fontSize: 11,
                                  color: "#374151",
                                  fontWeight: 600,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {it.name}
                              </span>
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 800, color: def.color, flexShrink: 0 }}>
                              {nf(it.value)}
                            </span>
                          </div>
                          {it.highlight ? (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                marginTop: 3,
                                paddingRight: 27,
                              }}
                            >
                              <Icons.Award style={{ width: 10, height: 10, color: "#d4a843", flexShrink: 0 }} />
                              <span
                                style={{
                                  fontSize: 9.5,
                                  color: "#a07d1f",
                                  fontWeight: 600,
                                  fontStyle: "italic",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {it.highlight}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>لا توجد عناصر مسجلة</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {templateKey === "donor" && data.pulse ? (
          <div style={{ padding: "8px 32px 20px" }}>
            <div style={{ backgroundColor: "#ffffff", borderRadius: 16, padding: 18, boxShadow: "0 2px 8px rgba(27,42,94,0.06)", borderRight: "5px solid #d4a843" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#1b2a5e" }}>أثر الداعمين</div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>أرقام قابلة للمشاركة مع قصص وأدلة مختارة</div>
                </div>
                <div style={{ display: "flex", gap: 18 }}>
                  <MiniStat label="كيانات نشطة" value={data.pulse.activeEntities.length} color="#1b2a5e" />
                  <MiniStat label="أدلة داعمين" value={data.pulse.totals.donorFacingEvidenceCount ?? 0} color="#d4a843" />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {data.pulse.evidence.filter((item) => item.isDonorFacing).slice(0, 3).map((item) => (
                  <div key={item.id} style={{ border: "1px solid #eadfbd", borderRadius: 12, padding: 12, backgroundColor: "#fffdf6", minHeight: 84 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#1b2a5e", lineHeight: 1.4 }}>{item.titleAr}</div>
                    <div style={{ fontSize: 10, color: "#6b7280", marginTop: 5, lineHeight: 1.5 }}>
                      {item.descriptionAr || "دليل موثق قابل للمراجعة"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {templateKey === "annual" && data.pulse ? (
          <div style={{ padding: "8px 32px 20px" }}>
            <div style={{ backgroundColor: "#ffffff", borderRadius: 16, padding: 18, boxShadow: "0 2px 8px rgba(27,42,94,0.06)" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#1b2a5e", marginBottom: 12 }}>تقدم الأهداف الاستراتيجية</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {data.pulse.goalProgress.slice(0, 6).map((goal) => (
                  <div key={goal.goalId} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11, fontWeight: 800, color: "#16213e" }}>
                      <span>{goal.nameAr}</span>
                      <span style={{ color: goal.status === "green" ? "#15803d" : goal.status === "amber" ? "#b45309" : "#b91c1c" }}>{nf(goal.progress)}%</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, backgroundColor: "#eef2f7", marginTop: 8, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(100, goal.progress)}%`, borderRadius: 999, backgroundColor: goal.status === "green" ? "#2e7d6b" : goal.status === "amber" ? "#d4a843" : "#c0392b" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {/* ===== FOOTER ===== */}
        <div
          style={{
            position: "relative",
            background: "linear-gradient(135deg, #1b2a5e 0%, #2c3f7a 100%)",
            padding: "18px 40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", inset: 0, opacity: 0.4 }}>
            <IslamicPatternBand color="#d4a843" opacity={0.2} />
          </div>
          <img src={LOGO_WHITE} alt="رواحل" style={{ height: 30, objectFit: "contain", position: "relative" }} />
          <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, position: "relative" }}>
            تقرير {monthName(data.month)} {data.year} · مؤسسة رواحل
          </div>
        </div>
      </div>
    );
  }
);

Infographic.displayName = "Infographic";

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
      <div style={{ fontSize: 16, fontWeight: 800, color, lineHeight: 1.3, paddingBottom: 2 }}>{nf(value)}</div>
      <div style={{ fontSize: 9, color: "#6b7280", lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#9ca3af",
        fontSize: 12,
      }}
    >
      لا توجد بيانات كافية
    </div>
  );
}
