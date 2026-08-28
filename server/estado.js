/**
 * Guarda o estado de cada pagamento em memória: paymentId -> 'pendente' | 'pago' | 'falhou'.
 *
 * SÓ SERVE PRA MVP/demo. Reinicia o servidor, perde tudo. Antes de ir pra
 * produção de verdade isso precisa virar uma tabela (Postgres/SQLite/Redis —
 * qualquer coisa que sobreviva a um restart e a múltiplas instâncias do
 * servidor rodando ao mesmo tempo).
 *
 * A tela do checkout nunca fala direto com a Naut pra saber se pagou — ela
 * pergunta aqui, e é o webhook (server/routes/webhook.js) quem atualiza isso
 * quando a Naut avisa que o Pix caiu.
 */
const pagamentos = new Map();

function registrar(paymentId, dados) {
  pagamentos.set(paymentId, { estado: 'pendente', criadoEm: Date.now(), ...dados });
}

function marcarPago(paymentId, extra) {
  const atual = pagamentos.get(paymentId) || {};
  pagamentos.set(paymentId, { ...atual, estado: 'pago', pagoEm: Date.now(), ...extra });
}

function marcarFalhou(paymentId, motivo) {
  const atual = pagamentos.get(paymentId) || {};
  pagamentos.set(paymentId, { ...atual, estado: 'falhou', motivo });
}

function consultar(paymentId) {
  return pagamentos.get(paymentId) || null;
}

module.exports = { registrar, marcarPago, marcarFalhou, consultar };
