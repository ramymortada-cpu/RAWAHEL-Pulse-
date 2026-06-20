import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { roleLabelAr } from "@shared/permissions";
import { useState } from "react";
import { toast } from "sonner";

const statusLabels: Record<string, string> = {
  draft: "مسودة",
  active: "نشط",
  locked: "مقفل",
  archived: "مؤرشف",
  cancelled: "ملغي",
  generated: "تم توليده",
};

const userStatusLabels: Record<string, string> = {
  active: "نشط",
  invited: "مدعو",
  suspended: "موقوف",
};

export default function AdminPortal() {
  const utils = trpc.useUtils();
  const dashboard = trpc.admin.dashboard.useQuery();
  const reports = trpc.reports.list.useQuery({ includeInactive: true });
  const users = trpc.admin.users.useQuery(undefined, { retry: false });
  const audit = trpc.admin.auditLog.useQuery(undefined, { retry: false });
  const archiveReport = trpc.reports.archive.useMutation({
    onSuccess: async () => {
      toast.success("تمت أرشفة التقرير");
      await Promise.all([utils.reports.list.invalidate(), utils.admin.dashboard.invalidate(), utils.admin.auditLog.invalidate()]);
    },
  });
  const cancelReport = trpc.reports.cancel.useMutation({
    onSuccess: async () => {
      toast.success("تم إلغاء التقرير");
      await Promise.all([utils.reports.list.invalidate(), utils.admin.dashboard.invalidate(), utils.admin.auditLog.invalidate()]);
    },
  });
  const createUser = trpc.admin.createUser.useMutation({
    onSuccess: async () => {
      toast.success("تم إنشاء المستخدم");
      setNewUser({ name: "", email: "", role: "viewer" });
      await Promise.all([utils.admin.users.invalidate(), utils.admin.auditLog.invalidate()]);
    },
  });
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "viewer" });

  return (
    <div dir="rtl" className="min-h-screen bg-[#f7f2e7] px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold text-[#9a7a26]">RAWAHEL Pulse</p>
            <h1 className="text-3xl font-extrabold text-[#1b2a5e]">بوابة الإدارة</h1>
            <p className="mt-1 text-sm text-slate-600">إدارة التقارير والصلاحيات وسجل العمليات من مكان واحد.</p>
          </div>
          <Badge className="w-fit bg-[#1b2a5e] px-4 py-2 text-white hover:bg-[#1b2a5e]">صلاحيات داخلية محمية</Badge>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <Stat title="التقارير النشطة" value={dashboard.data?.reports.active ?? 0} />
          <Stat title="المؤرشفة" value={dashboard.data?.reports.archived ?? 0} />
          <Stat title="القيم المعتمدة" value={dashboard.data?.pulseTotals.approvedValueCount ?? 0} />
          <Stat title="اكتمال البيانات" value={`${dashboard.data?.pulseTotals.dataCompletenessScore ?? 0}%`} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#1b2a5e]">إدارة التقارير</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(reports.data ?? []).map((report) => (
                <div key={report.id} className="flex flex-col gap-3 rounded-lg border bg-white p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-bold text-[#1b2a5e]">{report.title}</div>
                    <div className="mt-1 text-xs text-slate-500">{report.month}/{report.year} · {report.audience}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{statusLabels[report.status] ?? report.status}</Badge>
                    {!["archived", "cancelled"].includes(report.status) && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => archiveReport.mutate({ id: report.id })}>أرشفة التقرير</Button>
                        <Button size="sm" variant="outline" onClick={() => cancelReport.mutate({ id: report.id, reason: "إلغاء إداري من بوابة الإدارة" })}>إلغاء التقرير</Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {reports.data?.length === 0 ? <Empty text="لا توجد تقارير بعد." /> : null}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#1b2a5e]">المستخدمون والصلاحيات</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Input placeholder="الاسم" value={newUser.name} onChange={(event) => setNewUser((value) => ({ ...value, name: event.target.value }))} />
                <Input placeholder="البريد الإلكتروني" value={newUser.email} onChange={(event) => setNewUser((value) => ({ ...value, email: event.target.value }))} />
                <Select value={newUser.role} onValueChange={(role) => setNewUser((value) => ({ ...value, role }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">مشاهد</SelectItem>
                    <SelectItem value="editor">محرر</SelectItem>
                    <SelectItem value="admin">مدير</SelectItem>
                    <SelectItem value="super_admin">مدير عام</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  className="bg-[#1b2a5e] hover:bg-[#2c3f7a]"
                  disabled={!newUser.name || !newUser.email || createUser.isPending}
                  onClick={() => createUser.mutate({ ...newUser, role: newUser.role as "super_admin" | "admin" | "editor" | "viewer" })}
                >
                  إنشاء مستخدم
                </Button>
              </div>
              <div className="space-y-2">
                {(users.data ?? []).map((user) => (
                  <div key={user.id} className="rounded-lg border bg-white p-3">
                    <div className="font-bold text-[#1b2a5e]">{user.name || user.email || user.openId}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span>{user.email || "بدون بريد"}</span>
                      <Badge variant="outline">{roleLabelAr(user.role)}</Badge>
                      <Badge variant="outline">{userStatusLabels[user.status] ?? user.status}</Badge>
                    </div>
                  </div>
                ))}
                {users.error ? <Empty text="هذه الصفحة متاحة للمدير العام فقط." /> : null}
              </div>
            </CardContent>
          </Card>
        </section>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#1b2a5e]">سجل العمليات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(audit.data ?? []).slice(0, 40).map((item) => (
              <div key={item.id} className="grid gap-2 rounded-lg border bg-white p-3 md:grid-cols-[160px_160px_1fr]">
                <div className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString("ar-EG")}</div>
                <div className="text-sm font-bold text-[#1b2a5e]">{item.actorName || "النظام"}</div>
                <div className="text-sm text-slate-700">{item.summaryAr}</div>
              </div>
            ))}
            {audit.error ? <Empty text="سجل العمليات متاح للمديرين فقط." /> : null}
            {audit.data?.length === 0 ? <Empty text="لا توجد عمليات مسجلة بعد." /> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <div className="text-sm font-bold text-slate-500">{title}</div>
      <div className="mt-3 text-3xl font-extrabold text-[#1b2a5e]">{value.toLocaleString?.("ar-EG") ?? value}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed bg-[#fffdf6] p-4 text-center text-sm font-bold text-[#8a6a16]">{text}</div>;
}
