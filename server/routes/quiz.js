const express = require('express');
const rateLimit = require('express-rate-limit');
const quizRespostas = require('../quizRespostas');

const router = express.Router();

// Mesma cautela do checkout/conta: sem limite, alguém poderia inundar a
// lista de respostas com lixo. 30 por IP a cada 15 min é folgado pra uso
// normal (uma pessoa não refaz o quiz 30x) e trava um script.
const limitadorResponder = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });

const QUANTIDADE_PERGUNTAS = 6;

/**
 * POST /api/quiz/responder
 * Body: { respostas: number[] } — um valor por pergunta, na ordem em que
 * foram feitas. Recalcula a soma/nível aqui (não confia no que o front
 * mandar pronto) e devolve o diagnóstico junto, pra a tela de resultado
 * usar exatamente o que foi persistido.
 */
router.post('/responder', limitadorResponder, (req, res) => {
  const { respostas } = req.body || {};

  if (!Array.isArray(respostas) || respostas.length !== QUANTIDADE_PERGUNTAS || !respostas.every((v) => Number.isInteger(v) && v >= 0)) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Respostas inválidas.' } });
  }

  const soma = respostas.reduce((a, b) => a + b, 0);
  const nivel = soma <= 4 ? 'leve' : soma <= 9 ? 'moderado' : 'grave';

  const id = quizRespostas.registrar({ respostas, soma, nivel });
  res.status(201).json({ success: true, id, soma, nivel });
});

/**
 * GET /api/quiz/listar
 * Sem autenticação de propósito: não guardamos nome/e-mail/telefone aqui
 * (o quiz não captura lead), só o padrão de respostas — não é dado pessoal.
 * Ainda assim, é uma rota "de bastidor" (nenhum link do site aponta pra
 * ela) até o projeto ter um painel de admin de verdade.
 */
router.get('/listar', (req, res) => {
  res.json({ success: true, respostas: quizRespostas.listar() });
});

module.exports = router;
