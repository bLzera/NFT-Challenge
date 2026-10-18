import type { ComponentProps, FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Mail, Phone, Send } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

/**
 * Rodapé (Figma: `Desktop_In_cio.md` → instância `Footer`). Três bandas:
 *  1. cards de destaque (W/C/D) + newsletter;
 *  2. logo + assinatura + contato;
 *  3. colunas de links + redes sociais, e barra inferior (carteiras compatíveis + copyright).
 *
 * Fidelidade honesta (§11): links com rota real são `<Link>`; os demais são inertes (`aria-disabled`,
 * sem navegação fabricada). A newsletter não finge envio — ao submeter, avisa que é demonstração.
 * Ícones sociais são os SVGs de marca extraídos do Figma, inlinados (padrão do projeto, sem svgr).
 */

const FEATURES = [
  { mark: "W", title: "Segurança da carteira", desc: "Proteja sua carteira e colecione arte digital verificada com confiança." },
  { mark: "C", title: "Criadores em destaque", desc: "Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede." },
  { mark: "D", title: "Alertas de lançamentos", desc: "Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado." },
];

/** Colunas de links. `to` presente = rota real (Link); ausente = item inerte (fora de escopo, §3). */
const LINK_COLUMNS: { title: string; items: { label: string; to?: "/profile" | "/favorites" }[] }[] = [
  {
    title: "Meu perfil",
    items: [
      { label: "Meu perfil", to: "/profile" },
      { label: "Minha coleção" },
      { label: "Atividade" },
      { label: "Estúdio do criador" },
      { label: "Lista de interesse", to: "/favorites" },
    ],
  },
  {
    title: "Central de ajuda",
    items: [
      { label: "Central de ajuda" },
      { label: "Como comprar NFTs" },
      { label: "Carteira e segurança" },
      { label: "Política do mercado" },
      { label: "Denunciar um problema" },
    ],
  },
  {
    title: "Coleções",
    items: [
      { label: "Arte digital" },
      { label: "Fotografia" },
      { label: "Música" },
      { label: "Arte 3D" },
      { label: "Utilidade" },
    ],
  },
];

export function Footer() {
  function handleNewsletter(event: FormEvent) {
    event.preventDefault();
    toast("Newsletter é apenas demonstração — nada é enviado.");
  }

  return (
    <footer className="border-t border-border bg-ink">
      {/* Banda 1: destaques + newsletter */}
      <div className="bg-surface-card">
        <div className="container grid gap-10 py-8 lg:grid-cols-[repeat(3,1fr)_1.2fr] lg:gap-0">
          {FEATURES.map((f, i) => (
            <div
              key={f.mark}
              className={
                "flex flex-col gap-3 lg:px-6" +
                (i > 0 ? " lg:border-l lg:border-primary/20" : "")
              }
            >
              <span className="flex size-[74px] items-center justify-center rounded-full bg-primary text-heading font-bold text-primary-foreground">
                {f.mark}
              </span>
              <p className="text-body-lg font-bold text-foreground">{f.title}</p>
              <p className="max-w-[16rem] text-body-sm text-secondary-text">{f.desc}</p>
            </div>
          ))}

          <div className="flex flex-col gap-4 lg:border-l lg:border-primary/20 lg:px-6">
            <p className="text-body-lg font-bold text-foreground">Antecipe-se ao próximo lançamento</p>
            <form onSubmit={handleNewsletter} className="flex items-stretch">
              {/* Nome acessível SEM "e-mail" de propósito: evita colidir com o campo "E-mail" de
                  login/perfil (o footer é global) sob buscas por rótulo (getByLabel). */}
              <label htmlFor="newsletter-email" className="sr-only">
                Inscrição na newsletter
              </label>
              <Input
                id="newsletter-email"
                type="email"
                placeholder="digite seu e-mail..."
                className="rounded-r-none border-r-0 bg-surface-dark"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-r-md bg-primary px-4 text-body-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Send className="size-4" aria-hidden="true" />
                Enviar
              </button>
            </form>
            <p className="text-caption text-secondary-text">
              Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
            </p>
          </div>
        </div>
      </div>

      {/* Banda 2: logo + assinatura + contato */}
      <div className="bg-surface-dark">
        <div className="container flex flex-col items-start gap-4 py-6 md:flex-row md:items-center md:gap-16">
          <span className="text-body-sm font-bold tracking-[0.1em] text-foreground">KURIO</span>
          <span className="text-body-sm text-foreground">Feito para colecionadores, criadores e cultura</span>
          <span className="flex items-center gap-2 text-body-sm text-foreground">
            <Mail className="size-4 text-primary" aria-hidden="true" />
            contato@email.com
          </span>
          <span className="flex items-center gap-2 text-body-sm text-foreground">
            <Phone className="size-4 text-primary" aria-hidden="true" />
            +55 11 4002 8922
          </span>
        </div>
      </div>

      {/* Banda 3: colunas de links + redes sociais */}
      <div className="bg-surface-card">
        <div className="container grid gap-10 py-10 sm:grid-cols-2 lg:grid-cols-4">
          {LINK_COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title} className="flex flex-col gap-4">
              <p className="text-body-lg font-bold text-foreground">{col.title}</p>
              <ul className="flex flex-col gap-2">
                {col.items.map((item) =>
                  item.to ? (
                    <li key={item.label}>
                      <Link to={item.to} className="text-body-sm text-secondary-text transition-colors hover:text-accent-text">
                        {item.label}
                      </Link>
                    </li>
                  ) : (
                    <li key={item.label}>
                      <span aria-disabled="true" className="cursor-not-allowed text-body-sm text-secondary-text/70">
                        {item.label}
                      </span>
                    </li>
                  ),
                )}
              </ul>
            </nav>
          ))}

          <div className="flex flex-col gap-4">
            <p className="text-body-lg font-bold text-foreground">Redes sociais</p>
            <ul className="flex items-center gap-3">
              {SOCIALS.map(({ label, Icon }) => (
                <li key={label}>
                  <span
                    role="link"
                    aria-disabled="true"
                    aria-label={label}
                    className="flex size-[30px] cursor-not-allowed items-center justify-center rounded border border-primary text-primary"
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Barra inferior: carteiras compatíveis + copyright */}
      <div className="bg-surface-dark">
        <div className="container flex flex-col items-center justify-between gap-3 py-5 sm:flex-row">
          <p className="text-caption text-secondary-text">
            Carteiras compatíveis:{" "}
            <span className="font-bold text-foreground">METAMASK • WALLETCONNECT • COINBASE</span>
          </p>
          <p className="text-caption text-secondary-text">© 2026 Kurio. Propriedade digital para todos.</p>
        </div>
      </div>
    </footer>
  );
}

/* Ícones de marca (SVGs extraídos do Figma, `design/assets/svg/`), inlinados com `currentColor`. */
function TwitterIcon(props: ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 16 13" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M5.03189 12.2171C11.0699 12.2171 14.3719 7.51728 14.3719 3.442C14.3719 3.30847 14.369 3.17563 14.3625 3.0433C15.0034 2.608 15.5606 2.06465 16.0001 1.44642C15.4119 1.69194 14.779 1.85727 14.115 1.93181C14.7927 1.55003 15.3131 0.945815 15.5586 0.225683C14.9242 0.579081 14.2218 0.835881 13.4742 0.974368C12.875 0.374941 12.0219 0 11.0779 0C9.26489 0 7.79468 1.38128 7.79468 3.08382C7.79468 3.32591 7.82362 3.56117 7.87967 3.78702C5.15163 3.65828 2.73241 2.43088 1.11353 0.56489C0.831277 1.02053 0.668771 1.5502 0.668771 2.11492C0.668771 3.18486 1.24837 4.12948 2.12969 4.68223C1.59122 4.66667 1.08532 4.5275 0.64293 4.29635C0.642202 4.30917 0.642202 4.32216 0.642202 4.33567C0.642202 5.82945 1.77393 7.07652 3.27579 7.35913C3.0001 7.42974 2.71002 7.4677 2.41049 7.4677C2.19903 7.4677 1.99339 7.44787 1.7934 7.41213C2.21122 8.63732 3.4232 9.52911 4.8601 9.55424C3.73638 10.3816 2.32095 10.8745 0.783053 10.8745C0.518275 10.8745 0.256954 10.8603 0 10.8317C1.45273 11.7064 3.17771 12.2171 5.03189 12.2171Z" />
    </svg>
  );
}

function FacebookIcon(props: ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M13.3309 3.32083H15.1567V0.140833C14.8417 0.0975 13.7584 0 12.4967 0C6.72005 0 8.29172 6.54167 8.06172 7.5H5.15588V11.055H8.06088V20H11.6226V11.0558H14.4101L14.8526 7.50083H11.6217C11.7784 5.1475 10.9876 3.32083 13.3309 3.32083V3.32083Z" />
    </svg>
  );
}

function LinkedinIcon(props: ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 15 15" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M3.125 1.5625C3.125 2.4375 2.4375 3.125 1.5625 3.125C0.6875 3.125 0 2.4375 0 1.5625C0 0.6875 0.6875 0 1.5625 0C2.4375 0 3.125 0.6875 3.125 1.5625ZM3.125 4.375H0V14.375H3.125V4.375ZM8.125 4.375H5V14.375H8.125V9.125C8.125 6.1875 11.875 5.9375 11.875 9.125V14.375H15V8.0625C15 3.125 9.4375 3.3125 8.125 5.75V4.375Z" />
    </svg>
  );
}

const SOCIALS = [
  { label: "Twitter", Icon: TwitterIcon },
  { label: "Facebook", Icon: FacebookIcon },
  { label: "LinkedIn", Icon: LinkedinIcon },
];
