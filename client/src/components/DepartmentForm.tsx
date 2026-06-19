import { type DepartmentDef } from "@shared/departments";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { Plus, X, Save } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type Props = {
  reportId: number;
  dept: DepartmentDef;
  initialMetrics?: Record<string, number>;
  initialAchievements?: string[];
  initialNotes?: string;
  onSaved?: () => void;
};

export function DepartmentForm({
  reportId,
  dept,
  initialMetrics,
  initialAchievements,
  initialNotes,
  onSaved,
}: Props) {
  const [metrics, setMetrics] = useState<Record<string, string>>({});
  const [achievements, setAchievements] = useState<string[]>([]);
  const [newAch, setNewAch] = useState("");
  const [notes, setNotes] = useState("");
  const utils = trpc.useUtils();

  useEffect(() => {
    const m: Record<string, string> = {};
    for (const field of dept.metrics) {
      const v = initialMetrics?.[field.key];
      m[field.key] = v !== undefined ? String(v) : "";
    }
    setMetrics(m);
    setAchievements(initialAchievements ?? []);
    setNotes(initialNotes ?? "");
  }, [dept.key, initialMetrics, initialAchievements, initialNotes]);

  const saveMutation = trpc.reports.saveDepartment.useMutation({
    onSuccess: () => {
      utils.reports.get.invalidate({ id: reportId });
      toast.success(`تم حفظ بيانات ${dept.name}`);
      onSaved?.();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    const numericMetrics: Record<string, number> = {};
    for (const [k, v] of Object.entries(metrics)) {
      numericMetrics[k] = Number(v) || 0;
    }
    saveMutation.mutate({
      reportId,
      departmentKey: dept.key,
      metrics: numericMetrics,
      achievements: achievements.filter((a) => a.trim()),
      notes,
    });
  };

  const addAchievement = () => {
    if (newAch.trim()) {
      setAchievements([...achievements, newAch.trim()]);
      setNewAch("");
    }
  };

  return (
    <div className="space-y-6">
      <div
        className="rounded-2xl p-5 text-white"
        style={{
          background: `linear-gradient(135deg, ${dept.color} 0%, ${dept.color}cc 100%)`,
        }}
      >
        <h3 className="text-xl font-bold">{dept.name}</h3>
        <p className="text-white/80 text-sm mt-1">{dept.description}</p>
      </div>

      {/* Metrics grid */}
      <div>
        <h4 className="font-bold text-foreground mb-3">المؤشرات الرقمية</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {dept.metrics.map((field) => (
            <div key={field.key}>
              <label className="text-sm font-medium mb-1.5 block">
                {field.label}
                {field.type === "percent" && (
                  <span className="text-muted-foreground"> (%)</span>
                )}
              </label>
              <Input
                type="number"
                inputMode="numeric"
                value={metrics[field.key] ?? ""}
                onChange={(e) =>
                  setMetrics({ ...metrics, [field.key]: e.target.value })
                }
                placeholder={field.hint ?? "0"}
                className="text-right"
                dir="ltr"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Achievements */}
      <div>
        <h4 className="font-bold text-foreground mb-3">أبرز الإنجازات</h4>
        <div className="flex gap-2 mb-3">
          <Input
            value={newAch}
            onChange={(e) => setNewAch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addAchievement();
              }
            }}
            placeholder="اكتب إنجازًا واضغط إضافة..."
          />
          <Button
            type="button"
            onClick={addAchievement}
            variant="outline"
            className="shrink-0 border-[#1b2a5e]/20"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {achievements.length > 0 && (
          <div className="space-y-2">
            {achievements.map((a, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: dept.color }}
                  />
                  <span className="text-sm">{a}</span>
                </div>
                <button
                  onClick={() =>
                    setAchievements(achievements.filter((_, idx) => idx !== i))
                  }
                  className="text-muted-foreground hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <h4 className="font-bold text-foreground mb-3">ملاحظات (اختياري)</h4>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="أي ملاحظات إضافية عن أداء القسم هذا الشهر..."
          rows={3}
        />
      </div>

      <Button
        onClick={handleSave}
        disabled={saveMutation.isPending}
        size="lg"
        className="bg-[#1b2a5e] hover:bg-[#2c3f7a] font-bold w-full sm:w-auto"
      >
        <Save className="h-5 w-5 ml-1" />
        {saveMutation.isPending ? "جارٍ الحفظ..." : "حفظ بيانات القسم"}
      </Button>
    </div>
  );
}
