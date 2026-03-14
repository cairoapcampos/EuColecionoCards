'use strict';

/**
 * security.js — PONTO ÚNICO DE SEGURANÇA DA APLICAÇÃO
 *
 * Responsabilidades centralizadas aqui:
 *  1. Configuração da sessão (HttpOnly, Secure, SameSite, expiração por inatividade)
 *  2. Tokens CSRF — geração e validação com comparação segura (timingSafeEqual)
 *  3. Sanitização de entradas do usuário
 *  4. Hash e verificação de senha (Argon2id)
 *  5. Regeneração de ID de sessão após login (previne session fixation)
 *  6. Middlewares de controle de acesso baseado em papel (RBAC)
 *  7. Tratamento centralizado de erros (sem mensagens técnicas ao usuário)
 */

const argon2 = require('argon2');
const crypto = require('crypto');

// ─── 1. Configuração de sessão ────────────────────────────────────────────────
// SESSION_SECRET deve ser definido via variável de ambiente em produção.
const sessionConfig = {
    secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
    name: 'sid',               // não usar o nome padrão "connect.sid"
    resave: false,
    saveUninitialized: false,
    rolling: true,             // reinicia o contador de inatividade a cada requisição
    cookie: {
        httpOnly: true,          // inacessível via JavaScript no navegador (previne XSS)
        secure: true,            // transmitido apenas por HTTPS
        sameSite: 'strict',      // bloqueia envio em requisições cross-site (defesa CSRF)
        maxAge: 30 * 60 * 1000,  // expira após 30 min de inatividade
    },
};

// ─── 2. Tokens CSRF ───────────────────────────────────────────────────────────
function generateCsrfToken(req) {
    if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }
    return req.session.csrfToken;
}

function csrfMiddleware(req, res, next) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

    const submitted = req.body._csrf;
    const expected = req.session.csrfToken;

    if (!submitted || !expected) {
        return res.status(403).render('error', { message: 'Requisição inválida.' });
    }

    // Comparação em tempo constante para evitar timing attacks
    try {
        const a = Buffer.from(submitted);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
            return res.status(403).render('error', { message: 'Requisição inválida.' });
        }
    } catch {
        return res.status(403).render('error', { message: 'Requisição inválida.' });
    }

    next();
}

// ─── 3. Sanitização de entradas ───────────────────────────────────────────────
// Previne injeção ao remover espaços extras e limitar tamanho.
// As consultas ao banco usam parâmetros vinculados (parameterized queries),
// que são a principal defesa contra SQL Injection.
function sanitize(value, maxLength = 200) {
    if (typeof value !== 'string') return '';
    return value.trim().slice(0, maxLength);
}

// ─── 4. Hash e verificação de senha (Argon2id) ────────────────────────────────
const ARGON2_OPTIONS = {
    type: argon2.argon2id, // resistente a ataques de GPU e side-channel
    memoryCost: 65536,     // 64 MiB
    timeCost: 3,
    parallelism: 1,
};

async function hashPassword(plain) {
    return argon2.hash(plain, ARGON2_OPTIONS);
}

async function verifyPassword(hash, plain) {
    return argon2.verify(hash, plain);
}

// Hash fictício pré-gerado para mitigação de timing attack:
// Mesmo quando o usuário não existe, a verificação de senha é executada,
// tornando o tempo de resposta uniforme independente da existência do usuário.
const _dummyHashPromise = argon2.hash('__dummy__timing__mitigation__', ARGON2_OPTIONS);

async function verifyDummy(plain) {
    try {
        const hash = await _dummyHashPromise;
        await argon2.verify(hash, plain);
    } catch { /* sempre retorna false */ }
    return false;
}

// ─── 5. Regeneração de sessão após login ─────────────────────────────────────
// Previne session fixation: o ID de sessão anterior é descartado
// e um novo é gerado antes de associar os dados do usuário autenticado.
function regenerateSession(req, data) {
    return new Promise((resolve, reject) => {
        const returnTo = req.session.returnTo;
        req.session.regenerate((err) => {
            if (err) return reject(err);
            Object.assign(req.session, data);
            if (returnTo) req.session.returnTo = returnTo;
            // Gera novo token CSRF para a sessão recém-criada
            req.session.csrfToken = crypto.randomBytes(32).toString('hex');
            resolve();
        });
    });
}

// ─── 6. Middlewares de controle de acesso (RBAC) ─────────────────────────────
// Nega acesso por padrão: redireciona não autenticados para /login
// e retorna 403 para papéis insuficientes.

function requireAuth(req, res, next) {
    if (!req.session.userId) {
        req.session.returnTo = req.originalUrl;
        return res.redirect('/login');
    }
    next();
}

function requireAdmin(req, res, next) {
    if (!req.session.userId) {
        req.session.returnTo = req.originalUrl;
        return res.redirect('/login');
    }
    if (req.session.role !== 'admin') {
        return res.status(403).render('error', { message: 'Acesso restrito a administradores.' });
    }
    next();
}

function requireUser(req, res, next) {
    if (!req.session.userId) {
        req.session.returnTo = req.originalUrl;
        return res.redirect('/login');
    }
    if (req.session.role !== 'user') {
        return res.status(403).render('error', { message: 'Acesso restrito a usuários comuns.' });
    }
    next();
}

// ─── 7. Tratamento centralizado de erros ─────────────────────────────────────
// Erros técnicos são registrados internamente (console.error),
// mas apenas mensagens genéricas são exibidas ao usuário.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
    console.error('[ERRO INTERNO]', err.message || err);
    if (res.headersSent) return;
    res.status(500).render('error', { message: 'Erro interno. Tente novamente mais tarde.' });
}

module.exports = {
    sessionConfig,
    generateCsrfToken,
    csrfMiddleware,
    sanitize,
    hashPassword,
    verifyPassword,
    verifyDummy,
    regenerateSession,
    requireAuth,
    requireAdmin,
    requireUser,
    errorHandler,
};
