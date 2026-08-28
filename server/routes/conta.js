const express = require('express');
const rateLimit = require('express-rate-limit');
const contas = require('../contas');
const sessoes = require('../sessoes');
const estado = require('../estado');

const router = express.Router();

// Login é o alvo clássico de força bruta de senha — 10 tentativas por IP a
// cada 15 min é folgado pra uso normal (erro de digitação) e trava um script
// tentando adivinhar senha. Criar conta não tem senha alheia em jogo, mas
// limita spam de contas/e-mails.
const limitadorLogin = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });
const limitadorCriarConta = rateLimit({ windowMs: 60 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

/**
 * POST /api/conta/criar
 * Body: { passe, nome, email, telefone, documento, senha }
 *
 * `passe` é o id do pagamento confirmado (mesma ideia do Felipe: só quem
 * pagou chega até aqui). Sem passe válido e "pago", não cria conta — isso
 * evita cadastro aberto sem ligação nenhuma com uma assinatura.
 */
router.post('/criar', limitadorCriarConta, async (req, res) => {
  const { passe, nome, email, telefone, documento, senha } = req.body || {};

  const registro = passe ? estado.consultar(passe) : null;
  if (!registro || registro.estado !== 'pago') {
    return res.status(403).json({ success: false, error: { code: 'PASSE_INVALIDO', message: 'Link de pagamento inválido ou expirado.' } });
  }

  if (!nome?.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email || '') || !telefone || (senha || '').length < 6) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Confira os dados e a senha (mínimo 6 caracteres).' } });
  }

  try {
    const conta = await contas.criarConta({
      nome: nome.trim(), email, telefone, documento, senha, planoId: registro.planoId,
    });
    sessoes.criarSessao(res, conta.email);
    res.status(201).json({ success: true, conta });
  } catch (erro) {
    const status = erro.codigo === 'EMAIL_JA_EXISTE' ? 409 : 500;
    res.status(status).json({ success: false, error: { code: erro.codigo || 'ERRO', message: erro.message } });
  }
});

/** POST /api/conta/login — Body: { email, senha } */
router.post('/login', limitadorLogin, async (req, res) => {
  const { email, senha } = req.body || {};
  const conta = await contas.verificarLogin(email || '', senha || '');
  if (!conta) return res.status(401).json({ success: false, error: { code: 'CREDENCIAIS_INVALIDAS', message: 'E-mail ou senha incorretos.' } });
  sessoes.criarSessao(res, conta.email);
  res.json({ success: true, conta });
});

/** GET /api/conta/eu — quem está logado, pela sessão do cookie */
router.get('/eu', (req, res) => {
  const email = sessoes.emailDaSessao(req);
  const conta = email ? contas.buscarConta(email) : null;
  if (!conta) return res.status(401).json({ success: false, error: { code: 'SEM_SESSAO', message: 'Não autenticado.' } });
  res.json({ success: true, conta });
});

/** POST /api/conta/sair */
router.post('/sair', (req, res) => {
  sessoes.encerrarSessao(req, res);
  res.json({ success: true });
});

module.exports = router;
