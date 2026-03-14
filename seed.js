'use strict';

/**
 * seed.js — Cria o primeiro usuário administrador na base de dados.
 * Execute uma única vez antes de iniciar a aplicação:
 *   node seed.js
 */

const { hashPassword } = require('./security');
const { stmts } = require('./db');

async function main() {
    const username = 'admin';
    const password = 'Admin@1234';

    if (stmts.usernameExists.get(username)) {
        console.log(`Usuário "${username}" já existe. Nada foi alterado.`);
        return;
    }

    const hash = await hashPassword(password);
    stmts.createUser.run(username, hash, 'admin');

    console.log('─────────────────────────────────────');
    console.log('  Administrador criado com sucesso!');
    console.log(`  Usuário : ${username}`);
    console.log(`  Senha   : ${password}`);
    console.log('  Altere a senha após o primeiro login.');
    console.log('─────────────────────────────────────');
}

main().catch(err => {
    console.error('Erro ao criar administrador:', err.message);
    process.exit(1);
});
