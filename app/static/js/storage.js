const StorageManager = {
    DB_NAME: 'SunoSynthDB',
    DB_VERSION: 1,
    STORES: {
        CACHE: 'cache',
        USER: 'user_meta'
    },
    db: null,

    async init() {
        if (!this.getUserId()) {
            this.generateUserId();
        }
        await this.initDB();
    },

    getUserId() {
        return localStorage.getItem('ss_user_id');
    },

    getOnboardingState() {
        try {
            const raw = localStorage.getItem('ss_onboarding_state');
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    },

    setOnboardingState(state) {
        localStorage.setItem('ss_onboarding_state', JSON.stringify(state));
    },

    isOnboardingCompleted() {
        const state = this.getOnboardingState();
        return Boolean(state && state.completed);
    },

    getOnboardingFeed() {
        try {
            const raw = localStorage.getItem('ss_onboarding_feed');
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    },

    setOnboardingFeed(songs) {
        const safeSongs = Array.isArray(songs) ? songs.slice(0, 24) : [];
        localStorage.setItem('ss_onboarding_feed', JSON.stringify(safeSongs));
    },

    generateUserId() {
        const id = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        localStorage.setItem('ss_user_id', id);
        return id;
    },

    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.STORES.CACHE)) {
                    db.createObjectStore(this.STORES.CACHE);
                }
                if (!db.objectStoreNames.contains(this.STORES.USER)) {
                    db.createObjectStore(this.STORES.USER);
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error('IndexedDB error:', event.target.error);
                reject(event.target.error);
            };
        });
    },

    async set(store, key, value) {
        if (!this.db) await this.initDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([store], 'readwrite');
            const os = transaction.objectStore(store);
            const request = os.put(value, key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async get(store, key) {
        if (!this.db) await this.initDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([store], 'readonly');
            const os = transaction.objectStore(store);
            const request = os.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // Cache specific helpers
    async cacheData(key, data) {
        return this.set(this.STORES.CACHE, key, {
            data,
            timestamp: Date.now()
        });
    },

    async getCachedData(key) {
        const cached = await this.get(this.STORES.CACHE, key);
        return cached ? cached.data : null;
    }
};
