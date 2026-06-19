import { trpc } from "@/lib/trpc";
import { useRoute, useLocation } from "wouter";
import { monthName } from "@shared/departments";
import { REPORT_AUDIENCE_LABELS, REPORT_PERIOD_LABELS } from "@shared/pulse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Circle,
  Eye,
  FileSpreadsheet,
  Link2,
  RefreshCw,
  Save,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import * as Icons from "lucide-react";

function EntityIcon({ name, color }: { name?: string | null; color?: string | null }) {
  const Cmp = (Icons as any)[name || "Building2"] ?? Building2;
  return <Cmp className="h-5 w-5" style={{ color: color || "#1b2a5e" }} />;
}

export default function ReportDetail() {
  const [, params] = useRoute("/reports/:id");
  const [, setLocation] = useLocation();
  const reportId = Number(params?.id);
  const utils = trpc.useUtils();
  const [activeEntityId, setActiveEntityId] = useState<number | null>(null);
  const [values, setValues] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceDescription, setEvidenceDescription] = useState("");

  const { data, isLoading } = trpc.reports.get.useQuery(
    { id: reportId },
    { enabled: !!reportId }
  );
  const { data: master, isLoading: loadingMaster } = trpc.pulse.masterData.useQuery();
  const { data: reportValues } = trpc.pulse.reportValues.useQuery(
    { reportId },
    { enabled: !!reportId }
  );
  const { data: metrics, isLoading: loadingMetrics } = trpc.pulse.metricsForEntity.useQuery(
    { entityId: activeEntityId ?? 0 },
    { enabled: !!activeEntityId }
  );

  const seedAllMutation = trpc.reports.seedBaseline.useMutation({
    onSuccess: ({ seeded }) => {
      utils.reports.get.invalidate({ id: reportId });
      toast.success(`تم إدراج ${seeded} عنصر legacy احتياطي`);
    },
    onError: (error) => toast.error(error.message),
  });

  const syncMutation = trpc.reports.syncFromSheet.useMutation({
    onSuccess: ({ imported }) => {
      utils.pulse.reportValues.invalidate({ reportId });
      utils.pulse.dashboard.invalidate({ reportId });
      toast.success(`تم استيراد ${imported} صف من Google Sheets`);
    },
    onError: (error) => toast.error(error.message),
  });

  const saveMutation = trpc.pulse.saveMetricValues.useMutation({
    onSuccess: ({ saved }) => {
      utils.pulse.reportValues.invalidate({ reportId });
      utils.pulse.dashboard.invalidate({ reportId });
      toast.success(`تم حفظ ${saved} مؤشر`);
    },
    onError: (error) => toast.error(error.message),
  });

  const evidenceMutation = trpc.pulse.addEvidence.useMutation({
    onSuccess: () => {
      setEvidenceTitle("");
      setEvidenceUrl("");
      setEvidenceDescription("");
      toast.success("تم حفظ الدليل/القصة");
    },
    onError: (error) => toast.error(error.message),
  });

  const entities = useMemo(
    () => (master?.entities ?? []).filter((entity) => entity.isActive),
    [master?.entities]
  );

  useEffect(() => {
    if (activeEntityId === null && entities.length > 0) {
      setActiveEntityId(entities[0].id);
    }
  }, [activeEntityId, entities]);

  const activeEntity = entities.find((entity) => entity.id === activeEntityId) ?? null;
  const completedEntityIds = useMemo(() => {
    const set = new Set<number>();
    for (const value of reportValues ?? []) set.add(value.entityId);
    return set;
  }, [reportValues]);

  useEffect(() => {
    const nextValues: Record<number, string> = {};
    const nextNotes: Record<number, string> = {};
    for (const metric of metrics ?? []) {
      const stored = (reportValues ?? []).find(
        (value) => value.entityId === activeEntityId && value.metricDefinitionId === metric.id
      );
      if (stored?.valueNumber !== null && stored?.valueNumber !== undefined) {
        nextValues[metric.id] = String(stored.valueNumber);
      } else if (stored?.valueText) {
        nextValues[metric.id] = stored.valueText;
      } else {
        nextValues[metric.id] = "";
      }
      nextNotes[metric.id] = stored?.notes ?? "";
    }
    setValues(nextValues);
    setNotes(nextNotes);
  }, [activeEntityId, metrics, reportValues]);

  const handleSave = () => {
    if (!activeEntityId || !metrics) return;
    saveMutation.mutate({
      reportId,
      entityId: activeEntityId,
      values: metrics.map((metric) => {
        const raw = values[metric.id]?.trim() ?? "";
        const numeric = Number(raw);
        const isNumeric = raw !== "" && Number.isFinite(numeric);
        return {
          metricDefinitionId: metric.id,
          valueNumber: isNumeric ? numeric : null,
          valueText: isNumeric ? null : raw || null,
          notes: notes[metric.id]?.trim() || null,
          source: "manual",
        };
      }),
    });
  };

  const handleEvidence = () => {
    if (!activeEntityId) return;
    evidenceMutation.mutate({
      reportId,
      entityId: activeEntityId,
      titleAr: evidenceTitle,
      descriptionAr: evidenceDescription,
      url: evidenceUrl,
      type: "link",
      isDonorFacing: true,
    });
  };

  if (isLoading || loadingMaster) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-12 w-64 rounded-xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">التقرير غير موجود</p>
        <Button onClick={() => setLocation("/reports")} className="mt-4">
          العودة للتقارير
        </Button>
      </div>
    );
  }

  const completedCount = completedEntityIds.size;

  return (
    <div className="islamic-pattern min-h-screen">
      <div
        className="px-6 py-6 md:px-10"
        style={{ background: "linear-gradient(135deg, #1b2a5e 0%, #2c3f7a 100%)" }}
      >
        <button
          onClick={() => setLocation("/reports")}
          className="flex items-center gap-1 text-white/70 hover:text-white text-sm mb-3"
        >
          <ArrowRight className="h-4 w-4" />
          العودة للتقارير
        </button>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">
              {data.report.title}
            </h1>
            <p className="text-white/70 mt-1 text-sm">
              {monthName(data.report.month)} {data.report.year} · {REPORT_PERIOD_LABELS[data.report.periodType]} · {REPORT_AUDIENCE_LABELS[data.report.audience]}
            </p>
            <p className="text-white/70 mt-1 text-sm">
              {completedCount} من {entities.length} كيانات لديها مؤشرات محفوظة
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => seedAllMutation.mutate({ reportId })}
              disabled={seedAllMutation.isPending}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              title="يحافظ على توافق التقارير القديمة فقط"
            >
              <Sparkles className={`h-4 w-4 ml-1 ${seedAllMutation.isPending ? "animate-pulse" : ""}`} />
              تعبئة legacy
            </Button>
            <Button
              onClick={() => syncMutation.mutate({ reportId })}
              disabled={syncMutation.isPending}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <RefreshCw className={`h-4 w-4 ml-1 ${syncMutation.isPending ? "animate-spin" : ""}`} />
              مزامنة Sheets
            </Button>
            <Button
              onClick={() => setLocation(`/reports/${reportId}/preview`)}
              className="bg-[#d4a843] hover:bg-[#e3c074] text-[#1b2a5e] font-bold"
            >
              <Eye className="h-5 w-5 ml-1" />
              معاينة التقرير
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 md:px-10 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          <div className="space-y-2">
            <h3 className="font-bold text-sm text-muted-foreground mb-3 px-1">
              كيانات RAWAHEL Pulse
            </h3>
            {entities.map((entity) => {
              const isActive = entity.id === activeEntityId;
              const isFilled = completedEntityIds.has(entity.id);
              return (
                <button
                  key={entity.id}
                  onClick={() => setActiveEntityId(entity.id)}
                  className={`flex items-center gap-3 w-full rounded-xl px-3 py-3 text-right transition-all ${
                    isActive
                      ? "bg-[#1b2a5e] text-white shadow-md"
                      : "bg-card hover:bg-muted border border-border/60"
                  }`}
                >
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
                    style={{ backgroundColor: isActive ? "rgba(255,255,255,0.15)" : `${entity.color}15` }}
                  >
                    <EntityIcon name={entity.icon} color={isActive ? "#fff" : entity.color} />
                  </div>
                  <span className="flex-1 text-sm font-medium truncate">{entity.nameAr}</span>
                  {isFilled ? (
                    <CheckCircle2 className={`h-4 w-4 shrink-0 ${isActive ? "text-[#d4a843]" : "text-emerald-500"}`} />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl bg-card border border-border/60 p-6 shadow-sm">
              {activeEntity ? (
                <>
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <EntityIcon name={activeEntity.icon} color={activeEntity.color} />
                        <h2 className="text-xl font-extrabold text-[#1b2a5e]">{activeEntity.nameAr}</h2>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {activeEntity.descriptionAr || activeEntity.ownerName || activeEntity.key}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline">{activeEntity.type}</Badge>
                      <Button variant="outline" size="sm" onClick={() => setLocation(`/entities/${activeEntity.id}`)}>
                        تفاصيل الكيان
                      </Button>
                    </div>
                  </div>

                  {loadingMetrics ? (
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Skeleton key={index} className="h-14 rounded-xl" />
                      ))}
                    </div>
                  ) : !metrics || metrics.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
                      لا توجد مؤشرات لهذا الكيان. أضفها من صفحة نبض رواحل.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {metrics.map((metric) => (
                        <div key={metric.id} className="grid grid-cols-1 md:grid-cols-[1fr_180px_1fr] gap-3 rounded-xl border border-border/60 p-3">
                          <div>
                            <div className="font-bold text-foreground">{metric.nameAr}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {metric.unit} · {metric.aggregationScope}
                            </div>
                          </div>
                          <Input
                            value={values[metric.id] ?? ""}
                            onChange={(event) => setValues((prev) => ({ ...prev, [metric.id]: event.target.value }))}
                            placeholder="القيمة"
                            dir="ltr"
                            className="font-bold"
                          />
                          <Input
                            value={notes[metric.id] ?? ""}
                            onChange={(event) => setNotes((prev) => ({ ...prev, [metric.id]: event.target.value }))}
                            placeholder="ملاحظة أو مصدر مختصر"
                          />
                        </div>
                      ))}
                      <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-[#1b2a5e] hover:bg-[#2c3f7a]">
                        <Save className="h-4 w-4 ml-1" />
                        حفظ مؤشرات الكيان
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-12 text-center text-muted-foreground">لا توجد كيانات نشطة بعد.</div>
              )}
            </div>

            <div className="rounded-2xl bg-card border border-border/60 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Link2 className="h-5 w-5 text-[#d4a843]" />
                <h3 className="font-extrabold text-[#1b2a5e]">دليل أو قصة للداعمين</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input value={evidenceTitle} onChange={(event) => setEvidenceTitle(event.target.value)} placeholder="عنوان القصة أو الدليل" />
                <Input value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} placeholder="الرابط" dir="ltr" />
                <Textarea
                  value={evidenceDescription}
                  onChange={(event) => setEvidenceDescription(event.target.value)}
                  placeholder="وصف مختصر يظهر في قالب الداعمين"
                  className="md:col-span-2"
                />
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <Button
                  onClick={handleEvidence}
                  disabled={!evidenceTitle || !evidenceUrl || evidenceMutation.isPending || !activeEntityId}
                  variant="outline"
                >
                  <Link2 className="h-4 w-4 ml-1" />
                  حفظ الدليل
                </Button>
                <Button variant="outline" onClick={() => setLocation("/integrations")}>
                  <FileSpreadsheet className="h-4 w-4 ml-1" />
                  إعداد Google Sheets
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
