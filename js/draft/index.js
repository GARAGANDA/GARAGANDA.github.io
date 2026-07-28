import {
    createDraftContainer,
    renderDraftUI,
    showDraftChoiceModal
} from './ui/container.js';

import {
    initDraftState,
    initAutoDraftState
} from './core/state.js';

import {
    startNewGame,
    botMakeMove,
    calculateGameResult
} from './core/gameLogic.js';

import {
    ensureDataLoaded
} from './data/heroData.js';

import {
    getDraftOrder
} from './core/stateHelpers.js';

import {
    sleep
} from '../utils/helpers.js';

import {
    DELAYS
} from '../config/delays.js';


let draftResolve = null;
let currentDraftState = null;
let currentContainer = null;
let isFinished = false;


// ============================================================
// РУЧНОЙ ДРАФТ С UI
// ============================================================

export async function runDraft(
    teamA,
    teamB,
    bestOf = 3,
    options = {}
) {
    const {
        showChoice = false
    } = options;


    // --------------------------------------------------------
    // Выбор:
    // обычный драфт или пропуск драфта
    // --------------------------------------------------------

    if (showChoice) {
        const choice =
            await showDraftChoiceModal(
                teamA,
                teamB
            );


        if (choice === 'skip') {
            return autoDraftMatch(
                teamA,
                teamB,
                bestOf
            );
        }
    }


    // --------------------------------------------------------
    // Загружаем данные героев
    // --------------------------------------------------------

    await ensureDataLoaded();


    // --------------------------------------------------------
    // Для ручного драфта можно менять порядок команд.
    //
    // Это НЕ влияет на autoDraftMatch().
    // --------------------------------------------------------

    if (
        Math.random() < 0.5
    ) {
        const temp =
            teamA;

        teamA =
            teamB;

        teamB =
            temp;
    }


    // --------------------------------------------------------
    // Создаём состояние ручного драфта
    // --------------------------------------------------------

    const state =
        initDraftState(
            teamA,
            teamB,
            bestOf
        );


    currentDraftState =
        state;


    // --------------------------------------------------------
    // Создаём UI
    // --------------------------------------------------------

    const container =
        createDraftContainer();


    currentContainer =
        container;


    document.body.appendChild(
        container
    );


    // --------------------------------------------------------
    // Сохраняем команды в dataset
    // --------------------------------------------------------

    container.dataset.teamA =
        teamA.name;

    container.dataset.teamB =
        teamB.name;


    // --------------------------------------------------------
    // Отрисовываем UI
    // --------------------------------------------------------

    renderDraftUI(
        state,
        container
    );


    // --------------------------------------------------------
    // Запускаем первую игру
    // --------------------------------------------------------

    startNewGame(
        state,
        container
    );


    isFinished =
        false;


    // --------------------------------------------------------
    // Ожидаем завершения драфта
    // --------------------------------------------------------

    return new Promise(
        resolve => {

            draftResolve =
                resolve;


            window._finishDraft =
                result => {

                    if (
                        !isFinished
                    ) {
                        isFinished =
                            true;


                        showFinishButton(
                            container,
                            result,
                            resolve
                        );
                    }
                };
        }
    );
}


// ============================================================
// КНОПКА ЗАВЕРШЕНИЯ РУЧНОГО ДРАФТА
// ============================================================

function showFinishButton(
    container,
    result,
    resolve
) {
    let finishBlock =
        container.querySelector(
            '.draft-finish-block'
        );


    if (
        !finishBlock
    ) {
        finishBlock =
            document.createElement(
                'div'
            );


        finishBlock.className =
            'draft-finish-block';


        const draftContainer =
            container.querySelector(
                '.draft-container'
            );


        if (
            draftContainer
        ) {
            draftContainer.appendChild(
                finishBlock
            );
        } else {
            container.appendChild(
                finishBlock
            );
        }
    }


    // --------------------------------------------------------
    // Названия команд
    // --------------------------------------------------------

    const teamAName =
        container.dataset.teamA ||
        'Team A';


    const teamBName =
        container.dataset.teamB ||
        'Team B';


    // --------------------------------------------------------
    // Победитель
    // --------------------------------------------------------

    const winnerName =
        result &&
        result.winner
            ? result.winner.name
            : 'Unknown';


    // --------------------------------------------------------
    // Счёт
    // --------------------------------------------------------

    const score =
        result &&
        Array.isArray(
            result.score
        )
            ? result.score.join(
                ' - '
            )
            : '0 - 0';


    // --------------------------------------------------------
    // Показываем результат
    // --------------------------------------------------------

    finishBlock.style.display =
        'block';


    finishBlock.innerHTML = `
        <div class="finish-content">

            <div class="finish-title">
                🏆 Серия завершена!
            </div>

            <div class="finish-result">

                <span class="winner">
                    ${winnerName}
                </span>

                <span class="score">
                    ${score}
                </span>

            </div>

            <button
                class="btn-finish-tournament"
                type="button"
            >
                Вернуться к турниру
            </button>

        </div>
    `;


    // --------------------------------------------------------
    // Кнопка возврата
    // --------------------------------------------------------

    const btn =
        finishBlock.querySelector(
            '.btn-finish-tournament'
        );


    if (
        btn
    ) {
        btn.addEventListener(
            'click',
            () => {

                if (
                    currentContainer
                ) {
                    currentContainer.remove();

                    currentContainer =
                        null;
                }


                resolve(
                    result
                );


                delete window._finishDraft;
            }
        );
    }
}


// ============================================================
// АВТОМАТИЧЕСКИЙ ДРАФТ
// ============================================================
//
// ВАЖНО:
// Здесь больше НЕТ случайной перестановки teamA/teamB.
//
// Победитель каждой карты определяется через реальное
// соответствие:
//
// state.draftTeams.dire
// state.draftTeams.radiant
//
// а не через предположение:
//
// dire === teamA
//
// Это исправляет ситуацию, когда при Skip Draft:
//
// 322 Team победила 2:0
//
// но в следующий раунд передавалась команда соперника.
// ============================================================

export async function autoDraftMatch(
    teamA,
    teamB,
    bestOf = 3
) {
    await ensureDataLoaded();


    // --------------------------------------------------------
    // Количество побед для завершения серии
    // --------------------------------------------------------

    const winsNeeded =
        Math.ceil(
            bestOf / 2
        );


    let winsA =
        0;


    let winsB =
        0;


    const games =
        [];


    // --------------------------------------------------------
    // Контейнер для автоматического драфта.
    // Он не отображается пользователю.
    // --------------------------------------------------------

    const container =
        document.createElement(
            'div'
        );


    // --------------------------------------------------------
    // Играем серию
    // --------------------------------------------------------

    while (
        winsA < winsNeeded &&
        winsB < winsNeeded
    ) {

        // ----------------------------------------------------
        // Создаём состояние автодрафта.
        //
        // ВАЖНО:
        // Передаём исходные teamA/teamB без перестановки.
        // ----------------------------------------------------

        const state =
            initAutoDraftState(
                teamA,
                teamB,
                1
            );


        // ----------------------------------------------------
        // Запускаем автодрафт
        // ----------------------------------------------------

        await runAutoDraft(
            state,
            container
        );


        // ----------------------------------------------------
        // Получаем результат игры
        // ----------------------------------------------------

        const cardResult =
            calculateGameResult(
                state
            );


        // ----------------------------------------------------
        // Определяем реальные команды Dire/Radiant
        //
        // Это ключевой момент исправления.
        // ----------------------------------------------------

        let direTeam =
            null;


        let radiantTeam =
            null;


        // ----------------------------------------------------
        // Пытаемся получить команды из состояния автодрафта.
        //
        // В разных версиях state.js структура может называться
        // draftTeams или teams.
        // ----------------------------------------------------

        if (
            state &&
            state.draftTeams
        ) {
            if (
                state.draftTeams.dire
            ) {
                direTeam =
                    state.draftTeams.dire;
            }


            if (
                state.draftTeams.radiant
            ) {
                radiantTeam =
                    state.draftTeams.radiant;
            }
        }


        // ----------------------------------------------------
        // Если структура draftTeams отсутствует,
        // используем state.teamA / state.teamB,
        // если они есть.
        // ----------------------------------------------------

        if (
            !direTeam &&
            state &&
            state.teamA
        ) {
            direTeam =
                state.teamA;
        }


        if (
            !radiantTeam &&
            state &&
            state.teamB
        ) {
            radiantTeam =
                state.teamB;
        }


        // ----------------------------------------------------
        // Последний fallback:
        //
        // initAutoDraftState(teamA, teamB)
        // должен соответствовать:
        //
        // Dire    = teamA
        // Radiant = teamB
        //
        // Этот fallback нужен только для совместимости
        // со старыми версиями state.js.
        // ----------------------------------------------------

        if (
            !direTeam
        ) {
            direTeam =
                teamA;
        }


        if (
            !radiantTeam
        ) {
            radiantTeam =
                teamB;
        }


        // ----------------------------------------------------
        // Определяем победителя текущей карты
        // ----------------------------------------------------

        let gameWinner =
            null;


        if (
            cardResult.winner ===
            'dire'
        ) {
            gameWinner =
                direTeam;
        } else if (
            cardResult.winner ===
            'radiant'
        ) {
            gameWinner =
                radiantTeam;
        }


        // ----------------------------------------------------
        // Дополнительная защита:
        // если calculateGameResult вернул не dire/radiant,
        // пытаемся использовать объект winner.
        // ----------------------------------------------------

        if (
            !gameWinner &&
            cardResult.winner &&
            typeof cardResult.winner ===
            'object'
        ) {
            gameWinner =
                cardResult.winner;
        }


        // ----------------------------------------------------
        // Если победителя определить не удалось —
        // останавливаемся с понятной ошибкой.
        //
        // Нельзя молча отправлять неправильную команду дальше.
        // ----------------------------------------------------

        if (
            !gameWinner
        ) {
            console.error(
                'autoDraftMatch: ' +
                'не удалось определить победителя карты.',
                {
                    cardResult,
                    state,
                    teamA,
                    teamB,
                    direTeam,
                    radiantTeam
                }
            );


            throw new Error(
                'Auto Draft: не удалось определить ' +
                'победителя карты.'
            );
        }


        // ----------------------------------------------------
        // Определяем:
        // победила teamA или teamB
        // ----------------------------------------------------

        const isTeamAWinner =
            gameWinner === teamA ||
            gameWinner.id === teamA.id ||
            gameWinner.name === teamA.name;


        const isTeamBWinner =
            gameWinner === teamB ||
            gameWinner.id === teamB.id ||
            gameWinner.name === teamB.name;


        // ----------------------------------------------------
        // Защита от ситуации, когда победитель не совпал
        // ни с одной командой серии.
        // ----------------------------------------------------

        if (
            !isTeamAWinner &&
            !isTeamBWinner
        ) {
            console.error(
                'autoDraftMatch: ' +
                'победитель карты не принадлежит текущей серии.',
                {
                    gameWinner,
                    teamA,
                    teamB,
                    direTeam,
                    radiantTeam,
                    cardResult
                }
            );


            throw new Error(
                `Auto Draft: победитель "${gameWinner.name}" ` +
                `не найден среди команд "${teamA.name}" ` +
                `и "${teamB.name}".`
            );
        }


        // ----------------------------------------------------
        // Обновляем счёт серии
        // ----------------------------------------------------

        if (
            isTeamAWinner
        ) {
            winsA++;
        } else {
            winsB++;
        }


        // ----------------------------------------------------
        // Сохраняем результат карты
        //
        // ВАЖНО:
        // winner здесь — реальное имя победившей команды,
        // а не teamA/teamB по индексу.
        // ----------------------------------------------------

        games.push({
            winner:
                gameWinner.name,

            score:
                `${winsA}-${winsB}`
        });


        // ----------------------------------------------------
        // Задержка между картами
        // ----------------------------------------------------

        await sleep(
            DELAYS.simulationCardDelay
        );
    }


    // ========================================================
    // ФИНАЛЬНЫЙ ПОБЕДИТЕЛЬ СЕРИИ
    // ========================================================

    let winner =
        null;


    if (
        winsA > winsB
    ) {
        winner =
            teamA;
    } else if (
        winsB > winsA
    ) {
        winner =
            teamB;
    }


    // --------------------------------------------------------
    // Защита от невозможного результата
    // --------------------------------------------------------

    if (
        !winner
    ) {
        throw new Error(
            `Auto Draft: невозможно определить победителя серии ` +
            `${teamA.name} ${winsA}:${winsB} ${teamB.name}.`
        );
    }


    // ========================================================
    // Возвращаем результат в том же формате,
    // что и обычная симуляция матча.
    // ========================================================

    return {
        winner,

        score: [
            winsA,
            winsB
        ],

        games
    };
}


// ============================================================
// АВТОМАТИЧЕСКИЙ ДРАФТ ОДНОЙ КАРТЫ
// ============================================================

async function runAutoDraft(
    state,
    container
) {
    if (
        !state ||
        !state.gameState
    ) {
        console.error(
            'runAutoDraft: state.gameState is null'
        );

        return;
    }


    // --------------------------------------------------------
    // Получаем порядок драфта
    // --------------------------------------------------------

    const DRAFT_ORDER =
        getDraftOrder();


    // --------------------------------------------------------
    // Начинаем с первого шага
    // --------------------------------------------------------

    state.gameState.currentStep =
        -1;


    // --------------------------------------------------------
    // Выполняем все шаги автодрафта
    // --------------------------------------------------------

    for (
        let i = 0;
        i < DRAFT_ORDER.length;
        i++
    ) {
        const step =
            DRAFT_ORDER[i];


        const {
            team,
            type
        } =
            step;


        // ---------------------------------------------
        // Обновляем текущий шаг
        // ---------------------------------------------

        state.gameState.currentStep =
            i;


        // ---------------------------------------------
        // Ход бота
        // ---------------------------------------------

        botMakeMove(
            state,
            container,
            team,
            type
        );


        // ---------------------------------------------
        // Небольшая задержка
        // ---------------------------------------------

        await sleep(
            DELAYS.draftBotStep
        );
    }


    // --------------------------------------------------------
    // Драфт завершён
    // --------------------------------------------------------

    state.gameState.isFinished =
        true;
}