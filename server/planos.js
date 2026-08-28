/**
 * Mapa dos planos do PersonalHub -> oferta correspondente na Naut.
 *
 * `naut.offerId` / `naut.productId` ficam vazios até você criar as 3 ofertas
 * no painel da Naut (Produtos > Criar novo produto), uma por plano, todas com
 * billingType = "subscription" e subscriptionInterval = "month". A API da
 * Naut não cria produto novo — isso só dá pra fazer pelo painel.
 *
 * Depois de criar, rode `node server/scripts/listar-ofertas.js` (ou GET
 * /api/checkout/debug/ofertas com o servidor rodando) pra pegar os IDs reais
 * e colar aqui.
 *
 * `centavos` é o preço mostrado no site — serve de trava de segurança: se o
 * valor que a Naut devolver pra uma oferta divergir muito disso, logamos um
 * aviso (provavelmente a oferta foi editada no painel e esqueceram de avisar
 * o time).
 */
const PLANOS = {
  essencial: {
    nome: 'Essencial',
    centavos: 6790,
    naut: { productId: '', offerId: '' },
  },
  profissional: {
    nome: 'Profissional',
    centavos: 24990,
    naut: { productId: '', offerId: '' },
  },
  ilimitado: {
    nome: 'Ilimitado',
    centavos: 39790,
    naut: { productId: '', offerId: '' },
  },
};

function planoPorId(id) {
  return PLANOS[id] || null;
}

function planoConfigurado(plano) {
  return Boolean(plano && plano.naut.productId && plano.naut.offerId);
}

module.exports = { PLANOS, planoPorId, planoConfigurado };
