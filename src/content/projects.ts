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
};

export const projects: Project[] = [
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
