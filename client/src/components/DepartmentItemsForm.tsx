import { type DepartmentDef } from "@shared/departments";
import {
  getDepartmentItems,
  getItemDef,
  getCustomMetricDefs,
  CUSTOM_METRICS_KEY,
  HIGHLIGHT_KEY,
  ITEM_TYPE_LABEL,
  itemIconName,
  type ItemDef,
  type ItemType,
  type ItemMetricField,
  type CustomMetricDef,
} from "@shared/items";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState, useEffect, useMemo } from "react";
import { Save, Trash2, Plus, Sparkles, GripVertical, X, Award } from "lucide-react";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type StoredItem = {
  itemKey: string;
  itemNameAr: string;
  itemType: string;
  metrics: Record<string, number>;
  notes?: string | null;
  sortOrder?: number;
};

type Props = {
  reportId: number;
  dept: DepartmentDef;
  storedItems: StoredItem[];
  onSaved?: () => void;
};

const TYPE_COLORS: Record<string, string> = {
  institute_online: "#4A90D9",
  institute_offline: "#1B2A5E",
  initiative_seasonal: "#2E7D6B",
  initiative_community: "#8E44AD",
  social_platform: "#C0392B",
  program: "#D4A843",
  unit: "#2C3E50",
};

/** Slugify an Arabic/English label into a stable custom metric key. */
function slugifyCustomKey(label: string): string {
  // Keep only word-ish chars; rely on a random fallback for non-latin labels.
  const base = label.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  return `custom_${base || Math.random().toString(36).slice(2, 7)}`;
}

function AddCustomKpi({
  onAdd,
  existingKeys,
}: {
  onAdd: (def: CustomMetricDef) => void;
  existingKeys: string[];
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [isBen, setIsBen] = useState(false);

  const submit = () => {
    const trimmed = label.trim();
    if (!trimmed) {
      toast.error("اكتب اسم المؤشر");
      return;
    }
    let key = slugifyCustomKey(trimmed);
    let n = 1;
    while (existingKeys.includes(key)) key = `${slugifyCustomKey(trimmed)}_${n++}`;
    onAdd({ key, label: trimmed, isBeneficiary: isBen });
    setLabel("");
    setIsBen(false);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 border-dashed text-[#1b2a5e]"
        >
          <Plus className="h-4 w-4 ml-1" />
          مؤشر مخصص
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" dir="rtl" align="start">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium mb-1 block text-muted-foreground">
              اسم المؤشر الجديد
            </label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="مثال: عدد الحضور"
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={isBen}
              onCheckedChange={(v) => setIsBen(!!v)}
            />
            يُحتسب ضمن المستفيدين
          </label>
          <Button onClick={submit} size="sm" className="w-full bg-[#1b2a5e] hover:bg-[#2c3f7a]">
            إضافة المؤشر
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ItemCard({
  reportId,
  dept,
  def,
  stored,
  onSaved,
  dragHandlers,
  isDragging,
}: {
  reportId: number;
  dept: DepartmentDef;
  def: ItemDef;
  stored?: StoredItem;
  onSaved?: () => void;
  dragHandlers: {
    draggable: boolean;
    onDragStart: () => void;
    onDragEnter: () => void;
    onDragEnd: () => void;
    onDragOver: (e: React.DragEvent) => void;
  };
  isDragging: boolean;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  // Custom metric definitions for this item (seeded from stored metrics).
  const [customDefs, setCustomDefs] = useState<CustomMetricDef[]>([]);
  // Free-text "highlight of the month" stored under __highlight.
  const [highlight, setHighlight] = useState("");
  const utils = trpc.useUtils();

  useEffect(() => {
    const storedCustom = getCustomMetricDefs(stored?.metrics);
    setCustomDefs(storedCustom);
    const storedHighlight = (stored?.metrics as Record<string, unknown> | undefined)?.[
      HIGHLIGHT_KEY
    ];
    setHighlight(typeof storedHighlight === "string" ? storedHighlight : "");
    const allFields: { key: string }[] = [...def.metrics, ...storedCustom];
    const v: Record<string, string> = {};
    for (const f of allFields) {
      const stval = stored?.metrics?.[f.key];
      const baseVal = (def.baseline as Record<string, number>)?.[f.key];
      const initial = stval !== undefined ? stval : baseVal;
      v[f.key] = initial !== undefined ? String(initial) : "";
    }
    setValues(v);
  }, [def.key, stored?.metrics]);

  const saveMutation = trpc.reports.saveItem.useMutation({
    onSuccess: () => {
      utils.reports.get.invalidate({ id: reportId });
      toast.success(`تم حفظ "${def.nameAr}"`);
      onSaved?.();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.reports.deleteItem.useMutation({
    onSuccess: () => {
      utils.reports.get.invalidate({ id: reportId });
      toast.success(`تم حذف "${def.nameAr}"`);
      onSaved?.();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    const metrics: Record<string, number | string | CustomMetricDef[]> = {};
    for (const [k, val] of Object.entries(values)) metrics[k] = Number(val) || 0;
    if (customDefs.length > 0) {
      metrics[CUSTOM_METRICS_KEY] = customDefs as unknown as CustomMetricDef[];
    }
    const trimmedHighlight = highlight.trim();
    if (trimmedHighlight) metrics[HIGHLIGHT_KEY] = trimmedHighlight;
    saveMutation.mutate({
      reportId,
      departmentKey: dept.key,
      itemKey: def.key,
      itemNameAr: def.nameAr,
      itemType: def.type,
      // metrics validated as record of number|string on the server; custom defs
      // are passed through as JSON under __custom, highlight under __highlight.
      metrics: metrics as unknown as Record<string, number | string>,
      notes: def.subtitle ?? "",
      sortOrder: stored?.sortOrder ?? 0,
    });
  };

  const addCustom = (c: CustomMetricDef) => {
    setCustomDefs((prev) => [...prev, c]);
    setValues((prev) => ({ ...prev, [c.key]: "" }));
  };

  const removeCustom = (key: string) => {
    setCustomDefs((prev) => prev.filter((c) => c.key !== key));
    setValues((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const accent = TYPE_COLORS[def.type] ?? dept.color;
  const isSaved = !!stored;
  const allFields: (ItemMetricField | CustomMetricDef)[] = [...def.metrics, ...customDefs];
  const customKeys = customDefs.map((c) => c.key);

  return (
    <div
      draggable={dragHandlers.draggable}
      onDragStart={dragHandlers.onDragStart}
      onDragEnter={dragHandlers.onDragEnter}
      onDragEnd={dragHandlers.onDragEnd}
      onDragOver={dragHandlers.onDragOver}
      className={`rounded-2xl border bg-card p-5 shadow-sm transition-all ${
        isDragging ? "opacity-50 ring-2 ring-[#1b2a5e]/40" : ""
      }`}
      style={{ borderColor: isSaved ? `${accent}55` : "var(--border)" }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-2">
          <button
            type="button"
            className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground touch-none"
            title="اسحب لإعادة الترتيب"
            aria-label="اسحب لإعادة الترتيب"
          >
            <GripVertical className="h-5 w-5" />
          </button>
          <div
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${accent}1a` }}
          >
            {(() => {
              const Cmp = (Icons as any)[itemIconName(dept.key, def.key, def.type)] ?? Icons.CircleDot;
              return <Cmp className="h-4 w-4" style={{ color: accent }} />;
            })()}
          </div>
          <div>
            <h4 className="font-bold text-foreground leading-tight">{def.nameAr}</h4>
            {def.subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{def.subtitle}</p>
            )}
          </div>
        </div>
        <Badge
          variant="outline"
          className="shrink-0 text-[11px]"
          style={{ borderColor: `${accent}66`, color: accent }}
        >
          {ITEM_TYPE_LABEL[def.type as ItemType]}
        </Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {allFields.map((f) => {
          const isCustom = customKeys.includes(f.key);
          return (
            <div key={f.key}>
              <label className="text-xs font-medium mb-1 flex items-center gap-1 text-muted-foreground">
                <span className="truncate">{f.label}</span>
                {isCustom && (
                  <button
                    type="button"
                    onClick={() => removeCustom(f.key)}
                    className="text-red-400 hover:text-red-600 shrink-0"
                    title="حذف المؤشر المخصص"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </label>
              <Input
                type="number"
                inputMode="numeric"
                value={values[f.key] ?? ""}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                placeholder="0"
                className={`text-right h-9 ${isCustom ? "border-[#d4a843]/50" : ""}`}
                dir="ltr"
              />
            </div>
          );
        })}
      </div>

      <div className="mt-3">
        <label className="text-xs font-medium mb-1 flex items-center gap-1 text-muted-foreground">
          <Award className="h-3.5 w-3.5 text-[#d4a843]" />
          أبرز إنجاز هذا الشهر <span className="text-muted-foreground/60">(يظهر في الإنفوجراف)</span>
        </label>
        <Input
          value={highlight}
          onChange={(e) => setHighlight(e.target.value)}
          placeholder="مثال: تخريج دفعة جديدة بـ ٥٠٠ مستفيد"
          className="h-9 text-sm"
          maxLength={120}
        />
      </div>

      <div className="flex items-center gap-2 mt-4 flex-wrap">
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          size="sm"
          className="bg-[#1b2a5e] hover:bg-[#2c3f7a] font-bold"
        >
          <Save className="h-4 w-4 ml-1" />
          {saveMutation.isPending ? "جارٍ الحفظ..." : "حفظ"}
        </Button>
        <AddCustomKpi onAdd={addCustom} existingKeys={[...def.metrics.map((m) => m.key), ...customKeys]} />
        {isSaved && (
          <Button
            onClick={() =>
              deleteMutation.mutate({
                reportId,
                departmentKey: dept.key,
                itemKey: def.key,
              })
            }
            disabled={deleteMutation.isPending}
            size="sm"
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        {isSaved && (
          <span className="text-xs text-emerald-600 font-medium mr-auto">
            ✓ محفوظ
          </span>
        )}
      </div>
    </div>
  );
}

export function DepartmentItemsForm({ reportId, dept, storedItems, onSaved }: Props) {
  const catalogDefs = useMemo(() => getDepartmentItems(dept.key), [dept.key]);
  const storedMap = useMemo(() => {
    const m = new Map<string, StoredItem>();
    for (const s of storedItems) m.set(s.itemKey, s);
    return m;
  }, [storedItems]);
  const utils = trpc.useUtils();

  // Build the ordered list of catalog item keys. Saved items follow their
  // stored sortOrder; unsaved ones keep the catalog order at the end.
  const initialOrder = useMemo(() => {
    const saved = catalogDefs
      .filter((d) => storedMap.has(d.key))
      .sort(
        (a, b) =>
          (storedMap.get(a.key)?.sortOrder ?? 0) -
          (storedMap.get(b.key)?.sortOrder ?? 0)
      )
      .map((d) => d.key);
    const unsaved = catalogDefs.filter((d) => !storedMap.has(d.key)).map((d) => d.key);
    return [...saved, ...unsaved];
  }, [catalogDefs, storedMap]);

  const [order, setOrder] = useState<string[]>(initialOrder);
  useEffect(() => setOrder(initialOrder), [initialOrder]);

  const [dragKey, setDragKey] = useState<string | null>(null);

  const reorderMutation = trpc.reports.reorderItems.useMutation({
    onSuccess: () => {
      utils.reports.get.invalidate({ id: reportId });
      onSaved?.();
    },
    onError: (e) => toast.error(e.message),
  });

  const seedMutation = trpc.reports.seedBaseline.useMutation({
    onSuccess: ({ seeded }) => {
      utils.reports.get.invalidate({ id: reportId });
      toast.success(`تم إدراج ${seeded} عنصر بالأرقام الأساسية`);
      onSaved?.();
    },
    onError: (e) => toast.error(e.message),
  });

  const savedCount = catalogDefs.filter((d) => storedMap.has(d.key)).length;

  const handleDragEnd = () => {
    setDragKey(null);
    // Persist order only for items that are actually saved (exist in DB).
    const savedOrder = order.filter((k) => storedMap.has(k));
    if (savedOrder.length > 1) {
      reorderMutation.mutate({
        reportId,
        departmentKey: dept.key,
        orderedItemKeys: savedOrder,
      });
    }
  };

  const handleDragEnter = (targetKey: string) => {
    if (!dragKey || dragKey === targetKey) return;
    setOrder((prev) => {
      const next = [...prev];
      const from = next.indexOf(dragKey);
      const to = next.indexOf(targetKey);
      if (from === -1 || to === -1) return prev;
      next.splice(from, 1);
      next.splice(to, 0, dragKey);
      return next;
    });
  };

  const defByKey = useMemo(() => {
    const m = new Map<string, ItemDef>();
    for (const d of catalogDefs) m.set(d.key, d);
    return m;
  }, [catalogDefs]);

  return (
    <div className="space-y-5">
      <div
        className="rounded-2xl p-5 text-white"
        style={{
          background: `linear-gradient(135deg, ${dept.color} 0%, ${dept.color}cc 100%)`,
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold">{dept.name}</h3>
            <p className="text-white/80 text-sm mt-1">{dept.description}</p>
          </div>
          <div className="text-left shrink-0">
            <div className="text-2xl font-extrabold">
              {savedCount}/{catalogDefs.length}
            </div>
            <div className="text-white/70 text-xs">عناصر محفوظة</div>
          </div>
        </div>
      </div>

      {catalogDefs.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
          لا توجد عناصر مُعرّفة لهذا القسم بعد.
        </div>
      ) : (
        <>
          {savedCount === 0 && (
            <div className="rounded-2xl border border-[#d4a843]/40 bg-[#d4a843]/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2">
                <Sparkles className="h-5 w-5 text-[#d4a843] shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">
                  ابدأ بإدراج العناصر بالأرقام الأساسية من الملف التعريفي، ثم
                  حدّثها بأرقام الشهر الحالي. يمكنك سحب البطاقات لإعادة ترتيبها
                  وإضافة مؤشرات مخصصة لكل عنصر.
                </p>
              </div>
              <Button
                onClick={() => seedMutation.mutate({ reportId })}
                disabled={seedMutation.isPending}
                className="bg-[#d4a843] hover:bg-[#e3c074] text-[#1b2a5e] font-bold shrink-0"
              >
                <Plus className="h-4 w-4 ml-1" />
                {seedMutation.isPending ? "جارٍ الإدراج..." : "إدراج الأرقام الأساسية"}
              </Button>
            </div>
          )}
          <div className="space-y-4">
            {order.map((key) => {
              const def = defByKey.get(key);
              if (!def) return null;
              return (
                <ItemCard
                  key={def.key}
                  reportId={reportId}
                  dept={dept}
                  def={def}
                  stored={storedMap.get(def.key)}
                  onSaved={onSaved}
                  isDragging={dragKey === def.key}
                  dragHandlers={{
                    draggable: true,
                    onDragStart: () => setDragKey(def.key),
                    onDragEnter: () => handleDragEnter(def.key),
                    onDragEnd: handleDragEnd,
                    onDragOver: (e) => e.preventDefault(),
                  }}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
