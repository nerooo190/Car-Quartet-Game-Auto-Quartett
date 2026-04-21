// Multiplayer Logic using PeerJS

const multi = {
    peer: null,
    conn: null,
    isHost: false,
    isConnected: false,

    getShortCode: function() {
        return Math.random().toString(36).substring(2, 7).toUpperCase();
    },

    setStatus: function(msg) {
        const el = document.getElementById('multi-status');
        if(el) el.innerText = msg;
    },

    hostGame: function() {
        if(this.peer) this.peer.destroy();
        
        const code = this.getShortCode();
        document.getElementById('my-lobby-code').innerText = code;
        this.setStatus("Waiting for connection...");
        
        this.peer = new Peer('autoquartett-' + code);
        this.isHost = true;

        this.peer.on('open', (id) => {
            console.log('Host Lobby open: ' + id);
        });

        this.peer.on('connection', (c) => {
            if(this.conn) { c.close(); return; } // already full
            this.conn = c;
            this.setupConnection();
        });
        
        this.peer.on('error', (err) => {
            this.setStatus("Error: " + err.message);
        });
    },

    joinGame: function() {
        const code = document.getElementById('join-lobby-code').value.toUpperCase();
        if(!code) return;
        
        this.setStatus("Connecting to " + code + "...");
        
        if(this.peer) this.peer.destroy();
        this.peer = new Peer();
        this.isHost = false;

        this.peer.on('open', (id) => {
            this.conn = this.peer.connect('autoquartett-' + code);
            this.setupConnection();
        });
        
        this.peer.on('error', (err) => {
            this.setStatus("Error: " + err.message);
        });
    },

    setupConnection: function() {
        this.conn.on('open', () => {
            this.isConnected = true;
            this.setStatus("Connected!");
            
            if(this.isHost) {
                // Host determines the deck and sends to client
                game.shuffleAndDeal();
                this.conn.send({
                    type: 'INIT_GAME',
                    hostDeck: game.playerDeck,
                    clientDeck: game.aiDeck,
                    hostTurn: true
                });
                
                // Transition to game locally
                setTimeout(() => {
                    app.navigate('game');
                    game.startMultiplayer(true);
                }, 1000);
            }
        });

        this.conn.on('data', (data) => {
            this.handleData(data);
        });

        this.conn.on('close', () => {
            this.isConnected = false;
            alert("Opponent disconnected!");
            app.navigate('home');
        });
    },

    handleData: function(data) {
        if (data.type === 'INIT_GAME') {
            // Received from host
            game.playerDeck = data.clientDeck;
            game.aiDeck = data.hostDeck;
            game.isPlayerTurn = !data.hostTurn;
            app.navigate('game');
            game.startMultiplayer(false);
        }
        else if (data.type === 'PLAY_STAT') {
            game.selectedStat = data.stat;
            game.executeTurn(true); // true = remote execution, don't echo back
        }
    },
    
    sendMove: function(statKey) {
        if(this.isConnected && this.conn) {
            this.conn.send({
                type: 'PLAY_STAT',
                stat: statKey
            });
        }
    }
};
