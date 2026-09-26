// db.js - IndexedDB Data Layer

const DB_NAME = 'moneyNoteApp';
const DB_VERSION = 3;

let dbInstance = null;

export const DB = {
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error("Database error: ", event.target.errorCode);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                dbInstance = event.target.result;
                resolve(dbInstance);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Entries (Transactions)
                if (!db.objectStoreNames.contains('entries')) {
                    const entriesStore = db.createObjectStore('entries', { keyPath: 'id', autoIncrement: true });
                    entriesStore.createIndex('date', 'date', { unique: false });
                    entriesStore.createIndex('categoryId', 'categoryId', { unique: false });
                    entriesStore.createIndex('type', 'type', { unique: false });
                }

                // Categories
                if (!db.objectStoreNames.contains('categories')) {
                    const catStore = db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
                    catStore.createIndex('type', 'type', { unique: false });
                }

                // Recurring Rules
                if (!db.objectStoreNames.contains('recurringRules')) {
                    db.createObjectStore('recurringRules', { keyPath: 'id', autoIncrement: true });
                }

                // Budgets
                if (!db.objectStoreNames.contains('budgets')) {
                    const budgetsStore = db.createObjectStore('budgets', { keyPath: 'id', autoIncrement: true });
                    budgetsStore.createIndex('categoryId', 'categoryId', { unique: true });
                }

                // Settings
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    },

    async getStore(storeName, mode = 'readonly') {
        if (!dbInstance) await this.init();
        const transaction = dbInstance.transaction(storeName, mode);
        return transaction.objectStore(storeName);
    },

    // Generic CRUD
    async add(storeName, data) {
        const store = await this.getStore(storeName, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.add(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async put(storeName, data) {
        const store = await this.getStore(storeName, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.put(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async get(storeName, key) {
        const store = await this.getStore(storeName, 'readonly');
        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async getAll(storeName) {
        const store = await this.getStore(storeName, 'readonly');
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async delete(storeName, key) {
        const store = await this.getStore(storeName, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    // Specific Queries
    async getEntriesByDateRange(startDate, endDate) {
        const store = await this.getStore('entries', 'readonly');
        const index = store.index('date');
        const range = IDBKeyRange.bound(startDate, endDate);
        return new Promise((resolve, reject) => {
            const request = index.getAll(range);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async seedDefaultCategories() {
        const existing = await this.getAll('categories');
        if (existing.length === 0) {
            const defaults = [
                { name: 'Food', type: 'expense', color: '#ff6b6b', icon: '🍔' },
                { name: 'Transport', type: 'expense', color: '#4ecdc4', icon: '🚌' },
                { name: 'Housing', type: 'expense', color: '#45b7d1', icon: '🏠' },
                { name: 'Utilities', type: 'expense', color: '#f9ca24', icon: '⚡' },
                { name: 'Shopping', type: 'expense', color: '#eb4d4b', icon: '🛍️' },
                { name: 'Health', type: 'expense', color: '#6c5ce7', icon: '💊' },
                { name: 'Entertainment', type: 'expense', color: '#fd79a8', icon: '🎬' },
                { name: 'Salary', type: 'income', color: '#6ab04c', icon: '💰' },
                { name: 'Bonus', type: 'income', color: '#badc58', icon: '🎉' }
            ];
            for (const cat of defaults) {
                await this.add('categories', cat);
            }
        }
    }
};
