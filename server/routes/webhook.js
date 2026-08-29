const express = require('express');
const crypto = require('crypto');
const estado = require('../estado');

const router = express.Router();

/**
 * Cadastrado via POST /api/public/v1/webhooks/create em 28/08, id
 * 01a046c4-f4ca-7af1-aed4-de9541b79bae. A Naut devolveu o signingSecret uma
 * única vez ("ele não será exibido novamente") — está em NAUT_WEBHOOK_SECRET.
 * Eventos assinados: transaction.paid, transaction.failed,
 * subscription.created, subscription.cancelled.
 * (subscription.renewed foi recusado nessa chave: "Eventos não permitidos:
 * subscription.renewed" — falta descobrir se é uma permissão extra ou se o
 * nome do evento é outro; não é bloqueante pro checkout.)
 *
 * VERIFICAÇÃO DE ASSINATURA: HMAC-SHA256 do corpo cru, em hex, comparado com
 * o header `X-Webhook-Signature` — confirmado contra a doc oficial
 * (https://navenaut.com/api/public/v1/webhooks/llm.txt) e validado com um
 * pagamento real em produção (29/08, Pix de R$1 em modo live).
 *
 * Nota: webhooks são por ORGANIZAÇÃO, não por ambiente da chave (test/live)
 * — um webhook cadastrado com a chave de teste continua ativo e recebendo
 * eventos mesmo depois de trocar pra chave live, cada um com o seu próprio
 * signingSecret. Cadastrar um webhook novo pro live sem apagar o antigo faz
 * a Naut mandar o MESMO evento pros dois — o antigo falha pra sempre (nosso
 * servidor só guarda um secret por vez), o que parece um bug mas é só ruído.
 */
function assinaturaValida(req) {
  const segredo = process.env.NAUT_WEBHOOK_SECRET;
  if (!segredo) return true; // segredo ainda não configurado — não bloqueia, só não verifica
  const recebida = req.headers['x-webhook-signature'];
  if (!recebida) {
    console.warn('[webhook naut] sem header X-Webhook-Signature — aceitando mesmo assim (ajustar quando confirmarmos o header certo)');
    return true;
  }
  const esperada = crypto.createHmac('sha256', segredo).update(req.rawBody || '').digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(recebida), Buffer.from(esperada));
  } catch {
    return false; // tamanhos diferentes = já não bate
  }
}

router.post('/naut', (req, res) => {
  // req.rawBody já vem pronto do parser global (server/index.js) — não
  // repetir express.json() aqui, ou o segundo parser não acha mais nada pra
  // ler (o stream já foi consumido pelo primeiro) e a assinatura nunca bate.
  if (!assinaturaValida(req)) {
    console.error('[webhook naut] assinatura inválida — payload rejeitado');
    return res.status(401).json({ recebido: false, erro: 'assinatura inválida' });
  }

  const { event, data } = req.body || {};
  console.log('[webhook naut]', event, data?.paymentId || data?.withdrawalId || '');

  switch (event) {
    case 'transaction.paid':
      if (data?.paymentId) estado.marcarPago(data.paymentId, { valorPago: data.amount });
      break;
    case 'transaction.failed':
      if (data?.paymentId) estado.marcarFalhou(data.paymentId, data?.failureReason || 'gateway recusou');
      break;
    case 'subscription.renewed':
      // Renovação de ciclo: registrar/atualizar como preferir (relatório,
      // e-mail de recibo, etc.) — não bloqueia o checkout, é evento futuro.
      break;
    case 'subscription.cancelled':
      // TODO: revogar acesso do usuário no seu banco de dados de verdade
      // quando esse fluxo existir (hoje o produto ainda não tem backend de
      // conta/usuário — só o checkout).
      break;
    default:
      // Eventos não tratados ainda (subscription.created, withdrawal.*, etc.)
      // — logamos e ignoramos, sem erro, pra não fazer a Naut re-tentar à toa.
      break;
  }

  // Responder 200 rápido é importante: a Naut reenvia o webhook se não
  // receber confirmação, e processamento pesado deveria rodar depois, não
  // bloquear esta resposta.
  res.status(200).json({ recebido: true });
});

module.exports = router;
