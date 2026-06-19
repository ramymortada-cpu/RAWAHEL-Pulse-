/**
 * Shared department definitions for Rawahel Foundation.
 * departmentKey is stable; do not change once data exists.
 */

export type MetricField = {
  key: string;
  label: string; // Arabic label
  type: "number" | "percent";
  hint?: string;
};

export type DepartmentDef = {
  key: string;
  name: string; // Arabic name
  shortName: string;
  icon: string; // lucide icon name
  color: string; // accent color for cards
  description: string;
  metrics: MetricField[];
};

// Common metric fields included for every department
const COMMON_METRICS: MetricField[] = [
  { key: "beneficiaries", label: "عدد المستفيدين", type: "number" },
  { key: "programs", label: "عدد البرامج / الأنشطة", type: "number" },
  { key: "goalTarget", label: "الهدف المخطط للشهر", type: "number", hint: "الرقم المستهدف" },
  { key: "goalAchieved", label: "المتحقق فعليًا", type: "number", hint: "المنجز من الهدف" },
];

export const DEPARTMENTS: DepartmentDef[] = [
  {
    key: "scientific_office",
    name: "المكتب العلمي",
    shortName: "العلمي",
    icon: "BookOpen",
    color: "#1B2A5E",
    description: "إنتاج المعرفة التأسيسية والمنهجية والتعريب والأرشفة",
    metrics: [
      ...COMMON_METRICS,
      { key: "booksCompleted", label: "كتب مكتملة", type: "number" },
      { key: "booksInReview", label: "كتب في المراجعة", type: "number" },
      { key: "translatedBooks", label: "كتب معرّبة", type: "number" },
      { key: "translatedEpisodes", label: "حلقات معرّبة", type: "number" },
    ],
  },
  {
    key: "educational_office",
    name: "المكتب التربوي",
    shortName: "التربوي",
    icon: "GraduationCap",
    color: "#4A90D9",
    description: "إعداد وتأهيل المربين وبناء المناهج والإشراف التربوي",
    metrics: [
      ...COMMON_METRICS,
      { key: "trainees", label: "متدربون / مربون", type: "number" },
      { key: "courses", label: "دورات منفذة", type: "number" },
      { key: "curricula", label: "مناهج مطوّرة", type: "number" },
    ],
  },
  {
    key: "institutes",
    name: "المعاهد والمراكز التعليمية",
    shortName: "المعاهد",
    icon: "School",
    color: "#D4A843",
    description: "المعاهد الأونلاين والأرضية والدورات القرآنية",
    metrics: [
      ...COMMON_METRICS,
      { key: "enrolled", label: "إجمالي المسجلين", type: "number" },
      { key: "graduates", label: "الخريجون / الخاتمون", type: "number" },
      { key: "batches", label: "عدد الدفعات", type: "number" },
      { key: "activeCourses", label: "دورات قائمة", type: "number" },
    ],
  },
  {
    key: "educational_initiatives",
    name: "المبادرات التربوية",
    shortName: "المبادرات",
    icon: "Sparkles",
    color: "#2E7D6B",
    description: "المبادرات الدعوية والمجتمعية الموسمية",
    metrics: [
      ...COMMON_METRICS,
      { key: "subscribers", label: "عدد المشتركين", type: "number" },
      { key: "seasons", label: "عدد المواسم", type: "number" },
      { key: "countries", label: "عدد الدول المستفيدة", type: "number" },
    ],
  },
  {
    key: "media_communications",
    name: "الإعلام والتواصل",
    shortName: "الإعلام",
    icon: "Video",
    color: "#C0392B",
    description: "الإنتاج والتصوير والسوشيال ميديا والتغطيات",
    metrics: [
      ...COMMON_METRICS,
      { key: "contentProduced", label: "مواد مصورة منتجة", type: "number" },
      { key: "programs2", label: "برامج منتجة", type: "number" },
      { key: "followers", label: "إجمالي المتابعين", type: "number" },
      { key: "views", label: "إجمالي المشاهدات", type: "number" },
    ],
  },
  {
    key: "volunteer_office",
    name: "المكتب التطوعي",
    shortName: "التطوع",
    icon: "HeartHandshake",
    color: "#8E44AD",
    description: "تكوين الفرق التطوعية وتنظيم الفعاليات",
    metrics: [
      ...COMMON_METRICS,
      { key: "volunteers", label: "عدد المتطوعين", type: "number" },
      { key: "events", label: "فعاليات منظمة", type: "number" },
      { key: "volunteerHours", label: "ساعات تطوعية", type: "number" },
    ],
  },
  {
    key: "pr",
    name: "العلاقات العامة",
    shortName: "العلاقات",
    icon: "Handshake",
    color: "#16A085",
    description: "الشراكات والتواصل مع الجهات والمؤسسات",
    metrics: [
      ...COMMON_METRICS,
      { key: "partnerships", label: "شراكات جديدة", type: "number" },
      { key: "meetings", label: "اجتماعات / لقاءات", type: "number" },
      { key: "agreements", label: "اتفاقيات موقعة", type: "number" },
    ],
  },
  {
    key: "hr",
    name: "الموارد البشرية",
    shortName: "الموارد البشرية",
    icon: "Users",
    color: "#2C3E50",
    description: "إدارة الكوادر والتوظيف والتطوير المؤسسي",
    metrics: [
      ...COMMON_METRICS,
      { key: "staff", label: "إجمالي الكوادر", type: "number" },
      { key: "newHires", label: "تعيينات جديدة", type: "number" },
      { key: "trainingHours", label: "ساعات تدريب", type: "number" },
    ],
  },
  {
    key: "finance",
    name: "الحسابات والمالية",
    shortName: "المالية",
    icon: "Wallet",
    color: "#27AE60",
    description: "الإدارة المالية والمشتريات والميزانيات",
    metrics: [
      ...COMMON_METRICS,
      { key: "budget", label: "الميزانية المخصصة", type: "number" },
      { key: "spent", label: "المصروف", type: "number" },
      { key: "projectsFunded", label: "مشاريع ممولة", type: "number" },
    ],
  },
];

export const DEPARTMENT_MAP: Record<string, DepartmentDef> = Object.fromEntries(
  DEPARTMENTS.map((d) => [d.key, d])
);

export const ARABIC_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

export function monthName(m: number): string {
  return ARABIC_MONTHS[(m - 1 + 12) % 12] ?? String(m);
}

export type ReportSummary = {
  totalBeneficiaries: number;
  programsExecuted: number;
  volunteers: number;
  contentProduced: number;
  goalAchievementRate: number; // percent 0-100
  trends?: {
    totalBeneficiaries?: number;
    programsExecuted?: number;
    volunteers?: number;
    contentProduced?: number;
    goalAchievementRate?: number;
  };
};
