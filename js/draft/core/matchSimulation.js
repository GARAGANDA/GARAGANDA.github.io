// ============================================================
// js/draft/core/matchSimulation.js
// Быстрая симуляция матча при пропуске драфта
// ============================================================


// ============================================================
// ФОРМА
// ============================================================

function getPlayerForm(
    player,
    playerForms = {}
) {

    const form =
        Number(
            playerForms?.[player]
        );


    if (
        !Number.isFinite(
            form
        )
    ) {
        return 0;
    }


    return Math.max(
        -3,
        Math.min(
            3,
            form
        )
    );
}


// ============================================================
// РЕЙТИНГ ИГРОКА
// ============================================================

function getPlayerRating(
    team,
    player
) {

    if (
        team?.ratings &&
        team.ratings[player] !==
        undefined
    ) {

        const rating =
            Number(
                team.ratings[player]
            );


        if (
            Number.isFinite(
                rating
            )
        ) {
            return rating;
        }
    }


    if (
        team?.playerRatings &&
        team.playerRatings[player] !==
        undefined
    ) {

        const rating =
            Number(
                team.playerRatings[player]
            );


        if (
            Number.isFinite(
                rating
            )
        ) {
            return rating;
        }
    }


    return 80;
}


// ============================================================
// СРЕДНИЙ РЕЙТИНГ КОМАНДЫ
// ============================================================

function getTeamAverageRating(
    team
) {

    if (
        !team ||
        !Array.isArray(
            team.players
        ) ||
        team.players.length === 0
    ) {
        return 80;
    }


    const playerForms =
        team.playerForms ||
        {};


    let total =
        0;


    let count =
        0;


    for (
        const player of team.players
    ) {

        const baseRating =
            getPlayerRating(
                team,
                player
            );


        const form =
            getPlayerForm(
                player,
                playerForms
            );


        total +=
            baseRating +
            form;


        count++;
    }


    return count > 0
        ? total / count
        : 80;
}


// ============================================================
// СИМУЛЯЦИЯ
// ============================================================

export function simulateMatch(
    teamA,
    teamB,
    bestOf = 3
) {

    const avgA =
        getTeamAverageRating(
            teamA
        );


    const avgB =
        getTeamAverageRating(
            teamB
        );


    const diff =
        avgA -
        avgB;


    const winProb =
        1 /
        (
            1 +
            Math.exp(
                -diff *
                0.1
            )
        );


    const winsNeeded =
        Math.ceil(
            bestOf / 2
        );


    let winsA =
        0;


    let winsB =
        0;


    while (
        winsA < winsNeeded &&
        winsB < winsNeeded
    ) {

        if (
            Math.random() <
            winProb
        ) {

            winsA++;

        } else {

            winsB++;
        }
    }


    const winner =
        winsA > winsB
            ? teamA
            : teamB;


    return {

        winner,

        score: [
            winsA,
            winsB
        ]
    };
}