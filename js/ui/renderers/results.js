import { getShortName } from '../../constants/teamShortNames.js';
import { getRating } from '../../ratings.js';
import { getTeamLogo } from '../teamLogo.js';


/**
 * Возвращает полное название команды для отображения.
 */
function getTeamDisplayName(team) {
    if (!team) return '';

    if (team.isUser) {
        return team.name || 'Ваша команда';
    }

    return team.name || '';
}


/**
 * ============================================================
 * ОПРЕДЕЛЕНИЕ МЕСТ
 * ============================================================
 *
 * ВАЖНО:
 * Команды сравниваются по name, а не по ссылке на объект.
 *
 * Это защищает от ситуации, когда одна и та же команда
 * представлена разными объектами JavaScript.
 */
export function getPlacements(
    groupStandings,
    bracket,
    playoffTeams
) {

    if (
        !Array.isArray(groupStandings) ||
        !bracket
    ) {
        return [];
    }


    // ========================================================
    // PLAYOFF TEAMS
    // ========================================================

    const playoffNames =
        new Set(
            (playoffTeams || [])
                .filter(Boolean)
                .map(team => team.name)
        );


    // ========================================================
    // ELIMINATION TEAMS
    // ========================================================

    const eliminationCandidates =
        groupStandings.slice(3, 13);


    // В elimination losers попадают только команды,
    // которые НЕ являются участниками playoff по имени.
    const eliminationLosers =
        eliminationCandidates.filter(
            team =>
                !playoffNames.has(team.name)
        );


    console.log(
        '[RESULTS] Elimination losers:',
        eliminationLosers.map(
            team => team.name
        )
    );


    // ========================================================
    // 14-15 / 16
    // ========================================================

    const place14_15 =
        groupStandings.slice(13, 15);

    const place16 =
        groupStandings.slice(15, 16)[0];


    // ========================================================
    // PLAYOFF RESULTS
    // ========================================================

    const champion =
        bracket.grandFinal?.winner ||
        bracket.champion;

    const grandLoser =
        bracket.grandFinal?.loser;

    const lbFinalLoser =
        bracket.lbFinal?.loser;

    const lbRound3Loser =
        bracket.lbRound3?.[0]?.loser;


    const lbRound2Losers =
        Array.isArray(bracket.lbRound2)
            ? bracket.lbRound2
                .map(m => m?.loser)
                .filter(Boolean)
            : [];


    const lbRound1Losers =
        Array.isArray(bracket.lbRound1)
            ? bracket.lbRound1
                .map(m => m?.loser)
                .filter(Boolean)
            : [];


    // ========================================================
    // СОБИРАЕМ ВСЕ МЕСТА
    // ========================================================

    const allCandidates = [

        {
            team: champion,
            placement: '1'
        },

        {
            team: grandLoser,
            placement: '2'
        },

        {
            team: lbFinalLoser,
            placement: '3'
        },

        {
            team: lbRound3Loser,
            placement: '4'
        },

        ...lbRound2Losers.map(
            team => ({
                team,
                placement: '5-6'
            })
        ),

        ...lbRound1Losers.map(
            team => ({
                team,
                placement: '7-8'
            })
        ),

        ...eliminationLosers.map(
            team => ({
                team,
                placement: '9-13'
            })
        ),

        ...place14_15.map(
            team => ({
                team,
                placement: '14-15'
            })
        ),

        ...(place16
            ? [
                {
                    team: place16,
                    placement: '16'
                }
            ]
            : [])
    ];


    // ========================================================
    // УДАЛЯЕМ ДУБЛИКАТЫ ПО ИМЕНИ
    // ========================================================

    const seenNames =
        new Set();

    const uniquePlacements = [];


    for (
        const item of allCandidates
    ) {

        if (
            item.team &&
            !seenNames.has(
                item.team.name
            )
        ) {

            seenNames.add(
                item.team.name
            );

            uniquePlacements.push(
                item
            );
        }
    }


    console.log(
        '[RESULTS] Итоговые места:',
        uniquePlacements.map(
            item =>
                `${item.placement}: ${item.team.name}`
        )
    );


    return uniquePlacements;
}


/**
 * Создание карточки места.
 */
function createPlacementItem(item) {

    const div =
        document.createElement('div');


    if (
        !item ||
        !item.team
    ) {

        div.className =
            'placement-item empty';

        return div;
    }


    const team =
        item.team;

    const teamName =
        getTeamDisplayName(team);

    const isUser =
        team.isUser || false;


    const logoSize =
        isUser
            ? 'large'
            : 'small';


    const logo =
        getTeamLogo(
            team.name,
            {
                size: logoSize,
                isUser
            }
        );


    div.className =
        'placement-item' +
        (
            isUser
                ? ' user-team'
                : ''
        );


    div.innerHTML = `
        ${logo}
        <span class="place">
            ${item.placement || ''}
        </span>
        <span class="team-name">
            ${teamName}
        </span>
    `;


    return div;
}


/**
 * ============================================================
 * ОТРИСОВКА РЕЗУЛЬТАТОВ
 * ============================================================
 */

export function renderTournamentResults(
    placements,
    userTeam,
    allRatings
) {

    const container =
        document.getElementById(
            'tournament-results'
        );


    if (!container) {
        return;
    }


    container.style.display =
        'block';

    container.classList.add(
        'visible'
    );


    // ========================================================
    // ЧЕМПИОН
    // ========================================================

    const statusContainer =
        document.getElementById(
            'tournament-status'
        );


    if (
        statusContainer &&
        placements.length > 0
    ) {

        const champion =
            placements[0]?.team;


        if (champion) {

            const logo =
                getTeamLogo(
                    champion.name,
                    {
                        size: 'medium',
                        isUser:
                            champion.isUser
                    }
                );


            statusContainer.innerHTML = `
                <h3>
                    🏆 Чемпион:
                    ${logo}
                    <span>
                        ${getTeamDisplayName(champion)}
                    </span>
                </h3>
            `;
        }
    }


    // ========================================================
    // СПИСОК МЕСТ
    // ========================================================

    const listContainer =
        document.getElementById(
            'placements-list'
        );


    if (!listContainer) {
        return;
    }


    listContainer.innerHTML =
        '';


    const totalRows =
        Math.ceil(
            placements.length / 2
        );


    const wrapper =
        document.createElement(
            'div'
        );

    wrapper.className =
        'placement-grid';


    const leftCol =
        document.createElement(
            'div'
        );


    const rightCol =
        document.createElement(
            'div'
        );


    for (
        let i = 0;
        i < totalRows;
        i++
    ) {

        const leftItem =
            placements[i];


        const rightItem =
            placements[
                i + totalRows
            ];


        if (leftItem) {

            leftCol.appendChild(
                createPlacementItem(
                    leftItem
                )
            );
        }


        if (rightItem) {

            rightCol.appendChild(
                createPlacementItem(
                    rightItem
                )
            );

        } else {

            const empty =
                document.createElement(
                    'div'
                );

            empty.className =
                'placement-item empty';

            rightCol.appendChild(
                empty
            );
        }
    }


    wrapper.appendChild(
        leftCol
    );

    wrapper.appendChild(
        rightCol
    );


    listContainer.appendChild(
        wrapper
    );


    // ========================================================
    // КАРТОЧКА ПОЛЬЗОВАТЕЛЯ
    // ========================================================

    const cardContainer =
        document.getElementById(
            'user-card'
        );


    if (
        !cardContainer ||
        !userTeam ||
        !Array.isArray(
            userTeam.players
        )
    ) {

        if (cardContainer) {

            cardContainer.innerHTML =
                '<div class="error">' +
                'Ошибка: данные о вашей команде не найдены' +
                '</div>';
        }

        return;
    }


    let userPlacement =
        '';


    const userPlacementItem =
        placements.find(
            item =>
                item?.team &&
                (
                    item.team === userTeam ||
                    item.team.isUser
                )
        );


    if (userPlacementItem) {

        userPlacement =
            userPlacementItem.placement ||
            '';
    }


    const roleLabels = {

        carry: 'Carry',

        mid: 'Mid',

        offlane: 'Offlane',

        'semi-support':
            'Semi-Support',

        'full-support':
            'Full-Support'
    };


    let playersHtml =
        `<div class="user-players-grid">`;


    userTeam.players.forEach(
        (
            player,
            idx
        ) => {

            const roleKey =
                userTeam.roleKeys?.[idx] ||
                '';


            const roleLabel =
                roleLabels[roleKey] ||
                roleKey ||
                'Player';


            let rating =
                getRating(
                    player,
                    roleKey
                );


            if (
                rating === null ||
                rating === undefined
            ) {

                if (
                    allRatings &&
                    allRatings[roleKey] &&
                    allRatings[roleKey][player] !== undefined
                ) {

                    rating =
                        allRatings[
                            roleKey
                        ][player];
                }
            }


            rating =
                Number(rating) ||
                0;


            playersHtml += `
                <div class="user-player-row">
                    <span class="role">
                        ${roleLabel}
                    </span>

                    <span class="name">
                        ${player}
                    </span>

                    <span class="rating">
                        ${rating}
                    </span>
                </div>
            `;
        }
    );


    playersHtml +=
        `</div>`;


    const avgRating =
        Number(
            userTeam.avgRating
        ) || 0;


    const bonus =
        Number(
            userTeam.bonus
        ) || 0;


    const total =
        Number.isFinite(
            userTeam.totalRating
        )
            ? userTeam.totalRating
            : avgRating + bonus;


    const placeStr =
        userPlacement
            ? ` - ${userPlacement} место`
            : '';


    const logo =
        getTeamLogo(
            userTeam.name,
            {
                size: 'large',
                isUser: true
            }
        );


    cardContainer.innerHTML = `

        <div class="user-team-header">
            ${logo}

            <div class="user-team-name">
                ⭐
                ${userTeam.name || 'Ваша команда'}
                ${placeStr}
            </div>
        </div>

        ${playersHtml}

        <div class="user-stats">

            <div class="stat">
                <span class="label">
                    Базовый рейтинг
                </span>

                <span class="value">
                    ${avgRating.toFixed(1)}
                </span>
            </div>


            <div class="stat">

                <span class="label">
                    Бонус сыгранности
                </span>

                <span class="value bonus">
                    ${bonus >= 0 ? '+' : ''}
                    ${bonus.toFixed(1)}
                </span>

            </div>


            <div class="stat">

                <span class="label">
                    Общий рейтинг
                </span>

                <span class="value total">
                    ${total.toFixed(1)}
                </span>

            </div>

        </div>
    `;
}