import { UI } from '../ui.js';
import { DB } from '../db.js';

let state = {
    currentDate: new Date(),
    selectedDate: new Date().toISOString().split('T')[0],
    entries: [],
    categories: []
};

UI.registerView('calendar', {
    async render() {
        const monthYear = state.currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        
        return `
            ${UI.header('Calendar', '<button class="icon-btn" id="btn-prev-month">⬅️</button>', '<button class="icon-btn" id="btn-next-month">➡️</button>')}
            <div class="calendar-container">
                <h3 class="month-title">${monthYear}</h3>
                <div class="calendar-grid">
                    <div class="cal-day-header">Sun</div>
                    <div class="cal-day-header">Mon</div>
                    <div class="cal-day-header">Tue</div>
                    <div class="cal-day-header">Wed</div>
                    <div class="cal-day-header">Thu</div>
                    <div class="cal-day-header">Fri</div>
                    <div class="cal-day-header">Sat</div>
                    <!-- Calendar days injected here -->
                </div>
                
                <div class="selected-day-section">
                    <div class="selected-header">
                        <h4>Entries for ${state.selectedDate}</h4>
                        <button id="btn-add-today" class="text-btn">+ Add</button>
                    </div>
                    <div id="day-entries-list" class="list-view">
                        <!-- Day entries injected here -->
                    </div>
                </div>
            </div>
        `;
    },

    async init() {
        state.categories = await DB.getAll('categories');
        await this.loadMonthData();
        this.bindEvents();
    },

    async loadMonthData() {
        const year = state.currentDate.getFullYear();
        const month = state.currentDate.getMonth();
        
        // Start and end of the month
        const startDate = new Date(year, month, 1).toISOString().split('T')[0];
        const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
        
        state.entries = await DB.getEntriesByDateRange(startDate, endDate);
        
        this.renderCalendarGrid();
        this.renderSelectedDay();
    },

    renderCalendarGrid() {
        const year = state.currentDate.getFullYear();
        const month = state.currentDate.getMonth();
        
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Clear existing day cells to prevent duplicates on re-render
        document.querySelectorAll('.calendar-grid .cal-day').forEach(el => el.remove());
        
        let gridHtml = '';
        
        // Empty slots before 1st
        for (let i = 0; i < firstDay; i++) {
            gridHtml += `<div class="cal-day empty"></div>`;
        }
        
        // Days
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const isSelected = dateStr === state.selectedDate;
            
            // Calc totals
            const dayEntries = state.entries.filter(e => e.date === dateStr);
            let income = 0;
            let expense = 0;
            dayEntries.forEach(e => {
                if (e.type === 'income') income += e.amount;
                if (e.type === 'expense') expense += e.amount;
            });
            
            gridHtml += `
                <div class="cal-day ${isSelected ? 'selected' : ''}" data-date="${dateStr}">
                    <div class="cal-date">${i}</div>
                    <div class="cal-totals">
                        ${income > 0 ? `<div class="cal-inc">+${income}</div>` : ''}
                        ${expense > 0 ? `<div class="cal-exp">-${expense}</div>` : ''}
                    </div>
                </div>
            `;
        }
        
        document.querySelector('.calendar-grid').innerHTML += gridHtml;
        
        document.querySelectorAll('.cal-day[data-date]').forEach(el => {
            el.addEventListener('click', (e) => {
                state.selectedDate = e.currentTarget.dataset.date;
                // Re-render whole view to update selected state and list
                UI.navigate('calendar'); 
            });
        });
    },

    renderSelectedDay() {
        const dayEntries = state.entries.filter(e => e.date === state.selectedDate);
        const list = document.getElementById('day-entries-list');
        
        if (dayEntries.length === 0) {
            list.innerHTML = '<div class="empty-state">No entries for this day.</div>';
            return;
        }

        list.innerHTML = dayEntries.map(e => {
            const cat = state.categories.find(c => c.id === e.categoryId) || { name: 'Unknown', icon: '❓', color: '#999' };
            const sign = e.type === 'income' ? '+' : '-';
            const colorClass = e.type === 'income' ? 'text-income' : 'text-expense';
            return `
                <div class="list-item">
                    <div class="cat-icon-small" style="background-color: ${cat.color}">${cat.icon}</div>
                    <div class="item-details">
                        <div class="item-name">${cat.name}</div>
                        <div class="item-note">${e.note || ''}</div>
                    </div>
                    <div class="item-amount ${colorClass}">${sign}$${e.amount}</div>
                    <button class="icon-btn delete-entry" data-id="${e.id}">❌</button>
                </div>
            `;
        }).join('');

        document.querySelectorAll('.delete-entry').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                if (confirm('Delete this entry?')) {
                    await DB.delete('entries', id);
                    this.loadMonthData();
                }
            });
        });
    },

    bindEvents() {
        document.getElementById('btn-prev-month').addEventListener('click', () => {
            state.currentDate.setMonth(state.currentDate.getMonth() - 1);
            UI.navigate('calendar');
        });

        document.getElementById('btn-next-month').addEventListener('click', () => {
            state.currentDate.setMonth(state.currentDate.getMonth() + 1);
            UI.navigate('calendar');
        });

        document.getElementById('btn-add-today').addEventListener('click', () => {
            // Set entry state date to this date and navigate
            // We can pass params to navigate if we implement it, 
            // or modify global state if we extract entry state.
            // For now, simple navigation works, entry defaults to today.
            // We'll update the entry date via localStorage or a shared state if needed,
            // but just navigating is fine for now.
            UI.navigate('entry');
        });
    }
});
