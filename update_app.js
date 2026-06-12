const fs = require('fs');
const file = 'c:\\\\Users\\\\bryal\\\\Desktop\\\\ESTEBAN\\\\frontend\\\\public\\\\js\\\\app.js';
let content = fs.readFileSync(file, 'utf8');

// Add page routing for CRM Kanban
const routingRegex = /else if \(page === 'clientes'\) renderClientes\(\);/;
const routingReplacement = `else if (page === 'clientes') renderClientes();
                  else if (page === 'crm-kanban') renderCRMKanban();`;
content = content.replace(routingRegex, routingReplacement);

// Add CRM Kanban Logic Functions at the end of the file
const crmKanbanLogic = `
            // ========== CRM KANBAN ==========
            const crmColumns = ['Nuevo Lead', 'Contactado', 'Cotización Enviada', 'Cliente Activo', 'Inactivo / Pausado'];

            function renderCRMKanban() {
                const board = document.getElementById('crm-kanban-board');
                if (!board) return;
                board.innerHTML = '';

                crmColumns.forEach(col => {
                    const colDiv = document.createElement('div');
                    colDiv.className = 'kanban-col';
                    
                    // Filter clients for this column
                    const colClients = clientes.filter(c => {
                        const estado = c.crm_estado || 'Nuevo Lead';
                        return estado === col;
                    });

                    colDiv.innerHTML = \`
                        <div class="kanban-header">
                            <div class="kanban-title">\${col}</div>
                            <span class="kanban-count">\${colClients.length}</span>
                        </div>
                        <div class="kanban-cards" ondragover="allowDropCRM(event)" ondrop="dropCRM(event, '\${col}')" style="min-height: 200px;">
                            \${colClients.map(c => \`
                                <div class="pedido-card" draggable="true" ondragstart="dragCRM(event, '\${c.id}')" style="cursor: grab; margin-bottom: 8px;">
                                    <div class="pedido-cliente" style="font-weight: 500;">\${c.nombre}</div>
                                    <div class="pedido-items" style="font-size: 11px; color: var(--text3);">📱 \${c.tel || 'Sin Tel'}</div>
                                    \${c.pedidos > 0 ? \`<div class="pedido-items" style="font-size: 11px; color:var(--green)">Pedidos: \${c.pedidos}</div>\` : ''}
                                    <div class="pedido-footer" style="margin-top: 6px;">
                                        <span class="canal-badge badge-gray" style="font-size: 10px; background: var(--bg4); padding: 2px 6px; border-radius: 4px;">\${c.canal || 'N/A'}</span>
                                    </div>
                                </div>
                            \`).join('')}
                        </div>
                    \`;
                    board.appendChild(colDiv);
                });
            }

            function allowDropCRM(ev) {
                ev.preventDefault();
            }

            function dragCRM(ev, id) {
                ev.dataTransfer.setData("text", id);
            }

            function dropCRM(ev, colName) {
                ev.preventDefault();
                const id = ev.dataTransfer.getData("text");
                const c = clientes.find(x => x.id === id);
                if (c && (c.crm_estado || 'Nuevo Lead') !== colName) {
                    c.crm_estado = colName;
                    save();
                    renderCRMKanban();
                }
            }
`;

const initRegex = /showPage\('dashboard'\);/;
if (content.match(initRegex)) {
    content = content.replace(initRegex, crmKanbanLogic + '\\n            showPage(\\'dashboard\\');');
} else {
    content = content + '\\n' + crmKanbanLogic;
}

fs.writeFileSync(file, content);
console.log('app.js updated successfully');
