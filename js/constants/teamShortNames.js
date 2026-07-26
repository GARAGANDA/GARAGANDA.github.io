// ============================================================
// teamShortNames.js
// Полные названия команд -> короткие названия
// ============================================================

export const teamShortNames = {
    'Team Falcons': 'Falcons',
    'Team Spirit': 'Spirit',
    'LGD Gaming': 'LGD',
    'Gaimin Gladiators': 'GG',
    'PARIVISION': 'PVISION',
    'Tundra Esports': 'Tundra',
    'Nigma Galaxy': 'Nigma',
    'Team Liquid': 'Liquid',
    '9Pandas': '9Pandas',
    'BetBoom Team': 'BetBoom',
    'Aurora Gaming': 'Aurora',
    'Virtus.pro': 'VP',
    'Team Secret': 'Secret',
    'Team Yandex': 'Yandex',
    'Shopify Rebellion': 'Shopify',
    'Natus Vincere': 'NAVI'
};


// ============================================================
// Получить короткое название команды
// ============================================================

export function getTeamShortName(teamName) {
    if (!teamName) {
        return '';
    }

    return teamShortNames[teamName] || teamName;
}


// ============================================================
// Совместимость со старым кодом
//
// У тебя results.js раньше использовал:
// getShortName()
//
// Поэтому оставляем оба варианта.
// ============================================================

export function getShortName(teamName) {
    return getTeamShortName(teamName);
}