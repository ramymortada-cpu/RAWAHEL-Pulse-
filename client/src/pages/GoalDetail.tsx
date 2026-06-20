import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useLocation, useRoute } from "wouter";
import { ArrowRight, Building2, Target } from "lucide-react";
import * as Icons from "lucide-react";

const fmt = (value: number) => new Intl.NumberFormat("ar-EG").format(Math.round(value || 0));

function EntityIcon({ name, color }: { name?: string | null; color?: string | null }) {
  const Cmp = (Icons as any)[name || "Building2"] ?? Building2;
  return <Cmp className="h-4 w-4" style={{ color: color || "#1b2a5e" }} />;
}

export default function GoalDetail() {
  const [, params] = useRoute("/goals/:id");
  const [, setLocation] = useLocation();
  const goalId = Number(params?.id);
  const { data: master, isLoading } = trpc.pulse.masterData.useQuery();
  const { data: dashboard } = trpc.pulse.dashboard.useQuery();

  const goal = master?.goals.find((item) => item.id === goalId);
  const track = master?.tracks.find((item) => item.id === goal?.trackId);
  const linkedEntityIds = (master?.entityGoalLinks ?? [])
    .filter((link) => link.goalId === goalId)
    .map((link) => link.entityId);
  const entities = (master?.entities ?? []).filter((entity) => linkedEntityIds.includes(entity.id));
  const progress = dashboard?.goalProgress.find((item) => item.goalId === goalId);
  const linkedMetricNames = progress?.linkedMetricNames ?? [];

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-12 w-72 rounded-xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">الهدف غير موجود</p>
        <Button onClick={() => setLocation("/pulse")} className="mt-4">العودة لنبض رواحل</Button>
      </div>
    );
  }

  const pct = Math.min(100, Math.max(0, Math.round(progress?.progress ?? 0)));

  return (
    <div className="islamic-pattern min-h-screen px-6 py-8 md:px-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <button onClick={() => setLocation("/pulse")} className="flex items-center gap-1 text-muted-foreground hover:text-[#1b2a5e] text-sm">
          <ArrowRight className="h-4 w-4" />
          العودة لنبض رواحل
        </button>

        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#d4a843]/15">
              <Target className="h-7 w-7 text-[#d4a843]" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-[#1b2a5e]">{goal.nameAr}</h1>
              <p className="text-muted-foreground mt-2">{goal.descriptionAr}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {track && <Badge variant="secondary">{track.nameAr}</Badge>}
                <Badge variant="outline">{goal.periodType}</Badge>
                <Badge variant="outline">{goal.targetUnit}</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div>
              <h2 className="font-extrabold text-[#1b2a5e]">تقدم الهدف</h2>
              <p className="text-sm text-muted-foreground">
                هذا الهدف يُحسب من هذه المؤشرات:{" "}
                {linkedMetricNames.length > 0 ? linkedMetricNames.join("، ") : "لم يتم ربط مؤشرات بعد"}
              </p>
            </div>
            <div className="text-3xl font-extrabold text-[#2e7d6b]">{fmt(pct)}%</div>
          </div>
          <div className="h-4 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-[#2e7d6b]" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-xl bg-muted/40 p-3">
              <div className="text-muted-foreground">القيمة الحالية</div>
              <div className="font-extrabold">{fmt(progress?.actual ?? 0)}</div>
            </div>
            <div className="rounded-xl bg-muted/40 p-3">
              <div className="text-muted-foreground">المستهدف</div>
              <div className="font-extrabold">{fmt(goal.targetValue)} {goal.targetUnit}</div>
            </div>
          </div>
          <div className="mt-4 rounded-xl bg-[#f7f2e7] p-3 text-sm text-[#1b2a5e]">
            كل نسبة استراتيجية هنا قابلة للتفسير لأنها تعتمد فقط على روابط
            <span className="font-bold"> goal_metric_links </span>
            الخاصة بهذا الهدف.
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <h2 className="font-extrabold text-[#1b2a5e] mb-4">الكيانات المسؤولة أو المساهمة</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {entities.map((entity) => (
              <button
                key={entity.id}
                onClick={() => setLocation(`/entities/${entity.id}`)}
                className="flex items-center gap-3 rounded-xl border border-border/60 p-4 text-right hover:bg-muted"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${entity.color}18` }}>
                  <EntityIcon name={entity.icon} color={entity.color} />
                </span>
                <span className="font-bold">{entity.nameAr}</span>
              </button>
            ))}
            {entities.length === 0 && <p className="text-muted-foreground">لا توجد كيانات مرتبطة بهذا الهدف بعد.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
