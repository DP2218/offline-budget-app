import { UI } from '../ui.js';
import { DB } from '../db.js';

UI.registerView('settings', {
    async render() {
        return `
            ${UI.header('Settings')}
            <div class="settings-container">
                <div class="settings-group">
                    <h4>Preferences</h4>
                    <div class="setting-item">
                        <span>Dark Mode</span>
                        <label class="switch">
                            <input type="checkbox" id="theme-toggle">
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>

                <div class="settings-group">
                    <h4>Features</h4>
                    <div class="setting-item clickable" id="link-recurring">
                        <span>🔁 Recurring Entries</span>
                        <span class="text-muted">➡️</span>
                    </div>
                    <div class="setting-item clickable" id="link-budgets">
                        <span>🎯 Budgets</span>
                        <span class="text-muted">➡️</span>
                    </div>
                    <div class="setting-item clickable" id="link-passcode">
                        <span>🔒 Passcode Lock</span>
                        <span class="text-muted" id="passcode-status">Off</span>
                    </div>
                    <div class="setting-item clickable hidden" id="btn-setup-biometric">
                        <span>🖐️ Setup Biometric (WebAuthn)</span>
                        <span class="text-muted" id="biometric-status">Off</span>
                    </div>
                </div>

                <div class="settings-group">
                    <h4>Data Management</h4>
                    <div class="setting-item clickable" id="btn-export-json">
                        <span>💾 Backup (JSON)</span>
                        <span class="text-muted">↓</span>
                    </div>
                    <div class="setting-item clickable" id="btn-import-json">
                        <span>📂 Restore (JSON)</span>
                        <span class="text-muted">↑</span>
                        <input type="file" id="import-file" style="display:none" accept=".json">
                    </div>
                    <div class="setting-item clickable" id="btn-export-csv">
                        <span>📄 Export CSV</span>
                        <span class="text-muted">↓</span>
                    </div>
                    <div class="setting-item clickable" id="btn-export-pdf">
                        <span>📊 Export PDF Report</span>
                        <span class="text-muted">↓</span>
                    </div>
                </div>
            </div>

            <!-- Passcode Modal -->
            <div id="passcode-modal" class="modal hidden">
                <div class="modal-content">
                    <h3>Set Passcode</h3>
                    <p class="text-muted" style="font-size:12px; margin-bottom:10px;">Enter a 4-digit PIN. This is local only, if you forget it, you will have to reset the app data.</p>
                    <input type="password" id="new-pin" class="input-field" placeholder="4 digits" maxlength="4" style="text-align:center; font-size:24px; letter-spacing:10px;">
                    <div class="modal-actions">
                        <button id="btn-cancel-pin" class="text-btn">Cancel</button>
                        <button id="btn-remove-pin" class="text-btn danger hidden">Remove</button>
                        <button id="btn-save-pin" class="primary-btn">Save</button>
                    </div>
                </div>
            </div>
        `;
    },

    async init() {
        const theme = await DB.get('settings', 'theme');
        const isDark = theme && theme.value === 'dark';
        document.getElementById('theme-toggle').checked = isDark;

        const passcodeHash = await DB.get('settings', 'passcodeHash');
        if (passcodeHash) {
            document.getElementById('passcode-status').textContent = 'On';
            document.getElementById('btn-remove-pin').classList.remove('hidden');
        }

        this.bindEvents();
    },

    bindEvents() {
        // Theme
        document.getElementById('theme-toggle').addEventListener('change', async (e) => {
            const isDark = e.target.checked;
            const theme = isDark ? 'dark' : 'light';
            if (isDark) {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
            await DB.put('settings', { key: 'theme', value: theme });
        });

        // Navigation
        document.getElementById('link-recurring').addEventListener('click', () => UI.navigate('recurring'));
        document.getElementById('link-budgets').addEventListener('click', () => UI.navigate('budgets'));

        // Passcode
        document.getElementById('link-passcode').addEventListener('click', () => {
            document.getElementById('passcode-modal').classList.remove('hidden');
        });
        document.getElementById('btn-cancel-pin').addEventListener('click', () => {
            document.getElementById('passcode-modal').classList.add('hidden');
        });
        document.getElementById('btn-save-pin').addEventListener('click', async () => {
            const pin = document.getElementById('new-pin').value;
            if (pin.length !== 4) return alert('PIN must be 4 digits');
            let hashHex = '';
            if (window.crypto && window.crypto.subtle) {
                const buffer = new TextEncoder().encode(pin);
                const hash = await window.crypto.subtle.digest('SHA-256', buffer);
                const hashArray = Array.from(new Uint8Array(hash));
                hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            } else {
                let h = 0;
                for (let i = 0; i < pin.length; i++) h = Math.imul(31, h) + pin.charCodeAt(i) | 0;
                hashHex = 'fallback_' + h.toString(16);
            }
            
            await DB.put('settings', { key: 'passcodeHash', value: hashHex });
            alert('PIN set successfully');
            document.getElementById('passcode-modal').classList.add('hidden');
            document.getElementById('btn-setup-biometric').classList.remove('hidden');
            this.init();
        });
        document.getElementById('btn-remove-pin').addEventListener('click', async () => {
            await DB.delete('settings', 'passcodeHash');
            await DB.delete('settings', 'webAuthnCredential');
            alert('PIN and Biometrics removed');
            document.getElementById('passcode-modal').classList.add('hidden');
            document.getElementById('btn-setup-biometric').classList.add('hidden');
            this.init();
        });

        // WebAuthn
        const checkBiometric = async () => {
            const cred = await DB.get('settings', 'webAuthnCredential');
            if (cred) {
                document.getElementById('biometric-status').textContent = 'On';
            }
            const hash = await DB.get('settings', 'passcodeHash');
            if (hash) {
                document.getElementById('btn-setup-biometric').classList.remove('hidden');
            }
        };
        checkBiometric();

        document.getElementById('btn-setup-biometric').addEventListener('click', async () => {
            if (!window.PublicKeyCredential) {
                alert('WebAuthn not supported on this browser/device.');
                return;
            }
            try {
                const challenge = new Uint8Array(32);
                crypto.getRandomValues(challenge);
                const userId = new Uint8Array(16);
                crypto.getRandomValues(userId);

                const credential = await navigator.credentials.create({
                    publicKey: {
                        challenge: challenge,
                        rp: { name: "MoneyNote Offline" },
                        user: {
                            id: userId,
                            name: "localuser",
                            displayName: "Local User"
                        },
                        pubKeyCredParams: [
                            { type: "public-key", alg: -7 }, // ES256
                            { type: "public-key", alg: -257 } // RS256
                        ],
                        authenticatorSelection: {
                            authenticatorAttachment: "platform",
                            userVerification: "required"
                        },
                        timeout: 60000,
                        attestation: "none"
                    }
                });

                if (credential) {
                    await DB.put('settings', { 
                        key: 'webAuthnCredential', 
                        value: { id: credential.id, rawId: Array.from(new Uint8Array(credential.rawId)) }
                    });
                    alert('Biometric setup successful!');
                    this.init();
                }
            } catch (err) {
                console.error(err);
                alert('Biometric setup failed or was canceled.');
            }
        });

        // Data Backup / Restore
        document.getElementById('btn-export-json').addEventListener('click', async () => {
            const data = {
                entries: await DB.getAll('entries'),
                categories: await DB.getAll('categories'),
                recurringRules: await DB.getAll('recurringRules'),
                budgets: await DB.getAll('budgets'),
                settings: await DB.getAll('settings')
            };
            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `moneynote_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });

        document.getElementById('btn-import-json').addEventListener('click', () => {
            document.getElementById('import-file').click();
        });

        document.getElementById('import-file').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (data.entries && data.categories) {
                        // Clear existing
                        const stores = ['entries', 'categories', 'recurringRules', 'budgets', 'settings'];
                        for (const s of stores) {
                            const all = await DB.getAll(s);
                            for (const item of all) await DB.delete(s, item.id || item.key);
                        }
                        // Insert new
                        for (const s of stores) {
                            if (data[s]) {
                                for (const item of data[s]) await DB.add(s, item);
                            }
                        }
                        alert('Restore successful! App will reload.');
                        location.reload();
                    } else {
                        alert('Invalid backup file');
                    }
                } catch (err) {
                    alert('Error parsing file');
                }
            };
            reader.readAsText(file);
        });

        // CSV Export
        document.getElementById('btn-export-csv').addEventListener('click', async () => {
            const entries = await DB.getAll('entries');
            const categories = await DB.getAll('categories');
            
            let csv = 'Date,Type,Category,Amount,Note\n';
            entries.forEach(e => {
                const cat = categories.find(c => c.id === e.categoryId);
                const cName = cat ? cat.name : '';
                // Escape notes for CSV
                const note = e.note ? `"${e.note.replace(/"/g, '""')}"` : '';
                csv += `${e.date},${e.type},${cName},${e.amount},${note}\n`;
            });
            
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `moneynote_export_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        });

        // PDF Export
        document.getElementById('btn-export-pdf').addEventListener('click', () => {
            if (typeof html2pdf === 'undefined') {
                alert('PDF library not loaded.');
                return;
            }
            // Navigate to reports, wait a bit, then print
            UI.navigate('reports');
            setTimeout(() => {
                const element = document.querySelector('.reports-container');
                html2pdf().from(element).set({
                    margin: 10,
                    filename: `report_${new Date().toISOString().split('T')[0]}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2 },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                }).save();
            }, 500);
        });
    }
});
