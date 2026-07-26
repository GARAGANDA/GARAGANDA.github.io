// ============================================================
// js/core/matchSimulation.js
// ============================================================

import { calculateSynergyBonus } from '../synergyCalculator.js';
import { getRating } from '../ratings.js';

export function getSynergyBonus(teamPlayers, duoMap) {
    // Приводим teamPlayers к массиву
    let playersArray;
    if (Array.isArray(teamPlayers)) {
        playersArray = teamPlayers;
    } else if (teamPlayers && typeof teamPlayers === 'object') {
        // Если это объект {carry: ..., mid: ..., ...}, берём значения в порядке ролей
        const order = ['carry', 'mid', 'offlane', 'semi', 'full'];
        playersArray = order.map(role => teamPlayers[role]).filter(p => p);
    } else {
        return 0;
    }
    const result = calculateSynergyBonus(playersArray, duoMap);
    return result.totalBonus;
}

export function getTeamPower(teamPlayers, roleKeys, ratings, duoMap) {
    // Приводим teamPlayers к массиву
    let playersArray;
    if (Array.isArray(teamPlayers)) {
        playersArray = teamPlayers;
    } else if (teamPlayers && typeof teamPlayers === 'object') {
        const order = ['carry', 'mid', 'offlane', 'semi', 'full'];
        playersArray = order.map(role => teamPlayers[role]).filter(p => p);
    } else {
        return 0;
    }

    // Приводим roleKeys к массиву (если передан объект, берём значения)
    let keys = Array.isArray(roleKeys) ? roleKeys : ['carry', 'mid', 'offlane', 'semi-support', 'full-support'];

    let totalRating = 0;
    playersArray.forEach((player, idx) => {
        const roleKey = keys[idx] || keys[0];
        const rating = getRating(player, roleKey);
        totalRating += rating || 0;
    });
    const avgRating = totalRating / playersArray.length;

    // Бонус синергии
    const synergy = getSynergyBonus(playersArray, duoMap);

    return avgRating + synergy;
}