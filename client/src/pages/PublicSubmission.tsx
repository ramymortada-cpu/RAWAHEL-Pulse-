import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LOGO_NAVY } from "@/lib/brand";
import { monthName } from "@shared/departments";
import { AlertTriangle, CheckCircle2, Save, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";

export default function PublicSubmission() {
  const [, params] = useRoute("/submit/:token");
  const [, setLocation] = useLocation();
  const token = params?.token ?? "";
  const { data, isLoading, error } = trpc.pulse.getSubmissionByToken.useQuery(
    { token },
    { enabled: token.length > 0, retry: false }
  );
  const [values, setValues] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [achievements, setAchievements] = useState(["", "", ""]);
  const [operationsNotes, setOperationsNotes] = useState("");
  const [supportNeeded, setSupportNeeded] = useState("");
  const [evidence, setEvidence] = useState({
    titleAr: "",
    url: "",
    descriptionAr: "",
  });

  const saveDraft = trpc.pulse.saveSubmissionDraft.useMutation({
    onSuccess: () => toast.success("تم حفظ المسودة"),
    onError: (mutationError) => toast.error(mutationError.message),
  });
  const submitFinal = trpc.pulse.submitSubmissionFinal.useMutation({
    onSuccess: () => setLocation(`/submit/${token}/success`),
    onError: (mutationError) => toast.error(mutationError.message),
  });

  const missingCount = useMemo(() => {
    if (!data) return 0;
    return data.metrics.filter((metric) => !values[metric.id] && data.values.every((value) => value.metricDefinitionId !== metric.id)).length;
  }, [data, values]);

  const payload = () => ({
    token,
    values: Object.entries(values)
      .filter(([, value]) => value !== "")
      .map(([metricDefinitionId, value]) => {
        const metric = data?.metrics.find((item) => item.id === Number(metricDefinitionId));
        return {
          metricDefinitionId: Number(metricDefinitionId),
          valueNumber: metric?.unit === "text_score" ? null : Number(value),
          valueText: metric?.unit === "text_score" ? value : null,
          notes: notes[Number(metricDefinitionId)] ?? null,
        };
      }),
    achievements: achievements.filter(Boolean),
    operationsNotes,
    supportNeeded,
    evidence: evidence.titleAr && evidence.url ? [{ ...evidence, type: "link" as const, isDonorFacing: true }] : [],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f2e7] p-6" dir="rtl">
        <Skeleton className="mx-auto h-[720px] max-w-4xl rounded-3xl" />
      </div>
    );
  }

  if (error || !data?.report) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f2e7] p-6" dir="rtl">
        <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-600" />
          <h1 className="mt-4 text-2xl font-extrabold text-[#1b2a5e]">تعذر فتح رابط الإدخال</h1>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            {error?.message ?? "قد يكون الرابط غير صالح أو منتهي الصلاحية. يرجى التواصل مع إدارة رواحل."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f2e7] px-4 py-6 md:px-8" dir="rtl">
      <main className="mx-auto max-w-5xl">
        <header className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-[#f7f2e7] p-3">
                <img src={LOGO_NAVY} alt="رواحل" className="h-12 object-contain" />
              </div>
              <div>
                <Badge className="bg-[#d4a843] text-[#1b2a5e] hover:bg-[#d4a843]">RAWAHEL Pulse</Badge>
                <h1 className="mt-2 text-3xl font-extrabold text-[#1b2a5e]">نموذج إدخال بيانات شهرية</h1>
                <p className="mt-1 text-sm text-slate-500">هذا الرابط مخصص لـ: {data.entity.nameAr}</p>
              </div>
            </div>
            <div className="rounded-2xl bg-[#1b2a5e] px-5 py-4 text-white">
              <div className="text-sm text-white/70">الفترة</div>
              <div className="text-xl font-extrabold">{monthName(data.report.month)} {data.report.year}</div>
            </div>
          </div>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600">
            من فضلك أدخل بيانات هذا الشهر بدقة، وأرفق الشواهد المتاحة إن وجدت.
            ستقوم إدارة رواحل بمراجعة البيانات قبل اعتمادها في التقرير.
          </p>
        </header>

        <section className="mt-5 grid gap-3 md:grid-cols-4">
          {["البيانات الأساسية", "المؤشرات", "الشواهد", "الإرسال"].map((step, index) => (
            <div key={step} className="rounded-2xl bg-white p-4 text-center text-sm font-extrabold text-[#1b2a5e] shadow-sm">
              <span className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#d4a843] text-xs">{index + 1}</span>
              {step}
            </div>
          ))}
        </section>

        <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-extrabold text-[#1b2a5e]">الأهداف المرتبطة بهذا الكيان</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.goals.map((goal) => (
              <Badge key={goal.id} variant="secondary" className="px-3 py-1">{goal.nameAr}</Badge>
            ))}
            {data.goals.length === 0 && <p className="text-sm text-slate-500">لا توجد أهداف مرتبطة بهذا الكيان بعد.</p>}
          </div>
        </section>

        <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-extrabold text-[#1b2a5e]">مؤشرات هذا الشهر</h2>
            <Badge variant={missingCount > 0 ? "secondary" : "default"}>
              {missingCount > 0 ? `متبقي ${missingCount.toLocaleString("ar-EG")} مؤشر` : "جاهز للإرسال"}
            </Badge>
          </div>
          <div className="mt-4 grid gap-3">
            {data.metrics.map((metric) => {
              const existing = data.values.find((value) => value.metricDefinitionId === metric.id);
              return (
                <div key={metric.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <label className="text-sm font-extrabold text-slate-800">{metric.nameAr}</label>
                  <div className="mt-2 grid gap-2 md:grid-cols-[1fr_1fr]">
                    {metric.unit === "text_score" ? (
                      <Textarea
                        placeholder={String(existing?.valueText ?? "")}
                        value={values[metric.id] ?? ""}
                        onChange={(event) => setValues((current) => ({ ...current, [metric.id]: event.target.value }))}
                      />
                    ) : (
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={metric.unit === "percent" ? 0 : undefined}
                        max={metric.unit === "percent" ? 100 : undefined}
                        placeholder={String(existing?.valueNumber ?? "0")}
                        value={values[metric.id] ?? ""}
                        onChange={(event) => setValues((current) => ({ ...current, [metric.id]: event.target.value }))}
                      />
                    )}
                    <Input
                      placeholder="ملاحظة اختيارية على هذا المؤشر"
                      value={notes[metric.id] ?? ""}
                      onChange={(event) => setNotes((current) => ({ ...current, [metric.id]: event.target.value }))}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="text-xl font-extrabold text-[#1b2a5e]">إنجازات وملاحظات الشهر</h2>
            <div className="mt-4 grid gap-3">
              {achievements.map((value, index) => (
                <Input
                  key={index}
                  placeholder={`أهم إنجاز ${index + 1}`}
                  value={value}
                  onChange={(event) => setAchievements((items) => items.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}
                />
              ))}
              <Textarea placeholder="تحديات أو ملاحظات تشغيلية" value={operationsNotes} onChange={(event) => setOperationsNotes(event.target.value)} />
              <Textarea placeholder="احتياج أو دعم مطلوب إن وجد" value={supportNeeded} onChange={(event) => setSupportNeeded(event.target.value)} />
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="text-xl font-extrabold text-[#1b2a5e]">شاهد أو قصة أثر</h2>
            <div className="mt-4 grid gap-3">
              <Input placeholder="عنوان الشاهد / القصة" value={evidence.titleAr} onChange={(event) => setEvidence((item) => ({ ...item, titleAr: event.target.value }))} />
              <Input placeholder="رابط صورة أو فيديو أو ملف" dir="ltr" value={evidence.url} onChange={(event) => setEvidence((item) => ({ ...item, url: event.target.value }))} />
              <Textarea placeholder="وصف مختصر يصلح لتقرير الداعمين" value={evidence.descriptionAr} onChange={(event) => setEvidence((item) => ({ ...item, descriptionAr: event.target.value }))} />
            </div>
          </div>
        </section>

        <footer className="sticky bottom-0 mt-6 rounded-3xl border border-[#1b2a5e]/10 bg-white/95 p-4 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-600">يمكن حفظ مسودة ناقصة، أما الإرسال النهائي فسيظهر للإدارة للمراجعة والاعتماد.</p>
            <div className="flex gap-2">
              <Button variant="outline" disabled={saveDraft.isPending} onClick={() => saveDraft.mutate(payload())}>
                <Save className="ml-2 h-4 w-4" />
                حفظ مسودة
              </Button>
              <Button className="bg-[#2e7d6b] hover:bg-[#256a5b]" disabled={submitFinal.isPending} onClick={() => submitFinal.mutate(payload())}>
                <Send className="ml-2 h-4 w-4" />
                إرسال نهائي
              </Button>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

export function PublicSubmissionSuccess() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f2e7] p-6" dir="rtl">
      <div className="max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto h-14 w-14 text-[#2e7d6b]" />
        <h1 className="mt-4 text-3xl font-extrabold text-[#1b2a5e]">تم استلام بياناتكم بنجاح</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          شكرًا لكم. ستقوم إدارة رواحل بمراجعة البيانات قبل اعتمادها في التقرير.
        </p>
      </div>
    </div>
  );
}
