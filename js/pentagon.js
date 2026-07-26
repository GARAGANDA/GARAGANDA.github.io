// ============================================================
// pentagon.js
// Пошаговый выбор игроков
// + клик на игрока в пентагоне → тиммейты
// + линии сыгранности
// + бонусы синергии
// + группировка связей
// + вклад каждого игрока
//
// ИЗМЕНЕНИЯ:
// 1. Реролл теперь только 1 раз за всю стадию пиков.
// 2. Исправлена ошибка [...available].
// 3. Сохранён старый API:
//       const pentagon = initPentagon(...);
//       pentagon.initSelection();
//       pentagon.getSelectedPlayers();
// ============================================================

import {
    getFilteredPlayers,
    getPlayerRating,
    getPlayerRole,
    STEP_ORDER,
    ROLE_LABELS,
    CORE_ROLES,
    SUPPORT_ROLES
} from './roleData.js';

import {
    calculateSynergyBonus
} from './synergyCalculator.js';

import {
    openTeammatesModal
} from './ui/teammatesModal.js';

import {
    state
} from './core/state.js';

import {
    hasRating
} from './ratings.js';


// ============================================================
// ЦВЕТА ГРУПП СИНЕРГИИ
// ============================================================

const COLORS = [
    '#4caf50',
    '#ff6b6b',
    '#ffd93d',
    '#6bcbff',
    '#a29bfe',
    '#fd79a8',
    '#fdcb6e',
    '#00b894',
    '#e17055',
    '#74b9ff'
];


// ============================================================
// INIT PENTAGON
// ============================================================

export function initPentagon(
    duoMap,
    trioMap,
    quadMap,
    pentaMap,
    onTeamReady,
    onCancel
) {

    // ========================================================
    // СОСТОЯНИЕ
    // ========================================================

    let currentStep = 0;

    // Выбранные игроки
    const selectedPlayers = {};

    // ========================================================
    // ВАЖНО:
    // Раньше было:
    //
    // const rerollUsed = {};
    //
    // Из-за этого каждый roleKey имел свой реролл.
    //
    // Теперь:
    //
    // false = реролл доступен
    // true  = реролл уже использован
    //
    // ОДИН РЕРOЛЛ НА ВСЮ СТАДИЮ ПИКОВ.
    // ========================================================

    let rerollUsed = false;

    // Кандидаты каждой роли
    const currentCandidates = {};


    // ========================================================
    // DOM ЭЛЕМЕНТЫ
    // ========================================================

    const slots = {
        'carry':
            document.getElementById('slot-carry'),

        'mid':
            document.getElementById('slot-mid'),

        'offlane':
            document.getElementById('slot-offlane'),

        'semi-support':
            document.getElementById('slot-semi'),

        'full-support':
            document.getElementById('slot-full')
    };


    const roleNameEl =
        document.getElementById(
            'role-name'
        );


    const stepCounter =
        document.getElementById(
            'step-counter'
        );


    const cardsContainer =
        document.getElementById(
            'cards-container'
        );


    const rerollBtn =
        document.getElementById(
            'reroll-btn'
        );


    const startBtn =
        document.getElementById(
            'start-tournament-btn'
        );


    const statusText =
        document.getElementById(
            'status-text'
        );


    const stepTitle =
        document.getElementById(
            'step-title'
        );


    const avgRatingEl =
        document.getElementById(
            'avg-rating-value'
        );


    const avgRatingLabel =
        document.getElementById(
            'avg-rating-label'
        );


    const svg =
        document.querySelector(
            '.pentagon svg'
        );


    // ========================================================
    // ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ
    // ПОЛУЧЕНИЕ КАНДИДАТОВ
    // ========================================================

    function getCandidatesForRole(
        roleKey,
        count = 5
    ) {

        const available =
            getFilteredPlayers(
                roleKey
            );


        if (
            !available ||
            available.length === 0
        ) {

            return [];
        }


        // Исправлено:
        // было [.available]
        // стало [...available]
        const shuffled =
            [...available].sort(
                () =>
                    Math.random() -
                    0.5
            );


        return shuffled.slice(
            0,
            count
        );
    }


    // ========================================================
    // ОТРИСОВКА СПИСКА СИНЕРГИЙ
    // ========================================================

    function renderSynergyList(
        synergyResult
    ) {

        const container =
            document.getElementById(
                'synergy-list'
            );


        if (!container) {
            return;
        }


        if (
            !synergyResult ||
            (
                !synergyResult.groups?.length &&
                !Object.keys(
                    synergyResult.playerContributions || {}
                ).length
            )
        ) {

            container.innerHTML =
                '<span class="synergy-empty">Нет данных о синергиях</span>';

            return;
        }


        let html =
            '<table>';


        // ====================================================
        // 1. ПОЛОЖИТЕЛЬНЫЕ СВЯЗИ
        // ====================================================

        const groups =
            synergyResult.groups || [];


        if (
            groups.length > 0
        ) {

            const sortedGroups =
                [...groups].sort(
                    (
                        a,
                        b
                    ) => {

                        const order = {
                            penta: 0,
                            quad: 1,
                            trio: 2,
                            duo: 3
                        };


                        return (
                            (order[a.type] ?? 4) -
                            (order[b.type] ?? 4)
                        );
                    }
                );


            sortedGroups.forEach(
                group => {

                    const bonusStr =
                        group.bonus >= 0
                            ? '+'
                            : '';


                    const winrateStr =
                        group.winrate !== undefined
                            ? (
                                group.winrate *
                                100
                            ).toFixed(1)
                            : '0.0';


                    html += `
                        <tr>
                            <td class="synergy-players">
                                ${group.players.join(' + ')}
                            </td>

                            <td class="synergy-bonus">
                                ${bonusStr}${Number(group.bonus || 0).toFixed(2)}
                                очков
                                (${winrateStr}%)
                            </td>
                        </tr>
                    `;
                }
            );
        }


        // ====================================================
        // 2. ИГРОКИ С ОТРИЦАТЕЛЬНЫМ ВКЛАДОМ
        // ====================================================

        const playerContribs =
            synergyResult.playerContributions || {};


        const negativeContribs =
            Object.entries(
                playerContribs
            )
                .filter(
                    (
                        [
                            player,
                            contrib
                        ]
                    ) =>
                        contrib < 0
                )
                .sort(
                    (
                        a,
                        b
                    ) =>
                        a[1] -
                        b[1]
                );


        if (
            negativeContribs.length > 0
        ) {

            if (
                groups.length > 0
            ) {

                html += `
                    <tr class="synergy-separator">
                        <td colspan="2"></td>
                    </tr>
                `;
            }


            negativeContribs.forEach(
                (
                    [
                        player,
                        contrib
                    ]
                ) => {

                    html += `
                        <tr>
                            <td class="synergy-player-negative">
                                ${player} не имеет синергий
                            </td>

                            <td class="synergy-bonus negative">
                                ${Number(contrib).toFixed(2)}
                                очков
                            </td>
                        </tr>
                    `;
                }
            );
        }


        html +=
            '</table>';


        container.innerHTML =
            html;
    }


    // ========================================================
    // ОБНОВЛЕНИЕ СРЕДНЕГО РЕЙТИНГА
    // ========================================================

    function updateAverageRating() {

        let totalRating =
            0;


        let count =
            0;


        const players =
            [];


        STEP_ORDER.forEach(
            role => {

                const player =
                    selectedPlayers[
                        role
                    ];


                if (!player) {
                    return;
                }


                const rating =
                    getPlayerRating(
                        player,
                        role
                    );


                if (
                    rating !== null &&
                    rating !== undefined
                ) {

                    totalRating +=
                        Number(
                            rating
                        ) || 0;


                    count++;


                    players.push({
                        role,
                        name: player
                    });
                }
            }
        );


        // ====================================================
        // НЕТ ВЫБРАННЫХ ИГРОКОВ
        // ====================================================

        if (
            count === 0
        ) {

            if (avgRatingEl) {
                avgRatingEl.textContent =
                    '—';
            }


            if (avgRatingLabel) {
                avgRatingLabel.textContent =
                    'средний рейтинг';
            }


            return null;
        }


        // ====================================================
        // СРЕДНИЙ РЕЙТИНГ
        // ====================================================

        const avg =
            totalRating /
            count;


        // ====================================================
        // СИНЕРГИЯ
        // ====================================================

        const synergyResult =
            calculateSynergyBonus(
                players.map(
                    player =>
                        player.name
                ),
                duoMap
            );


        const totalBonus =
            Number(
                synergyResult?.totalBonus
            ) || 0;


        const totalWithBonus =
            avg +
            totalBonus;


        const bonusStr =
            totalBonus >= 0
                ? '+'
                : '';


        if (avgRatingEl) {

            avgRatingEl.textContent =
                totalWithBonus.toFixed(1) +
                ' (' +
                bonusStr +
                totalBonus.toFixed(2) +
                ')';
        }


        if (avgRatingLabel) {

            avgRatingLabel.textContent =
                'средний рейтинг';
        }


        // ====================================================
        // ЦВЕТ РЕЙТИНГА
        // ====================================================

        if (avgRatingEl) {

            if (
                totalWithBonus >= 85
            ) {

                avgRatingEl.style.color =
                    '#ffd93d';

            } else if (
                totalWithBonus >= 75
            ) {

                avgRatingEl.style.color =
                    '#ffb74d';

            } else if (
                totalWithBonus >= 65
            ) {

                avgRatingEl.style.color =
                    '#ff8a65';

            } else {

                avgRatingEl.style.color =
                    '#e57373';
            }
        }


        // ====================================================
        // НАЗНАЧАЕМ ЦВЕТА ГРУППАМ
        // ====================================================

        let colorIndex =
            0;


        if (
            synergyResult &&
            Array.isArray(
                synergyResult.groups
            )
        ) {

            synergyResult.groups.forEach(
                group => {

                    group.color =
                        COLORS[
                            colorIndex %
                            COLORS.length
                        ];


                    colorIndex++;
                }
            );
        }


        return synergyResult;
    }


    // ========================================================
    // ОТРИСОВКА ЛИНИЙ СИНЕРГИИ
    // ========================================================

    function drawLines(
        synergyResult
    ) {

        if (!svg) {
            return;
        }


        svg
            .querySelectorAll(
                '.synergy-line, .group-outline'
            )
            .forEach(
                element =>
                    element.remove()
            );


        const positions = {

            'carry': {
                x: 185,
                y: 70
            },

            'mid': {
                x: 100,
                y: 10
            },

            'offlane': {
                x: 15,
                y: 70
            },

            'semi-support': {
                x: 45,
                y: 175
            },

            'full-support': {
                x: 155,
                y: 175
            }
        };


        // ====================================================
        // ЕСЛИ СИНЕРГИИ НЕТ
        // РИСУЕМ НЕАКТИВНЫЕ ЛИНИИ
        // ====================================================

        if (
            !synergyResult ||
            !synergyResult.groups ||
            synergyResult.groups.length === 0
        ) {

            const roles =
                STEP_ORDER;


            for (
                let i = 0;
                i < roles.length;
                i++
            ) {

                for (
                    let j = i + 1;
                    j < roles.length;
                    j++
                ) {

                    const p1 =
                        positions[
                            roles[i]
                        ];


                    const p2 =
                        positions[
                            roles[j]
                        ];


                    if (
                        !p1 ||
                        !p2
                    ) {
                        continue;
                    }


                    const line =
                        document.createElementNS(
                            'http://www.w3.org/2000/svg',
                            'line'
                        );


                    line.setAttribute(
                        'x1',
                        p1.x
                    );


                    line.setAttribute(
                        'y1',
                        p1.y
                    );


                    line.setAttribute(
                        'x2',
                        p2.x
                    );


                    line.setAttribute(
                        'y2',
                        p2.y
                    );


                    line.classList.add(
                        'synergy-line',
                        'inactive'
                    );


                    svg.appendChild(
                        line
                    );
                }
            }


            return;
        }


        // ====================================================
        // ДЛЯ КАЖДОЙ ПАРЫ ОСТАВЛЯЕМ САМУЮ БОЛЬШУЮ ГРУППУ
        // ====================================================

        const pairToBestGroup =
            new Map();


        synergyResult.groups.forEach(
            group => {

                const players =
                    group.players || [];


                const size =
                    players.length;


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

                        const key =
                            [
                                players[i],
                                players[j]
                            ]
                                .sort()
                                .join(', ');


                        const existing =
                            pairToBestGroup.get(
                                key
                            );


                        if (
                            !existing ||
                            existing.size < size
                        ) {

                            pairToBestGroup.set(
                                key,
                                {
                                    size,
                                    group
                                }
                            );
                        }
                    }
                }
            }
        );


        // ====================================================
        // РИСУЕМ АКТИВНЫЕ ЛИНИИ
        // ====================================================

        synergyResult.groups.forEach(
            group => {

                const players =
                    group.players || [];


                const color =
                    group.color;


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

                        const key =
                            [
                                players[i],
                                players[j]
                            ]
                                .sort()
                                .join(', ');


                        const best =
                            pairToBestGroup.get(
                                key
                            );


                        if (
                            !best ||
                            best.group !== group
                        ) {

                            continue;
                        }


                        let role1 =
                            null;


                        let role2 =
                            null;


                        for (
                            const role of STEP_ORDER
                        ) {

                            if (
                                selectedPlayers[
                                    role
                                ] === players[i]
                            ) {

                                role1 =
                                    role;
                            }


                            if (
                                selectedPlayers[
                                    role
                                ] === players[j]
                            ) {

                                role2 =
                                    role;
                            }
                        }


                        if (
                            !role1 ||
                            !role2
                        ) {

                            continue;
                        }


                        const pos1 =
                            positions[
                                role1
                            ];


                        const pos2 =
                            positions[
                                role2
                            ];


                        if (
                            !pos1 ||
                            !pos2
                        ) {

                            continue;
                        }


                        const line =
                            document.createElementNS(
                                'http://www.w3.org/2000/svg',
                                'line'
                            );


                        line.setAttribute(
                            'x1',
                            pos1.x
                        );


                        line.setAttribute(
                            'y1',
                            pos1.y
                        );


                        line.setAttribute(
                            'x2',
                            pos2.x
                        );


                        line.setAttribute(
                            'y2',
                            pos2.y
                        );


                        line.classList.add(
                            'synergy-line',
                            'active'
                        );


                        line.style.stroke =
                            color;


                        svg.appendChild(
                            line
                        );
                    }
                }
            }
        );


        // ====================================================
        // ЦВЕТ РАМКИ ИГРОКОВ
        // ====================================================

        const colorMap =
            {};


        synergyResult.groups.forEach(
            group => {

                (
                    group.players || []
                ).forEach(
                    player => {

                        colorMap[
                            player
                        ] =
                            group.color;
                    }
                );
            }
        );


        const slotsEls =
            document.querySelectorAll(
                '.vertex-player'
            );


        slotsEls.forEach(
            slot => {

                const nameSpan =
                    slot.querySelector(
                        '.player-name'
                    );


                if (!nameSpan) {
                    return;
                }


                const playerName =
                    nameSpan.textContent;


                if (
                    playerName === '—' ||
                    !colorMap[
                        playerName
                    ]
                ) {

                    slot.style.borderColor =
                        '#555';


                    slot.style.borderWidth =
                        '2px';


                    return;
                }


                slot.style.borderColor =
                    colorMap[
                        playerName
                    ];


                slot.style.borderWidth =
                    '4px';
            }
        );
    }


    // ========================================================
    // ОБНОВЛЕНИЕ ПЕНТАГОНА
    // ========================================================

    function updatePentagon() {

        STEP_ORDER.forEach(
            role => {

                const el =
                    slots[
                        role
                    ];


                if (!el) {
                    return;
                }


                const name =
                    selectedPlayers[
                        role
                    ];


                const nameSpan =
                    el.querySelector(
                        '.player-name'
                    );


                const ratingSpan =
                    el.querySelector(
                        '.player-rating'
                    );


                if (
                    name
                ) {

                    if (nameSpan) {

                        nameSpan.textContent =
                            name;
                    }


                    el.classList.remove(
                        'empty'
                    );


                    const rating =
                        getPlayerRating(
                            name,
                            role
                        );


                    if (
                        ratingSpan
                    ) {

                        ratingSpan.textContent =
                            rating !== null &&
                            rating !== undefined
                                ? `${rating}`
                                : '';
                    }

                } else {

                    if (nameSpan) {

                        nameSpan.textContent =
                            '—';
                    }


                    el.classList.add(
                        'empty'
                    );


                    if (
                        ratingSpan
                    ) {

                        ratingSpan.textContent =
                            '';
                    }


                    el.style.borderColor =
                        '#555';


                    el.style.borderWidth =
                        '2px';
                }
            }
        );


        const players =
            STEP_ORDER
                .map(
                    role => ({
                        role,
                        name:
                            selectedPlayers[
                                role
                            ]
                    })
                )
                .filter(
                    player =>
                        player.name
                );


        const synergyResult =
            updateAverageRating();


        drawLines(
            synergyResult
        );


        renderSynergyList(
            synergyResult
        );
    }


    // ========================================================
    // РЕНДЕР ШАГА
    // ========================================================

    function renderStep() {

        const roleKey =
            STEP_ORDER[
                currentStep
            ];


        if (!roleKey) {
            return;
        }


        const roleLabel =
            ROLE_LABELS[
                roleKey
            ];


        if (roleNameEl) {

            roleNameEl.textContent =
                roleLabel;
        }


        if (stepCounter) {

            stepCounter.textContent =
                `${currentStep + 1} / ${STEP_ORDER.length}`;
        }


        if (!cardsContainer) {
            return;
        }


        // ====================================================
        // КЛАСС СЕТКИ
        // ====================================================

        cardsContainer.className =
            'cards-grid';


        cardsContainer.innerHTML =
            '';


        // ====================================================
        // ПОЛУЧАЕМ КАНДИДАТОВ
        // ====================================================

        const candidates =
            currentCandidates[
                roleKey
            ] ||
            getCandidatesForRole(
                roleKey,
                5
            );


        currentCandidates[
            roleKey
        ] =
            candidates;


        // ====================================================
        // НЕТ КАНДИДАТОВ
        // ====================================================

        if (
            candidates.length === 0
        ) {

            cardsContainer.innerHTML =
                `
                    <div class="no-candidates">
                        Нет игроков с рейтингом
                        для этой роли
                    </div>
                `;


            if (statusText) {

                statusText.textContent =
                    `Нет доступных игроков для позиции ${roleLabel}`;
            }


            return;
        }


        // ====================================================
        // КАРТОЧКИ
        // ====================================================

        candidates.forEach(
            player => {

                const card =
                    document.createElement(
                        'div'
                    );


                card.className =
                    'card';


                const rating =
                    getPlayerRating(
                        player,
                        roleKey
                    );


                const ratingText =
                    rating !== null &&
                    rating !== undefined
                        ? `ОБЩ ${rating}`
                        : '';


                card.innerHTML = `
                    <span>${player}</span>

                    <span class="role-label">
                        ${roleLabel}
                    </span>

                    <span class="rating-label">
                        ${ratingText}
                    </span>
                `;


                card.addEventListener(
                    'click',
                    () => {

                        // Уже выбран игрок
                        if (
                            selectedPlayers[
                                roleKey
                            ]
                        ) {

                            return;
                        }


                        // Нет рейтинга
                        if (
                            !hasRating(
                                player,
                                roleKey
                            )
                        ) {

                            alert(
                                `Нет рейтинга для ${player} на позиции ${roleLabel}.`
                            );


                            return;
                        }


                        // ==================================================
                        // ПРОВЕРКА:
                        // игрок не должен быть уже выбран на другой позиции
                        // ==================================================

                        const alreadySelected =
                            Object.entries(
                                selectedPlayers
                            ).some(
                                (
                                    [
                                        role,
                                        selected
                                    ]
                                ) => {

                                    return (
                                        role !== roleKey &&
                                        selected === player
                                    );
                                }
                            );


                        if (
                            alreadySelected
                        ) {

                            alert(
                                `Игрок ${player} уже выбран на другой позиции.`
                            );


                            return;
                        }


                        // ==================================================
                        // СОХРАНЯЕМ ВЫБОР
                        // ==================================================

                        selectedPlayers[
                            roleKey
                        ] =
                            player;


                        // ==================================================
                        // ОБНОВЛЯЕМ ПЕНТАГОН
                        // ==================================================

                        updatePentagon();


                        // ==================================================
                        // ПЕРЕХОД К СЛЕДУЮЩЕЙ РОЛИ
                        // ==================================================

                        if (
                            currentStep <
                            STEP_ORDER.length - 1
                        ) {

                            currentStep++;


                            renderStep();


                            return;
                        }


                        // ==================================================
                        // ВСЕ ПОЗИЦИИ СОБРАНЫ
                        // ==================================================

                        if (statusText) {

                            statusText.textContent =
                                '✅ Все позиции заполнены! Нажмите "Запустить турнир".';
                        }


                        if (startBtn) {

                            startBtn.disabled =
                                false;
                        }


                        // ==================================================
                        // КНОПКА СЛУЧАЙНЫХ КОМАНД
                        // ТОЖЕ СТАНОВИТСЯ АКТИВНОЙ
                        // ==================================================

                        const btnRandom =
                            document.getElementById(
                                'btn-random-teams'
                            );


                        if (
                            btnRandom
                        ) {

                            btnRandom.disabled =
                                false;
                        }


                        // ==================================================
                        // ОЧИЩАЕМ КАРТОЧКИ
                        // ==================================================

                        cardsContainer.innerHTML =
                            '';


                        // Реролл больше не нужен
                        if (rerollBtn) {

                            rerollBtn.disabled =
                                true;


                            rerollBtn.textContent =
                                'Реролл недоступен';
                        }


                        if (stepTitle) {

                            stepTitle.innerHTML =
                                'Команда собрана!';
                        }


                        // ==================================================
                        // CALLBACK
                        // ==================================================

                        if (
                            onTeamReady
                        ) {

                            onTeamReady(
                                selectedPlayers
                            );
                        }
                    }
                );


                cardsContainer.appendChild(
                    card
                );
            }
        );


        // ====================================================
        // РЕРOЛЛ
        // ====================================================
        //
        // ВАЖНО:
        // Здесь теперь НЕ используется rerollUsed[roleKey].
        //
        // Один общий rerollUsed на всю стадию.
        // ====================================================

        if (
            selectedPlayers[
                roleKey
            ]
        ) {

            if (rerollBtn) {

                rerollBtn.disabled =
                    true;


                rerollBtn.textContent =
                    'Реролл недоступен';


                rerollBtn.onclick =
                    null;
            }

        } else if (
            rerollUsed
        ) {

            if (rerollBtn) {

                rerollBtn.disabled =
                    true;


                rerollBtn.textContent =
                    'Реролл использован';


                rerollBtn.onclick =
                    null;
            }

        } else {

            if (rerollBtn) {

                rerollBtn.disabled =
                    false;


                rerollBtn.textContent =
                    '🔄 Остался 1 реролл';


                rerollBtn.onclick =
                    () => {

                        // ============================================
                        // ЗАЩИТА
                        // ============================================

                        if (
                            rerollUsed
                        ) {

                            return;
                        }


                        if (
                            selectedPlayers[
                                roleKey
                            ]
                        ) {

                            return;
                        }


                        // ============================================
                        // ИСПОЛЬЗУЕМ ЕДИНСТВЕННЫЙ РЕРOЛЛ
                        // ============================================

                        rerollUsed =
                            true;


                        // ============================================
                        // МЕНЯЕМ КАНДИДАТОВ ТОЛЬКО ТЕКУЩЕЙ РОЛИ
                        // ============================================

                        currentCandidates[
                            roleKey
                        ] =
                            getCandidatesForRole(
                                roleKey,
                                5
                            );


                        // ============================================
                        // ПЕРЕРИСОВЫВАЕМ
                        // ============================================

                        renderStep();
                    };
            }
        }


        // ====================================================
        // СТАТУС
        // ====================================================

        if (
            selectedPlayers[
                roleKey
            ]
        ) {

            if (statusText) {

                statusText.textContent =
                    `✅ Выбран ${selectedPlayers[roleKey]} на позицию ${roleLabel}`;
            }

        } else {

            if (statusText) {

                statusText.textContent =
                    `Выберите игрока на позицию ${roleLabel}`;
            }
        }


        // ====================================================
        // ПРОВЕРКА ВСЕХ ПОЗИЦИЙ
        // ====================================================

        const allSelected =
            STEP_ORDER.every(
                role =>
                    selectedPlayers[
                        role
                    ]
            );


        if (startBtn) {

            startBtn.disabled =
                !allSelected;
        }


        // ====================================================
        // ОБНОВЛЯЕМ ПЕНТАГОН
        // ====================================================

        updatePentagon();
    }


    // ========================================================
    // ИНИЦИАЛИЗАЦИЯ
    // ========================================================

    function initSelection() {

        // ====================================================
        // СБРАСЫВАЕМ ИГРОКОВ
        // ====================================================

        STEP_ORDER.forEach(
            role => {

                selectedPlayers[
                    role
                ] =
                    null;


                currentCandidates[
                    role
                ] =
                    getCandidatesForRole(
                        role,
                        5
                    );
            }
        );


        // ====================================================
        // СБРАСЫВАЕМ ЕДИНСТВЕННЫЙ РЕРOЛЛ
        // ====================================================

        rerollUsed =
            false;


        // ====================================================
        // НАЧИНАЕМ С CARRY
        // ====================================================

        currentStep =
            0;


        // ====================================================
        // ОБНОВЛЯЕМ ПЕНТАГОН
        // ====================================================

        updatePentagon();


        // ====================================================
        // РЕНДЕРИМ ПЕРВУЮ РОЛЬ
        // ====================================================

        renderStep();


        // ====================================================
        // КНОПКА СТАРТА
        // ====================================================

        if (startBtn) {

            startBtn.disabled =
                true;
        }


        // ====================================================
        // ПОКАЗЫВАЕМ ОСНОВНОЙ ИНТЕРФЕЙС
        // ====================================================

        const mainInterface =
            document.getElementById(
                'main-interface'
            );


        if (
            mainInterface
        ) {

            mainInterface.style.display =
                'block';
        }


        const startScreen =
            document.getElementById(
                'start-screen'
            );


        if (
            startScreen
        ) {

            startScreen.style.display =
                'none';
        }


        // ====================================================
        // ОЧИЩАЕМ ЛИНИИ
        // ====================================================

        drawLines(
            null
        );
    }


    // ========================================================
    // ПОЛУЧЕНИЕ ВЫБРАННЫХ ИГРОКОВ
    // ========================================================

    function getSelectedPlayers() {

        return selectedPlayers;
    }


    // ========================================================
    // КЛИК ПО СЛОТАМ ПЕНТАГОНА
    // ПОКАЗ ТИММЕЙТОВ
    // ========================================================

    STEP_ORDER.forEach(
        role => {

            const slot =
                slots[
                    role
                ];


            if (!slot) {
                return;
            }


            slot.addEventListener(
                'click',
                () => {

                    const name =
                        selectedPlayers[
                            role
                        ];


                    if (
                        name
                    ) {

                        openTeammatesModal(
                            name,
                            duoMap
                        );
                    }
                }
            );


            slot.style.pointerEvents =
                'auto';
        }
    );


    // ========================================================
    // КНОПКА ОТМЕНЫ
    // ========================================================

    const cancelBtn =
        document.getElementById(
            'btn-cancel-draft'
        );


    if (
        cancelBtn
    ) {

        cancelBtn.addEventListener(
            'click',
            () => {

                // Сбрасываем пики
                initSelection();


                // Если передан внешний callback
                if (
                    onCancel
                ) {

                    onCancel();
                }
            }
        );
    }


    // ========================================================
    // ВОЗВРАЩАЕМ СТАРЫЙ API
    // ========================================================
    //
    // Именно это важно для твоего app.js:
    //
    // const pentagonInstance =
    //     initPentagon(...);
    //
    // pentagonInstance.initSelection();
    //
    // pentagonInstance.getSelectedPlayers();
    // ========================================================


    
    return {
        initSelection,
        getSelectedPlayers
    };
}