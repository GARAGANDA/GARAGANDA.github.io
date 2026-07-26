// ============================================================
// js/teamLogo.js
// Загружает логотип команды из отдельного файла images/{shortName}.png
// ============================================================

import { getTeamShortName } from '../constants/teamShortNames.js';

// Маппинг коротких имён на имена файлов (если отличаются)
const fileMap = {
    'Falcons': 'Falcons',
    'Spirit': 'Spirit',
    'LGD': 'LGD',
    'GG': 'GG',
    'PVISION': 'PARIVISION',
    'Tundra': 'Tundra',
    'Nigma': 'Nigma',
    'Liquid': 'liquid',
    '9Pandas': '9pandas',
    'BetBoom': 'BB',
    'Aurora': 'Aurora',
    'VP': 'VP',
    'Secret': 'secret',
    'Yandex': 'yandex',
    'Shopify': 'shopify',
    'NAVI': 'navi',
    // Специальный логотип для команды пользователя
    'user': 'user'
};

export function getTeamLogo(teamName, options = {}) {
    const shortName = getTeamShortName(teamName);
    const size = options.size || 'medium';
    const className = options.className || '';
    const title = teamName || 'Unknown';
    
    // Если это команда пользователя – используем специальный логотип
    const isUser = options.isUser || (teamName === '322 Team');
    const logoKey = isUser ? 'user' : shortName;

    // Если ключ не найден – заглушка
    if (!logoKey || !fileMap[logoKey]) {
        return `
            <span 
                class="team-logo team-logo--unknown team-logo--${size} ${className}" 
                title="${title}"
            ></span>
        `;
    }

    const fileName = fileMap[logoKey];
    const src = `images/${fileName}.png`;

    return `
        <img 
            src="${src}" 
            alt="${title}" 
            class="team-logo team-logo--${size} ${className}" 
            title="${title}" 
        />
    `;
}