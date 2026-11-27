export type Project = {
  id: string;
  serviceSlug: string;
  title: string;
  task: string;
  work: string | null;
  result: string | null;
  before: string | null;
  after: string | null;
  status: "demo" | "published" | "draft";
  caseStudy?: {
    formNumber: string;
    product: string;
    subtitle: string;
    description: string[];
    operations: string[];
    beforeCaption: string;
    afterCaption: string;
    beforePhotos: ProjectPhoto[];
    afterPhotos: ProjectPhoto[];
    comparison?: { before: ProjectPhoto; afterIndex: number; caption: string };
  };
};

export type ProjectPhoto = { src: string; alt: string; caption: string; width: number; height: number };

export const projects: Project[] = [
  {
    id: "frm-560",
    serviceSlug: "mold-repair",
    title: "Ремонт копиров пресс-формы ФРМ 560",
    task: "Ремонт копиров формы ФРМ 560",
    work: "Лазерная наплавка, слесарная доработка (полировка)",
    result: "Фотографии детали после выполненных работ",
    before: null,
    after: "/images/frm560:3.jpg",
    status: "published",
    caseStudy: {
      formNumber: "ФРМ 560",
      product: "Ремонт копиров",
      subtitle: "Лазерная наплавка и слесарная доработка (полировка)",
      description: [
        "Специалистами «Форм-Ресурс М» выполнены работы по ремонту копиров формы ФРМ 560.",
        "В состав работ вошли лазерная наплавка и последующая слесарная доработка с полировкой поверхности.",
        "На странице проекта показаны фотографии состояния детали до и после выполнения работ.",
      ],
      operations: ["Лазерная наплавка", "Слесарная доработка", "Полировка поверхности"],
      beforeCaption: "Состояние детали до выполнения работ. Два ракурса копира.",
      afterCaption: "Поверхность детали после лазерной наплавки и слесарной доработки с полировкой.",
      comparison: {
        before: { src: "/images/frm560:6.png", width: 1086, height: 1448, alt: "Визуализация состояния копира ФРМ 560 до ремонта для сопоставления ракурсов", caption: "Визуализация до ремонта" },
        afterIndex: 0,
        caption: "Сравнение поверхности копира. Кадр «До» подготовлен для совмещения ракурсов; исходные фотографии расположены ниже.",
      },
      beforePhotos: [
        { src: "/images/frm560:1.jpg", width: 964, height: 1280, alt: "Копир формы ФРМ 560 до ремонта, вид на рабочую поверхность", caption: "До ремонта · вид на поверхность" },
        { src: "/images/frm560:2.jpg", width: 964, height: 1280, alt: "Копир формы ФРМ 560 до ремонта, боковой ракурс", caption: "До ремонта · боковой ракурс" },
      ],
      afterPhotos: [
        { src: "/images/frm560:3.jpg", width: 964, height: 1280, alt: "Копир формы ФРМ 560 после ремонта, общий вид поверхности", caption: "После ремонта · общий вид" },
        { src: "/images/frm560:4.jpg", width: 964, height: 1280, alt: "Копир формы ФРМ 560 после ремонта, крупный план поверхности", caption: "После ремонта · поверхность" },
        { src: "/images/frm560:5.jpg", width: 964, height: 1280, alt: "Копир формы ФРМ 560 после ремонта, фронтальный вид", caption: "После ремонта · фронтальный вид" },
      ],
    },
  },
  {
    id: "working-edge",
    serviceSlug: "mold-repair",
    title: "Износ рабочей кромки",
    task: "Как описать состояние кромки, затронутый участок и влияние дефекта на изделие.",
    work: null, result: null, before: null, after: null, status: "demo",
  },
  {
    id: "moving-parts",
    serviceSlug: "mold-maintenance",
    title: "Осмотр подвижных элементов",
    task: "Как описать состояние направляющих и подвижных элементов до обслуживания.",
    work: null, result: null, before: null, after: null, status: "demo",
  },
  {
    id: "local-restoration",
    serviceSlug: "laser-welding",
    title: "Локальное повреждение поверхности",
    task: "Как указать материал детали и расположение участка, который предстоит оценить.",
    work: null, result: null, before: null, after: null, status: "demo",
  },
  {
    id: "surface-finish",
    serviceSlug: "mold-polishing",
    title: "Следы на формообразующей поверхности",
    task: "Как зафиксировать исходное состояние поверхности и требования к её фактуре.",
    work: null, result: null, before: null, after: null, status: "demo",
  },
];

export const showDemoProjects = true;
export const visibleProjects = projects.filter(
  ({ status }) => status === "published" || (showDemoProjects && status === "demo"),
);
