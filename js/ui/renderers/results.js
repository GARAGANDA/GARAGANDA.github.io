import { getShortName } from '../../constants/teamShortNames.js';
import { getTeamLogo } from '../teamLogo.js';
import { getRating } from '../../ratings.js';
import { state } from '../../core/state.js';

// ============================================================
// ОТКРЫТИЕ МОДАЛКИ С СОСТАВОМ КОМАНДЫ
// ============================================================

function openTeamModal(team) {
    if (!team || !team.players) return;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.6)';
    overlay.style.zIndex = '10000';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = `
        background: #0a0a0f;
        border: 1px solid #1a1a2a;
        border-radius: 16px;
        padding: 24px 30px;
        max-width: 600px;
        width: 100%;
        max-height: 80vh;
        overflow-y: auto;
        position: relative;
        box-shadow: 0 20px 60px rgba(0,0,0,0.8);
    `;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = `
        position: absolute;
        top: 12px;
        right: 16px;
        background: none;
        border: none;
        color: #b0c4de;
        font-size: 28px;
        cursor: pointer;
    `;
    closeBtn.addEventListener('click', () => overlay.remove());

    const title = document.createElement('h2');
    title.textContent = team.name;
    title.style.cssText = 'color: var(--color-accent); margin-bottom: 16px; font-size: 1.6em;';

    const table = document.createElement('table');
    table.style.cssText = 'width: auto; table-layout: auto; border-collapse: collapse; margin: 0 auto;';
    table.innerHTML = `
        <thead>
            <tr>
                <th style="text-align: left; color: var(--color-accent); border-bottom: 2px solid var(--color-accent); padding: 6px 8px;">Игрок</th>
                <th style="text-align: left; color: var(--color-accent); border-bottom: 2px solid var(--color-accent); padding: 6px 8px;">Роль</th>
                <th style="text-align: right; color: var(--color-accent); border-bottom: 2px solid var(--color-accent); padding: 6px 8px;">Рейтинг</th>
            </tr>
        </thead>
        <tbody id="team-modal-body">
        </tbody>
    `;

    const tbody = table.querySelector('#team-modal-body');
    team.players.forEach((player, idx) => {
        const roleKey = team.roleKeys[idx] || 'unknown';
        const baseRating = getRating(player, roleKey) || 80;
        const form = state.playerForms?.[player] ?? 0;
        const effectiveRating = baseRating + form;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding: 4px 8px; border-bottom: 1px solid #1a1a2a;">${player}</td>
            <td style="padding: 4px 8px; border-bottom: 1px solid #1a1a2a;">${roleKey}</td>
            <td style="padding: 4px 8px; border-bottom: 1px solid #1a1a2a; text-align: right;">${effectiveRating}</td>
        `;
        tbody.appendChild(tr);
    });

    const summary = document.createElement('div');
    summary.style.cssText = 'margin-top: 12px; text-align: right; color: var(--color-text-secondary); font-size: 0.95em;';
    summary.innerHTML = `
        Средний рейтинг: ${team.avgRating.toFixed(1)} | 
        Синергия: ${(team.synergy || 0).toFixed(2)} | 
        Итог: ${team.totalRating.toFixed(1)}
    `;

    modal.appendChild(closeBtn);
    modal.appendChild(title);
    modal.appendChild(table);
    modal.appendChild(summary);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
}

// ============================================================
// РАСПРЕДЕЛЕНИЕ МЕСТ
// ============================================================

export function getPlacements(standings, bracket, playoffTeams) {
    const placements = [];

    // 1. Чемпион
    if (bracket.champion) {
        placements.push({ place: 1, team: bracket.champion });
    }

    // 2. Финалист (проигравший гранд-финал)
    if (bracket.grandFinal && bracket.grandFinal.loser) {
        placements.push({ place: 2, team: bracket.grandFinal.loser });
    }

    // 3. Проигравший финал нижней сетки
    if (bracket.lbFinal && bracket.lbFinal.loser) {
        placements.push({ place: 3, team: bracket.lbFinal.loser });
    }

    // 4. Проигравший полуфинал нижней сетки (lbRound3)
    if (bracket.lbRound3 && bracket.lbRound3.length > 0 && bracket.lbRound3[0].loser) {
        placements.push({ place: 4, team: bracket.lbRound3[0].loser });
    }

    // 5-6. Проигравшие 2-го раунда нижней сетки
    if (bracket.lbRound2 && bracket.lbRound2.length > 0) {
        bracket.lbRound2.forEach((match, index) => {
            if (match.loser) {
                placements.push({ place: 5 + index, team: match.loser });
            }
        });
    }

    // 7-8. Проигравшие 1-го раунда нижней сетки
    if (bracket.lbRound1 && bracket.lbRound1.length > 0) {
        bracket.lbRound1.forEach((match, index) => {
            if (match.loser) {
                placements.push({ place: 7 + index, team: match.loser });
            }
        });
    }

    // 9-16. Остальные команды (не попавшие в плей-офф)
    const playoffTeamNames = new Set(playoffTeams.map(t => t.name));
    const remainingTeams = standings
        .filter(t => !playoffTeamNames.has(t.name))
        .sort((a, b) => b.points - a.points || a.losses - b.losses);

    let nextPlace = 9;
    remainingTeams.forEach(team => {
        placements.push({ place: nextPlace++, team });
    });

    // Если по какой-то причине не хватает команд, добавляем заглушки
    while (placements.length < 16) {
        placements.push({ place: placements.length + 1, team: null });
    }

    return placements;
}

// ============================================================
// РЕНДЕРИНГ РЕЗУЛЬТАТОВ ТУРНИРА
// ============================================================

export function renderTournamentResults(placements, userTeam, allRatings) {
    const container = document.getElementById('tournament-results');
    const list = document.getElementById('placements-list');
    const userCard = document.getElementById('user-card');

    if (!container || !list) return;

    container.style.display = 'block';
    container.classList.add('visible');

    list.innerHTML = '';
    userCard.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'placement-grid';

    placements.forEach((entry) => {
        const team = entry.team;
        const place = entry.place;
        const isUser = team && team.isUser;

        const item = document.createElement('div');
        item.className = `placement-item ${isUser ? 'user-team' : ''}`;
        item.style.cursor = 'pointer';

        const logo = team ? getTeamLogo(team.name, { size: 'large', isUser: isUser }) : '';
        const name = team ? team.name : '—';

        item.innerHTML = `
            <span class="place">${place}</span>
            <span class="team-logo">${logo}</span>
            <span class="team-name">${name}</span>
        `;

        if (team && team.players) {
            item.addEventListener('click', () => {
                openTeamModal(team);
            });
        }

        grid.appendChild(item);
    });

    list.appendChild(grid);

    if (userTeam) {
        const userPlacement = placements.find(p => p.team && p.team.isUser);
        const place = userPlacement ? userPlacement.place : '—';

        userCard.innerHTML = `
            <div class="user-team-header">
                ${getTeamLogo(userTeam.name, { size: 'large', isUser: true })}
                <span class="user-team-name">${userTeam.name}</span>
                <span style="color: var(--color-accent); font-weight: 700; font-size: 1.2rem;">#${place}</span>
            </div>
            <div class="user-players-grid">
                ${userTeam.players.map((p, idx) => {
                    const roleKey = userTeam.roleKeys[idx] || 'unknown';
                    const baseRating = getRating(p, roleKey) || 80;
                    const form = state.playerForms?.[p] ?? 0;
                    const effectiveRating = baseRating + form;
                    return `
                        <div class="user-player-row">
                            <span class="role">${roleKey}</span>
                            <span class="name">${p}</span>
                            <span class="rating">${effectiveRating}</span>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="user-stats">
                <div class="stat"><span class="label">Средний рейтинг</span><span class="value">${userTeam.avgRating.toFixed(1)}</span></div>
                <div class="stat"><span class="label">Синергия</span><span class="value bonus">${(userTeam.synergy || 0).toFixed(2)}</span></div>
                <div class="stat"><span class="label">Общий рейтинг</span><span class="value total">${userTeam.totalRating.toFixed(1)}</span></div>
            </div>
        `;
    } else {
        userCard.innerHTML = `<div class="error">Ваша команда не найдена в результатах.</div>`;
    }
}