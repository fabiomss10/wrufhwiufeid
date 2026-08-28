/**
 * Sessão de login — token aleatório num cookie httpOnly, mapeado pro e-mail
 * da conta. Em memória, mesmo aviso de sempre: reinicia o servidor, todo
 * mundo é deslogado. Trocar por Redis (ou a mesma tabela de contas, com
 * expiração) quando isso for pra valer.
 */
const crypto = require('crypto');

const sessoes = new Map(); // token -> { email, criadaEm }
const NOME_COOKIE = 'ph_sessao';
const DURACAO_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

function criarSessao(res, email) {
  const token = crypto.randomBytes(32).toString('hex');
  sessoes.set(token, { email, criadaEm: Date.now() });
  res.cookie(NOME_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: DURACAO_MS,
  });
  return token;
}

function emailDaSessao(req) {
  const token = req.cookies?.[NOME_COOKIE];
  if (!token) return null;
  const sessao = sessoes.get(token);
  return sessao ? sessao.email : null;
}

function encerrarSessao(req, res) {
  const token = req.cookies?.[NOME_COOKIE];
  if (token) sessoes.delete(token);
  res.clearCookie(NOME_COOKIE);
}

module.exports = { criarSessao, emailDaSessao, encerrarSessao, NOME_COOKIE };
