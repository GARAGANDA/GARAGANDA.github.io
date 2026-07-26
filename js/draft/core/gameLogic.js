// ============================================================
// js/draft/core/gameLogic.js
// ============================================================

import { shuffleArray } from '../utils/helpers.js';
import {
    getDraftOrder,
    getTeamPlayers,
    getOpponentTeam,
    getAvailablePlayers,
    getPickCandidates,
    getBanCandidates,
    getPlayersWithHero,
    getPlayerRole,
    addBan,
    addPick
} from './stateHelpers.js';
import {
    renderAll,
    updateActionArea,
    showLanesResults,
    updateScoreDisplay,
    showSeriesFinal
} from '../ui/renderers.js';
import {
    getTeamDirection,
    getLaneData,
    getTeamRating,
    calculateSynergyBonus,
    computeStrongPicks,
    computePickPower
} from './calculations.js';
import { DELAYS } from '../../config/delays.js';

// ---- Вспомогательная функция для восстановления action-area ----
function ensureActionArea(container) {
    let actionArea = container.querySelector('#action-area');
    if (!actionArea) {
        actionArea = document.createElement('div');
        actionArea.id = 'action-area';
        actionArea.className = 'action-area';
        actionArea.innerHTML = `
            <div class="action-header">
                <span class="turn" id="turn-indicator">⏳ Загрузка...</span>
                <span class="action-type" id="action-type">—</span>
                <span class="action-desc" id="action-desc">Ожидание</span>
            </div>
            <div class="candidates" id="candidates-container"></div>
            <div class="player-select" id="player-select-container"></div>
        `;
        const teamRows = container.querySelectorAll('.team-row');
        if (teamRows.length >= 2) {
            teamRows[0].after(actionArea);
        } else {
            container.appendChild(actionArea);
        }
        return actionArea;
    }
    const required = ['turn-indicator', 'action-type', 'action-desc', 'candidates-container', 'player-select-container'];
    let needsRecreate = false;
    for (const id of required) {
        if (!actionArea.querySelector(`#${id}`)) {
            needsRecreate = true;
            break;
        }
    }
    if (needsRecreate) {
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
    return actionArea;
}

export function startNewGame(state, container) {
    console.log('startNewGame called');
    state.waitingForNext = false;
    state.isFinished = false;

    const hasUI = container.querySelector && container.querySelector('#action-area') !== null;
    if (hasUI) {
        ensureActionArea(container);
    }

    const pools = {};
    const allPlayers = [...getTeamPlayers(state, 'dire'), ...getTeamPlayers(state, 'radiant')];

    for (const player of allPlayers) {
        if (state.playerHeroMap[player] && Object.keys(state.playerHeroMap[player]).length > 0) {
            pools[player] = Object.keys(state.playerHeroMap[player]);
        } else {
            const shuffled = shuffleArray([...state.HEROES]);
            pools[player] = shuffled.slice(0, 12);
            state.playerHeroMap[player] = {};
            for (const hero of pools[player]) {
                const total = Math.floor(Math.random() * 60) + 10;
                const winrate = 0.4 + Math.random() * 0.4;
                state.playerHeroMap[player][hero] = { total, winrate };
                if (!state.heroPlayerMap[hero]) state.heroPlayerMap[hero] = {};
                state.heroPlayerMap[hero][player] = { total, winrate };
                if (!state.kalData[player]) state.kalData[player] = {};
                state.kalData[player][hero] = 2 + Math.random() * 5;
            }
        }
    }

    state.gameState = {
        pools: pools,
        stats: state.playerHeroMap,
        bans: { dire: Array(7).fill(null), radiant: Array(7).fill(null) },
        picks: {
            dire: { carry: null, mid: null, offlane: null, semi: null, full: null },
            radiant: { carry: null, mid: null, offlane: null, semi: null, full: null }
        },
        pickedPlayers: { dire: [], radiant: [] },
        usedHeroes: new Set(),
        currentStep: -1,
        waitingForUser: false,
        pickHeroPending: null,
        isFinished: false,
        lastGameResult: null
    };

    if (hasUI) {
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
        if (actionArea) {
            const summary = actionArea.querySelector('.game-summary-center');
            if (summary) summary.remove();
            const header = actionArea.querySelector('.action-header');
            if (header) {
                const turn = header.querySelector('#turn-indicator');
                const type = header.querySelector('#action-type');
                const desc = header.querySelector('#action-desc');
                if (turn) turn.textContent = '⏳ Загрузка...';
                if (type) type.textContent = '—';
                if (desc) desc.textContent = 'Ожидание';
            }
            const candidates = actionArea.querySelector('#candidates-container');
            const playerSelect = actionArea.querySelector('#player-select-container');
            if (candidates) candidates.innerHTML = '';
            if (playerSelect) playerSelect.innerHTML = '';
        }
    }

    if (hasUI) {
        renderAll(state, container);
    }
    proceedToNextStep(state, container);
}

export function proceedToNextStep(state, container) {
    const gs = state.gameState;
    if (gs.isFinished || state.isFinished || state.waitingForNext) {
        console.log('proceedToNextStep blocked');
        return;
    }
    gs.currentStep++;
    const DRAFT_ORDER = getDraftOrder();
    if (gs.currentStep >= DRAFT_ORDER.length) {
        gs.isFinished = true;
        finishGame(state, container);
        return;
    }
    console.log('proceedToNextStep step', gs.currentStep, DRAFT_ORDER[gs.currentStep]);
    processCurrentStep(state, container);
}

function processCurrentStep(state, container) {
    const gs = state.gameState;
    const DRAFT_ORDER = getDraftOrder();
    const step = DRAFT_ORDER[gs.currentStep];
    if (!step) {
        console.error('step is undefined at index', gs.currentStep);
        return;
    }
    const { team, type } = step;
    const isUser = state.teams[team].isUser;

    const hasUI = container.querySelector && container.querySelector('#action-area') !== null;
    if (hasUI) {
        ensureActionArea(container);
        renderAll(state, container);
        updateActionArea(state, container, step);
    }

    if (isUser && hasUI) {
        gs.waitingForUser = true;
        const btnNext = container.querySelector('#btn-next-step');
        if (btnNext) btnNext.disabled = true;
        showCandidates(state, container, team, type);
    } else {
        gs.waitingForUser = false;
        if (hasUI) {
            const turnEl = container.querySelector('#turn-indicator');
            const descEl = container.querySelector('#action-desc');
            if (turnEl) turnEl.textContent = '🤖 Ход бота...';
            if (descEl) descEl.textContent = 'Бот выбирает...';
        }
        setTimeout(() => {
            botMakeMove(state, container, team, type);
        }, DELAYS.draftBotActionDelay);
    }
}
function showCandidates(state, container, team, type) {
    const candidatesContainer = container.querySelector('#candidates-container');
    const playerSelect = container.querySelector('#player-select-container');
    if (!candidatesContainer) {
        console.warn('candidates-container not found');
        return;
    }
    if (playerSelect) playerSelect.innerHTML = '';

    let candidates = [];
    if (type === 'ban') {
        candidates = getBanCandidates(state, team);
    } else {
        candidates = getPickCandidates(state, team);
    }

    const shuffled = shuffleArray([...candidates]);
    const selected = shuffled.slice(0, 5);

    if (selected.length === 0) {
        candidatesContainer.innerHTML = '<div style="color:#f5a623;">Нет доступных героев для выбора.</div>';
        return;
    }

    candidatesContainer.innerHTML = '';
    for (const hero of selected) {
        const card = document.createElement('div');
        // Добавляем класс в зависимости от типа
        card.className = `candidate-card ${type === 'ban' ? 'ban' : 'pick'}`;
        card.dataset.hero = hero;
        card.innerHTML = `<span class="hero-name">${hero}</span>`;
        if (type === 'pick') {
            const players = getPlayersWithHero(state, team, hero);
            const names = players.join(', ');
            card.innerHTML += `<div class="hero-pool-info">доступен: ${names || 'никто'}</div>`;
        }
        card.addEventListener('mouseenter', (e) => showTooltip(e, hero, state));
        card.addEventListener('mouseleave', hideTooltip);
        card.addEventListener('mousemove', moveTooltip);
        card.addEventListener('click', () => {
            if (!state.gameState.waitingForUser) return;
            onUserSelect(state, container, team, type, hero);
        });
        candidatesContainer.appendChild(card);
    }
}

function onUserSelect(state, container, team, type, hero) {
    const gs = state.gameState;
    if (!gs.waitingForUser) return;
    if (type === 'ban') {
        if (addBan(state, team, hero)) {
            gs.waitingForUser = false;
            renderAll(state, container);
            proceedToNextStep(state, container);
        } else {
            alert('Не удалось добавить бан');
        }
    } else {
        // ПИК
        const players = getPlayersWithHero(state, team, hero);
        if (players.length === 0) {
            alert('Этот герой больше не доступен для пика.');
            return;
        }

        // Если доступен только один игрок – автоматически пикаем его
        if (players.length === 1) {
            const player = players[0];
            const role = getPlayerRole(state, team, player);
            if (!role) {
                alert('Не удалось определить роль игрока.');
                return;
            }
            if (addPick(state, team, role, hero, player)) {
                gs.pickHeroPending = null;
                gs.waitingForUser = false;
                renderAll(state, container);
                proceedToNextStep(state, container);
            } else {
                alert('Не удалось добавить пик (возможно, эта роль уже занята)');
            }
            return;
        }

        // Иначе показываем выбор игрока
        gs.pickHeroPending = hero;
        showPlayerSelection(state, container, team, hero, players);
    }
}

function showPlayerSelection(state, container, team, hero, players) {
    const containerEl = container.querySelector('#player-select-container');
    if (!containerEl) return;
    containerEl.innerHTML = `<div style="font-size:13px;color:#b0c4de;">Выберите игрока для героя ${hero}:</div>`;
    const inner = document.createElement('div');
    inner.style.display = 'flex';
    inner.style.flexWrap = 'wrap';
    inner.style.gap = '8px';
    inner.style.marginTop = '4px';

    for (const player of players) {
        const role = getPlayerRole(state, team, player);
        const stat = state.gameState.stats[player]?.[hero];
        const games = stat ? stat.total : 0;
        const wr = stat ? (stat.winrate * 100).toFixed(1) : '?';
        const btn = document.createElement('div');
        btn.className = 'player-option';
        btn.innerHTML = `${player} (${role}) <span class="games">${games} игр (${wr}%)</span>`;
        btn.addEventListener('click', () => {
            if (!role) { alert('Не удалось определить роль игрока.'); return; }
            if (addPick(state, team, role, hero, player)) {
                state.gameState.pickHeroPending = null;
                state.gameState.waitingForUser = false;
                containerEl.innerHTML = '';
                renderAll(state, container);
                proceedToNextStep(state, container);
            } else {
                alert('Не удалось добавить пик (возможно, эта роль уже занята)');
            }
        });
        inner.appendChild(btn);
    }
    containerEl.appendChild(inner);
}

export function botMakeMove(state, container, team, type) {
    const gs = state.gameState;
    if (gs.isFinished || state.isFinished || state.waitingForNext) {
        console.log('botMakeMove blocked');
        return;
    }
    console.log('botMakeMove', team, type);

    if (type === 'ban') {
        const candidates = getBanCandidates(state, team);
        if (candidates.length === 0) { proceedToNextStep(state, container); return; }
        const shuffled = shuffleArray([...candidates]);
        const selected = shuffled.slice(0, Math.min(5, shuffled.length));
        const opponent = getOpponentTeam(team);
        let bestScore = -Infinity;
        let bestHero = null;
        for (const hero of selected) {
            let oppStrength = 0;
            const oppPlayers = getAvailablePlayers(state, opponent);
            for (const p of oppPlayers) {
                const stat = gs.stats[p]?.[hero];
                if (stat) oppStrength += stat.total * stat.winrate;
            }
            let ownStrength = 0;
            const ownPlayers = getAvailablePlayers(state, team);
            for (const p of ownPlayers) {
                const stat = gs.stats[p]?.[hero];
                if (stat) ownStrength += stat.total * stat.winrate;
            }
            const score = oppStrength - ownStrength;
            if (score > bestScore) { bestScore = score; bestHero = hero; }
        }
        if (bestHero && addBan(state, team, bestHero)) {
            if (container.querySelector) renderAll(state, container);
            proceedToNextStep(state, container);
            return;
        }
        const hero = selected[Math.floor(Math.random() * selected.length)];
        if (addBan(state, team, hero)) {
            if (container.querySelector) renderAll(state, container);
            proceedToNextStep(state, container);
        } else {
            proceedToNextStep(state, container);
        }
        return;
    }

    // ПИК
    const candidates = getPickCandidates(state, team);
    if (candidates.length === 0) {
        proceedToNextStep(state, container);
        return;
    }
    const shuffled = shuffleArray([...candidates]);
    const selectedHeroes = shuffled.slice(0, Math.min(5, shuffled.length));

    let bestScore = -Infinity;
    let bestHero = null;
    let bestPlayer = null;
    let bestRole = null;

    for (const hero of selectedHeroes) {
        const players = getPlayersWithHero(state, team, hero);
        for (const player of players) {
            const role = getPlayerRole(state, team, player);
            if (!role) continue;
            if (state.gameState.picks[team][role] !== null) continue;
            const stat = state.gameState.stats[player]?.[hero];
            if (!stat) continue;
            const score = stat.total * stat.winrate;
            if (score > bestScore) {
                bestScore = score;
                bestHero = hero;
                bestPlayer = player;
                bestRole = role;
            }
        }
    }

    if (bestHero && bestPlayer && bestRole) {
        if (addPick(state, team, bestRole, bestHero, bestPlayer)) {
            if (container.querySelector) renderAll(state, container);
            proceedToNextStep(state, container);
            return;
        }
    }

    // Fallback
    for (const hero of selectedHeroes) {
        const players = getPlayersWithHero(state, team, hero);
        for (const player of players) {
            const role = getPlayerRole(state, team, player);
            if (role && state.gameState.picks[team][role] === null) {
                if (addPick(state, team, role, hero, player)) {
                    if (container.querySelector) renderAll(state, container);
                    proceedToNextStep(state, container);
                    return;
                }
            }
        }
    }
    proceedToNextStep(state, container);
}

function finishGame(state, container) {
    console.log('finishGame called');
    const gameResult = calculateGameResult(state);
    state.lastGameResult = gameResult;
    state.games.push({
        winner: gameResult.winner,
        time: gameResult.time,
        stage: gameResult.stage,
        direScore: gameResult.direScore,
        radiantScore: gameResult.radiantScore
    });

    if (gameResult.winner === 'dire') {
        state.direWins++;
    } else {
        state.radiantWins++;
    }

    updateScoreDisplay(state, container);

    const winsToWin = state.format === 'bo3' ? 2 : 3;
    if (state.direWins >= winsToWin || state.radiantWins >= winsToWin) {
        state.isFinished = true;
        state.winner = state.direWins >= winsToWin ? 'dire' : 'radiant';
        state.waitingForNext = true;
        const finalDiv = container.querySelector('#series-final');
        if (finalDiv) finalDiv.style.display = 'none';
        if (container.querySelector) renderAll(state, container);
        return;
    }

    state.waitingForNext = true;
    if (container.querySelector) renderAll(state, container);
}

export function calculateGameResult(state) {
    const dirDir = getTeamDirection(state, 'dire');
    const radDir = getTeamDirection(state, 'radiant');
    const laneData = getLaneData(state);
    const direRating = getTeamRating(state, 'dire');
    const radiantRating = getTeamRating(state, 'radiant');
    const pickPower = computePickPower(state);

    // Исходы линий
    const outcomes = [];
    const lanes = [laneData.top, laneData.mid, laneData.bot];
    for (const lane of lanes) {
        const diff = lane.direKAL - lane.radiantKAL;
        let winProbDire, winProbRadiant, drawProb;
        const absDiff = Math.abs(diff);
        if (absDiff >= 4) {
            if (diff > 0) {
                winProbDire = 0.65; winProbRadiant = 0.25; drawProb = 0.10;
            } else {
                winProbDire = 0.25; winProbRadiant = 0.65; drawProb = 0.10;
            }
        } else if (absDiff >= 1) {
            if (diff > 0) {
                winProbDire = 0.55; winProbRadiant = 0.35; drawProb = 0.10;
            } else {
                winProbDire = 0.35; winProbRadiant = 0.55; drawProb = 0.10;
            }
        } else {
            winProbDire = 0.40; winProbRadiant = 0.40; drawProb = 0.20;
        }
        const rand = Math.random();
        let outcome;
        if (rand < winProbDire) outcome = 'dire';
        else if (rand < winProbDire + winProbRadiant) outcome = 'radiant';
        else outcome = 'draw';
        outcomes.push(outcome);
    }

    let direScore = 0, radiantScore = 0;
    for (const out of outcomes) {
        if (out === 'dire') direScore += 1;
        else if (out === 'radiant') radiantScore += 1;
        else { direScore += 0.5; radiantScore += 0.5; }
    }

    let laneWinner = null;
    if (direScore > radiantScore) laneWinner = 'dire';
    else if (radiantScore > direScore) laneWinner = 'radiant';

    // Стадия игры
    let stageProbs = {};
    let stageNames = ['Early', 'Mid', 'Late'];
    let winnerDominant = null;
    if (laneWinner) {
        const dominant = laneWinner === 'dire' ? dirDir.dominant : radDir.dominant;
        if (dominant && dominant !== 'Balanced' && dominant !== 'None') {
            winnerDominant = dominant;
            for (const s of stageNames) {
                stageProbs[s] = (s === dominant) ? 0.65 : 0.175;
            }
        } else {
            for (const s of stageNames) stageProbs[s] = 1/3;
        }
    } else {
        for (const s of stageNames) stageProbs[s] = 1/3;
    }

    let rand = Math.random(), cumulative = 0, chosenStage = 'Mid';
    for (const s of stageNames) {
        cumulative += stageProbs[s];
        if (rand <= cumulative) { chosenStage = s; break; }
    }

    let timeMin, timeMax;
    if (chosenStage === 'Early') { timeMin = 15; timeMax = 30; }
    else if (chosenStage === 'Mid') { timeMin = 30; timeMax = 50; }
    else { timeMin = 50; timeMax = 200; }
    const gameTime = Math.floor(Math.random() * (timeMax - timeMin + 1)) + timeMin;

    // Базовая вероятность
    let baseWinProbDire = 0.5;
    if (laneWinner && winnerDominant && winnerDominant !== 'Balanced' && winnerDominant !== 'None') {
        if (winnerDominant === chosenStage) {
            baseWinProbDire = (laneWinner === 'dire') ? 0.60 : 0.40;
        } else {
            baseWinProbDire = 0.5;
        }
    }

    // Коррекция от рейтинга
    let ratingBonus = 0;
    if (direRating.total > radiantRating.total) {
        ratingBonus = 0.02;
    } else if (direRating.total < radiantRating.total) {
        ratingBonus = -0.02;
    }
    let winProbDire = baseWinProbDire + ratingBonus;

    // Бонус за сильный пик
    let pickBonus = 0;
    if (pickPower.winner === 'dire') {
        pickBonus = 0.05;
        winProbDire += 0.05;
    } else if (pickPower.winner === 'radiant') {
        pickBonus = -0.05;
        winProbDire -= 0.05;
    }

    winProbDire = Math.max(0.05, Math.min(0.95, winProbDire));

    const matchWinner = Math.random() < winProbDire ? 'dire' : 'radiant';

    return {
        winner: matchWinner,
        time: gameTime,
        stage: chosenStage,
        stageProbs,
        laneWinner,
        winnerDominant,
        winProbDire,
        baseWinProbDire,
        ratingBonus,
        pickBonus,
        direScore,
        radiantScore,
        pickPower: pickPower,
        direRatingTotal: direRating.total,
        radiantRatingTotal: radiantRating.total,
        direRatingComponents: { avg: direRating.avgRating, synergy: direRating.synergyBonus, picks: direRating.bonusFromPicks },
        radiantRatingComponents: { avg: radiantRating.avgRating, synergy: radiantRating.synergyBonus, picks: radiantRating.bonusFromPicks }
    };
}

// ─── TOOLTIP ────────────────────────────────────────────────
let tooltipElement = null;

function getTooltip() {
    if (!tooltipElement) {
        tooltipElement = document.createElement('div');
        tooltipElement.className = 'hero-tooltip';
        tooltipElement.id = 'draft-tooltip';
        tooltipElement.style.cssText = `
            position: fixed;
            border-radius: 12px;
            padding: 12px 16px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.8);
            z-index: 99999;
            min-width: 200px;
            max-width: 350px;
            pointer-events: none;
            display: none;
            transition: opacity 0.2s ease;
        `;
        tooltipElement.innerHTML = `<div id="draft-tooltip-content"></div>`;
        document.body.appendChild(tooltipElement);
    }
    return tooltipElement;
}

export function showTooltip(e, hero, state) {
    const tooltip = getTooltip();
    const content = tooltip.querySelector('#draft-tooltip-content');
    if (!content) return;

    const players = state.heroPlayerMap?.[hero];
    if (!players || Object.keys(players).length === 0) {
        tooltip.style.display = 'none';
        return;
    }

    // Собираем всех игроков, которые уже пикнули героя (заняты)
    const pickedPlayers = new Set([
        ...(state.gameState?.pickedPlayers?.dire || []),
        ...(state.gameState?.pickedPlayers?.radiant || [])
    ]);

    // Оставляем только доступных игроков
    const filteredPlayers = {};
    for (const p in players) {
        if (!pickedPlayers.has(p)) {
            filteredPlayers[p] = players[p];
        }
    }

    if (Object.keys(filteredPlayers).length === 0) {
        content.innerHTML = `<div style="color:#6a7f9a; font-size:12px;">Нет доступных игроков для этого героя</div>`;
        tooltip.style.display = 'block';
        positionTooltip(e);
        return;
    }

    // Определяем игроков команды Dire (союзники)
    const direPlayers = new Set(getTeamPlayers(state, 'dire'));
    // Radiant – противники (или наоборот, в зависимости от того, чей ход)

    let html = `<table><thead><tr><th>Игрок</th><th>Матчи</th><th>Винрейт</th><th>KAL</th></tr></thead><tbody>`;
    const sorted = Object.keys(filteredPlayers).sort((a,b) => filteredPlayers[b].total - filteredPlayers[a].total);

    for (const p of sorted) {
        const stat = filteredPlayers[p];
        const wr = (stat.winrate * 100).toFixed(1);
        const cls = stat.winrate >= 0.5 ? 'good' : 'bad';
        const isAlly = direPlayers.has(p); // союзник → зелёный
        const kal = state.kalData?.[p]?.[hero] !== undefined ? state.kalData[p][hero].toFixed(2) : '—';
        html += `<tr>
            <td class="${isAlly ? 'player-ally' : 'player-enemy'}">${p}</td>
            <td>${stat.total}</td>
            <td class="winrate ${cls}">${wr}%</td>
            <td>${kal}</td>
        </tr>`;
    }
    html += `</tbody></table>`;
    content.innerHTML = html;
    tooltip.style.display = 'block';
    positionTooltip(e);
}

export function hideTooltip() {
    const tooltip = getTooltip();
    tooltip.style.display = 'none';
}

export function moveTooltip(e) {
    positionTooltip(e);
}

function positionTooltip(e) {
    const tooltip = getTooltip();
    let x = e.clientX + 16;
    let y = e.clientY + 16;
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
    const rect = tooltip.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
        tooltip.style.left = (e.clientX - rect.width - 10) + 'px';
    }
    if (rect.bottom > window.innerHeight) {
        tooltip.style.top = (e.clientY - rect.height - 10) + 'px';
    }
}

