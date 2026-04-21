const storage = {
    API_URL: 'http://localhost:8080/api',
    token: localStorage.getItem('auth_token'),
    saveData: { level: 1, coins: 0, unlocked: ["A", "B", "c", "D", "E", "F", "G", "H"], rules: { winner_keeps_turn: true, draw_to_middle: false }, username: "Guest" },

    init: async function() {
        if (this.token) {
            await this.loadProgress();
            document.getElementById('auth-overlay').classList.add('hidden');
        } else {
            document.getElementById('auth-overlay').classList.remove('hidden');
        }
        this.updateUI();
    },

    updateUI: function() {
        const unEl = document.querySelector('.username');
        if(unEl) unEl.innerText = this.saveData.username;
        const lvlEl = document.getElementById('label-level');
        if(lvlEl && lvlEl.nextSibling) lvlEl.nextSibling.nodeValue = ` ${this.saveData.level} | ${this.saveData.coins} `;
        const unlEl = document.getElementById('unlocked-count');
        if(unlEl) unlEl.innerText = this.saveData.unlocked.length;
        
        // Sync rules with UI if elements exist
        const ruleToggle = document.getElementById('rule-winner-turn');
        if(ruleToggle) ruleToggle.checked = this.saveData.rules.winner_keeps_turn !== false;
    },

    register: async function(user, pwd) {
        try {
            let res = await fetch(`${this.API_URL}/register`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username: user, password: pwd})
            });
            let data = await res.json();
            if(data.success) {
                this.token = data.token;
                localStorage.setItem('auth_token', this.token);
                await this.init();
            } else alert(data.error);
        } catch (e) { alert("Server connection failed"); }
    },

    login: async function(user, pwd) {
        try {
            let res = await fetch(`${this.API_URL}/login`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username: user, password: pwd})
            });
            let data = await res.json();
            if(data.success) {
                this.token = data.token;
                localStorage.setItem('auth_token', this.token);
                await this.init();
            } else alert(data.error);
        } catch (e) { alert("Server connection failed"); }
    },

    loadProgress: async function() {
        if(!this.token) return;
        try {
            let res = await fetch(`${this.API_URL}/load`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if(res.ok) {
                let data = await res.json();
                this.saveData = data;
                // apply defaults if missing
                if(!this.saveData.rules) this.saveData.rules = { winner_keeps_turn: true };
            } else if(res.status === 401) {
                this.logout();
            }
        } catch(e) { console.warn("Could not load save"); }
    },

    saveProgress: async function() {
        if(!this.token) return;
        try {
            await fetch(`${this.API_URL}/save`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(this.saveData)
            });
        } catch(e) { console.warn("Could not sync save"); }
    },

    updateRule: function(key, val) {
        this.saveData.rules[key] = val;
        this.saveProgress();
    },
    
    logout: function() {
        localStorage.removeItem('auth_token');
        this.token = null;
        this.saveData = { level: 1, coins: 0, unlocked: [], rules: {}, username: "Guest" };
        this.updateUI();
        document.getElementById('auth-overlay').classList.remove('hidden');
    }
};
