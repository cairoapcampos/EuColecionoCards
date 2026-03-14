# EuColecionoCards

Mini aplicação Web com autenticação, controle de acesso por papel (RBAC) e todos os mecanismos de segurança centralizados.

![EuColecionoCards](docs/imgSite.png)

## Estrutura

```
EuColecionoCards/
├── server.js              ← Servidor HTTPS + todas as rotas
├── security.js            ← Ponto único de segurança (sessão, CSRF, Argon2, RBAC, erros)
├── db.js                  ← SQLite com consultas parametrizadas
├── data/cartas.js         ← Catálogo de cartas Yu-Gi-Oh (24 cards)
├── seed.js                ← Cria o primeiro administrador
├── generate-cert.js       ← Gera certificado TLS auto-assinado
├── package.json
├── certs/                 ← Gerado por npm run gencert (key.pem + cert.pem)
├── docs/
│   ├── imgSite.png        ← Screenshot da aplicação
│   └── Testes.md          ← Roteiro de testes manuais
├── public/
│   ├── css/style.css
│   ├── js/loja.js         ← Carrinho e favoritos (localStorage, vanilla JS)
│   ├── js/carrinho.js     ← Lógica da página do carrinho
│   └── img/              ← logo.png + imagens das cartas (.webp)
└── views/
    ├── partials/navbar.ejs
    ├── login.ejs          ← /login
    ├── home.ejs           ← /         (cartas em destaque)
    ├── cartas.ejs         ← /cartas   (catálogo completo)
    ├── carrinho.ejs       ← /carrinho (resumo do pedido)
    ├── checkout.ejs       ← /checkout (finalização — requer login)
    ├── sobre.ejs          ← /sobre
    ├── contato.ejs        ← /contato
    ├── cadastro.ejs       ← /cadastro          (somente admin)
    ├── administradores.ejs← /administradores   (somente admin)
    ├── usuarios.ejs       ← /usuarios          (somente admin — gerencia usuários)
    ├── usuario.ejs        ← /usuario           (somente usuário comum — minha área)
    ├── alterar-senha.ejs  ← /alterar-senha     (qualquer usuário autenticado)
    └── error.ejs
```

## Páginas e controle de acesso

| URL | Quem pode acessar |
|---|---|
| `/login` | Qualquer pessoa (não autenticada) |
| `/` | Público |
| `/cartas` | Público |
| `/carrinho` | Público |
| `/sobre` | Público |
| `/contato` | Público |
| `/checkout` | Qualquer usuário autenticado (admin ou comum) |
| `/administradores` | Somente administradores autenticados |
| `/cadastro` | Somente administradores autenticados |
| `/usuarios` | Somente administradores autenticados (listagem e exclusão de usuários) |
| `/usuario` | Somente usuários comuns autenticados (minha área) |
| `/alterar-senha` | Qualquer usuário autenticado (admin ou comum) |

Ao clicar em "Finalizar Compra" no carrinho, o usuário é redirecionado para `/checkout`. Se não estiver autenticado, é enviado para `/login` e após o login retorna automaticamente para `/checkout`.

> O roteiro completo de testes manuais está em [`docs/TESTES.md`](docs/TESTES.md).

## Tecnologias utilizadas

### Back-end
| Tecnologia | Uso |
|---|---|
| [Node.js](https://nodejs.org/) | Runtime JavaScript (v18+) |
| [Express](https://expressjs.com/) | Framework HTTP |
| [EJS](https://ejs.co/) | Templates HTML server-side |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | Banco de dados SQLite (WAL mode) |
| [express-session](https://github.com/expressjs/session) | Gerenciamento de sessões |
| [argon2](https://github.com/ranisalt/node-argon2) | Hash de senha com Argon2id |
| [helmet](https://helmetjs.github.io/) | Cabeçalhos de segurança HTTP (CSP, HSTS, etc.) |
| [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) | Rate limiting no endpoint de login |
| [nodemon](https://nodemon.io/) | Hot-reload em desenvolvimento |

### Front-end
| Tecnologia | Uso |
|---|---|
| [Bootstrap 5.3.2](https://getbootstrap.com/) | Framework CSS/componentes UI |
| [Bootstrap Icons 1.11.3](https://icons.getbootstrap.com/) | Ícones SVG |
| Vanilla JavaScript | Lógica do carrinho e favoritos (sem frameworks) |
| localStorage | Persistência do carrinho e favoritos no browser |

### Infraestrutura / Segurança
| Tecnologia | Uso |
|---|---|
| HTTPS / TLS | Comunicação criptografada (certificado auto-assinado) |
| `crypto` (Node.js nativo) | Tokens CSRF com comparação em tempo constante |
| SQLite | Banco de dados embutido, sem servidor separado |

---

## Mecanismos de segurança (centralizados em `security.js`)

- **Hash de senha** com Argon2id (64 MiB, 3 iterações)
- **Proteção contra timing attack** no login (hash fictício quando o usuário não existe)
- **Tokens CSRF** em todos os formulários, validados com `crypto.timingSafeEqual`
- **Regeneração de ID de sessão** após login (previne session fixation)
- **Expiração de sessão** por inatividade (30 minutos)
- **Cookie de sessão** com `HttpOnly`, `Secure` e `SameSite=strict`
- **Consultas parametrizadas** no SQLite (previne SQL Injection)
- **Sanitização de entradas** (trim, limite de tamanho)
- **Cabeçalhos de segurança** via Helmet (CSP, HSTS, etc.)
- **Rate limiting** no endpoint de login (20 tentativas / 15 min)
- **HTTPS** com certificado TLS (auto-assinado para localhost)
- **Tratamento centralizado de erros** sem expor detalhes técnicos ao usuário

## Pré-requisitos

- Node.js 18 ou superior
- npm

## Como rodar

### 1. Instalar dependências

```bash
cd EuColecionoCards
npm install
```

### 2. Gerar o certificado TLS (apenas na primeira vez)

```bash
npm run gencert
```

Cria `certs/key.pem` e `certs/cert.pem` para uso local com HTTPS.

### 3. Criar o primeiro administrador (apenas na primeira vez)

```bash
npm run seed
```

Cria o usuário `admin` com a senha `Admin@1234` no banco de dados.
> Altere a senha após o primeiro login acessando `/alterar-senha`.

### 4. Iniciar o servidor

A porta padrão é **443** (HTTPS). Como essa porta exige privilégios de root no Linux, use a variável `PORT` para escolher outra:

```bash
# Desenvolvimento (porta sem privilégio de root)
PORT=3443 npm run dev

# Produção
PORT=3443 npm start
```

Acesse: **https://localhost:3443/login**

> O navegador exibirá um aviso de certificado não confiável (por ser auto-assinado).
> Clique em "Avançado" → "Prosseguir assim mesmo" para continuar.

## Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run gencert` | Gera o certificado TLS auto-assinado |
| `npm run seed` | Cria o usuário `admin` inicial |
| `npm start` | Inicia o servidor |
| `npm run dev` | Inicia o servidor com hot-reload (nodemon) |
