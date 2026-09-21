# CurrículoGO — Guia de Deploy e Configuração

## Variáveis de Ambiente (Vercel)
Acesse: Vercel → Seu projeto → Settings → Environment Variables

| Variável | Onde obter |
|---|---|
| `VITE_GEMINI_API_KEY` | https://aistudio.google.com/app/apikey |
| `MP_ACCESS_TOKEN` | https://www.mercadopago.com.br/developers/panel → Credenciais de produção |
| `OWNER_SECRET` | Senha forte de sua escolha (min. 20 chars) |
| `SITE_URL` | `https://curriculo-go.vercel.app` |
| `VITE_FIREBASE_API_KEY` | Firebase Console → Configurações do projeto |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Console → Configurações do projeto |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Console → Configurações do projeto |
| `VITE_FIREBASE_APP_ID` | Firebase Console → Configurações do projeto |
| `FIREBASE_ADMIN_PROJECT_ID` | Firebase Console → Configurações do projeto |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Firebase Console → Contas de serviço → Gerar nova chave privada |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Mesmo arquivo acima — copie o valor `private_key` inteiro |

## Webhook MercadoPago (OBRIGATÓRIO para pagamentos confiáveis)
1. Acesse https://www.mercadopago.com.br/developers/panel/webhooks
2. Clique em **Adicionar** → Modo Produção
3. URL: `https://curriculo-go.vercel.app/api/mp-webhook`
4. Eventos: marque **Pagamentos**
5. Salvar

O webhook garante que o premium é ativado mesmo se o usuário fechar o modal antes do polling concluir.

## Google AdSense — Ativar anúncios
1. Acesse https://adsense.google.com → Anúncios → Por bloco de anúncio
2. Crie 3 blocos do tipo **Banner horizontal**
3. Copie o `data-ad-slot` de cada um
4. No código, substitua `slotId=""` por `slotId="SEU_ID"` nos 3 locais em `src/App.tsx`

## Google Analytics 4 (opcional mas recomendado)
1. Acesse https://analytics.google.com → Criar propriedade → Web
2. Copie o **Measurement ID** (formato `G-XXXXXXXXXX`)
3. Em `index.html`, descomente o bloco do GA4 e substitua `G-XXXXXXXXXX`

## Firebase Firestore — Regras
1. Acesse Firebase Console → Firestore → Regras
2. Cole o conteúdo de `firestore.rules`
3. Publicar

## Segurança da chave Gemini (OBRIGATÓRIO)
A `VITE_GEMINI_API_KEY` fica visível no bundle do browser — isso é necessário para o SDK funcionar no lado do cliente. Para evitar uso indevido:

1. Acesse https://aistudio.google.com/app/apikey
2. Clique na sua chave → **Edit**
3. Em **Application restrictions**, selecione **HTTP referrers (websites)**
4. Adicione: `https://curriculo-go.vercel.app/*`
5. Salvar

Sem isso, qualquer pessoa pode copiar a chave do devtools e usar na conta de vocês.

## Verificar se está funcionando
- [ ] Criar currículo, gerar PDF ✓
- [ ] Criar conta Google, salvar na nuvem ✓
- [ ] Gerar PIX, pagar, receber premium ✓
- [ ] Abrir painel do dono (Ctrl+Shift+O), ver clientes ✓
- [ ] Enviar mensagem no formulário de contato ✓
