import { createDraftContainer, renderDraftUI, showDraftChoiceModal } from './ui/container.js';
import { initDraftState, initAutoDraftState } from './core/state.js';
import { startNewGame, botMakeMove, calculateGameResult } from './core/gameLogic.js';
import { ensureDataLoaded } from './data/heroData.js';
import { getDraftOrder } from './core/stateHelpers.js';
import { sleep } from '../utils/helpers.js';
import { DELAYS } from '../config/delays.js';

let draftResolve = null;
let currentDraftState = null;
let currentContainer = null;
let isFinished = false;

// ---- Ручной драфт с UI ----
export async function runDraft(teamA, teamB, bestOf = 3, options = {}) {
    const { showChoice = false } = options;
    
    if (showChoice) {
        const choice = await showDraftChoiceModal(teamA, teamB);
        if (choice === 'skip') {
            return autoDraftMatch(teamA, teamB, bestOf);
        }
    }
    
    await ensureDataLoaded();
    
    if (Math.random() < 0.5) {
        const temp = teamA;
        teamA = teamB;
        teamB = temp;
    }
    
    const state = initDraftState(teamA, teamB, bestOf);
    currentDraftState = state;
    const container = createDraftContainer();
    currentContainer = container;
    document.body.appendChild(container);
    
    container.dataset.teamA = teamA.name;
    container.dataset.teamB = teamB.name;
    
    renderDraftUI(state, container);
    startNewGame(state, container);
    isFinished = false;

    return new Promise((resolve) => {
        draftResolve = resolve;
        window._finishDraft = (result) => {
            if (!isFinished) {
                isFinished = true;
                showFinishButton(container, result, resolve);
            }
        };
    });
}

function showFinishButton(container, result, resolve) {
    let finishBlock = container.querySelector('.draft-finish-block');
    if (!finishBlock) {
        finishBlock = document.createElement('div');
        finishBlock.className = 'draft-finish-block';
        container.querySelector('.draft-container').appendChild(finishBlock);
    }
    
    const teamAName = container.dataset.teamA || 'Team A';
    const teamBName = container.dataset.teamB || 'Team B';
    const winnerName = result.winner.name;
    const score = result.score.join(' - ');
    
    finishBlock.style.display = 'block';
    finishBlock.innerHTML = `
        <div class="finish-content">
            <div class="finish-title">🏆 Серия завершена!</div>
            <div class="finish-result">
                <span class="winner">${winnerName}</span>
                <span class="score">${score}</span>
            </div>
            <button class="btn-finish-tournament">Вернуться к турниру</button>
        </div>
    `;
    
    const btn = finishBlock.querySelector('.btn-finish-tournament');
    btn.addEventListener('click', () => {
        if (currentContainer) {
            currentContainer.remove();
            currentContainer = null;
        }
        resolve(result);
        delete window._finishDraft;
    });
}

// ---- Автоматический драфт с ботами (без UI) ----
export async function autoDraftMatch(teamA, teamB, bestOf = 3) {
    await ensureDataLoaded();
    
    if (Math.random() < 0.5) {
        const temp = teamA;
        teamA = teamB;
        teamB = temp;
    }
    
    const winsNeeded = Math.ceil(bestOf / 2);
    let winsA = 0, winsB = 0;
    const games = [];
    const container = document.createElement('div');
    
    while (winsA < winsNeeded && winsB < winsNeeded) {
        const state = initAutoDraftState(teamA, teamB, 1);
        await runAutoDraft(state, container);
        const cardResult = calculateGameResult(state);
        if (cardResult.winner === 'dire') {
            winsA++;
        } else {
            winsB++;
        }
        const winnerName = cardResult.winner === 'dire' ? teamA.name : teamB.name;
        games.push({ winner: winnerName, score: `${winsA}-${winsB}` });
        await sleep(DELAYS.simulationCardDelay);
    }
    
    const winner = winsA > winsB ? teamA : teamB;
    return { winner, score: [winsA, winsB], games };
}

async function runAutoDraft(state, container) {
    if (!state.gameState) {
        console.error('runAutoDraft: state.gameState is null');
        return;
    }
    
    const DRAFT_ORDER = getDraftOrder();
    state.gameState.currentStep = -1;
    
    for (let i = 0; i < DRAFT_ORDER.length; i++) {
        const step = DRAFT_ORDER[i];
        const { team, type } = step;
        state.gameState.currentStep = i;
        botMakeMove(state, container, team, type);
        await sleep(DELAYS.draftBotStep);
    }
    
    state.gameState.isFinished = true;
}