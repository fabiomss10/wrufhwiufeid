const express = require('express');
const estado = require('../estado');

const router = express.Router();

/**
 * POST /api/webhooks/naut — a Naut chama aqui quando um pagamento muda de
 * estado (Pix caiu, cartão foi recusado, assinatura renovou, etc.).
 *
 * URL a cadastrar no painel deles (Configurações > Integrações > API >
 * Webhooks) depois que o backend estiver publicado com domínio fixo:
 *   https://<seu-dominio-do-backend>/api/webhooks/naut
 * Eventos a assinar: transaction.paid, transaction.failed,
 * subscription.created, subscription.renewed, subscription.cancelled.
 *
 * VERIFICAÇÃO DE ASSINATURA: a documentação que lemos até agora não mostrou
 * como a Naut assina o webhook (header tipo X-Naut-Signature, HMAC etc.).
 * Isso normalmente aparece na tela de "Nova chave" > Webhooks, no momento de
 * cadastrar a URL — quando você cadastrar, me manda o que aparecer lá (o
 * segredo/HMAC) que eu completo a verificação abaixo. Até lá, o endpoint
 * aceita a chamada sem validar a origem — não é seguro pra produção, mas
 * deixa o fluxo testável enquanto isso não chega.
 */
router.post('/naut', express.json(), (req, res) => {
  // TODO(segurança): validar assinatura do payload assim que soubermos o
  // mecanismo exato (ver comentário acima). Ex.:
  // const assinaturaValida = verificarAssinatura(req.headers['x-naut-signature'], req.rawBody, process.env.NAUT_WEBHOOK_SECRET);
  // if (!assinaturaValida) return res.status(401).end();

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
