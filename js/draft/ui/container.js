// ============================================================
// js/draft/ui/container.js
// ============================================================

import { renderPlayers, renderBans, renderPicks, updateProgress } from './renderers.js';

// ---- Модальное окно выбора "Пропустить / Драфтить" ----
export function showDraftChoiceModal(teamA, teamB) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 100000;
            background: transparent !important;
            backdrop-filter: none !important;
            display: flex;
            align-items: flex-start;
            justify-content: flex-start;
            padding: 20px;
            box-sizing: border-box;
        `;

        overlay.innerHTML = `
            <div class="draft-choice-modal" style="
                pointer-events: auto;
                background: rgba(10, 10, 15, 0.92);
                border: 1px solid #e74c3c;
                border-radius: 16px;
                padding: 20px 24px;
                max-width: 360px;
                width: 100%;
                box-shadow: 0 8px 32px rgba(0,0,0,0.6);
                backdrop-filter: blur(2px);
                margin: 0;
            ">
                <div style="font-size: 18px; font-weight: 700; color: #e74c3c; text-align: center; margin-bottom: 10px;">⚔️ Матч</div>
                <div style="font-size: 16px; font-weight: 600; color: #eee; display: flex; justify-content: center; align-items: center; gap: 12px; margin: 12px 0 18px;">
                    <span style="color: #e74c3c;">${teamA.name}</span>
                    <span style="color: #555; font-weight: 400;">vs</span>
                    <span style="color: #4caf50;">${teamB.name}</span>
                </div>
                <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                    <button class="btn-choice skip" style="
                        font-family: 'Inter', 'Segoe UI', sans-serif;
                        font-size: 15px;
                        font-weight: 600;
                        padding: 8px 20px;
                        border: 2px solid #555;
                        border-radius: 40px;
                        cursor: pointer;
                        background: transparent;
                        color: #b0c4de;
                        transition: all 0.2s;
                        pointer-events: auto;
                    ">⏭ Пропустить драфт</button>
                    <button class="btn-choice draft" style="
                        font-family: 'Inter', 'Segoe UI', sans-serif;
                        font-size: 15px;
                        font-weight: 600;
                        padding: 8px 20px;
                        border: 2px solid #e74c3c;
                        border-radius: 40px;
                        cursor: pointer;
                        background: #e74c3c;
                        color: #fff;
                        transition: all 0.2s;
                        pointer-events: auto;
                    ">🎯 Драфтить</button>
                </div>
                <div style="margin-top: 12px; font-size: 12px; color: #6a7f9a; text-align: center;">Авто-симуляция</div>
            </div>
        `;

        document.body.appendChild(overlay);

        const skipBtn = overlay.querySelector('.btn-choice.skip');
        const draftBtn = overlay.querySelector('.btn-choice.draft');

        skipBtn.addEventListener('mouseenter', () => {
            skipBtn.style.borderColor = '#b0c4de';
            skipBtn.style.background = 'rgba(255,255,255,0.05)';
        });
        skipBtn.addEventListener('mouseleave', () => {
            skipBtn.style.borderColor = '#555';
            skipBtn.style.background = 'transparent';
        });
        draftBtn.addEventListener('mouseenter', () => {
            draftBtn.style.background = '#c0392b';
            draftBtn.style.borderColor = '#c0392b';
        });
        draftBtn.addEventListener('mouseleave', () => {
            draftBtn.style.background = '#e74c3c';
            draftBtn.style.borderColor = '#e74c3c';
        });

        const close = (choice) => {
            overlay.remove();
            resolve(choice);
        };

        skipBtn.addEventListener('click', () => close('skip'));
        draftBtn.addEventListener('click', () => close('draft'));
    });
}

// ---- Контейнер драфта ----
export function createDraftContainer() {
    const overlay = document.createElement('div');
    overlay.id = 'draft-overlay';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.88); z-index: 99999;
        display: flex; justify-content: center; align-items: center;
        padding: 20px; overflow-y: auto;
        backdrop-filter: blur(8px);
        animation: draftFadeIn 0.4s ease;
    `;
    const wrapper = document.createElement('div');
    wrapper.className = 'draft-wrapper';
    wrapper.style.cssText = `
        max-width: 1400px;
        width: 100%;
        max-height: 95vh;
        overflow-y: auto;
        position: relative;
        animation: draftSlideUp 0.5s ease;
    `;
    wrapper.innerHTML = getDraftHTML();
    overlay.appendChild(wrapper);
    return overlay;
}

function getDraftHTML() {
    return `
        <div class="draft-container">
            <div class="draft-title">
                ⚔️ THE INTERNATIONAL 2026
                <span class="badge">Draft Stage</span>
            </div>
            <div class="series-control">
                <label for="series-format">Формат:</label>
                <select id="series-format">
                    <option value="bo3">Best of 3</option>
                    <option value="bo5" selected>Best of 5</option>
                </select>
                <div class="series-score" id="series-score">
                    <span class="score-team dire">
                        <span id="dire-team-name">Dire</span>
                        <span class="score-slots" id="dire-score-slots"></span>
                    </span>
                    <span class="vs">vs</span>
                    <span class="score-team radiant">
                        <span class="score-slots" id="radiant-score-slots"></span>
                        <span id="radiant-team-name">Radiant</span>
                    </span>
                </div>
                <span class="game-counter" id="game-counter">Карта 1</span>
            </div>
            <div class="progress-bar" id="progress-bar">
                <div class="progress-step">
                    Шаг <span id="step-num">0</span> / <span id="total-steps">24</span>
                    <span id="step-label" style="margin-left:10px;color:#b0c4de;"></span>
                </div>
                <div class="progress-indicator" id="progress-dots"></div>
            </div>
            <div class="progress-labels">
                <span class="label-item"><span class="label-color ban"></span> Бан</span>
                <span class="label-item"><span class="label-color pick"></span> Пик</span>
                <span class="label-item" style="color:#4a637f;">● Пройдено</span>
                <span class="label-item" style="color:#f5c842;">● Текущий</span>
                <span class="label-item" style="color:#2a2a3a;">● Ожидает</span>
            </div>
            <div class="team-row top-team" id="team-dire-row">
                <div class="bans-section"><div class="bans-label">🚫 БАНЫ</div><div class="ban-slots" id="dire-bans"></div></div>
                <div class="picks-section">
                    <div class="picks-label">⭐ ПИКИ</div>
                    <div class="picks-slots" id="dire-picks"></div>
                    <div class="lanes-results" id="dire-lanes-results"></div>
                </div>
                <div class="team-info">
                    <div class="team-name" id="dire-team-name-header">
                        <span id="dire-team-name-label">Dire</span>
                        <span class="tag">DIRE</span>
                        <span class="team-rating" id="dire-rating">
                            <span class="rating-value" id="dire-rating-value">—</span>
                            <span class="rating-label">Рейтинг</span>
                        </span>
                    </div>
                    <div class="team-direction" id="dire-direction">
                        <span class="dir-label">Направленность:</span>
                        <span class="dir-value" id="dire-dir-value">—</span>
                    </div>
                    <div class="player-list" id="dire-players"></div>
                </div>
            </div>
            <div class="action-area" id="action-area">
                <div class="action-header">
                    <span class="turn" id="turn-indicator">⏳ Загрузка...</span>
                    <span class="action-type" id="action-type">—</span>
                    <span class="action-desc" id="action-desc">Ожидание</span>
                </div>
                <div class="candidates" id="candidates-container"></div>
                <div class="player-select" id="player-select-container"></div>
            </div>
            <div class="team-row bottom-team" id="team-radiant-row">
                <div class="bans-section"><div class="bans-label">🚫 БАНЫ</div><div class="ban-slots" id="radiant-bans"></div></div>
                <div class="picks-section">
                    <div class="picks-label">⭐ ПИКИ</div>
                    <div class="picks-slots" id="radiant-picks"></div>
                    <div class="lanes-results" id="radiant-lanes-results"></div>
                </div>
                <div class="team-info">
                    <div class="team-name" id="radiant-team-name-header">
                        <span id="radiant-team-name-label">Radiant</span>
                        <span class="tag">RADIANT</span>
                        <span class="team-rating" id="radiant-rating">
                            <span class="rating-value" id="radiant-rating-value">—</span>
                            <span class="rating-label">Рейтинг</span>
                        </span>
                    </div>
                    <div class="team-direction" id="radiant-direction">
                        <span class="dir-label">Направленность:</span>
                        <span class="dir-value" id="radiant-dir-value">—</span>
                    </div>
                    <div class="player-list" id="radiant-players"></div>
                </div>
            </div>
            <div class="series-final" id="series-final">
                <div class="final-title">🏆 ПОБЕДИТЕЛЬ СЕРИИ</div>
                <div class="final-score" id="final-score"></div>
                <div class="final-winner" id="final-winner"></div>
            </div>
            <div class="controls">
                <button class="btn btn-primary" id="btn-next-step" disabled>▶ Следующий шаг</button>
            </div>
            <div class="draft-finish-block" style="display:none;"></div>
        </div>
    `;
}

export function renderDraftUI(state, container) {
    const direTeamName = state.teams.dire.name;
    const radiantTeamName = state.teams.radiant.name;
    container.querySelector('#dire-team-name').textContent = direTeamName;
    container.querySelector('#dire-team-name-label').textContent = direTeamName;
    container.querySelector('#radiant-team-name').textContent = radiantTeamName;
    container.querySelector('#radiant-team-name-label').textContent = radiantTeamName;

    renderPlayers(container, state, 'dire');
    renderPlayers(container, state, 'radiant');

    renderBans(container, 'dire', [], state);
    renderBans(container, 'radiant', [], state);
    renderPicks(container, 'dire', {}, state);
    renderPicks(container, 'radiant', {}, state);

    updateProgress(state, container);

    const nextBtn = container.querySelector('#btn-next-step');
    nextBtn.addEventListener('click', () => {
        if (state.gameState && !state.gameState.waitingForUser && !state.gameState.isFinished && !state.waitingForNext) {
            import('../core/gameLogic.js').then(module => {
                module.proceedToNextStep(state, container);
            });
        }
    });

    const formatSelect = container.querySelector('#series-format');
    formatSelect.value = state.format;
    formatSelect.addEventListener('change', () => {
        if (confirm('Смена формата сбросит текущую серию.')) {
            state.format = formatSelect.value;
            import('../core/gameLogic.js').then(module => {
                module.startNewGame(state, container);
            });
        } else {
            formatSelect.value = state.format;
        }
    });
}