// ============================================================
// roleData.js
// Списки игроков по ролям на основе ratings.js
// ============================================================

import { hasRating, getRating } from './ratings.js';

export const rolePlayers = {
    'carry': [
        "Yatoro", "Satanic", "Miracle-", "MiCKe", "DyrachYO",
        "Ame", "Pure", "RAMZES666", "skiter", "Nightfall",
        "Watson", "XBOCT", "Arteezy", "Crystallis", "Parker",
        "Timado", "Monet", "TA2000", "23savage", "MATUMBAMAN",
        "Kiritych~", "Smiling Knight", "Shiro", "gotthejuice", "Pakazs"
    ],
    'mid': [
        "Nisha", "Malr1ne", "Gpk", "bzm", "Noone",
        "Larl", "SumaiL", "NothingToSay", "CHIRA JUNIOR", "Quinn",
        "kiyotaka", "MidOne", "Dendi", "Abed", "Lorenof",
        "Yopaj", "Darkmago", "4nalog", "Topson", "Stormstormer",
        "W33"
    ],
    'offlane': [
        "ATF", "Collapse", "Zai", "MinD ContRoL", "S4",
        "Faith bian", "33", "DM", "Ace", "Daxak",
        "MieRo'", "Resolut1on", "TORONTOTOKYO", "Funn1k", "SabeRLight-",
        "Noticed", "Wisper", "BOOM", "No!ob", "Jabz",
        "Davai Lama"
    ],
    'semi-support': [
        "YapzOr", "Save-", "Nine", "Cr1t-", "9Class",
        "tOfu", "Boxi", "XinQ", "GH", "Saksa",
        "rue", "Mira", "RodjER", "Zayac", "Antares",
        "Thiolicor", "Tims", "Scofield", "OmaR", "PlAnet"
    ],
    'full-support': [
        "Puppey", "KuroKy", "Sneyking", "Miposhka", "Solo",
        "INSaNiA", "Y`", "Ppd", "Whitemon", "Kataomi",
        "Seleri", "Dukalis", "Kaori", "Malady", "Fly",
        "SoNNeikO", "Tobi", "XNova", "Matthew", "Fng",
        "pantomem", "Jaunuel"
    ]
};

export const CORE_ROLES = ['carry', 'mid', 'offlane'];
export const SUPPORT_ROLES = ['semi-support', 'full-support'];
export const STEP_ORDER = ['carry', 'mid', 'offlane', 'semi-support', 'full-support'];
export const ROLE_LABELS = {
    'carry': 'Carry',
    'mid': 'Mid',
    'offlane': 'Offlane',
    'semi-support': 'Semi-Support',
    'full-support': 'Full-Support'
};

/**
 * Возвращает роль игрока (первую, где он найден)
 */
export function getPlayerRole(player) {
    for (const role of STEP_ORDER) {
        if (rolePlayers[role] && rolePlayers[role].includes(player)) {
            return ROLE_LABELS[role];
        }
    }
    return 'Unknown';
}

/**
 * Возвращает список игроков для роли, у которых есть рейтинг, отсортированный по убыванию рейтинга
 */
export function getFilteredPlayers(roleKey) {
    const all = rolePlayers[roleKey] || [];
    const withRating = all.filter(player => hasRating(player, roleKey));
    return withRating.sort((a, b) => {
        const ra = getRating(a, roleKey) || 0;
        const rb = getRating(b, roleKey) || 0;
        return rb - ra;
    });
}

export function getPlayerRating(player, roleKey) {
    return getRating(player, roleKey);
}