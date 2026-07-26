import { getFilteredPlayers, getPlayerRating, STEP_ORDER, ROLE_LABELS } from './roleData.js';

export function initModal() {
    const modal = document.getElementById('modal-players');
    const closeBtn = document.getElementById('modal-close');
    const openBtn = document.getElementById('btn-view-players');

    function openModal() {
        const container = document.getElementById('modal-content');
        container.innerHTML = '';

        const tablesWrapper = document.createElement('div');
        tablesWrapper.className = 'players-table-wrapper';

        let hasAny = false;

        STEP_ORDER.forEach(role => {
            const players = getFilteredPlayers(role);
            if (players.length === 0) return;
            hasAny = true;

            const tableBlock = document.createElement('div');
            tableBlock.className = 'players-table-block';

            const title = document.createElement('h4');
            title.textContent = ROLE_LABELS[role];
            tableBlock.appendChild(title);

            const table = document.createElement('table');
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>#</th>
                        <th style="text-align:left;">Игрок</th>
                        <th style="text-align:right;">Рейтинг</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;

            const tbody = table.querySelector('tbody');
            players.forEach((name, index) => {
                const rating = getPlayerRating(name, role);
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td class="player-name">${name}</td>
                    <td class="player-rating">⭐${rating}</td>
                `;
                tbody.appendChild(tr);
            });

            tableBlock.appendChild(table);
            tablesWrapper.appendChild(tableBlock);
        });

        if (!hasAny) {
            container.innerHTML = '<p class="no-data">Нет игроков с рейтингом.</p>';
        } else {
            container.appendChild(tablesWrapper);
        }

        modal.classList.add('active');
    }

    openBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) modal.classList.remove('active');
    });
}