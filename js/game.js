// Game Logic: AI, turns, comparative stats

const game = {
    playerDeck: [],
    aiDeck: [],
    isPlayerTurn: true,
    selectedStat: null,
    inRound: false,

    start: function() {
        // Shuffle and deal cards
        let deck = [...cardsData];
        // Basic shuffle
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        const half = Math.ceil(deck.length / 2);    
        this.playerDeck = deck.slice(0, half);
        this.aiDeck = deck.slice(half);

        this.isPlayerTurn = true;
        this.updateScores();
        this.nextRound();
    },

    updateScores: function() {
        document.getElementById('player-score').innerText = this.playerDeck.length;
        document.getElementById('ai-score').innerText = this.aiDeck.length;
        
        // Check win condition
        if(this.playerDeck.length === 0) {
            alert('You lost the game!');
            app.navigate('home');
            return true; // Game over
        }
        if(this.aiDeck.length === 0) {
            alert('You won the game!');
            app.navigate('home');
            return true; // Game over
        }
        return false;
    },

    nextRound: function() {
        if(this.updateScores()) return;

        this.inRound = false;
        this.selectedStat = null;
        
        const playerCard = this.playerDeck[0];
        
        // Render Player Card
        document.getElementById('player-slot').innerHTML = UI.renderCard(playerCard);
        // Render AI Back Card
        document.getElementById('ai-slot').innerHTML = UI.renderCardBack();

        UI.renderStatsButtons(playerCard);

        const playBtn = document.getElementById('play-btn');
        const dict = langDict[app.currentLanguage] || langDict['en'];
        playBtn.innerText = dict['action_play'] || "Play";
        playBtn.classList.remove('ready');

        const turnIndicator = document.getElementById('turn-indicator');
        
        if (this.isPlayerTurn) {
            turnIndicator.textContent = dict['your_turn'];
            turnIndicator.style.color = "var(--neon-blue)";
            // Enable all stat buttons
            document.querySelectorAll('.stat-btn').forEach(b => {
                b.classList.remove('faded', 'active');
            });
        } else {
            turnIndicator.textContent = dict['ai_turn'];
            turnIndicator.style.color = "var(--gold)";
            // Disable buttons for player
            document.querySelectorAll('.stat-btn').forEach(b => {
                b.classList.add('faded');
                b.classList.remove('active');
            });

            // AI Logic - delay for effect, then auto-select
            setTimeout(() => {
                this.aiPlay();
            }, 1500);
        }
    },

    selectStat: function(statKey) {
        if (!this.isPlayerTurn || this.inRound) return; // Not player's turn

        document.querySelectorAll('.stat-btn').forEach(b => {
            b.classList.remove('active');
            if(b.dataset.statKey !== statKey) {
                b.classList.add('faded');
            } else {
                b.classList.add('active');
                b.classList.remove('faded');
            }
        });

        this.selectedStat = statKey;
        const playBtn = document.getElementById('play-btn');
        playBtn.classList.add('ready');
    },

    aiPlay: function() {
        const aiDifficulty = document.getElementById('ai-difficulty').value;
        const cardClass = this.aiDeck[0].stats;
        const keys = Object.keys(cardClass);
        
        // Very basic difficulty logic
        let chosenKey = keys[0];
        
        if (aiDifficulty === 'easy') {
            // Random
            chosenKey = keys[Math.floor(Math.random() * keys.length)];
        } else {
            // Normal/Hard - try to pick a generally good stat or one where higherIsBetter vs bad
            // Simplified: Just picks highest relative normalized stat (not implemented normalized logic here, pseudo logic instead)
            let bestRawValue = -99999;
            keys.forEach(k => {
                let v = cardClass[k].raw !== undefined ? cardClass[k].raw : cardClass[k].value;
                if(!cardClass[k].higherIsBetter) {
                    v = 1000 / (v || 1); // inverse logic for acceleration / baujahr
                }
                if (v > bestRawValue) {
                    bestRawValue = v;
                    chosenKey = k;
                }
            });
        }

        this.selectedStat = chosenKey;
        
        // Highlight chosen stat on the UI even if faded
        document.querySelectorAll('.stat-btn').forEach(b => {
            if(b.dataset.statKey === chosenKey) {
                 b.classList.add('active');
            }
        });

        setTimeout(() => {
            this.executeTurn();
        }, 1000);
    },

    playAction: function() {
        if(this.inRound) {
            // Waiting for next round manually triggered or returning home
            this.nextRound();
        } else {
            if(!this.selectedStat) {
                // Must select stat first
                return;
            }
            this.executeTurn();
        }
    },

    executeTurn: function() {
        this.inRound = true;
        
        const playerCardData = this.playerDeck[0];
        const aiCardData = this.aiDeck[0];

        // Reveal AI Card
        document.getElementById('ai-slot').innerHTML = UI.renderCard(aiCardData);

        const pStat = playerCardData.stats[this.selectedStat];
        const aStat = aiCardData.stats[this.selectedStat];

        let pVal = pStat.raw !== undefined ? pStat.raw : pStat.value;
        let aVal = aStat.raw !== undefined ? aStat.raw : aStat.value;
        
        let playerWins = false;

        if (pVal === aVal) {
            // Tie - typical house rule is current turn holder wins or goes to middle.
            // Simplified: turn holder wins on tie to break deadlocks
            playerWins = this.isPlayerTurn;
        } else if (pStat.higherIsBetter) {
            playerWins = pVal > aVal;
        } else {
            playerWins = pVal < aVal;
        }

        const playBtn = document.getElementById('play-btn');
        let dict = langDict[app.currentLanguage] || langDict['en'];

        if (playerWins) {
            this.isPlayerTurn = true; // Winner keeps turn
            // Winner takes loser's card + put their own back
            this.playerDeck.push(this.aiDeck.shift());
            this.playerDeck.push(this.playerDeck.shift());
            playBtn.innerText = "You Win! " + dict['action_play'] + " next";
            playBtn.style.background = "#28a745";
        } else {
            this.isPlayerTurn = false;
            // AI takes player's card + put their own back
            this.aiDeck.push(this.playerDeck.shift());
            this.aiDeck.push(this.aiDeck.shift());
            playBtn.innerText = "AI Wins Round. Next...";
            playBtn.style.background = "#dc3545";
        }

        // Apply a visual cue
        document.querySelectorAll(`.c-stat-row[data-stat="${this.selectedStat}"]`).forEach(row => {
            row.classList.add('highlight');
        });

        // The playAction button logic handle will route back to nextRound()
        playBtn.classList.remove('ready');
    }
};
