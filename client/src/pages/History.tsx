import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { monthName } from "@shared/departments";
import { useLocation } from "wouter";
import {
  Download,
  FileText,
  Eye,
  History as HistoryIcon,
  CheckCircle2,
  Clock,
} from "lucide-react";

export default function History() {
  const [, setLocation] = useLocation();
  const { data: reports, isLoading } = trpc.reports.list.useQuery();

  return (
    <div className="islamic-pattern min-h-screen px-6 py-8 md:px-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md"
            style={{ backgroundColor: "#1b2a5e" }}
          >
            <HistoryIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#1b2a5e]">
              سجل التقارير
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              كل التقارير الشهرية المُنشأة، متاحة للتحميل في أي وقت
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : !reports || reports.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-16 text-center">
            <FileText className="h-14 w-14 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-lg font-bold text-foreground">السجل فارغ</p>
            <p className="text-muted-foreground mt-1">
              لم يتم إنشاء أي تقارير بعد
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => {
              const isReady = r.status === "generated" && r.pdfUrl;
              return (
                <div
                  key={r.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-14 w-14 flex-col items-center justify-center rounded-2xl text-white shadow-sm"
                      style={{ backgroundColor: "#1b2a5e" }}
                    >
                      <span className="text-xs font-medium opacity-80">
                        {r.year}
                      </span>
                      <span className="text-lg font-extrabold leading-none">
                        {monthName(r.month).slice(0, 3)}
                      </span>
                    </div>
                    <div>
                      <div className="font-bold text-foreground">{r.title}</div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs">
                        {isReady ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-medium">
                              جاهز للتحميل
                            </span>
                            {r.generatedAt && (
                              <span className="text-muted-foreground">
                                ·{" "}
                                {new Date(r.generatedAt).toLocaleDateString(
                                  "ar-EG"
                                )}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <Clock className="h-3.5 w-3.5 text-amber-600" />
                            <span className="text-amber-700 font-medium">
                              مسودة — لم يُصدّر بعد
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setLocation(`/reports/${r.id}/preview`)}
                      className="border-[#1b2a5e]/20 text-[#1b2a5e]"
                    >
                      <Eye className="h-4 w-4 ml-1" />
                      معاينة
                    </Button>
                    {isReady ? (
                      <a href={r.pdfUrl!} target="_blank" rel="noreferrer" download>
                        <Button className="bg-[#d4a843] hover:bg-[#e3c074] text-[#1b2a5e] font-bold">
                          <Download className="h-4 w-4 ml-1" />
                          تحميل PDF
                        </Button>
                      </a>
                    ) : (
                      <Button
                        onClick={() => setLocation(`/reports/${r.id}`)}
                        className="bg-[#1b2a5e] hover:bg-[#2c3f7a]"
                      >
                        إكمال
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
