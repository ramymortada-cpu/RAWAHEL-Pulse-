import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { monthName } from "@shared/departments";
import { CheckCircle2, Copy, ExternalLink, Link as LinkIcon, RotateCw, ShieldOff } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const statusLabels: Record<string, string> = {
  created: "لم يُفتح",
  opened: "تم الفتح",
  draft: "تم الحفظ كمسودة",
  submitted: "تم الإرسال",
  needs_revision: "يحتاج مراجعة",
  reviewed: "تمت المراجعة",
  approved: "معتمد",
  revoked: "ملغي",
  expired: "منتهي",
};

function fmtDate(value?: Date | string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function SubmissionLinks() {
  const utils = trpc.useUtils();
  const { data: reports, isLoading: reportsLoading } = trpc.reports.list.useQuery();
  const { data: master, isLoading: masterLoading } = trpc.pulse.masterData.useQuery();
  const { data: links, isLoading: linksLoading } = trpc.pulse.listSubmissionLinks.useQuery();
  const [selectedLinkId, setSelectedLinkId] = useState<number | null>(null);
  const { data: review } = trpc.pulse.getSubmissionReview.useQuery(
    { id: selectedLinkId ?? 0 },
    { enabled: !!selectedLinkId }
  );
  const [form, setForm] = useState({
    reportId: "",
    entityId: "",
    managerName: "",
    managerEmail: "",
    managerPhone: "",
  });
  const [lastRawToken, setLastRawToken] = useState<string | null>(null);

  const activeEntities = useMemo(
    () => (master?.entities ?? []).filter((entity) => entity.status === "active" && entity.isActive),
    [master?.entities]
  );

  const createLink = trpc.pulse.createSubmissionLink.useMutation({
    onSuccess: ({ rawToken }) => {
      setLastRawToken(rawToken);
      toast.success("تم إنشاء رابط الإدخال الشهري");
      utils.pulse.listSubmissionLinks.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const revokeLink = trpc.pulse.revokeSubmissionLink.useMutation({
    onSuccess: () => {
      toast.success("تم إلغاء الرابط");
      utils.pulse.listSubmissionLinks.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const regenerateLink = trpc.pulse.regenerateSubmissionLink.useMutation({
    onSuccess: ({ rawToken }) => {
      setLastRawToken(rawToken);
      toast.success("تمت إعادة إصدار الرابط");
      utils.pulse.listSubmissionLinks.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const approveSubmission = trpc.pulse.approveSubmission.useMutation({
    onSuccess: () => {
      toast.success("تم اعتماد البيانات");
      utils.pulse.listSubmissionLinks.invalidate();
      if (selectedLinkId) utils.pulse.getSubmissionReview.invalidate({ id: selectedLinkId });
      utils.pulse.dashboard.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const requestRevision = trpc.pulse.requestSubmissionRevision.useMutation({
    onSuccess: () => {
      toast.success("تم طلب المراجعة");
      utils.pulse.listSubmissionLinks.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const buildUrl = (token: string) => `${window.location.origin}/submit/${token}`;
  const copyToken = async (token: string) => {
    await navigator.clipboard.writeText(buildUrl(token));
    toast.success("تم نسخ الرابط");
  };

  if (reportsLoading || masterLoading) {
    return (
      <div className="min-h-screen bg-[#f7f2e7] p-8">
        <Skeleton className="h-28 rounded-3xl" />
        <Skeleton className="mt-6 h-[560px] rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f2e7] px-6 py-8 md:px-10" dir="rtl">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl bg-[#1b2a5e] p-6 text-white shadow-sm">
          <Badge className="bg-[#d4a843] text-[#1b2a5e] hover:bg-[#d4a843]">روابط إدخال البيانات الشهرية</Badge>
          <h1 className="mt-3 text-3xl font-extrabold">روابط الإدخال الشهري</h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-white/75">
            أنشئ رابطًا خاصًا لكل مدير كيان ليُدخل مؤشرات الشهر وشواهد الأثر دون الدخول إلى لوحة RAWAHEL Pulse.
          </p>
        </div>

        {lastRawToken && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-extrabold text-emerald-900">الرابط الجديد جاهز للنسخ</div>
                <div className="mt-1 break-all text-sm text-emerald-800">{buildUrl(lastRawToken)}</div>
              </div>
              <Button onClick={() => copyToken(lastRawToken)} className="bg-emerald-700 hover:bg-emerald-800">
                <Copy className="ml-2 h-4 w-4" />
                نسخ الرابط
              </Button>
            </div>
          </div>
        )}

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-[#1b2a5e]/10 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-extrabold text-[#1b2a5e]">إنشاء رابط جديد</h2>
            <div className="mt-4 grid gap-3">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.reportId}
                onChange={(event) => setForm((value) => ({ ...value, reportId: event.target.value }))}
              >
                <option value="">اختر التقرير / الفترة</option>
                {(reports ?? []).map((report) => (
                  <option key={report.id} value={report.id}>
                    {report.title}
                  </option>
                ))}
              </select>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.entityId}
                onChange={(event) => setForm((value) => ({ ...value, entityId: event.target.value }))}
              >
                <option value="">اختر الكيان</option>
                {activeEntities.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.nameAr}
                  </option>
                ))}
              </select>
              <Input placeholder="اسم المسؤول" value={form.managerName} onChange={(event) => setForm((value) => ({ ...value, managerName: event.target.value }))} />
              <Input placeholder="البريد الإلكتروني اختياري" dir="ltr" value={form.managerEmail} onChange={(event) => setForm((value) => ({ ...value, managerEmail: event.target.value }))} />
              <Input placeholder="رقم الهاتف اختياري" dir="ltr" value={form.managerPhone} onChange={(event) => setForm((value) => ({ ...value, managerPhone: event.target.value }))} />
            </div>
            <Button
              className="mt-4 w-full bg-[#1b2a5e] hover:bg-[#2c3f7a]"
              disabled={!form.reportId || !form.entityId || !form.managerName || createLink.isPending}
              onClick={() =>
                createLink.mutate({
                  reportId: Number(form.reportId),
                  entityId: Number(form.entityId),
                  managerName: form.managerName,
                  managerEmail: form.managerEmail,
                  managerPhone: form.managerPhone,
                })
              }
            >
              <LinkIcon className="ml-2 h-4 w-4" />
              إنشاء رابط خاص
            </Button>
          </div>

          <div className="rounded-3xl border border-[#1b2a5e]/10 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-extrabold text-[#1b2a5e]">الروابط الحالية</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b text-right text-slate-500">
                    <th className="p-2">الكيان</th>
                    <th className="p-2">التقرير</th>
                    <th className="p-2">المسؤول</th>
                    <th className="p-2">الحالة</th>
                    <th className="p-2">آخر فتح</th>
                    <th className="p-2">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {(links ?? []).map((link) => {
                    const entity = master?.entities.find((item) => item.id === link.entityId);
                    const report = reports?.find((item) => item.id === link.reportId);
                    return (
                      <tr key={link.id} className="border-b last:border-b-0">
                        <td className="p-2 font-bold text-[#1b2a5e]">{entity?.nameAr ?? link.entityId}</td>
                        <td className="p-2">{report ? `${monthName(report.month)} ${report.year}` : link.reportId}</td>
                        <td className="p-2">{link.managerName}</td>
                        <td className="p-2"><Badge variant="secondary">{statusLabels[link.status] ?? link.status}</Badge></td>
                        <td className="p-2">{fmtDate(link.openedAt)}</td>
                        <td className="p-2">
                          <div className="flex flex-wrap gap-1">
                            <Button size="sm" variant="outline" onClick={() => setSelectedLinkId(link.id)}>مراجعة</Button>
                            <Button size="sm" variant="ghost" onClick={() => regenerateLink.mutate({ id: link.id })}><RotateCw className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => revokeLink.mutate({ id: link.id })}><ShieldOff className="h-4 w-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!linksLoading && (links ?? []).length === 0 && (
                <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                  لم يتم إنشاء روابط إدخال بعد.
                </div>
              )}
            </div>
          </div>
        </section>

        {review && (
          <section className="mt-6 rounded-3xl border border-[#1b2a5e]/10 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-[#1b2a5e]">مراجعة الإدخال</h2>
                <p className="text-sm text-slate-500">
                  {review.entity?.nameAr} · {statusLabels[review.link.status] ?? review.link.status}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => requestRevision.mutate({ id: review.link.id })}>طلب تعديل</Button>
                <Button className="bg-[#2e7d6b] hover:bg-[#256a5b]" onClick={() => approveSubmission.mutate({ id: review.link.id })}>
                  <CheckCircle2 className="ml-2 h-4 w-4" />
                  اعتماد البيانات
                </Button>
              </div>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <h3 className="font-extrabold text-[#1b2a5e]">القيم المرسلة</h3>
                <div className="mt-3 space-y-2">
                  {review.values.map((value) => {
                    const metric = master?.metricDefinitions.find((item) => item.id === value.metricDefinitionId);
                    return (
                      <div key={value.id} className="rounded-xl bg-white p-3">
                        <div className="font-bold">{metric?.nameAr ?? value.metricDefinitionId}</div>
                        <div className="mt-1 text-sm text-slate-600">{value.valueNumber ?? value.valueText ?? "-"}</div>
                      </div>
                    );
                  })}
                  {review.values.length === 0 && <div className="text-sm text-slate-500">لا توجد قيم محفوظة بعد.</div>}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <h3 className="font-extrabold text-[#1b2a5e]">الشواهد والقصص</h3>
                <div className="mt-3 space-y-2">
                  {review.evidence.map((item) => (
                    <a key={item.id} href={item.url === "external-submission" ? undefined : item.url} target="_blank" rel="noreferrer" className="block rounded-xl bg-white p-3">
                      <div className="flex items-center gap-2 font-bold">
                        {item.titleAr}
                        {item.url !== "external-submission" && <ExternalLink className="h-3 w-3" />}
                      </div>
                      <div className="mt-1 whitespace-pre-line text-sm text-slate-600">{item.descriptionAr}</div>
                    </a>
                  ))}
                  {review.evidence.length === 0 && <div className="text-sm text-slate-500">لا توجد شواهد بعد.</div>}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
