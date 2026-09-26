// ui.js - UI helper functions and view management

export const UI = {
    currentView: null,
    views: {},

    registerView(name, viewObj) {
        this.views[name] = viewObj;
    },

    async navigate(viewName, params = {}) {
        if (!this.views[viewName]) {
            console.error(`View ${viewName} not found`);
            return;
        }

        const main = document.getElementById('main-view');
        main.innerHTML = await this.views[viewName].render(params);
        
        if (this.views[viewName].init) {
            await this.views[viewName].init(params);
        }

        this.currentView = viewName;
        this.updateNav(viewName);
    },

    updateNav(viewName) {
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.view === viewName) {
                btn.classList.add('active');
            }
        });
    },

    // UI Components
    header(title, leftIcon = null, rightIcon = null) {
        return `
            <div class="view-header">
                <div class="left">${leftIcon || ''}</div>
                <h2>${title}</h2>
                <div class="right">${rightIcon || ''}</div>
            </div>
        `;
    },
    
    bindNav() {
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                if (view) this.navigate(view);
            });
        });
    }
};
