export type StrategicTrackSeed = {
  key: string;
  nameAr: string;
  descriptionAr: string;
  color: string;
  icon: string;
  sortOrder: number;
};

export type StrategicGoalSeed = {
  key: string;
  trackKey?: string;
  nameAr: string;
  descriptionAr: string;
  targetValue: number;
  targetUnit: string;
  periodType: "yearly" | "two_years" | "monthly" | "custom";
  sortOrder: number;
};

export type EntityType =
  | "office"
  | "institute_online"
  | "institute_offline"
  | "quran_institute"
  | "initiative"
  | "campaign"
  | "project"
  | "unit"
  | "department"
  | "platform";

export type EntitySeed = {
  key: string;
  nameAr: string;
  type: EntityType;
  descriptionAr: string;
  color: string;
  icon: string;
  sortOrder: number;
  trackKeys?: string[];
  goalKeys?: string[];
};

export type MetricUnit = "count" | "percent" | "currency" | "hours" | "days" | "text_score";
export type MetricAggregation = "sum" | "avg" | "latest" | "max" | "min";
export type MetricDirection = "higher_is_better" | "lower_is_better" | "neutral";
export type AggregationScope = "additive" | "non_additive" | "latest";

export type MetricDefinitionSeed = {
  key: string;
  appliesToType?: EntityType;
  nameAr: string;
  descriptionAr: string;
  unit: MetricUnit;
  aggregation: MetricAggregation;
  direction: MetricDirection;
  aggregationScope: AggregationScope;
  isCore: boolean;
  isDonorFacing: boolean;
  sortOrder: number;
};

export type GoalMetricLinkSeed = {
  goalKey: string;
  metricKey: string;
  entityKey?: string;
  weight?: number;
  contributionType?: "sum" | "avg" | "latest";
};

export const STRATEGIC_TRACKS: StrategicTrackSeed[] = [
  { key: "incubators", nameAr: "بناء الحاضنات التربوية", descriptionAr: "تأسيس بيئات تربوية مستدامة للشباب والأسر.", color: "#1b2a5e", icon: "School", sortOrder: 1 },
  { key: "knowledge", nameAr: "إنتاج المعرفة التأسيسية والمنهجية", descriptionAr: "تأليف وتطوير المناهج والمواد المؤسسة.", color: "#d4a843", icon: "BookOpen", sortOrder: 2 },
  { key: "cadres", nameAr: "تأهيل الكوادر التربوية والدعوية", descriptionAr: "بناء المربين والمشرفين والكوادر التنفيذية.", color: "#2e7d6b", icon: "GraduationCap", sortOrder: 3 },
  { key: "public_influence", nameAr: "الخطاب العام والتأثير المجتمعي", descriptionAr: "إيصال الرسالة وبناء الحضور المجتمعي والرقمي.", color: "#4a90d9", icon: "Radio", sortOrder: 4 },
  { key: "sustainability", nameAr: "الشراكات والاستدامة المؤسسية", descriptionAr: "تعزيز الشراكات والوقف والحوكمة والاستدامة.", color: "#8e44ad", icon: "Handshake", sortOrder: 5 },
];

export const STRATEGIC_GOALS: StrategicGoalSeed[] = [
  { key: "attract_1000_youth", trackKey: "public_influence", nameAr: "جذب 1000 شاب وفتاة سنويًا", descriptionAr: "توسيع قاعدة المستفيدين الجدد من برامج ومبادرات رواحل.", targetValue: 1000, targetUnit: "مستفيد", periodType: "yearly", sortOrder: 1 },
  { key: "graduate_100_educators", trackKey: "cadres", nameAr: "تخريج 100 مربٍ ومربية", descriptionAr: "إعداد كوادر تربوية قادرة على حمل الرسالة.", targetValue: 100, targetUnit: "مربٍ/مربية", periodType: "yearly", sortOrder: 2 },
  { key: "publish_5_books", trackKey: "knowledge", nameAr: "إصدار 5 كتب تأسيسية ومنهجية", descriptionAr: "إنتاج كتب ومواد مرجعية تخدم البناء التربوي.", targetValue: 5, targetUnit: "كتب", periodType: "yearly", sortOrder: 3 },
  { key: "reach_2m_followers", trackKey: "public_influence", nameAr: "الوصول إلى 2 مليون متابع رقمي خلال عامين", descriptionAr: "توسيع الحضور الرقمي والتأثير العام.", targetValue: 2000000, targetUnit: "متابع", periodType: "two_years", sortOrder: 4 },
  { key: "run_20_events", trackKey: "incubators", nameAr: "تنظيم 20 فعالية ميدانية وتربوية سنويًا", descriptionAr: "تنشيط الحضور الميداني والتربوي.", targetValue: 20, targetUnit: "فعالية", periodType: "yearly", sortOrder: 5 },
  { key: "build_10_partnerships", trackKey: "sustainability", nameAr: "بناء 10 شراكات علمية ودعوية", descriptionAr: "توسيع شبكة الشركاء والداعمين.", targetValue: 10, targetUnit: "شراكات", periodType: "yearly", sortOrder: 6 },
  { key: "launch_6_campaigns", trackKey: "public_influence", nameAr: "إطلاق 6 مبادرات جماهيرية سنويًا", descriptionAr: "تقديم مبادرات موسمية وجماهيرية مؤثرة.", targetValue: 6, targetUnit: "مبادرات", periodType: "yearly", sortOrder: 7 },
  { key: "hire_7_staff", trackKey: "sustainability", nameAr: "توظيف 7 كوادر تربوية وإدارية سنويًا", descriptionAr: "تقوية الفريق التنفيذي والتربوي.", targetValue: 7, targetUnit: "كوادر", periodType: "yearly", sortOrder: 8 },
  { key: "deliver_4_training_programs", trackKey: "cadres", nameAr: "تقديم 4 برامج تدريب سنوية", descriptionAr: "رفع كفاءة الكوادر والمتطوعين.", targetValue: 4, targetUnit: "برامج تدريب", periodType: "yearly", sortOrder: 9 },
  { key: "adopt_10_kpis", trackKey: "sustainability", nameAr: "اعتماد 10 KPIs وإصدار 4 تقارير تقييم سنوية", descriptionAr: "رفع جودة القياس والمتابعة.", targetValue: 10, targetUnit: "مؤشرات", periodType: "yearly", sortOrder: 10 },
  { key: "issue_12_financial_reports", trackKey: "sustainability", nameAr: "إصدار 12 تقريرًا ماليًا سنويًا", descriptionAr: "تعزيز الشفافية المالية.", targetValue: 12, targetUnit: "تقارير", periodType: "yearly", sortOrder: 11 },
  { key: "build_data_platforms", trackKey: "sustainability", nameAr: "إنشاء قاعدة بيانات موحدة و3 لوحات متابعة", descriptionAr: "توحيد البيانات وبناء لوحات متابعة تشغيلية.", targetValue: 3, targetUnit: "لوحات", periodType: "custom", sortOrder: 12 },
  { key: "waqf_transition", trackKey: "sustainability", nameAr: "التحول إلى الوقف", descriptionAr: "تأسيس مسار استدامة طويل الأجل.", targetValue: 100, targetUnit: "%", periodType: "custom", sortOrder: 13 },
  { key: "document_all_operations", trackKey: "sustainability", nameAr: "توثيق 100% من العمليات", descriptionAr: "رفع النضج التشغيلي والحوكمة.", targetValue: 100, targetUnit: "%", periodType: "yearly", sortOrder: 14 },
  { key: "identify_5_operational_risks", trackKey: "sustainability", nameAr: "تحديد 5 مخاطر تشغيلية وخطط استجابة", descriptionAr: "بناء إدارة مخاطر عملية ومتابعة.", targetValue: 5, targetUnit: "مخاطر", periodType: "yearly", sortOrder: 15 },
];

export const ENTITIES: EntitySeed[] = [
  { key: "scientific_office", nameAr: "المكتب العلمي", type: "office", descriptionAr: "إنتاج المعرفة والمناهج والمواد المؤسسة.", color: "#1b2a5e", icon: "BookOpen", sortOrder: 1, trackKeys: ["knowledge"], goalKeys: ["publish_5_books"] },
  { key: "educational_office", nameAr: "المكتب التربوي", type: "office", descriptionAr: "بناء البرامج التربوية وتأهيل الكوادر.", color: "#2e7d6b", icon: "GraduationCap", sortOrder: 2, trackKeys: ["cadres", "incubators"], goalKeys: ["graduate_100_educators", "deliver_4_training_programs"] },
  { key: "hr_office", nameAr: "مكتب الموارد البشرية", type: "office", descriptionAr: "إدارة العاملين والمتطوعين والتدريب.", color: "#2c3e50", icon: "Users", sortOrder: 3, trackKeys: ["sustainability"], goalKeys: ["hire_7_staff"] },
  { key: "volunteer_office", nameAr: "المكتب التطوعي", type: "office", descriptionAr: "تنظيم المتطوعين والفعاليات وساعات التطوع.", color: "#8e44ad", icon: "HeartHandshake", sortOrder: 4, trackKeys: ["incubators"], goalKeys: ["run_20_events"] },
  { key: "social_media_office", nameAr: "مكتب السوشيال ميديا", type: "platform", descriptionAr: "إدارة النشر والوصول والتفاعل الرقمي.", color: "#c0392b", icon: "Share2", sortOrder: 5, trackKeys: ["public_influence"], goalKeys: ["reach_2m_followers"] },
  { key: "media_office", nameAr: "المكتب الإعلامي", type: "office", descriptionAr: "الإنتاج الإعلامي والتغطيات والمواد البصرية.", color: "#4a90d9", icon: "Video", sortOrder: 6, trackKeys: ["public_influence"], goalKeys: ["reach_2m_followers"] },
  { key: "pr_office", nameAr: "مكتب العلاقات العامة", type: "office", descriptionAr: "الشراكات والداعمين والتمثيل المؤسسي.", color: "#16a085", icon: "Handshake", sortOrder: 7, trackKeys: ["sustainability"], goalKeys: ["build_10_partnerships"] },
  { key: "tech_office", nameAr: "المكتب التقني", type: "office", descriptionAr: "الأنظمة والبيانات والدعم التقني.", color: "#34495e", icon: "MonitorCog", sortOrder: 8, trackKeys: ["sustainability"], goalKeys: ["build_data_platforms"] },
  { key: "finance_admin", nameAr: "مكتب الإدارة المالية / الحسابات وإدارة المهام", type: "office", descriptionAr: "التقارير المالية والمشتريات والإغلاق الشهري.", color: "#27ae60", icon: "Wallet", sortOrder: 9, trackKeys: ["sustainability"], goalKeys: ["issue_12_financial_reports"] },
  { key: "othon_khair", nameAr: "معهد أذن خير", type: "institute_online", descriptionAr: "معهد تربوي أونلاين مرحلي.", color: "#d4a843", icon: "School", sortOrder: 10, trackKeys: ["incubators"], goalKeys: ["attract_1000_youth"] },
  { key: "innahu_muhammad", nameAr: "دبلومة إنه محمد", type: "institute_online", descriptionAr: "دبلومة نبوية أونلاين.", color: "#d4a843", icon: "BookMarked", sortOrder: 11, trackKeys: ["incubators", "knowledge"], goalKeys: ["attract_1000_youth"] },
  { key: "bayyinat", nameAr: "مساق بيّنات / الدورات القرآنية", type: "quran_institute", descriptionAr: "مساقات قرآنية تربوية.", color: "#2e7d6b", icon: "BookOpenCheck", sortOrder: 12, trackKeys: ["incubators"], goalKeys: ["attract_1000_youth"] },
  { key: "seasonal_initiatives", nameAr: "المبادرات التربوية الموسمية", type: "initiative", descriptionAr: "مبادرات جماهيرية موسمية.", color: "#f39c12", icon: "Sparkles", sortOrder: 13, trackKeys: ["public_influence"], goalKeys: ["launch_6_campaigns"] },
  { key: "ashbal", nameAr: "معهد الأشبال", type: "institute_offline", descriptionAr: "برنامج تربوي ميداني للأطفال.", color: "#4a90d9", icon: "Baby", sortOrder: 14, trackKeys: ["incubators"], goalKeys: ["run_20_events"] },
  { key: "bidayat_alhidaya", nameAr: "معهد بداية الهداية", type: "institute_offline", descriptionAr: "معهد أرضي تربوي.", color: "#4a90d9", icon: "School", sortOrder: 15, trackKeys: ["incubators"], goalKeys: ["attract_1000_youth"] },
  { key: "alyawm_alwahid", nameAr: "معهد اليوم الواحد", type: "institute_offline", descriptionAr: "برنامج تمهيدي ميداني.", color: "#4a90d9", icon: "CalendarDays", sortOrder: 16, trackKeys: ["incubators"], goalKeys: ["run_20_events"] },
  { key: "layali_dar_alarqam", nameAr: "معهد ليالي دار الأرقم", type: "institute_offline", descriptionAr: "برنامج تربوي قرآني.", color: "#4a90d9", icon: "Moon", sortOrder: 17, trackKeys: ["incubators"], goalKeys: ["attract_1000_youth"] },
  { key: "alqurani_aldaawi", nameAr: "المعهد القرآني الدعوي", type: "quran_institute", descriptionAr: "معهد قرآني دعوي أرضي.", color: "#2e7d6b", icon: "BookOpenCheck", sortOrder: 18, trackKeys: ["incubators"], goalKeys: ["attract_1000_youth"] },
  { key: "mahattat_sabaa", nameAr: "معهد المحطات السبع", type: "quran_institute", descriptionAr: "مسارات قرآنية متعددة.", color: "#2e7d6b", icon: "Map", sortOrder: 19, trackKeys: ["incubators"], goalKeys: ["attract_1000_youth"] },
  { key: "iftah_li_qalbak", nameAr: "مشروع افتح لي قلبك", type: "project", descriptionAr: "دعم واستشارات للشباب والأسر.", color: "#8e44ad", icon: "Heart", sortOrder: 20, trackKeys: ["public_influence"], goalKeys: ["attract_1000_youth"] },
  { key: "educational_umrah", nameAr: "مشروع العمرات التربوية", type: "project", descriptionAr: "رحلات تربوية موسمية.", color: "#16a085", icon: "Landmark", sortOrder: 21, trackKeys: ["incubators"], goalKeys: ["run_20_events"] },
  { key: "abc_project", nameAr: "مشروع ABC", type: "project", descriptionAr: "مشروع خاص قابل للتخصيص.", color: "#34495e", icon: "Blocks", sortOrder: 22, trackKeys: ["sustainability"], goalKeys: ["document_all_operations"] },
  { key: "quality_unit", nameAr: "وحدة الجودة والتقييم", type: "unit", descriptionAr: "متابعة الجودة ومؤشرات الأداء.", color: "#1b2a5e", icon: "BadgeCheck", sortOrder: 23, trackKeys: ["sustainability"], goalKeys: ["adopt_10_kpis"] },
  { key: "waqf_unit", nameAr: "وحدة الوقف والاستدامة", type: "unit", descriptionAr: "الاستدامة والوقف وتنويع الموارد.", color: "#d4a843", icon: "Sprout", sortOrder: 24, trackKeys: ["sustainability"], goalKeys: ["waqf_transition"] },
  { key: "risk_audit_unit", nameAr: "وحدة إدارة المخاطر والتدقيق الداخلي", type: "unit", descriptionAr: "المخاطر والتدقيق والحوكمة.", color: "#c0392b", icon: "ShieldAlert", sortOrder: 25, trackKeys: ["sustainability"], goalKeys: ["identify_5_operational_risks"] },
];

const metric = (
  key: string,
  nameAr: string,
  unit: MetricUnit = "count",
  appliesToType?: EntityType,
  options: Partial<MetricDefinitionSeed> = {}
): MetricDefinitionSeed => ({
  key,
  appliesToType,
  nameAr,
  descriptionAr: options.descriptionAr ?? nameAr,
  unit,
  aggregation: options.aggregation ?? "sum",
  direction: options.direction ?? "higher_is_better",
  aggregationScope: options.aggregationScope ?? "additive",
  isCore: options.isCore ?? !appliesToType,
  isDonorFacing: options.isDonorFacing ?? true,
  sortOrder: options.sortOrder ?? 0,
});

export const CORE_METRICS: MetricDefinitionSeed[] = [
  metric("new_beneficiaries", "المستفيدون الجدد", "count", undefined, { sortOrder: 1 }),
  metric("active_beneficiaries", "المستفيدون النشطون", "count", undefined, { sortOrder: 2 }),
  metric("cumulative_beneficiaries", "المستفيدون التراكميون", "count", undefined, { aggregationScope: "latest", aggregation: "latest", sortOrder: 3 }),
  metric("activities_count", "عدد الأنشطة / اللقاءات / الحلقات", "count", undefined, { sortOrder: 4 }),
  metric("education_hours", "عدد ساعات التعليم / العمل / التطوع", "hours", undefined, { sortOrder: 5 }),
  metric("attendance_rate", "نسبة الحضور", "percent", undefined, { aggregation: "avg", aggregationScope: "non_additive", sortOrder: 6 }),
  metric("completion_rate", "نسبة الإكمال", "percent", undefined, { aggregation: "avg", aggregationScope: "non_additive", sortOrder: 7 }),
  metric("graduates", "عدد الخريجين / المنجزين", "count", undefined, { sortOrder: 8 }),
  metric("satisfaction_rate", "نسبة رضا المستفيدين", "percent", undefined, { aggregation: "avg", aggregationScope: "non_additive", sortOrder: 9 }),
  metric("evidence_stories", "عدد الشواهد / القصص الموثقة", "count", undefined, { sortOrder: 10 }),
  metric("cost", "التكلفة إن وجدت", "currency", undefined, { isDonorFacing: false, sortOrder: 11 }),
  metric("operational_notes_score", "ملاحظات تشغيلية", "text_score", undefined, { aggregation: "latest", aggregationScope: "latest", direction: "neutral", isDonorFacing: false, sortOrder: 12 }),
];

export const TYPE_METRIC_PRESETS: MetricDefinitionSeed[] = [
  metric("registered_new", "المسجلون الجدد", "count", "institute_online"),
  metric("active_students", "الطلاب النشطون", "count", "institute_online"),
  metric("teaching_hours", "ساعات التعليم", "hours", "institute_online"),
  metric("tests_count", "الاختبارات", "count", "institute_online"),
  metric("success_rate", "نسبة النجاح", "percent", "institute_online", { aggregation: "avg", aggregationScope: "non_additive" }),
  metric("monthly_sessions", "الحلقات الشهرية", "count", "quran_institute"),
  metric("recitations_count", "مرات التسميع", "count", "quran_institute"),
  metric("memorized_parts", "الأجزاء المحفوظة", "count", "quran_institute"),
  metric("certified_students", "المجازون", "count", "quran_institute"),
  metric("answered_messages", "الرسائل المجاب عنها", "count", "project"),
  metric("response_rate", "معدل الاستجابة", "percent", "project", { aggregation: "avg", aggregationScope: "non_additive" }),
  metric("closed_cases", "الحالات المغلقة", "count", "project"),
  metric("published_content", "عدد المحتويات المنشورة", "count", "platform"),
  metric("reach", "الوصول", "count", "platform"),
  metric("impressions", "Impressions / مرات الظهور", "count", "platform"),
  metric("views", "المشاهدات", "count", "platform"),
  metric("engagement_rate", "معدل التفاعل", "percent", "platform", { aggregation: "avg", aggregationScope: "non_additive" }),
  metric("books_completed", "كتب مكتملة", "count", "office"),
  metric("curricula_designed", "مناهج مصممة", "count", "office"),
  metric("new_partnerships", "شراكات جديدة", "count", "office"),
  metric("active_volunteers", "متطوعون نشطون", "count", "office"),
  metric("volunteer_hours", "ساعات تطوع", "hours", "office"),
  metric("monthly_financial_report", "صدور التقرير المالي الشهري", "count", "office"),
  metric("budget_spent", "المصروف", "currency", "office", { isDonorFacing: false }),
];

export const METRIC_DEFINITIONS = [...CORE_METRICS, ...TYPE_METRIC_PRESETS];

export const GOAL_METRIC_LINKS: GoalMetricLinkSeed[] = [
  { goalKey: "attract_1000_youth", metricKey: "new_beneficiaries" },
  { goalKey: "attract_1000_youth", metricKey: "registered_new" },
  { goalKey: "graduate_100_educators", metricKey: "graduates" },
  { goalKey: "graduate_100_educators", metricKey: "certified_students" },
  { goalKey: "publish_5_books", metricKey: "books_completed" },
  { goalKey: "reach_2m_followers", metricKey: "reach" },
  { goalKey: "run_20_events", metricKey: "activities_count" },
  { goalKey: "run_20_events", metricKey: "monthly_sessions" },
  { goalKey: "build_10_partnerships", metricKey: "new_partnerships" },
  { goalKey: "launch_6_campaigns", metricKey: "activities_count" },
  { goalKey: "hire_7_staff", metricKey: "active_volunteers" },
  { goalKey: "deliver_4_training_programs", metricKey: "activities_count" },
  { goalKey: "adopt_10_kpis", metricKey: "evidence_stories" },
  { goalKey: "issue_12_financial_reports", metricKey: "monthly_financial_report" },
  { goalKey: "build_data_platforms", metricKey: "activities_count" },
  { goalKey: "waqf_transition", metricKey: "budget_spent" },
  { goalKey: "document_all_operations", metricKey: "evidence_stories" },
  { goalKey: "identify_5_operational_risks", metricKey: "evidence_stories" },
];

export function metricsForEntityType(type: EntityType) {
  return METRIC_DEFINITIONS.filter((m) => !m.appliesToType || m.appliesToType === type);
}

export type MetricValueLike = {
  entityId: number;
  metricKey: string;
  metricDefinitionId?: number;
  valueNumber?: number | null;
};

export type GoalLike = {
  id: number;
  key: string;
  nameAr: string;
  targetValue?: number | null;
  targetUnit?: string | null;
};

export type EntityGoalLinkLike = {
  entityId: number;
  goalId: number;
  weight?: number | null;
};

export type GoalMetricLinkLike = {
  goalId: number;
  metricDefinitionId: number;
  entityId?: number | null;
  weight?: number | null;
  contributionType?: "sum" | "avg" | "latest";
};

export function aggregatePulseMetrics(values: MetricValueLike[]) {
  const sum = (keys: string[]) =>
    values
      .filter((v) => keys.includes(v.metricKey))
      .reduce((total, v) => total + (Number(v.valueNumber) || 0), 0);

  return {
    totalBeneficiaries: sum(["new_beneficiaries", "active_beneficiaries", "cumulative_beneficiaries", "registered_new", "active_students"]),
    newBeneficiaries: sum(["new_beneficiaries", "registered_new"]),
    activeBeneficiaries: sum(["active_beneficiaries", "active_students"]),
    totalActivities: sum(["activities_count", "monthly_sessions", "published_content"]),
    totalEducationHours: sum(["education_hours", "teaching_hours"]),
    totalVolunteerHours: sum(["volunteer_hours"]),
    totalMessagesAnswered: sum(["answered_messages"]),
    totalGraduates: sum(["graduates", "certified_students"]),
    note: "الأرقام قد تشمل تكرار المستفيدين بين البرامج ما لم يتم تفعيل القياس الفردي.",
  };
}

export function calculateGoalProgress(
  goals: GoalLike[],
  links: GoalMetricLinkLike[],
  values: MetricValueLike[]
) {
  return goals.map((goal) => {
    const goalLinks = links.filter((link) => link.goalId === goal.id);
    const actual = goalLinks.reduce((total, link) => {
      const matchingValues = values
        .filter((value) => value.metricDefinitionId === link.metricDefinitionId)
        .filter((value) => !link.entityId || value.entityId === link.entityId)
        .map((value) => Number(value.valueNumber) || 0);
      if (matchingValues.length === 0) return total;
      const contributionType = link.contributionType ?? "sum";
      const rawContribution =
        contributionType === "avg"
          ? matchingValues.reduce((sum, value) => sum + value, 0) / matchingValues.length
          : contributionType === "latest"
            ? matchingValues[matchingValues.length - 1]
            : matchingValues.reduce((sum, value) => sum + value, 0);
      return total + rawContribution * (Number(link.weight ?? 1) || 1);
    }, 0);
    const target = Number(goal.targetValue) || 0;
    const progress = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0;
    return {
      goalId: goal.id,
      key: goal.key,
      nameAr: goal.nameAr,
      actual,
      target,
      unit: goal.targetUnit ?? "",
      progress,
      status: progress >= 90 ? "green" : progress >= 60 ? "amber" : "red",
      linkedMetricDefinitionIds: goalLinks.map((link) => link.metricDefinitionId),
    };
  });
}
