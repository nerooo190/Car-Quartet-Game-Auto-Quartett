// Game Logic: AI, turns, comparative stats, multiplayer hooks

const game = {
    playerDeck: [],
    aiDeck: [],
    middlePot: [],
    isPlayerTurn: true,
    selectedStat: null,
    inRound: false,
    isMultiplayer: false,

    shuffleAndDeal: function() {
        let deck = [...cardsData];
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        const half = Math.ceil(deck.length / 2);    
        this.playerDeck = deck.slice(0, half);
        this.aiDeck = deck.slice(half);
    },

    start: function() {
        this.isMultiplayer = false;
        this.shuffleAndDeal();
        this.isPlayerTurn = true;
        this.updateScores();
        this.nextRound();
    },

    startMultiplayer: function(isHost) {
        this.isMultiplayer = true;
        // isPlayerTurn already set by HandleData
        this.updateScores();
        this.nextRound();
    },

    updateScores: function() {
        document.getElementById('player-score').innerText = this.playerDeck.length;
        document.getElementById('ai-score').innerText = this.aiDeck.length;
        
        if(this.playerDeck.length === 0) {
            alert('You lost the game!');
            app.navigate('home');
            this.handleEndGame(false);
            return true;
        }
        if(this.aiDeck.length === 0) {
            alert('You won the game!');
            app.navigate('home');
            this.handleEndGame(true);
            return true;
        }
        return false;
    },

    handleEndGame: function(won) {
        if(!won) return;
        // Reward winner with coins and save
        storage.saveData.coins += 500;
        storage.saveProgress();
        storage.updateUI();
    },

    nextRound: function() {
        if(this.updateScores()) return;

        this.inRound = false;
        this.selectedStat = null;
        
        const playerCard = this.playerDeck[0];
        
        document.getElementById('player-slot').innerHTML = UI.renderCard(playerCard);
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
            document.querySelectorAll('.stat-btn').forEach(b => {
                b.classList.remove('faded', 'active');
            });
        } else {
            document.querySelectorAll('.stat-btn').forEach(b => {
                b.classList.add('faded');
                b.classList.remove('active');
            });

            if (this.isMultiplayer) {
                turnIndicator.textContent = "Waiting for Opponent...";
                turnIndicator.style.color = "var(--gold)";
            } else {
                turnIndicator.textContent = dict['ai_turn'];
                turnIndicator.style.color = "var(--gold)";
                setTimeout(() => { this.aiPlay(); }, 1500);
            }
        }
    },

    selectStat: function(statKey) {
        if (!this.isPlayerTurn || this.inRound) return;

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
        if(this.inRound) return;
        const aiDifficulty = document.getElementById('ai-difficulty').value;
        const cardClass = this.aiDeck[0].stats;
        const keys = Object.keys(cardClass);
        
        let chosenKey = keys[0];
        if (aiDifficulty === 'easy') {
            chosenKey = keys[Math.floor(Math.random() * keys.length)];
        } else {
            let bestRawValue = -99999;
            keys.forEach(k => {
                let v = cardClass[k].raw !== undefined ? cardClass[k].raw : cardClass[k].value;
                if(!cardClass[k].higherIsBetter) v = 1000 / (v || 1);
                if (v > bestRawValue) {
                    bestRawValue = v;
                    chosenKey = k;
                }
            });
        }

        this.selectedStat = chosenKey;
        
        document.querySelectorAll('.stat-btn').forEach(b => {
            if(b.dataset.statKey === chosenKey) b.classList.add('active');
        });

        setTimeout(() => { this.executeTurn(); }, 1000);
    },

    playAction: function() {
        if(this.inRound) {
            this.nextRound();
        } else {
            if(!this.selectedStat) return;
            if(this.isMultiplayer && this.isPlayerTurn) {
                multi.sendMove(this.selectedStat);
            }
            this.executeTurn();
        }
    },

    executeTurn: function(isRemote = false) {
        if(this.inRound) return;
        this.inRound = true;
        
        const playerCardData = this.playerDeck[0];
        const aiCardData = this.aiDeck[0];

        // Reveal Opponent Card
        document.getElementById('ai-slot').innerHTML = UI.renderCard(aiCardData);

        const pStat = playerCardData.stats[this.selectedStat];
        const aStat = aiCardData.stats[this.selectedStat];

        let pVal = pStat.raw !== undefined ? pStat.raw : pStat.value;
        let aVal = aStat.raw !== undefined ? aStat.raw : aStat.value;
        
        let playerWins = null; // null = tie

        if (pVal === aVal) {
            if (storage.saveData.rules.draw_to_middle) {
                playerWins = null;
            } else {
                playerWins = this.isPlayerTurn; // house rule: turn holder wins ties
            }
        } else if (pStat.higherIsBetter) {
            playerWins = pVal > aVal;
        } else {
            playerWins = pVal < aVal;
        }

        const playBtn = document.getElementById('play-btn');
        let dict = langDict[app.currentLanguage] || langDict['en'];

        if (playerWins === null) {
            // Draw
            this.middlePot.push(this.playerDeck.shift());
            this.middlePot.push(this.aiDeck.shift());
            playBtn.innerText = "It's a Draw! Cards to Middle Pot.";
            playBtn.style.background = "#6c757d";
            // Next turn holder? Standard rule: turn holder keeps turn on draw
        } else if (playerWins) {
            this.playerDeck.push(this.aiDeck.shift());
            this.playerDeck.push(this.playerDeck.shift());
            // Take middle pot
            while(this.middlePot.length > 0) {
                this.playerDeck.push(this.middlePot.pop());
            }

            playBtn.innerText = "You Win! " + dict['action_play'] + " next";
            playBtn.style.background = "#28a745";
            
            this.isPlayerTurn = (storage.saveData.rules.winner_keeps_turn !== false);
        } else {
            this.aiDeck.push(this.playerDeck.shift());
            this.aiDeck.push(this.aiDeck.shift());
            // AI takes middle pot
            while(this.middlePot.length > 0) {
                this.aiDeck.push(this.middlePot.pop());
            }

            playBtn.innerText = (this.isMultiplayer ? "Opponent" : "AI") + " Wins Round. Next...";
            playBtn.style.background = "#dc3545";

            this.isPlayerTurn = (storage.saveData.rules.winner_keeps_turn === false);
        }

        if(isRemote && this.isMultiplayer) {
            document.querySelectorAll('.stat-btn').forEach(b => {
                if(b.dataset.statKey === this.selectedStat) {
                    b.classList.remove('faded');
                    b.classList.add('active');
                }
            });
        }

        document.querySelectorAll(`.c-stat-row[data-stat="${this.selectedStat}"]`).forEach(row => {
            row.classList.add('highlight');
        });

        playBtn.classList.remove('ready');
    }
};
