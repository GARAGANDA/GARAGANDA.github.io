import { getShortName } from '../../constants/teamShortNames.js';
import { getTeamLogo } from '../teamLogo.js';
import { getWinnerByScore } from '../../utils/matchUtils.js';

// Храним ссылки на элементы текущих матчей
const currentMatchElements = new Map();

export function renderGroupTable(standings, round) {
    const container = document.getElementById('group-stage-container');
    if (!container) return;
    const maxRounds = 5;
    let html = `<h3>Групповой этап${round > 0 ? ' – раунд ' + round : ''}</h3>`;
    html += `<table>
        <thead>
            <tr>
                <th>#</th>
                <th style="text-align:left;">Команда</th>
                <th>Матчи</th>`;
    for (let r = 1; r <= maxRounds; r++) {
        html += `<th>Раунд ${r}</th>`;
    }
    html += `</tr></thead><tbody>`;

    standings.forEach((team, idx) => {
        const record = `${team.wins} - ${team.losses}`;
        let highlightClass = '';
        if (idx < 3) highlightClass = 'highlight-green';
        else if (idx >= 3 && idx < 13) highlightClass = 'highlight-yellow';
        else if (idx >= 13) highlightClass = 'highlight-red';

        const fullName = team.name;
        const logo = getTeamLogo(team.name, { size: 'large', isUser: team.isUser });

        html += `<tr>
            <td class="${highlightClass}">${idx + 1}</td>
            <td class="${highlightClass}" style="text-align:left;">
                <div class="team-logo-wrapper">
                    ${logo}
                    ${fullName}
                </div>
            </td>
            <td>${record}</td>`;
        for (let r = 1; r <= maxRounds; r++) {
            const result = team.roundResults.find(res => res.round === r);
            if (result) {
                const score = result.score.join(':');
                const color = result.won ? '#4caf50' : '#f44336';
                const opponent = result.opponent;
                let opponentDisplay;
                if (opponent === 'BYE') {
                    opponentDisplay = 'BYE';
                } else {
                    const isOpponentUser = (opponent === 'Ваша команда');
                    const oppLogo = getTeamLogo(opponent, { size: 'large', isUser: isOpponentUser });
                    opponentDisplay = `
                        <div class="round-cell" style="color:${color};">
                            ${oppLogo}
                            <span class="round-score">${score}</span>
                        </div>
                    `;
                }
                html += `<td>${opponentDisplay}</td>`;
            } else {
                html += `<td>—</td>`;
            }
        }
        html += `</tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
}

export function renderCurrentRound(round, matches) {
    const container = document.getElementById('current-matches');
    if (!container) return;

    if (matches.length === 0) {
        container.innerHTML = `<h4>Раунд ${round}</h4><div class="matches-list-inner"><div class="no-matches">Матчи завершены</div></div>`;
        currentMatchElements.clear();
        return;
    }

    let innerContainer = container.querySelector('.matches-list-inner');
    if (!innerContainer) {
        const header = container.querySelector('h4');
        innerContainer = document.createElement('div');
        innerContainer.className = 'matches-list-inner';
        if (header) {
            header.after(innerContainer);
        } else {
            container.appendChild(innerContainer);
        }
    }

    const newKeys = new Set();
    matches.forEach((m) => {
        const key = `${m.teamA}|${m.teamB}`;
        newKeys.add(key);

        const score = m.score ? m.score.join(':') : '0:0';
        const winner = getWinnerByScore(m);
        const teamAWin = (winner && m.teamA === winner) ? 'winner' : '';
        const teamBWin = (winner && m.teamB === winner) ? 'winner' : '';
        const teamAShort = getShortName(m.teamA);
        const teamBShort = getShortName(m.teamB);

        let element = currentMatchElements.get(key);
        if (element) {
            const spans = element.querySelectorAll('.team-name, .score');
            if (spans.length === 3) {
                spans[0].textContent = teamAShort;
                spans[0].className = `team-name ${teamAWin}`;
                spans[1].textContent = score;
                spans[2].textContent = teamBShort;
                spans[2].className = `team-name ${teamBWin}`;
            }
        } else {
            const matchDiv = document.createElement('div');
            matchDiv.className = 'match-card';
            matchDiv.innerHTML = `
                <span class="team-name ${teamAWin}">${teamAShort}</span>
                <span class="score">${score}</span>
                <span class="team-name ${teamBWin}">${teamBShort}</span>
            `;
            currentMatchElements.set(key, matchDiv);
            innerContainer.appendChild(matchDiv);
        }
    });

    for (const [key, el] of currentMatchElements.entries()) {
        if (!newKeys.has(key)) {
            el.remove();
            currentMatchElements.delete(key);
        }
    }

    const children = innerContainer.children;
    const orderedElements = [];
    matches.forEach(m => {
        const key = `${m.teamA}|${m.teamB}`;
        const el = currentMatchElements.get(key);
        if (el) orderedElements.push(el);
    });
    orderedElements.forEach((el, idx) => {
        if (children[idx] !== el) {
            innerContainer.insertBefore(el, children[idx] || null);
        }
    });
}

export function addHistoryRound(round, matches) {
    const container = document.getElementById('history-matches');
    if (!container) return;
    let html = `<h4>Раунд ${round}</h4>`;
    html += `<div class="matches-list-inner">`;
    matches.forEach(m => {
        const score = m.score ? m.score.join(':') : '0:0';
        const winner = getWinnerByScore(m);
        const teamAWin = (winner && m.teamA === winner) ? 'winner' : '';
        const teamBWin = (winner && m.teamB === winner) ? 'winner' : '';
        const teamAShort = getShortName(m.teamA);
        const teamBShort = getShortName(m.teamB);
        html += `
            <div class="match-card">
                <span class="team-name ${teamAWin}">${teamAShort}</span>
                <span class="score">${score}</span>
                <span class="team-name ${teamBWin}">${teamBShort}</span>
            </div>
        `;
    });
    html += `</div>`;
    container.insertAdjacentHTML('beforeend', html);
    const parent = document.getElementById('matches-container');
    if (parent) parent.scrollTop = parent.scrollHeight;
}