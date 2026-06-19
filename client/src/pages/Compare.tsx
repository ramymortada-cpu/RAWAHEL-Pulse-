import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEPARTMENTS, monthName } from "@shared/departments";
import { computeDepartmentComparison } from "@shared/comparison";
import {
  GitCompareArrows,
  Users,
  Layers,
  HeartHandshake,
  Clapperboard,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";

const NAVY = "#1b2a5e";
const GOLD = "#d4a843";

function fmt(v: number): string {
  return new Intl.NumberFormat("ar-EG").format(Math.round(v));
}

type Summary = {
  totalBeneficiaries: number;
  programsExecuted: number;
  volunteers: number;
  contentProduced: number;
  goalAchievementRate: number;
};

const EMPTY_SUMMARY: Summary = {
  totalBeneficiaries: 0,
  programsExecuted: 0,
  volunteers: 0,
  contentProduced: 0,
  goalAchievementRate: 0,
};

const KPI_DEFS: {
  key: keyof Summary;
  label: string;
  icon: React.ReactNode;
  suffix?: string;
}[] = [
  { key: "totalBeneficiaries", label: "إجمالي المستفيدين", icon: <Users className="h-4 w-4" /> },
  { key: "programsExecuted", label: "البرامج المنفذة", icon: <Layers className="h-4 w-4" /> },
  { key: "volunteers", label: "المتطوعون", icon: <HeartHandshake className="h-4 w-4" /> },
  { key: "contentProduced", label: "المحتوى المنتج", icon: <Clapperboard className="h-4 w-4" /> },
  { key: "goalAchievementRate", label: "نسبة تحقيق الأهداف", icon: <Target className="h-4 w-4" />, suffix: "%" },
];

function Delta({ a, b, isPercent }: { a: number; b: number; isPercent?: boolean }) {
  // b is the newer month, a is the older one
  const diff = b - a;
  const pct = isPercent
    ? diff // percentage points
    : a === 0
      ? b > 0
        ? 100
        : 0
      : Math.round(((b - a) / a) * 100);
  const isUp = diff > 0;
  const isFlat = diff === 0;
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold " +
        (isFlat
          ? "bg-muted text-muted-foreground"
          : isUp
            ? "bg-emerald-100 text-emerald-700"
            : "bg-red-100 text-red-700")
      }
      dir="ltr"
    >
      {isFlat ? (
        <Minus className="h-3 w-3" />
      ) : isUp ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {isUp ? "+" : ""}
      {isPercent ? `${diff} نقطة` : `${pct}%`}
    </span>
  );
}

export default function Compare() {
  const { data: reports, isLoading: loadingList } = trpc.reports.list.useQuery();

  const [idA, setIdA] = useState<number | null>(null);
  const [idB, setIdB] = useState<number | null>(null);

  // Default selection: the two most recent reports (B = newest, A = previous)
  useEffect(() => {
    if (reports && reports.length >= 2 && idA === null && idB === null) {
      setIdB(reports[0].id);
      setIdA(reports[1].id);
    }
  }, [reports, idA, idB]);

  const canCompare = idA !== null && idB !== null && idA !== idB;

  const { data, isLoading } = trpc.reports.compare.useQuery(
    { idA: idA ?? 0, idB: idB ?? 0 },
    { enabled: canCompare }
  );
  const { data: pulseA } = trpc.pulse.dashboard.useQuery(
    { reportId: idA ?? undefined },
    { enabled: !!idA }
  );
  const { data: pulseB } = trpc.pulse.dashboard.useQuery(
    { reportId: idB ?? undefined },
    { enabled: !!idB }
  );

  const summaryA = (data?.a.report.summary as Summary | undefined) ?? EMPTY_SUMMARY;
  const summaryB = (data?.b.report.summary as Summary | undefined) ?? EMPTY_SUMMARY;

  // Per-department beneficiary comparison (uses shared, tested helper)
  const deptRows = useMemo(() => {
    if (!data) return [];
    const cmp = computeDepartmentComparison(data.a.departments, data.b.departments);
    return cmp.map((row) => {
      const def = DEPARTMENTS.find((d) => d.key === row.key)!;
      return {
        key: row.key,
        name: def.name,
        benA: row.beneficiariesA,
        benB: row.beneficiariesB,
      };
    });
  }, [data]);

  const maxBen = useMemo(
    () => Math.max(1, ...deptRows.flatMap((r) => [r.benA, r.benB])),
    [deptRows]
  );

  const labelA = data ? `${monthName(data.a.report.month)} ${data.a.report.year}` : "";
  const labelB = data ? `${monthName(data.b.report.month)} ${data.b.report.year}` : "";

  return (
    <div className="islamic-pattern min-h-screen">
      {/* Header */}
      <div
        className="relative overflow-hidden px-6 py-8 md:px-10"
        style={{ background: "linear-gradient(135deg, #1b2a5e 0%, #2c3f7a 100%)" }}
      >
        <div className="islamic-pattern-gold absolute inset-0 opacity-60" />
        <div className="relative flex items-center gap-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md"
            style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
          >
            <GitCompareArrows className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">
              مقارنة تقارير نبض رواحل
            </h1>
            <p className="text-white/70 mt-1 text-sm">
              قارن أداء تقريرين من حيث الكيانات والمؤشرات والأهداف
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-8 md:px-10 max-w-6xl mx-auto">
        {/* Selectors */}
        {loadingList ? (
          <Skeleton className="h-16 rounded-2xl" />
        ) : !reports || reports.length < 2 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-12 text-center">
            <GitCompareArrows className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-lg font-bold text-foreground">تحتاج تقريرين على الأقل</p>
            <p className="text-muted-foreground mt-1">
              أنشئ تقريرين شهريين على الأقل لتتمكن من المقارنة بينهما
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                <label className="text-xs font-bold text-muted-foreground mb-2 block">
                  الشهر الأول (الأقدم)
                </label>
                <Select
                  value={idA?.toString() ?? ""}
                  onValueChange={(v) => setIdA(Number(v))}
                >
                  <SelectTrigger className="h-11 font-bold text-[#1b2a5e]">
                    <SelectValue placeholder="اختر تقريرًا" />
                  </SelectTrigger>
                  <SelectContent>
                    {reports.map((r) => (
                      <SelectItem key={r.id} value={r.id.toString()}>
                        {monthName(r.month)} {r.year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-2xl border-2 p-4 shadow-sm" style={{ borderColor: GOLD, background: "#fffdf6" }}>
                <label className="text-xs font-bold text-muted-foreground mb-2 block">
                  الشهر الثاني (الأحدث)
                </label>
                <Select
                  value={idB?.toString() ?? ""}
                  onValueChange={(v) => setIdB(Number(v))}
                >
                  <SelectTrigger className="h-11 font-bold text-[#1b2a5e]">
                    <SelectValue placeholder="اختر تقريرًا" />
                  </SelectTrigger>
                  <SelectContent>
                    {reports.map((r) => (
                      <SelectItem key={r.id} value={r.id.toString()}>
                        {monthName(r.month)} {r.year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {idA === idB && idA !== null && (
              <p className="text-center text-amber-700 bg-amber-50 rounded-xl py-3 mb-6 text-sm font-medium">
                اختر شهرين مختلفين للمقارنة
              </p>
            )}

            {canCompare && isLoading && (
              <div className="space-y-4">
                <Skeleton className="h-40 rounded-2xl" />
                <Skeleton className="h-64 rounded-2xl" />
              </div>
            )}

            {canCompare && data && (
              <>
                {/* KPI comparison */}
                <h2 className="text-lg font-bold text-foreground mb-4">
                  مقارنة مؤشرات Pulse الإجمالية
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {[
                    { label: "المستفيدون", a: pulseA?.totals.totalBeneficiaries ?? summaryA.totalBeneficiaries, b: pulseB?.totals.totalBeneficiaries ?? summaryB.totalBeneficiaries },
                    { label: "الكيانات النشطة", a: pulseA?.activeEntities.length ?? 0, b: pulseB?.activeEntities.length ?? 0 },
                    { label: "أدلة الداعمين", a: pulseA?.totals.donorFacingEvidenceCount ?? 0, b: pulseB?.totals.donorFacingEvidenceCount ?? 0 },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
                      <div className="text-sm font-bold text-muted-foreground">{item.label}</div>
                      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">{labelA}</div>
                          <div className="text-2xl font-extrabold text-slate-500">{fmt(item.a)}</div>
                        </div>
                        <Delta a={item.a} b={item.b} />
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">{labelB}</div>
                          <div className="text-2xl font-extrabold text-[#1b2a5e]">{fmt(item.b)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <h2 className="text-lg font-bold text-foreground mb-4">
                  مقارنة legacy summary
                </h2>
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm mb-8">
                  {/* table header */}
                  <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] bg-[#1b2a5e] text-white text-sm font-bold">
                    <div className="px-4 py-3">المؤشر</div>
                    <div className="px-4 py-3 text-center">{labelA}</div>
                    <div className="px-4 py-3 text-center" style={{ color: GOLD }}>
                      {labelB}
                    </div>
                    <div className="px-4 py-3 text-center">التغير</div>
                  </div>
                  {KPI_DEFS.map((k, i) => {
                    const va = summaryA[k.key] ?? 0;
                    const vb = summaryB[k.key] ?? 0;
                    return (
                      <div
                        key={k.key}
                        className={
                          "grid grid-cols-[1.4fr_1fr_1fr_1fr] items-center text-sm " +
                          (i % 2 ? "bg-muted/30" : "bg-card")
                        }
                      >
                        <div className="px-4 py-3 flex items-center gap-2 font-medium text-foreground">
                          <span
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-white"
                            style={{ backgroundColor: NAVY }}
                          >
                            {k.icon}
                          </span>
                          {k.label}
                        </div>
                        <div className="px-4 py-3 text-center font-bold text-foreground/80">
                          {fmt(va)}
                          {k.suffix}
                        </div>
                        <div className="px-4 py-3 text-center font-extrabold text-[#1b2a5e]">
                          {fmt(vb)}
                          {k.suffix}
                        </div>
                        <div className="px-4 py-3 flex justify-center">
                          <Delta a={va} b={vb} isPercent={k.key === "goalAchievementRate"} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legacy department beneficiary bars retained for older reports. */}
                <h2 className="text-lg font-bold text-foreground mb-4">
                  تفصيل المستفيدين legacy
                </h2>
                <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-5 md:p-6 space-y-5">
                  <div className="flex items-center justify-end gap-5 text-xs font-medium">
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-sm" style={{ background: "#9aa6c9" }} />
                      {labelA}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-sm" style={{ background: NAVY }} />
                      {labelB}
                    </span>
                  </div>
                  {deptRows.map((r) => (
                    <div key={r.key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-bold text-foreground">{r.name}</span>
                        <Delta a={r.benA} b={r.benB} />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${(r.benA / maxBen) * 100}%`,
                                background: "#9aa6c9",
                              }}
                            />
                          </div>
                          <span className="text-xs font-bold text-muted-foreground w-14 text-left" dir="ltr">
                            {fmt(r.benA)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${(r.benB / maxBen) * 100}%`,
                                background: NAVY,
                              }}
                            />
                          </div>
                          <span className="text-xs font-bold text-[#1b2a5e] w-14 text-left" dir="ltr">
                            {fmt(r.benB)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
