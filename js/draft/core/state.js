// ============================================================
// js/draft/core/state.js
// ============================================================

import { getRating } from '../../ratings.js';
import { shuffleArray } from '../utils/helpers.js';
import { getHeroesList } from '../data/heroData.js';

/**
 * Создаёт состояние для ручного драфта с UI
 */
export function initDraftState(teamA, teamB, bestOf) {
    const userTeam = teamA.isUser ? teamA : teamB;
    const opponentTeam = teamA.isUser ? teamB : teamA;
    const direTeam = userTeam;
    const radiantTeam = opponentTeam;

    const roleMap = {
        'carry': 'carry',
        'mid': 'mid',
        'offlane': 'offlane',
        'semi-support': 'semi',
        'full-support': 'full'
    };

    function buildPlayerMap(team) {
        const players = {};
        team.players.forEach((p, i) => {
            const role = roleMap[team.roleKeys[i]] || team.roleKeys[i];
            players[role] = p;
        });
        return players;
    }

    const direPlayersMap = buildPlayerMap(direTeam);
    const radiantPlayersMap = buildPlayerMap(radiantTeam);

    const playerRatings = {};
    const allPlayers = [...direTeam.players, ...radiantTeam.players];
    for (const player of allPlayers) {
        let rating = 0;
        for (const role of ['carry', 'mid', 'offlane', 'semi-support', 'full-support']) {
            const r = getRating(player, role);
            if (r !== null) { rating = r; break; }
        }
        playerRatings[player] = rating || 80;
    }

    const duoMap = generateDuoMap(allPlayers);

    const draftTeams = {
        dire: {
            name: direTeam.name,
            players: direPlayersMap,
            side: 'dire',
            isUser: true,
            roles: ['carry', 'mid', 'offlane', 'semi', 'full'],
            roleLabels: {
                carry: 'Carry',
                mid: 'Mid',
                offlane: 'Offlane',
                semi: 'Semi-Supp',
                full: 'Full-Supp'
            }
        },
        radiant: {
            name: radiantTeam.name,
            players: radiantPlayersMap,
            side: 'radiant',
            isUser: false,
            roles: ['carry', 'mid', 'offlane', 'semi', 'full'],
            roleLabels: {
                carry: 'Carry',
                mid: 'Mid',
                offlane: 'Offlane',
                semi: 'Semi-Supp',
                full: 'Full-Supp'
            }
        }
    };

    const HEROES = getHeroesList();
    const playerHeroMap = {};
    const heroPlayerMap = {};
    const kalData = {};
    const loadedStats = window._heroStats || {};

    for (const player of allPlayers) {
        if (loadedStats[player]) {
            playerHeroMap[player] = {};
            for (const [hero, data] of Object.entries(loadedStats[player])) {
                playerHeroMap[player][hero] = { total: data.total, winrate: data.winrate };
                if (!heroPlayerMap[hero]) heroPlayerMap[hero] = {};
                heroPlayerMap[hero][player] = { total: data.total, winrate: data.winrate };
                if (!kalData[player]) kalData[player] = {};
                kalData[player][hero] = data.kal || 3.0;
            }
        } else {
            const shuffled = shuffleArray([...HEROES]);
            const pool = shuffled.slice(0, 12);
            playerHeroMap[player] = {};
            kalData[player] = {};
            for (const h of pool) {
                const total = Math.floor(Math.random() * 60) + 10;
                const winrate = 0.4 + Math.random() * 0.4;
                playerHeroMap[player][h] = { total, winrate };
                if (!heroPlayerMap[h]) heroPlayerMap[h] = {};
                heroPlayerMap[h][player] = { total, winrate };
                kalData[player][h] = 2 + Math.random() * 5;
            }
        }
    }

    for (const player of allPlayers) {
        if (!playerHeroMap[player] || Object.keys(playerHeroMap[player]).length === 0) {
            const shuffled = shuffleArray([...HEROES]);
            const pool = shuffled.slice(0, 12);
            playerHeroMap[player] = {};
            kalData[player] = {};
            for (const h of pool) {
                const total = Math.floor(Math.random() * 60) + 10;
                const winrate = 0.4 + Math.random() * 0.4;
                playerHeroMap[player][h] = { total, winrate };
                if (!heroPlayerMap[h]) heroPlayerMap[h] = {};
                heroPlayerMap[h][player] = { total, winrate };
                kalData[player][h] = 2 + Math.random() * 5;
            }
        }
    }

    const draftPlayersSet = new Set(allPlayers);

    return {
        teams: draftTeams,
        format: bestOf === 3 ? 'bo3' : 'bo5',
        playerRatings,
        playerHeroMap,
        heroPlayerMap,
        kalData,
        duoMap,
        draftPlayersSet,
        HEROES,
        games: [],
        currentGame: 0,
        direWins: 0,
        radiantWins: 0,
        isFinished: false,
        winner: null,
        waitingForNext: false,
        lastGameResult: null,
        gameState: null,
        bestOf,
    };
}

/**
 * Создаёт состояние для автоматического драфта (без UI)
 * Исправлено: корректно обрабатывает структуру команд
 */
export function initAutoDraftState(teamA, teamB, bestOf = 1) {
    // Приводим команды к единому формату: { players: массив, roleKeys: массив }
    // Если у команды есть players как объект (с ролями), преобразуем в массив
    function getPlayersArray(team) {
        if (Array.isArray(team.players)) {
            return team.players;
        } else if (team.players && typeof team.players === 'object') {
            // Если players – объект, берём значения в порядке ролей
            const order = ['carry', 'mid', 'offlane', 'semi', 'full'];
            return order.map(role => team.players[role]).filter(p => p);
        }
        return [];
    }

    const teamAPlayers = getPlayersArray(teamA);
    const teamBPlayers = getPlayersArray(teamB);
    // Если игроков меньше 5, дополняем (но в нормальной ситуации их 5)
    while (teamAPlayers.length < 5) teamAPlayers.push('Unknown');
    while (teamBPlayers.length < 5) teamBPlayers.push('Unknown');

    // Определяем roleKeys
    const defaultRoleKeys = ['carry', 'mid', 'offlane', 'semi-support', 'full-support'];
    const teamARoleKeys = teamA.roleKeys || defaultRoleKeys;
    const teamBRoleKeys = teamB.roleKeys || defaultRoleKeys;

    // Строим карту ролей для драфта (используется в renderers)
    const roleMap = {
        'carry': 'carry',
        'mid': 'mid',
        'offlane': 'offlane',
        'semi-support': 'semi',
        'full-support': 'full'
    };

    function buildPlayerMap(players, roleKeys) {
        const map = {};
        players.forEach((p, idx) => {
            const role = roleKeys[idx] || 'unknown';
            const mappedRole = roleMap[role] || role;
            map[mappedRole] = p;
        });
        return map;
    }

    const direPlayersMap = buildPlayerMap(teamAPlayers, teamARoleKeys);
    const radiantPlayersMap = buildPlayerMap(teamBPlayers, teamBRoleKeys);

    const allPlayers = [...new Set([...teamAPlayers, ...teamBPlayers])].filter(p => p !== 'Unknown');

    // Рейтинги
    const playerRatings = {};
    for (const player of allPlayers) {
        let rating = 0;
        for (const role of ['carry', 'mid', 'offlane', 'semi-support', 'full-support']) {
            const r = getRating(player, role);
            if (r !== null) { rating = r; break; }
        }
        playerRatings[player] = rating || 80;
    }

    const duoMap = generateDuoMap(allPlayers);

    const draftTeams = {
        dire: {
            name: teamA.name || 'Dire',
            players: direPlayersMap,
            side: 'dire',
            isUser: teamA.isUser || false,
            roles: ['carry', 'mid', 'offlane', 'semi', 'full'],
            roleLabels: {
                carry: 'Carry',
                mid: 'Mid',
                offlane: 'Offlane',
                semi: 'Semi-Supp',
                full: 'Full-Supp'
            }
        },
        radiant: {
            name: teamB.name || 'Radiant',
            players: radiantPlayersMap,
            side: 'radiant',
            isUser: teamB.isUser || false,
            roles: ['carry', 'mid', 'offlane', 'semi', 'full'],
            roleLabels: {
                carry: 'Carry',
                mid: 'Mid',
                offlane: 'Offlane',
                semi: 'Semi-Supp',
                full: 'Full-Supp'
            }
        }
    };

    const HEROES = getHeroesList();
    const playerHeroMap = {};
    const heroPlayerMap = {};
    const kalData = {};
    const loadedStats = window._heroStats || {};

    for (const player of allPlayers) {
        if (loadedStats[player]) {
            playerHeroMap[player] = {};
            for (const [hero, data] of Object.entries(loadedStats[player])) {
                playerHeroMap[player][hero] = { total: data.total, winrate: data.winrate };
                if (!heroPlayerMap[hero]) heroPlayerMap[hero] = {};
                heroPlayerMap[hero][player] = { total: data.total, winrate: data.winrate };
                if (!kalData[player]) kalData[player] = {};
                kalData[player][hero] = data.kal || 3.0;
            }
        } else {
            const shuffled = shuffleArray([...HEROES]);
            const pool = shuffled.slice(0, 12);
            playerHeroMap[player] = {};
            kalData[player] = {};
            for (const h of pool) {
                const total = Math.floor(Math.random() * 60) + 10;
                const winrate = 0.4 + Math.random() * 0.4;
                playerHeroMap[player][h] = { total, winrate };
                if (!heroPlayerMap[h]) heroPlayerMap[h] = {};
                heroPlayerMap[h][player] = { total, winrate };
                kalData[player][h] = 2 + Math.random() * 5;
            }
        }
    }

    for (const player of allPlayers) {
        if (!playerHeroMap[player] || Object.keys(playerHeroMap[player]).length === 0) {
            const shuffled = shuffleArray([...HEROES]);
            const pool = shuffled.slice(0, 12);
            playerHeroMap[player] = {};
            kalData[player] = {};
            for (const h of pool) {
                const total = Math.floor(Math.random() * 60) + 10;
                const winrate = 0.4 + Math.random() * 0.4;
                playerHeroMap[player][h] = { total, winrate };
                if (!heroPlayerMap[h]) heroPlayerMap[h] = {};
                heroPlayerMap[h][player] = { total, winrate };
                kalData[player][h] = 2 + Math.random() * 5;
            }
        }
    }

    const draftPlayersSet = new Set(allPlayers);

    const pools = {};
    for (const player of allPlayers) {
        pools[player] = Object.keys(playerHeroMap[player]);
    }

    const gameState = {
        pools: pools,
        stats: playerHeroMap,
        bans: { dire: Array(7).fill(null), radiant: Array(7).fill(null) },
        picks: {
            dire: { carry: null, mid: null, offlane: null, semi: null, full: null },
            radiant: { carry: null, mid: null, offlane: null, semi: null, full: null }
        },
        pickedPlayers: { dire: [], radiant: [] },
        usedHeroes: new Set(),
        currentStep: -1,
        waitingForUser: false,
        pickHeroPending: null,
        isFinished: false,
        lastGameResult: null
    };

    return {
        teams: draftTeams,
        format: bestOf === 3 ? 'bo3' : 'bo5',
        playerRatings,
        playerHeroMap,
        heroPlayerMap,
        kalData,
        duoMap,
        draftPlayersSet,
        HEROES,
        games: [],
        currentGame: 0,
        direWins: 0,
        radiantWins: 0,
        isFinished: false,
        winner: null,
        waitingForNext: false,
        lastGameResult: null,
        gameState: gameState,
        bestOf,
    };
}

/**
 * Генерирует случайные данные синергии для пар игроков
 * (используется, если нет реальных данных)
 */
function generateDuoMap(players) {
    const map = {};
    for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
            const p1 = players[i];
            const p2 = players[j];
            const key = [p1, p2].sort().join(', ');
            // Если уже есть – пропускаем
            if (map[key]) continue;
            const winrate = 0.45 + Math.random() * 0.2;
            const total = Math.floor(Math.random() * 130) + 20;
            const wins = Math.round(total * winrate);
            const losses = total - wins;
            map[key] = { total, wins, losses, winrate };
        }
    }
    return map;
}