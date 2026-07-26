// ============================================================
// js/draft/core/calculations.js
// ============================================================

export function getTeamDirection(state, teamKey) {
    const picks = state.gameState.picks[teamKey];
    const picked = Object.values(picks).filter(p => p !== null);
    if (picked.length === 0) return { early: 0, mid: 0, late: 0, dominant: 'None' };
    let sumEarly = 0, sumMid = 0, sumLate = 0;
    const heroRatings = window._heroRatings || {};
    for (const pick of picked) {
        const ratings = heroRatings[pick.hero];
        if (ratings) {
            sumEarly += ratings.early || 0;
            sumMid += ratings.mid || 0;
            sumLate += ratings.late || 0;
        }
    }
    const total = sumEarly + sumMid + sumLate;
    if (total === 0) return { early: 0, mid: 0, late: 0, dominant: 'None' };
    const max = Math.max(sumEarly, sumMid, sumLate);
    let dominant = 'Balanced';
    const countMax = (sumEarly === max ? 1 : 0) + (sumMid === max ? 1 : 0) + (sumLate === max ? 1 : 0);
    if (countMax === 1) {
        if (sumEarly === max) dominant = 'Early';
        else if (sumMid === max) dominant = 'Mid';
        else if (sumLate === max) dominant = 'Late';
    }
    return { early: sumEarly, mid: sumMid, late: sumLate, dominant };
}

export function getLaneData(state) {
    const dire = 'dire', radiant = 'radiant';
    const direCarry = state.gameState.picks.dire.carry;
    const direFull = state.gameState.picks.dire.full;
    const radOff = state.gameState.picks.radiant.offlane;
    const radSemi = state.gameState.picks.radiant.semi;

    function getKAL(player, hero) {
        if (state.kalData[player] && state.kalData[player][hero] !== undefined) {
            return state.kalData[player][hero];
        }
        return 3.0;
    }

    function calcOutcome(direKAL, radiantKAL) {
        const diff = direKAL - radiantKAL;
        const absDiff = Math.abs(diff);
        let label, className;
        if (absDiff >= 4) {
            if (diff > 0) { label = 'Разгром Dire'; className = 'result-crush'; }
            else if (diff < 0) { label = 'Разгром Radiant'; className = 'result-crush'; }
            else { label = 'Ничья'; className = 'result-draw'; }
        } else if (absDiff >= 1) {
            if (diff > 0) { label = 'Победа Dire'; className = 'result-win'; }
            else if (diff < 0) { label = 'Победа Radiant'; className = 'result-win'; }
            else { label = 'Ничья'; className = 'result-draw'; }
        } else {
            label = 'Ничья'; className = 'result-draw';
        }
        return { label, className, diff };
    }

    let direKAL_top = 0, radiantKAL_top = 0;
    let direPlayers_top = [], radiantPlayers_top = [];
    if (direCarry) { direKAL_top += getKAL(direCarry.player, direCarry.hero); direPlayers_top.push(`${direCarry.hero} (${direCarry.player})`); }
    if (direFull) { direKAL_top += getKAL(direFull.player, direFull.hero); direPlayers_top.push(`${direFull.hero} (${direFull.player})`); }
    if (radOff) { radiantKAL_top += getKAL(radOff.player, radOff.hero); radiantPlayers_top.push(`${radOff.hero} (${radOff.player})`); }
    if (radSemi) { radiantKAL_top += getKAL(radSemi.player, radSemi.hero); radiantPlayers_top.push(`${radSemi.hero} (${radSemi.player})`); }
    const outcomeTop = calcOutcome(direKAL_top, radiantKAL_top);

    const direMid = state.gameState.picks.dire.mid;
    const radMid = state.gameState.picks.radiant.mid;
    let direKAL_mid = 0, radiantKAL_mid = 0;
    let direPlayers_mid = [], radiantPlayers_mid = [];
    if (direMid) { direKAL_mid += getKAL(direMid.player, direMid.hero); direPlayers_mid.push(`${direMid.hero} (${direMid.player})`); }
    if (radMid) { radiantKAL_mid += getKAL(radMid.player, radMid.hero); radiantPlayers_mid.push(`${radMid.hero} (${radMid.player})`); }
    const outcomeMid = calcOutcome(direKAL_mid, radiantKAL_mid);

    const direOff = state.gameState.picks.dire.offlane;
    const direSemi = state.gameState.picks.dire.semi;
    const radCarry = state.gameState.picks.radiant.carry;
    const radFull = state.gameState.picks.radiant.full;
    let direKAL_bot = 0, radiantKAL_bot = 0;
    let direPlayers_bot = [], radiantPlayers_bot = [];
    if (direOff) { direKAL_bot += getKAL(direOff.player, direOff.hero); direPlayers_bot.push(`${direOff.hero} (${direOff.player})`); }
    if (direSemi) { direKAL_bot += getKAL(direSemi.player, direSemi.hero); direPlayers_bot.push(`${direSemi.hero} (${direSemi.player})`); }
    if (radCarry) { radiantKAL_bot += getKAL(radCarry.player, radCarry.hero); radiantPlayers_bot.push(`${radCarry.hero} (${radCarry.player})`); }
    if (radFull) { radiantKAL_bot += getKAL(radFull.player, radFull.hero); radiantPlayers_bot.push(`${radFull.hero} (${radFull.player})`); }
    const outcomeBot = calcOutcome(direKAL_bot, radiantKAL_bot);

    return {
        top: { direPlayers: direPlayers_top.join(' + ') || '—', radiantPlayers: radiantPlayers_top.join(' + ') || '—', direKAL: direKAL_top, radiantKAL: radiantKAL_top, outcome: outcomeTop },
        mid: { direPlayers: direPlayers_mid.join(' + ') || '—', radiantPlayers: radiantPlayers_mid.join(' + ') || '—', direKAL: direKAL_mid, radiantKAL: radiantKAL_mid, outcome: outcomeMid },
        bot: { direPlayers: direPlayers_bot.join(' + ') || '—', radiantPlayers: radiantPlayers_bot.join(' + ') || '—', direKAL: direKAL_bot, radiantKAL: radiantKAL_bot, outcome: outcomeBot }
    };
}

export function getTeamRating(state, teamKey) {
    const picks = state.gameState.picks[teamKey];
    const picked = Object.values(picks).filter(p => p !== null);
    if (picked.length === 0) return { total: 0, avgRating: 0, synergyBonus: 0, bonusFromPicks: 0, strengthFactor: 0 };
    let sumRatings = 0;
    const players = [];
    for (const pick of picked) {
        const rating = state.playerRatings[pick.player] || 80;
        sumRatings += rating;
        players.push(pick.player);
    }
    const avgRating = sumRatings / picked.length;
    const synergy = calculateSynergyBonus(players, state);
    const synergyBonus = synergy.totalBonus;
    let strengthSum = 0;
    for (const pick of picked) {
        const stat = state.gameState.stats[pick.player]?.[pick.hero];
        if (stat) {
            const gamesFactor = stat.total / (stat.total + 50);
            const heroStrength = stat.winrate * 0.7 + gamesFactor * 0.3;
            strengthSum += heroStrength;
        } else {
            strengthSum += 0.5;
        }
    }
    const avgStrength = strengthSum / picked.length;
    const bonusFromPicks = (avgStrength - 0.5) * 20;
    const total = avgRating + synergyBonus + bonusFromPicks;
    return { total, avgRating, synergyBonus, bonusFromPicks, strengthFactor: 1 + (avgStrength - 0.5) };
}

export function calculateSynergyBonus(players, state) {
    if (players.length < 2) return { totalBonus: 0, groups: [] };
    const sorted = [...players].sort();
    const DUO_COEF = 0.33;
    const allGroups = [];
    const duoMap = state.duoMap || {};
    for (let i = 0; i < sorted.length; i++) {
        for (let j = i+1; j < sorted.length; j++) {
            const key = [sorted[i], sorted[j]].sort().join(', ');
            const data = duoMap[key];
            if (data) {
                const weight = data.total / (data.total + 50);
                const bonus = (data.winrate - 0.5) * DUO_COEF * weight;
                allGroups.push({
                    type: 'duo',
                    players: [sorted[i], sorted[j]],
                    winrate: data.winrate,
                    bonus: bonus,
                    total: data.total,
                    key: key
                });
            }
        }
    }
    allGroups.sort((a,b)=>b.bonus-a.bonus);
    const usedPlayers = new Set();
    const selectedGroups = [];
    for (const group of allGroups) {
        const allUsed = group.players.every(p => usedPlayers.has(p));
        if (allUsed) continue;
        selectedGroups.push(group);
        group.players.forEach(p => usedPlayers.add(p));
    }
    let totalBonus = 0;
    selectedGroups.forEach(g => { totalBonus += g.bonus; });
    totalBonus *= 10;
    if (totalBonus > 5) totalBonus = 5;
    return { totalBonus, groups: selectedGroups };
}

export function computeStrongPicks(state) {
    const heroVs = window._heroVsData || {};
    const direPicks = state.gameState.picks.dire;
    const radiantPicks = state.gameState.picks.radiant;
    const direHeroes = Object.values(direPicks).filter(p => p !== null).map(p => p.hero);
    const radiantHeroes = Object.values(radiantPicks).filter(p => p !== null).map(p => p.hero);

    const direStrong = {};
    let direCount = 0;
    for (const hero of direHeroes) {
        const vsData = heroVs[hero] || {};
        const strongEnemies = [];
        for (const enemy of radiantHeroes) {
            if (vsData[enemy] && vsData[enemy].winrate > 0.55 && vsData[enemy].eloShift > 0) {
                strongEnemies.push(enemy);
            }
        }
        direStrong[hero] = strongEnemies;
        direCount += strongEnemies.length;
    }

    const radiantStrong = {};
    let radiantCount = 0;
    for (const hero of radiantHeroes) {
        const vsData = heroVs[hero] || {};
        const strongEnemies = [];
        for (const enemy of direHeroes) {
            if (vsData[enemy] && vsData[enemy].winrate > 0.55 && vsData[enemy].eloShift > 0) {
                strongEnemies.push(enemy);
            }
        }
        radiantStrong[hero] = strongEnemies;
        radiantCount += strongEnemies.length;
    }

    let winner = 'tie';
    if (direCount > radiantCount) winner = 'dire';
    else if (radiantCount > direCount) winner = 'radiant';

    return {
        dire: { heroes: direStrong, total: direCount },
        radiant: { heroes: radiantStrong, total: radiantCount },
        winner
    };
}

export function computePickPower(state) {
    const heroVs = window._heroVsData || {};
    const direPicks = state.gameState.picks.dire;
    const radiantPicks = state.gameState.picks.radiant;
    const direHeroes = Object.values(direPicks).filter(p => p !== null).map(p => p.hero);
    const radiantHeroes = Object.values(radiantPicks).filter(p => p !== null).map(p => p.hero);

    function getHeroPower(hero, enemyHeroes) {
        const vsData = heroVs[hero] || {};
        let strongCount = 0;
        for (const enemy of enemyHeroes) {
            if (vsData[enemy] && vsData[enemy].winrate > 0.55 && vsData[enemy].eloShift > 0) {
                strongCount++;
            }
        }
        const bonusMap = { 0: 0.20, 1: 0.08, 2: 0.10, 3: 0.12, 4: 0.14, 5: 0.16 };
        return bonusMap[strongCount] !== undefined ? bonusMap[strongCount] : 0.16;
    }

    let direPower = 0;
    for (const hero of direHeroes) {
        direPower += getHeroPower(hero, radiantHeroes);
    }

    let radiantPower = 0;
    for (const hero of radiantHeroes) {
        radiantPower += getHeroPower(hero, direHeroes);
    }

    const diff = direPower - radiantPower;
    let winner = 'tie';
    if (diff > 0.08) winner = 'dire';
    else if (diff < -0.08) winner = 'radiant';

    return {
        dire: direPower,
        radiant: radiantPower,
        diff: diff,
        winner: winner,
        hasStrongPick: Math.abs(diff) > 0.08
    };
}