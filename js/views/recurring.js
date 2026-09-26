import { UI } from '../ui.js';
import { DB } from '../db.js';

UI.registerView('recurring', {
    async render() {
        return `
            ${UI.header('Recurring', '<button class="icon-btn" id="btn-back">⬅️</button>', '<button class="icon-btn" id="btn-add-rule">➕</button>')}
            <div class="list-container">
                <div id="rules-list" class="list-view"></div>
            </div>

            <!-- Modal -->
            <div id="rule-modal" class="modal hidden">
                <div class="modal-content">
                    <h3 id="modal-title">Add Recurring Rule</h3>
                    <div class="form-group">
                        <label>Type</label>
                        <select id="rule-type" class="input-field">
                            <option value="expense">Expense</option>
                            <option value="income">Income</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Category</label>
                        <select id="rule-category" class="input-field"></select>
                    </div>
                    <div class="form-group">
                        <label>Amount</label>
                        <input type="number" id="rule-amount" class="input-field" placeholder="0.00" step="0.01">
                    </div>
                    <div class="form-group">
                        <label>Note</label>
                        <input type="text" id="rule-note" class="input-field" placeholder="e.g. Rent">
                    </div>
                    <div class="form-group">
                        <label>Frequency</label>
                        <select id="rule-freq" class="input-field">
                            <option value="monthly">Monthly</option>
                            <option value="weekly">Weekly</option>
                        </select>
                    </div>
                    <div class="form-group" id="day-specifier-group">
                        <label id="day-label">Day of Month</label>
                        <input type="number" id="rule-day" class="input-field" min="1" max="31" value="1">
                    </div>
                    
                    <div class="modal-actions">
                        <button id="btn-cancel-rule" class="text-btn">Cancel</button>
                        <button id="btn-save-rule" class="primary-btn">Save</button>
                    </div>
                </div>
            </div>
        `;
    },

    async init() {
        this.categories = await DB.getAll('categories');
        await this.loadRules();
        this.bindEvents();
    },

    async loadRules() {
        const rules = await DB.getAll('recurringRules');
        const list = document.getElementById('rules-list');
        
        if (rules.length === 0) {
            list.innerHTML = '<div class="empty-state">No recurring entries setup.</div>';
            return;
        }

        list.innerHTML = rules.map(r => {
            const cat = this.categories.find(c => c.id === r.categoryId) || { name: 'Unknown', icon: '❓', color: '#999' };
            const sign = r.type === 'income' ? '+' : '-';
            const colorClass = r.type === 'income' ? 'text-income' : 'text-expense';
            const freqText = r.frequency === 'monthly' ? `Monthly on day ${r.daySpecifier}` : `Weekly on day ${r.daySpecifier}`;
            
            return `
                <div class="list-item">
                    <div class="cat-icon-small" style="background-color: ${cat.color}">${cat.icon}</div>
                    <div class="item-details">
                        <div class="item-name">${r.note || cat.name}</div>
                        <div class="item-note">${freqText} ${!r.active ? '(Paused)' : ''}</div>
                    </div>
                    <div class="item-amount ${colorClass}">${sign}$${r.amount}</div>
                    <button class="icon-btn edit-rule" data-id="${r.id}">✏️</button>
                    <button class="icon-btn delete-rule" data-id="${r.id}">🗑️</button>
                </div>
            `;
        }).join('');

        document.querySelectorAll('.edit-rule').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                const rule = (await DB.getAll('recurringRules')).find(r => r.id === id);
                this.showModal(rule);
            });
        });

        document.querySelectorAll('.delete-rule').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                if (confirm('Delete this recurring rule? (Already generated entries will remain)')) {
                    await DB.delete('recurringRules', id);
                    this.loadRules();
                }
            });
        });
    },

    bindEvents() {
        document.getElementById('btn-back').addEventListener('click', () => {
            UI.navigate('settings'); // Usually recurring is accessed via settings
        });

        document.getElementById('btn-add-rule').addEventListener('click', () => {
            this.showModal();
        });

        document.getElementById('btn-cancel-rule').addEventListener('click', () => {
            document.getElementById('rule-modal').classList.add('hidden');
        });

        const typeSelect = document.getElementById('rule-type');
        typeSelect.addEventListener('change', () => {
            this.populateCategories(typeSelect.value);
        });

        const freqSelect = document.getElementById('rule-freq');
        freqSelect.addEventListener('change', () => {
            const label = document.getElementById('day-label');
            const input = document.getElementById('rule-day');
            if (freqSelect.value === 'monthly') {
                label.textContent = 'Day of Month (1-31)';
                input.max = 31;
            } else {
                label.textContent = 'Day of Week (0=Sun, 1=Mon...)';
                input.max = 6;
            }
        });

        document.getElementById('btn-save-rule').addEventListener('click', async () => {
            const type = document.getElementById('rule-type').value;
            const categoryId = parseInt(document.getElementById('rule-category').value);
            const amount = parseFloat(document.getElementById('rule-amount').value);
            const note = document.getElementById('rule-note').value.trim();
            const frequency = document.getElementById('rule-freq').value;
            const daySpecifier = parseInt(document.getElementById('rule-day').value);

            if (!categoryId || isNaN(amount) || amount <= 0) {
                alert('Please fill out amount and category.');
                return;
            }

            const rule = {
                type,
                categoryId,
                amount,
                note,
                frequency,
                daySpecifier,
                active: true,
                lastGenerated: null
            };

            if (this.editingId) {
                rule.id = this.editingId;
                // Preserve lastGenerated if editing
                const existing = (await DB.getAll('recurringRules')).find(r => r.id === this.editingId);
                rule.lastGenerated = existing.lastGenerated;
                await DB.put('recurringRules', rule);
            } else {
                await DB.add('recurringRules', rule);
            }

            document.getElementById('rule-modal').classList.add('hidden');
            this.loadRules();
        });
    },

    populateCategories(type) {
        const catSelect = document.getElementById('rule-category');
        const filtered = this.categories.filter(c => c.type === type);
        catSelect.innerHTML = filtered.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    },

    showModal(rule = null) {
        this.editingId = rule ? rule.id : null;
        document.getElementById('modal-title').textContent = rule ? 'Edit Rule' : 'Add Rule';
        
        const type = rule ? rule.type : 'expense';
        document.getElementById('rule-type').value = type;
        this.populateCategories(type);

        if (rule) {
            document.getElementById('rule-category').value = rule.categoryId;
            document.getElementById('rule-amount').value = rule.amount;
            document.getElementById('rule-note').value = rule.note;
            document.getElementById('rule-freq').value = rule.frequency;
            document.getElementById('rule-day').value = rule.daySpecifier;
            // Trigger change event to update label
            document.getElementById('rule-freq').dispatchEvent(new Event('change'));
        } else {
            document.getElementById('rule-amount').value = '';
            document.getElementById('rule-note').value = '';
            document.getElementById('rule-day').value = 1;
        }

        document.getElementById('rule-modal').classList.remove('hidden');
    }
});
