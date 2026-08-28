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
    naut: { productId: '01a0469c-b9af-7c63-a329-c8a5896a0125', offerId: '01a0469c-b9ac-7030-a940-94fcc73a3f78' },
  },
  profissional: {
    nome: 'Profissional',
    centavos: 24990,
    naut: { productId: '01a0469e-0f3e-7645-841a-3c853b4af775', offerId: '01a0469e-0f39-77e7-bb4e-6e46b96ed222' },
  },
  ilimitado: {
    nome: 'Ilimitado',
    centavos: 39790,
    naut: { productId: '01a0469f-2f01-7919-8cde-b246f2a6ee17', offerId: '01a0469f-2efe-7342-a02e-18683a32a249' },
  },
};

function planoPorId(id) {
  return PLANOS[id] || null;
}

function planoConfigurado(plano) {
  return Boolean(plano && plano.naut.productId && plano.naut.offerId);
}

module.exports = { PLANOS, planoPorId, planoConfigurado };
