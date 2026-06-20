import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PRODUCT_NAME_AR, PRODUCT_NAME_EN, PULSE_TERMS } from "@shared/pulse";
import type { EntityType } from "@shared/masterData";
import {
  Activity,
  Archive,
  BadgeCheck,
  BookOpen,
  Building2,
  ImagePlus,
  Link as LinkIcon,
  Plus,
  Save,
  Target,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const entityTypes: { value: EntityType; label: string }[] = [
  { value: "office", label: "مكتب" },
  { value: "institute_online", label: "معهد أونلاين" },
  { value: "institute_offline", label: "معهد أرضي" },
  { value: "quran_institute", label: "معهد قرآني" },
  { value: "initiative", label: "مبادرة" },
  { value: "campaign", label: "حملة" },
  { value: "project", label: "مشروع" },
  { value: "unit", label: "وحدة" },
  { value: "department", label: "قسم" },
  { value: "platform", label: "منصة" },
];

type PulseEntity = {
  id: number;
  key: string;
  nameAr: string;
  type: EntityType;
  descriptionAr: string | null;
  ownerName?: string | null;
  status: "active" | "paused" | "archived";
};

type PulseTrack = { id: number; key: string; nameAr: string; descriptionAr?: string | null; color?: string; icon?: string; sortOrder?: number };
type PulseGoal = { id: number; key: string; trackId?: number | null; nameAr: string; descriptionAr?: string | null; targetValue?: number; targetUnit?: string; periodType?: "yearly" | "two_years" | "monthly" | "custom"; sortOrder?: number };
type PulseMetric = { id: number; nameAr: string };

function slugifyArabic(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\u0600-\u06FFa-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

export default function PulseAdmin() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: master, isLoading } = trpc.pulse.masterData.useQuery();
  const { data: reports } = trpc.reports.list.useQuery();
  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [entityForm, setEntityForm] = useState({
    nameAr: "",
    key: "",
    type: "office" as EntityType,
    descriptionAr: "",
    ownerName: "",
    trackIds: [] as number[],
    goalIds: [] as number[],
  });
  const [metricForm, setMetricForm] = useState({
    key: "",
    nameAr: "",
    unit: "count" as "count" | "percent" | "currency" | "hours" | "days" | "text_score",
  });
  const [metricValues, setMetricValues] = useState<Record<number, string>>({});
  const [evidenceForm, setEvidenceForm] = useState({
    titleAr: "",
    url: "",
    descriptionAr: "",
    type: "link" as "image" | "video" | "link" | "document" | "testimonial" | "story",
  });
  const [trackForm, setTrackForm] = useState({
    key: "",
    nameAr: "",
    descriptionAr: "",
    color: "#1b2a5e",
    icon: "Route",
  });
  const [goalForm, setGoalForm] = useState({
    key: "",
    trackId: "",
    nameAr: "",
    descriptionAr: "",
    targetValue: "",
    targetUnit: "عدد",
    periodType: "yearly" as "yearly" | "two_years" | "monthly" | "custom",
  });

  const activeEntities = useMemo(
    () => ((master?.entities ?? []) as PulseEntity[]).filter((entity: PulseEntity) => entity.status !== "archived"),
    [master?.entities]
  );
  const selectedEntity =
    activeEntities.find((entity: PulseEntity) => entity.id === selectedEntityId) ?? activeEntities[0];

  const { data: entityMetrics } = trpc.pulse.metricsForEntity.useQuery(
    { entityId: selectedEntity?.id ?? 0 },
    { enabled: !!selectedEntity?.id }
  );
  const { data: reportValues } = trpc.pulse.reportValues.useQuery(
    { reportId: selectedReportId ?? 0 },
    { enabled: !!selectedReportId }
  );
  const { data: dashboard } = trpc.pulse.dashboard.useQuery(
    { reportId: selectedReportId ?? undefined },
    { enabled: true }
  );

  const createEntity = trpc.pulse.createEntity.useMutation({
    onSuccess: ({ id }) => {
      toast.success("تم إنشاء الكيان وربطه بالمسارات والأهداف");
      setSelectedEntityId(id);
      setEntityForm({
        nameAr: "",
        key: "",
        type: "office",
        descriptionAr: "",
        ownerName: "",
        trackIds: [],
        goalIds: [],
      });
      utils.pulse.masterData.invalidate();
      utils.pulse.dashboard.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateEntity = trpc.pulse.updateEntity.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الكيان وروابطه");
      utils.pulse.masterData.invalidate();
      utils.pulse.dashboard.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const archiveEntity = trpc.pulse.archiveEntity.useMutation({
    onSuccess: () => {
      toast.success("تم أرشفة الكيان مع الحفاظ على البيانات التاريخية");
      utils.pulse.masterData.invalidate();
      utils.pulse.dashboard.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const createMetric = trpc.pulse.createMetricDefinition.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة مؤشر الأداء");
      setMetricForm({ key: "", nameAr: "", unit: "count" });
      utils.pulse.metricsForEntity.invalidate();
      utils.pulse.masterData.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const saveMetricValues = trpc.pulse.saveMetricValues.useMutation({
    onSuccess: ({ saved }) => {
      toast.success(`تم حفظ ${saved} قيمة مؤشر`);
      utils.pulse.reportValues.invalidate();
      utils.pulse.dashboard.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const addEvidence = trpc.pulse.addEvidence.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة شاهد الإنجاز");
      setEvidenceForm({ titleAr: "", url: "", descriptionAr: "", type: "link" });
      utils.pulse.dashboard.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const createTrack = trpc.pulse.createTrack.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء المسار الاستراتيجي");
      setTrackForm({ key: "", nameAr: "", descriptionAr: "", color: "#1b2a5e", icon: "Route" });
      utils.pulse.masterData.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const createGoal = trpc.pulse.createGoal.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء الهدف الاستراتيجي");
      setGoalForm({ key: "", trackId: "", nameAr: "", descriptionAr: "", targetValue: "", targetUnit: "عدد", periodType: "yearly" });
      utils.pulse.masterData.invalidate();
      utils.pulse.dashboard.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const loadSelectedEntityForEdit = () => {
    if (!selectedEntity || !master) return;
    setEntityForm({
      nameAr: selectedEntity.nameAr,
      key: selectedEntity.key,
      type: selectedEntity.type,
      descriptionAr: selectedEntity.descriptionAr ?? "",
      ownerName: selectedEntity.ownerName ?? "",
      trackIds: master.entityTrackLinks.filter((link) => link.entityId === selectedEntity.id).map((link) => link.trackId),
      goalIds: master.entityGoalLinks.filter((link) => link.entityId === selectedEntity.id).map((link) => link.goalId),
    });
  };

  const toggleId = (ids: number[], id: number) =>
    ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];

  const existingValue = (metricDefinitionId: number) =>
    reportValues?.find(
      (value) =>
        value.entityId === selectedEntity?.id &&
        value.metricDefinitionId === metricDefinitionId
    )?.valueNumber;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f2e7] p-8">
        <Skeleton className="h-24 rounded-3xl" />
        <Skeleton className="mt-6 h-[520px] rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f2e7]" dir="rtl">
      <header className="relative overflow-hidden bg-[#1b2a5e] px-6 py-8 text-white md:px-10">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20px_20px,#d4a843_1px,transparent_1px)] [background-size:42px_42px]" />
        <div className="relative mx-auto max-w-7xl">
          <Badge className="bg-[#d4a843] text-[#1b2a5e] hover:bg-[#d4a843]">
            {PRODUCT_NAME_EN}
          </Badge>
          <h1 className="mt-3 text-3xl font-extrabold md:text-4xl">
            {PRODUCT_NAME_AR}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-white/75">
            نظام عربي مرن لإدارة الكيانات التنفيذية، ربطها بالمسارات والأهداف،
            إدخال مؤشرات الأداء، وتوثيق شواهد الأثر للتقارير الشهرية والداعمين.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 md:px-10">
        <section className="grid gap-4 md:grid-cols-5">
          <PulseStat label="إجمالي المستفيدين" value={dashboard?.totals.totalBeneficiaries ?? 0} icon={<Activity />} />
          <PulseStat label="المستفيدون الجدد" value={dashboard?.totals.newBeneficiaries ?? 0} icon={<Plus />} />
          <PulseStat label="الأنشطة المنفذة" value={dashboard?.totals.totalActivities ?? 0} icon={<BookOpen />} />
          <PulseStat label="شواهد الأثر" value={dashboard?.totals.totalEvidenceAssets ?? 0} icon={<ImagePlus />} />
          <PulseStat label="نسبة تحقيق الأهداف" value={dashboard?.totals.goalAchievementRate ?? 0} suffix="%" icon={<Target />} />
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-[#1b2a5e]/10 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-extrabold text-[#1b2a5e]">المسارات الاستراتيجية</h2>
            <p className="mt-1 text-sm text-slate-500">أضف مسارًا جديدًا أو راجع المسارات الحالية.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Input
                placeholder="اسم المسار"
                value={trackForm.nameAr}
                onChange={(event) =>
                  setTrackForm((form) => ({
                    ...form,
                    nameAr: event.target.value,
                    key: form.key || slugifyArabic(event.target.value),
                  }))
                }
              />
              <Input
                placeholder="track_key"
                dir="ltr"
                value={trackForm.key}
                onChange={(event) => setTrackForm((form) => ({ ...form, key: event.target.value }))}
              />
              <Input
                placeholder="لون المسار"
                dir="ltr"
                value={trackForm.color}
                onChange={(event) => setTrackForm((form) => ({ ...form, color: event.target.value }))}
              />
              <Input
                placeholder="Icon"
                dir="ltr"
                value={trackForm.icon}
                onChange={(event) => setTrackForm((form) => ({ ...form, icon: event.target.value }))}
              />
              <Textarea
                className="md:col-span-2"
                placeholder="وصف المسار"
                value={trackForm.descriptionAr}
                onChange={(event) => setTrackForm((form) => ({ ...form, descriptionAr: event.target.value }))}
              />
            </div>
            <Button
              className="mt-4 bg-[#1b2a5e] hover:bg-[#2c3f7a]"
              disabled={!trackForm.nameAr || !trackForm.key || createTrack.isPending}
              onClick={() => createTrack.mutate(trackForm)}
            >
              <Plus className="ml-2 h-4 w-4" />
              إضافة مسار
            </Button>
            <div className="mt-4 flex flex-wrap gap-2">
              {((master?.tracks ?? []) as PulseTrack[]).map((track) => (
                <Badge key={track.id} variant="secondary">{track.nameAr}</Badge>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[#1b2a5e]/10 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-extrabold text-[#1b2a5e]">الأهداف الاستراتيجية</h2>
            <p className="mt-1 text-sm text-slate-500">أضف هدفًا قابلًا للقياس واربطه بمسار.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Input
                placeholder="اسم الهدف"
                value={goalForm.nameAr}
                onChange={(event) =>
                  setGoalForm((form) => ({
                    ...form,
                    nameAr: event.target.value,
                    key: form.key || slugifyArabic(event.target.value),
                  }))
                }
              />
              <Input
                placeholder="goal_key"
                dir="ltr"
                value={goalForm.key}
                onChange={(event) => setGoalForm((form) => ({ ...form, key: event.target.value }))}
              />
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={goalForm.trackId}
                onChange={(event) => setGoalForm((form) => ({ ...form, trackId: event.target.value }))}
              >
                <option value="">بدون مسار</option>
                {((master?.tracks ?? []) as PulseTrack[]).map((track) => (
                  <option key={track.id} value={track.id}>{track.nameAr}</option>
                ))}
              </select>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={goalForm.periodType}
                onChange={(event) => setGoalForm((form) => ({ ...form, periodType: event.target.value as typeof goalForm.periodType }))}
              >
                <option value="yearly">سنوي</option>
                <option value="two_years">عامان</option>
                <option value="monthly">شهري</option>
                <option value="custom">مخصص</option>
              </select>
              <Input
                placeholder="المستهدف"
                type="number"
                value={goalForm.targetValue}
                onChange={(event) => setGoalForm((form) => ({ ...form, targetValue: event.target.value }))}
              />
              <Input
                placeholder="وحدة القياس"
                value={goalForm.targetUnit}
                onChange={(event) => setGoalForm((form) => ({ ...form, targetUnit: event.target.value }))}
              />
              <Textarea
                className="md:col-span-2"
                placeholder="وصف الهدف"
                value={goalForm.descriptionAr}
                onChange={(event) => setGoalForm((form) => ({ ...form, descriptionAr: event.target.value }))}
              />
            </div>
            <Button
              className="mt-4 bg-[#2e7d6b] hover:bg-[#256a5b]"
              disabled={!goalForm.nameAr || !goalForm.key || createGoal.isPending}
              onClick={() =>
                createGoal.mutate({
                  ...goalForm,
                  trackId: goalForm.trackId ? Number(goalForm.trackId) : null,
                  targetValue: Number(goalForm.targetValue || 0),
                })
              }
            >
              <Plus className="ml-2 h-4 w-4" />
              إضافة هدف
            </Button>
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-3xl border border-[#1b2a5e]/10 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold text-[#1b2a5e]">
                  {PULSE_TERMS.entities}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  أضف معهدًا أو مكتبًا أو وحدة دون تعديل الكود.
                </p>
              </div>
              <Building2 className="h-7 w-7 text-[#d4a843]" />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="اسم الكيان: معهد جديد"
                value={entityForm.nameAr}
                onChange={(event) =>
                  setEntityForm((form) => ({
                    ...form,
                    nameAr: event.target.value,
                    key: form.key || slugifyArabic(event.target.value),
                  }))
                }
              />
              <Input
                placeholder="slug مثل new_institute"
                dir="ltr"
                value={entityForm.key}
                onChange={(event) => setEntityForm((form) => ({ ...form, key: event.target.value }))}
              />
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={entityForm.type}
                onChange={(event) =>
                  setEntityForm((form) => ({ ...form, type: event.target.value as EntityType }))
                }
              >
                {entityTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <Input
                placeholder="اسم المسؤول"
                value={entityForm.ownerName}
                onChange={(event) => setEntityForm((form) => ({ ...form, ownerName: event.target.value }))}
              />
              <Textarea
                className="md:col-span-2"
                placeholder="وصف مختصر للكيان"
                value={entityForm.descriptionAr}
                onChange={(event) => setEntityForm((form) => ({ ...form, descriptionAr: event.target.value }))}
              />
            </div>

            <Chooser
              title={PULSE_TERMS.strategicTracks}
              options={((master?.tracks ?? []) as PulseTrack[]).map((track: PulseTrack) => ({ id: track.id, label: track.nameAr }))}
              selected={entityForm.trackIds}
              onToggle={(id) => setEntityForm((form) => ({ ...form, trackIds: toggleId(form.trackIds, id) }))}
            />
            <Chooser
              title={PULSE_TERMS.strategicGoals}
              options={((master?.goals ?? []) as PulseGoal[]).map((goal: PulseGoal) => ({ id: goal.id, label: goal.nameAr }))}
              selected={entityForm.goalIds}
              onToggle={(id) => setEntityForm((form) => ({ ...form, goalIds: toggleId(form.goalIds, id) }))}
            />

            <Button
              className="mt-5 bg-[#1b2a5e] hover:bg-[#2c3f7a]"
              disabled={!entityForm.nameAr || !entityForm.key || createEntity.isPending}
              onClick={() => createEntity.mutate(entityForm)}
            >
              <Plus className="ml-2 h-4 w-4" />
              إضافة كيان
            </Button>
            <Button
              className="mt-5 mr-2"
              variant="outline"
              disabled={!selectedEntity}
              onClick={loadSelectedEntityForEdit}
            >
              تحميل المحدد للتعديل
            </Button>
            <Button
              className="mt-5 mr-2 bg-[#2e7d6b] hover:bg-[#256a5b]"
              disabled={!selectedEntity || !entityForm.nameAr || !entityForm.key || updateEntity.isPending}
              onClick={() =>
                selectedEntity &&
                updateEntity.mutate({
                  id: selectedEntity.id,
                  nameAr: entityForm.nameAr,
                  type: entityForm.type,
                  descriptionAr: entityForm.descriptionAr,
                  ownerName: entityForm.ownerName,
                  trackIds: entityForm.trackIds,
                  goalIds: entityForm.goalIds,
                })
              }
            >
              <Save className="ml-2 h-4 w-4" />
              حفظ تعديلات الكيان
            </Button>

            <div className="mt-6 grid max-h-[520px] gap-2 overflow-auto pr-1">
              {activeEntities.map((entity: PulseEntity) => (
                <button
                  key={entity.id}
                  onClick={() => setSelectedEntityId(entity.id)}
                  className={`rounded-2xl border p-4 text-right transition ${
                    selectedEntity?.id === entity.id
                      ? "border-[#d4a843] bg-[#fff8e4]"
                      : "border-slate-200 bg-white hover:border-[#1b2a5e]/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-[#1b2a5e]">{entity.nameAr}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {entityTypes.find((type) => type.value === entity.type)?.label ?? entity.type}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-slate-500 hover:text-red-700"
                      onClick={(event) => {
                        event.stopPropagation();
                        archiveEntity.mutate({ id: entity.id });
                      }}
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-slate-500 hover:text-[#1b2a5e]"
                      onClick={(event) => {
                        event.stopPropagation();
                        setLocation(`/entities/${entity.id}`);
                      }}
                    >
                      <LinkIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-[#1b2a5e]/10 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-extrabold text-[#1b2a5e]">
                {PULSE_TERMS.metrics}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                اختر الكيان، ثم أضف KPI خاصًا به عند الحاجة.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <Input
                  placeholder="اسم المؤشر"
                  value={metricForm.nameAr}
                  onChange={(event) =>
                    setMetricForm((form) => ({
                      ...form,
                      nameAr: event.target.value,
                      key: form.key || slugifyArabic(event.target.value),
                    }))
                  }
                />
                <Input
                  placeholder="metric_key"
                  dir="ltr"
                  value={metricForm.key}
                  onChange={(event) => setMetricForm((form) => ({ ...form, key: event.target.value }))}
                />
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={metricForm.unit}
                  onChange={(event) => setMetricForm((form) => ({ ...form, unit: event.target.value as typeof metricForm.unit }))}
                >
                  <option value="count">عدد</option>
                  <option value="percent">نسبة</option>
                  <option value="currency">عملة</option>
                  <option value="hours">ساعات</option>
                  <option value="days">أيام</option>
                  <option value="text_score">نصي</option>
                </select>
              </div>
              <Button
                className="mt-4 bg-[#2e7d6b] hover:bg-[#256a5b]"
                disabled={!selectedEntity || !metricForm.nameAr || !metricForm.key}
                onClick={() =>
                  createMetric.mutate({
                    ...metricForm,
                    entityId: selectedEntity?.id,
                    isCore: false,
                    isDonorFacing: true,
                  })
                }
              >
                <BadgeCheck className="ml-2 h-4 w-4" />
                إضافة KPI للكيان المحدد
              </Button>
            </div>

            <div className="rounded-3xl border border-[#1b2a5e]/10 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-extrabold text-[#1b2a5e]">
                الإدخال الشهري
              </h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={selectedReportId ?? ""}
                  onChange={(event) => setSelectedReportId(Number(event.target.value) || null)}
                >
                  <option value="">اختر التقرير الشهري</option>
                  {(reports ?? []).map((report) => (
                    <option key={report.id} value={report.id}>
                      {report.title}
                    </option>
                  ))}
                </select>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={selectedEntity?.id ?? ""}
                  onChange={(event) => setSelectedEntityId(Number(event.target.value) || null)}
                >
                  {activeEntities.map((entity: PulseEntity) => (
                    <option key={entity.id} value={entity.id}>
                      {entity.nameAr}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-5 grid gap-3">
                {((entityMetrics ?? []) as PulseMetric[]).slice(0, 12).map((metric: PulseMetric) => (
                  <label key={metric.id} className="grid gap-1 md:grid-cols-[1fr_160px] md:items-center">
                    <span className="text-sm font-medium text-slate-700">{metric.nameAr}</span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      placeholder={String(existingValue(metric.id) ?? "0")}
                      value={metricValues[metric.id] ?? ""}
                      onChange={(event) =>
                        setMetricValues((values) => ({
                          ...values,
                          [metric.id]: event.target.value,
                        }))
                      }
                    />
                  </label>
                ))}
              </div>

              <Button
                className="mt-5 bg-[#1b2a5e] hover:bg-[#2c3f7a]"
                disabled={!selectedReportId || !selectedEntity}
                onClick={() =>
                  saveMetricValues.mutate({
                    reportId: selectedReportId as number,
                    entityId: selectedEntity?.id as number,
                    values: Object.entries(metricValues)
                      .filter(([, value]) => value !== "")
                      .map(([metricDefinitionId, value]) => ({
                        metricDefinitionId: Number(metricDefinitionId),
                        valueNumber: Number(value),
                        source: "manual",
                      })),
                  })
                }
              >
                <Save className="ml-2 h-4 w-4" />
                حفظ مؤشرات الشهر
              </Button>
            </div>

            <div className="rounded-3xl border border-[#1b2a5e]/10 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-extrabold text-[#1b2a5e]">
                {PULSE_TERMS.evidence}
              </h2>
              <div className="mt-4 grid gap-3">
                <Input
                  placeholder="عنوان الشاهد / القصة"
                  value={evidenceForm.titleAr}
                  onChange={(event) => setEvidenceForm((form) => ({ ...form, titleAr: event.target.value }))}
                />
                <Input
                  placeholder="رابط الصورة أو الفيديو أو المستند"
                  dir="ltr"
                  value={evidenceForm.url}
                  onChange={(event) => setEvidenceForm((form) => ({ ...form, url: event.target.value }))}
                />
                <Textarea
                  placeholder="وصف مختصر يصلح لتقارير الداعمين"
                  value={evidenceForm.descriptionAr}
                  onChange={(event) => setEvidenceForm((form) => ({ ...form, descriptionAr: event.target.value }))}
                />
              </div>
              <Button
                className="mt-4 bg-[#d4a843] font-bold text-[#1b2a5e] hover:bg-[#e3c074]"
                disabled={!selectedReportId || !evidenceForm.titleAr || !evidenceForm.url}
                onClick={() =>
                  addEvidence.mutate({
                    reportId: selectedReportId as number,
                    entityId: selectedEntity?.id,
                    titleAr: evidenceForm.titleAr,
                    url: evidenceForm.url,
                    descriptionAr: evidenceForm.descriptionAr,
                    type: evidenceForm.type,
                    isDonorFacing: true,
                  })
                }
              >
                <LinkIcon className="ml-2 h-4 w-4" />
                إضافة شاهد
              </Button>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-[#1b2a5e]/10 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-extrabold text-[#1b2a5e]">تقدم الأهداف الاستراتيجية</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {(dashboard?.goalProgress ?? []).slice(0, 15).map((goal) => (
              <button
                key={goal.key}
                onClick={() => setLocation(`/goals/${goal.goalId}`)}
                className="rounded-2xl border border-slate-200 p-4 text-right transition hover:border-[#1b2a5e]/40 hover:bg-slate-50"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-bold text-slate-800">{goal.nameAr}</div>
                  <Badge
                    className={
                      goal.status === "green"
                        ? "bg-emerald-100 text-emerald-700"
                        : goal.status === "amber"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                    }
                  >
                    {goal.progress}%
                  </Badge>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[#d4a843]"
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  {goal.actual.toLocaleString("ar-EG")} / {goal.target.toLocaleString("ar-EG")} {goal.unit}
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function PulseStat({
  label,
  value,
  suffix,
  icon,
}: {
  label: string;
  value: number;
  suffix?: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-[#1b2a5e]/10 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between text-[#1b2a5e]">
        <span className="text-sm font-semibold text-slate-500">{label}</span>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f7f2e7] text-[#d4a843]">
          {icon}
        </div>
      </div>
      <div className="mt-4 text-3xl font-extrabold text-[#1b2a5e]">
        {value.toLocaleString("ar-EG")}
        {suffix}
      </div>
    </div>
  );
}

function Chooser({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: { id: number; label: string }[];
  selected: number[];
  onToggle: (id: number) => void;
}) {
  return (
    <div className="mt-5">
      <div className="mb-2 text-sm font-bold text-[#1b2a5e]">{title}</div>
      <div className="flex max-h-32 flex-wrap gap-2 overflow-auto rounded-2xl bg-slate-50 p-3">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onToggle(option.id)}
            className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
              selected.includes(option.id)
                ? "border-[#d4a843] bg-[#fff8e4] text-[#1b2a5e]"
                : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
