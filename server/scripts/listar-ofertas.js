/**
 * Utilitário: roda depois que as chaves da Naut estiverem no .env e as 3
 * ofertas (Essencial/Profissional/Ilimitado) tiverem sido criadas no painel
 * deles. Lista os productId/offerId de cada uma pra colar em server/planos.js.
 *
 * Uso: node server/scripts/listar-ofertas.js
 */
require('dotenv').config();
const { listarProdutos } = require('../naut');

(async () => {
  try {
    const produtos = await listarProdutos();
    if (!produtos.length) {
      console.log('Nenhum produto encontrado — crie as ofertas no painel da Naut primeiro.');
      return;
    }
    for (const p of produtos) {
      console.log(`\nProduto: ${p.name}  (productId: ${p.id})`);
      for (const o of p.offers || []) {
        console.log(`  Oferta: ${o.name}  offerId: ${o.id}  preço: R$${(o.price / 100).toFixed(2)}  tipo: ${o.billingType}`);
      }
    }
  } catch (erro) {
    console.error('Erro ao listar produtos:', erro.codigo, erro.message);
  }
})();
