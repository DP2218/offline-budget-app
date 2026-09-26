import { UI } from '../ui.js';
import { DB } from '../db.js';

let state = {
    type: 'expense',
    amount: '0',
    categoryId: null,
    date: new Date().toISOString().split('T')[0],
    note: ''
};

let categories = [];

UI.registerView('entry', {
    async render() {
        return `
            ${UI.header('New Entry')}
            <div class="entry-container">
                <div class="type-toggle">
                    <button class="toggle-btn ${state.type === 'expense' ? 'active' : ''}" data-type="expense">Expense</button>
                    <button class="toggle-btn ${state.type === 'income' ? 'active' : ''}" data-type="income">Income</button>
                </div>
                
                <div class="amount-display ${state.type}">
                    <span class="currency">$</span>
                    <span id="amount-val">${state.amount}</span>
                </div>
                
                <div class="details-row">
                    <input type="date" id="entry-date" class="input-field" value="${state.date}">
                    <input type="text" id="entry-note" class="input-field" placeholder="Note (optional)" value="${state.note}">
                </div>

                <div class="categories-wrapper">
                    <div class="categories-grid" id="category-list">
                        <!-- Categories injected here -->
                    </div>
                </div>

                <div class="numpad">
                    <button class="num-key" data-val="7">7</button>
                    <button class="num-key" data-val="8">8</button>
                    <button class="num-key" data-val="9">9</button>
                    <button class="num-key" data-val="4">4</button>
                    <button class="num-key" data-val="5">5</button>
                    <button class="num-key" data-val="6">6</button>
                    <button class="num-key" data-val="1">1</button>
                    <button class="num-key" data-val="2">2</button>
                    <button class="num-key" data-val="3">3</button>
                    <button class="num-key" data-val=".">.</button>
                    <button class="num-key" data-val="0">0</button>
                    <button class="action-btn" id="btn-backspace">⌫</button>
                </div>
                <button id="btn-save" class="save-btn" disabled>Save</button>
            </div>
        `;
    },

    async init() {
        await this.loadCategories();
        this.bindEvents();
        this.updateSaveButton();
    },

    async loadCategories() {
        const allCats = await DB.getAll('categories');
        categories = allCats.filter(c => c.type === state.type);
        
        const list = document.getElementById('category-list');
        list.innerHTML = categories.map(c => `
            <div class="category-item ${state.categoryId === c.id ? 'selected' : ''}" data-id="${c.id}">
                <div class="cat-icon" style="background-color: ${c.color}">${c.icon}</div>
                <div class="cat-name">${c.name}</div>
            </div>
        `).join('');

        // Add "Add New" button
        list.innerHTML += `
            <div class="category-item" id="btn-add-category">
                <div class="cat-icon" style="background-color: #ccc">⚙️</div>
                <div class="cat-name">Manage</div>
            </div>
        `;

        document.querySelectorAll('.category-item[data-id]').forEach(el => {
            el.addEventListener('click', () => {
                state.categoryId = parseInt(el.dataset.id);
                this.loadCategories(); // Re-render to show selection
                this.updateSaveButton();
            });
        });

        document.getElementById('btn-add-category').addEventListener('click', () => {
            UI.navigate('categories');
        });
    },

    bindEvents() {
        // Toggle Expense/Income
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                state.type = e.target.dataset.type;
                state.categoryId = null; // Reset category selection
                UI.navigate('entry'); // Re-render whole view
            });
        });

        // Numpad
        const updateAmount = (val) => {
            if (state.amount === '0' && val !== '.') {
                state.amount = val;
            } else if (val === '.' && state.amount.includes('.')) {
                return; // Prevent multiple decimals
            } else {
                // Limit decimals to 2 places
                if (state.amount.includes('.')) {
                    const parts = state.amount.split('.');
                    if (parts[1].length >= 2) return;
                }
                // Limit total digits
                if (state.amount.length > 10) return;
                state.amount += val;
            }
            document.getElementById('amount-val').textContent = state.amount;
            this.updateSaveButton();
        };

        document.querySelectorAll('.num-key').forEach(btn => {
            btn.addEventListener('click', (e) => updateAmount(e.target.dataset.val));
        });

        document.getElementById('btn-backspace').addEventListener('click', () => {
            if (state.amount.length > 1) {
                state.amount = state.amount.slice(0, -1);
            } else {
                state.amount = '0';
            }
            document.getElementById('amount-val').textContent = state.amount;
            this.updateSaveButton();
        });

        // Save
        document.getElementById('btn-save').addEventListener('click', async () => {
            const amount = parseFloat(state.amount);
            if (amount <= 0 || !state.categoryId) return;

            const entry = {
                type: state.type,
                amount: amount,
                categoryId: state.categoryId,
                note: document.getElementById('entry-note').value,
                date: document.getElementById('entry-date').value,
                createdAt: new Date().toISOString()
            };

            await DB.add('entries', entry);
            
            // Reset and show success
            state.amount = '0';
            state.note = '';
            state.categoryId = null;
            UI.navigate('entry');
            
            // Optional: Show toast notification
            alert('Entry saved!');
        });
    },

    updateSaveButton() {
        const amount = parseFloat(state.amount);
        const btn = document.getElementById('btn-save');
        if (amount > 0 && state.categoryId) {
            btn.removeAttribute('disabled');
        } else {
            btn.setAttribute('disabled', 'true');
        }
    }
});
