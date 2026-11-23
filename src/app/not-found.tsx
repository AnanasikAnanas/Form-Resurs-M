import { Action } from "@/components/editorial";

export const metadata = { title: "Страница не найдена", robots: { index: false, follow: false } };

export default function NotFound() {
  return <section className="page-intro dark error-page">
    <div className="wrap">
      <p className="error-code">404</p>
      <h1>Страница не найдена</h1>
      <p className="lede">Проверьте адрес или продолжите с главной страницы.</p>
      <Action href="/">На главную</Action>
    </div>
  </section>;
}
