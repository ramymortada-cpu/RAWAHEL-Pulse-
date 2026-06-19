import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ARABIC_MONTHS, monthName } from "@shared/departments";
import { REPORT_AUDIENCE_LABELS, REPORT_PERIOD_LABELS } from "@shared/pulse";
import { Plus, FileText, Trash2, ArrowLeft, CalendarDays } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Reports() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: reports, isLoading } = trpc.reports.list.useQuery();
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [periodType, setPeriodType] = useState<keyof typeof REPORT_PERIOD_LABELS>("monthly");
  const [audience, setAudience] = useState<keyof typeof REPORT_AUDIENCE_LABELS>("internal");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const createMutation = trpc.reports.create.useMutation({
    onSuccess: ({ id }) => {
      utils.reports.list.invalidate();
      setOpen(false);
      toast.success("تم إنشاء التقرير");
      setLocation(`/reports/${id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.reports.delete.useMutation({
    onSuccess: () => {
      utils.reports.list.invalidate();
      toast.success("تم حذف التقرير");
      setDeleteId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 3 + i);

  return (
    <div className="islamic-pattern min-h-screen px-6 py-8 md:px-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#1b2a5e]">
              تقارير نبض رواحل
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              أنشئ تقارير شهرية، ربع سنوية، نصف سنوية وسنوية لقياس الأثر
            </p>
          </div>
          <Button
            onClick={() => setOpen(true)}
            size="lg"
            className="bg-[#1b2a5e] hover:bg-[#2c3f7a] font-bold shadow-lg"
          >
            <Plus className="h-5 w-5 ml-1" />
            تقرير جديد
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
        ) : !reports || reports.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-16 text-center">
            <FileText className="h-14 w-14 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-lg font-bold text-foreground">لا توجد تقارير بعد</p>
            <p className="text-muted-foreground mt-1">
              ابدأ بإنشاء تقريرك الشهري الأول
            </p>
            <Button
              onClick={() => setOpen(true)}
              className="mt-5 bg-[#1b2a5e] hover:bg-[#2c3f7a]"
            >
              <Plus className="h-4 w-4 ml-1" />
              إنشاء تقرير
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reports.map((r) => (
              <div
                key={r.id}
                className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all hover:shadow-lg"
              >
                <div className="islamic-pattern-gold absolute -left-8 -top-8 h-28 w-28 rounded-full opacity-30" />
                <div className="relative">
                  <div className="flex items-start justify-between">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-sm"
                      style={{ backgroundColor: "#1b2a5e" }}
                    >
                      <CalendarDays className="h-7 w-7" />
                    </div>
                    <button
                      onClick={() => setDeleteId(r.id)}
                      className="rounded-lg p-2 text-muted-foreground/60 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-foreground">
                    {r.title}
                  </h3>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        r.status === "generated"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {r.status === "generated" ? "تم الإنشاء" : "مسودة"}
                    </span>
                  </div>
                  <Button
                    onClick={() => setLocation(`/reports/${r.id}`)}
                    variant="outline"
                    className="mt-4 w-full border-[#1b2a5e]/20 text-[#1b2a5e] hover:bg-[#1b2a5e] hover:text-white"
                  >
                    فتح التقرير
                    <ArrowLeft className="h-4 w-4 mr-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-[#1b2a5e]">إنشاء تقرير نبض رواحل</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">الشهر</label>
              <Select
                value={String(month)}
                onValueChange={(v) => setMonth(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ARABIC_MONTHS.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">السنة</label>
              <Select
                value={String(year)}
                onValueChange={(v) => setYear(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">نوع الفترة</label>
              <Select
                value={periodType}
                onValueChange={(v) => setPeriodType(v as keyof typeof REPORT_PERIOD_LABELS)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(REPORT_PERIOD_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">جمهور التقرير</label>
              <Select
                value={audience}
                onValueChange={(v) => setAudience(v as keyof typeof REPORT_AUDIENCE_LABELS)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(REPORT_AUDIENCE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            سيتم إنشاء {REPORT_PERIOD_LABELS[periodType]} لشهر {monthName(month)} {year} · {REPORT_AUDIENCE_LABELS[audience]}
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={() => createMutation.mutate({ year, month, periodType, audience })}
              disabled={createMutation.isPending}
              className="bg-[#1b2a5e] hover:bg-[#2c3f7a]"
            >
              {createMutation.isPending ? "جارٍ الإنشاء..." : "إنشاء"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف التقرير</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا التقرير؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              className="bg-red-600 hover:bg-red-700"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
