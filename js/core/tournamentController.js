// ============================================================
// js/core/tournamentController.js
// ============================================================

import { Tournament } from '../tournament.js';

import {
    renderGroupTable,
    renderCurrentRound,
    addHistoryRound
} from '../ui/renderers/groupTable.js';

import {
    renderEliminationBracket,
    renderElimCurrentMatches,
    addElimHistoryMatch
} from '../ui/renderers/elimination.js';

import { renderPlayoffBracket } from '../ui/renderers/playoff.js';

import {
    getPlacements,
    renderTournamentResults
} from '../ui/renderers/results.js';

import { sleep } from '../utils/helpers.js';
import { runDraft } from '../draft/index.js';
import { getWinnerByScore } from '../utils/matchUtils.js';
import { DELAYS } from '../config/delays.js';


// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

/**
 * Возвращает уникальное имя команды.
 * Используется для сравнения команд независимо от ссылок на объекты.
 */
function getTeamName(team) {
    return team?.name || null;
}


/**
 * Проверяет, является ли команда одной из двух участников матча.
 */
function isParticipant(team, teamA, teamB) {
    if (!team) return false;

    const teamName = getTeamName(team);

    return (
        teamName === getTeamName(teamA) ||
        teamName === getTeamName(teamB)
    );
}


/**
 * Проверяет, что результат матча содержит корректного победителя.
 */
function validateMatchWinner(result, teamA, teamB, matchLabel = '') {
    if (!result || !result.winner) {
        throw new Error(
            `Не удалось определить победителя матча ${matchLabel}: ` +
            `${getTeamName(teamA)} vs ${getTeamName(teamB)}`
        );
    }

    if (!isParticipant(result.winner, teamA, teamB)) {
        throw new Error(
            `КРИТИЧЕСКАЯ ОШИБКА: победитель ${getTeamName(result.winner)} ` +
            `не является участником матча ${getTeamName(teamA)} vs ${getTeamName(teamB)}`
        );
    }

    return result.winner;
}


/**
 * Проверяет массив победителей elimination.
 *
 * Гарантии:
 * 1. Ровно 5 команд.
 * 2. Все команды уникальны.
 * 3. Каждая команда действительно выиграла свой elimination матч.
 */
function validateEliminationWinners(winners, completedMatches) {
    if (!Array.isArray(winners)) {
        throw new Error('eliminationWinners должен быть массивом');
    }

    if (winners.length !== 5) {
        throw new Error(
            `Ошибка elimination: ожидалось 5 победителей, получено ${winners.length}`
        );
    }

    const winnerNames = winners.map(getTeamName);

    const uniqueNames = new Set(winnerNames);

    if (uniqueNames.size !== 5) {
        console.error('Дубликаты победителей elimination:', winnerNames);

        throw new Error(
            'КРИТИЧЕСКАЯ ОШИБКА: в eliminationWinners есть дубликаты команд'
        );
    }

    for (const winner of winners) {
        const winnerName = getTeamName(winner);

        const match = completedMatches.find(
            m => m.winner === winnerName
        );

        if (!match) {
            console.error(
                'Попытка передать в playoff команду, ' +
                'которая не является победителем elimination:',
                winnerName
            );

            throw new Error(
                `Команда ${winnerName} не подтверждена как победитель elimination`
            );
        }

        const participated =
            match.teamA === winnerName ||
            match.teamB === winnerName;

        if (!participated) {
            throw new Error(
                `КРИТИЧЕСКАЯ ОШИБКА: ${winnerName} ` +
                `не участвовала в матче, который указал её победителем`
            );
        }
    }

    console.log(
        '%c[ELIMINATION VALIDATION] Все 5 победителей подтверждены:',
        'color: green; font-weight: bold;',
        winnerNames
    );

    return true;
}


// ============================================================
// ЭТАП НА ВЫБЫВАНИЕ
// ============================================================

async function runEliminationStage(
    standings,
    coreStats,
    supportStats,
    duoMap,
    tournament
) {
    console.log('========================================');
    console.log('ЗАПУСК ЭТАПА НА ВЫБЫВАНИЕ');
    console.log('========================================');

    const candidates = standings.slice(3, 13);

    if (candidates.length < 10) {
        throw new Error(
            `Недостаточно команд для этапа на выбывание: ${candidates.length}`
        );
    }

    console.log(
        '[ELIMINATION] Участники:',
        candidates.map((team, index) => `${index + 4}. ${team.name}`)
    );

    const pairs = [
        { teamA: candidates[0], teamB: candidates[9] },
        { teamA: candidates[1], teamB: candidates[8] },
        { teamA: candidates[2], teamB: candidates[7] },
        { teamA: candidates[3], teamB: candidates[6] },
        { teamA: candidates[4], teamB: candidates[5] }
    ];

    document.getElementById('elimination-wrapper').style.display = 'flex';

    document.getElementById('elim-history-matches').innerHTML = '';
    document.getElementById('elim-current-matches').innerHTML = '';

    const completedMatches = [];
    const currentMatches = [];

    renderEliminationBracket(completedMatches);
    renderElimCurrentMatches(currentMatches, 'Текущие матчи');

    // Здесь будут находиться ТОЛЬКО реальные победители матчей
    const winners = [];

    for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i];

        console.log(
            `[ELIMINATION MATCH ${i + 1}]`,
            pair.teamA.name,
            'vs',
            pair.teamB.name
        );

        const matchObj = {
            teamA: pair.teamA.name,
            teamB: pair.teamB.name,
            score: [0, 0],
            winner: null,
            winnerObj: null,
            loser: null,
            loserObj: null,
            isDraftSim: false,
            games: []
        };

        currentMatches.push(matchObj);

        renderElimCurrentMatches(
            currentMatches,
            'Текущие матчи'
        );

        const isUserMatch =
            pair.teamA.isUser ||
            pair.teamB.isUser;

        let result;

        // ====================================================
        // МАТЧ С УЧАСТИЕМ ПОЛЬЗОВАТЕЛЯ
        // ====================================================

        if (isUserMatch) {
            console.log(
                `[ELIMINATION] Запуск драфта: ${pair.teamA.name} vs ${pair.teamB.name}`
            );

            try {
                const draftResult = await runDraft(
                    pair.teamA,
                    pair.teamB,
                    3,
                    { showChoice: true }
                );

                result = {
                    winner: draftResult.winner,
                    score: draftResult.score,
                    games: draftResult.games || []
                };

                matchObj.isDraftSim = true;

            } catch (draftError) {
                console.error(
                    '[ELIMINATION] Ошибка в драфте:',
                    draftError
                );

                result = await tournament.playMatch(
                    pair.teamA,
                    pair.teamB,
                    async (update) => {
                        matchObj.score = update.score;
                        renderElimCurrentMatches(
                            currentMatches,
                            'Текущие матчи'
                        );
                    },
                    3,
                    DELAYS.betweenCards
                );

                matchObj.isDraftSim = false;
            }

        // ====================================================
        // БОТ-МАТЧ
        // ====================================================

        } else {

            result = await tournament.playMatch(
                pair.teamA,
                pair.teamB,
                async (update) => {
                    matchObj.score = update.score;

                    renderElimCurrentMatches(
                        currentMatches,
                        'Текущие матчи'
                    );
                },
                3,
                DELAYS.betweenCards
            );

            matchObj.isDraftSim = false;
        }


        // ====================================================
        // ОПРЕДЕЛЕНИЕ ПОБЕДИТЕЛЯ
        // ====================================================

        let winner = null;

        // Сначала доверяем результату симуляции,
        // но проверяем, что команда действительно участник.
        if (result?.winner) {
            if (
                getTeamName(result.winner) === pair.teamA.name
            ) {
                winner = pair.teamA;

            } else if (
                getTeamName(result.winner) === pair.teamB.name
            ) {
                winner = pair.teamB;
            }
        }

        // Если winner не определён — используем финальный счёт.
        if (!winner) {

            const finalScore =
                result?.score ||
                matchObj.score;

            if (
                Array.isArray(finalScore) &&
                finalScore.length >= 2 &&
                finalScore[0] !== finalScore[1]
            ) {
                winner =
                    finalScore[0] > finalScore[1]
                        ? pair.teamA
                        : pair.teamB;
            }
        }

        // Нельзя продолжать турнир без победителя.
        if (!winner) {
            throw new Error(
                `КРИТИЧЕСКАЯ ОШИБКА: не удалось определить ` +
                `победителя elimination матча ` +
                `${pair.teamA.name} vs ${pair.teamB.name}`
            );
        }

        // Дополнительная защита.
        if (
            winner.name !== pair.teamA.name &&
            winner.name !== pair.teamB.name
        ) {
            throw new Error(
                `КРИТИЧЕСКАЯ ОШИБКА: ${winner.name} ` +
                `не является участником текущего elimination матча`
            );
        }

        // Определяем проигравшего.
        const loser =
            winner.name === pair.teamA.name
                ? pair.teamB
                : pair.teamA;


        // ====================================================
        // СОХРАНЯЕМ РЕЗУЛЬТАТ
        // ====================================================

        matchObj.score =
            result?.score ||
            matchObj.score;

        matchObj.games =
            result?.games ||
            [];

        matchObj.winnerObj = winner;
        matchObj.winner = winner.name;

        matchObj.loserObj = loser;
        matchObj.loser = loser.name;


        // ====================================================
        // УДАЛЯЕМ ИЗ ТЕКУЩИХ
        // ====================================================

        const idx =
            currentMatches.indexOf(matchObj);

        if (idx !== -1) {
            currentMatches.splice(idx, 1);
        }


        // ====================================================
        // СОХРАНЯЕМ ЗАВЕРШЁННЫЙ МАТЧ
        // ====================================================

        completedMatches.push(matchObj);

        addElimHistoryMatch(matchObj);

        renderEliminationBracket(
            completedMatches
        );

        renderElimCurrentMatches(
            currentMatches,
            'Текущие матчи'
        );


        // ====================================================
        // ДОБАВЛЯЕМ ТОЛЬКО ПОБЕДИТЕЛЯ
        // ====================================================

        winners.push(winner);


        console.log(
            `%c[ELIMINATION RESULT] ${winner.name} ПОБЕДИЛ ${loser.name}`,
            'color: green; font-weight: bold;'
        );

        console.log(
            '[ELIMINATION] Текущие победители:',
            winners.map(team => team.name)
        );

        await sleep(
            DELAYS.betweenMatchesElimination
        );
    }


    // ========================================================
    // ФИНАЛЬНАЯ ПРОВЕРКА ELIMINATION
    // ========================================================

    validateEliminationWinners(
        winners,
        completedMatches
    );

    console.log(
        '========================================'
    );

    console.log(
        '[ELIMINATION COMPLETE] Победители:',
        winners.map(team => team.name)
    );

    console.log(
        '[ELIMINATION COMPLETE] Проигравшие:',
        completedMatches.map(match => match.loser)
    );

    console.log(
        '========================================'
    );

    return winners;
}


// ============================================================
// ПЛЕЙ-ОФФ
// ============================================================

async function runPlayoffStage(
    top3,
    eliminationWinners,
    tournament
) {

    if (top3.length < 3) {
        throw new Error(
            'Недостаточно команд в top3 для плей-офф'
        );
    }

    // ========================================================
    // ЗАЩИТА ОТ ПРОИГРАВШИХ ELIMINATION
    // ========================================================

    if (
        !Array.isArray(eliminationWinners) ||
        eliminationWinners.length !== 5
    ) {
        throw new Error(
            `В playoff должно передаваться ровно 5 ` +
            `победителей elimination. Получено: ` +
            `${eliminationWinners?.length || 0}`
        );
    }

    // Уникальные имена победителей
    const eliminationWinnerNames =
        eliminationWinners.map(team => team?.name);

    const uniqueWinnerNames =
        new Set(eliminationWinnerNames);

    if (uniqueWinnerNames.size !== 5) {
        throw new Error(
            'КРИТИЧЕСКАЯ ОШИБКА: в playoff переданы ' +
            'дублирующиеся победители elimination'
        );
    }

    // ========================================================
    // ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА
    // ========================================================

    const top3Names =
        new Set(
            top3
                .slice(0, 3)
                .map(team => team.name)
        );

    // Здесь мы не запрещаем технически совпадение,
    // но логируем ситуацию.
    const overlappingTeams =
        eliminationWinners.filter(
            team => top3Names.has(team.name)
        );

    if (overlappingTeams.length > 0) {
        console.warn(
            '[PLAYOFF] Команды одновременно находятся в top3 ' +
            'и elimination:',
            overlappingTeams.map(team => team.name)
        );
    }


    console.log(
        '========================================'
    );

    console.log(
        '[PLAYOFF] TOP 3:',
        top3.slice(0, 3).map(team => team.name)
    );

    console.log(
        '[PLAYOFF] Победители elimination:',
        eliminationWinners.map(team => team.name)
    );

    console.log(
        '========================================'
    );


    const [team1, team2, team3] =
        top3.slice(0, 3);

    const [
        w1,
        w2,
        w3,
        w4,
        w5
    ] =
        eliminationWinners;


    if (
        !team1 ||
        !team2 ||
        !team3 ||
        !w1 ||
        !w2 ||
        !w3 ||
        !w4 ||
        !w5
    ) {
        throw new Error(
            'Одна из команд в плей-офф отсутствует'
        );
    }


    // ========================================================
    // СОСТОЯНИЕ PLAYOFF
    // ========================================================

    const state = {
        matches: {

            qf1: {
                teamA: team1.name,
                teamB: w1.name,
                score: [0, 0],
                winner: null,
                winnerObj: null,
                isDraftSim: false,
                games: []
            },

            qf2: {
                teamA: w2.name,
                teamB: w3.name,
                score: [0, 0],
                winner: null,
                winnerObj: null,
                isDraftSim: false,
                games: []
            },

            qf3: {
                teamA: team2.name,
                teamB: w4.name,
                score: [0, 0],
                winner: null,
                winnerObj: null,
                isDraftSim: false,
                games: []
            },

            qf4: {
                teamA: team3.name,
                teamB: w5.name,
                score: [0, 0],
                winner: null,
                winnerObj: null,
                isDraftSim: false,
                games: []
            },

            lb1_1: {
                teamA: null,
                teamB: null,
                score: [0, 0],
                winner: null,
                winnerObj: null,
                isDraftSim: false,
                games: []
            },

            lb1_2: {
                teamA: null,
                teamB: null,
                score: [0, 0],
                winner: null,
                winnerObj: null,
                isDraftSim: false,
                games: []
            },

            sf1: {
                teamA: null,
                teamB: null,
                score: [0, 0],
                winner: null,
                winnerObj: null,
                isDraftSim: false,
                games: []
            },

            sf2: {
                teamA: null,
                teamB: null,
                score: [0, 0],
                winner: null,
                winnerObj: null,
                isDraftSim: false,
                games: []
            },

            lb2_1: {
                teamA: null,
                teamB: null,
                score: [0, 0],
                winner: null,
                winnerObj: null,
                isDraftSim: false,
                games: []
            },

            lb2_2: {
                teamA: null,
                teamB: null,
                score: [0, 0],
                winner: null,
                winnerObj: null,
                isDraftSim: false,
                games: []
            },

            lb3: {
                teamA: null,
                teamB: null,
                score: [0, 0],
                winner: null,
                winnerObj: null,
                isDraftSim: false,
                games: []
            },

            ubf: {
                teamA: null,
                teamB: null,
                score: [0, 0],
                winner: null,
                winnerObj: null,
                isDraftSim: false,
                games: []
            },

            lbf: {
                teamA: null,
                teamB: null,
                score: [0, 0],
                winner: null,
                winnerObj: null,
                isDraftSim: false,
                games: []
            },

            gf: {
                teamA: null,
                teamB: null,
                score: [0, 0],
                winner: null,
                winnerObj: null,
                isDraftSim: false,
                games: []
            }
        }
    };


    document.getElementById(
        'playoff-wrapper'
    ).style.display = 'block';

    renderPlayoffBracket(state);


    // ========================================================
    // PLAY MATCH
    // ========================================================

    async function playMatchAndUpdate(
        matchKey,
        teamAObj,
        teamBObj,
        bestOf = 3
    ) {

        if (
            !teamAObj ||
            !teamBObj
        ) {
            throw new Error(
                `playMatchAndUpdate: команда undefined ` +
                `для матча ${matchKey}`
            );
        }

        const match =
            state.matches[matchKey];

        match.teamA =
            teamAObj.name;

        match.teamB =
            teamBObj.name;

        match.score = [0, 0];
        match.winner = null;
        match.winnerObj = null;
        match.games = [];


        renderPlayoffBracket(state);


        const isUserMatch =
            teamAObj.isUser ||
            teamBObj.isUser;

        let result;


        if (isUserMatch) {

            try {

                const draftResult =
                    await runDraft(
                        teamAObj,
                        teamBObj,
                        bestOf,
                        { showChoice: true }
                    );

                result = {
                    winner: draftResult.winner,
                    score: draftResult.score,
                    games: draftResult.games || []
                };

                match.isDraftSim = true;

            } catch (draftError) {

                console.error(
                    'Ошибка в драфте плей-офф:',
                    draftError
                );

                result =
                    await tournament.playMatch(
                        teamAObj,
                        teamBObj,
                        async (update) => {

                            match.score =
                                update.score;

                            if (update.winner) {

                                const winnerObj =
                                    [
                                        teamAObj,
                                        teamBObj
                                    ].find(
                                        t =>
                                            t.name ===
                                            update.winner
                                    );

                                if (winnerObj) {
                                    match.winnerObj =
                                        winnerObj;

                                    match.winner =
                                        winnerObj.name;
                                }
                            }

                            renderPlayoffBracket(
                                state
                            );
                        },
                        bestOf,
                        DELAYS.betweenCards
                    );

                match.isDraftSim = false;
            }

        } else {

            result =
                await tournament.playMatch(
                    teamAObj,
                    teamBObj,
                    async (update) => {

                        match.score =
                            update.score;

                        if (update.winner) {

                            const winnerObj =
                                [
                                    teamAObj,
                                    teamBObj
                                ].find(
                                    t =>
                                        t.name ===
                                        update.winner
                                );

                            if (winnerObj) {

                                match.winnerObj =
                                    winnerObj;

                                match.winner =
                                    winnerObj.name;
                            }
                        }

                        renderPlayoffBracket(
                            state
                        );
                    },
                    bestOf,
                    DELAYS.betweenCards
                );

                match.isDraftSim = false;
        }


        // ====================================================
        // НАДЁЖНО ОПРЕДЕЛЯЕМ ПОБЕДИТЕЛЯ
        // ====================================================

        let winner = null;

        if (result?.winner) {

            if (
                result.winner.name ===
                teamAObj.name
            ) {
                winner = teamAObj;

            } else if (
                result.winner.name ===
                teamBObj.name
            ) {
                winner = teamBObj;
            }
        }


        if (!winner) {

            const winnerName =
                getWinnerByScore({
                    teamA: teamAObj.name,
                    teamB: teamBObj.name,
                    score:
                        result?.score ||
                        match.score
                });

            if (
                winnerName ===
                teamAObj.name
            ) {
                winner = teamAObj;

            } else if (
                winnerName ===
                teamBObj.name
            ) {
                winner = teamBObj;
            }
        }


        if (!winner) {

            throw new Error(
                `Матч ${teamAObj.name} vs ` +
                `${teamBObj.name} не дал победителя`
            );
        }


        match.score =
            result?.score ||
            match.score;

        match.games =
            result?.games ||
            [];

        match.winnerObj =
            winner;

        match.winner =
            winner.name;


        renderPlayoffBracket(
            state
        );

        return {
            ...result,
            winner
        };
    }


    // ========================================================
    // ЧЕТВЕРТЬФИНАЛЫ
    // ========================================================

    const qf1Result =
        await playMatchAndUpdate(
            'qf1',
            team1,
            w1
        );

    const qf2Result =
        await playMatchAndUpdate(
            'qf2',
            w2,
            w3
        );

    const qf3Result =
        await playMatchAndUpdate(
            'qf3',
            team2,
            w4
        );

    const qf4Result =
        await playMatchAndUpdate(
            'qf4',
            team3,
            w5
        );


    // ========================================================
    // ПРОИГРАВШИЕ QF
    // ========================================================

    const qf1Loser =
        qf1Result.winner.name === team1.name
            ? w1
            : team1;

    const qf2Loser =
        qf2Result.winner.name === w2.name
            ? w3
            : w2;

    const qf3Loser =
        qf3Result.winner.name === team2.name
            ? w4
            : team2;

    const qf4Loser =
        qf4Result.winner.name === team3.name
            ? w5
            : team3;


    // ========================================================
    // LB ROUND 1
    // ========================================================

    await playMatchAndUpdate(
        'lb1_1',
        qf1Loser,
        qf2Loser
    );

    await playMatchAndUpdate(
        'lb1_2',
        qf3Loser,
        qf4Loser
    );

    const lb1_1Winner =
        state.matches.lb1_1.winnerObj;

    const lb1_2Winner =
        state.matches.lb1_2.winnerObj;


    // ========================================================
    // UPPER SEMIFINALS
    // ========================================================

    const sf1Result =
        await playMatchAndUpdate(
            'sf1',
            qf1Result.winner,
            qf2Result.winner
        );

    const sf2Result =
        await playMatchAndUpdate(
            'sf2',
            qf3Result.winner,
            qf4Result.winner
        );


    const sf1Loser =
        sf1Result.winner.name ===
        qf1Result.winner.name
            ? qf2Result.winner
            : qf1Result.winner;

    const sf2Loser =
        sf2Result.winner.name ===
        qf3Result.winner.name
            ? qf4Result.winner
            : qf3Result.winner;


    // ========================================================
    // LB ROUND 2
    // ========================================================

    await playMatchAndUpdate(
        'lb2_1',
        sf1Loser,
        lb1_1Winner
    );

    await playMatchAndUpdate(
        'lb2_2',
        sf2Loser,
        lb1_2Winner
    );

    const lb2_1Winner =
        state.matches.lb2_1.winnerObj;

    const lb2_2Winner =
        state.matches.lb2_2.winnerObj;


    // ========================================================
    // LB ROUND 3
    // ========================================================

    await playMatchAndUpdate(
        'lb3',
        lb2_1Winner,
        lb2_2Winner
    );

    const lb3Winner =
        state.matches.lb3.winnerObj;

    const lb3Loser =
        lb3Winner.name ===
        lb2_1Winner.name
            ? lb2_2Winner
            : lb2_1Winner;


    // ========================================================
    // UPPER BRACKET FINAL
    // ========================================================

    await playMatchAndUpdate(
        'ubf',
        sf1Result.winner,
        sf2Result.winner
    );

    const ubfWinner =
        state.matches.ubf.winnerObj;

    const ubfLoser =
        ubfWinner.name ===
        sf1Result.winner.name
            ? sf2Result.winner
            : sf1Result.winner;


    // ========================================================
    // LOWER BRACKET FINAL
    // ========================================================

    await playMatchAndUpdate(
        'lbf',
        ubfLoser,
        lb3Winner
    );

    const lbfWinner =
        state.matches.lbf.winnerObj;

    const lbfLoser =
        lbfWinner.name ===
        ubfLoser.name
            ? lb3Winner
            : ubfLoser;


    // ========================================================
    // GRAND FINAL
    // ========================================================

    await playMatchAndUpdate(
        'gf',
        ubfWinner,
        lbfWinner,
        5
    );

    const gfWinner =
        state.matches.gf.winnerObj;


    return {

        champion: gfWinner,

        grandFinal: {
            winner: gfWinner,
            loser:
                gfWinner.name ===
                ubfWinner.name
                    ? lbfWinner
                    : ubfWinner
        },

        ubFinal: {
            winner: ubfWinner,
            loser: ubfLoser
        },

        lbFinal: {
            winner: lbfWinner,
            loser: lbfLoser
        },

        lbRound3: [
            {
                winner: lb3Winner,
                loser: lb3Loser
            }
        ],

        lbRound2: [

            {
                winner: lb2_1Winner,
                loser:
                    lb2_1Winner.name ===
                    sf1Loser.name
                        ? lb1_1Winner
                        : sf1Loser
            },

            {
                winner: lb2_2Winner,
                loser:
                    lb2_2Winner.name ===
                    sf2Loser.name
                        ? lb1_2Winner
                        : sf2Loser
            }
        ],

        lbRound1: [

            {
                winner: lb1_1Winner,
                loser:
                    qf1Loser.name ===
                    lb1_1Winner.name
                        ? qf2Loser
                        : qf1Loser
            },

            {
                winner: lb1_2Winner,
                loser:
                    qf3Loser.name ===
                    lb1_2Winner.name
                        ? qf4Loser
                        : qf3Loser
            }
        ]
    };
}


// ============================================================
// ПОЛНЫЙ ТУРНИР
// ============================================================

export async function runFullTournament(
    generatedTeams,
    coreStats,
    supportStats,
    duoMap,
    allRatings
) {

    if (
        !generatedTeams ||
        !Array.isArray(generatedTeams) ||
        generatedTeams.length === 0
    ) {
        alert(
            'Сначала соберите команды ' +
            '(нажмите "Запустить турнир" после выбора игроков).'
        );

        return;
    }


    document.getElementById(
        'team-table-container'
    ).style.display = 'none';

    document.getElementById(
        'group-stage-wrapper'
    ).style.display = 'flex';

    document.getElementById(
        'history-matches'
    ).innerHTML = '';

    document.getElementById(
        'current-matches'
    ).innerHTML = '';


    const tournament =
        new Tournament(
            generatedTeams,
            coreStats,
            supportStats,
            duoMap
        );


    const initialStandings =
        tournament.getStandings();

    renderGroupTable(
        initialStandings,
        0
    );

    renderCurrentRound(
        0,
        []
    );


    let currentRoundMatches = [];


    const onMatchUpdate =
        async (matchObj) => {

            const idx =
                currentRoundMatches.findIndex(
                    m =>
                        m.teamA ===
                            matchObj.teamA &&
                        m.teamB ===
                            matchObj.teamB
                );

            if (idx !== -1) {

                currentRoundMatches[idx] =
                    matchObj;

            } else {

                currentRoundMatches.push(
                    matchObj
                );
            }


            renderCurrentRound(
                tournament.currentRound,
                currentRoundMatches
            );
        };


    const onRoundComplete =
        async (
            round,
            standings,
            matches
        ) => {

            renderGroupTable(
                standings,
                round
            );

            addHistoryRound(
                round,
                matches
            );

            currentRoundMatches = [];

            renderCurrentRound(
                round,
                []
            );

            await sleep(
                DELAYS.betweenRounds
            );
        };


    // ========================================================
    // GROUP STAGE
    // ========================================================

    const groupStandings =
        await tournament.runGroupStage(
            onRoundComplete,
            onMatchUpdate
        );


    await sleep(
        DELAYS.afterGroupStage
    );


    // ========================================================
    // ELIMINATION
    // ========================================================

    const eliminationWinners =
        await runEliminationStage(
            groupStandings,
            coreStats,
            supportStats,
            duoMap,
            tournament
        );


    // ========================================================
    // ФИНАЛЬНАЯ ЗАЩИТА ПЕРЕД PLAYOFF
    // ========================================================

    const eliminationCandidates =
        groupStandings.slice(3, 13);

    const eliminationCandidateNames =
        new Set(
            eliminationCandidates.map(
                team => team.name
            )
        );

    const eliminationWinnerNames =
        new Set(
            eliminationWinners.map(
                team => team.name
            )
        );


    // Проверяем, что все победители действительно
    // были среди участников elimination.
    for (const winner of eliminationWinners) {

        if (
            !eliminationCandidateNames.has(
                winner.name
            )
        ) {
            throw new Error(
                `КРИТИЧЕСКАЯ ОШИБКА: ` +
                `${winner.name} не участвовала ` +
                `в elimination`
            );
        }
    }


    // Проверяем, что количество победителей = 5.
    if (
        eliminationWinnerNames.size !== 5
    ) {
        throw new Error(
            'КРИТИЧЕСКАЯ ОШИБКА: `eliminationWinners` ' +
            'не содержит ровно 5 уникальных победителей'
        );
    }


    console.log(
        '%c[PLAYOFF ENTRY CHECK] Разрешённые команды elimination:',
        'color: blue; font-weight: bold;',
        [...eliminationWinnerNames]
    );


    await sleep(
        DELAYS.afterElimination
    );


    const top3 =
        groupStandings.slice(0, 3);


    // ========================================================
    // PLAYOFF
    // ========================================================

    const bracket =
        await runPlayoffStage(
            top3,
            eliminationWinners,
            tournament
        );


    // ========================================================
    // RESULTS
    // ========================================================

    const playoffTeams = [
        ...top3,
        ...eliminationWinners
    ];


    const userTeam =
        groupStandings.find(
            team => team.isUser
        );


    const placements =
        getPlacements(
            groupStandings,
            bracket,
            playoffTeams
        );


    renderTournamentResults(
        placements,
        userTeam,
        allRatings
    );


    document.getElementById(
        'tournament-status'
    ).innerHTML =
        `<h3 style="color:gold;">
            🏆 Чемпион:
            ${
                bracket.champion
                    ? bracket.champion.name
                    : '—'
            }
        </h3>`;
}