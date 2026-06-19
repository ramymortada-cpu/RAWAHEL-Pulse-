import { trpc } from "@/lib/trpc";
import { KpiCard } from "@/components/KpiCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { monthName, type ReportSummary } from "@shared/departments";
import { PRODUCT_NAME_AR, PRODUCT_NAME_EN, PULSE_TERMS } from "@shared/pulse";
import { LOGO_NAVY } from "@/lib/brand";
import {
  Users,
  Layers,
  HeartHandshake,
  Clapperboard,
  Target,
  Plus,
  FileText,
  ArrowLeft,
} from "lucide-react";
import { useLocation } from "wouter";
import { useMemo } from "react";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: reports, isLoading } = trpc.reports.list.useQuery();

  // Aggregate the latest generated/draft report's summary as the headline
  const latest = useMemo(() => {
    if (!reports || reports.length === 0) return undefined;
    return reports[0];
  }, [reports]);
  const { data: pulseDashboard } = trpc.pulse.dashboard.useQuery(
    { reportId: latest?.id },
    { enabled: !!latest?.id }
  );

  const legacySummary = (latest?.summary as ReportSummary | undefined) ?? {
    totalBeneficiaries: 0,
    programsExecuted: 0,
    volunteers: 0,
    contentProduced: 0,
    goalAchievementRate: 0,
  };
  const summary: ReportSummary = {
    ...legacySummary,
    totalBeneficiaries: pulseDashboard?.totals.totalBeneficiaries ?? legacySummary.totalBeneficiaries,
    programsExecuted: pulseDashboard?.totals.totalActivities ?? legacySummary.programsExecuted,
    volunteers: pulseDashboard?.totals.totalVolunteerHours ?? legacySummary.volunteers,
    contentProduced: pulseDashboard?.totals.totalActivities ?? legacySummary.contentProduced,
    goalAchievementRate: pulseDashboard?.totals.goalAchievementRate ?? legacySummary.goalAchievementRate,
  };
  const trends = summary.trends ?? {};

  return (
    <div className="islamic-pattern min-h-screen">
      {/* Hero header */}
      <div
        className="relative overflow-hidden px-6 py-8 md:px-10 md:py-10"
        style={{
          background: "linear-gradient(135deg, #1b2a5e 0%, #2c3f7a 100%)",
        }}
      >
        <div className="islamic-pattern-gold absolute inset-0 opacity-60" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-white/95 p-3 shadow-lg">
              <img src={LOGO_NAVY} alt="رواحل" className="h-12 object-contain" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white">
                {PRODUCT_NAME_AR}
              </h1>
              <p className="text-white/70 mt-1 text-sm">
                {latest
                  ? `${PRODUCT_NAME_EN} · أحدث تقرير: ${monthName(latest.month)} ${latest.year}`
                  : "ابدأ بإنشاء أول تقرير شهري لقياس الأثر"}
              </p>
            </div>
          </div>
          <Button
            onClick={() => setLocation("/reports")}
            size="lg"
            className="bg-[#d4a843] hover:bg-[#e3c074] text-[#1b2a5e] font-bold shadow-lg"
          >
            <Plus className="h-5 w-5 ml-1" />
            إنشاء تقرير جديد
          </Button>
        </div>
      </div>

      <div className="px-6 py-8 md:px-10 max-w-7xl mx-auto">
        {/* KPI grid */}
        <h2 className="text-lg font-bold text-foreground mb-4">
          مؤشرات {PULSE_TERMS.impact}
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <KpiCard
              label="إجمالي المستفيدين"
              value={summary.totalBeneficiaries}
              trend={trends.totalBeneficiaries}
              icon={<Users className="h-6 w-6" />}
              accent="#1b2a5e"
            />
            <KpiCard
              label="البرامج المنفذة"
              value={summary.programsExecuted}
              trend={trends.programsExecuted}
              icon={<Layers className="h-6 w-6" />}
              accent="#4a90d9"
            />
            <KpiCard
              label="المتطوعون"
              value={summary.volunteers}
              trend={trends.volunteers}
              icon={<HeartHandshake className="h-6 w-6" />}
              accent="#8e44ad"
            />
            <KpiCard
              label="المحتوى المنتَج"
              value={summary.contentProduced}
              trend={trends.contentProduced}
              icon={<Clapperboard className="h-6 w-6" />}
              accent="#c0392b"
            />
            <KpiCard
              label="نسبة تحقيق الأهداف"
              value={summary.goalAchievementRate}
              suffix="%"
              trend={trends.goalAchievementRate}
              icon={<Target className="h-6 w-6" />}
              accent="#d4a843"
            />
          </div>
        )}

        {/* Recent reports */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">أحدث التقارير</h2>
            <Button
              variant="ghost"
              onClick={() => setLocation("/history")}
              className="text-[#1b2a5e] font-medium"
            >
              عرض الكل
              <ArrowLeft className="h-4 w-4 mr-1" />
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-2xl" />
              ))}
            </div>
          ) : !reports || reports.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/60 p-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground font-medium">
                لا توجد تقارير بعد
              </p>
              <Button
                onClick={() => setLocation("/reports")}
                className="mt-4 bg-[#1b2a5e] hover:bg-[#2c3f7a]"
              >
                <Plus className="h-4 w-4 ml-1" />
                إنشاء أول تقرير
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              {reports.slice(0, 5).map((r) => (
                <button
                  key={r.id}
                  onClick={() => setLocation(`/reports/${r.id}`)}
                  className="flex items-center justify-between rounded-2xl border border-border/60 bg-card p-4 text-right transition-all hover:shadow-md hover:border-[#4a90d9]/40"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl text-white font-bold"
                      style={{ backgroundColor: "#1b2a5e" }}
                    >
                      {monthName(r.month).charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-foreground">{r.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {r.status === "generated" ? "تم الإنشاء" : "مسودة"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.status === "generated" && (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                        جاهز
                      </span>
                    )}
                    <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
