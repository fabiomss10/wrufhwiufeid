const express = require('express');
const crypto = require('crypto');
const { planoPorId, planoConfigurado } = require('../planos');
const naut = require('../naut');
const estado = require('../estado');

const router = express.Router();

/**
 * POST /api/checkout/cobrar
 * Body: { plano, metodo, comprador: {nome,email,documento,telefone}, cartao?, parcelas? }
 *
 * Espelha o /api/assinatura/cobrar que o Felipe já usa: o front nunca vê a
 * chave secreta, só manda os dados e recebe de volta o que precisa mostrar
 * (código Pix / QR, ou confirmação imediata de cartão).
 */
router.post('/cobrar', async (req, res) => {
  const { plano: planoId, metodo, comprador, cartao } = req.body || {};

  if (!planoId || !metodo || !comprador?.nome || !comprador?.email || !comprador?.documento) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Faltam dados obrigatórios.' } });
  }
  if (!['pix', 'credit_card'].includes(metodo)) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Forma de pagamento inválida.' } });
  }

  const plano = planoPorId(planoId);
  if (!plano) {
    return res.status(404).json({ success: false, error: { code: 'PLANO_NOT_FOUND', message: 'Plano desconhecido.' } });
  }

  if (!naut.chavesConfiguradas() || !planoConfigurado(plano)) {
    // Backend existe e a rota é real, só falta a configuração (chaves da API
    // e/ou o productId/offerId da oferta desse plano no painel da Naut).
    // Devolvemos um código específico pro front cair no modo demonstração
    // em vez de mostrar uma tela de erro pro usuário.
    return res.status(503).json({
      success: false,
      error: {
        code: 'NAUT_NOT_CONFIGURED',
        message: 'Cobrança ainda não configurada com a Naut para este plano.',
      },
    });
  }

  try {
    const requestId = crypto.randomUUID();
    const dados = await naut.criarPagamento({
      plano,
      metodo,
      comprador,
      cartao,
      requestId,
    });

    estado.registrar(dados.paymentId, { planoId, comprador, metodo });

    // Cartão pode confirmar na hora (sem passar pela tela de Pix/espera).
    if (metodo === 'credit_card' && dados.status === 'completed') {
      estado.marcarPago(dados.paymentId, {});
    }

    res.status(201).json({
      success: true,
      id: dados.paymentId,
      status: dados.status,
      valor: dados.amount,
      copiaecola: dados.paymentDetails?.copyPasteCode || '',
      qr: dados.paymentDetails?.qrCodeBase64 || '',
      passe: dados.status === 'completed' ? dados.paymentId : '',
    });
  } catch (erro) {
    console.error('[naut] falha ao criar pagamento:', erro.codigo, erro.message);
    res.status(erro.status || 502).json({
      success: false,
      error: { code: erro.codigo || 'NAUT_ERROR', message: erro.message },
    });
  }
});

/**
 * GET /api/checkout/estado?id=pay_xxx
 * O front pergunta aqui de 4 em 4 segundos enquanto espera o Pix — nunca
 * direto pra Naut (regra deles: só o webhook confirma, nada de polling na
 * API real, sob risco de suspensão da chave).
 */
router.get('/estado', (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'id obrigatório.' } });
  const registro = estado.consultar(id);
  if (!registro) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Pagamento não encontrado.' } });
  res.json({ success: true, estado: registro.estado, passe: registro.estado === 'pago' ? id : '' });
});

/**
 * GET /api/checkout/passe?passe=pay_xxx
 * A tela de criar conta chama isso pra pré-preencher nome/e-mail/telefone/CPF
 * de quem já pagou — só funciona se o pagamento estiver "pago" de verdade,
 * senão qualquer id causaria cadastro sem pagamento correspondente.
 */
router.get('/passe', (req, res) => {
  const passe = req.query.passe;
  const registro = passe ? estado.consultar(passe) : null;
  if (!registro || registro.estado !== 'pago') {
    return res.status(404).json({ success: false, error: { code: 'PASSE_INVALIDO', message: 'Link de pagamento inválido ou expirado.' } });
  }
  const plano = planoPorId(registro.planoId);
  res.json({
    success: true,
    comprador: registro.comprador || {},
    plano: plano ? { id: registro.planoId, nome: plano.nome } : null,
  });
});

module.exports = router;
