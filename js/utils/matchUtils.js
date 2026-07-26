// ============================================================
// js/utils/matchUtils.js
// ============================================================

export function getWinnerByScore(match) {
    if (!match || !match.score || !Array.isArray(match.score) || match.score.length < 2) {
        return null;
    }
    const scoreA = match.score[0];
    const scoreB = match.score[1];
    if (scoreA > scoreB) {
        return match.teamA;
    } else if (scoreB > scoreA) {
        return match.teamB;
    } else {
        return null;
    }
}

export function hasWinner(match) {
    return getWinnerByScore(match) !== null;
}