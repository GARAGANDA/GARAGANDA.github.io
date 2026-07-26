export function getDraftOrder() {
    return [
        { team: 'radiant', type: 'ban' },
        { team: 'dire', type: 'ban' },
        { team: 'dire', type: 'ban' },
        { team: 'radiant', type: 'ban' },
        { team: 'dire', type: 'ban' },
        { team: 'dire', type: 'ban' },
        { team: 'radiant', type: 'ban' },
        { team: 'radiant', type: 'pick' },
        { team: 'dire', type: 'pick' },
        { team: 'radiant', type: 'ban' },
        { team: 'radiant', type: 'ban' },
        { team: 'dire', type: 'ban' },
        { team: 'dire', type: 'pick' },
        { team: 'radiant', type: 'pick' },
        { team: 'radiant', type: 'pick' },
        { team: 'dire', type: 'pick' },
        { team: 'dire', type: 'pick' },
        { team: 'radiant', type: 'pick' },
        { team: 'radiant', type: 'ban' },
        { team: 'dire', type: 'ban' },
        { team: 'dire', type: 'ban' },
        { team: 'radiant', type: 'ban' },
        { team: 'radiant', type: 'pick' },
        { team: 'dire', type: 'pick' }
    ];
}

export function getTeamPlayers(state, teamKey) {
    const team = state.teams[teamKey];
    return team.roles.map(r => team.players[r]);
}

export function getOpponentTeam(teamKey) {
    return teamKey === 'dire' ? 'radiant' : 'dire';
}

export function getAvailablePlayers(state, teamKey) {
    const all = getTeamPlayers(state, teamKey);
    const picked = state.gameState.pickedPlayers[teamKey] || [];
    return all.filter(p => !picked.includes(p));
}

export function getPickCandidates(state, teamKey) {
    const availablePlayers = getAvailablePlayers(state, teamKey);
    const poolSet = new Set();
    for (const p of availablePlayers) {
        const pool = state.gameState.pools[p] || [];
        for (const h of pool) {
            if (!state.gameState.usedHeroes.has(h)) {
                poolSet.add(h);
            }
        }
    }
    return Array.from(poolSet);
}

export function getBanCandidates(state, teamKey) {
    const opponent = getOpponentTeam(teamKey);
    const availableOpponents = getAvailablePlayers(state, opponent);
    const poolSet = new Set();
    for (const p of availableOpponents) {
        const pool = state.gameState.pools[p] || [];
        if (!pool) continue;
        for (const h of pool) {
            if (!state.gameState.usedHeroes.has(h)) {
                poolSet.add(h);
            }
        }
    }
    return Array.from(poolSet);
}

export function getPlayersWithHero(state, teamKey, hero) {
    const available = getAvailablePlayers(state, teamKey);
    const result = [];
    for (const p of available) {
        if (state.gameState.pools[p] && state.gameState.pools[p].includes(hero) && !state.gameState.usedHeroes.has(hero)) {
            result.push(p);
        }
    }
    return result;
}

export function getPlayerRole(state, teamKey, player) {
    const team = state.teams[teamKey];
    for (const role of team.roles) {
        if (team.players[role] === player) return role;
    }
    return null;
}

export function addBan(state, teamKey, hero) {
    const bans = state.gameState.bans[teamKey];
    const idx = bans.indexOf(null);
    if (idx === -1) return false;
    bans[idx] = hero;
    state.gameState.usedHeroes.add(hero);
    return true;
}

export function addPick(state, teamKey, role, hero, player) {
    if (!role) return false;
    const picks = state.gameState.picks[teamKey];
    if (picks[role] !== null) return false;
    picks[role] = { hero, player };
    state.gameState.usedHeroes.add(hero);
    if (state.gameState.pools[player]) {
        state.gameState.pools[player] = state.gameState.pools[player].filter(h => h !== hero);
    }
    if (!state.gameState.pickedPlayers[teamKey].includes(player)) {
        state.gameState.pickedPlayers[teamKey].push(player);
    }
    return true;
}