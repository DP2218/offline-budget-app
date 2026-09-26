import { UI } from '../ui.js';
import { DB } from '../db.js';

UI.registerView('budgets', {
    async render() {
        return `
            ${UI.header('Budgets', '<button class="icon-btn" id="btn-back">⬅️</button>', '')}
            <div class="list-container">
                <div class="form-group" style="padding: 0 15px;">
                    <label>Set Overall Monthly Budget</label>
                    <div style="display:flex; gap:10px;">
                        <input type="number" id="overall-budget" class="input-field" placeholder="No limit">
                        <button id="btn-save-overall" class="primary-btn">Save</button>
                    </div>
                </div>
                
                <h4 style="padding: 15px; border-bottom: 1px solid var(--border-color);">Category Budgets</h4>
                <div id="budget-list" class="list-view"></div>
            </div>

            <!-- Modal -->
            <div id="budget-modal" class="modal hidden">
                <div class="modal-content">
                    <h3 id="modal-title">Set Category Budget</h3>
                    <div class="form-group">
                        <label>Category</label>
                        <select id="budget-category" class="input-field"></select>
                    </div>
                    <div class="form-group">
                        <label>Monthly Limit</label>
                        <input type="number" id="budget-limit" class="input-field" placeholder="0">
                    </div>
                    <div class="modal-actions">
                        <button id="btn-cancel-budget" class="text-btn">Cancel</button>
                        <button id="btn-save-budget" class="primary-btn">Save</button>
                    </div>
                </div>
            </div>
        `;
    },

    async init() {
        this.categories = (await DB.getAll('categories')).filter(c => c.type === 'expense');
        this.budgets = await DB.getAll('budgets');
        
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        this.currentEntries = (await DB.getEntriesByDateRange(start, end)).filter(e => e.type === 'expense');

        this.renderList();
        this.bindEvents();
    },

    renderList() {
        const overall = this.budgets.find(b => b.categoryId === 'overall');
        if (overall) {
            document.getElementById('overall-budget').value = overall.monthlyLimit;
        }

        const list = document.getElementById('budget-list');
        
        let html = `
            <div style="padding: 15px; text-align: center;">
                <button id="btn-add-budget" class="text-btn">+ Add Category Budget</button>
            </div>
        `;

        if (overall) {
            const totalSpent = this.currentEntries.reduce((sum, e) => sum + e.amount, 0);
            const percent = Math.min(100, (totalSpent / overall.monthlyLimit) * 100);
            const isOver = totalSpent > overall.monthlyLimit;
            html += this.createBudgetCard('Overall', totalSpent, overall.monthlyLimit, percent, isOver, 'overall', '🌍', '#999');
        }

        const catBudgets = this.budgets.filter(b => b.categoryId !== 'overall');
        
        catBudgets.forEach(b => {
            const cat = this.categories.find(c => c.id === b.categoryId);
            if (!cat) return;

            const spent = this.currentEntries.filter(e => e.categoryId === b.categoryId).reduce((sum, e) => sum + e.amount, 0);
            const percent = Math.min(100, (spent / b.monthlyLimit) * 100);
            const isOver = spent > b.monthlyLimit;

            html += this.createBudgetCard(cat.name, spent, b.monthlyLimit, percent, isOver, b.id, cat.icon, cat.color);
        });

        list.innerHTML = html;

        document.getElementById('btn-add-budget').addEventListener('click', () => {
            this.showModal();
        });

        document.querySelectorAll('.edit-budget').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                if (id === 'overall') return; // Handled at top
                const budget = this.budgets.find(b => b.id === parseInt(id));
                this.showModal(budget);
            });
        });
    },

    createBudgetCard(name, spent, limit, percent, isOver, id, icon, color) {
        const barColor = isOver ? 'var(--danger-color)' : (percent > 80 ? 'orange' : 'var(--secondary-color)');
        return `
            <div class="budget-card">
                <div class="budget-header">
                    <div class="budget-title">
                        <div class="cat-icon-small" style="background-color: ${color}; width:24px; height:24px; font-size:12px;">${icon}</div>
                        <span>${name}</span>
                    </div>
                    ${id !== 'overall' ? `<button class="icon-btn edit-budget" data-id="${id}" style="font-size:14px;">✏️</button>` : ''}
                </div>
                <div class="budget-stats">
                    <span class="${isOver ? 'text-expense' : ''}">$${spent.toFixed(2)}</span>
                    <span class="text-muted">/ $${limit.toFixed(2)}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percent}%; background-color: ${barColor};"></div>
                </div>
            </div>
        `;
    },

    bindEvents() {
        document.getElementById('btn-back').addEventListener('click', () => {
            UI.navigate('settings');
        });

        document.getElementById('btn-save-overall').addEventListener('click', async () => {
            const val = parseFloat(document.getElementById('overall-budget').value);
            if (isNaN(val) || val <= 0) {
                // Delete if empty
                const existing = this.budgets.find(b => b.categoryId === 'overall');
                if (existing) await DB.delete('budgets', existing.id);
            } else {
                const existing = this.budgets.find(b => b.categoryId === 'overall');
                const b = { categoryId: 'overall', monthlyLimit: val };
                if (existing) b.id = existing.id;
                await DB.put('budgets', b);
            }
            alert('Saved');
            this.init(); // Reload
        });

        document.getElementById('btn-cancel-budget').addEventListener('click', () => {
            document.getElementById('budget-modal').classList.add('hidden');
        });

        document.getElementById('btn-save-budget').addEventListener('click', async () => {
            const categoryId = parseInt(document.getElementById('budget-category').value);
            const limit = parseFloat(document.getElementById('budget-limit').value);

            if (!categoryId || isNaN(limit) || limit <= 0) return;

            const existing = this.budgets.find(b => b.categoryId === categoryId);
            const budget = { categoryId, monthlyLimit: limit };
            if (this.editingId) {
                budget.id = this.editingId;
            } else if (existing) {
                budget.id = existing.id; // Override if already exists
            }

            await DB.put('budgets', budget);
            document.getElementById('budget-modal').classList.add('hidden');
            this.init();
        });
    },

    showModal(budget = null) {
        this.editingId = budget ? budget.id : null;
        document.getElementById('modal-title').textContent = budget ? 'Edit Budget' : 'Add Budget';
        
        const catSelect = document.getElementById('budget-category');
        catSelect.innerHTML = this.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

        if (budget) {
            catSelect.value = budget.categoryId;
            document.getElementById('budget-limit').value = budget.monthlyLimit;
        } else {
            document.getElementById('budget-limit').value = '';
        }

        document.getElementById('budget-modal').classList.remove('hidden');
    }
});
