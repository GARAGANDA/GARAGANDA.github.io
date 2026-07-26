import { getShortName } from '../../constants/teamShortNames.js';
import { getTeamLogo } from '../teamLogo.js';
import { getWinnerByScore } from '../../utils/matchUtils.js';

const matchElements = {};

function createMatchElement(matchKey, teamA, teamB, scoreA, scoreB, winner) {
    const matchDiv = document.createElement('div');
    matchDiv.className = 'playoff-match';
    matchDiv.dataset.matchKey = matchKey;

    const teamsDiv = document.createElement('div');
    teamsDiv.className = 'teams';

    const isUserA = (teamA === 'Ваша команда');
    const isUserB = (teamB === 'Ваша команда');

    const teamADiv = document.createElement('div');
    teamADiv.className = 'team' + (winner && teamA === winner ? ' winner' : '');
    teamADiv.dataset.team = 'A';
    const logoA = getTeamLogo(teamA, { size: 'large', isUser: isUserA });
    const nameA = getShortName(teamA);
    teamADiv.innerHTML = `
        <span class="team-logo-wrapper">${logoA}</span>
        <span class="team-name">${nameA}</span>
        <span class="score">${scoreA}</span>
    `;

    const teamBDiv = document.createElement('div');
    teamBDiv.className = 'team' + (winner && teamB === winner ? ' winner' : '');
    teamBDiv.dataset.team = 'B';
    const logoB = getTeamLogo(teamB, { size: 'large', isUser: isUserB });
    const nameB = getShortName(teamB);
    teamBDiv.innerHTML = `
        <span class="team-logo-wrapper">${logoB}</span>
        <span class="team-name">${nameB}</span>
        <span class="score">${scoreB}</span>
    `;

    teamsDiv.appendChild(teamADiv);
    teamsDiv.appendChild(teamBDiv);
    matchDiv.appendChild(teamsDiv);

    return matchDiv;
}

export function renderPlayoffBracket(state) {
    const container = document.getElementById('playoff-bracket');
    if (!container) return;

    if (!container.children.length) {
        buildBracketStructure(container, state);
    } else {
        updateBracketScores(state);
    }
}

function buildBracketStructure(container, state) {
    const matches = state.matches;

    const upperHtml = `
        <div class="playoff-section">
            <h4>Верхняя сетка</h4>
            <div class="playoff-section-grid">
                <div class="playoff-col">
                    <div class="playoff-stage-label">Четвертьфиналы</div>
                    <div id="match-qf1" class="playoff-match-placeholder"></div>
                    <div id="match-qf2" class="playoff-match-placeholder"></div>
                    <div id="match-qf3" class="playoff-match-placeholder"></div>
                    <div id="match-qf4" class="playoff-match-placeholder"></div>
                </div>
                <div class="playoff-col">
                    <div class="playoff-stage-label">Полуфиналы</div>
                    <div id="match-sf1" class="playoff-match-placeholder"></div>
                    <div id="match-sf2" class="playoff-match-placeholder"></div>
                </div>
                <div class="playoff-col">
                    <div class="playoff-stage-label" style="color:transparent;">Пусто</div>
                </div>
                <div class="playoff-col">
                    <div class="playoff-stage-label">Финал верхней</div>
                    <div id="match-ubf" class="playoff-match-placeholder"></div>
                </div>
            </div>
        </div>
    `;

    const lowerHtml = `
        <div class="playoff-section">
            <h4>Нижняя сетка</h4>
            <div class="playoff-section-grid">
                <div class="playoff-col">
                    <div class="playoff-stage-label">1 раунд</div>
                    <div id="match-lb1_1" class="playoff-match-placeholder"></div>
                    <div id="match-lb1_2" class="playoff-match-placeholder"></div>
                </div>
                <div class="playoff-col">
                    <div class="playoff-stage-label">2 раунд</div>
                    <div id="match-lb2_1" class="playoff-match-placeholder"></div>
                    <div id="match-lb2_2" class="playoff-match-placeholder"></div>
                </div>
                <div class="playoff-col">
                    <div class="playoff-stage-label">Полуфинал</div>
                    <div id="match-lb3" class="playoff-match-placeholder"></div>
                </div>
                <div class="playoff-col">
                    <div class="playoff-stage-label">Финал нижней</div>
                    <div id="match-lbf" class="playoff-match-placeholder"></div>
                </div>
            </div>
        </div>
    `;

    const grandHtml = `
        <div class="playoff-grand">
            <h4>Гранд-финал (Bo5)</h4>
            <div class="playoff-col" style="flex: 0 0 220px; max-width: 220px;">
                <div id="match-gf" class="playoff-match-placeholder"></div>
            </div>
        </div>
    `;

    const mainDiv = document.createElement('div');
    mainDiv.className = 'playoff-main';

    const leftDiv = document.createElement('div');
    leftDiv.className = 'playoff-left';
    leftDiv.innerHTML = upperHtml + lowerHtml;

    const rightDiv = document.createElement('div');
    rightDiv.className = 'playoff-right';
    rightDiv.innerHTML = grandHtml;

    mainDiv.appendChild(leftDiv);
    mainDiv.appendChild(rightDiv);
    container.appendChild(mainDiv);

    const matchKeys = ['qf1', 'qf2', 'qf3', 'qf4', 'sf1', 'sf2', 'ubf', 'lb1_1', 'lb1_2', 'lb2_1', 'lb2_2', 'lb3', 'lbf', 'gf'];
    matchKeys.forEach(key => {
        const placeholder = document.getElementById(`match-${key}`);
        const matchData = matches[key];
        if (matchData) {
            const teamA = matchData.teamA || '—';
            const teamB = matchData.teamB || '—';
            const scoreA = matchData.score ? matchData.score[0] : 0;
            const scoreB = matchData.score ? matchData.score[1] : 0;
            const winner = getWinnerByScore(matchData);
            const matchElement = createMatchElement(key, teamA, teamB, scoreA, scoreB, winner);
            placeholder.parentNode.replaceChild(matchElement, placeholder);
            matchElements[key] = matchElement;
        }
    });
}

function updateBracketScores(state) {
    const matches = state.matches;
    const matchKeys = ['qf1', 'qf2', 'qf3', 'qf4', 'sf1', 'sf2', 'ubf', 'lb1_1', 'lb1_2', 'lb2_1', 'lb2_2', 'lb3', 'lbf', 'gf'];

    matchKeys.forEach(key => {
        const matchData = matches[key];
        if (!matchData) return;

        let matchElement = matchElements[key];
        if (!matchElement) {
            matchElement = document.querySelector(`.playoff-match[data-match-key="${key}"]`);
            if (!matchElement) return;
            matchElements[key] = matchElement;
        }

        const teamA = matchData.teamA || '—';
        const teamB = matchData.teamB || '—';
        const scoreA = matchData.score ? matchData.score[0] : 0;
        const scoreB = matchData.score ? matchData.score[1] : 0;
        const winner = getWinnerByScore(matchData);

        const teamDivs = matchElement.querySelectorAll('.team');
        if (teamDivs.length === 2) {
            const teamADiv = teamDivs[0];
            const teamBDiv = teamDivs[1];

            const isUserA = (teamA === 'Ваша команда');
            const isUserB = (teamB === 'Ваша команда');
            const logoA = getTeamLogo(teamA, { size: 'large', isUser: isUserA });
            const logoB = getTeamLogo(teamB, { size: 'large', isUser: isUserB });
            const nameA = getShortName(teamA);
            const nameB = getShortName(teamB);

            teamADiv.innerHTML = `
                <span class="team-logo-wrapper">${logoA}</span>
                <span class="team-name">${nameA}</span>
                <span class="score">${scoreA}</span>
            `;
            teamADiv.className = 'team' + (winner && teamA === winner ? ' winner' : '');

            teamBDiv.innerHTML = `
                <span class="team-logo-wrapper">${logoB}</span>
                <span class="team-name">${nameB}</span>
                <span class="score">${scoreB}</span>
            `;
            teamBDiv.className = 'team' + (winner && teamB === winner ? ' winner' : '');
        }

        // Удаляем старые winner-label если есть
        const winnerLabel = matchElement.querySelector('.winner-label');
        if (winnerLabel) winnerLabel.remove();
    });
}