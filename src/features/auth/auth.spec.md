# Spec — Feature `auth` (Fase 4)

> Primeira feature de UI da Fase 4. Entrega **cadastro, login, logout, sessão e expiração** (README
> §3 "Conta e sessão", §5 "Sessão e conta", §9.3). Consome a camada de dados da Fase 3 e os
> primitivos/rotas da `foundation` (`src/app/foundation.spec.md`) — não reimplementa tokens, header,
> estados nem a guarda de rota.
>
> Design: `design/components/Desktop_Login.md` + `Desktop_Cadastro.md` (modal "Sign In/Up Modal"
> sobre o catálogo) e `Mobile_Login.md` + `Mobile_Cadastro.md` (página full-screen). Dark, Roboto Mono.

## Objetivo e fronteiras

**Entrega:**

1. Rotas `/login` e `/register` (esqueleto já criado na `foundation`) com a UI real.
2. Formulários validados de login e cadastro, com erros de validação **e** erros retornados pela API
   (validação 400, conflito de cadastro 409).
3. Fluxo de sessão completo pela camada de dados: `signIn`/`signUp`/`signOut` (teardown + realtime já
   embutidos), leitura via `useSession`.
4. **Retorno ao fluxo anterior** após autenticar (search param `redirect`, contrato da `foundation`).
5. Tratamento de **expiração de sessão** durante navegação e checkout (preserva contexto p/ retomada).
6. Logout/troca de usuário limpando cache privado + subscriptions (já garantido pela camada de dados;
   a feature só dispara).

**Fora de escopo (não podem aparentar sucesso — §3):** login social (Google/Facebook), "Esqueceu a
senha?" (não há contrato de reset). Renderizados conforme o Figma, porém **não-funcionais** e
anunciados como indisponíveis nesta demonstração. Perfil/avatar/senha ficam na feature `profile`.

## Decisões

- **A1 — Apresentação: dialog com rota real (aprovado).** `/login` e `/register` renderizam um
  `AuthDialog` (shadcn `Dialog` da foundation). **Desktop:** card centralizado ~500px sobre backdrop
  escurecido (Figma "Sign In/Up Modal"). **Mobile (≤640):** o mesmo conteúdo ocupa a tela cheia
  (logo KURIO grande no topo, form empilhado — Figma Mobile_*). Fechar o dialog (X / Esc / clique no
  overlay) navega para `search.redirect ?? "/"`.
- **A2 — Catálogo ao fundo é enriquecimento adiado.** O Figma mostra o catálogo atrás do modal
  (desktop). Como `catalog` vem depois, o MVP usa o backdrop do shell (ink). Quando `catalog`
  existir, pode-se aninhar `/login`/`/register` como rotas-overlay filhas do index para renderizar o
  catálogo vivo atrás — **não** é requisito desta feature. Registrar como desvio em `ARCHITECTURE.md`.
- **A3 — Duas rotas, não abas locais.** O Figma tem abas "Entrar | Criar conta" dentro de um modal.
  Implementamos como **duas rotas** que se cruzam por links preservando `redirect` (deep-link direto a
  cada uma; melhor p/ Playwright §9). As abas viram navegação entre `/login` e `/register`.
- **A4 — Formulários: `react-hook-form` + `@hookform/resolvers` (zod).** Resolver plugado nos schemas
  de `@/contracts` (`loginRequestSchema`, `registerRequestSchema`). Integra com o `FormField` da
  foundation (render-prop). Nova dependência → documentar em `DEPENDENCIES.md` com justificativa.
- **A5 — `confirmPassword` é validação de cliente.** O contrato de registro não tem confirmação; a UI
  estende o schema com `confirmPassword` + `superRefine` (match) **só no cliente**. O corpo enviado à
  API é exatamente `RegisterRequest` (`email`, `password`, `displayName`).

## Telas e layout

### Login (`/login`)

Campos e elementos (Figma):

- Título/abas: **Entrar** (ativa, `accent-text`) · **Criar conta** (link → `/register`).
- Subtítulo: "Entre para gerenciar sua carteira, coleção e perfil de criador."
- **E-mail** (`type="email"`, placeholder "contato@email.com").
- **Senha** (`type="password"`, com botão **mostrar/ocultar** — ícone olho, `lucide` Eye/EyeOff;
  alterna `type` e `aria-pressed`/`aria-label`).
- **"Esqueceu a senha?"** → fora de escopo (A fora-escopo): presente, não-funcional, com indicação
  acessível de indisponibilidade.
- CTA **Entrar** (primary).
- Divisor "Ou continue com" + **Continuar com Google** / **Continuar com Facebook** → fora de escopo.
- (Mobile) link "Novo na Kurio? Crie uma conta" → `/register`.

### Cadastro (`/register`)

- Abas: **Entrar** (link → `/login`) · **Criar conta** (ativa).
- Subtítulo: "Crie seu perfil de colecionador e conecte uma carteira quando quiser."
- **Nome de usuário** → `displayName` (placeholder "Nome de usuário").
- **E-mail** (placeholder "Digite seu e-mail").
- **Senha** (min 8; com mostrar/ocultar).
- **Confirmar senha** (match no cliente — A5).
- CTA **Criar conta** / (mobile) **Criar perfil**.
- Divisor + sociais (fora de escopo).
- (Mobile) link "Já tem uma conta? Entre" → `/login`.

> Estados não desenhados (erro de API, carregando, campo inválido) seguem o padrão da foundation
> (`FormField` com erro associado, botão em loading, toasts). Preservar tipografia/cores/espaços do
> Figma (§8): card `surface-card`, bordas `border`, foco do input ativo em `primary`.

## Roteamento e navegação

- `/login` e `/register` já têm `validateSearch` (`{ redirect?: string }`) na foundation; a feature só
  substitui o `component`.
- **Links entre abas** preservam `redirect`: `<Link to="/register" search={{ redirect }}>` e vice-versa.
- **Pós-sucesso:** `navigate({ to: search.redirect ?? "/" })`. Validar que `redirect` é um caminho
  interno (começa com "/") antes de navegar — não redirecionar para URL externa (segurança).
- **Fechar:** mesmo destino do pós-sucesso (`redirect ?? "/"`).
- Se o usuário **já está autenticado** e acessa `/login`/`/register`, redirecionar para
  `redirect ?? "/"` (não faz sentido logar de novo) — via `beforeLoad` lendo `keys.session`.

## Dados, hooks e mutations

Consome a camada de dados — **não** chama Axios/handlers direto:

- **`useSession()`** (`@/lib/auth/use-session`) — estado de autenticação (já usado no header).
- **Login:** `useMutation` chamando `signIn(body)` de `@/lib/auth/session` (faz teardown
  incondicional → `setQueryData(session)` → `connectRealtime`). `retry: 0`.
- **Cadastro:** `useMutation` chamando `signUp(body)`.
- **Logout:** já no header (`AccountMenu` → `signOut()`); a feature não duplica, mas documenta o
  contrato: `signOut` limpa token, cache privado e socket (isolamento §11).
- **Carrinho de visitante:** mesclado server-side no handler de login (SESSION_CONTEXT). A UI não faz
  nada especial — `adoptSession` faz teardown e o `cart` é refetchado quando a feature `cart` montar.
- **Colocação (decisão Fase 3):** os hooks de mutação ficam **colados à feature** em
  `src/features/auth/` (ex.: `use-login.ts`, `use-register.ts`), não na camada de dados.

## Validação e mapeamento de erros

**Validação de cliente (zod + RHF):** `loginRequestSchema` / `registerRequestSchema` (+ `confirmPassword`).
Mensagens em pt-BR por campo, associadas via `FormField` (`aria-invalid`/`aria-describedby`).

**Erros da API (`HttpError.detail`, via `isApiCode`):**

| Cenário | `code` (status) | Tratamento na UI |
| --- | --- | --- |
| Login com credenciais inválidas | `unauthenticated` (401) | Erro **no formulário** ("E-mail ou senha inválidos."), não redireciona. |
| Cadastro com e-mail já usado | `conflict` reason `registration` (409) | Erro **no campo e-mail** ("Este e-mail já está cadastrado."). |
| Validação do servidor | `validation` (400) | Mapear `error.fields` → erros por campo; sobra vira erro de formulário. |
| Falha transitória / rede | `transient` (503) / `network` | Erro de formulário + permitir reenvio (o botão volta ao estado normal). **Sem** dado fabricado. |

> O interceptor 401 global (`onUnauthenticated`) faz teardown + sessão nula. No **login**, porém, o
> 401 é resposta de credencial inválida e deve virar erro de formulário — **não** disparar o fluxo de
> expiração. Garantir que o cenário de login mal-sucedido seja tratado localmente na mutation (o
> teardown por 401 é idempotente e inofensivo aqui, mas a UI mostra o erro inline em vez de navegar).

## Ciclo de vida da sessão (§3 / §7)

- **Recuperação pós-refresh:** já coberta por `bootSession()` no bootstrap (foundation/Fase 3). A
  feature não reimplementa.
- **Expiração durante navegação:** rota privada + sessão ausente → `requireAuth` redireciona para
  `/login?redirect=<rota>`; após login o usuário volta ao destino.
- **Expiração durante checkout:** o `redirect` preserva a rota de checkout; o estado do checkout
  (carrinho/cotação) é refetchado ao retornar. Detalhes do bloqueio/retomada ficam na feature
  `checkout`; `auth` garante o retorno via `redirect`.
- **Logout/troca de usuário:** `signOut`/`signIn` fazem teardown (`queryClient.clear` + socket off) —
  isolamento por usuário (eliminatório §11). Após logout, navegar para `/`.

## Acessibilidade (§8)

- Dialog com foco preso, `Esc` fecha, `aria-modal` (Radix/foundation). `DialogTitle`/`DialogDescription`
  preenchidos (nome acessível do modal).
- Inputs com `<Label>` associado (via `FormField`); erros com `role="alert"` ligados por
  `aria-describedby`; `aria-invalid` no campo com erro.
- Botão mostrar/ocultar senha com `aria-label` e `aria-pressed`; não remove o foco do campo.
- CTA em loading: `aria-busy`, desabilitado, sem perder a mensagem anterior.
- Sociais/"esqueceu a senha" fora de escopo: `aria-disabled` + texto de indisponibilidade (não
  simulam sucesso, §3).
- Navegação 100% por teclado; foco visível (ring `primary`); responsivo 390/768/1440 sem overflow.

## Critérios de aceitação

1. `/login` e `/register` renderizam o modal (desktop) / full-screen (mobile) fiéis ao Figma, com
   troca entre abas preservando `redirect`.
2. Login válido autentica, conecta o realtime e **retorna ao `redirect`** (ou `/`); header passa a
   mostrar o menu de conta.
3. Cadastro válido cria conta + autentica; e-mail duplicado mostra erro **no campo e-mail** (409
   registration); senha < 8 e confirmação divergente barram no cliente.
4. Credenciais inválidas no login mostram erro **no formulário** sem redirecionar nem fabricar dado.
5. Acesso a `/login` já autenticado redireciona para `redirect ?? "/"`.
6. Logout limpa sessão/cache/socket e volta para `/`; abrir rota privada sem sessão manda para
   `/login?redirect=` e retorna após autenticar.
7. Sociais e "esqueceu a senha" presentes mas não-funcionais (§3), acessíveis.
8. a11y: foco preso no dialog, labels/erros associados, teclado, mostrar/ocultar senha acessível.
9. `tsc`, `npm run lint`, `npm run test`, `npm run build` limpos; sem regressão.

## Verificação

- Dev: abrir `/login` direto (deep-link) e via botão "Entrar" do header → `redirect` aponta para a
  rota de origem; autenticar retorna a ela.
- Cenários do mock: cadastro com e-mail existente (cenário de conflito de registro) → erro no campo;
  `?scenario=session-expired` em rota privada → redireciona ao login e retoma após autenticar;
  login com senha errada → erro inline.
- Logout → header volta a "Entrar", `queryClient` limpo (sem dados do usuário anterior); autenticar
  com **outro** usuário não vaza dados do primeiro (eliminatório §11).
- Teclado: Tab/Shift+Tab presos no dialog; Esc fecha para `redirect`; mostrar/ocultar senha operável.
- Responsivo 390/768/1440: full-screen no mobile, card centralizado no desktop, sem overflow.

## Testabilidade (preparar p/ Playwright §9.3)

- Expor rótulos/roles estáveis (labels dos campos, nome acessível do dialog) para selação por a11y.
- Fluxos-alvo do §9.3: cadastro, login, **expiração de sessão**, logout e **troca de usuário** —
  todos dirigíveis por cenário do mock (`window.__mock` / `?scenario=`) + credenciais das fixtures
  (≥2 usuários). As credenciais fictícias serão documentadas no README da solução (Fase 7).
