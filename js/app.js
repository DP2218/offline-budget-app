// app.js - Main entry point

import { DB } from './db.js';
import { UI } from './ui.js';

// Import views
import './views/entry.js';
import './views/calendar.js';
import './views/categories.js';
import './views/recurring.js';
import './views/budgets.js';
import './views/reports.js';
import './views/settings.js';

class App {
    async init() {
        try {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW registration failed:', err));
            }
            
            await DB.init();
            await DB.seedDefaultCategories();
            await this.generateRecurringEntries();
            
            await this.loadSettings();
            UI.bindNav();

            if (this.isPasscodeEnabled) {
                this.showPasscodeScreen();
            } else {
                this.start();
            }
        } catch (error) {
            console.error("Init failed", error);
        }
    }

    async generateRecurringEntries() {
        const rules = await DB.getAll('recurringRules');
        const activeRules = rules.filter(r => r.active);
        const todayStr = new Date().toISOString().split('T')[0];

        for (const rule of activeRules) {
            // Very simplified: check if it should run today based on daySpecifier
            // In a real app, you'd calculate missed periods since lastGenerated.
            const d = new Date();
            let shouldRun = false;
            
            if (rule.frequency === 'monthly' && d.getDate() === rule.daySpecifier) shouldRun = true;
            if (rule.frequency === 'weekly' && d.getDay() === rule.daySpecifier) shouldRun = true;

            if (shouldRun && rule.lastGenerated !== todayStr) {
                await DB.add('entries', {
                    type: rule.type,
                    amount: rule.amount,
                    categoryId: rule.categoryId,
                    note: rule.note + ' (Auto)',
                    date: todayStr,
                    createdAt: new Date().toISOString()
                });
                rule.lastGenerated = todayStr;
                await DB.put('recurringRules', rule);
            }
        }
    }

    async loadSettings() {
        const theme = await DB.get('settings', 'theme');
        if (theme && theme.value === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
        
        const passcodeHash = await DB.get('settings', 'passcodeHash');
        this.isPasscodeEnabled = !!passcodeHash;
        this.passcodeHash = passcodeHash ? passcodeHash.value : null;
    }

    start() {
        document.getElementById('passcode-overlay').classList.add('hidden');
        UI.navigate('entry');
    }

    showPasscodeScreen() {
        document.getElementById('passcode-overlay').classList.remove('hidden');
        const overlay = document.getElementById('passcode-overlay');
        const dots = overlay.querySelectorAll('.dot');
        let currentPin = '';

        const updateDots = () => {
            dots.forEach((d, i) => {
                if (i < currentPin.length) d.classList.add('filled');
                else d.classList.remove('filled');
            });
        };

        const verifyPin = async () => {
            let hashHex = '';
            if (window.crypto && window.crypto.subtle) {
                const buffer = new TextEncoder().encode(currentPin);
                const hash = await window.crypto.subtle.digest('SHA-256', buffer);
                const hashArray = Array.from(new Uint8Array(hash));
                hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            } else {
                let h = 0;
                for (let i = 0; i < currentPin.length; i++) h = Math.imul(31, h) + currentPin.charCodeAt(i) | 0;
                hashHex = 'fallback_' + h.toString(16);
            }
            
            if (hashHex === this.passcodeHash) {
                this.start();
            } else {
                document.getElementById('passcode-error').classList.remove('hidden');
                currentPin = '';
                updateDots();
                setTimeout(() => document.getElementById('passcode-error').classList.add('hidden'), 2000);
            }
        };

        overlay.querySelectorAll('.numpad button').forEach(btn => {
            // Remove old listeners if re-shown
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', async (e) => {
                const val = e.currentTarget.dataset.val;
                if (val === 'back') {
                    currentPin = currentPin.slice(0, -1);
                } else if (val === 'biometric') {
                    try {
                        const credData = await DB.get('settings', 'webAuthnCredential');
                        if (!credData) {
                            alert('Biometric unlock not set up. Use PIN.');
                            return;
                        }
                        const challenge = new Uint8Array(32);
                        crypto.getRandomValues(challenge);
                        
                        const assertion = await navigator.credentials.get({
                            publicKey: {
                                challenge: challenge,
                                allowCredentials: [{
                                    id: new Uint8Array(credData.value.rawId),
                                    type: 'public-key'
                                }],
                                userVerification: 'required'
                            }
                        });
                        if (assertion) {
                            this.start();
                        }
                    } catch (err) {
                        console.error(err);
                        alert('Biometric unlock failed.');
                    }
                } else {
                    if (currentPin.length < 4) currentPin += val;
                }
                updateDots();
                
                if (currentPin.length === 4) {
                    verifyPin();
                }
            });
        });

        document.getElementById('reset-app-btn').addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete ALL your data and reset the app?')) {
                indexedDB.deleteDatabase('moneyNoteApp');
                location.reload();
            }
        });
    }
}

const app = new App();
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
