// ============================================================
// pentagon.js – пошаговый выбор игроков, синергии, тиммейты
// + форма игроков от -3 до +3 с текстовыми описаниями
// ============================================================

import { getFilteredPlayers, getPlayerRating, getPlayerRole, STEP_ORDER, ROLE_LABELS } from './roleData.js';
import { calculateSynergyBonus } from './synergyCalculator.js';
import { openTeammatesModal } from './ui/teammatesModal.js';
import { state } from './core/state.js';
import { hasRating } from './ratings.js';

const COLORS = ['#4caf50', '#ff6b6b', '#ffd93d', '#6bcbff', '#a29bfe', '#fd79a8', '#fdcb6e', '#00b894', '#e17055', '#74b9ff'];

// ============================================================
// ФОРМА ИГРОКА
// ============================================================

function getPlayerForm(player) {
    const form = Number(state?.playerForms?.[player] ?? 0);
    if (!Number.isFinite(form)) return 0;
    return Math.max(-3, Math.min(3, form));
}

function getFormText(form) {
    if (form > 0) return `+${form}`;
    return `${form}`;
}

function getFormClass(form) {
    if (form <= -3) return 'player-form-minus-3';
    if (form === -2) return 'player-form-minus-2';
    if (form === -1) return 'player-form-minus-1';
    if (form === 1) return 'player-form-plus-1';
    if (form === 2) return 'player-form-plus-2';
    if (form >= 3) return 'player-form-plus-3';
    return 'player-form-normal';
}

function getFormLabel(form) {
    const labels = {
        '-3': 'Соскуфился',
        '-2': 'Не в форме',
        '-1': 'Слабее обычного',
        '0': 'В обычной форме',
        '1': 'Хорошая форма',
        '2': 'Отличная форма',
        '3': 'На пике'
    };
    return labels[String(form)] || `Форма ${form}`;
}

function getFormHtml(player) {
    const form = getPlayerForm(player);
    const formClass = getFormClass(form);
    const formLabel = getFormLabel(form);
    return `<span class="player-form ${formClass}" title="Форма: ${formLabel}">${formLabel}</span>`;
}

// ============================================================
// ОСНОВНАЯ ФУНКЦИЯ
// ============================================================

export function initPentagon(duoMap, trioMap, quadMap, pentaMap, onTeamReady, onCancel) {
    let currentStep = 0;
    const selectedPlayers = {};
    let rerollUsed = false;
    const currentCandidates = {};

    const slots = {
        'carry': document.getElementById('slot-carry'),
        'mid': document.getElementById('slot-mid'),
        'offlane': document.getElementById('slot-offlane'),
        'semi-support': document.getElementById('slot-semi'),
        'full-support': document.getElementById('slot-full')
    };
    const roleNameEl = document.getElementById('role-name');
    const stepCounter = document.getElementById('step-counter');
    const cardsContainer = document.getElementById('cards-container');
    const rerollBtn = document.getElementById('reroll-btn');
    const startBtn = document.getElementById('start-tournament-btn');
    const statusText = document.getElementById('status-text');
    const stepTitle = document.getElementById('step-title');
    const avgRatingEl = document.getElementById('avg-rating-value');
    const avgRatingLabel = document.getElementById('avg-rating-label');
    const svg = document.querySelector('.pentagon svg');

    function getCandidatesForRole(roleKey, count = 5) {
        const available = getFilteredPlayers(roleKey);
        if (!available || available.length === 0) return [];
        const shuffled = [...available].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    }

    function renderSynergyList(synergyResult) {
        const container = document.getElementById('synergy-list');
        if (!container) return;
        if (!synergyResult || (!synergyResult.groups?.length && !Object.keys(synergyResult.playerContributions || {}).length)) {
            container.innerHTML = '<span class="synergy-empty">Нет данных о синергиях</span>';
            return;
        }
        let html = '<table>';
        const groups = synergyResult.groups || [];
        if (groups.length > 0) {
            const sortedGroups = [...groups].sort((a, b) => {
                const order = { penta: 0, quad: 1, trio: 2, duo: 3 };
                return (order[a.type] ?? 4) - (order[b.type] ?? 4);
            });
            sortedGroups.forEach(group => {
                const bonusStr = group.bonus >= 0 ? '+' : '';
                const winrateStr = group.winrate !== undefined ? (group.winrate * 100).toFixed(1) : '0.0';
                html += `<tr><td class="synergy-players">${group.players.join(' + ')}</td><td class="synergy-bonus">${bonusStr}${Number(group.bonus || 0).toFixed(2)} очков (${winrateStr}%)</td></tr>`;
            });
        }
        const playerContribs = synergyResult.playerContributions || {};
        const negativeContribs = Object.entries(playerContribs).filter(([p, contrib]) => contrib < 0).sort((a, b) => a[1] - b[1]);
        if (negativeContribs.length > 0) {
            if (groups.length > 0) html += `<tr class="synergy-separator"><td colspan="2"></td></tr>`;
            negativeContribs.forEach(([player, contrib]) => {
                html += `<tr><td class="synergy-player-negative">${player} не имеет синергий</td><td class="synergy-bonus negative">${Number(contrib).toFixed(2)} очков</td></tr>`;
            });
        }
        html += '</table>';
        container.innerHTML = html;
    }

    function updateAverageRating() {
        let totalRating = 0, count = 0;
        const players = [];
        STEP_ORDER.forEach(role => {
            const player = selectedPlayers[role];
            if (!player) return;
            const baseRating = getPlayerRating(player, role);
            if (baseRating !== null && baseRating !== undefined) {
                const form = getPlayerForm(player);
                const effectiveRating = Number(baseRating) + form;
                totalRating += effectiveRating;
                count++;
                players.push({ role, name: player, baseRating, form, effectiveRating });
            }
        });
        if (count === 0) {
            if (avgRatingEl) avgRatingEl.textContent = '—';
            if (avgRatingLabel) avgRatingLabel.textContent = 'средний рейтинг';
            return null;
        }
        const avg = totalRating / count;
        const synergyResult = calculateSynergyBonus(players.map(p => p.name), duoMap);
        const totalBonus = Number(synergyResult?.totalBonus) || 0;
        const totalWithBonus = avg + totalBonus;
        const bonusStr = totalBonus >= 0 ? '+' : '';
        if (avgRatingEl) avgRatingEl.textContent = totalWithBonus.toFixed(1) + ' (' + bonusStr + totalBonus.toFixed(2) + ')';
        if (avgRatingLabel) avgRatingLabel.textContent = 'средний рейтинг';
        if (avgRatingEl) {
            if (totalWithBonus >= 85) avgRatingEl.style.color = '#ffd93d';
            else if (totalWithBonus >= 75) avgRatingEl.style.color = '#ffb74d';
            else if (totalWithBonus >= 65) avgRatingEl.style.color = '#ff8a65';
            else avgRatingEl.style.color = '#e57373';
        }
        let colorIndex = 0;
        if (synergyResult && Array.isArray(synergyResult.groups)) {
            synergyResult.groups.forEach(group => { group.color = COLORS[colorIndex % COLORS.length]; colorIndex++; });
        }
        return synergyResult;
    }

    function drawLines(synergyResult) {
        if (!svg) return;
        svg.querySelectorAll('.synergy-line, .group-outline').forEach(el => el.remove());
        const positions = {
            'carry': { x: 185, y: 70 },
            'mid': { x: 100, y: 10 },
            'offlane': { x: 15, y: 70 },
            'semi-support': { x: 45, y: 175 },
            'full-support': { x: 155, y: 175 }
        };
        if (!synergyResult || !synergyResult.groups || synergyResult.groups.length === 0) {
            for (let i = 0; i < STEP_ORDER.length; i++) {
                for (let j = i + 1; j < STEP_ORDER.length; j++) {
                    const p1 = positions[STEP_ORDER[i]], p2 = positions[STEP_ORDER[j]];
                    if (!p1 || !p2) continue;
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', p1.x); line.setAttribute('y1', p1.y);
                    line.setAttribute('x2', p2.x); line.setAttribute('y2', p2.y);
                    line.classList.add('synergy-line', 'inactive');
                    svg.appendChild(line);
                }
            }
            return;
        }
        const pairToBestGroup = new Map();
        synergyResult.groups.forEach(group => {
            const players = group.players || [];
            const size = players.length;
            for (let i = 0; i < players.length; i++) {
                for (let j = i + 1; j < players.length; j++) {
                    const key = [players[i], players[j]].sort().join(', ');
                    const existing = pairToBestGroup.get(key);
                    if (!existing || existing.size < size) pairToBestGroup.set(key, { size, group });
                }
            }
        });
        synergyResult.groups.forEach(group => {
            const players = group.players || [];
            const color = group.color;
            for (let i = 0; i < players.length; i++) {
                for (let j = i + 1; j < players.length; j++) {
                    const key = [players[i], players[j]].sort().join(', ');
                    const best = pairToBestGroup.get(key);
                    if (!best || best.group !== group) continue;
                    let role1 = null, role2 = null;
                    for (const role of STEP_ORDER) {
                        if (selectedPlayers[role] === players[i]) role1 = role;
                        if (selectedPlayers[role] === players[j]) role2 = role;
                    }
                    if (!role1 || !role2) continue;
                    const pos1 = positions[role1], pos2 = positions[role2];
                    if (!pos1 || !pos2) continue;
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', pos1.x); line.setAttribute('y1', pos1.y);
                    line.setAttribute('x2', pos2.x); line.setAttribute('y2', pos2.y);
                    line.classList.add('synergy-line', 'active');
                    line.style.stroke = color;
                    svg.appendChild(line);
                }
            }
        });
        const colorMap = {};
        synergyResult.groups.forEach(group => {
            (group.players || []).forEach(player => { colorMap[player] = group.color; });
        });
        document.querySelectorAll('.vertex-player').forEach(slot => {
            const nameSpan = slot.querySelector('.player-name');
            if (!nameSpan) return;
            const playerName = nameSpan.textContent;
            if (playerName === '—' || !colorMap[playerName]) {
                slot.style.borderColor = '#555';
                slot.style.borderWidth = '2px';
                return;
            }
            slot.style.borderColor = colorMap[playerName];
            slot.style.borderWidth = '4px';
        });
    }

    function updatePentagon() {
        STEP_ORDER.forEach(role => {
            const el = slots[role];
            if (!el) return;
            const name = selectedPlayers[role];
            const nameSpan = el.querySelector('.player-name');
            const ratingSpan = el.querySelector('.player-rating');
            if (name) {
                if (nameSpan) {
                    nameSpan.textContent = name;
                    const form = getPlayerForm(name);
                    const formClass = getFormClass(form);
                    const formLabel = getFormLabel(form);
                    nameSpan.classList.remove(
                        'player-form-minus-3', 'player-form-minus-2', 'player-form-minus-1',
                        'player-form-normal', 'player-form-plus-1', 'player-form-plus-2', 'player-form-plus-3'
                    );
                    nameSpan.classList.add(formClass);
                    nameSpan.title = `Форма: ${formLabel}`;
                }
                el.classList.remove('empty');
                const baseRating = getPlayerRating(name, role);
                if (ratingSpan) {
                    if (baseRating !== null && baseRating !== undefined) {
                        const form = getPlayerForm(name);
                        const effectiveRating = Number(baseRating) + form;
                        ratingSpan.textContent = `${effectiveRating}`;
                        ratingSpan.title = `Базовый рейтинг: ${baseRating} | Форма: ${getFormLabel(form)}`;
                    } else {
                        ratingSpan.textContent = '';
                    }
                }
            } else {
                if (nameSpan) {
                    nameSpan.textContent = '—';
                    nameSpan.classList.remove(
                        'player-form-minus-3', 'player-form-minus-2', 'player-form-minus-1',
                        'player-form-normal', 'player-form-plus-1', 'player-form-plus-2', 'player-form-plus-3'
                    );
                }
                el.classList.add('empty');
                if (ratingSpan) ratingSpan.textContent = '';
                el.style.borderColor = '#555';
                el.style.borderWidth = '2px';
            }
        });
        const players = STEP_ORDER.map(role => ({ role, name: selectedPlayers[role] })).filter(p => p.name);
        const synergyResult = updateAverageRating();
        drawLines(synergyResult);
        renderSynergyList(synergyResult);
    }

    function renderStep() {
        const roleKey = STEP_ORDER[currentStep];
        if (!roleKey) return;
        const roleLabel = ROLE_LABELS[roleKey];
        if (roleNameEl) roleNameEl.textContent = roleLabel;
        if (stepCounter) stepCounter.textContent = `${currentStep + 1} / ${STEP_ORDER.length}`;
        if (!cardsContainer) return;
        cardsContainer.className = 'cards-grid';
        cardsContainer.innerHTML = '';
        const candidates = currentCandidates[roleKey] || getCandidatesForRole(roleKey, 5);
        currentCandidates[roleKey] = candidates;
        if (candidates.length === 0) {
            cardsContainer.innerHTML = `<div class="no-candidates">Нет игроков с рейтингом для этой роли</div>`;
            if (statusText) statusText.textContent = `Нет доступных игроков для позиции ${roleLabel}`;
            return;
        }
        candidates.forEach(player => {
            const card = document.createElement('div');
            card.className = 'card';
            const baseRating = getPlayerRating(player, roleKey);
            const form = getPlayerForm(player);
            const effectiveRating = (baseRating !== null && baseRating !== undefined) ? Number(baseRating) + form : null;
            const ratingText = effectiveRating !== null ? `ОБЩ ${effectiveRating}` : '';
            const formClass = getFormClass(form);
            const formLabel = getFormLabel(form);
            card.innerHTML = `
                <span class="player-name ${formClass}" title="Форма: ${formLabel}">${player}</span>
                <span class="role-label">${roleLabel}</span>
                <span class="rating-label">${ratingText}</span>
                <span class="player-form-value ${formClass}" title="Изменение рейтинга из-за формы">${formLabel}</span>
            `;
            card.addEventListener('click', () => {
                if (selectedPlayers[roleKey]) return;
                if (!hasRating(player, roleKey)) {
                    alert(`Нет рейтинга для ${player} на позиции ${roleLabel}.`);
                    return;
                }
                const alreadySelected = Object.entries(selectedPlayers).some(([role, selected]) => role !== roleKey && selected === player);
                if (alreadySelected) {
                    alert(`Игрок ${player} уже выбран на другой позиции.`);
                    return;
                }
                selectedPlayers[roleKey] = player;
                updatePentagon();
                if (currentStep < STEP_ORDER.length - 1) {
                    currentStep++;
                    renderStep();
                    return;
                }
                if (statusText) statusText.textContent = '✅ Все позиции заполнены! Нажмите "Запустить турнир".';
                if (startBtn) startBtn.disabled = false;
                const btnRandom = document.getElementById('btn-random-teams');
                if (btnRandom) btnRandom.disabled = false;
                cardsContainer.innerHTML = '';
                if (rerollBtn) { rerollBtn.disabled = true; rerollBtn.textContent = 'Реролл недоступен'; }
                if (stepTitle) stepTitle.innerHTML = 'Команда собрана!';
                if (onTeamReady) onTeamReady(selectedPlayers);
            });
            cardsContainer.appendChild(card);
        });
        if (selectedPlayers[roleKey]) {
            if (rerollBtn) { rerollBtn.disabled = true; rerollBtn.textContent = 'Реролл недоступен'; rerollBtn.onclick = null; }
        } else if (rerollUsed) {
            if (rerollBtn) { rerollBtn.disabled = true; rerollBtn.textContent = 'Реролл использован'; rerollBtn.onclick = null; }
        } else {
            if (rerollBtn) {
                rerollBtn.disabled = false;
                rerollBtn.textContent = '🔄 Остался 1 реролл';
                rerollBtn.onclick = () => {
                    if (rerollUsed || selectedPlayers[roleKey]) return;
                    rerollUsed = true;
                    currentCandidates[roleKey] = getCandidatesForRole(roleKey, 5);
                    renderStep();
                };
            }
        }
        if (selectedPlayers[roleKey]) {
            if (statusText) statusText.textContent = `✅ Выбран ${selectedPlayers[roleKey]} на позицию ${roleLabel}`;
        } else {
            if (statusText) statusText.textContent = `Выберите игрока на позицию ${roleLabel}`;
        }
        const allSelected = STEP_ORDER.every(role => selectedPlayers[role]);
        if (startBtn) startBtn.disabled = !allSelected;
        updatePentagon();
    }

    function initSelection() {
        STEP_ORDER.forEach(role => {
            selectedPlayers[role] = null;
            currentCandidates[role] = getCandidatesForRole(role, 5);
        });
        rerollUsed = false;
        currentStep = 0;
        updatePentagon();
        renderStep();
        if (startBtn) startBtn.disabled = true;
        const mainInterface = document.getElementById('main-interface');
        if (mainInterface) mainInterface.style.display = 'block';
        const startScreen = document.getElementById('start-screen');
        if (startScreen) startScreen.style.display = 'none';
        drawLines(null);
    }

    function getSelectedPlayers() {
        return selectedPlayers;
    }

    STEP_ORDER.forEach(role => {
        const slot = slots[role];
        if (!slot) return;
        slot.addEventListener('click', () => {
            const name = selectedPlayers[role];
            if (name) openTeammatesModal(name, duoMap);
        });
        slot.style.pointerEvents = 'auto';
    });

    const cancelBtn = document.getElementById('btn-cancel-draft');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            initSelection();
            if (onCancel) onCancel();
        });
    }

    return { initSelection, getSelectedPlayers };
}