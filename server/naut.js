/**
 * Cliente fino pra API pública da Naut (https://navenaut.com/api/public/v1).
 *
 * Nunca deixa X-Public-Key / X-Secret-Key chegarem no navegador — só este
 * arquivo, rodando no servidor, conhece essas chaves. O checkout.html só
 * fala com o NOSSO backend (server/routes/checkout.js), nunca direto com a
 * Naut, exatamente como a documentação deles recomenda.
 */
const BASE_URL = 'https://navenaut.com/api/public/v1';

function chavesConfiguradas() {
  return Boolean(process.env.NAUT_PUBLIC_KEY && process.env.NAUT_SECRET_KEY);
}

function headersPadrao() {
  return {
    'Content-Type': 'application/json',
    'X-Public-Key': process.env.NAUT_PUBLIC_KEY || '',
    'X-Secret-Key': process.env.NAUT_SECRET_KEY || '',
  };
}

/**
 * POST /payments/create — cria uma cobrança (Pix ou cartão) referenciando a
 * oferta de assinatura correspondente ao plano escolhido.
 *
 * `requestId` é a chave de idempotência: um UUID novo por tentativa real do
 * usuário. Reenviar o MESMO requestId com corpo diferente a Naut recusa (é
 * assim que evitam cobrança duplicada em retry de rede) — então geramos um
 * requestId novo a cada clique em "Gerar Pix e assinar" / "Pagar e assinar",
 * nunca reaproveitamos o de uma tentativa anterior que falhou por outro
 * motivo (CVV errado, por exemplo).
 */
async function criarPagamento({ plano, metodo, comprador, cartao, requestId }) {
  if (!chavesConfiguradas()) {
    const erro = new Error('Naut ainda não configurada (faltam as chaves de API).');
    erro.codigo = 'NAUT_NOT_CONFIGURED';
    throw erro;
  }

  const corpo = {
    paymentMethod: metodo, // 'pix' | 'credit_card'
    amount: plano.centavos,
    currency: 'BRL',
    customerData: {
      email: comprador.email,
      name: comprador.nome,
      document: comprador.documento,
    },
    productId: plano.naut.productId,
    offerId: plano.naut.offerId,
    requestId,
  };

  if (metodo === 'credit_card') {
    corpo.installments = cartao.parcelas || 1;
    corpo.cardData = {
      number: cartao.numero,
      holderName: cartao.titular,
      expiryMonth: cartao.mes,
      expiryYear: cartao.ano,
      cvv: cartao.cvv,
    };
  }

  const resp = await fetch(`${BASE_URL}/payments/create`, {
    method: 'POST',
    headers: { ...headersPadrao(), 'X-Request-Id': requestId },
    body: JSON.stringify(corpo),
  });

  const json = await resp.json().catch(() => null);
  if (!resp.ok || !json || json.success === false) {
    const erro = new Error(json?.error?.message || `Naut respondeu ${resp.status}`);
    erro.codigo = json?.error?.code || 'NAUT_ERROR';
    erro.status = resp.status;
    throw erro;
  }
  return json.data;
}

/** GET /payments/{id} — status atual de um pagamento específico. Usado só
 * como reforço eventual; a fonte de verdade é sempre o webhook. */
async function consultarPagamento(paymentId) {
  if (!chavesConfiguradas()) {
    const erro = new Error('Naut ainda não configurada (faltam as chaves de API).');
    erro.codigo = 'NAUT_NOT_CONFIGURED';
    throw erro;
  }
  const resp = await fetch(`${BASE_URL}/payments/${encodeURIComponent(paymentId)}`, {
    headers: headersPadrao(),
  });
  const json = await resp.json().catch(() => null);
  if (!resp.ok || !json || json.success === false) {
    const erro = new Error(json?.error?.message || `Naut respondeu ${resp.status}`);
    erro.codigo = json?.error?.code || 'NAUT_ERROR';
    throw erro;
  }
  return json.data;
}

/** GET /products — usado só pelo script utilitário de configuração, pra
 * achar productId/offerId depois que as ofertas forem criadas no painel. */
async function listarProdutos() {
  if (!chavesConfiguradas()) {
    const erro = new Error('Naut ainda não configurada (faltam as chaves de API).');
    erro.codigo = 'NAUT_NOT_CONFIGURED';
    throw erro;
  }
  const resp = await fetch(`${BASE_URL}/products?status=published&limit=100`, {
    headers: headersPadrao(),
  });
  const json = await resp.json().catch(() => null);
  if (!resp.ok || !json || json.success === false) {
    const erro = new Error(json?.error?.message || `Naut respondeu ${resp.status}`);
    erro.codigo = json?.error?.code || 'NAUT_ERROR';
    throw erro;
  }
  return json.data.items;
}

module.exports = { chavesConfiguradas, criarPagamento, consultarPagamento, listarProdutos };
