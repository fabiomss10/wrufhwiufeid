/**
 * Guarda as respostas do quiz de diagnóstico (landing-page/quiz.html) em
 * memória — mesmo aviso de sempre no projeto (estado.js, contas.js):
 * reinicia o servidor (o que acontece a cada deploy no Render), perde tudo.
 * Antes de contar com isso pra análise de verdade, precisa virar uma tabela
 * num banco (Postgres, por exemplo).
 *
 * Não guarda nome/e-mail/telefone — o quiz foi feito de propósito sem
 * captura de lead (decisão do usuário), só as 6 respostas em si. Por isso
 * não há dado pessoal aqui, e a rota de listagem não tem autenticação (não
 * existe sistema de login de admin no projeto ainda).
 */
const crypto = require('crypto');

const respostas = new Map(); // id -> { respostas, soma, nivel, criadoEm }

function registrar(dados) {
  const id = crypto.randomUUID();
  respostas.set(id, { id, ...dados, criadoEm: Date.now() });
  return id;
}

function listar() {
  return Array.from(respostas.values()).sort((a, b) => b.criadoEm - a.criadoEm);
}

module.exports = { registrar, listar };
