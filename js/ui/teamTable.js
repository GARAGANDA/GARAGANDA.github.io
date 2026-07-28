import { getShortName } from '../constants/teamShortNames.js';
import { getTeamLogo } from './teamLogo.js';
import { getRating } from '../ratings.js';
import { state } from '../core/state.js';
import { duoMap } from '../synergyData.js';

export function displayTeamTable(teams) {
    const container = document.getElementById('team-table-container');
    if (!container) return;

    container.style.display = 'block';
    container.style.width = '100%';
    container.style.clear = 'both';

    let html = `
        <h2>🏆 Сгенерированные команды</h2>
        <p style="color: var(--color-text-secondary); margin-bottom: 16px;">
            Всего команд: ${teams.length} (ваша команда отмечена звёздочкой)
        </p>
        <div class="table-wrapper">
            <table class="team-table">
                <thead>
                    <tr>
                        <th style="text-align: center;">#</th>
                        <th style="text-align: left;">Команда</th>
                        <th style="text-align: left;">Состав</th>
                        <th style="text-align: right;">Рейтинг</th>
                    </tr>
                </thead>
                <tbody>
    `;

    const sortedTeams = [...teams].sort((a, b) => {
        if (a.isUser) return -1;
        if (b.isUser) return 1;
        return b.totalRating - a.totalRating;
    });

    sortedTeams.forEach((team, index) => {
        const isUser = team.isUser;
        const ratingColor = team.totalRating >= 85 ? 'var(--color-success)' :
                           team.totalRating >= 75 ? 'var(--color-warning)' :
                           'var(--color-danger)';

        const playersHtml = team.players.map((player, idx) => {
            const roleKey = team.roleKeys[idx] || 'unknown';
            const baseRating = getRating(player, roleKey) || 80;
            const form = state.playerForms?.[player] ?? 0;
            const effectiveRating = baseRating + form;
            return `<span class="player-cell">
                        <span class="player-name">${player}</span>
                        <span class="player-rating-small">${effectiveRating}</span>
                    </span>`;
        }).join(' ');

        html += `
            <tr class="${isUser ? 'user-team' : ''}">
                <td style="text-align: center;">${index + 1}</td>
                <td style="text-align: left;">
                    <div class="team-name-cell ${isUser ? 'user-team' : ''}">
                        ${getTeamLogo(team.name, { size: 'large', isUser: isUser })}
                        <span>${team.name}</span>
                        ${isUser ? '' : ''}
                    </div>
                </td>
                <td style="text-align: left;">
                    <div class="team-players-cell">${playersHtml}</div>
                </td>
                <td style="text-align: right;">
                    <span class="team-rating-cell" style="color: ${ratingColor}; font-weight: 700;">
                        ${team.totalRating.toFixed(1)}
                    </span>
                    <span style="font-size: 0.8rem; color: var(--color-text-muted); display: block;">
                        (сред. ${team.avgRating.toFixed(1)} + син. ${(team.synergy || 0).toFixed(2)})
                    </span>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
        <div style="margin-top: 20px; text-align: center;">
            <button class="btn btn-success btn-start-final" id="btn-start-tournament-final">
                🏆 Начать турнир
            </button>
        </div>
    `;

    container.innerHTML = html;

    const startBtn = container.querySelector('#btn-start-tournament-final');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            import('../core/tournamentController.js').then(module => {
                module.runFullTournament(
                    state.generatedTeams,
                    state.coreStats,
                    state.supportStats,
                    duoMap,
                    state.allRatings,
                    state.playerForms
                );
            });
        });
    }
}