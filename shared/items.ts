/**
 * Named sub-items catalog for Rawahel Foundation departments.
 *
 * Each department contains real, named items (institutes, courses, initiatives,
 * platforms, programs) extracted from the foundation profile. Each item declares
 * its own metric fields and the baseline (historical/cumulative) numbers used to
 * seed the first report.
 *
 * Stable keys (itemKey) must NOT change once data exists.
 */

export type ItemMetricField = {
  key: string;
  label: string; // Arabic label
  type: "number" | "percent";
  /** When true, this field feeds the department-level beneficiaries roll-up. */
  isBeneficiary?: boolean;
};

export type ItemType =
  | "institute_online"
  | "institute_offline"
  | "initiative_seasonal"
  | "initiative_community"
  | "social_platform"
  | "program"
  | "unit";

export const ITEM_TYPE_LABEL: Record<ItemType, string> = {
  institute_online: "معهد أونلاين",
  institute_offline: "معهد أرضي",
  initiative_seasonal: "مبادرة موسمية",
  initiative_community: "مبادرة مجتمعية",
  social_platform: "منصة تواصل",
  program: "برنامج",
  unit: "وحدة",
};

export type ItemDef = {
  key: string; // stable slug, unique within department
  nameAr: string;
  type: ItemType;
  /** Short descriptive line shown in the form and infographic. */
  subtitle?: string;
  /** Founding / launch year if known. */
  since?: number;
  /** Metric fields specific to this item. */
  metrics: ItemMetricField[];
  /** Baseline values used to seed the first report (keyed by metric key). */
  baseline: Record<string, number>;
};

// ---- Reusable metric field builders -------------------------------------

const BENEFICIARIES: ItemMetricField = {
  key: "beneficiaries",
  label: "عدد المستفيدين",
  type: "number",
  isBeneficiary: true,
};
const BATCHES: ItemMetricField = { key: "batches", label: "عدد الدفعات", type: "number" };
const DURATION: ItemMetricField = {
  key: "durationMonths",
  label: "مدة الدفعة (شهور)",
  type: "number",
};
const SUBSCRIBERS: ItemMetricField = {
  key: "subscribers",
  label: "عدد المشتركين",
  type: "number",
  isBeneficiary: true,
};
const SEASONS: ItemMetricField = { key: "seasons", label: "عدد المواسم", type: "number" };
const COURSES: ItemMetricField = { key: "courses", label: "عدد الدورات", type: "number" };

/**
 * ITEMS: map of departmentKey -> ItemDef[]
 * departmentKey values must match those in shared/departments.ts
 */
export const ITEMS: Record<string, ItemDef[]> = {
  // ===================== المعاهد والمراكز التعليمية =====================
  institutes: [
    {
      key: "othon_khair",
      nameAr: "معهد أذن خير",
      type: "institute_online",
      subtitle: "معهد مرحلي أونلاين — منهج 7 مراحل (أُطلق ديسمبر 2020)",
      since: 2020,
      metrics: [BENEFICIARIES, BATCHES, DURATION, { key: "applicants", label: "إجمالي المتقدمين", type: "number" }],
      baseline: { beneficiaries: 191967, batches: 4, durationMonths: 7, applicants: 191967 },
    },
    {
      key: "innahu_muhammad",
      nameAr: 'دورة "إنه محمد ﷺ"',
      type: "institute_online",
      subtitle: "دبلومة نبوية — 5 مراحل متكاملة (انطلقت 2020)",
      since: 2020,
      metrics: [BENEFICIARIES, BATCHES, { key: "stages", label: "عدد المراحل", type: "number" }],
      baseline: { beneficiaries: 18500, batches: 5, stages: 5 },
    },
    {
      key: "bayyinat",
      nameAr: 'الدورات القرآنية – مساق "بيّنات"',
      type: "institute_online",
      subtitle: "13 دورة قرآنية تربوية (انطلاق 2020)",
      since: 2020,
      metrics: [BENEFICIARIES, COURSES],
      baseline: { beneficiaries: 118974, courses: 13 },
    },
    {
      key: "ashbal",
      nameAr: "معهد الأشبال",
      type: "institute_offline",
      subtitle: 'معهد تربوي ميداني للأطفال "إني أعلّمك كلمات"',
      metrics: [BENEFICIARIES, BATCHES],
      baseline: { beneficiaries: 0, batches: 0 },
    },
    {
      key: "bidayat_alhidaya",
      nameAr: "معهد بداية الهداية",
      type: "institute_offline",
      subtitle: "معهد أرضي — مدة الدفعة 3 شهور",
      metrics: [BENEFICIARIES, BATCHES, DURATION],
      baseline: { beneficiaries: 685, batches: 6, durationMonths: 3 },
    },
    {
      key: "alyawm_alwahid",
      nameAr: "معهد اليوم الواحد",
      type: "institute_offline",
      subtitle: "برنامج تمهيدي — 7 محاور شرعية (تأسيس 2022)",
      since: 2022,
      metrics: [BENEFICIARIES, BATCHES, DURATION],
      baseline: { beneficiaries: 750, batches: 9, durationMonths: 4 },
    },
    {
      key: "layali_dar_alarqam",
      nameAr: "معهد ليالي دار الأرقم",
      type: "institute_offline",
      subtitle: "برنامج تربوي قرآني (تأسيس 2022)",
      since: 2022,
      metrics: [BENEFICIARIES, BATCHES, DURATION],
      baseline: { beneficiaries: 812, batches: 7, durationMonths: 5 },
    },
    {
      key: "alqurani_aldaawi",
      nameAr: "المعهد القُرآني الدعوي",
      type: "institute_offline",
      subtitle: "معهد أرضي — مدة الدفعة 12 شهر (تأسيس 2021)",
      since: 2021,
      metrics: [BENEFICIARIES, BATCHES, DURATION],
      baseline: { beneficiaries: 210, batches: 3, durationMonths: 12 },
    },
  ],

  // ===================== المبادرات التربوية (موسمية) =====================
  educational_initiatives: [
    {
      key: "sabbeh_tafrah",
      nameAr: "سبح تفرح",
      type: "initiative_seasonal",
      subtitle: "مبادرة موسمية — 4 مواسم",
      metrics: [SUBSCRIBERS, SEASONS],
      baseline: { subscribers: 48550, seasons: 4 },
    },
    {
      key: "astaghfir_tafrah",
      nameAr: "أستغفر تفرح",
      type: "initiative_seasonal",
      subtitle: "مبادرة موسمية — 3 مواسم",
      metrics: [SUBSCRIBERS, SEASONS],
      baseline: { subscribers: 60000, seasons: 3 },
    },
    {
      key: "khatmat_taaruf",
      nameAr: "ختمة تعارف",
      type: "initiative_seasonal",
      subtitle: "مبادرة موسمية — 5 مواسم",
      metrics: [SUBSCRIBERS, SEASONS],
      baseline: { subscribers: 105000, seasons: 5 },
    },
    {
      key: "fi_arbaeen_yatini",
      nameAr: "في أربعين يأتيني",
      type: "initiative_seasonal",
      subtitle: "مبادرة موسمية — 4 مواسم",
      metrics: [SUBSCRIBERS, SEASONS],
      baseline: { subscribers: 80400, seasons: 4 },
    },
    {
      key: "qabl_alashr_biashr",
      nameAr: "قبل العشر بعشر",
      type: "initiative_seasonal",
      subtitle: "مبادرة موسمية — 5 مواسم",
      metrics: [SUBSCRIBERS, SEASONS],
      baseline: { subscribers: 64600, seasons: 5 },
    },
    // المبادرات الدعوية والمجتمعية
    {
      key: "iftah_li_qalbak",
      nameAr: "افتح لي قلبك",
      type: "initiative_community",
      subtitle: "دعم واستشارات — تليجرام وواتساب (تأسيس 2021)",
      since: 2021,
      metrics: [
        { key: "reach", label: "إجمالي الوصول", type: "number", isBeneficiary: true },
        { key: "telegram", label: "مشتركو تليجرام", type: "number" },
        { key: "whatsapp", label: "مشتركو واتساب", type: "number" },
        { key: "countries", label: "عدد الدول", type: "number" },
      ],
      baseline: { reach: 1200000, telegram: 172493, whatsapp: 45090, countries: 35 },
    },
    {
      key: "mahattat_sabaa",
      nameAr: "معهد المحطات السبع",
      type: "initiative_community",
      subtitle: "11 مسار قرآني (تأسيس 2020)",
      since: 2020,
      metrics: [
        { key: "beneficiaries", label: "إجمالي المستفيدين", type: "number", isBeneficiary: true },
        { key: "readers", label: "القراء والحفاظ", type: "number" },
        { key: "finishers", label: "عدد الختمات", type: "number" },
        { key: "sanad", label: "المسندون بإسناد متصل", type: "number" },
        { key: "tajweed", label: "متعلمو علم التجويد", type: "number" },
        { key: "circles", label: "حلقات تلاوة القرآن", type: "number" },
        { key: "competition", label: "المشاركون في المسابقة العالمية", type: "number" },
        { key: "tracks", label: "عدد المسارات", type: "number" },
      ],
      baseline: { beneficiaries: 158927, readers: 31630, finishers: 628, sanad: 179, tajweed: 6484, circles: 19615, competition: 105721, tracks: 11 },
    },
    {
      key: "umrat_tarbawiya",
      nameAr: "العمرات التربوية",
      type: "initiative_community",
      subtitle: "رحلات عمرة تربوية إيمانية",
      metrics: [
        { key: "participants", label: "عدد المشاركين", type: "number", isBeneficiary: true },
        { key: "trips", label: "عدد العمرات", type: "number" },
      ],
      baseline: { participants: 485, trips: 3 },
    },
  ],

  // ===================== الإعلام والتواصل =====================
  media_communications: [
    {
      key: "media_office",
      nameAr: "المكتب الإعلامي",
      type: "unit",
      subtitle: "الإنتاج والتصوير والتغطيات — الصوت الرسمي للمسيرة",
      metrics: [
        { key: "contentProduced", label: "مواد مصورة منتجة", type: "number" },
        { key: "programs", label: "برامج منتجة", type: "number" },
      ],
      baseline: { contentProduced: 745, programs: 30 },
      // ملاحظة: 745 مادة مصورة و30 برنامجًا خلال 5 سنوات (2019–2025)
    },
    {
      key: "social_youtube",
      nameAr: "يوتيوب",
      type: "social_platform",
      subtitle: "قناة رواحل على يوتيوب",
      metrics: [
        { key: "views", label: "إجمالي المشاهدات", type: "number" },
        { key: "followers", label: "المشتركون", type: "number" },
      ],
      baseline: { views: 237000000, followers: 0 },
    },
    {
      key: "social_tiktok",
      nameAr: "تيك توك",
      type: "social_platform",
      subtitle: "حساب رواحل على تيك توك",
      metrics: [
        { key: "views", label: "إجمالي المشاهدات", type: "number" },
        { key: "followers", label: "المتابعون", type: "number" },
      ],
      baseline: { views: 2900000, followers: 0 },
    },
    {
      key: "social_all",
      nameAr: "إجمالي المتابعين (كل المنصات)",
      type: "social_platform",
      subtitle: "المتابعون عبر جميع المنصات (2020: 2.99M ← 2025: 13.26M)",
      metrics: [
        { key: "followers", label: "إجمالي المتابعين (الحالي)", type: "number" },
        { key: "followers2020", label: "المتابعون (2020)", type: "number" },
      ],
      baseline: { followers: 13261000, followers2020: 2990000 },
    },
  ],

  // ===================== المكتب التطوعي =====================
  volunteer_office: [
    {
      key: "volunteer_teams",
      nameAr: "الفرق التطوعية",
      type: "unit",
      subtitle: "المحرك الشبابي لنهضة العمل الدعوي",
      metrics: [
        { key: "volunteers", label: "عدد المتطوعين", type: "number", isBeneficiary: true },
        { key: "events", label: "فعاليات منظمة", type: "number" },
        { key: "volunteerHours", label: "ساعات تطوعية", type: "number" },
      ],
      baseline: { volunteers: 0, events: 0, volunteerHours: 0 },
    },
  ],

  // ===================== المكتب العلمي =====================
  scientific_office: [
    {
      key: "scientific_production",
      nameAr: "الإنتاج العلمي والمعرفي",
      type: "unit",
      subtitle: "إنتاج المعرفة التأسيسية والتعريب والأرشفة",
      metrics: [
        { key: "beneficiaries", label: "عدد المستفيدين", type: "number", isBeneficiary: true },
        { key: "booksCompleted", label: "كتب مكتملة", type: "number" },
        { key: "booksReview", label: "كتب قيد المراجعة", type: "number" },
        { key: "translatedBooks", label: "كتب معرّبة", type: "number" },
        { key: "translatedEpisodes", label: "حلقات معرّبة", type: "number" },
        { key: "daawiClips", label: "مقاطع دعوية منتجة", type: "number" },
        { key: "archived", label: "مواد مؤرشفة", type: "number" },
      ],
      baseline: { beneficiaries: 0, booksCompleted: 10, booksReview: 14, translatedBooks: 20, translatedEpisodes: 60, daawiClips: 120, archived: 150 },
    },
  ],

  // ===================== المكتب التربوي =====================
  educational_office: [
    {
      key: "educational_unit",
      nameAr: "إعداد وتأهيل المربين",
      type: "unit",
      subtitle: "بناء المناهج والإشراف التربوي",
      metrics: [
        { key: "beneficiaries", label: "متدربون / مربون", type: "number", isBeneficiary: true },
        { key: "courses", label: "دورات منفذة", type: "number" },
        { key: "curricula", label: "مناهج مطوّرة", type: "number" },
      ],
      baseline: { beneficiaries: 0, courses: 0, curricula: 0 },
    },
  ],

  // ===================== العلاقات العامة =====================
  pr: [
    {
      key: "pr_unit",
      nameAr: "العلاقات العامة والشراكات",
      type: "unit",
      subtitle: "الشراكات والتواصل مع الجهات والمؤسسات",
      metrics: [
        { key: "partnerships", label: "شراكات جديدة", type: "number" },
        { key: "meetings", label: "اجتماعات / لقاءات", type: "number" },
        { key: "agreements", label: "اتفاقيات موقعة", type: "number" },
      ],
      baseline: { partnerships: 0, meetings: 0, agreements: 0 },
    },
  ],

  // ===================== الموارد البشرية =====================
  hr: [
    {
      key: "hr_unit",
      nameAr: "إدارة الكوادر",
      type: "unit",
      subtitle: "التوظيف والتطوير المؤسسي",
      metrics: [
        { key: "staff", label: "إجمالي الكوادر", type: "number" },
        { key: "newHires", label: "تعيينات جديدة", type: "number" },
        { key: "trainingHours", label: "ساعات تدريب", type: "number" },
      ],
      baseline: { staff: 0, newHires: 0, trainingHours: 0 },
    },
  ],

  // ===================== الحسابات والمالية =====================
  finance: [
    {
      key: "finance_unit",
      nameAr: "الإدارة المالية",
      type: "unit",
      subtitle: "المشتريات والميزانيات",
      metrics: [
        { key: "budget", label: "الميزانية المخصصة", type: "number" },
        { key: "spent", label: "المصروف", type: "number" },
        { key: "projectsFunded", label: "مشاريع ممولة", type: "number" },
      ],
      baseline: { budget: 0, spent: 0, projectsFunded: 0 },
    },
  ],
};

/**
 * Key under which custom metric definitions are stored inside an item's
 * metrics JSON. The value is an array of { key, label, isBeneficiary }.
 * The numeric values themselves live alongside as regular metric keys.
 */
export const CUSTOM_METRICS_KEY = "__custom";

/**
 * Key under which the free-text "highlight of the month" is stored inside an
 * item's metrics JSON. Shown in the infographic under the item.
 */
export const HIGHLIGHT_KEY = "__highlight";

/** Read the highlight text embedded in a metrics object (empty if none). */
export function getItemHighlight(
  metrics: Record<string, unknown> | null | undefined
): string {
  const raw = (metrics ?? {})[HIGHLIGHT_KEY];
  return typeof raw === "string" ? raw : "";
}

/**
 * Normalize raw item metrics coming from the form before persistence.
 * Numeric metric values are coerced to numbers (empty/invalid -> 0), while the
 * reserved keys `__custom` (KPI definitions array) and `__highlight` (free
 * text) are preserved verbatim. This is the single source of truth used by the
 * server router so it can be unit-tested in isolation.
 */
export function normalizeItemMetrics(
  input: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input ?? {})) {
    if (k === CUSTOM_METRICS_KEY || k === HIGHLIGHT_KEY) {
      out[k] = v;
    } else {
      out[k] = typeof v === "string" ? Number(v) || 0 : (v as number);
    }
  }
  return out;
}

export type CustomMetricDef = {
  key: string; // slug used as the metric value key
  label: string; // Arabic label
  isBeneficiary?: boolean; // whether it feeds the beneficiaries roll-up
};

/** Read the custom metric definitions embedded in a metrics object. */
export function getCustomMetricDefs(
  metrics: Record<string, unknown> | null | undefined
): CustomMetricDef[] {
  const raw = (metrics ?? {})[CUSTOM_METRICS_KEY];
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((d): d is CustomMetricDef => !!d && typeof d.key === "string" && typeof d.label === "string")
    .map((d) => ({ key: d.key, label: d.label, isBeneficiary: !!d.isBeneficiary }));
}

/** Flat lookup for an item def by department + item key. */
export function getItemDef(departmentKey: string, itemKey: string): ItemDef | undefined {
  return (ITEMS[departmentKey] ?? []).find((i) => i.key === itemKey);
}

/** All items for a department (empty array if none). */
export function getDepartmentItems(departmentKey: string): ItemDef[] {
  return ITEMS[departmentKey] ?? [];
}

/**
 * Compute the beneficiaries roll-up for a single item given its metrics object.
 * Sums all metric fields flagged isBeneficiary. If the item has no such flag,
 * falls back to 0.
 */
export function itemBeneficiaries(
  departmentKey: string,
  itemKey: string,
  metrics: Record<string, number>
): number {
  const def = getItemDef(departmentKey, itemKey);
  if (!def) {
    // Unknown item: best-effort use a `beneficiaries` key if present
    return Number(metrics?.beneficiaries ?? 0) || 0;
  }
  let sum = 0;
  for (const f of def.metrics) {
    if (f.isBeneficiary) sum += Number(metrics?.[f.key] ?? 0) || 0;
  }
  // Include any custom metric flagged as beneficiary.
  for (const c of getCustomMetricDefs(metrics)) {
    if (c.isBeneficiary) sum += Number(metrics?.[c.key] ?? 0) || 0;
  }
  return sum;
}

/**
 * Expressive lucide-react icon name for each item type. Used by the
 * infographic and forms to render a meaningful glyph next to each item.
 */
export const ITEM_TYPE_ICON: Record<ItemType, string> = {
  institute_online: "GraduationCap",
  institute_offline: "School",
  initiative_seasonal: "CalendarHeart",
  initiative_community: "Users",
  social_platform: "Share2",
  program: "Layers",
  unit: "Briefcase",
};

/**
 * Per-item icon overrides keyed by `${departmentKey}:${itemKey}` so well-known
 * items get a uniquely fitting glyph. Falls back to the item-type icon.
 */
const ITEM_ICON_OVERRIDES: Record<string, string> = {
  // المعاهد
  "institutes:othon_khair": "Ear",
  "institutes:innahu_muhammad": "BookHeart",
  "institutes:bayyinat": "BookOpen",
  "institutes:ashbal": "Baby",
  "institutes:bidayat_alhidaya": "Sunrise",
  "institutes:alyawm_alwahid": "CalendarClock",
  "institutes:layali_dar_alarqam": "Moon",
  "institutes:alqurani_aldaawi": "BookMarked",
  // المبادرات التربوية
  "educational_initiatives:sabbeh_tafrah": "Sparkles",
  "educational_initiatives:astaghfir_tafrah": "HandHeart",
  "educational_initiatives:khatmat_taaruf": "BookOpenCheck",
  "educational_initiatives:fi_arbaeen_yatini": "CalendarDays",
  "educational_initiatives:qabl_alashr_biashr": "Hourglass",
  "educational_initiatives:iftah_li_qalbak": "MessageCircleHeart",
  "educational_initiatives:mahattat_sabaa": "Map",
  "educational_initiatives:umrat_tarbawiya": "Plane",
  // الإعلام والتواصل
  "media_communications:media_office": "Clapperboard",
  "media_communications:social_youtube": "Youtube",
  "media_communications:social_tiktok": "Music2",
  "media_communications:social_all": "TrendingUp",
  // المكتب العلمي / التربوي / الفرق التطوعية / الإدارات
  "volunteer_office:volunteer_teams": "HeartHandshake",
};

/**
 * Resolve the lucide icon name for a given item. Per-item override first,
 * then the item-type default, then a safe fallback.
 */
export function itemIconName(
  departmentKey: string,
  itemKey: string,
  itemType?: string
): string {
  const override = ITEM_ICON_OVERRIDES[`${departmentKey}:${itemKey}`];
  if (override) return override;
  const t = (itemType as ItemType) || getItemDef(departmentKey, itemKey)?.type;
  if (t && ITEM_TYPE_ICON[t]) return ITEM_TYPE_ICON[t];
  return "CircleDot";
}
