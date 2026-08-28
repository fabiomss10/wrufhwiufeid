/**
 * Contas de usuário — guarda em memória, senha sempre com hash (bcrypt),
 * nunca em texto puro.
 *
 * SÓ SERVE PRA MVP, igual o estado.js dos pagamentos: reinicia o servidor,
 * perde as contas. Antes de valer pra usuários de verdade isso precisa virar
 * uma tabela num banco de verdade (Postgres, por exemplo) — e nesse momento
 * também vale trocar bcryptjs (puro JS, mais lento) pelo bcrypt nativo, que
 * é mais rápido em produção com volume.
 */
const bcrypt = require('bcryptjs');

const contas = new Map(); // email (minúsculo) -> conta

function normalizaEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function existeConta(email) {
  return contas.has(normalizaEmail(email));
}

async function criarConta({ nome, email, telefone, documento, senha, planoId }) {
  const e = normalizaEmail(email);
  if (contas.has(e)) {
    const erro = new Error('Este e-mail já tem conta.');
    erro.codigo = 'EMAIL_JA_EXISTE';
    throw erro;
  }
  const senhaHash = await bcrypt.hash(senha, 10);
  const conta = { nome, email: e, telefone, documento, planoId, senhaHash, criadaEm: Date.now() };
  contas.set(e, conta);
  return semSenha(conta);
}

async function verificarLogin(email, senha) {
  const conta = contas.get(normalizaEmail(email));
  if (!conta) return null;
  const ok = await bcrypt.compare(senha, conta.senhaHash);
  return ok ? semSenha(conta) : null;
}

function buscarConta(email) {
  const conta = contas.get(normalizaEmail(email));
  return conta ? semSenha(conta) : null;
}

function semSenha(conta) {
  const { senhaHash, ...resto } = conta;
  return resto;
}

module.exports = { existeConta, criarConta, verificarLogin, buscarConta };
