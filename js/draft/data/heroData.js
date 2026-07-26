// ============================================================
// js/draft/data/heroData.js
// Загрузка CSV-данных и управление списком героев
// ============================================================

const HEROES = [
    'Abaddon', 'Alchemist', 'Ancient Apparition', 'Anti-Mage', 'Arc Warden',
    'Axe', 'Bane', 'Batrider', 'Beastmaster', 'Bloodseeker',
    'Bounty Hunter', 'Brewmaster', 'Bristleback', 'Broodmother', 'Centaur Warrunner',
    'Chaos Knight', 'Chen', 'Clinkz', 'Clockwerk', 'Crystal Maiden',
    'Dark Seer', 'Dark Willow', 'Dawnbreaker', 'Dazzle', 'Death Prophet',
    'Disruptor', 'Doom', 'Dragon Knight', 'Drow Ranger', 'Earth Spirit',
    'Earthshaker', 'Elder Titan', 'Ember Spirit', 'Enchantress', 'Enigma',
    'Faceless Void', 'Grimstroke', 'Gyrocopter', 'Hoodwink', 'Huskar',
    'Invoker', 'Io', 'Jakiro', 'Juggernaut', 'Keeper of the Light',
    'Kez', 'Kunkka', 'Largo', 'Legion Commander', 'Leshrac',
    'Lich', 'Lifestealer', 'Lina', 'Lion', 'Lone Druid',
    'Luna', 'Lycan', 'Magnus', 'Marci', 'Mars',
    'Medusa', 'Meepo', 'Mirana', 'Monkey King', 'Morphling',
    'Muerta', 'Naga Siren', "Nature's Prophet", 'Necrophos', 'Night Stalker',
    'Nyx Assassin', 'Ogre Magi', 'Omniknight', 'Oracle', 'Outworld Devourer',
    'Pangolier', 'Phantom Assassin', 'Phantom Lancer', 'Phoenix', 'Primal Beast',
    'Puck', 'Pudge', 'Pugna', 'Queen of Pain', 'Razor',
    'Riki', 'Ringmaster', 'Rubick', 'Sand King', 'Shadow Demon',
    'Shadow Fiend', 'Shadow Shaman', 'Silencer', 'Skywrath Mage', 'Slardar',
    'Slark', 'Snapfire', 'Sniper', 'Spectre', 'Spirit Breaker',
    'Storm Spirit', 'Sven', 'Techies', 'Templar Assassin', 'Terrorblade',
    'Tidehunter', 'Timbersaw', 'Tinker', 'Tiny', 'Treant Protector',
    'Troll Warlord', 'Tusk', 'Underlord', 'Undying', 'Ursa',
    'Vengeful Spirit', 'Venomancer', 'Viper', 'Visage', 'Void Spirit',
    'Warlock', 'Weaver', 'Windranger', 'Winter Wyvern', 'Witch Doctor',
    'Wraith King', 'Zeus'
];

export function getHeroesList() {
    return [...HEROES];
}

let dataLoaded = false;
let heroVsData = null;

export async function ensureDataLoaded() {
    if (dataLoaded) return;
    try {
        const stats = await loadHeroStats();
        const ratings = await loadHeroRatings();
        const vsData = await loadHeroVsHeroData();
        window._heroStats = stats || {};
        window._heroRatings = ratings || {};
        window._heroVsData = vsData || {};
        dataLoaded = true;
        console.log('Hero data loaded. _heroVsData keys:', Object.keys(window._heroVsData).length);
    } catch (e) {
        console.warn('Draft data not loaded, using fallback', e);
        window._heroStats = {};
        window._heroRatings = {};
        window._heroVsData = {};
        dataLoaded = true;
    }
}

export async function loadHeroStats() {
    try {
        const response = await fetch('all_hero_player_stats_with_kal.csv');
        if (!response.ok) throw new Error('CSV not found');
        const text = await response.text();
        return parseHeroStats(text);
    } catch (e) {
        console.warn('Hero stats not loaded, using fallback');
        return {};
    }
}

function parseHeroStats(csv) {
    const lines = csv.split('\n').filter(line => line.trim() !== '');
    const result = {};
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(';').map(s => s.trim());
        if (cols.length < 5) continue;
        const hero = cols[0];
        const player = cols[1];
        const total = parseInt(cols[2], 10);
        const winrate = parseFloat(cols[3].replace('%', '').replace(',', '.')) / 100;
        const kal = parseFloat(cols[4].replace(',', '.'));
        if (isNaN(total) || isNaN(winrate)) continue;
        if (!result[player]) result[player] = {};
        result[player][hero] = { total, winrate, kal };
    }
    return result;
}

export async function loadHeroRatings() {
    try {
        const response = await fetch('hero_ratings.csv');
        if (!response.ok) throw new Error('hero_ratings.csv not found');
        const text = await response.text();
        const lines = text.split('\n').filter(line => line.trim() !== '');
        const ratings = {};
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map(s => s.trim());
            if (cols.length < 4) continue;
            const hero = cols[1];
            const early = parseFloat(cols[2]);
            const mid = parseFloat(cols[3]);
            const late = parseFloat(cols[4]);
            if (isNaN(early) || isNaN(mid) || isNaN(late)) continue;
            ratings[hero] = { early, mid, late };
        }
        return ratings;
    } catch (e) {
        console.warn('Hero ratings not loaded, using fallback');
        return {};
    }
}

// ============================================================
// Загрузка Hero_vs_Hero данных с правильным CSV-парсером
// ============================================================

export async function loadHeroVsHeroData() {
    if (heroVsData) return heroVsData;
    try {
        const response = await fetch('Hero_hth.csv');
        if (!response.ok) throw new Error('Hero_hth.csv not found');
        const text = await response.text();
        heroVsData = parseHeroVsData(text);
        console.log('Hero_hth.csv loaded, entries:', Object.keys(heroVsData).length);
        return heroVsData;
    } catch (e) {
        console.warn('Hero vs hero data not loaded', e);
        return {};
    }
}

/**
 * Правильный парсер CSV с поддержкой кавычек
 * (скопирован из 1.html, проверен на вашем файле)
 */
function parseHeroVsData(csv) {
    // Удаляем BOM, если есть
    if (csv.charCodeAt(0) === 0xFEFF) csv = csv.slice(1);

    const lines = csv.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) {
        console.warn('CSV has less than 2 lines');
        return {};
    }

    // Заголовок: "Hero","Vs","Games","W","L","Win %","Elo Shift"
    // Используем парсер с учётом кавычек
    function parseRow(line) {
        const cells = [];
        let cell = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (inQuotes && line[i+1] === '"') {
                    cell += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (ch === ',' && !inQuotes) {
                cells.push(cell.trim());
                cell = '';
            } else {
                cell += ch;
            }
        }
        cells.push(cell.trim());
        return cells;
    }

    const data = {};
    // Начинаем с 1 строки (пропускаем заголовок)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        // Пропускаем пустые строки
        if (!line.trim()) continue;
        const cols = parseRow(line);
        // Ожидаем минимум 7 колонок
        if (cols.length < 7) {
            console.warn(`Skipping line ${i+1}: not enough columns (${cols.length})`, cols);
            continue;
        }
        // Удаляем кавычки из названий (они уже могли быть удалены, но на всякий случай)
        const hero = cols[0].replace(/^"|"$/g, '').trim();
        const vs = cols[1].replace(/^"|"$/g, '').trim();
        // Win % — колонка 5 (индекс 4)
        const winrate = parseFloat(cols[4]);
        // Elo Shift — колонка 7 (индекс 6)
        const eloShift = parseFloat(cols[6]);
        if (isNaN(winrate) || isNaN(eloShift)) {
            console.warn(`Skipping line ${i+1}: invalid numbers`, { winrate, eloShift, cols });
            continue;
        }
        if (!data[hero]) data[hero] = {};
        data[hero][vs] = { winrate, eloShift };
    }

    console.log(`Parsed ${Object.keys(data).length} heroes with vs data`);
    return data;
}

export function getHeroStage(hero) {
    const ratings = window._heroRatings?.[hero];
    if (!ratings) return 'Balanced';
    const { early, mid, late } = ratings;
    const max = Math.max(early, mid, late);
    // Подсчёт, сколько стадий имеют максимальное значение
    const countMax = (early === max ? 1 : 0) + (mid === max ? 1 : 0) + (late === max ? 1 : 0);
    if (countMax === 1) {
        if (early === max) return 'Early';
        if (mid === max) return 'Mid';
        if (late === max) return 'Late';
    }
    return 'Balanced';
}