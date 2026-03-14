'use strict';

(function () {
    var CATALOGO = [];
    try {
        var el = document.getElementById('cartas-data');
        if (el) {
            var binary = atob(el.dataset.cartas);
            var bytes = new Uint8Array(binary.length);
            for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            CATALOGO = JSON.parse(new TextDecoder('utf-8').decode(bytes));
        }
    } catch (e) { }

    function getCarrinho() {
        try { return JSON.parse(localStorage.getItem('carrinho') || '{}'); } catch { return {}; }
    }
    function setCarrinho(c) { localStorage.setItem('carrinho', JSON.stringify(c)); }

    function encontrarCarta(id) {
        return CATALOGO.find(function (c) { return c.id === id; }) || null;
    }

    function formatarPreco(v) {
        return 'R$ ' + v.toFixed(2).replace('.', ',');
    }

    function renderizarCarrinho() {
        var c = getCarrinho();
        var ids = Object.keys(c);

        var vazio = document.getElementById('carrinho-vazio');
        var conteudo = document.getElementById('carrinho-conteudo');
        var tbody = document.getElementById('carrinho-rows');
        var totalEl = document.getElementById('total-valor');

        if (ids.length === 0) {
            vazio.style.display = '';
            conteudo.style.display = 'none';
            return;
        }

        vazio.style.display = 'none';
        conteudo.style.display = '';

        var total = 0;
        tbody.innerHTML = '';

        ids.forEach(function (id) {
            var item = c[id];
            var qtd = parseInt(item.qtd) || 0;
            var preco = parseFloat(item.preco) || 0;
            var subtotal = qtd * preco;
            total += subtotal;

            var carta = encontrarCarta(id);
            var nome = carta ? carta.nome : id;
            var imagem = carta ? carta.imagem : '/img/logo.png';

            var tr = document.createElement('tr');
            tr.innerHTML =
                '<td><img src="' + imagem + '" alt="' + nome + '" class="rounded carrinho-thumb"></td>' +
                '<td class="fw-semibold">' + nome + '</td>' +
                '<td class="text-center text-muted">' + formatarPreco(preco) + '</td>' +
                '<td class="text-center">' +
                '<div class="input-group input-group-sm justify-content-center" style="width:110px;margin:0 auto">' +
                '<button class="btn btn-outline-secondary btn-qtd" data-id="' + id + '" data-op="sub">\u2212</button>' +
                '<span class="input-group-text bg-white border-start-0 border-end-0 px-3">' + qtd + '</span>' +
                '<button class="btn btn-outline-secondary btn-qtd" data-id="' + id + '" data-op="add">+</button>' +
                '</div>' +
                '</td>' +
                '<td class="text-end fw-semibold">' + formatarPreco(subtotal) + '</td>' +
                '<td class="text-end">' +
                '<button class="btn btn-sm btn-link text-danger p-0 btn-remover" data-id="' + id + '" title="Remover">' +
                '<i class="bi bi-x-lg"></i>' +
                '</button>' +
                '</td>';
            tbody.appendChild(tr);
        });

        totalEl.textContent = formatarPreco(total);
    }

    function atualizarBadgeNavbar() {
        var badge = document.getElementById('cart-count');
        if (!badge) return;
        var c = getCarrinho();
        var totalItens = 0;
        var totalValor = 0;
        Object.values(c).forEach(function (item) {
            var qtd = parseInt(item.qtd) || 0;
            totalItens += qtd;
            totalValor += (parseFloat(item.preco) || 0) * qtd;
        });
        if (totalItens === 0) { badge.style.display = 'none'; return; }
        var label = totalItens === 1 ? 'item' : 'itens';
        badge.textContent = totalItens + ' ' + label + ' - R$ ' + totalValor.toFixed(2).replace('.', ',');
        badge.style.display = '';
    }

    document.addEventListener('DOMContentLoaded', function () {
        renderizarCarrinho();

        document.getElementById('carrinho-rows').addEventListener('click', function (e) {
            var btnQtd = e.target.closest('.btn-qtd');
            if (btnQtd) {
                var id = btnQtd.dataset.id;
                var op = btnQtd.dataset.op;
                var c = getCarrinho();
                if (!c[id]) return;
                if (op === 'add') c[id].qtd++;
                else if (op === 'sub') {
                    c[id].qtd--;
                    if (c[id].qtd <= 0) delete c[id];
                }
                setCarrinho(c);
                renderizarCarrinho();
                atualizarBadgeNavbar();
                return;
            }

            var btnRem = e.target.closest('.btn-remover');
            if (btnRem) {
                var id2 = btnRem.dataset.id;
                var c2 = getCarrinho();
                delete c2[id2];
                setCarrinho(c2);
                renderizarCarrinho();
                atualizarBadgeNavbar();
            }
        });

        document.getElementById('btn-limpar').addEventListener('click', function () {
            localStorage.removeItem('carrinho');
            renderizarCarrinho();
            atualizarBadgeNavbar();
        });

        document.getElementById('btn-finalizar').addEventListener('click', function () {
            window.location.href = '/checkout';
        });
    });
})();
