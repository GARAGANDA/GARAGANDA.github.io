// ============================================================
// js/draft/ui/renderers.js
// ============================================================

import { getDraftOrder, getTeamPlayers } from '../core/stateHelpers.js';
import { getTeamDirection, getTeamRating, getLaneData, computeStrongPicks, computePickPower } from '../core/calculations.js';
import { showTooltip, hideTooltip, moveTooltip } from '../core/gameLogic.js';
import { getHeroStage } from '../data/heroData.js';

export function renderPlayers(container, state, teamKey) {
    const team = state.teams[teamKey];
    const containerId = teamKey === 'dire' ? 'dire-players' : 'radiant-players';
    const el = container.querySelector(`#${containerId}`);
    if (!el) return;
    el.innerHTML = '';
    const playerList = team.players;
    const roleLabels = team.roleLabels;
    const picked = state.gameState?.pickedPlayers?.[teamKey] || [];
    for (const role of team.roles) {
        const player = playerList[role];
        const label = roleLabels[role] || role;
        const div = document.createElement('div');
        div.className = 'player-item' + (picked.includes(player) ? ' picked' : '');
        const poolSize = state.gameState?.pools?.[player]?.length ?? 0;
        div.innerHTML = `
            <span class="player-role">${label}</span>
            <span class="player-name${teamKey === 'dire' ? ' highlight' : ''}">${player}</span>
            <span class="player-hero-pool">${poolSize} гер.</span>
        `;
        el.appendChild(div);
    }
}

export function renderBans(container, teamKey, bans, state) {
    const containerId = teamKey === 'dire' ? 'dire-bans' : 'radiant-bans';
    const el = container.querySelector(`#${containerId}`);
    if (!el) return;
    el.innerHTML = '';
    const fullBans = bans.length >= 7 ? bans : [...bans, ...Array(7 - bans.length).fill(null)];
    fullBans.forEach((hero, i) => {
        const div = document.createElement('div');
        div.className = `ban-slot${hero ? ' filled' : ''}`;
        if (hero) {
            div.innerHTML = `<span class="ban-order">#${i+1}</span><span class="ban-name">${hero}</span>`;
            div.addEventListener('mouseenter', (e) => showTooltip(e, hero, state));
            div.addEventListener('mouseleave', hideTooltip);
            div.addEventListener('mousemove', moveTooltip);
        } else {
            div.innerHTML = `<span class="ban-order">#${i+1}</span><span style="opacity:0.3;">—</span>`;
        }
        el.appendChild(div);
    });
}

export function renderPicks(container, teamKey, picks, state) {
    const containerId = teamKey === 'dire' ? 'dire-picks' : 'radiant-picks';
    const el = container.querySelector(`#${containerId}`);
    if (!el) return;
    el.innerHTML = '';
    const roles = ['carry', 'mid', 'offlane', 'semi', 'full'];
    const roleLabels = {
        carry: 'Carry',
        mid: 'Mid',
        offlane: 'Offlane',
        semi: 'Semi-Supp',
        full: 'Full-Supp'
    };
    const opponentTeamKey = teamKey === 'dire' ? 'radiant' : 'dire';
    const opponentPicks = state.gameState?.picks?.[opponentTeamKey] || {};
    const opponentHeroes = Object.values(opponentPicks).filter(p => p !== null).map(p => p.hero);
    const heroVs = window._heroVsData || {};
    const hasData = Object.keys(heroVs).length > 0;

    for (const role of roles) {
        const pick = picks[role] || null;
        const wrapper = document.createElement('div');
        wrapper.className = 'pick-wrapper';

        const slotDiv = document.createElement('div');
        slotDiv.className = `pick-slot${pick ? ' filled' : ''}`;
        if (pick) {
            const stat = state.gameState?.stats?.[pick.player]?.[pick.hero];
            const games = stat ? stat.total : 0;
            const wr = stat ? (stat.winrate * 100).toFixed(1) : '?';
            const stage = getHeroStage(pick.hero);

            // НОВАЯ СТРУКТУРА КАРТОЧКИ
            slotDiv.innerHTML = `
                <div class="pick-player-row">
                    <span class="pick-player-name">${pick.player}</span>
                    <span class="pick-player-role">${roleLabels[role]}</span>
                </div>
                <span class="pick-hero-name">${pick.hero}</span>
                <div class="pick-stats-row">
                    <span class="pick-games">${games} игр</span>
                    <span class="pick-winrate">${wr}%</span>
                    <span class="pick-stage ${stage}">${stage}</span>
                </div>
            `;
            slotDiv.addEventListener('mouseenter', (e) => showTooltip(e, pick.hero, state));
            slotDiv.addEventListener('mouseleave', hideTooltip);
            slotDiv.addEventListener('mousemove', moveTooltip);
        } else {
            slotDiv.innerHTML = `<span class="pick-order">${roleLabels[role]}</span><span style="opacity:0.3;">—</span>`;
        }
        wrapper.appendChild(slotDiv);

        const strongDiv = document.createElement('div');
        strongDiv.className = 'pick-strong-enemies';
        if (pick) {
            let strongText;
            if (!hasData) {
                strongText = 'Данные загружаются...';
            } else {
                const vsData = heroVs[pick.hero] || {};
                if (Object.keys(vsData).length === 0) {
                    strongText = 'данных нет';
                } else {
                    const strongEnemies = opponentHeroes.filter(enemy => {
                        const enemyData = vsData[enemy];
                        return enemyData && enemyData.winrate > 0.55 && enemyData.eloShift > 0;
                    });
                    strongText = strongEnemies.length > 0 ? strongEnemies.join(', ') : 'нет сильных';
                }
            }
            strongDiv.innerHTML = `⚔️ Силён против: <span class="enemy-list">${strongText}</span>`;
        } else {
            strongDiv.style.display = 'none';
        }
        wrapper.appendChild(strongDiv);
        el.appendChild(wrapper);
    }
}

export function updateProgress(state, container) {
    const stepNumEl = container.querySelector('#step-num');
    if (!stepNumEl) return; // для авто-драфта без UI
    const total = 24;
    const current = state.gameState?.currentStep ?? -1;
    stepNumEl.textContent = current;
    container.querySelector('#total-steps').textContent = total;
    const dotsContainer = container.querySelector('#progress-dots');
    if (!dotsContainer) return;
    dotsContainer.innerHTML = '';
    const DRAFT_ORDER = getDraftOrder();
    for (let i = 0; i < total; i++) {
        const step = DRAFT_ORDER[i];
        const dot = document.createElement('span');
        dot.className = 'progress-dot';
        dot.classList.add(step.type === 'ban' ? 'ban' : 'pick');
        if (i < current) dot.classList.add('done');
        else if (i === current) dot.classList.add('active');
        else dot.classList.add('future');
        const label = document.createElement('span');
        label.className = 'dot-label';
        label.textContent = `${i+1}`;
        dot.appendChild(label);
        dotsContainer.appendChild(dot);
    }
    const step = current >= 0 && current < total ? DRAFT_ORDER[current] : null;
    const labelEl = container.querySelector('#step-label');
    if (labelEl) {
        if (step) {
            const teamName = state.teams[step.team].name;
            const type = step.type === 'ban' ? 'бан' : 'пик';
            labelEl.textContent = `${teamName} — ${type}`;
        } else {
            labelEl.textContent = 'завершён';
        }
    }
}

export function updateActionArea(state, container, step) {
    const turnEl = container.querySelector('#turn-indicator');
    const typeEl = container.querySelector('#action-type');
    const descEl = container.querySelector('#action-desc');
    const btnNext = container.querySelector('#btn-next-step');

    if (!turnEl || !typeEl || !descEl) {
        console.warn('updateActionArea: elements missing');
        return;
    }

    if (!step) {
        turnEl.textContent = '🏁 Драфт завершён';
        typeEl.textContent = '';
        descEl.textContent = '';
        if (btnNext) btnNext.disabled = true;
        return;
    }
    const teamName = state.teams[step.team].name;
    const isUser = state.teams[step.team].isUser;
    turnEl.textContent = `${isUser ? '👤 Ваш ход' : '🤖 Ход бота'} (${teamName})`;
    typeEl.textContent = step.type === 'ban' ? 'БАН' : 'ПИК';
    descEl.textContent = step.type === 'ban' ? 'Выберите героя для бана' : 'Выберите героя для пика';
    if (btnNext) btnNext.disabled = true;
}

export function updateScoreDisplay(state, container) {
    const direSlots = container.querySelector('#dire-score-slots');
    const radiantSlots = container.querySelector('#radiant-score-slots');
    if (!direSlots || !radiantSlots) return;
    const winsToWin = state.format === 'bo3' ? 2 : 3;
    direSlots.innerHTML = '';
    for (let i = 0; i < winsToWin; i++) {
        const slot = document.createElement('span');
        slot.className = 'score-slot';
        if (i < state.direWins) slot.classList.add('won', 'dire-won');
        direSlots.appendChild(slot);
    }
    radiantSlots.innerHTML = '';
    for (let i = 0; i < winsToWin; i++) {
        const slot = document.createElement('span');
        slot.className = 'score-slot';
        if (i < state.radiantWins) slot.classList.add('won', 'radiant-won');
        radiantSlots.appendChild(slot);
    }
    const gameCounter = container.querySelector('#game-counter');
    if (gameCounter) gameCounter.textContent = `Карта ${state.games.length + 1}`;
}

export function showSeriesFinal(state, container) {
    const finalDiv = container.querySelector('#series-final');
    if (!finalDiv) return;
    finalDiv.classList.add('visible');

    const winnerName = state.winner === 'dire' ? state.teams.dire.name : state.teams.radiant.name;
    const winnerClass = state.winner === 'dire' ? 'dire' : 'radiant';

    container.querySelector('#final-score').innerHTML =
        `<span class="dire">${state.direWins}</span><span class="vs"> — </span><span class="radiant">${state.radiantWins}</span>`;

    const winnerEl = container.querySelector('#final-winner');
    winnerEl.className = `final-winner ${winnerClass}`;
    winnerEl.textContent = `🏆 ${winnerName} победили в серии!`;

    container.querySelectorAll('.team-row').forEach(el => el.style.display = 'none');
    container.querySelector('.action-area').style.display = 'none';
    container.querySelector('.progress-bar').style.display = 'none';
    container.querySelector('.progress-labels').style.display = 'none';
    container.querySelector('.controls').style.display = 'none';
    container.querySelector('.series-control .game-counter').style.display = 'none';
}

// ============================================================
// Итоговый блок в action-area
// ============================================================

function renderGameSummaryInAction(state, container) {
    const gameResult = state.lastGameResult;
    if (!gameResult) return;

    const actionArea = container.querySelector('#action-area');
    if (!actionArea) return;

    // Очищаем action-area
    actionArea.innerHTML = '';

    const pickPower = gameResult.pickPower || { dire: 0, radiant: 0, winner: 'tie' };

    const winnerName = gameResult.winner === 'dire' ? state.teams.dire.name : state.teams.radiant.name;
    const winnerClass = gameResult.winner === 'dire' ? 'dire' : 'radiant';
    const timeText = gameResult.time + ' мин.';
    const cardNumber = state.games.length;

    const winProbDire = gameResult.winProbDire;
    const probDire = (winProbDire * 100).toFixed(1);
    const probRadiant = ((1 - winProbDire) * 100).toFixed(1);

    const direPickPower = pickPower.dire.toFixed(2);
    const radiantPickPower = pickPower.radiant.toFixed(2);
    const pickWinner = pickPower.winner;
    const pickWinnerText = pickWinner === 'dire' ? state.teams.dire.name :
                           pickWinner === 'radiant' ? state.teams.radiant.name :
                           'Ничья';
    const pickWinnerClass = pickWinner === 'dire' ? 'dire' : pickWinner === 'radiant' ? 'radiant' : 'tie';

    const laneWinner = gameResult.laneWinner;
    let laneText;
    if (laneWinner === 'dire') {
        laneText = `🏁 Победитель лайн-стадии: ${state.teams.dire.name}`;
    } else if (laneWinner === 'radiant') {
        laneText = `🏁 Победитель лайн-стадии: ${state.teams.radiant.name}`;
    } else {
        laneText = `🏁 Лайн-стадия прошла в ничью`;
    }

    const summaryBlock = document.createElement('div');
    summaryBlock.className = 'game-summary-center';

    summaryBlock.innerHTML = `
        <div class="summary-header">🏁 Карта ${cardNumber} завершена!</div>
        <div class="summary-winner ${winnerClass}">🏆 ${winnerName}</div>
        <div class="summary-details">
            <span class="time">⏱ ${timeText}</span>
        </div>
        <div class="summary-extra">
            <div class="extra-item">
                <span class="label">⚡ Сила пиков:</span>
                <span class="dire">${state.teams.dire.name} ${direPickPower}</span>
                <span class="vs">против</span>
                <span class="radiant">${state.teams.radiant.name} ${radiantPickPower}</span>
                <span class="${pickWinnerClass}">(${pickWinnerText})</span>
            </div>
            <div class="extra-item">
                <span class="label">${laneText}</span>
            </div>
            <div class="extra-item">
                <span class="label">📊 Шансы на победу:</span>
                <span class="dire">${state.teams.dire.name} ${probDire}%</span>
                <span class="vs">против</span>
                <span class="radiant">${state.teams.radiant.name} ${probRadiant}%</span>
            </div>
        </div>
    `;

    if (!state.isFinished) {
        const nextBtn = document.createElement('button');
        nextBtn.className = 'next-btn';
        nextBtn.textContent = '▶ Следующая карта';
        nextBtn.addEventListener('click', () => {
            if (!state.isFinished && state.waitingForNext) {
                import('../core/gameLogic.js').then(module => {
                    module.startNewGame(state, container);
                });
            }
        });
        summaryBlock.appendChild(nextBtn);
    } else {
        // Серия завершена – кнопка "Вернуться к турниру"
        const finishBtn = document.createElement('button');
        finishBtn.className = 'next-btn finish-btn';
        finishBtn.textContent = '🏆 Вернуться к турниру';
        finishBtn.addEventListener('click', () => {
            if (window._finishDraft) {
                const winnerTeamKey = state.winner;
                const winner = winnerTeamKey === 'dire' ? state.teams.dire : state.teams.radiant;
                const score = [state.direWins, state.radiantWins];
                window._finishDraft({ winner, score });
            }
        });
        summaryBlock.appendChild(finishBtn);
    }

    actionArea.appendChild(summaryBlock);
}

// ============================================================
// showLanesResults (обновлённая)
// ============================================================

export function showLanesResults(state, container) {
    const gameResult = state.lastGameResult;
    if (!gameResult) return;
    const data = getLaneData(state);

    const teams = [
        { teamKey: 'dire', label: state.teams.dire.name, side: 'dire' },
        { teamKey: 'radiant', label: state.teams.radiant.name, side: 'radiant' }
    ];

    const lanes = [
        { key: 'top', label: 'Верхний' },
        { key: 'mid', label: 'Центральный' },
        { key: 'bot', label: 'Нижний' }
    ];

    const direScore = gameResult.direScore;
    const radiantScore = gameResult.radiantScore;
    let laneWinnerClass = (direScore > radiantScore) ? 'win' : (radiantScore > direScore) ? 'win' : 'draw';

    for (const { teamKey, label, side } of teams) {
        const containerEl = container.querySelector(`#${teamKey}-lanes-results`);
        if (!containerEl) continue;
        containerEl.innerHTML = '';
        containerEl.classList.add('visible');

        const lanesList = document.createElement('div');
        lanesList.className = 'lanes-list';

        for (const lane of lanes) {
            const d = data[lane.key];
            const outcome = d.outcome;
            const diff = outcome.diff || 0;
            const diffStr = diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2);
            const diffText = (outcome.label !== 'Ничья') ? ` (${diffStr})` : '';

            const row = document.createElement('div');
            row.className = 'result-row';
            row.innerHTML = `
                <span class="lane-name">${lane.label}</span>
                <span class="lane-players">
                    <span class="dire">${d.direPlayers}</span> vs <span class="radiant">${d.radiantPlayers}</span>
                </span>
                <span class="lane-result ${outcome.className}">${outcome.label}${diffText}</span>
            `;
            lanesList.appendChild(row);
        }
        containerEl.appendChild(lanesList);

        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'lanes-summary';
        summaryDiv.innerHTML = `
            <div class="summary-label">Итог лайна</div>
            <div class="summary-result ${laneWinnerClass}">
                ${side === 'dire' ? (direScore > radiantScore ? 'Победа' : direScore < radiantScore ? 'Поражение' : 'Ничья') :
                (radiantScore > direScore ? 'Победа' : radiantScore < direScore ? 'Поражение' : 'Ничья')}
            </div>
            <div class="summary-score">${direScore.toFixed(1)} - ${radiantScore.toFixed(1)}</div>
        `;
        containerEl.appendChild(summaryDiv);

        const resultContainer = container.querySelector(`#${teamKey}-game-result`);
        if (resultContainer) {
            resultContainer.style.display = 'none';
            resultContainer.innerHTML = '';
        }
    }

    renderGameSummaryInAction(state, container);
}

// ============================================================
// updateRatingsAndDirections
// ============================================================

function updateRatingsAndDirections(state, container) {
    for (const teamKey of ['dire', 'radiant']) {
        const rating = getTeamRating(state, teamKey);
        const valueEl = container.querySelector(`#${teamKey}-rating-value`);
        if (!valueEl) continue;
        if (rating.total === 0) { valueEl.textContent = '—'; continue; }
        valueEl.textContent = rating.total.toFixed(1);
        if (rating.total >= 85) valueEl.style.color = '#4caf50';
        else if (rating.total >= 75) valueEl.style.color = '#f5c842';
        else valueEl.style.color = '#e74c3c';

        const dir = getTeamDirection(state, teamKey);
        const dirValueEl = container.querySelector(`#${teamKey}-dir-value`);
        if (!dirValueEl) continue;
        if (dir.dominant === 'None') { dirValueEl.textContent = '—'; dirValueEl.className = 'dir-value'; }
        else { dirValueEl.textContent = dir.dominant; dirValueEl.className = 'dir-value ' + dir.dominant; }
    }
}

// ============================================================
// renderAll (с проверкой на наличие контейнера)
// ============================================================

export function renderAll(state, container) {
    // Если контейнер не содержит элементов драфта – выходим (для авто-драфта)
    if (!container.querySelector('#dire-bans')) {
        console.log('renderAll: UI elements not found, skipping (auto-draft)');
        return;
    }

    renderBans(container, 'dire', state.gameState.bans.dire, state);
    renderBans(container, 'radiant', state.gameState.bans.radiant, state);
    renderPicks(container, 'dire', state.gameState.picks.dire, state);
    renderPicks(container, 'radiant', state.gameState.picks.radiant, state);
    renderPlayers(container, state, 'dire');
    renderPlayers(container, state, 'radiant');
    updateProgress(state, container);
    updateRatingsAndDirections(state, container);

    if (state.gameState.isFinished) {
        container.querySelector('#turn-indicator').textContent = '🏁 Карта завершена!';
        container.querySelector('#action-type').textContent = '';
        container.querySelector('#action-desc').textContent = '';
        container.querySelector('#candidates-container').innerHTML = '';
        container.querySelector('#player-select-container').innerHTML = '';
        container.querySelector('#btn-next-step').disabled = true;
        showLanesResults(state, container);
    } else {
        const containers = ['dire-lanes-results', 'radiant-lanes-results', 'dire-game-result', 'radiant-game-result'];
        for (const id of containers) {
            const el = container.querySelector(`#${id}`);
            if (el) {
                el.style.display = 'none';
                el.classList.remove('visible');
                el.innerHTML = '';
            }
        }
        const actionArea = container.querySelector('#action-area');
        if (actionArea && !state.gameState.isFinished) {
            const summary = actionArea.querySelector('.game-summary-center');
            if (summary) summary.remove();
            const header = actionArea.querySelector('.action-header');
            if (!header) {
                actionArea.innerHTML = `
                    <div class="action-header">
                        <span class="turn" id="turn-indicator">⏳ Загрузка...</span>
                        <span class="action-type" id="action-type">—</span>
                        <span class="action-desc" id="action-desc">Ожидание</span>
                    </div>
                    <div class="candidates" id="candidates-container"></div>
                    <div class="player-select" id="player-select-container"></div>
                `;
            }
        }
    }
}