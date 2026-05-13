# Integração Feiras → Quintal Ideal

Quando um lead é capturado no sistema de feiras (`splashfenasoja`), ele é enviado
automaticamente para o projeto principal (`quintalideal`) via chamada HTTP entre
Edge Functions. A integração é **fire-and-forget**: se o principal estiver
indisponível, o lead ainda é salvo na feira normalmente.

```
[Visitante da Feira]
       │ preenche formulário
       ▼
[splashfenasoja — Edge Function: submit-lead]
       │ 1. salva na tabela `leads` (feira)
       │ 2. chama receber-lead-feira (fire-and-forget, 8s timeout)
       ▼
[quintalideal — Edge Function: receber-lead-feira]
       │ valida x-integration-secret
       │ verifica duplicata por lead_id
       └─ salva na tabela `leads_feira` (principal)
```

---

## Passo 1 — Projeto quintalideal: rodar a migration

Acesse o **SQL Editor** do projeto quintalideal no Supabase Dashboard e execute o
conteúdo do arquivo `migration_leads_feira.sql` (pasta `integracao-quintalideal/`).

Isso cria a tabela `leads_feira` com RLS e índices.

---

## Passo 2 — Projeto quintalideal: deploy da Edge Function

Copie a pasta `integracao-quintalideal/functions/receber-lead-feira/` para dentro
de `supabase/functions/` no repositório do quintalideal e faça push.
O Lovable irá detectar e fazer o deploy automaticamente.

Ou via Supabase CLI:
```bash
supabase functions deploy receber-lead-feira --project-ref <PROJECT_REF_QUINTALIDEAL>
```

---

## Passo 3 — Gerar o segredo compartilhado

Gere uma string aleatória segura (mínimo 32 caracteres). Você pode usar:
```bash
openssl rand -hex 32
```
Exemplo: `a7f3c91b2e48d06f5a1b9c3e7d2f8045a6b1e4c9d0f7a3b8e2c5d1f9a4b7e0c3`

Guarde esse valor — ele será configurado em **ambos** os projetos.

---

## Passo 4 — Projeto quintalideal: configurar o secret

No **Supabase Dashboard** do quintalideal → Edge Functions → Secrets:
```
LEADS_FEIRA_SECRET = <valor-gerado-no-passo-3>
```

Ou via CLI:
```bash
supabase secrets set LEADS_FEIRA_SECRET=<valor> --project-ref <PROJECT_REF_QUINTALIDEAL>
```

---

## Passo 5 — Projeto splashfenasoja: configurar os secrets

No **Supabase Dashboard** da feira → Edge Functions → Secrets, adicione:
```
QUINTAL_URL                = https://<PROJECT_REF_QUINTALIDEAL>.supabase.co
QUINTAL_INTEGRATION_SECRET = <mesmo-valor-do-passo-3>
```

Ou via CLI:
```bash
supabase secrets set \
  QUINTAL_URL=https://<PROJECT_REF_QUINTALIDEAL>.supabase.co \
  QUINTAL_INTEGRATION_SECRET=<valor> \
  --project-ref <PROJECT_REF_SPLASHFENASOJA>
```

> **Onde achar o PROJECT_REF?**  
> Supabase Dashboard → Settings → General → Reference ID

---

## Passo 6 — Deploy do submit-lead atualizado

Faça push do arquivo `supabase/functions/submit-lead/index.ts` para o repositório
`splashfenasoja`. O Lovable irá fazer o deploy.

Ou via CLI:
```bash
supabase functions deploy submit-lead --project-ref <PROJECT_REF_SPLASHFENASOJA>
```

---

## Verificar se está funcionando

1. Capture um lead de teste no formulário público da feira
2. No Supabase do quintalideal → Table Editor → `leads_feira`
3. O lead deve aparecer em até 10 segundos

Se não aparecer, verifique os logs:
- **splashfenasoja**: Edge Functions → submit-lead → Logs  
  Procure por `quintal-sync: lead enviado` ou `quintal-sync: erro`
- **quintalideal**: Edge Functions → receber-lead-feira → Logs  
  Procure por `lead recebido` ou erros de autenticação

---

## Campos disponíveis em `leads_feira`

| Campo | Origem | Descrição |
|---|---|---|
| `lead_id` | feira | UUID original do lead na feira |
| `feira_nome` | feira | Ex: "FENASOJA 2026" |
| `feira_slug` | feira | Ex: "fenasoja2026" |
| `nome`, `whatsapp`, `email` | lead | Dados de contato |
| `cidade`, `estado` | lead | Localização |
| `tamanho_quintal` | lead | Tamanho do espaço |
| `prazo_compra` | lead | Horizonte de compra |
| `orcamento` | lead | Faixa de orçamento |
| `score` | feira | 0-100 calculado |
| `temperatura` | feira | quente / morno / frio |
| `status` | quintalideal | novo → em_contato → negociando → convertido / perdido |
| `notas` | quintalideal | Anotações da equipe comercial |
| `atribuido_a` | quintalideal | Vendedor responsável |
| `recebido_em` | quintalideal | Timestamp de chegada |

---

## Campos CRM no quintalideal

Após receber o lead, a equipe do quintalideal pode:
- Alterar `status` conforme progresso da negociação
- Preencher `notas` com observações do contato
- Atribuir `atribuido_a` para um vendedor (UUID de `auth.users`)
- Registrar `contatado_em` e `convertido_em`

Esses campos **não voltam** para a feira — a integração é unidirecional (feira → principal).
