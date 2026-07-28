// ============================================================
// js/draft/core/state.js
// ============================================================

import { getRating } from '../../ratings.js';
import { shuffleArray } from '../utils/helpers.js';
import { getHeroesList } from '../data/heroData.js';


// ============================================================
// ГЕНЕРАЦИЯ ФОРМЫ ИГРОКОВ
// ============================================================
//
// Форма:
//
// -3 = очень плохая
// -2 = плохая
// -1 = ниже нормы
//  0 = обычная
// +1 = хорошая
// +2 = отличная
// +3 = пиковая
//
// ВАЖНО:
// Форма создаётся один раз для конкретного состояния.
// При повторном вызове initAutoDraftState для того же турнира
// можно передать уже существующий playerForms.
// ============================================================

export function generatePlayerForm() {
    return Math.floor(
        Math.random() * 7
    ) - 3;
}


// ============================================================
// ПОЛУЧЕНИЕ ФОРМЫ ИГРОКА
// ============================================================

export function getPlayerForm(
    player,
    playerForms = {}
) {
    const value =
        Number(
            playerForms?.[player]
        );

    if (
        !Number.isFinite(value)
    ) {
        return 0;
    }

    return Math.max(
        -3,
        Math.min(
            3,
            value
        )
    );
}


// ============================================================
// СОЗДАНИЕ ФОРМЫ ДЛЯ СПИСКА ИГРОКОВ
// ============================================================

function buildPlayerForms(
    players,
    existingForms = {}
) {
    const forms = {
        ...existingForms
    };

    for (
        const player of players
    ) {
        if (
            !player ||
            player === 'Unknown'
        ) {
            continue;
        }

        if (
            forms[player] === undefined
        ) {
            forms[player] =
                generatePlayerForm();
        }
    }

    return forms;
}


// ============================================================
// СОЗДАНИЕ СОСТОЯНИЯ РУЧНОГО ДРАФТА
// ============================================================

export function initDraftState(
    teamA,
    teamB,
    bestOf
) {
    // --------------------------------------------------------
    // Пользовательская команда всегда Dire
    // --------------------------------------------------------

    const userTeam =
        teamA.isUser
            ? teamA
            : teamB;

    const opponentTeam =
        teamA.isUser
            ? teamB
            : teamA;

    const direTeam =
        userTeam;

    const radiantTeam =
        opponentTeam;


    // ========================================================
    // ROLE MAP
    // ========================================================

    const roleMap = {
        'carry':
            'carry',

        'mid':
            'mid',

        'offlane':
            'offlane',

        'semi-support':
            'semi',

        'full-support':
            'full'
    };


    // ========================================================
    // СОЗДАНИЕ MAP ИГРОКОВ ПО РОЛЯМ
    // ========================================================

    function buildPlayerMap(
        team
    ) {
        const players = {};

        const teamPlayers =
            Array.isArray(
                team.players
            )
                ? team.players
                : [];

        const roleKeys =
            Array.isArray(
                team.roleKeys
            )
                ? team.roleKeys
                : [];


        teamPlayers.forEach(
            (
                player,
                index
            ) => {

                const role =
                    roleMap[
                        roleKeys[index]
                    ] ||
                    roleKeys[index] ||
                    'unknown';


                players[role] =
                    player;
            }
        );


        return players;
    }


    const direPlayersMap =
        buildPlayerMap(
            direTeam
        );


    const radiantPlayersMap =
        buildPlayerMap(
            radiantTeam
        );


    // ========================================================
    // СПИСОК ВСЕХ ИГРОКОВ
    // ========================================================

    const allPlayers = [
        ...new Set([
            ...(
                Array.isArray(
                    direTeam.players
                )
                    ? direTeam.players
                    : []
            ),

            ...(
                Array.isArray(
                    radiantTeam.players
                )
                    ? radiantTeam.players
                    : []
            )
        ])
    ].filter(
        player =>
            player &&
            player !== 'Unknown'
    );


    // ========================================================
    // ФОРМА ИГРОКОВ
    // ========================================================

    const playerForms =
        buildPlayerForms(
            allPlayers
        );


    // ========================================================
    // РЕЙТИНГИ
    // ========================================================

    const playerRatings = {};


    for (
        const player of allPlayers
    ) {
        let rating =
            0;


        for (
            const role of [
                'carry',
                'mid',
                'offlane',
                'semi-support',
                'full-support'
            ]
        ) {
            const value =
                getRating(
                    player,
                    role
                );


            if (
                value !== null &&
                value !== undefined
            ) {
                rating =
                    Number(
                        value
                    );

                break;
            }
        }


        if (
            !Number.isFinite(
                rating
            ) ||
            rating <= 0
        ) {
            rating =
                80;
        }


        playerRatings[player] =
            rating;
    }


    // ========================================================
    // СИНЕРГИЯ
    // ========================================================

    const duoMap =
        generateDuoMap(
            allPlayers
        );


    // ========================================================
    // КОМАНДЫ ДРАФТА
    // ========================================================

    const draftTeams = {

        dire: {
            name:
                direTeam.name ||
                'Dire',

            players:
                direPlayersMap,

            side:
                'dire',

            isUser:
                true,

            roles: [
                'carry',
                'mid',
                'offlane',
                'semi',
                'full'
            ],

            roleLabels: {
                carry:
                    'Carry',

                mid:
                    'Mid',

                offlane:
                    'Offlane',

                semi:
                    'Semi-Supp',

                full:
                    'Full-Supp'
            }
        },


        radiant: {
            name:
                radiantTeam.name ||
                'Radiant',

            players:
                radiantPlayersMap,

            side:
                'radiant',

            isUser:
                false,

            roles: [
                'carry',
                'mid',
                'offlane',
                'semi',
                'full'
            ],

            roleLabels: {
                carry:
                    'Carry',

                mid:
                    'Mid',

                offlane:
                    'Offlane',

                semi:
                    'Semi-Supp',

                full:
                    'Full-Supp'
            }
        }
    };


    // ========================================================
    // ГЕРОИ
    // ========================================================

    const HEROES =
        getHeroesList();


    const playerHeroMap = {};
    const heroPlayerMap = {};
    const kalData = {};


    const loadedStats =
        window._heroStats ||
        {};


    // ========================================================
    // ГЕНЕРАЦИЯ HERO POOLS
    // ========================================================

    for (
        const player of allPlayers
    ) {

        if (
            loadedStats[player]
        ) {

            playerHeroMap[player] =
                {};


            for (
                const [
                    hero,
                    data
                ]
                of Object.entries(
                    loadedStats[player]
                )
            ) {

                playerHeroMap[player][hero] = {
                    total:
                        data.total,

                    winrate:
                        data.winrate
                };


                if (
                    !heroPlayerMap[hero]
                ) {
                    heroPlayerMap[hero] =
                        {};
                }


                heroPlayerMap[hero][player] = {
                    total:
                        data.total,

                    winrate:
                        data.winrate
                };


                if (
                    !kalData[player]
                ) {
                    kalData[player] =
                        {};
                }


                kalData[player][hero] =
                    data.kal ||
                    3.0;
            }

        } else {

            const shuffled =
                shuffleArray([
                    ...HEROES
                ]);


            const pool =
                shuffled.slice(
                    0,
                    12
                );


            playerHeroMap[player] =
                {};


            kalData[player] =
                {};


            for (
                const hero of pool
            ) {

                const total =
                    Math.floor(
                        Math.random() *
                        60
                    ) + 10;


                const winrate =
                    0.4 +
                    Math.random() *
                    0.4;


                playerHeroMap[player][hero] = {
                    total,

                    winrate
                };


                if (
                    !heroPlayerMap[hero]
                ) {
                    heroPlayerMap[hero] =
                        {};
                }


                heroPlayerMap[hero][player] = {
                    total,

                    winrate
                };


                kalData[player][hero] =
                    2 +
                    Math.random() *
                    5;
            }
        }
    }


    // ========================================================
    // ДОПОЛНЯЕМ ПУЛЫ, ЕСЛИ НЕТ ДАННЫХ
    // ========================================================

    for (
        const player of allPlayers
    ) {

        if (
            !playerHeroMap[player] ||
            Object.keys(
                playerHeroMap[player]
            ).length === 0
        ) {

            const shuffled =
                shuffleArray([
                    ...HEROES
                ]);


            const pool =
                shuffled.slice(
                    0,
                    12
                );


            playerHeroMap[player] =
                {};


            kalData[player] =
                {};


            for (
                const hero of pool
            ) {

                const total =
                    Math.floor(
                        Math.random() *
                        60
                    ) + 10;


                const winrate =
                    0.4 +
                    Math.random() *
                    0.4;


                playerHeroMap[player][hero] = {
                    total,

                    winrate
                };


                if (
                    !heroPlayerMap[hero]
                ) {
                    heroPlayerMap[hero] =
                        {};
                }


                heroPlayerMap[hero][player] = {
                    total,

                    winrate
                };


                kalData[player][hero] =
                    2 +
                    Math.random() *
                    5;
            }
        }
    }


    // ========================================================
    // SET ИГРОКОВ
    // ========================================================

    const draftPlayersSet =
        new Set(
            allPlayers
        );


    // ========================================================
    // СОСТОЯНИЕ ИГРЫ
    // ========================================================

    const pools = {};


    for (
        const player of allPlayers
    ) {
        pools[player] =
            Object.keys(
                playerHeroMap[player] ||
                {}
            );
    }


    const gameState = {

        pools,

        stats:
            playerHeroMap,

        bans: {
            dire:
                Array(
                    7
                ).fill(null),

            radiant:
                Array(
                    7
                ).fill(null)
        },

        picks: {
            dire: {
                carry:
                    null,

                mid:
                    null,

                offlane:
                    null,

                semi:
                    null,

                full:
                    null
            },

            radiant: {
                carry:
                    null,

                mid:
                    null,

                offlane:
                    null,

                semi:
                    null,

                full:
                    null
            }
        },

        pickedPlayers: {
            dire:
                [],

            radiant:
                []
        },

        usedHeroes:
            new Set(),

        currentStep:
            -1,

        waitingForUser:
            false,

        pickHeroPending:
            null,

        isFinished:
            false,

        lastGameResult:
            null
    };


    // ========================================================
    // ВОЗВРАТ СОСТОЯНИЯ
    // ========================================================

    return {

        teams:
            draftTeams,

        format:
            bestOf === 3
                ? 'bo3'
                : 'bo5',

        // БАЗОВЫЕ РЕЙТИНГИ
        playerRatings,

        // ФОРМА
        playerForms,

        playerHeroMap,

        heroPlayerMap,

        kalData,

        duoMap,

        draftPlayersSet,

        HEROES,

        games:
            [],

        currentGame:
            0,

        direWins:
            0,

        radiantWins:
            0,

        isFinished:
            false,

        winner:
            null,

        waitingForNext:
            false,

        lastGameResult:
            null,

        gameState,

        bestOf
    };
}


// ============================================================
// АВТОМАТИЧЕСКИЙ ДРАФТ
// ============================================================

export function initAutoDraftState(
    teamA,
    teamB,
    bestOf = 1,
    existingPlayerForms = null
) {

    // --------------------------------------------------------
    // Получаем игроков
    // --------------------------------------------------------

    function getPlayersArray(
        team
    ) {

        if (
            Array.isArray(
                team?.players
            )
        ) {
            return [
                ...team.players
            ];
        }


        if (
            team?.players &&
            typeof team.players ===
            'object'
        ) {

            const order = [
                'carry',
                'mid',
                'offlane',
                'semi',
                'full'
            ];


            return order
                .map(
                    role =>
                        team.players[role]
                )
                .filter(
                    player =>
                        player
                );
        }


        return [];
    }


    let teamAPlayers =
        getPlayersArray(
            teamA
        );


    let teamBPlayers =
        getPlayersArray(
            teamB
        );


    // --------------------------------------------------------
    // Заполняем неизвестных игроков
    // --------------------------------------------------------

    while (
        teamAPlayers.length < 5
    ) {
        teamAPlayers.push(
            'Unknown'
        );
    }


    while (
        teamBPlayers.length < 5
    ) {
        teamBPlayers.push(
            'Unknown'
        );
    }


    // --------------------------------------------------------
    // Роли
    // --------------------------------------------------------

    const defaultRoleKeys = [
        'carry',
        'mid',
        'offlane',
        'semi-support',
        'full-support'
    ];


    const teamARoleKeys =
        Array.isArray(
            teamA?.roleKeys
        )
            ? teamA.roleKeys
            : defaultRoleKeys;


    const teamBRoleKeys =
        Array.isArray(
            teamB?.roleKeys
        )
            ? teamB.roleKeys
            : defaultRoleKeys;


    // --------------------------------------------------------
    // Карта ролей
    // --------------------------------------------------------

    const roleMap = {

        'carry':
            'carry',

        'mid':
            'mid',

        'offlane':
            'offlane',

        'semi-support':
            'semi',

        'full-support':
            'full'
    };


    function buildPlayerMap(
        players,
        roleKeys
    ) {

        const map =
            {};


        players.forEach(
            (
                player,
                index
            ) => {

                if (
                    player === 'Unknown'
                ) {
                    return;
                }


                const role =
                    roleKeys[index] ||
                    'unknown';


                const mappedRole =
                    roleMap[role] ||
                    role;


                map[mappedRole] =
                    player;
            }
        );


        return map;
    }


    const direPlayersMap =
        buildPlayerMap(
            teamAPlayers,
            teamARoleKeys
        );


    const radiantPlayersMap =
        buildPlayerMap(
            teamBPlayers,
            teamBRoleKeys
        );


    // --------------------------------------------------------
    // Все игроки
    // --------------------------------------------------------

    const allPlayers = [
        ...new Set([
            ...teamAPlayers,
            ...teamBPlayers
        ])
    ].filter(
        player =>
            player &&
            player !== 'Unknown'
    );


    // --------------------------------------------------------
    // Форма
    //
    // Если форма уже существует — сохраняем её.
    // Иначе генерируем один раз.
    // --------------------------------------------------------

    const playerForms =
        buildPlayerForms(
            allPlayers,
            existingPlayerForms ||
            {}
        );


    // --------------------------------------------------------
    // Базовые рейтинги
    // --------------------------------------------------------

    const playerRatings =
        {};


    for (
        const player of allPlayers
    ) {

        let rating =
            0;


        for (
            const role of [
                'carry',
                'mid',
                'offlane',
                'semi-support',
                'full-support'
            ]
        ) {

            const value =
                getRating(
                    player,
                    role
                );


            if (
                value !== null &&
                value !== undefined
            ) {

                rating =
                    Number(
                        value
                    );

                break;
            }
        }


        if (
            !Number.isFinite(
                rating
            ) ||
            rating <= 0
        ) {
            rating =
                80;
        }


        playerRatings[player] =
            rating;
    }


    // --------------------------------------------------------
    // Синергия
    // --------------------------------------------------------

    const duoMap =
        generateDuoMap(
            allPlayers
        );


    // --------------------------------------------------------
    // Команды
    // --------------------------------------------------------

    const draftTeams = {

        dire: {

            name:
                teamA.name ||
                'Dire',

            players:
                direPlayersMap,

            side:
                'dire',

            isUser:
                teamA.isUser ||
                false,

            roles: [
                'carry',
                'mid',
                'offlane',
                'semi',
                'full'
            ],

            roleLabels: {

                carry:
                    'Carry',

                mid:
                    'Mid',

                offlane:
                    'Offlane',

                semi:
                    'Semi-Supp',

                full:
                    'Full-Supp'
            }
        },


        radiant: {

            name:
                teamB.name ||
                'Radiant',

            players:
                radiantPlayersMap,

            side:
                'radiant',

            isUser:
                teamB.isUser ||
                false,

            roles: [
                'carry',
                'mid',
                'offlane',
                'semi',
                'full'
            ],

            roleLabels: {

                carry:
                    'Carry',

                mid:
                    'Mid',

                offlane:
                    'Offlane',

                semi:
                    'Semi-Supp',

                full:
                    'Full-Supp'
            }
        }
    };


    // --------------------------------------------------------
    // Герои
    // --------------------------------------------------------

    const HEROES =
        getHeroesList();


    const playerHeroMap =
        {};


    const heroPlayerMap =
        {};


    const kalData =
        {};


    const loadedStats =
        window._heroStats ||
        {};


    for (
        const player of allPlayers
    ) {

        if (
            loadedStats[player]
        ) {

            playerHeroMap[player] =
                {};


            for (
                const [
                    hero,
                    data
                ]
                of Object.entries(
                    loadedStats[player]
                )
            ) {

                playerHeroMap[player][hero] = {
                    total:
                        data.total,

                    winrate:
                        data.winrate
                };


                if (
                    !heroPlayerMap[hero]
                ) {
                    heroPlayerMap[hero] =
                        {};
                }


                heroPlayerMap[hero][player] = {
                    total:
                        data.total,

                    winrate:
                        data.winrate
                };


                if (
                    !kalData[player]
                ) {
                    kalData[player] =
                        {};
                }


                kalData[player][hero] =
                    data.kal ||
                    3.0;
            }

        } else {

            const shuffled =
                shuffleArray([
                    ...HEROES
                ]);


            const pool =
                shuffled.slice(
                    0,
                    12
                );


            playerHeroMap[player] =
                {};


            kalData[player] =
                {};


            for (
                const hero of pool
            ) {

                const total =
                    Math.floor(
                        Math.random() *
                        60
                    ) + 10;


                const winrate =
                    0.4 +
                    Math.random() *
                    0.4;


                playerHeroMap[player][hero] = {
                    total,

                    winrate
                };


                if (
                    !heroPlayerMap[hero]
                ) {
                    heroPlayerMap[hero] =
                        {};
                }


                heroPlayerMap[hero][player] = {
                    total,

                    winrate
                };


                kalData[player][hero] =
                    2 +
                    Math.random() *
                    5;
            }
        }
    }


    // --------------------------------------------------------
    // Пулы
    // --------------------------------------------------------

    const draftPlayersSet =
        new Set(
            allPlayers
        );


    const pools =
        {};


    for (
        const player of allPlayers
    ) {

        pools[player] =
            Object.keys(
                playerHeroMap[player] ||
                {}
            );
    }


    // --------------------------------------------------------
    // Game State
    // --------------------------------------------------------

    const gameState = {

        pools,

        stats:
            playerHeroMap,

        bans: {

            dire:
                Array(
                    7
                ).fill(null),

            radiant:
                Array(
                    7
                ).fill(null)
        },

        picks: {

            dire: {

                carry:
                    null,

                mid:
                    null,

                offlane:
                    null,

                semi:
                    null,

                full:
                    null
            },

            radiant: {

                carry:
                    null,

                mid:
                    null,

                offlane:
                    null,

                semi:
                    null,

                full:
                    null
            }
        },

        pickedPlayers: {

            dire:
                [],

            radiant:
                []
        },

        usedHeroes:
            new Set(),

        currentStep:
            -1,

        waitingForUser:
            false,

        pickHeroPending:
            null,

        isFinished:
            false,

        lastGameResult:
            null
    };


    // --------------------------------------------------------
    // Возвращаем состояние
    // --------------------------------------------------------

    return {

        teams:
            draftTeams,

        format:
            bestOf === 3
                ? 'bo3'
                : 'bo5',

        playerRatings,

        playerForms,

        playerHeroMap,

        heroPlayerMap,

        kalData,

        duoMap,

        draftPlayersSet,

        HEROES,

        games:
            [],

        currentGame:
            0,

        direWins:
            0,

        radiantWins:
            0,

        isFinished:
            false,

        winner:
            null,

        waitingForNext:
            false,

        lastGameResult:
            null,

        gameState,

        bestOf
    };
}


// ============================================================
// ГЕНЕРАЦИЯ DUO MAP
// ============================================================

function generateDuoMap(
    players
) {

    const map =
        {};


    for (
        let i = 0;
        i < players.length;
        i++
    ) {

        for (
            let j = i + 1;
            j < players.length;
            j++
        ) {

            const p1 =
                players[i];


            const p2 =
                players[j];


            const key =
                [
                    p1,
                    p2
                ]
                    .sort()
                    .join(
                        ', '
                    );


            if (
                map[key]
            ) {
                continue;
            }


            const winrate =
                0.45 +
                Math.random() *
                0.2;


            const total =
                Math.floor(
                    Math.random() *
                    130
                ) + 20;


            const wins =
                Math.round(
                    total *
                    winrate
                );


            const losses =
                total -
                wins;


            map[key] = {

                total,

                wins,

                losses,

                winrate
            };
        }
    }


    return map;
}