'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const {
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
} = require('./security');

const cartas = require('./data/cartas');

const { stmts } = require('./db');

const app = express();

// ── Cabeçalhos de segurança (Helmet) ─────────────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", 'https://cdn.jsdelivr.net'],
            scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
            fontSrc: ["'self'", 'https://cdn.jsdelivr.net'],
            imgSrc: ["'self'", 'data:'],
        },
    },
}));

app.use(express.urlencoded({ extended: false }));
app.use(session(sessionConfig));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Rate-limit aplicado na rota de login (proteção contra brute-force)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
});

// ── Rotas ─────────────────────────────────────────────────────────────────────

// GET / → página inicial (pública)
app.get('/', (req, res) => {
    const destaque = [...cartas].sort((a, b) => b.preco - a.preco).slice(0, 9);
    res.render('home', {
        csrf: generateCsrfToken(req),
        username: req.session.username || null,
        role: req.session.role || null,
        cartas: destaque,
    });
});

app.get('/home', (req, res) => res.redirect('/'));

// GET /login
app.get('/login', (req, res) => {
    if (req.session.userId) {
        return res.redirect(req.session.role === 'admin' ? '/administradores' : '/usuario');
    }
    res.render('login', { csrf: generateCsrfToken(req), erro: null, username: null, role: null });
});

// POST /login
app.post('/login', loginLimiter, csrfMiddleware, async (req, res) => {
    try {
        const username = sanitize(req.body.username);
        const password = sanitize(req.body.password, 128);

        const user = stmts.findByUsername.get(username);

        if (!user) {
            // Executa hash fictício para que o tempo de resposta seja uniforme
            // mesmo quando o usuário não existe (mitiga timing attacks)
            await verifyDummy(password);
            return res.render('login', { csrf: generateCsrfToken(req), erro: 'Usuário ou senha inválidos.', username: null, role: null });
        }

        const valid = await verifyPassword(user.password_hash, password);
        if (!valid) {
            return res.render('login', { csrf: generateCsrfToken(req), erro: 'Usuário ou senha inválidos.', username: null, role: null });
        }

        // Regenera o ID de sessão antes de persistir dados do usuário
        await regenerateSession(req, { userId: user.id, username: user.username, role: user.role });

        // Bloqueia usuário comum tentando acessar rota de admin, e vice-versa
        // Usa correspondência exata ou prefixo com "/" para evitar que "/usuarios"
        // seja confundido com "/usuario" no startsWith.
        const rotasAdmin = ['/usuarios', '/administradores', '/cadastro'];
        const rotasUser = ['/usuario'];
        const matchRota = (lista, url) => lista.some(r => url === r || url.startsWith(r + '/'));
        const returnTo = req.session.returnTo;
        if (returnTo && user.role === 'user' && matchRota(rotasAdmin, returnTo)) {
            delete req.session.returnTo;
            return res.status(403).render('error', { message: 'Acesso restrito a administradores.' });
        }
        if (returnTo && user.role === 'admin' && matchRota(rotasUser, returnTo)) {
            delete req.session.returnTo;
            return res.status(403).render('error', { message: 'Acesso restrito a usuários comuns.' });
        }

        const destino = returnTo || (user.role === 'admin' ? '/administradores' : '/usuario');
        delete req.session.returnTo;
        return res.redirect(destino);
    } catch {
        return res.render('login', { csrf: generateCsrfToken(req), erro: 'Erro ao processar o login.', username: null, role: null });
    }
});

// GET /cadastro — apenas administradores
app.get('/cadastro', requireAdmin, (req, res) => {
    res.render('cadastro', {
        csrf: generateCsrfToken(req),
        username: req.session.username,
        role: req.session.role,
        erro: null,
        sucesso: null,
    });
});

// POST /cadastro — apenas administradores
app.post('/cadastro', requireAdmin, csrfMiddleware, async (req, res) => {
    const render = (erro, sucesso) =>
        res.render('cadastro', { csrf: generateCsrfToken(req), username: req.session.username, role: req.session.role, erro, sucesso });

    try {
        const username = sanitize(req.body.username);
        const password = sanitize(req.body.password, 128);
        const role = req.body.role === 'admin' ? 'admin' : 'user';

        if (!username || !password) return render('Preencha todos os campos.', null);
        if (stmts.usernameExists.get(username)) return render('Nome de usuário já está em uso.', null);

        const hash = await hashPassword(password);
        stmts.createUser.run(username, hash, role);

        return render(null, `Usuário "${username}" cadastrado com sucesso!`);
    } catch {
        return render('Erro ao cadastrar usuário.', null);
    }
});

// GET /administradores — apenas administradores
app.get('/administradores', requireAdmin, (req, res) => {
    res.render('administradores', {
        csrf: generateCsrfToken(req),
        username: req.session.username,
        role: req.session.role,
    });
});

// GET /usuario — apenas usuários comuns
app.get('/usuario', requireUser, (req, res) => {
    res.render('usuario', {
        csrf: generateCsrfToken(req),
        username: req.session.username,
        role: req.session.role,
    });
});

// GET /alterar-senha — qualquer usuário autenticado
app.get('/alterar-senha', requireAuth, (req, res) => {
    res.render('alterar-senha', {
        csrf: generateCsrfToken(req),
        username: req.session.username,
        role: req.session.role,
        erro: null,
        sucesso: null,
    });
});

// POST /alterar-senha — qualquer usuário autenticado
app.post('/alterar-senha', requireAuth, csrfMiddleware, async (req, res) => {
    const render = (erro, sucesso) =>
        res.render('alterar-senha', { csrf: generateCsrfToken(req), username: req.session.username, role: req.session.role, erro, sucesso });

    try {
        const senhaAtual = sanitize(req.body.senha_atual, 128);
        const novaSenha = sanitize(req.body.nova_senha, 128);
        const confirmacao = sanitize(req.body.confirmacao, 128);

        if (!senhaAtual || !novaSenha || !confirmacao)
            return render('Preencha todos os campos.', null);
        if (novaSenha !== confirmacao)
            return render('A nova senha e a confirmação não coincidem.', null);
        if (novaSenha.length < 8)
            return render('A nova senha deve ter no mínimo 8 caracteres.', null);

        const user = stmts.findByUsername.get(req.session.username);
        const valid = await verifyPassword(user.password_hash, senhaAtual);
        if (!valid) return render('Senha atual incorreta.', null);

        const hash = await hashPassword(novaSenha);
        stmts.updatePassword.run(hash, req.session.userId);

        return render(null, 'Senha alterada com sucesso!');
    } catch {
        return render('Erro ao alterar senha.', null);
    }
});

// GET /usuarios — apenas administradores: lista todos os usuários
app.get('/usuarios', requireAdmin, (req, res) => {
    const users = stmts.listUsers.all();
    res.render('usuarios', {
        csrf: generateCsrfToken(req),
        username: req.session.username,
        role: req.session.role,
        users,
    });
});

// POST /usuários/:id/deletar — apenas administradores
// Regras: não é possível excluir o admin padrão nem a si mesmo
app.post('/usuarios/:id/deletar', requireAdmin, csrfMiddleware, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).render('error', { message: 'Requisição inválida.' });
    }
    if (id === req.session.userId) {
        return res.status(400).render('error', { message: 'Você não pode excluir a si mesmo.' });
    }
    // A query já impede excluir o usuário 'admin' pelo username
    stmts.deleteUser.run(id);
    return res.redirect('/usuarios');
});

// GET /checkout — requer login
app.get('/checkout', requireAuth, (req, res) => {
    res.render('checkout', {
        csrf: generateCsrfToken(req),
        username: req.session.username,
        role: req.session.role,
    });
});

// GET /carrinho (pública)
app.get('/carrinho', (req, res) => {
    res.render('carrinho', {
        csrf: generateCsrfToken(req),
        username: req.session.username || null,
        role: req.session.role || null,
        cartasB64: Buffer.from(JSON.stringify(cartas)).toString('base64'),
    });
});

// GET /cartas (pública)
app.get('/cartas', (req, res) => {
    res.render('cartas', {
        csrf: generateCsrfToken(req),
        username: req.session.username || null,
        role: req.session.role || null,
        cartas,
    });
});

// GET /sobre (pública)
app.get('/sobre', (req, res) => {
    res.render('sobre', {
        csrf: generateCsrfToken(req),
        username: req.session.username || null,
        role: req.session.role || null,
    });
});

// GET /contato (pública)
app.get('/contato', (req, res) => {
    res.render('contato', {
        csrf: generateCsrfToken(req),
        username: req.session.username || null,
        role: req.session.role || null,
        erro: null,
        sucesso: null,
    });
});

// POST /contato (pública)
app.post('/contato', csrfMiddleware, (req, res) => {
    const nome = sanitize(req.body.nome);
    const emailVal = sanitize(req.body.email);
    const mensagem = sanitize(req.body.mensagem, 1000);

    const renderForm = (erro, sucesso) => res.render('contato', {
        csrf: generateCsrfToken(req),
        username: req.session.username || null,
        role: req.session.role || null,
        erro,
        sucesso,
        nome: erro ? nome : '',
        emailVal: erro ? emailVal : '',
        mensagem: erro ? mensagem : '',
    });

    if (!nome || !emailVal || !mensagem) {
        return renderForm('Preencha todos os campos.', null);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
        return renderForm('Informe um e-mail válido.', null);
    }

    return renderForm(null, 'Mensagem enviada com sucesso! Entraremos em contato em breve.');
});

// POST /logout — protegido por CSRF para evitar logout forçado por terceiros
app.post('/logout', csrfMiddleware, (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('sid');
        res.redirect('/login');
    });
});

// 404
app.use((req, res) => res.status(404).render('error', { message: 'Página não encontrada.' }));

// Tratamento centralizado de erros (definido em security.js)
app.use(errorHandler);

// ── Servidor HTTPS ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 443;
const certDir = path.join(__dirname, 'certs');

let tlsOptions;
try {
    tlsOptions = {
        key: fs.readFileSync(path.join(certDir, 'key.pem')),
        cert: fs.readFileSync(path.join(certDir, 'cert.pem')),
    };
} catch {
    console.error('Certificado TLS não encontrado. Execute primeiro: npm run gencert');
    process.exit(1);
}

https.createServer(tlsOptions, app).listen(PORT, () => {
    const portStr = PORT === 443 ? '' : `:${PORT}`;
    console.log(`Servidor HTTPS em https://localhost${portStr}`);
    console.log('Para parar: Ctrl+C');
});
