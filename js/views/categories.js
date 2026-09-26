import { UI } from '../ui.js';
import { DB } from '../db.js';

UI.registerView('categories', {
    async render() {
        return `
            ${UI.header('Categories', '<button class="icon-btn" id="btn-back">⬅️</button>', '<button class="icon-btn" id="btn-add">➕</button>')}
            <div class="categories-container">
                <div class="tabs">
                    <button class="tab-btn active" data-type="expense">Expenses</button>
                    <button class="tab-btn" data-type="income">Income</button>
                </div>
                <div id="cat-list-view" class="list-view"></div>
            </div>

            <!-- Modal for Add/Edit -->
            <div id="cat-modal" class="modal hidden">
                <div class="modal-content">
                    <h3 id="modal-title">Add Category</h3>
                    <div class="form-group">
                        <label>Name</label>
                        <input type="text" id="cat-name" class="input-field" placeholder="e.g. Groceries">
                    </div>
                    <div class="form-group">
                        <label>Icon (Emoji)</label>
                        <input type="text" id="cat-icon" class="input-field" placeholder="🍎" maxlength="2">
                    </div>
                    <div class="form-group">
                        <label>Color</label>
                        <input type="color" id="cat-color" value="#3498db" class="color-picker">
                    </div>
                    <div class="modal-actions">
                        <button id="btn-cancel" class="text-btn">Cancel</button>
                        <button id="btn-save-cat" class="primary-btn">Save</button>
                    </div>
                </div>
            </div>
        `;
    },

    async init() {
        this.currentType = 'expense';
        await this.loadList();
        this.bindEvents();
    },

    async loadList() {
        const allCats = await DB.getAll('categories');
        const filtered = allCats.filter(c => c.type === this.currentType);
        
        const list = document.getElementById('cat-list-view');
        list.innerHTML = filtered.map(c => `
            <div class="list-item">
                <div class="cat-icon-small" style="background-color: ${c.color}">${c.icon}</div>
                <span class="item-name">${c.name}</span>
                <button class="icon-btn edit-cat" data-id="${c.id}">✏️</button>
                <button class="icon-btn delete-cat" data-id="${c.id}">🗑️</button>
            </div>
        `).join('');

        // Bind list events
        document.querySelectorAll('.edit-cat').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                const cat = allCats.find(c => c.id === id);
                this.showModal(cat);
            });
        });

        document.querySelectorAll('.delete-cat').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                if (confirm('Are you sure you want to delete this category? (Existing entries will not be deleted but may show as uncategorized)')) {
                    await DB.delete('categories', id);
                    this.loadList();
                }
            });
        });
    },

    bindEvents() {
        document.getElementById('btn-back').addEventListener('click', () => {
            UI.navigate('entry');
        });

        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentType = e.target.dataset.type;
                this.loadList();
            });
        });

        // Modal triggers
        document.getElementById('btn-add').addEventListener('click', () => {
            this.showModal();
        });

        document.getElementById('btn-cancel').addEventListener('click', () => {
            document.getElementById('cat-modal').classList.add('hidden');
        });

        document.getElementById('btn-save-cat').addEventListener('click', async () => {
            const name = document.getElementById('cat-name').value.trim();
            const icon = document.getElementById('cat-icon').value.trim() || '📁';
            const color = document.getElementById('cat-color').value;

            if (!name) {
                alert('Name is required');
                return;
            }

            const cat = {
                name,
                icon,
                color,
                type: this.currentType
            };

            if (this.editingId) {
                cat.id = this.editingId;
                await DB.put('categories', cat);
            } else {
                await DB.add('categories', cat);
            }

            document.getElementById('cat-modal').classList.add('hidden');
            this.loadList();
        });
    },

    showModal(cat = null) {
        this.editingId = cat ? cat.id : null;
        document.getElementById('modal-title').textContent = cat ? 'Edit Category' : 'Add Category';
        document.getElementById('cat-name').value = cat ? cat.name : '';
        document.getElementById('cat-icon').value = cat ? cat.icon : '';
        document.getElementById('cat-color').value = cat ? cat.color : '#3498db';
        document.getElementById('cat-modal').classList.remove('hidden');
    }
});
