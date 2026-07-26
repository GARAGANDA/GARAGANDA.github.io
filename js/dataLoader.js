import { getAllPlayerNames } from './ratings.js';

export function parseCSV(text) {
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return [];
    const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
    const result = [];
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        const values = [];
        let current = '', inQuotes = false;
        for (let ch of row) {
            if (ch === '"') { inQuotes = !inQuotes; continue; }
            if (ch === ',' && !inQuotes) { values.push(current.trim()); current = ''; continue; }
            current += ch;
        }
        values.push(current.trim());
        if (values.length !== headers.length) continue;
        const obj = {};
        headers.forEach((h, idx) => { obj[h] = values[idx] || ''; });
        result.push(obj);
    }
    return result;
}

export function loadCSV(url) {
    console.log(`Загрузка: ${url}`);
    return fetch(url)
        .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status} при загрузке ${url}`);
            return r.text();
        })
        .then(parseCSV)
        .catch(err => {
            console.error(`Ошибка загрузки ${url}:`, err);
            throw err;
        });
}

export async function loadAllData(progressCallback) {
    const playerSet = getAllPlayerNames();
    console.log(`Загружено игроков с рейтингом: ${playerSet.size}`);

    let loaded = 0;
    const total = 1; // только teams.csv (опционально)

    function updateProgress() {
        loaded++;
        if (progressCallback) progressCallback(Math.round((loaded / total) * 100));
    }

    const realTeams = {};

    try {
        // teams.csv (опционально)
        try {
            console.log('Загрузка Teams.csv...');
            const teamsData = await loadCSV('Teams.csv');
            teamsData.forEach(row => {
                const teamName = row.Team.replace(/^"|"$/g, '').trim();
                const players = [
                    row.Carry.replace(/^"|"$/g, '').trim(),
                    row.Mider.replace(/^"|"$/g, '').trim(),
                    row.Offlane.replace(/^"|"$/g, '').trim(),
                    row['Semi-Supp'].replace(/^"|"$/g, '').trim(),
                    row['Full-Supp'].replace(/^"|"$/g, '').trim()
                ].filter(p => p);
                if (players.length === 5) {
                    realTeams[teamName] = players;
                }
            });
            console.log(`Teams.csv загружен, команд: ${Object.keys(realTeams).length}`);
        } catch (e) {
            console.warn('Teams.csv не найден, пропускаем.');
        }
        updateProgress();

        return { realTeams };
    } catch (err) {
        console.error('Ошибка загрузки:', err);
        throw err;
    }
}