import { getFilteredPlayers, STEP_ORDER } from '../roleData.js';
import { calculateSynergyBonus, findInMap } from '../synergyCalculator.js';

function getPlayerRating(player, roleKey, ratings) {
    if (ratings[roleKey] && ratings[roleKey][player] !== undefined) {
        return ratings[roleKey][player];
    }
    return 0;
}

function createUserTeam(userPlayers, userRoleKeys, ratings, duoMap) {
    const userSynergyResult = calculateSynergyBonus(userPlayers, duoMap);
    const userSynergy = userSynergyResult.totalBonus;
    let userAvgRating = 0;
    userPlayers.forEach((p, idx) => {
        const role = userRoleKeys[idx];
        const rating = getPlayerRating(p, role, ratings);
        userAvgRating += rating;
    });
    userAvgRating /= 5;
    const userTotal = userAvgRating + userSynergy;

    return {
        players: userPlayers,
        roleKeys: userRoleKeys,
        name: '322 Team',
        isUser: true,
        synergy: userSynergy,
        avgRating: userAvgRating,
        bonus: userSynergy,
        totalRating: userTotal,
        points: 0,
        wins: 0,
        losses: 0,
        opponents: [],
        matches: [],
        roundResults: []
    };
}

function generateSingleRandomTeam(rolePools, ratings, duoMap, usedNames, usedPlayers, realTeamNames) {
    const roleKeys = ['carry', 'mid', 'offlane', 'semi-support', 'full-support'];
    const teamPlayers = [];
    const teamRoleKeys = [];
    const usedInTeam = new Set();

    for (const role of roleKeys) {
        const available = rolePools[role].filter(p => !usedPlayers.has(p) && !usedInTeam.has(p));
        if (available.length === 0) return null;

        let bestPlayer = available[0];
        let bestScore = -999;
        for (const cand of available) {
            let synergyScore = 0;
            for (const existing of teamPlayers) {
                const duoData = findInMap(duoMap, [existing, cand]);
                if (duoData) synergyScore += (duoData.winrate - 0.5) * 2;
            }
            const rating = getPlayerRating(cand, role, ratings);
            synergyScore += rating / 100;
            if (synergyScore > bestScore) {
                bestScore = synergyScore;
                bestPlayer = cand;
            }
        }
        teamPlayers.push(bestPlayer);
        teamRoleKeys.push(role);
        usedInTeam.add(bestPlayer);
        usedPlayers.add(bestPlayer);
    }

    let avgRating = 0;
    teamPlayers.forEach((p, idx) => {
        const role = teamRoleKeys[idx];
        const rating = getPlayerRating(p, role, ratings);
        avgRating += rating;
    });
    avgRating /= 5;
    const synergyResult = calculateSynergyBonus(teamPlayers, duoMap);
    const bonus = synergyResult.totalBonus;
    const totalRating = avgRating + bonus;

    let name;
    if (Array.isArray(realTeamNames) && realTeamNames.length > 0) {
        name = realTeamNames.shift();
        if (usedNames.has(name)) {
            const available = realTeamNames.find(n => !usedNames.has(n));
            name = available || `Team ${Math.floor(Math.random() * 10000)}`;
        }
        usedNames.add(name);
    } else {
        const baseNames = ['OG', 'Vici Gaming', 'BetBoom Team', 'Yakult Brothers', 'Evil Geniuses', 'Team Random'];
        let fallback = `Team ${Math.floor(Math.random() * 1000)}`;
        for (const n of baseNames) {
            if (!usedNames.has(n)) {
                fallback = n;
                break;
            }
        }
        name = fallback;
        usedNames.add(name);
    }

    return {
        players: teamPlayers,
        roleKeys: teamRoleKeys,
        name: name,
        isUser: false,
        synergy: bonus,
        avgRating: avgRating,
        bonus: bonus,
        totalRating: totalRating,
        points: 0,
        wins: 0,
        losses: 0,
        opponents: [],
        matches: [],
        roundResults: []
    };
}

function generateTeamFromReal(realTeam, rolePools, ratings, duoMap, usedNames, usedPlayers, realTeamNames) {
    const roleKeys = ['carry', 'mid', 'offlane', 'semi-support', 'full-support'];
    const teamPlayers = [];
    const teamRoleKeys = [];
    const usedInTeam = new Set();
    const originalPlayers = realTeam.players;

    for (let i = 0; i < roleKeys.length; i++) {
        const role = roleKeys[i];
        const original = originalPlayers[i]?.trim();

        const isOriginalAvailable = original && rolePools[role].includes(original) && !usedPlayers.has(original);

        let selectedPlayer = null;
        if (isOriginalAvailable) {
            selectedPlayer = original;
        } else {
            const candidates = rolePools[role].filter(p => !usedPlayers.has(p) && !usedInTeam.has(p));
            if (candidates.length === 0) return null;
            let bestCandidate = candidates[0];
            let bestScore = -999;
            for (const cand of candidates) {
                let synergyScore = 0;
                for (const existing of teamPlayers) {
                    const duoData = findInMap(duoMap, [existing, cand]);
                    if (duoData) synergyScore += (duoData.winrate - 0.5) * 2;
                }
                const rating = getPlayerRating(cand, role, ratings);
                synergyScore += rating / 100;
                if (synergyScore > bestScore) {
                    bestScore = synergyScore;
                    bestCandidate = cand;
                }
            }
            selectedPlayer = bestCandidate;
        }

        if (!selectedPlayer) return null;

        teamPlayers.push(selectedPlayer);
        teamRoleKeys.push(role);
        usedInTeam.add(selectedPlayer);
        usedPlayers.add(selectedPlayer);
    }

    let matchCount = 0;
    for (let i = 0; i < teamPlayers.length; i++) {
        if (teamPlayers[i] === originalPlayers[i]?.trim()) {
            matchCount++;
        }
    }

    let teamName;
    if (matchCount >= 3) {
        teamName = realTeam.name;
        if (usedNames.has(teamName)) {
            if (Array.isArray(realTeamNames) && realTeamNames.length > 0) {
                const available = realTeamNames.find(n => !usedNames.has(n));
                if (available) {
                    teamName = available;
                    const idx = realTeamNames.indexOf(available);
                    if (idx !== -1) realTeamNames.splice(idx, 1);
                } else {
                    teamName = `Team ${Math.floor(Math.random() * 10000)}`;
                }
            } else {
                teamName = `Team ${Math.floor(Math.random() * 10000)}`;
            }
        }
    } else {
        if (Array.isArray(realTeamNames) && realTeamNames.length > 0) {
            const available = realTeamNames.find(n => !usedNames.has(n));
            if (available) {
                teamName = available;
                const idx = realTeamNames.indexOf(available);
                if (idx !== -1) realTeamNames.splice(idx, 1);
            } else {
                const prefixes = ['Team', 'Gang', 'Squad', 'Crew', 'Legion', 'Empire', 'Nova', 'Apex', 'Fury', 'Rage'];
                const suffixes = ['Stars', 'Warriors', 'Titans', 'Giants', 'Kings', 'Dragons', 'Phoenix', 'Vikings', 'Raptors', 'Wolves'];
                let name;
                let attempts = 0;
                do {
                    const pref = prefixes[Math.floor(Math.random() * prefixes.length)];
                    const suff = suffixes[Math.floor(Math.random() * suffixes.length)];
                    name = `${pref} ${suff}`;
                    attempts++;
                    if (attempts > 50) {
                        name = `Team ${Math.floor(Math.random() * 10000)}`;
                        break;
                    }
                } while (usedNames.has(name));
                teamName = name;
            }
        } else {
            const prefixes = ['Team', 'Gang', 'Squad', 'Crew', 'Legion', 'Empire', 'Nova', 'Apex', 'Fury', 'Rage'];
            const suffixes = ['Stars', 'Warriors', 'Titans', 'Giants', 'Kings', 'Dragons', 'Phoenix', 'Vikings', 'Raptors', 'Wolves'];
            let name;
            let attempts = 0;
            do {
                const pref = prefixes[Math.floor(Math.random() * prefixes.length)];
                const suff = suffixes[Math.floor(Math.random() * suffixes.length)];
                name = `${pref} ${suff}`;
                attempts++;
                if (attempts > 50) {
                    name = `Team ${Math.floor(Math.random() * 10000)}`;
                    break;
                }
            } while (usedNames.has(name));
            teamName = name;
        }
    }
    usedNames.add(teamName);

    let avgRating = 0;
    teamPlayers.forEach((p, idx) => {
        const role = teamRoleKeys[idx];
        const rating = getPlayerRating(p, role, ratings);
        avgRating += rating;
    });
    avgRating /= 5;
    const synergyResult = calculateSynergyBonus(teamPlayers, duoMap);
    const bonus = synergyResult.totalBonus;
    const totalRating = avgRating + bonus;

    return {
        players: teamPlayers,
        roleKeys: teamRoleKeys,
        name: teamName,
        isUser: false,
        synergy: bonus,
        avgRating: avgRating,
        bonus: bonus,
        totalRating: totalRating,
        points: 0,
        wins: 0,
        losses: 0,
        opponents: [],
        matches: [],
        roundResults: []
    };
}

export function generateSynergyTeams(
    userPlayers,
    userRoleKeys,
    ratings,
    duoMap,
    numTeams = 15,
    realTeams = {},
    realTeamNames = null
) {
    const roleKeys = ['carry', 'mid', 'offlane', 'semi-support', 'full-support'];
    const userSet = new Set(userPlayers);

    const rolePools = {};
    roleKeys.forEach(role => {
        const allPlayers = getFilteredPlayers(role);
        rolePools[role] = allPlayers.filter(p => !userSet.has(p));
        rolePools[role].sort((a, b) => {
            const ra = getPlayerRating(a, role, ratings);
            const rb = getPlayerRating(b, role, ratings);
            return rb - ra;
        });
    });

    const usedPlayers = new Set(userPlayers);
    const usedNames = new Set();

    let availableNames = Array.isArray(realTeamNames) ? [...realTeamNames] : Object.keys(realTeams);
    availableNames = availableNames.sort(() => Math.random() - 0.5);

    const userTeam = createUserTeam(userPlayers, userRoleKeys, ratings, duoMap);

    const generatedTeams = [];

    if (Object.keys(realTeams).length > 0) {
        const realTeamsArray = Object.entries(realTeams).map(([name, players]) => ({
            name,
            players: players.map(p => p.trim())
        }));
        const shuffledReal = realTeamsArray.sort(() => Math.random() - 0.5);
        const teamsToGenerate = Math.min(numTeams, shuffledReal.length);

        for (let i = 0; i < teamsToGenerate; i++) {
            const realTeam = shuffledReal[i];
            const team = generateTeamFromReal(realTeam, rolePools, ratings, duoMap, usedNames, usedPlayers, availableNames);
            if (team) {
                generatedTeams.push(team);
            }
        }
    }

    while (generatedTeams.length < numTeams) {
        const randomTeam = generateSingleRandomTeam(rolePools, ratings, duoMap, usedNames, usedPlayers, availableNames);
        if (randomTeam) {
            generatedTeams.push(randomTeam);
        } else {
            break;
        }
    }

    const allTeams = [userTeam, ...generatedTeams];
    allTeams.sort((a, b) => {
        if (a.isUser) return -1;
        if (b.isUser) return 1;
        return b.totalRating - a.totalRating;
    });
    return allTeams;
}