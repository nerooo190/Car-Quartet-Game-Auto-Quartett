// UI Renderer logic to generate cards and DOM elements

const UI = {
    renderCard: function(cardData) {
        if(!cardData) return '';
        
        let superTrumpfBadge = cardData.superTrumpf ? `<div class="super-trumpf-badge">SUPER-TRUMPF</div>` : '';
        
        let statsHtml = Object.keys(cardData.stats).map(key => {
            const stat = cardData.stats[key];
            return `
            <div class="c-stat-row" data-stat="${key}">
                <span>${stat.label}</span>
                <span class="c-stat-val">${stat.value} ${stat.unit}</span>
            </div>`;
        }).join('');

        return `
        <div class="quartett-card">
            ${superTrumpfBadge}
            <div class="card-header">
                <span>${cardData.category}</span>
                <span>${cardData.country}</span>
            </div>
            <div class="card-img" style="background-image: url('${cardData.image}');"></div>
            <div class="card-name">${cardData.name}</div>
            <div class="card-stats">
                ${statsHtml}
            </div>
        </div>
        `;
    },

    renderCardBack: function() {
        return `
        <div class="card-back-bg">
            <i class="fa-solid fa-car"></i>
        </div>
        `;
    },

    renderStatsButtons: function(cardData) {
        const container = document.getElementById("stats-buttons");
        container.innerHTML = '';
        
        Object.keys(cardData.stats).forEach(key => {
            const stat = cardData.stats[key];
            const btn = document.createElement('div');
            btn.className = 'stat-btn';
            btn.dataset.statKey = key;
            btn.innerHTML = `
                <span>${stat.label}</span>
                <span class="stat-val">${stat.value} ${stat.unit}</span>
            `;
            btn.onclick = () => game.selectStat(key);
            container.appendChild(btn);
        });
    },

    populateGarage: function() {
        const container = document.getElementById("garage-collection");
        container.innerHTML = '';

        cardsData.forEach(card => {
            const wrap = document.createElement('div');
            wrap.className = `g-card-wrap ${card.rarity}`;
            wrap.innerHTML = this.renderCard(card);
            
            // Add click listener to center card and show info
            wrap.onclick = () => {
                document.querySelectorAll('.g-card-wrap').forEach(el => el.classList.remove('active'));
                wrap.classList.add('active');
                wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            };
            
            container.appendChild(wrap);
        });
        
        // Highlight first one
        if(container.firstChild) {
            container.firstChild.classList.add('active');
        }
    }
};
