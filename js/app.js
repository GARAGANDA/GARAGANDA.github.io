// ============================================================
// app.js – точка входа, инициализация, события
// ============================================================
import { loadSavedTheme, initThemeSelector } from './themes.js';
import { loadAllData } from './dataLoader.js';
import { initModal } from './modal.js';
import { initPentagon } from './pentagon.js';
import { generateSynergyTeams } from './core/teamGenerator.js';
import { runFullTournament } from './core/tournamentController.js';
import { displayTeamTable } from './ui/teamTable.js';
import { state } from './core/state.js';
import { STEP_ORDER, rolePlayers } from './roleData.js';
import { duoMap } from './synergyData.js';
import { ratings } from './ratings.js';
// Импорты данных драфта – теперь из папки draft/data/
import { loadHeroStats, loadHeroRatings } from './draft/data/heroData.js';

let pentagonInstance = null;

// ============================================================
// ГЕНЕРАЦИЯ ФОРМЫ ДЛЯ ВСЕХ ИГРОКОВ
// ============================================================

function generatePlayerFormsForAllPlayers() {
    const allPlayers = new Set();
    for (const role in rolePlayers) {
        for (const player of rolePlayers[role]) {
            allPlayers.add(player);
        }
    }
    const forms = {};
    for (const player of allPlayers) {
        forms[player] = Math.floor(Math.random() * 7) - 3;
    }
    return forms;
}

// ============================================================
// ЗАПУСК ТУРНИРА (ГЕНЕРАЦИЯ КОМАНД)
// ============================================================
function startTournament(selectedPlayers, randomOnly = false) {
    const userPlayers = STEP_ORDER.map(key => selectedPlayers[key]);
    const userRoleKeys = STEP_ORDER;

    if (userPlayers.some(p => !p)) {
        alert('Выберите всех игроков!');
        return;
    }

    for (let i = 0; i < userPlayers.length; i++) {
        const p = userPlayers[i];
        const role = userRoleKeys[i];
        const rating = state.allRatings[role]?.[p];
        if (rating === undefined) {
            alert(`Игрок "${p}" не имеет рейтинга для роли "${role}".`);
            return;
        }
    }

    const teamsData = randomOnly ? {} : state.realTeams;
    const allTeams = generateSynergyTeams(
        userPlayers,
        userRoleKeys,
        state.allRatings,
        duoMap,
        15,
        teamsData,
        Object.keys(state.realTeams),
        state.playerForms
    );

    state.generatedTeams = allTeams;
    displayTeamTable(allTeams);

    // Скрываем пентагон, показываем таблицу команд
    document.getElementById('main-interface').style.display = 'none';
    document.getElementById('team-table-container').style.display = 'block';
}

// ============================================================
// СБРОС ТУРНИРА (очистка всех данных)
// ============================================================
function resetTournament() {
    const containers = [
        'tournament-results',
        'team-table-container',
        'group-stage-wrapper',
        'elimination-wrapper',
        'playoff-wrapper'
    ];
    containers.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = 'none';
            if (id === 'tournament-results') {
                el.classList.remove('visible');
            }
        }
    });

    const clearElements = [
        'tournament-status',
        'history-matches',
        'current-matches',
        'elim-history-matches',
        'elim-current-matches',
        'playoff-bracket',
        'placements-list',
        'user-card'
    ];
    clearElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });

    // Сбрасываем глобальное состояние
    state.generatedTeams = null;
    state.games = []; // если есть
    state.direWins = 0;
    state.radiantWins = 0;
    state.winner = null;
    state.isFinished = false;

    console.log('Турнир сброшен');
}

// ============================================================
// ПЕРЕЗАПУСК (рестарт) – показывает начальный экран
// ============================================================
function restartDraft() {
    // 1. Очищаем все турнирные данные
    resetTournament();

    // 2. Сбрасываем пентагон (чтобы при следующем запуске выбор был чистым)
    if (pentagonInstance) {
        pentagonInstance.initSelection();
    }

    // 3. Показываем стартовый экран, скрываем основной интерфейс
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('main-interface').style.display = 'block';

    // 4. Дополнительно очищаем поля выбора игроков (на всякий случай)
    const cardsContainer = document.getElementById('cards-container');
    if (cardsContainer) cardsContainer.innerHTML = '';
    const statusText = document.getElementById('status-text');
    if (statusText) statusText.textContent = 'Выберите игрока на позицию Carry';
    const stepTitle = document.getElementById('step-title');
    if (stepTitle) stepTitle.innerHTML = 'Выберите <span id="role-name">Carry</span>';
    const startBtn = document.getElementById('start-tournament-btn');
    if (startBtn) startBtn.disabled = true;
    const btnRandom = document.getElementById('btn-random-teams');
    if (btnRandom) btnRandom.disabled = true;

    console.log('Перезапуск выполнен, показан начальный экран');
}

// ============================================================
// ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// ============================================================
async function init() {
    const progressEl = document.getElementById('progress');
    try {
        const stats = await loadAllData((pct) => {
            progressEl.textContent = pct + '%';
        });
        state.realTeams = stats.realTeams || {};
        state.allRatings = ratings;

        try {
            const heroStats = await loadHeroStats();
            const heroRatings = await loadHeroRatings();
            window._heroStats = heroStats;
            window._heroRatings = heroRatings;
            console.log('Данные для драфта загружены');
        } catch (e) {
            console.warn('Не удалось загрузить данные для драфта, будут использованы случайные', e);
            window._heroStats = {};
            window._heroRatings = {};
        }

        state.playerForms = generatePlayerFormsForAllPlayers();
        console.log('Сгенерированы формы игроков:', state.playerForms);

        document.getElementById('loading').style.display = 'none';
        document.getElementById('start-screen').style.display = 'block';

        initModal();

        pentagonInstance = initPentagon(
            duoMap,
            null, null, null,
            (selected) => {
                const startBtn = document.getElementById('start-tournament-btn');
                if (startBtn) startBtn.disabled = false;
                const btnRandom = document.getElementById('btn-random-teams');
                if (btnRandom) btnRandom.disabled = false;
            },
            restartDraft
        );
        state.pentagonInstance = pentagonInstance;

        document.getElementById('btn-start').addEventListener('click', () => {
            pentagonInstance.initSelection();
        });

        document.getElementById('start-tournament-btn').addEventListener('click', () => {
            const selected = pentagonInstance.getSelectedPlayers();
            startTournament(selected, false);
        });

        const btnRandom = document.getElementById('btn-random-teams');
        if (btnRandom) {
            btnRandom.disabled = true;
            btnRandom.addEventListener('click', () => {
                const selected = pentagonInstance.getSelectedPlayers();
                const allSelected = STEP_ORDER.every(key => selected[key] && selected[key].trim() !== '');
                if (!allSelected) {
                    alert('Сначала выберите всех игроков для вашей команды!');
                    return;
                }
                startTournament(selected, true);
            });
        }

        const finalBtn = document.getElementById('btn-start-tournament-final');
        if (finalBtn) {
            finalBtn.addEventListener('click', () => {
                runFullTournament(
                    state.generatedTeams,
                    state.coreStats,
                    state.supportStats,
                    duoMap,
                    state.allRatings,
                    state.playerForms
                );
            });
        }

        const resetBtn = document.getElementById('btn-reset-tournament');
        if (resetBtn) {
            resetBtn.addEventListener('click', resetTournament);
        }

        console.log('Приложение инициализировано');

    } catch (err) {
        console.error(err);
        progressEl.textContent = '❌ Ошибка: ' + err.message;
        progressEl.style.color = '#ff6b6b';
    }
}

document.addEventListener('DOMContentLoaded', init);