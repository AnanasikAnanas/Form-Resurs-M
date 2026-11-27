import { operator } from "./operator";

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
    mapEmbedUrl: string | null;
  };
  privacy: { approvedText: string | null; approvedConsent: string | null };
};

export const site: SiteContent = {
  name: "Форм-Ресурс М",
  city: "Подольск",
  region: "Московская область",
  proposedDomain: "form-resurs-m.ru",
  showPlaceholders: false,
  contact: {
    address: "Московская область, г. Подольск, ул. Комсомольская, д. 1, корп. 21",
    phone: { display: "+7 (927) 980-14-11", href: "tel:+79279801411" },
    email: "msk@form-resurs.ru",
    schedule: "Пн–Пт с 08:00 до 17:00; Сб–Вс — выходные",
    legalDetails: [operator.name, "ИНН " + operator.inn, "Юридический адрес: " + operator.address],
    mapUrl: "https://yandex.ru/maps/-/CXcWyN9r",
    mapEmbedUrl: "https://yandex.ru/map-widget/v1/-/CXcWyN9r",
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
