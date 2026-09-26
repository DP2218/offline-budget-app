# Offline Budget App

A privacy-first, fully offline single-user household budgeting web app inspired by MoneyNote. 
All data stays on-device in your browser using IndexedDB. No server, no accounts, no telemetry.

## Features
- **Quick Entry**: Fast calculator-style input for logging expenses and income.
- **Calendar**: Monthly view of transactions.
- **Categories**: Fully customizable categories with colors and emojis.
- **Recurring Entries**: Automate fixed expenses and income.
- **Budgets**: Set category limits.
- **Reports**: Monthly and yearly trends.
- **Privacy-first**: Passcode lock, 100% offline.
- **Data Portability**: JSON Backup/Restore, CSV export, and PDF reports.

## How to use
Simply open `index.html` in any modern web browser. No local server or build step is required.
You can save this folder anywhere on your computer or phone (e.g., adding it to your homescreen).

## Data Backup and Cloud Sync
Because the app is fully offline, it relies on your browser's IndexedDB. If you clear your browser data, your app data will be deleted!
**Always use the Backup (JSON) feature in Settings to save your data safely.**

### Adding Cloud Sync in the future
If you ever want to add cloud sync, you can:
1. Swap the local `db.js` wrapper with a syncing wrapper (like RxDB or PouchDB).
2. Connect it to a CouchDB instance or a Firebase/Supabase backend.
3. Update the `Settings` page to accept a sync URL or user credentials.
