export type SiteContent = {
  name: string;
  city: string;
  region: string;
  proposedDomain: string;
  showPlaceholders: boolean;
  contact: {
    address: string | null;
    phone: { display: string; href: string } | null;
    email: string | null;
    schedule: string | null;
    legalDetails: string[] | null;
    mapUrl: string | null;
    inquiryEnabled: boolean;
  };
  privacy: { approvedText: string | null; approvedConsent: string | null };
};

export const site: SiteContent = {
  name: "Форм-Ресурс М",
  city: "Подольск",
  region: "Московская область",
  proposedDomain: "form-resurs-m.ru",
  showPlaceholders: true,
  contact: {
    address: null,
    phone: null,
    email: null,
    schedule: null,
    legalDetails: null,
    mapUrl: null,
    inquiryEnabled: false,
  },
  privacy: { approvedText: null, approvedConsent: null },
};

export const navigation = [
  { href: "/services/", label: "Услуги" },
  { href: "/projects/", label: "Наши работы" },
  { href: "/about/", label: "О компании" },
  { href: "/contacts/", label: "Контакты" },
];

export const collaboration = [
  ["Обращение", "Вы описываете пресс-форму, дефект или задачу обслуживания."],
  ["Предварительное рассмотрение", "Уточняем исходные данные и условия эксплуатации."],
  ["Согласование объёма работ", "Определяем перечень операций и условия передачи оснастки."],
  ["Выполнение работ", "Выполняем операции в согласованном объёме."],
  ["Передача результата", "Передаём оснастку и обсуждаем выполненные работы."],
];
