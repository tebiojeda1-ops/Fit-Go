// ================= DATA STORE =================
const STORAGE_KEY = 'fitngo_crm_data';

// Default Seed Data
const defaultData = {
    clients: [
        {
            id: 'C-001',
            name: 'Juan Pérez',
            phone: '529991234567',
            instagram: '@juanperez',
            source: 'WhatsApp',
            state: 'Cliente Recurrente',
            type: 'Menú Regular',
            tags: ['Efectivo', 'Pickup'],
            followUp: { nextContactDate: getTodayDate(), freq: 'lunes', doNotContactUntil: '' },
            sales: { totalOrders: 5, totalSpent: 2500, averageTicket: 500, lastPurchaseDate: getTodayDate() },
            history: [],
            orders: []
        },
        {
            id: 'C-002',
            name: 'María Gómez',
            phone: '529997654321',
            instagram: '@mariag',
            source: 'Instagram',
            state: 'Cotización Enviada',
            type: 'Personalizado',
            tags: ['Quiere bajar grasa'],
            followUp: { nextContactDate: getTodayDate(-1), freq: 'solo-escribe', doNotContactUntil: '' },
            sales: { totalOrders: 0, totalSpent: 0, averageTicket: 0, lastPurchaseDate: '' },
            history: [],
            orders: []
        },
        {
            id: 'C-003',
            name: 'Carlos Ruiz (Viaje)',
            phone: '529998887777',
            instagram: '',
            source: 'Facebook',
            state: 'Viaje',
            type: 'Menú Regular',
            tags: ['Domicilio'],
            followUp: { nextContactDate: '', freq: 'lunes', doNotContactUntil: getTodayDate(5) }, // Returns in 5 days
            sales: { totalOrders: 2, totalSpent: 1200, averageTicket: 600, lastPurchaseDate: getTodayDate(-20) },
            history: [],
            orders: []
        }
    ]
};

// Initialize Data
let crmData = JSON.parse(localStorage.getItem(STORAGE_KEY));
if (!crmData) {
    crmData = defaultData;
    saveData();
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(crmData));
}

// Helpers
function getTodayDate(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
}

function generateId() {
    return 'C-' + Math.random().toString(36).substr(2, 6).toUpperCase();
}


// ================= AUTOMATIONS & RULES =================
function runAutomations() {
    const today = getTodayDate();
    let updated = false;

    crmData.clients.forEach(c => {
        // Rule 1: Reset "Viaje" if DoNotContactUntil is past or today
        if (c.followUp.doNotContactUntil && c.followUp.doNotContactUntil <= today) {
            c.followUp.doNotContactUntil = '';
            if (c.state === 'Viaje' || c.state === 'Pausa Temporal') {
                c.state = 'Cliente Activo';
            }
            updated = true;
        }

        // Rule 2: Inactivity Check
        if (c.sales.lastPurchaseDate) {
            const diffTime = Math.abs(new Date(today) - new Date(c.sales.lastPurchaseDate));
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays >= 60 && c.state !== 'Perdido') {
                c.state = 'Perdido';
                updated = true;
            } else if (diffDays >= 30 && diffDays < 60 && !c.state.includes('30')) {
                // custom state just for logic, normally kept in UI logic, but let's just use tags or state
                // Actually user requested "Mover a: Reactivación 30 días" but we don't have that in the official dropdown.
                // We'll just leave it and detect it dynamically via the segmentation tool.
            }
        }
    });

    if (updated) saveData();
}


// ================= UI NAVIGATION =================
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        // Remove active class
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));

        // Set active class
        e.currentTarget.classList.add('active');
        const target = e.currentTarget.getAttribute('data-target');
        document.getElementById(target).classList.add('active');

        // Update Title
        document.getElementById('top-title').innerText = e.currentTarget.innerText.trim();

        // Refresh views
        if (target === 'dashboard') renderDashboard();
        if (target === 'clients') renderClientsTable();
        if (target === 'kanban') renderKanban();
    });
});


// ================= DASHBOARD & CHARTS =================
let sourceChartInstance = null;

function renderDashboard() {
    const clients = crmData.clients;
    
    // KPIs
    const prospects = clients.filter(c => c.state.includes('Lead') || c.state.includes('Cotización') || c.state.includes('Información')).length;
    const active = clients.filter(c => c.state.includes('Activo') || c.state.includes('Primer Pedido')).length;
    const recurrent = clients.filter(c => c.state.includes('Recurrente')).length;
    
    // Estimate sales: Sum of last purchases if active? Let's just sum all sales for simplicity as a mockup
    const sales = clients.reduce((acc, c) => acc + (c.sales.totalSpent || 0), 0);

    document.getElementById('kpi-prospects').innerText = prospects;
    document.getElementById('kpi-active').innerText = active;
    document.getElementById('kpi-recurrent').innerText = recurrent;
    document.getElementById('kpi-sales').innerText = `$${sales}`;

    // Tareas de Hoy (Tasks)
    const today = getTodayDate();
    const tasksDiv = document.getElementById('today-tasks');
    tasksDiv.innerHTML = '';

    const dueClients = clients.filter(c => {
        if (c.followUp.doNotContactUntil && c.followUp.doNotContactUntil > today) return false;
        return c.followUp.nextContactDate && c.followUp.nextContactDate <= today;
    });

    if (dueClients.length === 0) {
        tasksDiv.innerHTML = '<p style="color:var(--text-secondary);font-size:0.9rem">No hay tareas pendientes para hoy.</p>';
    }

    dueClients.forEach(c => {
        const isOverdue = c.followUp.nextContactDate < today;
        const taskHtml = `
            <div class="task-item ${isOverdue ? 'overdue' : ''}">
                <div class="task-info">
                    <span class="task-name">${c.name} ${c.sales.totalOrders > 3 ? '🌟' : ''}</span>
                    <span class="task-desc">Estado: ${c.state} | Tel: ${c.phone}</span>
                </div>
                <button class="btn btn-secondary" style="font-size:0.75rem" onclick="openClientModal('${c.id}')">Ver</button>
            </div>
        `;
        tasksDiv.innerHTML += taskHtml;
    });

    // Chart.js
    const sources = {};
    clients.forEach(c => {
        sources[c.source] = (sources[c.source] || 0) + 1;
    });

    const ctx = document.getElementById('sourceChart').getContext('2d');
    if (sourceChartInstance) sourceChartInstance.destroy();
    
    sourceChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(sources),
            datasets: [{
                data: Object.values(sources),
                backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#6b7280'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'right', labels: { color: '#f0f2f5' } }
            }
        }
    });
}


// ================= CLIENTS DATABASE =================
function renderClientsTable() {
    const tbody = document.getElementById('clients-table-body');
    tbody.innerHTML = '';
    const filter = document.getElementById('client-filter').value;

    let filtered = crmData.clients;
    if (filter === 'prospect') filtered = filtered.filter(c => c.state.includes('Cotización') || c.state.includes('Lead'));
    if (filter === 'active') filtered = filtered.filter(c => c.state.includes('Activo') || c.state.includes('Recurrente'));
    if (filter === 'inactive') filtered = filtered.filter(c => c.state === 'Viaje' || c.state === 'Pausa Temporal' || c.state === 'Perdido');

    filtered.forEach(c => {
        let badgeClass = 'badge-gray';
        if (c.state.includes('Activo') || c.state.includes('Recurrente')) badgeClass = 'badge-green';
        if (c.state.includes('Lead') || c.state.includes('Cotización')) badgeClass = 'badge-blue';
        if (c.state === 'Viaje' || c.state === 'Pausa Temporal') badgeClass = 'badge-yellow';
        if (c.state === 'Perdido') badgeClass = 'badge-red';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div style="font-weight:500">${c.name} ${c.sales.totalOrders > 3 ? '🌟' : ''}</div>
                <div style="font-size:0.75rem; color:var(--text-secondary)">ID: ${c.id}</div>
            </td>
            <td>
                <div>📱 ${c.phone}</div>
                ${c.instagram ? `<div style="font-size:0.8rem">IG: ${c.instagram}</div>` : ''}
            </td>
            <td><span class="badge ${badgeClass}">${c.state}</span></td>
            <td>${c.type}</td>
            <td>${c.followUp.doNotContactUntil ? `🚫 Pausa hasta ${c.followUp.doNotContactUntil}` : (c.followUp.nextContactDate || 'No programado')}</td>
            <td>
                <button class="btn btn-secondary" style="padding:4px 8px" onclick="openClientModal('${c.id}')">✏️ Editar</button>
                <button class="btn btn-primary" style="padding:4px 8px" onclick="openSaleModal('${c.id}')">💳 Venta</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

document.getElementById('client-filter').addEventListener('change', renderClientsTable);


// ================= MODALS & CRUD =================
function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

function openClientModal(id = null) {
    document.getElementById('client-form').reset();
    document.getElementById('client-id').value = '';
    document.getElementById('modal-title').innerText = 'Nuevo Cliente';

    if (id) {
        const c = crmData.clients.find(x => x.id === id);
        if (c) {
            document.getElementById('modal-title').innerText = 'Editar Cliente';
            document.getElementById('client-id').value = c.id;
            document.getElementById('client-name').value = c.name;
            document.getElementById('client-phone').value = c.phone;
            document.getElementById('client-ig').value = c.instagram;
            document.getElementById('client-source').value = c.source;
            document.getElementById('client-state').value = c.state;
            document.getElementById('client-type').value = c.type;
            document.getElementById('client-freq').value = c.followUp.freq;
            document.getElementById('client-pause-date').value = c.followUp.doNotContactUntil;
            document.getElementById('client-tags').value = c.tags.join(', ');
            // notes could be added if structured
        }
    }

    document.getElementById('client-modal').classList.add('active');
}

function saveClient() {
    const id = document.getElementById('client-id').value;
    const name = document.getElementById('client-name').value;
    if (!name) return alert("El nombre es requerido");

    const tagsRaw = document.getElementById('client-tags').value;
    const tags = tagsRaw.split(',').map(t => t.trim()).filter(t => t);

    const clientData = {
        name,
        phone: document.getElementById('client-phone').value,
        instagram: document.getElementById('client-ig').value,
        source: document.getElementById('client-source').value,
        state: document.getElementById('client-state').value,
        type: document.getElementById('client-type').value,
        tags: tags,
        followUp: {
            freq: document.getElementById('client-freq').value,
            doNotContactUntil: document.getElementById('client-pause-date').value,
            nextContactDate: getTodayDate() // Simplification
        }
    };

    if (id) {
        // Update
        const index = crmData.clients.findIndex(c => c.id === id);
        if (index > -1) {
            crmData.clients[index] = { ...crmData.clients[index], ...clientData, followUp: { ...crmData.clients[index].followUp, ...clientData.followUp } };
        }
    } else {
        // Create
        clientData.id = generateId();
        clientData.firstContactDate = getTodayDate();
        clientData.sales = { totalOrders: 0, totalSpent: 0, averageTicket: 0, lastPurchaseDate: '' };
        clientData.history = [];
        clientData.orders = [];
        crmData.clients.push(clientData);
    }

    saveData();
    closeModal('client-modal');
    renderClientsTable();
    renderDashboard();
    renderKanban();
}

function openSaleModal(clientId) {
    document.getElementById('sale-form').reset();
    document.getElementById('sale-client-id').value = clientId;
    document.getElementById('sale-date').value = getTodayDate();
    document.getElementById('sale-modal').classList.add('active');
}

function saveSale() {
    const id = document.getElementById('sale-client-id').value;
    const amount = parseFloat(document.getElementById('sale-amount').value);
    const meals = parseInt(document.getElementById('sale-meals').value);
    const date = document.getElementById('sale-date').value;

    if (!amount || !meals) return alert("Completar campos de venta");

    const c = crmData.clients.find(x => x.id === id);
    if (c) {
        c.orders.push({ date, amount, meals });
        c.sales.totalOrders++;
        c.sales.totalSpent += amount;
        c.sales.averageTicket = Math.round(c.sales.totalSpent / c.sales.totalOrders);
        c.sales.lastPurchaseDate = date;
        
        // Auto-update state if first purchase
        if (c.sales.totalOrders === 1 && c.state.includes('Cotización')) {
            c.state = 'Primer Pedido';
        } else if (c.sales.totalOrders > 1 && !c.state.includes('Recurrente')) {
            c.state = 'Cliente Recurrente';
        }
        
        saveData();
    }
    
    closeModal('sale-modal');
    renderClientsTable();
    renderDashboard();
}


// ================= KANBAN PIPELINE =================
const pipelineColumns = [
    'Nuevo Lead', 'Solicitó Información', 'Cotización Enviada', 
    'Primer Pedido', 'Cliente Activo', 'Cliente Recurrente', 'Viaje', 'Perdido'
];

function renderKanban() {
    const board = document.getElementById('kanban-board');
    board.innerHTML = '';

    pipelineColumns.forEach(colName => {
        const colDiv = document.createElement('div');
        colDiv.className = 'kanban-col';
        colDiv.dataset.state = colName;

        const clientsInCol = crmData.clients.filter(c => c.state === colName);

        colDiv.innerHTML = `
            <div class="kanban-header">
                ${colName}
                <span class="kanban-count">${clientsInCol.length}</span>
            </div>
            <div class="kanban-cards" ondragover="allowDrop(event)" ondrop="drop(event, '${colName}')">
                ${clientsInCol.map(c => `
                    <div class="kanban-card" draggable="true" ondragstart="drag(event, '${c.id}')" onclick="openClientModal('${c.id}')">
                        <div class="k-card-title">
                            ${c.name}
                            ${c.sales.totalOrders > 3 ? '<span class="k-card-vip">🌟 VIP</span>' : ''}
                        </div>
                        <div class="k-card-meta">
                            <span>📱 ${c.phone}</span>
                            <span>${c.tags.slice(0, 2).map(t => `<span style="background:var(--bg-secondary);padding:2px 4px;border-radius:4px;font-size:0.7rem">${t}</span>`).join(' ')}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        board.appendChild(colDiv);
    });
}

function allowDrop(ev) {
    ev.preventDefault();
}

function drag(ev, id) {
    ev.dataTransfer.setData("text", id);
}

function drop(ev, newState) {
    ev.preventDefault();
    const id = ev.dataTransfer.getData("text");
    const c = crmData.clients.find(x => x.id === id);
    if (c && c.state !== newState) {
        c.state = newState;
        saveData();
        renderKanban();
        renderClientsTable();
        renderDashboard();
    }
}


// ================= SALES & CAMPAIGNS =================
function generateSegment(type) {
    const today = new Date(getTodayDate());
    let filtered = [];
    let title = "";

    switch(type) {
        case 'no-purchase':
            filtered = crmData.clients.filter(c => c.sales.totalOrders === 0 && !c.state.includes('Nuevo'));
            title = "Cotizaron pero no compraron";
            break;
        case 'dropped':
            filtered = crmData.clients.filter(c => {
                if(c.sales.lastPurchaseDate) {
                    const diffDays = Math.ceil(Math.abs(today - new Date(c.sales.lastPurchaseDate)) / (1000 * 60 * 60 * 24));
                    return diffDays >= 14 && diffDays < 60;
                }
                return false;
            });
            title = "Dejaron de comprar (14-60 días)";
            break;
        case 'returning':
            filtered = crmData.clients.filter(c => {
                if(c.followUp.doNotContactUntil) {
                    const diffDays = Math.ceil((new Date(c.followUp.doNotContactUntil) - today) / (1000 * 60 * 60 * 24));
                    return diffDays >= 0 && diffDays <= 7;
                }
                return false;
            });
            title = "Regresan de viaje esta semana";
            break;
        case 'high-ticket':
            filtered = crmData.clients.filter(c => c.sales.averageTicket > 500 || c.sales.totalOrders >= 4);
            title = "Clientes VIP (Alto Valor)";
            break;
        case 'lost':
            filtered = crmData.clients.filter(c => {
                if(c.sales.lastPurchaseDate) {
                    const diffDays = Math.ceil(Math.abs(today - new Date(c.sales.lastPurchaseDate)) / (1000 * 60 * 60 * 24));
                    return diffDays >= 60;
                }
                return false;
            });
            title = "Perdidos (+60 días)";
            break;
    }

    document.getElementById('segment-title').innerText = `${title} (${filtered.length})`;
    const tbody = document.getElementById('segment-table-body');
    tbody.innerHTML = '';

    filtered.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${c.name}</td>
            <td>${c.phone}</td>
            <td>${c.sales.lastPurchaseDate || 'N/A'}</td>
            <td>
                <a href="https://wa.me/${c.phone}" target="_blank" class="btn btn-primary" style="padding:4px 8px; font-size:0.75rem; text-decoration:none">💬 WhatsApp</a>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('segment-results').style.display = 'block';
}

function closeSegment() {
    document.getElementById('segment-results').style.display = 'none';
}


// ================= GLOBAL SEARCH =================
document.getElementById('global-search').addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    
    // Switch to clients view if not there
    if (!document.getElementById('clients').classList.contains('active') && val.length > 0) {
        document.querySelector('[data-target="clients"]').click();
    }

    const tbody = document.getElementById('clients-table-body');
    const rows = tbody.getElementsByTagName('tr');

    for (let i = 0; i < rows.length; i++) {
        const text = rows[i].innerText.toLowerCase();
        rows[i].style.display = text.includes(val) ? '' : 'none';
    }
});


// ================= INIT =================
runAutomations();
renderDashboard();
renderClientsTable();
renderKanban();
