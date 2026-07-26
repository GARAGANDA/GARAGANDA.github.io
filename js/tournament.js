import { getTeamPower } from './core/matchSimulation.js';
import { DELAYS } from './config/delays.js';

export class Tournament {
    constructor(teams, coreStats, supportStats, duoMap) {
        this.teams = teams.map((t, idx) => ({
            ...t,
            id: idx,
            points: 0,
            wins: 0,
            losses: 0,
            opponents: [],
            matches: [],
            roundResults: []
        }));

        this.coreStats = coreStats;
        this.supportStats = supportStats;
        this.duoMap = duoMap;

        this.matchHistory = [];
        this.currentRound = 0;
        this.maxRounds = 5;
    }


    // =========================================================
    // ТАБЛИЦА ГРУППОВОГО ЭТАПА
    // =========================================================

    getStandings() {
        return [...this.teams].sort((a, b) => {
            // Сначала больше побед / очков
            if (b.points !== a.points) {
                return b.points - a.points;
            }

            // При одинаковых очках:
            // команда с меньшим количеством поражений выше
            if (a.losses !== b.losses) {
                return a.losses - b.losses;
            }

            // Buchholz / сила соперников
            const bhA = a.opponents.reduce(
                (sum, id) =>
                    sum +
                    (
                        this.teams.find(
                            t => t.id === id
                        )?.points || 0
                    ),
                0
            );

            const bhB = b.opponents.reduce(
                (sum, id) =>
                    sum +
                    (
                        this.teams.find(
                            t => t.id === id
                        )?.points || 0
                    ),
                0
            );

            return bhB - bhA;
        });
    }


    // =========================================================
    // ПОЛУЧИТЬ ТЕКУЩИЙ РЕКОРД
    // =========================================================

    _getRecord(team) {
        return `${team.wins}-${team.losses}`;
    }


    // =========================================================
    // ПРОВЕРКА:
    // ИМЕЮТ ЛИ ДВЕ КОМАНДЫ ОДИНАКОВЫЙ РЕКОРД
    // =========================================================

    _haveSameRecord(teamA, teamB) {
        return (
            teamA.wins === teamB.wins &&
            teamA.losses === teamB.losses
        );
    }


    // =========================================================
    // ПРОВЕРКА:
    // ИГРАЛИ ЛИ КОМАНДЫ РАНЬШЕ
    // =========================================================

    _havePlayedBefore(teamA, teamB) {
        const aPlayedB =
            Array.isArray(teamA.opponents) &&
            teamA.opponents.includes(teamB.id);

        const bPlayedA =
            Array.isArray(teamB.opponents) &&
            teamB.opponents.includes(teamA.id);

        return aPlayedB || bPlayedA;
    }


    // =========================================================
    // МОЖЕТ ЛИ КОМАНДА ИГРАТЬ В ТЕКУЩЕМ РАУНДЕ
    //
    // 4-0 больше не играет.
    // 0-4 больше не играет.
    //
    // Это особенно важно для 5-го раунда.
    // =========================================================

    _canPlayGroupRound(team, round) {
        // Команда уже вышла со статистикой 4-0
        if (
            team.wins >= 4 &&
            team.losses === 0
        ) {
            return false;
        }

        // Команда уже вылетела со статистикой 0-4
        if (
            team.wins === 0 &&
            team.losses >= 4
        ) {
            return false;
        }

        // В пятом раунде 4-0 и 0-4 точно не играют
        if (
            round === 5 &&
            (
                team.wins === 4 ||
                team.losses === 4
            )
        ) {
            return false;
        }

        return true;
    }


    // =========================================================
    // СИМУЛЯЦИЯ МАТЧА
    // =========================================================

    async playMatch(
        teamA,
        teamB,
        onGameUpdate,
        bestOf = 3,
        gameDelayMs = DELAYS.betweenCards
    ) {
        const winsNeeded =
            Math.ceil(bestOf / 2);

        let winsA = 0;
        let winsB = 0;

        const games = [];

        let winner = null;


        if (onGameUpdate) {
            await onGameUpdate({
                teamA: teamA.name,
                teamB: teamB.name,
                score: [0, 0],
                games: [],
                winner: null
            });
        }


        while (
            winsA < winsNeeded &&
            winsB < winsNeeded
        ) {
            // -------------------------------------------------
            // СИЛА КОМАНД
            // -------------------------------------------------

            const basePower1 =
                getTeamPower(
                    teamA.players,
                    teamA.roleKeys,
                    this.coreStats,
                    this.supportStats,
                    this.duoMap
                );


            const basePower2 =
                getTeamPower(
                    teamB.players,
                    teamB.roleKeys,
                    this.coreStats,
                    this.supportStats,
                    this.duoMap
                );


            // -------------------------------------------------
            // СЛУЧАЙНЫЙ ШУМ
            // -------------------------------------------------

            const power1 =
                basePower1 +
                (
                    Math.random() - 0.5
                ) * 2.0;


            const power2 =
                basePower2 +
                (
                    Math.random() - 0.5
                ) * 2.0;


            // -------------------------------------------------
            // ВЕРОЯТНОСТЬ ПОБЕДЫ
            // -------------------------------------------------

            const winProb =
                1 /
                (
                    1 +
                    Math.exp(
                        -(
                            power1 -
                            power2
                        ) * 0.6
                    )
                );


            // -------------------------------------------------
            // РЕЗУЛЬТАТ ИГРЫ
            // -------------------------------------------------

            const result =
                Math.random() < winProb
                    ? teamA
                    : teamB;


            if (
                result === teamA
            ) {
                winsA++;
            } else {
                winsB++;
            }


            games.push({
                winner: result,
                score:
                    `${winsA}-${winsB}`
            });


            const matchObj = {
                teamA: teamA.name,
                teamB: teamB.name,
                score: [
                    winsA,
                    winsB
                ],
                games,
                winner: null
            };


            if (
                winsA >= winsNeeded ||
                winsB >= winsNeeded
            ) {
                winner =
                    winsA > winsB
                        ? teamA
                        : teamB;

                matchObj.winner =
                    winner.name;
            }


            if (onGameUpdate) {
                await onGameUpdate(
                    matchObj
                );
            }


            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        gameDelayMs
                    )
            );
        }


        return {
            winner,
            score: [
                winsA,
                winsB
            ],
            games
        };
    }


    // =========================================================
    // СТРОГОЕ ФОРМИРОВАНИЕ ПАР ПО РЕКОРДУ
    //
    // ГЛАВНОЕ ИЗМЕНЕНИЕ:
    //
    // НЕТ fallback:
    //
    // 3-1 НЕ может играть с 2-2
    // 2-2 НЕ может играть с 1-3
    //
    // Каждая группа рекорда формируется отдельно.
    // =========================================================

// =========================================================
// СТРОГОЕ ФОРМИРОВАНИЕ ПАР ПО РЕКОРДУ С BACKTRACKING
// =========================================================

    _createPairsByRecord(teamsList, round) {
        // -----------------------------------------------------
        // Защита от неправильных данных
        // -----------------------------------------------------
        if (!Array.isArray(teamsList)) {
            throw new Error(`_createPairsByRecord: teamsList должен быть массивом.`);
        }

        // -----------------------------------------------------
        // Только команды, которые имеют право играть
        // -----------------------------------------------------
        const eligibleTeams = teamsList.filter(team => this._canPlayGroupRound(team, round));

        // -----------------------------------------------------
        // Для 5-го раунда проверяем, что нет 4-0 / 0-4
        // -----------------------------------------------------
        if (round === 5) {
            const invalidTeams = eligibleTeams.filter(team => team.wins === 4 || team.losses === 4);
            if (invalidTeams.length > 0) {
                throw new Error(`Критическая ошибка группового этапа: команда 4-0 или 0-4 попала в 5-й раунд.`);
            }
        }

        // -----------------------------------------------------
        // ГРУППИРУЕМ ПО РЕКОРДУ
        // -----------------------------------------------------
        const recordGroups = new Map();
        for (const team of eligibleTeams) {
            const record = this._getRecord(team);
            if (!recordGroups.has(record)) recordGroups.set(record, []);
            recordGroups.get(record).push(team);
        }

        const allPairs = [];

        // -----------------------------------------------------
        // ОБРАБОТКА КАЖДОЙ ГРУППЫ РЕКОРДА
        // -----------------------------------------------------
        for (const [record, recordTeams] of recordGroups.entries()) {
            // -------------------------------------------------
            // Нечётное количество команд – ошибка
            // -------------------------------------------------
            if (recordTeams.length % 2 !== 0) {
                throw new Error(`Группа с рекордом ${record} содержит нечётное количество команд (${recordTeams.length}).`);
            }

            // -------------------------------------------------
            // ВСПОМОГАТЕЛЬНАЯ РЕКУРСИВНАЯ ФУНКЦИЯ С ВОЗВРАТОМ
            // -------------------------------------------------
            const used = new Array(recordTeams.length).fill(false);
            const localPairs = [];

            const search = (depth) => {
                // Если все команды использованы – успех
                if (depth === recordTeams.length / 2) return true;

                // Находим первую неиспользованную команду
                let first = -1;
                for (let i = 0; i < recordTeams.length; i++) {
                    if (!used[i]) {
                        first = i;
                        break;
                    }
                }
                if (first === -1) return true; // все использованы

                // Пробуем подобрать соперника для первой команды
                for (let j = first + 1; j < recordTeams.length; j++) {
                    if (used[j]) continue;

                    const a = recordTeams[first];
                    const b = recordTeams[j];

                    // Проверяем: одинаковый рекорд и не играли ранее
                    if (this._haveSameRecord(a, b) && !this._havePlayedBefore(a, b)) {
                        // Помечаем как использованные
                        used[first] = true;
                        used[j] = true;
                        localPairs.push({ teamA: a, teamB: b });

                        // Рекурсивно ищем дальше
                        if (search(depth + 1)) {
                            return true;
                        }

                        // Возврат (backtrack)
                        localPairs.pop();
                        used[first] = false;
                        used[j] = false;
                    }
                }

                // Не удалось найти пару для текущей команды
                return false;
            };

            const success = search(0);

            if (!success) {
                throw new Error(`Не удалось сформировать пары для рекорда ${record} в раунде ${round}.`);
            }

            // Добавляем найденные пары в общий список
            allPairs.push(...localPairs);
        }

        // -----------------------------------------------------
        // ФИНАЛЬНАЯ ПРОВЕРКА (на всякий случай)
        // -----------------------------------------------------
        for (const pair of allPairs) {
            if (!this._haveSameRecord(pair.teamA, pair.teamB)) {
                throw new Error(`Критическая ошибка: пара ${pair.teamA.name} (${this._getRecord(pair.teamA)}) vs ${pair.teamB.name} (${this._getRecord(pair.teamB)}) имеет разные рекорды.`);
            }
            if (this._havePlayedBefore(pair.teamA, pair.teamB)) {
                throw new Error(`Критическая ошибка: ${pair.teamA.name} и ${pair.teamB.name} уже играли между собой.`);
            }
        }

        return allPairs;
    }


    // =========================================================
    // ГРУППОВОЙ ЭТАП
    // =========================================================

    async runGroupStage(
        onRoundComplete,
        onMatchUpdate
    ) {
        const teams =
            this.teams;


        const rounds =
            5;


        // -----------------------------------------------------
        // 5 раундов
        // -----------------------------------------------------

        for (
            let r = 1;
            r <= rounds;
            r++
        ) {
            this.currentRound =
                r;


            // -------------------------------------------------
            // Получаем команды, которые могут играть
            //
            // В 5-м раунде 4-0 и 0-4 автоматически исключены.
            // -------------------------------------------------

            const eligibleTeams =
                teams.filter(
                    team =>
                        this._canPlayGroupRound(
                            team,
                            r
                        )
                );


            // -------------------------------------------------
            // СОЗДАЁМ СТРОГИЕ ПАРЫ
            //
            // Для любого раунда используется одна и та же
            // строгая логика.
            // -------------------------------------------------

            const pairs =
                this._createPairsByRecord(
                    eligibleTeams,
                    r
                );


            // -------------------------------------------------
            // ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА:
            // количество участников должно быть чётным
            // -------------------------------------------------

            if (
                eligibleTeams.length % 2 !== 0
            ) {
                throw new Error(
                    `Раунд ${r}: ` +
                    `нечётное количество команд (${eligibleTeams.length}). ` +
                    `При строгом подборе по одинаковому рекорду ` +
                    `нельзя корректно сформировать пары.`
                );
            }


            // -------------------------------------------------
            // Проверяем:
            // каждая команда участвует ровно в одном матче
            // -------------------------------------------------

            const roundTeamIds =
                new Set();


            for (
                const pair of pairs
            ) {
                if (
                    roundTeamIds.has(
                        pair.teamA.id
                    )
                ) {
                    throw new Error(
                        `Раунд ${r}: ` +
                        `команда ${pair.teamA.name} ` +
                        `участвует более чем в одном матче.`
                    );
                }


                if (
                    roundTeamIds.has(
                        pair.teamB.id
                    )
                ) {
                    throw new Error(
                        `Раунд ${r}: ` +
                        `команда ${pair.teamB.name} ` +
                        `участвует более чем в одном матче.`
                    );
                }


                roundTeamIds.add(
                    pair.teamA.id
                );


                roundTeamIds.add(
                    pair.teamB.id
                );
            }


            const roundMatches =
                [];


            // -------------------------------------------------
            // ИГРАЕМ МАТЧИ
            // -------------------------------------------------

            for (
                const pair of pairs
            ) {
                // ---------------------------------------------
                // ЗАЩИТА ПЕРЕД МАТЧЕМ
                // ---------------------------------------------

                if (
                    !this._haveSameRecord(
                        pair.teamA,
                        pair.teamB
                    )
                ) {
                    throw new Error(
                        `ОШИБКА ПЕРЕД МАТЧЕМ: ` +
                        `${pair.teamA.name} ` +
                        `(${this._getRecord(pair.teamA)}) vs ` +
                        `${pair.teamB.name} ` +
                        `(${this._getRecord(pair.teamB)}). ` +
                        `Команды должны иметь одинаковую статистику.`
                    );
                }


                if (
                    this._havePlayedBefore(
                        pair.teamA,
                        pair.teamB
                    )
                ) {
                    throw new Error(
                        `ОШИБКА ПЕРЕД МАТЧЕМ: ` +
                        `${pair.teamA.name} и ` +
                        `${pair.teamB.name} ` +
                        `уже встречались ранее.`
                    );
                }


                // ---------------------------------------------
                // ЛОГ
                // ---------------------------------------------

                console.log(
                    `[Group Stage] Round ${r}: ` +
                    `${pair.teamA.name} ` +
                    `(${this._getRecord(pair.teamA)}) vs ` +
                    `${pair.teamB.name} ` +
                    `(${this._getRecord(pair.teamB)})`
                );


                // ---------------------------------------------
                // ИГРА
                // ---------------------------------------------

                const matchResult =
                    await this.playMatch(
                        pair.teamA,
                        pair.teamB,
                        async matchObj => {
                            if (
                                onMatchUpdate
                            ) {
                                await onMatchUpdate(
                                    matchObj
                                );
                            }
                        },
                        3,
                        DELAYS.betweenRounds
                    );


                const winner =
                    matchResult.winner;


                const loser =
                    winner === pair.teamA
                        ? pair.teamB
                        : pair.teamA;


                // ---------------------------------------------
                // ОБНОВЛЯЕМ СТАТИСТИКУ
                // ---------------------------------------------

                winner.points += 1;
                winner.wins += 1;

                loser.losses += 1;


                // ---------------------------------------------
                // ЗАПОМИНАЕМ СОПЕРНИКОВ
                // ---------------------------------------------

                if (
                    !winner.opponents.includes(
                        loser.id
                    )
                ) {
                    winner.opponents.push(
                        loser.id
                    );
                }


                if (
                    !loser.opponents.includes(
                        winner.id
                    )
                ) {
                    loser.opponents.push(
                        winner.id
                    );
                }


                // ---------------------------------------------
                // ИНФОРМАЦИЯ О МАТЧЕ
                // ---------------------------------------------

                const matchInfo = {
                    round: r,

                    teamA:
                        pair.teamA.name,

                    teamB:
                        pair.teamB.name,

                    winner:
                        winner.name,

                    score:
                        matchResult.score,

                    games:
                        matchResult.games
                };


                this.matchHistory.push(
                    matchInfo
                );


                roundMatches.push(
                    matchInfo
                );


                // ---------------------------------------------
                // РЕЗУЛЬТАТЫ КОМАНД
                // ---------------------------------------------

                pair.teamA.roundResults.push({
                    round: r,

                    opponent:
                        pair.teamB.name,

                    score:
                        matchResult.score,

                    won:
                        winner ===
                        pair.teamA
                });


                pair.teamB.roundResults.push({
                    round: r,

                    opponent:
                        pair.teamA.name,

                    score:
                        matchResult.score,

                    won:
                        winner ===
                        pair.teamB
                });
            }


            // -------------------------------------------------
            // CALLBACK ПОСЛЕ РАУНДА
            // -------------------------------------------------

            if (
                onRoundComplete
            ) {
                const standings =
                    this.getStandings();


                await onRoundComplete(
                    r,
                    standings,
                    roundMatches
                );
            }
        }


        // -----------------------------------------------------
        // ФИНАЛЬНАЯ ПРОВЕРКА ГРУППОВОГО ЭТАПА
        // -----------------------------------------------------

        for (
            const team of teams
        ) {
            const games =
                team.wins +
                team.losses;


            // Команда 4-0
            if (
                team.wins === 4 &&
                team.losses === 0
            ) {
                if (
                    games !== 4
                ) {
                    throw new Error(
                        `Ошибка: команда ${team.name} ` +
                        `имеет статистику 4-0, ` +
                        `но сыграла ${games} матчей.`
                    );
                }
            }


            // Команда 0-4
            if (
                team.wins === 0 &&
                team.losses === 4
            ) {
                if (
                    games !== 4
                ) {
                    throw new Error(
                        `Ошибка: команда ${team.name} ` +
                        `имеет статистику 0-4, ` +
                        `но сыграла ${games} матчей.`
                    );
                }
            }
        }


        return this.getStandings();
    }


    // =========================================================
    // ELIMINATION ROUND
    // =========================================================

    async runEliminationRound(
        standings,
        onMatchUpdate
    ) {
        const candidates =
            standings.slice(
                3,
                13
            );


        const pairs =
            [];


        for (
            let i = 0;
            i < 5;
            i++
        ) {
            pairs.push({
                teamA:
                    candidates[i],

                teamB:
                    candidates[
                        9 - i
                    ]
            });
        }


        const eliminationMatches =
            [];


        for (
            const pair of pairs
        ) {
            const matchResult =
                await this.playMatch(
                    pair.teamA,
                    pair.teamB,
                    async matchObj => {
                        if (
                            onMatchUpdate
                        ) {
                            await onMatchUpdate(
                                matchObj
                            );
                        }
                    },
                    3,
                    DELAYS.betweenMatchesElimination
                );


            const winner =
                matchResult.winner;


            const loser =
                winner === pair.teamA
                    ? pair.teamB
                    : pair.teamA;


            const matchInfo = {
                stage:
                    'elimination',

                teamA:
                    pair.teamA.name,

                teamB:
                    pair.teamB.name,

                winner:
                    winner.name,

                score:
                    matchResult.score,

                games:
                    matchResult.games
            };


            this.matchHistory.push(
                matchInfo
            );


            eliminationMatches.push(
                matchInfo
            );


            winner.wins += 1;
            loser.losses += 1;
        }


        // -----------------------------------------------------
        // ТОЛЬКО ПОБЕДИТЕЛИ ELIMINATION
        // -----------------------------------------------------

        const eliminationWinners =
            [];


        for (
            const info of eliminationMatches
        ) {
            const winnerTeam =
                this.teams.find(
                    t =>
                        t.name ===
                        info.winner
                );


            if (
                winnerTeam
            ) {
                eliminationWinners.push(
                    winnerTeam
                );
            }
        }


        return {
            winners:
                eliminationWinners,

            matches:
                eliminationMatches
        };
    }
}