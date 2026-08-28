/**
 * Servidor único: serve o site estático (landing page + checkout) E a API
 * do checkout, no mesmo processo. Evita CORS entre front e back, e o
 * checkout.html pode simplesmente chamar fetch('/api/...') como já está
 * escrito, sem precisar saber onde o backend está hospedado.
 *
 * Local: `node server/index.js` (porta 5501 por padrão, pra não brigar com
 * o servidor estático de desenvolvimento na 5500).
 * Produção: publicar como "Web Service" no Render (não "Static Site" — esse
 * tipo não roda servidor), com as variáveis de ambiente NAUT_PUBLIC_KEY e
 * NAUT_SECRET_KEY configuradas no painel.
 */
require('dotenv').config();
const express = require('express');
const path = require('path');

const checkoutRoutes = require('./routes/checkout');
const webhookRoutes = require('./routes/webhook');
const naut = require('./naut');

const app = express();
const PORTA = process.env.PORT || 5501;
const RAIZ_SITE = path.join(__dirname, '..', 'landing-page');

app.use(express.json());

app.use('/api/checkout', checkoutRoutes);
app.use('/api/webhooks', webhookRoutes);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, nautConfigurada: naut.chavesConfiguradas() });
});

app.use(express.static(RAIZ_SITE));

app.listen(PORTA, () => {
  console.log(`PersonalHub server rodando em http://localhost:${PORTA}`);
  console.log(`Naut ${naut.chavesConfiguradas() ? 'configurada' : 'SEM CHAVES — checkout cai em modo demonstração'}`);
});
