import { UI } from '../ui.js';
import { DB } from '../db.js';

UI.registerView('reports', {
    async render() {
        return `
            ${UI.header('Reports', '', '<button class="icon-btn" id="export-jpg-btn" title="Save as Image">📷</button>')}
            <div class="reports-container" id="report-export-area">
                <div class="tabs">
                    <button class="tab-btn active" data-report="monthly">Monthly</button>
                    <button class="tab-btn" data-report="yearly">Yearly</button>
                </div>
                
                <div class="report-controls">
                    <button class="icon-btn" id="report-prev">⬅️</button>
                    <h3 id="report-title">...</h3>
                    <button class="icon-btn" id="report-next">➡️</button>
                </div>

                <div class="summary-cards">
                    <div class="card income">
                        <div class="label">Income</div>
                        <div class="value" id="rep-income">$0</div>
                    </div>
                    <div class="card expense">
                        <div class="label">Expense</div>
                        <div class="value" id="rep-expense">$0</div>
                    </div>
                    <div class="card net">
                        <div class="label">Net</div>
                        <div class="value" id="rep-net">$0</div>
                    </div>
                </div>

                <div class="chart-container">
                    <canvas id="report-canvas" width="300" height="200"></canvas>
                </div>

                <div id="breakdown-list" class="list-view"></div>
            </div>
        `;
    },

    async init() {
        this.currentReport = 'monthly';
        this.currentDate = new Date();
        this.categories = await DB.getAll('categories');
        this.bindEvents();
        await this.loadData();
    },

    async loadData() {
        let title = '';
        let entries = [];

        if (this.currentReport === 'monthly') {
            const y = this.currentDate.getFullYear();
            const m = this.currentDate.getMonth();
            title = this.currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
            
            const start = new Date(y, m, 1).toISOString().split('T')[0];
            const end = new Date(y, m + 1, 0).toISOString().split('T')[0];
            entries = await DB.getEntriesByDateRange(start, end);
        } else {
            const y = this.currentDate.getFullYear();
            title = `${y} Yearly Report`;
            
            const start = `${y}-01-01`;
            const end = `${y}-12-31`;
            entries = await DB.getEntriesByDateRange(start, end);
        }

        document.getElementById('report-title').textContent = title;
        this.renderReport(entries);
    },

    renderReport(entries) {
        let totalIncome = 0;
        let totalExpense = 0;
        const expensesByCat = {};
        const monthlyData = new Array(12).fill(0).map(() => ({ inc: 0, exp: 0 }));

        entries.forEach(e => {
            if (e.type === 'income') {
                totalIncome += e.amount;
                if (this.currentReport === 'yearly') {
                    const month = parseInt(e.date.split('-')[1]) - 1;
                    monthlyData[month].inc += e.amount;
                }
            } else {
                totalExpense += e.amount;
                if (this.currentReport === 'monthly') {
                    expensesByCat[e.categoryId] = (expensesByCat[e.categoryId] || 0) + e.amount;
                } else {
                    const month = parseInt(e.date.split('-')[1]) - 1;
                    monthlyData[month].exp += e.amount;
                }
            }
        });

        document.getElementById('rep-income').textContent = `$${totalIncome.toFixed(2)}`;
        document.getElementById('rep-expense').textContent = `$${totalExpense.toFixed(2)}`;
        const net = totalIncome - totalExpense;
        const netEl = document.getElementById('rep-net');
        netEl.textContent = `$${net.toFixed(2)}`;
        netEl.style.color = net >= 0 ? 'var(--secondary-color)' : 'var(--danger-color)';

        const canvas = document.getElementById('report-canvas');
        if (this.currentReport === 'monthly') {
            this.drawDonutChart(canvas, expensesByCat, totalExpense);
            this.renderBreakdown(expensesByCat, totalExpense);
        } else {
            this.drawBarChart(canvas, monthlyData);
            document.getElementById('breakdown-list').innerHTML = ''; // Hide breakdown for yearly
        }
    },

    drawDonutChart(canvas, expensesByCat, totalExpense) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (totalExpense === 0) {
            ctx.fillStyle = '#ccc';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No expenses to show', canvas.width/2, canvas.height/2);
            return;
        }

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const radius = Math.min(cx, cy) - 20;
        let currentAngle = -0.5 * Math.PI;

        Object.keys(expensesByCat).forEach(catId => {
            const amount = expensesByCat[catId];
            const cat = this.categories.find(c => c.id === parseInt(catId));
            const color = cat ? cat.color : '#999';
            
            const sliceAngle = (amount / totalExpense) * 2 * Math.PI;
            
            ctx.beginPath();
            ctx.arc(cx, cy, radius, currentAngle, currentAngle + sliceAngle);
            ctx.lineWidth = 30;
            ctx.strokeStyle = color;
            ctx.stroke();
            
            currentAngle += sliceAngle;
        });
    },

    drawBarChart(canvas, monthlyData) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const maxVal = Math.max(...monthlyData.map(d => Math.max(d.inc, d.exp))) || 1;
        const padX = 30;
        const padY = 20;
        const w = canvas.width - padX * 2;
        const h = canvas.height - padY * 2;
        const barWidth = (w / 12) * 0.4;

        ctx.fillStyle = 'var(--text-muted)';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';

        const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

        monthlyData.forEach((d, i) => {
            const x = padX + (w / 12) * i + (w / 12) / 2;
            
            // X-axis label
            ctx.fillText(months[i], x, canvas.height - 5);

            // Income bar
            const incH = (d.inc / maxVal) * h;
            ctx.fillStyle = 'var(--secondary-color)';
            ctx.fillRect(x - barWidth, canvas.height - padY - incH, barWidth, incH);

            // Expense bar
            const expH = (d.exp / maxVal) * h;
            ctx.fillStyle = 'var(--danger-color)';
            ctx.fillRect(x, canvas.height - padY - expH, barWidth, expH);
        });
    },

    renderBreakdown(expensesByCat, totalExpense) {
        if (totalExpense === 0) {
            document.getElementById('breakdown-list').innerHTML = '';
            return;
        }

        const sorted = Object.keys(expensesByCat)
            .map(id => ({ id: parseInt(id), amount: expensesByCat[id] }))
            .sort((a, b) => b.amount - a.amount);

        const html = sorted.map(item => {
            const cat = this.categories.find(c => c.id === item.id);
            const percent = ((item.amount / totalExpense) * 100).toFixed(1);
            return `
                <div class="list-item" style="margin: 0 15px 10px;">
                    <div class="cat-icon-small" style="background-color: ${cat.color}">${cat.icon}</div>
                    <div class="item-details">
                        <div class="item-name">${cat.name}</div>
                        <div class="progress-bar" style="height:4px; margin-top:5px; width:100px;">
                            <div class="progress-fill" style="width:${percent}%; background-color:${cat.color}"></div>
                        </div>
                    </div>
                    <div class="item-amount">
                        <div>$${item.amount.toFixed(2)}</div>
                        <div style="font-size:11px; color:var(--text-muted); text-align:right;">${percent}%</div>
                    </div>
                </div>
            `;
        }).join('');

        document.getElementById('breakdown-list').innerHTML = `<h4 style="padding:0 15px 10px;">Expense Breakdown</h4>` + html;
    },

    bindEvents() {
        document.querySelectorAll('.tab-btn[data-report]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn[data-report]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentReport = e.target.dataset.report;
                this.loadData();
            });
        });

        document.getElementById('report-prev').addEventListener('click', () => {
            if (this.currentReport === 'monthly') {
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            } else {
                this.currentDate.setFullYear(this.currentDate.getFullYear() - 1);
            }
            this.loadData();
        });

        document.getElementById('report-next').addEventListener('click', () => {
            if (this.currentReport === 'monthly') {
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            } else {
                this.currentDate.setFullYear(this.currentDate.getFullYear() + 1);
            }
            this.loadData();
        });

        const exportBtn = document.getElementById('export-jpg-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', async () => {
                const originalText = exportBtn.textContent;
                exportBtn.textContent = '⏳';
                
                try {
                    const element = document.getElementById('report-export-area');
                    
                    // html2canvas is loaded globally from index.html
                    const canvas = await window.html2canvas(element, {
                        scale: 2, // High resolution
                        backgroundColor: getComputedStyle(document.body).backgroundColor
                    });
                    
                    // Convert to Blob instead of Data URL to bypass strict browser security blocks
                    canvas.toBlob((blob) => {
                        const url = URL.createObjectURL(blob);
                        const title = document.getElementById('report-title').textContent.replace(/\s+/g, '-');
                        
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `report-${title}.jpg`;
                        document.body.appendChild(a);
                        a.click();
                        
                        // Clean up
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    }, 'image/jpeg', 0.92);
                } catch (err) {
                    console.error("Export failed", err);
                    alert("Failed to export image.");
                } finally {
                    exportBtn.textContent = originalText;
                }
            });
        }
    }
});
