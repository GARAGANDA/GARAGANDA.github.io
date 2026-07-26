import { getPlayerRole } from '../roleData.js';

let modalOverlay = null;
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let modalElement = null;

function createModal() {
    if (modalOverlay) return modalOverlay;
    modalOverlay = document.createElement('div');
    modalOverlay.id = 'teammates-modal';
    modalOverlay.className = 'modal-overlay';
    modalOverlay.style.display = 'none';
    modalOverlay.style.justifyContent = 'center';
    modalOverlay.style.alignItems = 'center';
    
    modalOverlay.innerHTML = `
        <div class="modal teammates-modal-content" id="teammates-modal-content">
            <button class="modal-close" id="teammates-close">&times;</button>
            <h2 id="teammates-title" style="cursor: grab; user-select: none;">Тиммейты</h2>
            <div id="teammates-content"></div>
        </div>
    `;
    
    document.body.appendChild(modalOverlay);

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeTeammatesModal();
    });
    document.getElementById('teammates-close').addEventListener('click', closeTeammatesModal);

    modalElement = document.getElementById('teammates-modal-content');
    const titleEl = document.getElementById('teammates-title');

    // ---- ПЕРЕТАСКИВАНИЕ ----
    titleEl.addEventListener('mousedown', (e) => {
        if (e.target === titleEl || e.target.closest('h2')) {
            isDragging = true;
            const rect = modalElement.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            modalElement.style.cursor = 'grabbing';
            titleEl.style.cursor = 'grabbing';
            modalElement.style.transition = 'none';
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const overlayRect = modalOverlay.getBoundingClientRect();
        let x = e.clientX - dragOffsetX;
        let y = e.clientY - dragOffsetY;
        // Ограничиваем, чтобы окно не выходило за пределы viewport
        const modalRect = modalElement.getBoundingClientRect();
        const maxX = window.innerWidth - modalRect.width;
        const maxY = window.innerHeight - modalRect.height;
        x = Math.max(0, Math.min(x, maxX));
        y = Math.max(0, Math.min(y, maxY));
        // Перемещаем окно, меняя его позицию внутри оверлея
        modalElement.style.position = 'fixed';
        modalElement.style.left = x + 'px';
        modalElement.style.top = y + 'px';
        modalElement.style.transform = 'none';
        modalElement.style.margin = '0';
        modalElement.style.bottom = '';
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            const titleEl = document.getElementById('teammates-title');
            if (titleEl) titleEl.style.cursor = 'grab';
            if (modalElement) {
                modalElement.style.cursor = '';
                modalElement.style.transition = '';
            }
        }
    });

    return modalOverlay;
}

export function openTeammatesModal(player, duoMap) {
    const overlay = createModal();
    const title = document.getElementById('teammates-title');
    const content = document.getElementById('teammates-content');
    title.textContent = `🤝 Тиммейты (${player})`;

    // ---- УСТАНАВЛИВАЕМ МОДАЛКУ ВНИЗУ ЭКРАНА (ПО ЦЕНТРУ) ----
    if (modalElement) {
        modalElement.style.position = 'fixed';
        modalElement.style.left = '50%';
        modalElement.style.top = '';
        modalElement.style.bottom = '30px';
        modalElement.style.transform = 'translateX(-50%)';
        modalElement.style.margin = '0';
        modalElement.style.width = 'auto';
        modalElement.style.maxWidth = '90vw';
    }

    const partners = [];
    for (const [key, data] of Object.entries(duoMap)) {
        const names = key.split(', ');
        if (names.includes(player)) {
            const partner = names[0] === player ? names[1] : names[0];
            partners.push({
                partner,
                total: data.total,
                wins: data.wins,
                losses: data.losses,
                winrate: data.winrate,
                role: getPlayerRole(partner)
            });
        }
    }
    partners.sort((a, b) => b.total - a.total);

    if (partners.length === 0) {
        content.innerHTML = `<p class="no-data">Нет данных о совместных играх.</p>`;
    } else {
        let html = `
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th style="text-align:left;">Игрок</th>
                        <th style="text-align:left;">Роль</th>
                        <th style="text-align:right;">Игр</th>
                        <th style="text-align:right;">Винрейт</th>
                    </tr>
                </thead>
                <tbody>
        `;
        partners.forEach((p, idx) => {
            const wr = (p.winrate * 100).toFixed(1);
            const color = p.winrate >= 0.5 ? '#e74c3c' : '#888';
            html += `
                <tr>
                    <td>${idx+1}</td>
                    <td class="player-name">${p.partner}</td>
                    <td class="role">${p.role}</td>
                    <td style="text-align:right;">${p.total}</td>
                    <td style="text-align:right; color:${color}; font-weight:600;">${wr}%</td>
                </tr>
            `;
        });
        html += `</tbody></table>`;
        content.innerHTML = html;
    }

    overlay.style.display = 'flex';
}

export function closeTeammatesModal() {
    if (modalOverlay) modalOverlay.style.display = 'none';
    // Сбрасываем позиционирование, чтобы при следующем открытии применить настройки из open
    if (modalElement) {
        modalElement.style.position = '';
        modalElement.style.left = '';
        modalElement.style.top = '';
        modalElement.style.bottom = '';
        modalElement.style.transform = '';
        modalElement.style.margin = '';
        modalElement.style.width = '';
        modalElement.style.maxWidth = '';
    }
}