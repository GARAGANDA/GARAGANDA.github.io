import { getShortName } from '../../constants/teamShortNames.js';
import { getTeamLogo } from '../teamLogo.js';
import { getWinnerByScore } from '../../utils/matchUtils.js';

const elimCurrentElements = new Map();


// ============================================================
// ПОЛУЧЕНИЕ ПОБЕДИТЕЛЯ
// ============================================================

/**
 * ВАЖНО:
 *
 * Сначала используем match.winner,
 * который был определён в tournamentController.js.
 *
 * И только если его нет — используем старый fallback
 * через getWinnerByScore().
 *
 * Это предотвращает ситуацию, когда UI показывает
 * другую команду победителем, чем реально прошла дальше.
 */
function getMatchWinner(match) {

    if (
        match &&
        typeof match.winner === 'string' &&
        match.winner.length > 0
    ) {
        return match.winner;
    }

    return getWinnerByScore(match);
}


// ============================================================
// ELIMINATION BRACKET
// ============================================================

export function renderEliminationBracket(
    completedMatches
) {

    const container =
        document.getElementById(
            'bracket-container'
        );


    if (!container) {
        return;
    }


    if (
        !Array.isArray(
            completedMatches
        ) ||
        completedMatches.length === 0
    ) {

        container.innerHTML =
            `<div class="elimination-empty">
                Ожидание завершения матчей...
            </div>`;

        return;
    }


    let html = `

        <div class="elimination-grid">

            <div class="elimination-header">

                <span class="elimination-match-label">
                    Матч
                </span>

                <span class="elimination-winner-label">
                    Победитель
                </span>

            </div>

    `;


    completedMatches.forEach(
        match => {

            const teamA =
                match.teamA ||
                '—';


            const teamB =
                match.teamB ||
                '—';


            const scoreA =
                Array.isArray(
                    match.score
                )
                    ? match.score[0]
                    : 0;


            const scoreB =
                Array.isArray(
                    match.score
                )
                    ? match.score[1]
                    : 0;


            // Используем сохранённого победителя.
            const winner =
                getMatchWinner(
                    match
                );


            const teamAWinner =
                (
                    winner &&
                    teamA === winner
                )
                    ? 'winner'
                    : '';


            const teamBWinner =
                (
                    winner &&
                    teamB === winner
                )
                    ? 'winner'
                    : '';


            const winnerName =
                winner
                    ? getShortName(
                        winner
                    )
                    : '—';


            const isUserA =
                teamA ===
                'Ваша команда';


            const isUserB =
                teamB ===
                'Ваша команда';


            const logoA =
                getTeamLogo(
                    teamA,
                    {
                        size: 'large',
                        isUser: isUserA
                    }
                );


            const logoB =
                getTeamLogo(
                    teamB,
                    {
                        size: 'large',
                        isUser: isUserB
                    }
                );


            html += `

                <div class="elimination-match">

                    <div class="elimination-teams">

                        <div class="elimination-team ${teamAWinner}">

                            ${logoA}

                            <span class="elimination-team-name">
                                ${getShortName(teamA)}
                            </span>

                            <span class="elimination-score">
                                ${scoreA}
                            </span>

                        </div>


                        <div class="elimination-team ${teamBWinner}">

                            ${logoB}

                            <span class="elimination-team-name">
                                ${getShortName(teamB)}
                            </span>

                            <span class="elimination-score">
                                ${scoreB}
                            </span>

                        </div>

                    </div>


                    <div class="elimination-winner">
                        ${winnerName}
                    </div>

                </div>

            `;
        }
    );


    html += `
        </div>
    `;


    container.innerHTML =
        html;
}


// ============================================================
// ТЕКУЩИЕ МАТЧИ
// ============================================================

export function renderElimCurrentMatches(
    matches,
    title = 'Текущие матчи'
) {

    const container =
        document.getElementById(
            'elim-current-matches'
        );


    if (!container) {
        return;
    }


    if (
        !Array.isArray(matches)
    ) {
        return;
    }


    if (
        matches.length === 0
    ) {

        container.innerHTML =
            `<h4>${title}</h4>
             <div class="matches-list-inner">
                <div class="no-matches">
                    Все матчи завершены
                </div>
             </div>`;

        elimCurrentElements.clear();

        return;
    }


    let innerContainer =
        container.querySelector(
            '.matches-list-inner'
        );


    if (!innerContainer) {

        const header =
            container.querySelector(
                'h4'
            );


        innerContainer =
            document.createElement(
                'div'
            );


        innerContainer.className =
            'matches-list-inner';


        if (header) {

            header.after(
                innerContainer
            );

        } else {

            container.appendChild(
                innerContainer
            );
        }
    }


    const newKeys =
        new Set();


    matches.forEach(
        match => {

            const key =
                `${match.teamA}|${match.teamB}`;


            newKeys.add(
                key
            );


            const score =
                Array.isArray(
                    match.score
                )
                    ? match.score.join(':')
                    : '0:0';


            // Сначала используем сохранённого победителя.
            const winner =
                getMatchWinner(
                    match
                );


            const teamAWin =
                (
                    winner &&
                    match.teamA === winner
                )
                    ? 'winner'
                    : '';


            const teamBWin =
                (
                    winner &&
                    match.teamB === winner
                )
                    ? 'winner'
                    : '';


            const teamAShort =
                getShortName(
                    match.teamA
                );


            const teamBShort =
                getShortName(
                    match.teamB
                );


            let element =
                elimCurrentElements.get(
                    key
                );


            if (element) {

                const spans =
                    element.querySelectorAll(
                        '.team-name, .score'
                    );


                if (
                    spans.length === 3
                ) {

                    spans[0].textContent =
                        teamAShort;

                    spans[0].className =
                        `team-name ${teamAWin}`;


                    spans[1].textContent =
                        score;


                    spans[2].textContent =
                        teamBShort;

                    spans[2].className =
                        `team-name ${teamBWin}`;
                }

            } else {

                const matchDiv =
                    document.createElement(
                        'div'
                    );


                matchDiv.className =
                    'match-card';


                matchDiv.innerHTML = `

                    <span class="team-name ${teamAWin}">
                        ${teamAShort}
                    </span>

                    <span class="score">
                        ${score}
                    </span>

                    <span class="team-name ${teamBWin}">
                        ${teamBShort}
                    </span>

                `;


                elimCurrentElements.set(
                    key,
                    matchDiv
                );


                innerContainer.appendChild(
                    matchDiv
                );
            }
        }
    );


    // ========================================================
    // УДАЛЯЕМ ЗАВЕРШЁННЫЕ МАТЧИ
    // ========================================================

    for (
        const [
            key,
            el
        ]
        of elimCurrentElements.entries()
    ) {

        if (
            !newKeys.has(key)
        ) {

            el.remove();

            elimCurrentElements.delete(
                key
            );
        }
    }


    // ========================================================
    // СОХРАНЯЕМ ПОРЯДОК
    // ========================================================

    const children =
        innerContainer.children;


    const orderedElements =
        [];


    matches.forEach(
        match => {

            const key =
                `${match.teamA}|${match.teamB}`;


            const el =
                elimCurrentElements.get(
                    key
                );


            if (el) {

                orderedElements.push(
                    el
                );
            }
        }
    );


    orderedElements.forEach(
        (
            el,
            idx
        ) => {

            if (
                children[idx] !== el
            ) {

                innerContainer.insertBefore(
                    el,
                    children[idx] ||
                    null
                );
            }
        }
    );
}


// ============================================================
// ИСТОРИЯ ELIMINATION
// ============================================================

export function addElimHistoryMatch(
    match
) {

    const container =
        document.getElementById(
            'elim-history-matches'
        );


    if (!container) {
        return;
    }


    const score =
        Array.isArray(
            match.score
        )
            ? match.score.join(':')
            : '0:0';


    // Используем реального победителя,
    // сохранённого контроллером.
    const winner =
        getMatchWinner(
            match
        );


    const teamAWin =
        (
            winner &&
            match.teamA === winner
        )
            ? 'winner'
            : '';


    const teamBWin =
        (
            winner &&
            match.teamB === winner
        )
            ? 'winner'
            : '';


    const teamAShort =
        getShortName(
            match.teamA
        );


    const teamBShort =
        getShortName(
            match.teamB
        );


    const html = `

        <div class="match-card">

            <span class="team-name ${teamAWin}">
                ${teamAShort}
            </span>

            <span class="score">
                ${score}
            </span>

            <span class="team-name ${teamBWin}">
                ${teamBShort}
            </span>

        </div>

    `;


    container.insertAdjacentHTML(
        'beforeend',
        html
    );


    const parent =
        document.getElementById(
            'elimination-matches'
        );


    if (parent) {

        parent.scrollTop =
            parent.scrollHeight;
    }
}