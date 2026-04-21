// Main App Logic: Navigation, State, Language

const app = {
    currentLanguage: 'en',
    animEnabled: true,
    
    init: function() {
        this.applyLanguage();
        UI.populateGarage();
        
        // Initial setup for sliders to change visually
        document.querySelectorAll('input[type="range"]').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const val = e.target.value;
                e.target.style.background = `linear-gradient(to right, var(--neon-blue) ${val}%, #333 ${val}%)`;
            });
            // Trigger initial styling
            slider.dispatchEvent(new Event('input'));
        });

        // Set Unlocked count
        document.getElementById('unlocked-count').textContent = cardsData.length;
    },

    navigate: function(screenId) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

        // Show target screen
        document.getElementById(`screen-${screenId}`).classList.remove('hidden');
        
        // Update nav bar active state
        if (screenId !== 'game') {
            document.getElementById('status-bar').classList.remove('hidden');
            document.getElementById('bottom-nav').classList.remove('hidden');
            
            // Re-highlight nav tab
            const navMap = {
                'home': 0, 'garage': 1, 'leaderboard': 2
            };
            if(navMap[screenId] !== undefined) {
                document.querySelectorAll('.nav-item')[navMap[screenId]].classList.add('active');
            }
        } else {
            // In Game
            document.getElementById('status-bar').classList.add('hidden');
            document.getElementById('bottom-nav').classList.add('hidden');
            game.start();
        }
    },

    openSettings: function() {
        document.getElementById('settings-overlay').classList.remove('hidden');
    },

    closeSettings: function() {
        document.getElementById('settings-overlay').classList.add('hidden');
    },

    setLanguage: function(langCode) {
        this.currentLanguage = langCode;
        
        // Update UI highlights
        document.querySelectorAll('.lang-option').forEach(el => {
            el.classList.remove('active');
            if(el.dataset.langCode === langCode) el.classList.add('active');
        });

        this.applyLanguage();
    },

    applyLanguage: function() {
        const dict = langDict[this.currentLanguage] || langDict['en'];
        
        // Update all elements with data-lang attribute
        document.querySelectorAll('[data-lang]').forEach(el => {
            const key = el.dataset.lang;
            if(dict[key]) {
                if(el.tagName === 'INPUT' && el.type === 'button') {
                    el.value = dict[key];
                } else {
                    el.textContent = dict[key];
                }
            }
        });
        
        // Specific fallbacks
        if(game.isPlayerTurn) {
            document.getElementById('turn-indicator').textContent = dict['your_turn'];
        } else {
            document.getElementById('turn-indicator').textContent = dict['ai_turn'];
        }
    }
};

window.onload = () => {
    app.init();
};
