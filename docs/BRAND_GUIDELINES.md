# Splash — Diretrizes de UI

Este documento centraliza tokens, espaçamentos, tipografia e estados de
componentes da identidade Splash, para manter consistência em todos os
polimentos futuros.

> Fonte de verdade dos tokens: `src/styles.css` (variáveis CSS em `oklch`).
> Nunca hardcode cores em componentes — sempre referencie tokens semânticos.

---

## 1. Paleta

### Cores principais (identidade Splash)

| Token              | Uso                                  |
|--------------------|--------------------------------------|
| `--primary`        | CTA principal, ações de destaque     |
| `--secondary`      | Navy — títulos, headers, texto forte |
| `--accent`         | Detalhes de marca                    |
| `--muted`          | Backgrounds neutros, chips           |
| `--muted-foreground` | Texto secundário/labels             |
| `--card`           | Superfícies elevadas                 |
| `--border`         | Linhas, divisores                    |

### Cores funcionais

| Cor       | Uso                             | Classe utilitária comum            |
|-----------|---------------------------------|------------------------------------|
| Verde     | WhatsApp, sucesso               | `bg-green-500/10 text-green-600`   |
| Laranja   | Exportar, ações secundárias     | `bg-orange-500 hover:bg-orange-600`|
| Vermelho  | Destrutivo (excluir)            | `text-destructive`                 |
| Azul      | Informativo                     | `bg-primary/10 text-primary`       |

### Temperatura de leads

- 🔥 **Quente** — alta prioridade
- 🌤️ **Morno** — em qualificação
- ❄️ **Frio** — baixa prioridade

Sempre via `TEMP_BADGE` em `src/lib/leads.ts`.

---

## 2. Tipografia

- **Títulos**: `font-extrabold` ou `font-black`, `tracking-tight`,
  `text-secondary`.
- **Labels/eyebrows**: `text-[10px] font-extrabold uppercase tracking-widest
  text-muted-foreground`.
- **Corpo**: `text-sm` desktop, `text-base` quando há leitura intensiva.
- **Inputs em mobile**: mínimo `16px` para evitar zoom no iOS (já forçado
  globalmente em `src/styles.css`).

Escala recomendada:

| Uso                | Classe                  |
|--------------------|-------------------------|
| Heading página     | `text-xl` → `text-2xl`  |
| Heading seção      | `text-base font-black`  |
| Card title         | `text-lg font-bold`     |
| Body               | `text-sm`               |
| Meta / hint        | `text-xs`               |
| Eyebrow / chip     | `text-[10px]`           |

---

## 3. Espaçamento e raios

- **Gap padrão entre seções**: `space-y-4` (mobile), `space-y-6` (desktop).
- **Padding de card**: `p-4` mobile, `p-5/6` desktop.
- **Raios**:
  - Botões: `rounded-xl` (padrão), `rounded-2xl` (CTA principal).
  - Cards: `rounded-2xl`.
  - Pills/badges: `rounded-full`.
  - Inputs: `rounded-xl`.

### Safe-area (mobile)

Sempre usar utilitários definidos em `src/styles.css`:
- `pt-safe`, `pb-safe`, `px-safe`
- `pb-nav-safe` em containers que vivem acima da bottom nav.

---

## 4. Alvos de toque

- Mínimo **44×44 px** para qualquer botão tocável no mobile
  (`h-11 w-11` ou `h-11 px-4`).
- Ícones-botão em listas: `w-11 h-11` mobile, `w-9 h-9` desktop.
- Botões com label: `h-10` desktop, `h-11` mobile.
- Em cards clicáveis, ações internas devem `e.stopPropagation()`.

---

## 5. Estados de componente

### Botão

- **Default**: cor de marca, `shadow-md`, peso `font-bold`.
- **Hover** (desktop): leve escurecer (`hover:bg-*-600`).
- **Active** (mobile): `active:scale-[0.99]` ou `active:bg-*/25`.
- **Focus**: `focus:outline-none focus:ring-2 focus:ring-primary/40`.
- **Disabled**: opacidade reduzida, cursor `not-allowed`.
- **Loading**: ícone `Loader2 animate-spin` + `aria-busy="true"`.

### Card / row clicável

```tsx
className="bg-card border border-border rounded-2xl p-4
  hover:border-primary/40 active:scale-[0.99]
  focus:outline-none focus:ring-2 focus:ring-primary/40
  transition-all cursor-pointer"
```

### Input

- Altura `h-11` mobile, `h-10` desktop.
- `focus-visible:border-primary focus-visible:ring-0`.
- Sempre com `aria-label` ou `<Label>` associado.

### Popover (mobile)

- `align="end"` para evitar overflow no canto direito.
- Largura máxima `w-72`–`w-80` no mobile.
- Fechar ao clicar fora deve ser sempre permitido.
- Conteúdos longos: usar `Sheet` em vez de `Popover`.

### Badge

- Peso `font-extrabold`, `uppercase`, `tracking-wider`.
- Tamanhos: `text-[10px]` (lista), `text-xs` (detalhe).
- Forma: `rounded-full` (status/temp), `rounded-md` (atributos).

---

## 6. Ícones

- Biblioteca: **lucide-react** (`stroke-width: 2` padrão).
- Marca: **WhatsApp** usa `@/components/icons/WhatsAppIcon` (SVG próprio,
  `currentColor`). Não usar `Phone` para representar WhatsApp.
- Tamanhos comuns: `w-4 h-4` (inline), `w-5 h-5` (botões), `w-6 h-6` (CTA).

---

## 7. Listas e virtualização

- Modo híbrido em `/admin/leads`:
  - `< 80` itens: render direto (grid).
  - `≥ 80` itens: `@tanstack/react-virtual` com `measureElement`.
- Auto-prefetch: `IntersectionObserver` com `rootMargin: 240px` reduz
  "salto" ao carregar mais itens no mobile.
- Mantém botão "Carregar mais" como fallback acessível.

---

## 8. Acessibilidade

- Toda ação tocável deve ter `aria-label` ou texto visível.
- Live regions (`aria-live="polite"`) para feedback de carregamento.
- Foco visível obrigatório (`focus:ring-2 focus:ring-primary/40`).
- Contraste mínimo AA em texto sobre superfícies de marca.
- Navegação por teclado: `Enter`/`Space` em elementos com `role="link"`/
  `role="button"`.

---

## 9. Responsividade

Breakpoints Tailwind (mobile-first):

| Breakpoint | Min width | Uso típico              |
|------------|-----------|-------------------------|
| `sm`       | 640px     | tablets pequenos        |
| `md`       | 768px     | tablets / split mobile  |
| `lg`       | 1024px    | desktop pequeno         |
| `xl`       | 1280px    | desktop                 |

Regras:
- Layout mobile é o **default**, desktop é progressive enhancement.
- Tabelas em mobile viram **cards/linhas empilhadas**.
- Use `min-h-dvh` em vez de `min-h-screen` para evitar pulo do toolbar.
- Stick headers: `sticky top-14 z-30 backdrop-blur-md`.
