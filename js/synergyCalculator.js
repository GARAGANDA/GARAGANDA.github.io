// ============================================================
// synergyCalculator.js
// Расчёт синергии команды по парам игроков.
//
// ВАЖНО:
// - Синергия считается только по duoMap.
// - Формула расчёта сохранена.
// - totalBonus — итоговый бонус команды.
// - groups[].bonus — вклад каждой duo-связи.
// - playerContributions — отрицательный вклад игроков Not Syn.
// - Сумма отображаемых вкладов теперь точно совпадает
//   с totalBonus после округления до 2 знаков.
// ============================================================


// ============================================================
// ПОИСК ПАРЫ В MAP
// ============================================================

export function findInMap(map, names) {
    if (
        !map ||
        !names ||
        !Array.isArray(names) ||
        names.length === 0
    ) {
        return null;
    }

    const cleanNames = names
        .map(name => (
            typeof name === 'string'
                ? name.trim()
                : name
        ))
        .filter(Boolean);

    if (cleanNames.length !== names.length) {
        return null;
    }

    // --------------------------------------------------------
    // 1. Прямой порядок
    // Например:
    // "Nisha, Ace"
    // --------------------------------------------------------

    const directKey = cleanNames.join(', ');

    if (map[directKey] !== undefined) {
        return map[directKey];
    }


    // --------------------------------------------------------
    // 2. Обратный порядок для пары
    // "Ace, Nisha"
    // --------------------------------------------------------

    if (cleanNames.length === 2) {
        const reverseKey = [
            cleanNames[1],
            cleanNames[0]
        ].join(', ');

        if (map[reverseKey] !== undefined) {
            return map[reverseKey];
        }
    }


    // --------------------------------------------------------
    // 3. Fallback:
    // поиск независимо от порядка имён
    // --------------------------------------------------------

    const target = new Set(cleanNames);

    for (const [key, value] of Object.entries(map)) {

        const keyNames = String(key)
            .split(',')
            .map(name => name.trim());

        if (
            keyNames.length !==
            cleanNames.length
        ) {
            continue;
        }

        if (
            keyNames.every(
                name => target.has(name)
            )
        ) {
            return value;
        }
    }

    return null;
}


// ============================================================
// НАСТРОЙКИ СИНЕРГИИ
// ============================================================

const SYNERGY_CONFIG = {

    // Максимальный бонус одной пары
    MAX_PAIR_BONUS: 1.10,

    // Приблизительно после этого количества игр
    // пара выходит на высокую степень синергии
    SATURATION_GAMES: 100,

    // Штраф игроку без синергии
    NO_SYNERGY_PLAYER_PENALTY: 0.12,

    // Максимальный общий бонус
    MAX_TOTAL_BONUS: 4.0,

    // Максимальный общий штраф
    MAX_TOTAL_PENALTY: -0.6

};


// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

function round2(value) {
    return Number(
        Number(value || 0).toFixed(2)
    );
}


function clamp(
    value,
    min,
    max
) {
    return Math.max(
        min,
        Math.min(max, value)
    );
}


// ============================================================
// БОНУС ОДНОЙ ПАРЫ
// ============================================================

function calculatePairBonus(totalGames) {

    const games =
        Number(totalGames);

    if (
        !Number.isFinite(games) ||
        games <= 0
    ) {
        return 0;
    }

    /*
     * Сохраняем исходную формулу:
     *
     * progress =
     * 1 - exp(-games / SATURATION_GAMES)
     *
     * bonus =
     * MAX_PAIR_BONUS * progress
     */

    const progress =
        1 -
        Math.exp(
            -games /
            SYNERGY_CONFIG.SATURATION_GAMES
        );

    return (
        SYNERGY_CONFIG.MAX_PAIR_BONUS *
        progress
    );
}


// ============================================================
// РАСПРЕДЕЛЕНИЕ ОКРУГЛЕНИЯ
//
// Например:
//
// raw:
// 0.543
// 0.643
// 0.124
//
// после обычного округления:
//
// 0.54
// 0.64
// 0.12
//
// Если итог должен быть 1.31,
// а сумма отображаемых значений 1.30,
// последняя строка получает +0.01.
//
// Это позволяет гарантировать:
//
// SUM(groups[].bonus)
// + SUM(playerContributions)
// === totalBonus
// ============================================================

function distributeRoundingDifference(
    groups,
    targetTotal
) {

    if (
        !Array.isArray(groups) ||
        groups.length === 0
    ) {
        return;
    }

    let currentTotal =
        groups.reduce(
            (sum, group) => {
                return (
                    sum +
                    Number(group.bonus || 0)
                );
            },
            0
        );

    currentTotal =
        round2(currentTotal);

    let difference =
        round2(
            targetTotal -
            currentTotal
        );

    if (
        difference === 0
    ) {
        return;
    }


    /*
     * Корректируем последнюю группу.
     *
     * Это минимальное изменение,
     * которое необходимо только из-за
     * округления до двух знаков.
     */

    const lastIndex =
        groups.length - 1;

    groups[lastIndex].bonus =
        round2(
            Number(
                groups[lastIndex].bonus || 0
            ) +
            difference
        );

    groups[lastIndex].roundingCorrection =
        difference;
}


// ============================================================
// РАСЧЁТ СИНЕРГИИ
// ============================================================

export function calculateSynergyBonus(
    players,
    duoMap
) {

    // --------------------------------------------------------
    // Проверка входных данных
    // --------------------------------------------------------

    if (
        !Array.isArray(players) ||
        players.length === 0
    ) {
        return {
            totalBonus: 0,
            groups: [],
            playerContributions: {}
        };
    }


    // --------------------------------------------------------
    // Нормализуем игроков
    // --------------------------------------------------------

    const normalizedPlayers =
        players
            .map(player => {

                if (
                    typeof player === 'string'
                ) {
                    return player.trim();
                }

                if (
                    player &&
                    typeof player.name === 'string'
                ) {
                    return player.name.trim();
                }

                return null;

            })
            .filter(Boolean);


    // --------------------------------------------------------
    // Убираем дубликаты игроков
    // --------------------------------------------------------

    const teamPlayers =
        [
            ...new Set(
                normalizedPlayers
            )
        ].slice(0, 5);


    // --------------------------------------------------------
    // Если игроков нет
    // --------------------------------------------------------

    if (
        teamPlayers.length === 0
    ) {
        return {
            totalBonus: 0,
            groups: [],
            playerContributions: {}
        };
    }


    // --------------------------------------------------------
    // Если только один игрок
    // --------------------------------------------------------

    if (
        teamPlayers.length === 1
    ) {

        const penalty =
            -SYNERGY_CONFIG
                .NO_SYNERGY_PLAYER_PENALTY;

        return {
            totalBonus:
                round2(penalty),

            groups: [],

            playerContributions: {
                [teamPlayers[0]]:
                    round2(penalty)
            }
        };
    }


    // ========================================================
    // ПОИСК ВСЕХ DUO-ПАР
    // ========================================================

    const allGroups = [];

    const playersWithSynergy =
        new Set();

    /*
     * Сумма сырых бонусов всех пар.
     */
    let rawPairBonusTotal = 0;


    for (
        let i = 0;
        i < teamPlayers.length;
        i++
    ) {

        for (
            let j = i + 1;
            j < teamPlayers.length;
            j++
        ) {

            const playerA =
                teamPlayers[i];

            const playerB =
                teamPlayers[j];


            // Ищем данные пары
            const data =
                findInMap(
                    duoMap,
                    [
                        playerA,
                        playerB
                    ]
                );


            if (!data) {
                continue;
            }


            // Количество игр вместе
            const totalGames =
                Number(data.total) || 0;


            if (
                totalGames <= 0
            ) {
                continue;
            }


            // Бонус пары
            const pairBonus =
                calculatePairBonus(
                    totalGames
                );


            if (
                pairBonus <= 0
            ) {
                continue;
            }


            // Отмечаем обоих игроков
            // как имеющих синергию
            playersWithSynergy.add(
                playerA
            );

            playersWithSynergy.add(
                playerB
            );


            // Добавляем к общей сумме сырых пар
            rawPairBonusTotal +=
                pairBonus;


            // Сохраняем группу
            allGroups.push({

                type: 'duo',

                players: [
                    playerA,
                    playerB
                ],

                total:
                    totalGames,

                rawBonus:
                    pairBonus,

                winrate:
                    data.winrate,

                key:
                    [
                        playerA,
                        playerB
                    ]
                    .sort()
                    .join(', ')

            });
        }
    }


    // ========================================================
    // ИГРОКИ БЕЗ СИНЕРГИИ
    // ========================================================

    const playersWithoutSynergy =
        teamPlayers.filter(
            player =>
                !playersWithSynergy
                    .has(player)
        );


    // ========================================================
    // ШТРАФ ЗА NOT SYN
    // ========================================================

    const noSynergyPenalty =
        playersWithoutSynergy.length *
        SYNERGY_CONFIG
            .NO_SYNERGY_PLAYER_PENALTY;


    // ========================================================
    // НОРМАЛИЗАЦИЯ ПЛОТНОСТИ ПАР
    // ========================================================

    const pairCount =
        allGroups.length;


    const possiblePairs =
        (
            teamPlayers.length *
            (
                teamPlayers.length - 1
            )
        ) / 2;


    let pairContribution =
        rawPairBonusTotal;


    if (
        possiblePairs > 0
    ) {

        const density =
            pairCount /
            possiblePairs;


        const compression =
            0.72 -
            density * 0.34;


        pairContribution *=
            Math.max(
                0.38,
                compression
            );
    }


    // ========================================================
    // БОНУС ЗА ПЛОТНОСТЬ СВЯЗЕЙ
    // ========================================================

    const densityBonus =
        (
            pairCount /
            Math.max(
                possiblePairs,
                1
            )
        ) *
        0.45;


    // ========================================================
    // ОБЩИЙ БОНУС ДО МАСШТАБИРОВАНИЯ
    // ========================================================

    let totalBonus =
        pairContribution +
        densityBonus -
        noSynergyPenalty;


    // ========================================================
    // ЕСЛИ КОМАНДА НЕПОЛНАЯ
    // ========================================================

    if (
        teamPlayers.length < 5
    ) {

        totalBonus *=
            teamPlayers.length /
            5;
    }


    // ========================================================
    // ОГРАНИЧЕНИЕ ОБЩЕГО БОНУСА
    // ========================================================

    totalBonus =
        clamp(
            totalBonus,
            SYNERGY_CONFIG
                .MAX_TOTAL_PENALTY,
            SYNERGY_CONFIG
                .MAX_TOTAL_BONUS
        );


    // ========================================================
    // ОКРУГЛЯЕМ ИТОГ
    // ========================================================

    totalBonus =
        round2(
            totalBonus
        );


    // ========================================================
    // РАСЧЁТ ВКЛАДОВ ИГРОКОВ
    // ========================================================

    const playerContributions = {};


    /*
     * Сначала добавляем Not Syn.
     *
     * Эти значения отображаются в pentagon.js
     * отдельными отрицательными строками.
     */

    playersWithoutSynergy
        .forEach(player => {

            playerContributions[player] =
                round2(
                    -SYNERGY_CONFIG
                        .NO_SYNERGY_PLAYER_PENALTY
                );

        });


    // ========================================================
    // РАСПРЕДЕЛЕНИЕ ОБЩЕГО БОНУСА
    // ========================================================

    /*
     * ВАЖНО:
     *
     * Раньше здесь было:
     *
     * normalizedBonus =
     * (rawBonus / rawPairBonusTotal)
     * * pairTotal
     *
     * После округления каждой пары
     * сумма groups[].bonus могла отличаться
     * от totalBonus.
     *
     * Теперь распределяем итоговую сумму
     * с учётом штрафов и масштаба неполной команды.
     *
     * Сначала определяем сумму,
     * которая должна приходиться на положительные пары.
     */

    const positiveTarget =
        round2(
            totalBonus -
            Object.values(
                playerContributions
            )
            .reduce(
                (sum, value) =>
                    sum +
                    Number(value || 0),
                0
            )
        );


    // ========================================================
    // ЕСЛИ ЕСТЬ ПАРЫ
    // ========================================================

    if (
        allGroups.length > 0 &&
        rawPairBonusTotal > 0
    ) {

        /*
         * Распределяем positiveTarget
         * пропорционально rawBonus каждой пары.
         */

        allGroups.forEach(group => {

            const ratio =
                group.rawBonus /
                rawPairBonusTotal;


            group.normalizedBonus =
                positiveTarget *
                ratio;

        });


        /*
         * Округляем каждую строку.
         */

        allGroups.forEach(group => {

            group.normalizedBonus =
                round2(
                    group.normalizedBonus
                );

        });


        /*
         * Контроль:
         *
         * сумма пар должна быть
         * ровно positiveTarget.
         */

        distributeRoundingDifference(
            allGroups.map(group => ({
                bonus:
                    group.normalizedBonus
            })),
            positiveTarget
        );


        /*
         * ВАЖНО:
         *
         * map() выше создавал новые объекты.
         * Поэтому корректируем непосредственно
         * исходные allGroups.
         */

        let roundedPairsTotal =
            allGroups.reduce(
                (sum, group) => {

                    return (
                        sum +
                        Number(
                            group.normalizedBonus || 0
                        )
                    );

                },
                0
            );


        roundedPairsTotal =
            round2(
                roundedPairsTotal
            );


        const pairDifference =
            round2(
                positiveTarget -
                roundedPairsTotal
            );


        if (
            pairDifference !== 0
        ) {

            const lastIndex =
                allGroups.length - 1;


            allGroups[lastIndex]
                .normalizedBonus =
                    round2(
                        Number(
                            allGroups[lastIndex]
                                .normalizedBonus || 0
                        ) +
                        pairDifference
                    );

        }

    } else {

        /*
         * Если пар нет,
         * положительный вклад отсутствует.
         */

        allGroups.forEach(group => {

            group.normalizedBonus = 0;

        });

    }


    // ========================================================
    // ПОДГОТОВКА GROUPS ДЛЯ PENTAGON.JS
    // ========================================================

    const groups =
        allGroups.map(group => ({

            ...group,

            /*
             * Pentagon.js использует:
             *
             * g.bonus
             */

            bonus:
                round2(
                    group.normalizedBonus
                )

        }));


    // ========================================================
    // ФИНАЛЬНАЯ КОРРЕКЦИЯ
    //
    // Гарантируем:
    //
    // SUM(groups[].bonus)
    // +
    // SUM(playerContributions)
    // =
    // totalBonus
    // ========================================================

    let displayedTotal =
        groups.reduce(
            (sum, group) => {

                return (
                    sum +
                    Number(
                        group.bonus || 0
                    )
                );

            },
            0
        );


    displayedTotal =
        displayedTotal +
        Object.values(
            playerContributions
        )
        .reduce(
            (sum, value) =>
                sum +
                Number(value || 0),
            0
        );


    displayedTotal =
        round2(
            displayedTotal
        );


    let finalDifference =
        round2(
            totalBonus -
            displayedTotal
        );


    /*
     * Если разница возникла из-за округления,
     * добавляем её в последнюю duo-пару.
     */

    if (
        finalDifference !== 0
    ) {

        if (
            groups.length > 0
        ) {

            const lastIndex =
                groups.length - 1;


            groups[lastIndex].bonus =
                round2(
                    Number(
                        groups[lastIndex]
                            .bonus || 0
                    ) +
                    finalDifference
                );


            groups[lastIndex]
                .roundingCorrection =
                    finalDifference;

        } else if (
            playersWithoutSynergy.length > 0
        ) {

            /*
             * Если пар вообще нет,
             * корректируем последний Not Syn.
             */

            const lastPlayer =
                playersWithoutSynergy[
                    playersWithoutSynergy.length - 1
                ];


            playerContributions[
                lastPlayer
            ] =
                round2(
                    Number(
                        playerContributions[
                            lastPlayer
                        ] || 0
                    ) +
                    finalDifference
                );

        }

    }


    // ========================================================
    // ФИНАЛЬНАЯ ПРОВЕРКА
    // ========================================================

    const groupsTotal =
        round2(
            groups.reduce(
                (sum, group) =>
                    sum +
                    Number(
                        group.bonus || 0
                    ),
                0
            )
        );


    const playerContributionsTotal =
        round2(
            Object.values(
                playerContributions
            )
            .reduce(
                (sum, value) =>
                    sum +
                    Number(value || 0),
                0
            )
        );


    const calculatedDisplayTotal =
        round2(
            groupsTotal +
            playerContributionsTotal
        );


    // ========================================================
    // ВОЗВРАТ РЕЗУЛЬТАТА
    // ========================================================

    return {

        /*
         * Главный итог.
         *
         * Используется в:
         * - pentagon.js
         * - matchSimulation.js
         * - teamGenerator.js
         */

        totalBonus,


        /*
         * Список duo-групп.
         *
         * Pentagon.js использует:
         * g.players
         * g.type
         * g.total
         * g.winrate
         * g.bonus
         */

        groups,


        /*
         * Отрицательные вклады Not Syn.
         */

        playerContributions,


        /*
         * Дополнительные данные.
         * Не ломают существующий код.
         */

        playersWithoutSynergy,

        pairCount,

        possiblePairs,

        rawPairBonusTotal:
            round2(
                rawPairBonusTotal
            ),

        pairContribution:
            round2(
                pairContribution
            ),

        densityBonus:
            round2(
                densityBonus
            ),

        noSynergyPenalty:
            round2(
                noSynergyPenalty
            ),


        /*
         * Контрольные значения.
         *
         * calculatedDisplayTotal
         * должен быть равен totalBonus.
         */

        groupsTotal,

        playerContributionsTotal,

        calculatedDisplayTotal

    };
}