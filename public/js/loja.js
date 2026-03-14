'use strict';

(function () {
    // Carrinho: { id: { qtd, preco } }
    function getCarrinho() {
        try { return JSON.parse(localStorage.getItem('carrinho') || '{}'); } catch { return {}; }
    }
    function setCarrinho(c) { localStorage.setItem('carrinho', JSON.stringify(c)); }

    function getFavoritos() {
        try { return JSON.parse(localStorage.getItem('favoritos') || '[]'); } catch { return []; }
    }
    function setFavoritos(f) { localStorage.setItem('favoritos', JSON.stringify(f)); }

    function atualizarBadge() {
        const badge = document.getElementById('cart-count');
        if (!badge) return;

        const c = getCarrinho();
        let totalItens = 0, totalValor = 0;
        Object.values(c).forEach(function (item) {
            const qtd = parseInt(item.qtd) || 0;
            totalItens += qtd;
            totalValor += (parseFloat(item.preco) || 0) * qtd;
        });

        if (totalItens === 0) { badge.style.display = 'none'; return; }
        const label = totalItens === 1 ? 'item' : 'itens';
        badge.textContent = totalItens + ' ' + label + ' - R$ ' + totalValor.toFixed(2);
        badge.style.display = '';
    }

    function atualizarCards() {
        const c = getCarrinho();
        const favs = getFavoritos();

        document.querySelectorAll('[data-card-id]').forEach(function (card) {
            const id = card.dataset.cardId;
            const display = card.querySelector('.quantidade-display');
            if (display) display.textContent = (c[id] && c[id].qtd) || 0;
            const heart = card.querySelector('.heart-overlay');
            if (heart) heart.style.display = favs.includes(id) ? 'block' : 'none';
        });

        atualizarBadge();
    }

    document.addEventListener('DOMContentLoaded', function () {
        atualizarCards();

        // Botão "Ver Cartas" com loading overlay
        const verCartasBtn = document.getElementById('ver-cartas-btn');
        const overlay = document.getElementById('loading-overlay');
        const loadingText = document.getElementById('loading-text');
        if (verCartasBtn && overlay && loadingText) {
            verCartasBtn.addEventListener('click', function (e) {
                e.preventDefault();
                overlay.style.display = 'flex';
                let dots = '';
                const dotInterval = setInterval(function () {
                    dots = dots.length < 3 ? dots + '.' : '';
                    loadingText.textContent = 'Carregando' + dots;
                }, 500);
                setTimeout(function () {
                    clearInterval(dotInterval);
                    overlay.style.display = 'none';
                    window.location.href = '/cartas';
                }, 3700);
            });
        }

        document.addEventListener('click', function (e) {
            // Botões +/-
            if (e.target.classList.contains('btn-quantidade')) {
                const op = e.target.dataset.op;
                const card = e.target.closest('[data-card-id]');
                if (!card || !op) return;
                const id = card.dataset.cardId;
                const preco = parseFloat(card.dataset.preco) || 0;
                const c = getCarrinho();
                let qtd = (c[id] && c[id].qtd) || 0;
                if (op === 'add') qtd++;
                else if (op === 'sub' && qtd > 0) qtd--;
                if (qtd > 0) c[id] = { qtd: qtd, preco: preco };
                else delete c[id];
                setCarrinho(c);
                atualizarCards();
            }

            // Clique na imagem → favoritar
            if (e.target.classList.contains('card-img-top')) {
                const card = e.target.closest('[data-card-id]');
                const heart = card && card.querySelector('.heart-overlay');
                if (!heart) return;
                const id = card.dataset.cardId;
                const favs = getFavoritos();
                if (favs.includes(id)) {
                    setFavoritos(favs.filter(function (f) { return f !== id; }));
                    heart.style.display = 'none';
                } else {
                    favs.push(id);
                    setFavoritos(favs);
                    heart.style.display = 'block';
                }
            }
        });
    });
})();
