import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useLocation, useRoute } from "wouter";
import { useMemo, useState } from "react";
import { ArrowRight, BarChart3, Building2, Target } from "lucide-react";
import * as Icons from "lucide-react";

const fmt = (value: number) => new Intl.NumberFormat("ar-EG").format(Math.round(value || 0));

function EntityIcon({ name, color }: { name?: string | null; color?: string | null }) {
  const Cmp = (Icons as any)[name || "Building2"] ?? Building2;
  return <Cmp className="h-6 w-6" style={{ color: color || "#1b2a5e" }} />;
}

export default function EntityDetail() {
  const [, params] = useRoute("/entities/:id");
  const [, setLocation] = useLocation();
  const entityId = Number(params?.id);
  const [reportId, setReportId] = useState<number | null>(null);
  const { data: master, isLoading } = trpc.pulse.masterData.useQuery();
  const { data: reports } = trpc.reports.list.useQuery();

  const effectiveReportId = reportId ?? reports?.[0]?.id ?? null;
  const { data: metrics } = trpc.pulse.metricsForEntity.useQuery(
    { entityId },
    { enabled: !!entityId }
  );
  const { data: values } = trpc.pulse.reportValues.useQuery(
    { reportId: effectiveReportId ?? 0 },
    { enabled: !!effectiveReportId }
  );

  const entity = master?.entities.find((item) => item.id === entityId);
  const linkedGoals = useMemo(() => {
    if (!master) return [];
    const ids = master.entityGoalLinks.filter((link) => link.entityId === entityId).map((link) => link.goalId);
    return master.goals.filter((goal) => ids.includes(goal.id));
  }, [entityId, master]);
  const linkedTracks = useMemo(() => {
    if (!master) return [];
    const ids = master.entityTrackLinks.filter((link) => link.entityId === entityId).map((link) => link.trackId);
    return master.tracks.filter((track) => ids.includes(track.id));
  }, [entityId, master]);
  const metricRows = (metrics ?? []).map((metric) => ({
    metric,
    value: (values ?? []).find(
      (row) => row.entityId === entityId && row.metricDefinitionId === metric.id
    ),
  }));
  const numericTotal = metricRows.reduce((sum, row) => sum + (Number(row.value?.valueNumber ?? 0) || 0), 0);

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-12 w-72 rounded-xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">الكيان غير موجود</p>
        <Button onClick={() => setLocation("/items")} className="mt-4">العودة للكيانات</Button>
      </div>
    );
  }

  return (
    <div className="islamic-pattern min-h-screen px-6 py-8 md:px-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <button onClick={() => setLocation("/items")} className="flex items-center gap-1 text-muted-foreground hover:text-[#1b2a5e] text-sm">
          <ArrowRight className="h-4 w-4" />
          العودة للكيانات
        </button>

        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: `${entity.color}18` }}>
                <EntityIcon name={entity.icon} color={entity.color} />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold text-[#1b2a5e]">{entity.nameAr}</h1>
                <p className="text-muted-foreground mt-2 max-w-2xl">{entity.descriptionAr || entity.ownerName || entity.key}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="outline">{entity.type}</Badge>
                  <Badge variant={entity.status === "active" ? "default" : "secondary"}>{entity.status}</Badge>
                </div>
              </div>
            </div>
            <Button onClick={() => setLocation(`/reports/${effectiveReportId ?? ""}`)} disabled={!effectiveReportId}>
              إدخال مؤشرات التقرير
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BarChart3 className="h-4 w-4" /> مجموع قيم التقرير
            </div>
            <div className="mt-2 text-3xl font-extrabold text-[#2e7d6b]">{fmt(numericTotal)}</div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="h-4 w-4" /> الأهداف المرتبطة
            </div>
            <div className="mt-2 text-3xl font-extrabold text-[#d4a843]">{fmt(linkedGoals.length)}</div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
            <div className="text-sm text-muted-foreground mb-2">التقرير المعروض</div>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={effectiveReportId ?? ""}
              onChange={(event) => setReportId(Number(event.target.value))}
            >
              {(reports ?? []).map((report) => (
                <option key={report.id} value={report.id}>{report.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-extrabold text-[#1b2a5e] mb-4">مؤشرات الكيان</h2>
            <div className="space-y-3">
              {metricRows.map((row) => (
                <div key={row.metric.id} className="grid grid-cols-[1fr_auto] gap-4 rounded-xl border border-border/60 p-4">
                  <div>
                    <div className="font-bold">{row.metric.nameAr}</div>
                    <div className="text-xs text-muted-foreground mt-1">{row.metric.key} · {row.metric.unit}</div>
                  </div>
                  <div className="text-left">
                    <div className="text-2xl font-extrabold text-[#1b2a5e]">
                      {row.value?.valueText || fmt(Number(row.value?.valueNumber ?? 0))}
                    </div>
                    {row.value?.notes && <div className="text-xs text-muted-foreground">{row.value.notes}</div>}
                  </div>
                </div>
              ))}
              {metricRows.length === 0 && <p className="text-muted-foreground">لا توجد مؤشرات معرفة لهذا الكيان.</p>}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
              <h3 className="font-extrabold text-[#1b2a5e] mb-3">المسارات</h3>
              <div className="flex flex-wrap gap-2">
                {linkedTracks.map((track) => <Badge key={track.id} variant="secondary">{track.nameAr}</Badge>)}
              </div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
              <h3 className="font-extrabold text-[#1b2a5e] mb-3">الأهداف</h3>
              <div className="space-y-2">
                {linkedGoals.map((goal) => (
                  <button key={goal.id} onClick={() => setLocation(`/goals/${goal.id}`)} className="w-full rounded-xl border border-border/60 p-3 text-right hover:bg-muted">
                    {goal.nameAr}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
