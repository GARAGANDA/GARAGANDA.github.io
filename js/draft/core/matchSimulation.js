// ============================================================
// js/draft/core/matchSimulation.js
// Быстрая симуляция матча при пропуске драфта
// ============================================================

export function simulateMatch(teamA, teamB, bestOf = 3) {
    // Простая симуляция на основе среднего рейтинга игроков
    // (рейтинги должны быть переданы в объектах команд, но для упрощения используем случайность)
    // В реальном проекте лучше использовать getTeamRating из calculalations,
    // но для этого нужно создать временное состояние с пиками.
    // Для простоты — случайный победитель с небольшим перевесом в сторону более высокого среднего рейтинга.
    const avgA = teamA.players.reduce((sum, p) => sum + (teamA.ratings?.[p] || 80), 0) / teamA.players.length;
    const avgB = teamB.players.reduce((sum, p) => sum + (teamB.ratings?.[p] || 80), 0) / teamB.players.length;
    const diff = avgA - avgB;
    const winProb = 1 / (1 + Math.exp(-diff * 0.1));
    const winsNeeded = Math.ceil(bestOf / 2);
    let winsA = 0, winsB = 0;
    while (winsA < winsNeeded && winsB < winsNeeded) {
        if (Math.random() < winProb) winsA++;
        else winsB++;
    }
    const winner = winsA > winsB ? teamA : teamB;
    return { winner, score: [winsA, winsB] };
}