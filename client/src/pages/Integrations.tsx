import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Sheet as SheetIcon,
  CheckCircle2,
  Link2,
  Info,
} from "lucide-react";

export default function Integrations() {
  const utils = trpc.useUtils();
  const { data: cfg, isLoading } = trpc.reports.getSheetConfig.useQuery();
  const { data: master } = trpc.pulse.masterData.useQuery();
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (cfg?.sheetUrl) setUrl(cfg.sheetUrl);
  }, [cfg?.sheetUrl]);

  const saveMutation = trpc.reports.saveSheetConfig.useMutation({
    onSuccess: () => {
      utils.reports.getSheetConfig.invalidate();
      toast.success("تم ربط Google Sheets بنجاح");
    },
    onError: (e) => toast.error(e.message),
  });

  const exampleHeader = "period,entity_key,metric_key,value,notes,source";
  const exampleRows = [
    "2026-06,scientific_office,total_beneficiaries,1200,إجمالي المستفيدين,sheet",
    "2026-06,scientific_office,programs_executed,8,برامج الشهر,sheet",
    "2026-06,media_communications,content_produced,42,مواد منشورة,sheet",
    "2026-06,volunteer_office,volunteer_count,65,متطوعون نشطون,sheet",
  ];

  return (
    <div className="islamic-pattern min-h-screen px-6 py-8 md:px-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md">
            <SheetIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#1b2a5e]">
              ربط Google Sheets
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              استورد مؤشرات الكيانات تلقائيًا من جدول بيانات Google
            </p>
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-40 rounded-2xl" />
        ) : (
          <div className="rounded-2xl bg-card border border-border/60 p-6 shadow-sm">
            <label className="text-sm font-bold mb-2 block">
              رابط Google Sheets
            </label>
            <div className="flex gap-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                dir="ltr"
                className="text-left"
              />
              <Button
                onClick={() => saveMutation.mutate({ sheetUrl: url })}
                disabled={saveMutation.isPending || !url}
                className="bg-[#1b2a5e] hover:bg-[#2c3f7a] shrink-0"
              >
                <Link2 className="h-4 w-4 ml-1" />
                ربط
              </Button>
            </div>

            {cfg?.sheetId && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span className="text-emerald-800 font-medium">
                  مرتبط حاليًا
                </span>
                {cfg.lastSyncedAt && (
                  <span className="text-emerald-700/70">
                    · آخر مزامنة:{" "}
                    {new Date(cfg.lastSyncedAt).toLocaleString("ar-EG")}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 rounded-2xl bg-blue-50/60 border border-blue-100 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-5 w-5 text-[#4a90d9]" />
            <h3 className="font-bold text-[#1b2a5e]">كيفية تجهيز الجدول</h3>
          </div>
          <ol className="space-y-2 text-sm text-foreground/80 list-decimal pr-5">
            <li>
              اجعل صلاحية المشاركة: <b>أي شخص لديه الرابط يمكنه الاطلاع</b>.
            </li>
            <li>
              استخدم الأعمدة التالية بالترتيب:{" "}
              <code className="bg-white px-1.5 py-0.5 rounded text-xs" dir="ltr">
                period, entity_key, metric_key, value, notes, source
              </code>
            </li>
            <li>اضغط زر «مزامنة Sheets» داخل أي تقرير لاستيراد البيانات.</li>
          </ol>

          <div className="mt-4 rounded-xl bg-[#1b2a5e] p-4 text-white font-mono text-xs overflow-x-auto" dir="ltr">
            <div className="text-[#d4a843]">{exampleHeader}</div>
            {exampleRows.map((r, i) => (
              <div key={i} className="text-white/90">
                {r}
              </div>
            ))}
          </div>

          <div className="mt-4">
            <p className="text-sm font-bold text-[#1b2a5e] mb-2">
              مفاتيح الكيانات (entity_key):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {(master?.entities ?? []).slice(0, 20).map((entity) => (
                <div
                  key={entity.key}
                  className="flex items-center justify-between rounded-lg bg-white px-3 py-1.5 text-xs"
                >
                  <span className="font-medium text-foreground">{entity.nameAr}</span>
                  <code className="text-muted-foreground" dir="ltr">
                    {entity.key}
                  </code>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-sm font-bold text-[#1b2a5e] mb-2">
              أهم مفاتيح المؤشرات (metric_key):
            </p>
            <div className="flex flex-wrap gap-1.5 text-xs" dir="ltr">
              {(master?.metricDefinitions ?? []).slice(0, 18).map(
                (metric) => (
                  <code
                    key={metric.id}
                    className="bg-white px-2 py-1 rounded border border-blue-100"
                  >
                    {metric.key}
                  </code>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
