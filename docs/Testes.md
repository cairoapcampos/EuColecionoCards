# Roteiro de Testes — EuColecionoCards Mini App

Lista de testes manuais para validar os mecanismos de segurança implementados.

**Credenciais padrão:**
- Admin: `admin` / `Admin@1234`
- Usuário comum: cadastrar via `/cadastro` (logado como admin) com tipo "Usuário Comum"

---

## 1. Controle de Acesso (RBAC)

| # | Teste | Procedimento | Resultado esperado |
|---|---|---|---|
| 1 | Acesso não autenticado a `/administradores` | Sem fazer login, acesse `https://localhost:3443/administradores` | Redireciona para `/login` |
| 2 | Acesso não autenticado a `/usuarios` | Sem fazer login, acesse `https://localhost:3443/usuarios` | Redireciona para `/login` |
| 3 | Acesso não autenticado a `/usuario` | Sem fazer login, acesse `https://localhost:3443/usuario` | Redireciona para `/login` |
| 4 | Acesso não autenticado a `/cadastro` | Sem fazer login, acesse `https://localhost:3443/cadastro` | Redireciona para `/login` (preserva `returnTo`) |
| 5 | Usuário comum acessa `/administradores` | Faça login com usuário comum → acesse `/administradores` | Erro 403: "Acesso restrito a administradores." |
| 6 | Usuário comum acessa `/cadastro` | Faça login com usuário comum → acesse `/cadastro` | Erro 403: "Acesso restrito a administradores." |
| 7 | Usuário comum acessa `/usuarios` | Faça login com usuário comum → acesse `/usuarios` | Erro 403: "Acesso restrito a administradores." |
| 8 | Admin acessa `/usuario` | Faça login como admin → acesse `/usuario` | Erro 403: "Acesso restrito a usuários comuns." |
| 9 | Admin acessa `/usuarios` | Faça login como admin → acesse `/usuarios` | Exibe tabela com todos os usuários cadastrados |
| 10 | Redirecionamento pós-login (admin) | Faça login como admin | Redireciona para `/administradores` |
| 11 | Redirecionamento pós-login (usuário comum) | Faça login com usuário comum | Redireciona para `/usuario` |
| 12 | `returnTo` após acesso negado (`requireAuth`) | Sem login, acesse `/checkout` → faça login como usuário comum | Redireciona de volta para `/checkout` |
| 13 | `returnTo` após acesso a `/cadastro` sem login | Sem login, acesse `/cadastro` → faça login como **admin** | Redireciona de volta para `/cadastro` |
| 14 | Usuário comum tenta `returnTo` de rota admin | Sem login, acesse `/usuarios` → faça login como **usuário comum** | Exibe 403 "Acesso restrito a administradores." |
| 15 | Admin tenta `returnTo` de rota de usuário comum | Sem login, acesse `/usuario` → faça login como **admin** | Exibe 403 "Acesso restrito a usuários comuns." |
| 16 | Navbar admin não exibe "Cadastrar Usuário" | Faça login como admin | Item "Cadastrar Usuário" **não aparece** na navbar; acesso é pelo botão no Painel Admin |
| 17 | Botão Voltar em `/cadastro` | Acesse `/cadastro` como admin | Botão "Voltar" leva de volta para `/administradores` |
| 18 | Botão Voltar em `/usuarios` | Acesse `/usuarios` como admin | Botão "Voltar" leva de volta para `/administradores` |
| 19 | Acesso não autenticado a `/alterar-senha` | Sem fazer login, acesse `https://localhost:3443/alterar-senha` | Redireciona para `/login` |

---

## 2. Alterar Senha

| # | Teste | Procedimento | Resultado esperado |
|---|---|---|---|
| 20 | Alterar senha (usuário comum) | Logado como usuário comum, acesse `/alterar-senha`, preencha os campos corretamente | Mensagem "Senha alterada com sucesso!" |
| 21 | Alterar senha (admin) | Logado como admin, acesse `/alterar-senha`, preencha os campos corretamente | Mensagem "Senha alterada com sucesso!" |
| 22 | Senha atual incorreta | Informe senha atual errada | Erro: "Senha atual incorreta." |
| 23 | Nova senha curta | Informe nova senha com menos de 8 caracteres | Erro: "A nova senha deve ter no mínimo 8 caracteres." |
| 24 | Confirmação divergente | Nova senha e confirmação com valores diferentes | Erro: "A nova senha e a confirmação não coincidem." |
| 25 | CSRF no alterar senha | Faça POST em `/alterar-senha` sem `_csrf` ou com token adulterado | Erro 403 |
| 26 | Botão Voltar em `/alterar-senha` (usuário comum) | Acesse `/alterar-senha` como usuário comum | Botão "Voltar" leva para `/usuario` |
| 27 | Botão Voltar em `/alterar-senha` (admin) | Acesse `/alterar-senha` como admin | Botão "Voltar" leva para `/administradores` |

---

## 3. Gerenciamento de Usuários

| # | Teste | Procedimento | Resultado esperado |
|---|---|---|---|
| 28 | Listar usuários | Logado como admin, acesse `/usuarios` | Exibe tabela com id, nome, papel, data de cadastro de todos os usuários |
| 29 | Botão excluir ausente para `admin` padrão e para si mesmo | Verifique as linhas protegidas na tabela | Coluna "Ações" exibe "—" |
| 30 | Excluir usuário comum | Clique em "Excluir" em um usuário comum → confirme o diálogo | Usuário removido; página recarrega em `/usuarios` |
| 31 | Excluir admin criado posteriormente | Clique em "Excluir" em outro admin → confirme o diálogo | Admin removido; página recarrega em `/usuarios` |
| 32 | Exclusão não deleta o `admin` padrão via POST direto | Via curl, faça `POST /usuarios/<id_admin>/deletar` com CSRF válido | Usuário `admin` não é removido (proteção na query) |
| 33 | Auto-exclusão bloqueada | Via curl, faça `POST /usuarios/<seu_id>/deletar` com CSRF válido | Erro 400: "Você não pode excluir a si mesmo." |
| 34 | CSRF na exclusão | Faça POST em `/usuarios/:id/deletar` sem `_csrf` ou com token adulterado | Erro 403 |

---

## 4. Sessão

| # | Teste | Procedimento | Resultado esperado |
|---|---|---|---|
| 35 | Regeneração de ID de sessão | DevTools → Application → Cookies: anote o valor de `sid` antes do login → faça login | O valor do cookie muda após o login |
| 36 | Encerramento de sessão | Clique em "Sair" → tente acessar `/administradores` ou `/usuarios` | Redireciona para `/login` |
| 37 | Expiração por inatividade | Faça login → aguarde 30 minutos sem interagir → tente navegar | Redireciona para `/login` |
| 38 | Cookie `HttpOnly` | DevTools → Application → Cookies → inspecione o cookie `sid` | Flag `HttpOnly` marcada; `document.cookie` não exibe o cookie |
| 39 | Cookie `Secure` | Inspecione o cookie `sid` no DevTools | Flag `Secure` marcada |
| 40 | Cookie `SameSite` | Inspecione o cookie `sid` no DevTools | Valor `Strict` |

---

## 5. CSRF

| # | Teste | Procedimento | Resultado esperado |
|---|---|---|---|
| 41 | Token ausente no login | Via curl ou DevTools, faça POST em `/login` sem o campo `_csrf` | Erro 403: "Requisição inválida" |
| 42 | Token inválido no logout | Faça POST em `/logout` com `_csrf` adulterado | Erro 403 |
| 43 | Token inválido no cadastro | Faça POST em `/cadastro` com `_csrf` errado | Erro 403 |
| 44 | Token inválido no contato | Faça POST em `/contato` com `_csrf` errado | Erro 403 |

> **Dica:** No DevTools → Console, execute `fetch('/logout', { method: 'POST', body: new URLSearchParams({ _csrf: 'invalido' }) })` e observe o status 403 na aba Network.

---

## 6. Injeção (SQL Injection / XSS)

| # | Teste | Procedimento | Resultado esperado |
|---|---|---|---|
| 45 | SQL Injection no login | No campo usuário, insira `' OR '1'='1` | Login negado normalmente |
| 46 | SQL Injection com comentário | No campo usuário, insira `admin'--` | Login negado normalmente |
| 47 | XSS no campo usuário | No cadastro, insira `<script>alert(1)</script>` como nome de usuário | Script não é executado (sanitização) |
| 48 | Entrada muito longa | Cole 1000+ caracteres no campo usuário | Campo truncado/rejeitado pelo `sanitize()` |

---

## 7. Hash de Senha

| # | Teste | Procedimento | Resultado esperado |
|---|---|---|---|
| 49 | Senha não armazenada em texto plano | No terminal: `sqlite3 db.sqlite "SELECT username, password_hash FROM users;"` | Exibe hash Argon2id (`$argon2id$...`), nunca a senha em claro |
| 50 | Timing attack (usuário inexistente) | Meça o tempo de resposta com usuário existente (senha errada) vs inexistente | Tempos similares (hash fictício executado para usuário inexistente) |

---

## 8. Rate Limiting

| # | Teste | Procedimento | Resultado esperado |
|---|---|---|---|
| 51 | Brute-force no login | Tente 21+ logins com senha errada em menos de 15 minutos | Bloqueado com status 429 (Too Many Requests) |

> **Dica:** Script de teste rápido no terminal:
> ```bash
> for i in $(seq 1 22); do
>   curl -sk -o /dev/null -w "%{http_code}\n" \
>     -X POST https://localhost:3443/login \
>     -d "username=admin&password=errada&_csrf=x"
> done
> ```

---

## 9. Cabeçalhos de Segurança (Helmet)

| # | Teste | Procedimento | Resultado esperado |
|---|---|---|---|
| 52 | Cabeçalhos HTTP | DevTools → Network → clique em qualquer resposta → aba Headers (Response Headers) | Presença de `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options` |
| 53 | CSP bloqueia script inline | No Console do DevTools, tente `eval("alert(1)")` | Bloqueado pela CSP (erro no console) |

---

## 10. HTTPS / TLS

| # | Teste | Procedimento | Resultado esperado |
|---|---|---|---|
| 54 | Acesso via HTTP puro | Tente acessar `http://localhost:3443` | Conexão recusada (o servidor só aceita HTTPS) |
| 55 | Certificado TLS | Clique no cadeado na barra de endereço | Exibe informações do certificado auto-assinado |
