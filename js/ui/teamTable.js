import { getTeamLogo } from './teamLogo.js';

export function displayTeamTable(allTeams) {
    const container = document.getElementById('team-table-container');
    const tbody = document.getElementById('team-table-body');
    tbody.innerHTML = '';

    const sortedTeams = [...allTeams].sort((a, b) => {
        if (a.isUser) return -1;
        if (b.isUser) return 1;
        return (b.totalRating || 0) - (a.totalRating || 0);
    });

    const table = container.querySelector('table');
    if (table) {
        const thead = table.querySelector('thead');
        if (thead) {
            thead.innerHTML = `
                <tr>
                    <th style="width:40px; text-align:center;">#</th>
                    <th style="width:70px; text-align:center;">Лого</th>
                    <th style="text-align:left;">Команда</th>
                </tr>
            `;
        }
    }

    sortedTeams.forEach((team, index) => {
        const tr = document.createElement('tr');
        const nameDisplay = team.isUser ? `${team.name}` : team.name;
        const playersList = team.players.join(', ');
        const ratingDisplay = team.totalRating !== undefined ? team.totalRating.toFixed(1) : '—';
        const bonusDisplay = team.bonus !== undefined ? (team.bonus >= 0 ? '+' : '') + team.bonus.toFixed(1) : '';
        const ratingClass = team.totalRating > team.avgRating ? 'high' : '';
        const logoHtml = getTeamLogo(team.name, { size: 'large', isUser: team.isUser });

        tr.innerHTML = `
            <td style="text-align:center; font-weight:600; width:40px;">${index + 1}</td>
            <td style="text-align:center; width:70px;">${logoHtml}</td>
            <td>
                <div style="display:flex; justify-content:space-between; align-items:center; font-weight:600; font-size:1.1em; color:#eee;">
                    <span>${nameDisplay}</span>
                    <span style="font-weight:500; color:#888; font-size:0.9em; ${team.totalRating > team.avgRating ? 'color:#4caf50;' : ''}">${ratingDisplay} (${bonusDisplay})</span>
                </div>
                <div style="font-weight:400; font-size:0.9em; color:#aaa; margin-top:6px; padding-left:4px; border-top:1px dashed #1a1a2a; padding-top:6px;">${playersList}</div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    container.style.display = 'block';
    document.getElementById('main-interface').style.display = 'none';
}