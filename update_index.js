const fs = require('fs');
const file = 'c:\\\\Users\\\\bryal\\\\Desktop\\\\ESTEBAN\\\\frontend\\\\public\\\\index.html';
let content = fs.readFileSync(file, 'utf8');

// Add Sidebar link
const sidebarLinkRegex = /<div class="nav-label">Clientes<\/div>\s*<a class="nav-item" onclick="showPage\('clientes'\)">\s*<span class="nav-icon">👤<\/span> Clientes\s*<\/a>/;
const sidebarReplacement = `<div class="nav-label">Clientes</div>
                <a class="nav-item" onclick="showPage('clientes')">
                    <span class="nav-icon">👤</span> Clientes
                </a>
                <a class="nav-item" onclick="showPage('crm-kanban')" id="nav-crm-kanban">
                    <span class="nav-icon">📋</span> CRM Kanban
                </a>`;
content = content.replace(sidebarLinkRegex, sidebarReplacement);

// Add Kanban Page
const kanbanPageHtml = `
        <!-- =================== CRM KANBAN =================== -->
        <div id="page-crm-kanban" class="page">
            <div class="topbar">
                <div class="topbar-title">CRM Kanban de Clientes</div>
            </div>
            <div class="content">
                <div class="kanban" id="crm-kanban-board" style="grid-template-columns: repeat(5, 1fr);">
                    <!-- Kanban columns will be injected here -->
                </div>
            </div>
        </div>
`;

// Insert Kanban Page right before <!-- =================== CLIENTES =================== -->
const pageInsertionRegex = /<!-- =================== CLIENTES =================== -->/;
content = content.replace(pageInsertionRegex, kanbanPageHtml + '\n        <!-- =================== CLIENTES =================== -->');

fs.writeFileSync(file, content);
console.log('index.html updated successfully');
