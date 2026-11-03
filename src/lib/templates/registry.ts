import {
  StarterTemplateDefinition,
  LocalizedStarterTemplate,
  StarterTemplateDefinitionSchema,
} from "../schemas/templates";
import { StructuredTerm } from "../schemas/agreements";

/**
 * Built-in curated starter templates fulfilling F-21:
 * Personal / Shared Responsibility, Freelance & Services, Supply & Procurement, Mutual Confidentiality.
 */
export const STARTER_TEMPLATES: StarterTemplateDefinition[] = [
  {
    id: "personal-shared-responsibility",
    category: "PERSONAL",
    icon: "Users",
    title: {
      ar: "اتفاق مسؤولية مشتركة ومشاركة أصول",
      en: "Personal & Shared Responsibility Agreement",
    },
    description: {
      ar: "نموذج لتنظيم الالتزامات المشتركة بين الأفراد وتقسيم النفقات ومصاريف الإشغال وقواعد استخدام المساحات أو الأصول المشتركة.",
      en: "Template for coordinating mutual obligations, shared living/workspace expenses, and asset usage rules between individuals.",
    },
    suggestedRoles: {
      ar: ["الطرف الأول (المشارك)", "الطرف الثاني (المشارك)"],
      en: ["First Participant", "Second Participant"],
    },
    terms: [
      {
        id: "tmpl_psr_term_1",
        title: {
          ar: "نطاق المشاركة والمساحة المشتركة",
          en: "Scope of Shared Use and Space",
        },
        body: {
          ar: "يتفق الأطراف على التشارك في استخدام الأصل أو المساحة المحددة للأغراض السكنية أو التشغيلية المتفق عليها فقط، مع التزام الجميع بالنظافة العامة وحسن الجوار وصيانة الممتلكات المشتركة.",
          en: "The parties agree to share the designated space or asset strictly for agreed purposes, maintaining cleanliness, good conduct, and mutual care for shared property.",
        },
        amount: null,
        currency: null,
        dueDateOffsetDays: null,
      },
      {
        id: "tmpl_psr_term_2",
        title: {
          ar: "توزيع النفقات والمصاريف الدورية",
          en: "Allocation of Recurring Expenses",
        },
        body: {
          ar: "يتم تقاسم الفواتير والمصروفات التشغيلية المشتركة بنسبة متساوية بين الأطراف ما لم يُتفق كتابةً على خلاف ذلك، وتُسدد المستحقات قبل اليوم الخامس من كل شهر ميلادي.",
          en: "Operational expenses and utilities are divided equally unless agreed otherwise in writing, payable by the 5th day of each calendar month.",
        },
        amount: null,
        currency: null,
        dueDateOffsetDays: null,
      },
      {
        id: "tmpl_psr_term_3",
        title: {
          ar: "قواعد الاستخدام والزيارات والراحة العامة",
          en: "Usage Guidelines, Guests and Quiet Hours",
        },
        body: {
          ar: "يلتزم كل طرف بمراعاة ساعات الهدوء بعد الساعة 10:00 مساءً، وإشعار الطرف الآخر مسبقًا بالضيوف أو الزيارات المطولة، ويتحمل المتسبب مسؤولية أي تلف ناتج عن الإهمال.",
          en: "Each party commits to quiet hours after 10:00 PM, providing advance notice for extended guests, and bearing full responsibility for any negligence damages.",
        },
        amount: null,
        currency: null,
        dueDateOffsetDays: null,
      },
      {
        id: "tmpl_psr_term_4",
        title: {
          ar: "إنهاء المشاركة وتسليم العهدة",
          en: "Termination Notice and Handover Protocol",
        },
        body: {
          ar: "يحق لأي طرف إنهاء التشارك بإشعار كتابي مسبق لا يقل عن 30 يومًا، على أن تتم تصفية كافة الالتزامات المالية وإعادة الأصول المشتركة لحالتها السليمة عند الاستلام.",
          en: "Either party may conclude participation with a minimum 30-day advance notice, settling all outstanding accounts and restoring original conditions.",
        },
        amount: null,
        currency: null,
        dueDateOffsetDays: null,
      },
    ],
  },
  {
    id: "freelance-professional-services",
    category: "SERVICES",
    icon: "Briefcase",
    title: {
      ar: "اتفاق تقديم خدمات مهنية واستشارية",
      en: "Freelance & Professional Services Agreement",
    },
    description: {
      ar: "نموذج لتنظيم مشاريع العمل الحر والاستشارات التقنية والمهنية، يحدد نطاق العمل ومراحل التسليم وفترات المراجعة ونقل الملكية الفكرية.",
      en: "Template for freelance services and consulting projects, specifying deliverables, milestones, review windows, and IP handover.",
    },
    suggestedRoles: {
      ar: ["العميل (طالب الخدمة)", "مقدّم الخدمة المستقل"],
      en: ["Client", "Service Provider"],
    },
    terms: [
      {
        id: "tmpl_fps_term_1",
        title: {
          ar: "نطاق العمل والمخرجات المطلوبة",
          en: "Scope of Work and Deliverables",
        },
        body: {
          ar: "يقوم مقدم الخدمة بتنفيذ المخرجات المحددة وفق المعايير المهنية المتفق عليها، مع تقديم تقارير دورية موجزة عن تقدم العمل للعميل.",
          en: "The service provider shall deliver the agreed scope according to professional standards, providing periodic progress updates to the client.",
        },
        amount: null,
        currency: null,
        dueDateOffsetDays: null,
      },
      {
        id: "tmpl_fps_term_2",
        title: {
          ar: "جدول المراحل ومواعيد التسليم",
          en: "Project Milestones and Schedule",
        },
        body: {
          ar: "يلتزم مقدم الخدمة بتسليم كل مرحلة في الموعد المحدد، ويخطر العميل فورًا عند حدوث أي ظرف طارئ قد يتطلب تعديل المواعيد بالتراضي.",
          en: "The provider shall deliver each milestone on schedule and notify the client immediately of any unforeseen events that may require schedule adjustments.",
        },
        amount: null,
        currency: null,
        dueDateOffsetDays: null,
      },
      {
        id: "tmpl_fps_term_3",
        title: {
          ar: "فترة المراجعة واعتماد المخرجات",
          en: "Review Period and Deliverable Acceptance",
        },
        body: {
          ar: "يمنح العميل مهلة 5 أيام عمل لمراجعة كل مرحلة تسليم وإبداء الملاحظات أو طلب التعديلات في حدود نطاق العمل المتفق عليه.",
          en: "The client has 5 business days to review each deliverable milestone and provide feedback or adjustment requests within the agreed scope.",
        },
        amount: null,
        currency: null,
        dueDateOffsetDays: null,
      },
      {
        id: "tmpl_fps_term_4",
        title: {
          ar: "الأتعاب وشروط السداد",
          en: "Compensation and Payment Terms",
        },
        body: {
          ar: "تسدد الأتعاب المتفق عليها على دفعات مرتبطة باعتماد المراحل خلال 7 أيام عمل من تاريخ استلام الفاتورة.",
          en: "Agreed fees shall be settled in milestone-linked installments within 7 business days following invoice receipt.",
        },
        amount: null,
        currency: null,
        dueDateOffsetDays: null,
      },
      {
        id: "tmpl_fps_term_5",
        title: {
          ar: "حقوق الملكية الفكرية وتسليم الملفات",
          en: "Intellectual Property and File Handover",
        },
        body: {
          ar: "تنتقل حقوق الملكية الفكرية وملفات المصدر المنجزة للعميل بشكل كامل فور إتمام سداد كامل المستحقات المالية المتفق عليها.",
          en: "All intellectual property rights and completed source files transfer fully to the client upon full payment of agreed compensation.",
        },
        amount: null,
        currency: null,
        dueDateOffsetDays: null,
      },
    ],
  },
  {
    id: "goods-supply-procurement",
    category: "SUPPLY",
    icon: "Package",
    title: {
      ar: "اتفاق توريد واستلام بضائع ومنتجات",
      en: "Goods Supply & Procurement Agreement",
    },
    description: {
      ar: "نموذج لتنظيم عمليات التوريد والشراء وتحديد مواصفات البضائع والشحن وإجراءات الفحص والتعامل مع البضائع المعيبة.",
      en: "Template for supply and procurement, detailing specifications, delivery logistics, inspection protocols, and defect remedies.",
    },
    suggestedRoles: {
      ar: ["المشتري", "المورّد"],
      en: ["Purchaser", "Supplier"],
    },
    terms: [
      {
        id: "tmpl_gsp_term_1",
        title: {
          ar: "مواصفات التوريد والكميات",
          en: "Supply Specifications and Quantities",
        },
        body: {
          ar: "يلتزم المورد بتوريد البضائع وفق المواصفات القياسية والكميات المحددة، مع التغليف المحكم المناسب لطبيعة النقل والتخزين.",
          en: "The supplier shall provide goods conforming strictly to agreed specifications and quantities, packaged securely for transit and storage.",
        },
        amount: null,
        currency: null,
        dueDateOffsetDays: null,
      },
      {
        id: "tmpl_gsp_term_2",
        title: {
          ar: "جدول التسليم ومكان الاستلام",
          en: "Delivery Schedule and Destination",
        },
        body: {
          ar: "يتم تسليم الشحنة في الموقع المحدد المتفق عليه، ويتحمل المورد تكاليف الشحن والتأمين حتى تسليم البضائع للمشتري في الموقع.",
          en: "Delivery shall be completed at the designated destination; supplier bears shipping and risk of loss until physical handover.",
        },
        amount: null,
        currency: null,
        dueDateOffsetDays: null,
      },
      {
        id: "tmpl_gsp_term_3",
        title: {
          ar: "إجراءات الفحص والإشعار بالعيوب",
          en: "Inspection Window and Defect Notice",
        },
        body: {
          ar: "يحق للمشتري فحص البضائع خلال 7 أيام عمل من الاستلام، وإخطار المورد بأي نقص أو تلفيات لتعويضها أو استبدالها خلال مدة أقصاها 5 أيام.",
          en: "The purchaser may inspect goods within 7 business days of delivery and notify supplier of defects or shortages for replacement within 5 days.",
        },
        amount: null,
        currency: null,
        dueDateOffsetDays: null,
      },
      {
        id: "tmpl_gsp_term_4",
        title: {
          ar: "شروط السداد والدفعات",
          en: "Payment Milestones and Invoicing",
        },
        body: {
          ar: "تسدد قيمة التوريد بعد مطابقة الشحنة وإصدار إشعار الاستلام النهائي وفق الجدولة المتفق عليها بين الطرفين.",
          en: "Payment will be disbursed following verification of shipment conformity and issuance of final acceptance notification.",
        },
        amount: null,
        currency: null,
        dueDateOffsetDays: null,
      },
    ],
  },
  {
    id: "mutual-confidentiality-nda",
    category: "CONFIDENTIALITY",
    icon: "ShieldCheck",
    title: {
      ar: "اتفاق تفاهم وسرية معلومات متبادلة",
      en: "Mutual Confidentiality & NDA",
    },
    description: {
      ar: "نموذج لحماية المعلومات السرية المتبادلة بين طرفين بغرض دراسة فرصة تعاون أو شراكة مستقبلية دون التزام تجاري مسبق.",
      en: "Template to protect sensitive information exchanged between parties evaluating collaboration without premature obligations.",
    },
    suggestedRoles: {
      ar: ["الطرف الأول", "الطرف الثاني"],
      en: ["First Party", "Second Party"],
    },
    terms: [
      {
        id: "tmpl_mcn_term_1",
        title: {
          ar: "تعريف المعلومات السرية ونطاقها",
          en: "Definition of Confidential Information",
        },
        body: {
          ar: "تشمل المعلومات السرية كافة البيانات الفنية والتجارية والمالية والأفكار الاستراتيجية المتبادلة بين الطرفين لأغراض دراسة التعاون المشترك.",
          en: "Confidential information includes technical, commercial, financial, and strategic data exchanged to evaluate mutual business collaboration.",
        },
        amount: null,
        currency: null,
        dueDateOffsetDays: null,
      },
      {
        id: "tmpl_mcn_term_2",
        title: {
          ar: "الغرض المصرح به وقيود الإفصاح",
          en: "Permitted Purpose and Disclosure Restrictions",
        },
        body: {
          ar: "يلتزم كل طرف باستخدام المعلومات حصريًا لغرض تقييم الشراكة، وعدم إفشائها لأي طرف ثالث دون موافقة خطية مسبقة من الطرف المفصح.",
          en: "Each party agrees to utilize information strictly for evaluating partnership opportunities, refraining from third-party disclosures without prior consent.",
        },
        amount: null,
        currency: null,
        dueDateOffsetDays: null,
      },
      {
        id: "tmpl_mcn_term_3",
        title: {
          ar: "مدة الالتزام بالسرية",
          en: "Duration of Confidentiality Obligation",
        },
        body: {
          ar: "تستمر التزامات حفظ السرية سارية المفعول لمدة سنتين من تاريخ الإفصاح، حتى في حال عدم إتمام أي تعاون تجاري لاحق.",
          en: "Confidentiality obligations remain in effect for two years from the disclosure date, irrespective of whether formal contracts ensue.",
        },
        amount: null,
        currency: null,
        dueDateOffsetDays: null,
      },
      {
        id: "tmpl_mcn_term_4",
        title: {
          ar: "إعادة المواد السرية أو إتلافها",
          en: "Return or Certified Destruction of Materials",
        },
        body: {
          ar: "عند طلب الطرف المفصح أو انتهاء المباحثات، يعيد الطرف المتلقي كافة الوثائق والبيانات السرية أو يلتزم بإتلافها بصورة آمنة.",
          en: "Upon request or termination of talks, the recipient shall promptly return or securely destroy all confidential records.",
        },
        amount: null,
        currency: null,
        dueDateOffsetDays: null,
      },
      {
        id: "tmpl_mcn_term_5",
        title: {
          ar: "عدم إلزامية المحادثات التمهيدية",
          en: "Non-Binding Exploratory Discussions",
        },
        body: {
          ar: "لا يُلزم هذا الاتفاق أياً من الطرفين بإبرام اتفاقيات تجارية لاحقة، ويحق لكل طرف إنهاء المباحثات في أي وقت دون مسؤولية.",
          en: "This agreement does not obligate either party to enter into future transactions; either party may terminate discussions at will.",
        },
        amount: null,
        currency: null,
        dueDateOffsetDays: null,
      },
    ],
  },
];

// Validate all templates against schema on load
STARTER_TEMPLATES.forEach((tmpl) => {
  StarterTemplateDefinitionSchema.parse(tmpl);
});

/**
 * Returns localized starter templates list
 */
export function getStarterTemplates(
  locale: string = "ar",
  category?: string
): LocalizedStarterTemplate[] {
  const isArabic = locale.startsWith("ar");

  let templates = STARTER_TEMPLATES;
  if (category && category !== "ALL") {
    templates = templates.filter((t) => t.category === category);
  }

  return templates.map((tmpl) => ({
    id: tmpl.id,
    category: tmpl.category,
    icon: tmpl.icon,
    title: isArabic ? tmpl.title.ar : tmpl.title.en,
    description: isArabic ? tmpl.description.ar : tmpl.description.en,
    suggestedRoles: isArabic ? tmpl.suggestedRoles.ar : tmpl.suggestedRoles.en,
    termsCount: tmpl.terms.length,
    terms: tmpl.terms.map((term) => ({
      id: term.id,
      title: isArabic ? term.title.ar : term.title.en,
      body: isArabic ? term.body.ar : term.body.en,
      amount: term.amount ?? null,
      currency: term.currency ?? null,
      dueDate: null,
    })),
  }));
}

/**
 * Returns a specific localized starter template by ID
 */
export function getStarterTemplateById(
  id: string,
  locale: string = "ar"
): LocalizedStarterTemplate | null {
  const tmpl = STARTER_TEMPLATES.find((t) => t.id === id);
  if (!tmpl) return null;

  const isArabic = locale.startsWith("ar");
  return {
    id: tmpl.id,
    category: tmpl.category,
    icon: tmpl.icon,
    title: isArabic ? tmpl.title.ar : tmpl.title.en,
    description: isArabic ? tmpl.description.ar : tmpl.description.en,
    suggestedRoles: isArabic ? tmpl.suggestedRoles.ar : tmpl.suggestedRoles.en,
    termsCount: tmpl.terms.length,
    terms: tmpl.terms.map((term) => ({
      id: term.id,
      title: isArabic ? term.title.ar : term.title.en,
      body: isArabic ? term.body.ar : term.body.en,
      amount: term.amount ?? null,
      currency: term.currency ?? null,
      dueDate: null,
    })),
  };
}

/**
 * Instantiates template terms with unique IDs ready for agreement draft creation
 */
export function instantiateTemplateTerms(
  id: string,
  locale: string = "ar"
): {
  title: string;
  description: string;
  category: string;
  terms: StructuredTerm[];
  suggestedRoles: string[];
} {
  const tmpl = STARTER_TEMPLATES.find((t) => t.id === id);
  if (!tmpl) {
    throw new Error(`Starter template '${id}' not found`);
  }

  const isArabic = locale.startsWith("ar");
  const timestamp = Date.now();

  const terms: StructuredTerm[] = tmpl.terms.map((term, index) => {
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    return {
      id: `term_${timestamp}_${index + 1}_${randomSuffix}`,
      title: isArabic ? term.title.ar : term.title.en,
      body: isArabic ? term.body.ar : term.body.en,
      amount: term.amount ?? null,
      currency: term.currency ?? null,
      dueDate: null,
      assignedParticipantId: null,
    };
  });

  return {
    title: isArabic ? tmpl.title.ar : tmpl.title.en,
    description: isArabic ? tmpl.description.ar : tmpl.description.en,
    category: isArabic ? tmpl.category : tmpl.category,
    terms,
    suggestedRoles: isArabic ? tmpl.suggestedRoles.ar : tmpl.suggestedRoles.en,
  };
}
