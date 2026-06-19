import { trpc } from "@/lib/trpc";
import { useRoute, useLocation } from "wouter";
import { Infographic, type InfographicData } from "@/components/infographic/Infographic";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRef, useState, useMemo } from "react";
import { ArrowRight, Download, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { type ReportSummary } from "@shared/departments";
import { generatePdf, generatePng } from "@/lib/pdf";
import { PRODUCT_NAME_AR, pulseExportFileName } from "@shared/pulse";

export default function Preview() {
  const [, params] = useRoute("/reports/:id/preview");
  const [, setLocation] = useLocation();
  const reportId = Number(params?.id);
  const utils = trpc.useUtils();
  const captureRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [exportingPng, setExportingPng] = useState(false);
  const [templateKey, setTemplateKey] = useState<"monthly" | "donor" | "annual">("monthly");

  const { data, isLoading } = trpc.reports.get.useQuery(
    { id: reportId },
    { enabled: !!reportId }
  );

  const { data: growth } = trpc.reports.growthSeries.useQuery(
    { reportId },
    { enabled: !!reportId }
  );
  const { data: pulseDashboard } = trpc.pulse.dashboard.useQuery(
    { reportId },
    { enabled: !!reportId }
  );

  const markGenerated = trpc.reports.markGenerated.useMutation();
  const uploadPdf = trpc.reports.uploadPdf.useMutation();
  const recordExport = trpc.pulse.recordExport.useMutation();

  const infographicData: InfographicData | null = useMemo(() => {
    if (!data) return null;
    const summary = (data.report.summary as ReportSummary) ?? {
      totalBeneficiaries: 0,
      programsExecuted: 0,
      volunteers: 0,
      contentProduced: 0,
      goalAchievementRate: 0,
    };
    return {
      title: data.report.title,
      month: data.report.month,
      year: data.report.year,
      templateKey,
      audience: data.report.audience,
      summary,
      departments: (data.departments ?? []).map((d) => ({
        departmentKey: d.departmentKey,
        metrics: (d.metrics as Record<string, number>) ?? {},
        achievements: (d.achievements as string[]) ?? [],
      })),
      items: (data.items ?? []).map((it) => ({
        departmentKey: it.departmentKey,
        itemKey: it.itemKey,
        itemNameAr: it.itemNameAr,
        itemType: it.itemType,
        metrics: (it.metrics as Record<string, number>) ?? {},
      })),
      monthlyGrowth: growth ?? [],
      pulse: pulseDashboard,
    };
  }, [data, growth, pulseDashboard, templateKey]);

  const handleExportPng = async () => {
    if (!captureRef.current || !data) return;
    setExportingPng(true);
    try {
      const { dataUrl } = await generatePng(captureRef.current);
      const a = document.createElement("a");
      a.href = dataUrl;
      const fileName = pulseExportFileName(templateKey, `${data.report.year}-${String(data.report.month).padStart(2, "0")}`, "png");
      a.download = fileName;
      a.click();
      await recordExport.mutateAsync({ reportId, type: "png", templateKey, fileName });
      toast.success("تم تصدير الصورة (PNG) — جاهزة للنشر");
    } catch (e: any) {
      console.error(e);
      toast.error("تعذّر تصدير الصورة: " + (e?.message ?? ""));
    } finally {
      setExportingPng(false);
    }
  };

  const handleExport = async () => {
    if (!captureRef.current || !data) return;
    setExporting(true);
    try {
      const { dataUrl } = await generatePdf(captureRef.current);
      // download locally
      const a = document.createElement("a");
      a.href = dataUrl;
      const fileName = pulseExportFileName(templateKey, `${data.report.year}-${String(data.report.month).padStart(2, "0")}`, "pdf");
      a.download = fileName;
      a.click();

      // Upload is best-effort. RAWAHEL Pulse must still export locally without
      // any external storage runtime.
      const base64 = dataUrl.split(",")[1];
      let key: string | undefined;
      let url: string | undefined;
      try {
        const uploaded = await uploadPdf.mutateAsync({ reportId, base64 });
        key = uploaded.key;
        url = uploaded.url;
        await markGenerated.mutateAsync({ reportId, pdfKey: key, pdfUrl: url });
      } catch (uploadError) {
        console.warn("[PulseExport] PDF downloaded locally; remote storage unavailable.", uploadError);
      }
      await recordExport.mutateAsync({ reportId, type: "pdf", templateKey, fileName, fileKey: key, url });
      utils.reports.get.invalidate({ id: reportId });
      utils.reports.list.invalidate();
      toast.success("تم تصدير التقرير PDF");
    } catch (e: any) {
      console.error(e);
      toast.error("تعذّر تصدير الـ PDF: " + (e?.message ?? ""));
    } finally {
      setExporting(false);
    }
  };

  if (isLoading || !infographicData) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-[900px] w-[794px] mx-auto rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#2a3556] islamic-pattern">
      {/* Toolbar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-[#1b2a5e]/95 px-6 py-3 backdrop-blur">
        <button
          onClick={() => setLocation(`/reports/${reportId}`)}
          className="flex items-center gap-1 text-white/80 hover:text-white text-sm"
        >
          <ArrowRight className="h-4 w-4" />
          العودة للتحرير
        </button>
        <div className="text-white font-bold">{PRODUCT_NAME_AR} · معاينة التقرير</div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex rounded-lg border border-white/20 bg-white/10 p-1">
            {[
              { key: "monthly", label: "Monthly" },
              { key: "donor", label: "Donor" },
              { key: "annual", label: "Annual" },
            ].map((template) => (
              <button
                key={template.key}
                onClick={() => setTemplateKey(template.key as "monthly" | "donor" | "annual")}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                  templateKey === template.key ? "bg-[#d4a843] text-[#1b2a5e]" : "text-white/75 hover:text-white"
                }`}
              >
                {template.label}
              </button>
            ))}
          </div>
          <Button
            onClick={handleExportPng}
            disabled={exportingPng || exporting}
            variant="outline"
            className="border-white/30 bg-white/10 text-white hover:bg-white/20 font-bold"
          >
            {exportingPng ? (
              <Loader2 className="h-5 w-5 ml-1 animate-spin" />
            ) : (
              <ImageIcon className="h-5 w-5 ml-1" />
            )}
            {exportingPng ? "جارٍ..." : "تصدير صورة PNG"}
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting || exportingPng}
            className="bg-[#d4a843] hover:bg-[#e3c074] text-[#1b2a5e] font-bold"
          >
            {exporting ? (
              <Loader2 className="h-5 w-5 ml-1 animate-spin" />
            ) : (
              <Download className="h-5 w-5 ml-1" />
            )}
            {exporting ? "جارٍ التصدير..." : "تصدير PDF"}
          </Button>
        </div>
      </div>

      {/* Infographic canvas */}
      <div className="flex justify-center py-8 px-4 overflow-x-auto">
        <div className="shadow-2xl rounded-lg overflow-hidden">
          <Infographic ref={captureRef} data={infographicData} />
        </div>
      </div>
    </div>
  );
}
