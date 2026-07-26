// ============================================================
// ratings.js
// Личные рейтинги игроков по ролям (все 5 ролей)
// ============================================================

export const ratings = {
    'carry': {
        'Yatoro': 90,
        'Satanic': 88,
        'Miracle-': 87,
        'MiCKe': 86,
        'DyrachYO': 85,
        'Ame': 85,
        'Pure': 85,
        'RAMZES666': 84,
        'skiter': 80,
        'Nightfall': 83,
        'Watson': 82,
        'XBOCT': 82,
        'Arteezy': 81,
        'Crystallis': 80,
        'Parker': 83,
        'Timado': 78,

        'Monet': 82,
        'TA2000': 78,
        '23savage': 77,
        'MATUMBAMAN': 85,
        'Kiritych~': 76,
        'Smiling Knight': 79,
        'Shiro': 78,
        'gotthejuice': 78,
        'Pakazs': 77
        
        
    },
    'mid': {
        'Nisha': 89,
        'Malr1ne': 88,
        'Gpk': 87,
        'bzm': 87,
        'Noone': 86,
        'Larl': 85,
        'SumaiL': 85,
        'NothingToSay': 84,
        'CHIRA JUNIOR': 84,
        'Quinn': 83,
        'kiyotaka': 82,
        'MidOne': 82,
        'Dendi': 81,
        'Abed': 80,
        'Lorenof': 79,
        'Yopaj': 78,

        'Darkmago': 77,
        '4nalog': 81,
        'Topson': 88,
        'Stormstormer': 84,
        'W33': 83

    },
    'offlane': {
        'ATF': 89,
        'Collapse': 89,
        'Zai': 88,
        'MinD ContRoL': 87,
        'S4': 86,
        'Faith bian': 86,
        '33': 87,
        'DM': 84,
        'Ace': 80,
        'Daxak': 83,
        "MieRo'": 83,
        'Resolut1on': 83,
        'TORONTOTOKYO': 82,
        'Funn1k': 81,
        'SabeRLight-': 80,
        'Noticed': 79,

        'Wisper': 82,
        'BOOM': 81,
        'No!ob': 83,
        'Jabz': 78,
        'Davai Lama': 79

    },
    'semi-support': {
        'YapzOr': 88,
        'Save-': 87,
        'Nine': 86,
        'Cr1t-': 85,
        '9Class': 85,
        'tOfu': 84,
        'Boxi': 84,
        'XinQ': 83,
        'GH': 84,
        'Saksa': 82,          // добавлен
        'rue': 82,
        'Mira': 82,
        'RodjER': 81,
        'Zayac': 80,
        'Antares': 79,
        'Thiolicor': 78,

        'Tims': 79,
        'Scofield': 82,
        'OmaR': 81,
        'PlAnet': 80

    },
    'full-support': {
        'Puppey': 89,
        'KuroKy': 89,
        'Sneyking': 87,
        'Miposhka': 86,
        'Solo': 85,
        'INSaNiA': 85,
        "Y`": 84,
        'Ppd': 84,
        'Whitemon': 84,
        'Kataomi': 83,
        'Seleri': 83,
        'Dukalis': 82,
        'Kaori': 82,
        'Malady': 81,
        'Fly': 84,
        'SoNNeikO': 79,

        'Tobi': 84,
        'XNova': 82,
        'Matthew': 84,
        'Fng': 81,
        'pantomem': 81,
        'Jaunuel': 79
    }
};

/**
 * Проверяет, есть ли у игрока рейтинг для указанной роли
 */
export function hasRating(player, roleKey) {
    return ratings[roleKey] && ratings[roleKey][player] !== undefined;
}

/**
 * Возвращает рейтинг игрока для роли (или null)
 */
export function getRating(player, roleKey) {
    if (ratings[roleKey] && ratings[roleKey][player] !== undefined) {
        return ratings[roleKey][player];
    }
    return null;
}

/**
 * Возвращает Set всех имён игроков, у которых есть рейтинг в любой роли
 */
export function getAllPlayerNames() {
    const names = new Set();
    for (const role in ratings) {
        for (const player in ratings[role]) {
            names.add(player);
        }
    }
    return names;
}