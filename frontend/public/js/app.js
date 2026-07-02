
            // ========== DATA STORE ==========

            // 1. Credenciales oficiales de Firebase
            const firebaseConfig = {
                apiKey: "AIzaSyD5aW_pK7hVKB1KLIxCr85icC_XoGU8LKY",
                authDomain: "fitngo-erp.firebaseapp.com",
                databaseURL: "https://fitngo-erp-default-rtdb.firebaseio.com",
                projectId: "fitngo-erp",
                storageBucket: "fitngo-erp.firebasestorage.app",
                messagingSenderId: "23388559097",
                appId: "1:23388559097:web:b67deb6cb5d4271ae93428",
                measurementId: "G-NTNYS48QZ2"
            };

            // 2. Inicialización segura
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            const database = firebase.database();

            // CONTROL DE SEGURIDAD ABSOLUTO
            let inicializadoFirebase = false; // FRENO DE MANO: Nadie sube nada hasta que la nube responda primero
            let t_upload = null;
            let cambiosPendientes = {};
            let estoyEscribiendo = false;

            // 3. Objeto DB Inteligente Anti-Borrados
            const DB = {
                get: k => {
                    try { return JSON.parse(localStorage.getItem('fitgo_' + k) || 'null'); }
                    catch (e) { return null; }
                },
                set: (k, v) => {
                    // Guardado local inmediato para que la app responda al instante en pantalla
                    localStorage.setItem('fitgo_' + k, JSON.stringify(v));

                    // 🛑 BLOQUEO CRÍTICO: Si Firebase no ha terminado de descargar los datos reales de la nube,
                    // se prohíbe rotundamente subir información para evitar sobreescribir o borrar la base de datos.
                    if (!inicializadoFirebase) return;

                    cambiosPendientes[k] = v;

                    // Agrupamos todas las variables en un solo paquete unificado
                    clearTimeout(t_upload);
                    t_upload = setTimeout(() => {
                        estoyEscribiendo = true; // Bloqueo temporal de eco

                        database.ref('fitgo_erp').update(cambiosPendientes, (error) => {
                            cambiosPendientes = {};
                            // Esperamos medio segundo antes de liberar el canal para limpiar residuos de red
                            setTimeout(() => { estoyEscribiendo = false; }, 500);
                        });
                    }, 250); // Tiempo de espera estratégico para acumular el lote de guardado
                }
            };

            // 4. Sincronizador en Tiempo Real Protegido
            function sincronizarDesdeLaNube() {
                database.ref('fitgo_erp').on('value', (snapshot) => {
                    // Si este mismo dispositivo está realizando una escritura voluntaria, ignoramos el reflejo
                    if (estoyEscribiendo) return;

                    const datosNube = snapshot.val();

                    if (datosNube) {
                        // Replicamos la base de datos de la nube en el almacenamiento local de este dispositivo
                        Object.keys(datosNube).forEach(k => {
                            localStorage.setItem('fitgo_' + k, JSON.stringify(datosNube[k]));
                        });

                        // Actualizamos las variables vivas en la memoria del ERP
                        try {
                            if (datosNube.gastos) gastos = datosNube.gastos;
                            if (datosNube.pedidos) pedidos = datosNube.pedidos;
                            if (datosNube.menu) menu = datosNube.menu;
                            if (datosNube.dietas) dietas = datosNube.dietas;
                            if (datosNube.inventario) inventario = datosNube.inventario;
                            if (datosNube.proveedores) proveedores = datosNube.proveedores;
                            if (datosNube.cxp) cxp = datosNube.cxp;
                            if (datosNube.cxc) cxc = datosNube.cxc;
                            if (datosNube.compras) compras = datosNube.compras;
                            if (datosNube.presentaciones) presentaciones = datosNube.presentaciones;
                            if (datosNube.clientes) clientes = datosNube.clientes;
                            if (datosNube.movCaja) movCaja = datosNube.movCaja;
                            if (datosNube.usuarios) usuarios = datosNube.usuarios;
                            if (datosNube.preparados) preparados = datosNube.preparados;
                            if (datosNube.historialProd) historialProd = datosNube.historialProd;
                            if (datosNube.categoriasInsumos) categoriasInsumos = datosNube.categoriasInsumos;
                            if (datosNube.categoriasMenu) categoriasMenu = datosNube.categoriasMenu;
                            if (datosNube.cajaEstado) DB.set('cajaEstado', datosNube.cajaEstado);
                            if (datosNube.historialEliminaciones) historialEliminaciones = datosNube.historialEliminaciones;
                        } catch (e) {
                            console.log("Sincronizando flujo de datos...");
                        }

                        // ¡Freno liberado con éxito! La nube ya se descargó. Se permiten modificaciones futuras.
                        inicializadoFirebase = true;

                        // Redibujamos la pestaña actual en la pantalla del usuario
                        const paginaActivaEl = document.querySelector('.page.active');
                        if (paginaActivaEl) {
                            const paginaActiva = paginaActivaEl.id.replace('page-', '');
                            if (typeof renderPage === 'function') {
                                renderPage(paginaActiva);
                            }
                        }
                    } else {
                        // RECOBRAR DATOS / INICIALIZACIÓN SEGURO
                        // Si la nube está totalmente vacía, verificamos si este dispositivo tiene historial local previo
                        const tieneDatosLocales = localStorage.getItem('fitgo_clientes');

                        if (!inicializadoFirebase) {
                            inicializadoFirebase = true;
                            // Solo si el dispositivo NO es nuevo, sube su información para restaurar o inicializar la nube
                            if (tieneDatosLocales && typeof save === "function") {
                                save();
                            }
                        }
                    }
                });
            }

            // Iniciar la escucha en tiempo real inmediatamente al cargar la página
            sincronizarDesdeLaNube();

            let gastos = DB.get('gastos') || [];
            let pedidos = DB.get('pedidos') || [];
            let menu = DB.get('menu') || [];
            let dietas = DB.get('dietas') || [];
            let inventario = DB.get('inventario') || [];
            let proveedores = DB.get('proveedores') || [];
            let cxp = DB.get('cxp') || [];
            let cxc = DB.get('cxc') || [];
            let compras = DB.get('compras') || [];
            let clientes = DB.get('clientes') || [];
            let movCaja = DB.get('movCaja') || [];
            let preparados = DB.get('preparados') || [];
            let historialProd = DB.get('historialProd') || [];
            let categoriasInsumos = DB.get('categoriasInsumos') || ['Proteínas', 'Verduras', 'Granos', 'Lácteos', 'Condimentos', 'Frutas', 'Preparados'];
            let categoriasMenu = DB.get('categoriasMenu') || ['Desayuno', 'Comida', 'Cena', 'Snack', 'Bebida'];
            let pedidoEditId = null;
            let platilloEditId = null;
            let etiquetasSeleccionadas = [];
            let tipoPedidoActual = 'menu';
            let itemsPedidoActual = {};
            let vistaKanban = true;
            let descuentoTipoActual = 'ninguno';
            let cxpTipoActual = 'proveedor';
            let cxpCategoriaFiltro = 'todas';
            let cxpEstadoFiltro = '';
            let modoPagoActual = 'inmediato';
            let lineasCompraActual = [];

            function save() {
                DB.set('pedidos', pedidos);
                DB.set('menu', menu);
                DB.set('dietas', dietas);
                DB.set('inventario', inventario);
                DB.set('proveedores', proveedores);
                DB.set('cxp', cxp);
                DB.set('cxc', cxc);
                DB.set('compras', compras);
                DB.set('gastos', gastos);
                DB.set('presentaciones', presentaciones);
                DB.set('clientes', clientes);
                DB.set('movCaja', movCaja);
                DB.set('preparados', preparados);
                DB.set('historialProd', historialProd);
                DB.set('categoriasInsumos', categoriasInsumos);
                DB.set('categoriasMenu', categoriasMenu);
                DB.set('historialEliminaciones', historialEliminaciones);
                // cajaEstado se guarda directamente en DB.set dentro de setCajaHoy
            }

            // ========== SEED DATA ==========
            function seedData() {
                if (menu.length === 0) {
                    menu = [
                        { id: uid(), nombre: 'Bowl de pollo con quinoa', categoria: 'Comida', precio: 145, costo: 52, calorias: 480, desc: 'Pollo a la plancha, quinoa, verduras asadas y aderezo de limón', etiquetas: ['Alto en proteína', 'Sin gluten'], disponible: true },
                        { id: uid(), nombre: 'Wrap de atún', categoria: 'Comida', precio: 120, costo: 38, calorias: 380, desc: 'Atún en agua, aguacate, pepino y tortilla integral', etiquetas: ['Alto en proteína'], disponible: true },
                        { id: uid(), nombre: 'Smoothie verde detox', categoria: 'Bebida', precio: 75, costo: 22, calorias: 180, desc: 'Espinaca, manzana verde, pepino, jengibre y limón', etiquetas: ['Vegano', 'Bajo carbos'], disponible: true },
                        { id: uid(), nombre: 'Omelette de claras', categoria: 'Desayuno', precio: 95, costo: 28, calorias: 220, desc: 'Claras de huevo, champiñones, espinaca y queso cottage', etiquetas: ['Keto', 'Sin gluten', 'Alto en proteína'], disponible: true },
                        { id: uid(), nombre: 'Ensalada mediterránea', categoria: 'Comida', precio: 130, costo: 42, calorias: 350, desc: 'Lechuga, tomate cherry, pepino, aceitunas, queso feta', etiquetas: ['Vegano'], disponible: true },
                        { id: uid(), nombre: 'Overnight oats', categoria: 'Desayuno', precio: 85, costo: 25, calorias: 340, desc: 'Avena, leche de almendra, frutos rojos y miel de agave', etiquetas: ['Vegano'], disponible: true },
                    ];
                }
                if (inventario.length === 0) {
                    inventario = [
                        { id: uid(), nombre: 'Pechuga de pollo', categoria: 'Proteínas', stock: 8, minimo: 5, unidad: 'kg', costo: 95, proveedor: '' },
                        { id: uid(), nombre: 'Atún en agua', categoria: 'Proteínas', stock: 24, minimo: 10, unidad: 'pza', costo: 22, proveedor: '' },
                        { id: uid(), nombre: 'Quinoa', categoria: 'Granos', stock: 3, minimo: 4, unidad: 'kg', costo: 85, proveedor: '' },
                        { id: uid(), nombre: 'Espinaca', categoria: 'Verduras', stock: 2, minimo: 3, unidad: 'kg', costo: 35, proveedor: '' },
                        { id: uid(), nombre: 'Aguacate', categoria: 'Frutas', stock: 15, minimo: 10, unidad: 'pza', costo: 18, proveedor: '' },
                        { id: uid(), nombre: 'Claras de huevo', categoria: 'Proteínas', stock: 36, minimo: 20, unidad: 'pza', costo: 5, proveedor: '' },
                        { id: uid(), nombre: 'Avena', categoria: 'Granos', stock: 5, minimo: 3, unidad: 'kg', costo: 45, proveedor: '' },
                        { id: uid(), nombre: 'Leche de almendra', categoria: 'Lácteos', stock: 1, minimo: 4, unidad: 'L', costo: 55, proveedor: '' },
                    ];
                }
                if (clientes.length === 0) {
                    clientes = [
                        { id: uid(), nombre: 'María González', tel: '999-123-4567', canal: 'WhatsApp', tieneDieta: true, pedidos: 8, ultimoPedido: '2024-01-15', notas: 'Alergia a mariscos' },
                        { id: uid(), nombre: 'Carlos Ramírez', tel: '999-234-5678', canal: 'Instagram', tieneDieta: false, pedidos: 3, ultimoPedido: '2024-01-14', notas: '' },
                        { id: uid(), nombre: 'Ana López', tel: '999-345-6789', canal: 'WhatsApp', tieneDieta: true, pedidos: 12, ultimoPedido: '2024-01-15', notas: 'Plan pérdida de peso' },
                    ];
                }
                if (proveedores.length === 0) {
                    proveedores = [
                        { id: uid(), nombre: 'Carnes Don Pepe', contacto: 'José Pérez', tel: '999-500-0001', categoria: 'Carnes y proteínas', dias: 'Lunes, Jueves', notas: 'Pago semanal' },
                        { id: uid(), nombre: 'Verduras La Cosecha', contacto: 'Rosa Martínez', tel: '999-500-0002', categoria: 'Verduras y frutas', dias: 'Martes, Viernes', notas: 'Pedido mínimo $500' },
                        { id: uid(), nombre: 'Granos del Sur', contacto: 'Luis Torres', tel: '999-500-0003', categoria: 'Granos y cereales', dias: 'Miércoles', notas: 'Crédito a 15 días' },
                    ];
                }
                if (dietas.length === 0) {
                    dietas = [
                        { id: uid(), clienteId: clientes[0]?.id, clienteNombre: 'María González', nombre: 'Plan bajo en sodio', objetivo: 'Control glucémico', calorias: 1400, proteinas: 120, carbos: 90, grasas: 45, restricciones: ['Sin lactosa', 'Sin mariscos'], instrucciones: 'Sin sal agregada. Cocinar al vapor o plancha. Porciones de 200g proteína, 100g vegetales.', inicio: '2024-01-01', fin: '2024-02-01' },
                        { id: uid(), clienteId: clientes[2]?.id, clienteNombre: 'Ana López', nombre: 'Plan pérdida de peso', objetivo: 'Pérdida de peso', calorias: 1200, proteinas: 140, carbos: 60, grasas: 35, restricciones: ['Sin gluten'], instrucciones: 'Alta proteína, baja en carbos. Evitar azúcares simples. Usar stevia.', inicio: '2024-01-10', fin: '2024-02-10' },
                    ];
                }
                if (cxp.length === 0) {
                    cxp = [
                        { id: uid(), proveedor: 'Carnes Don Pepe', concepto: 'Compra semanal proteínas', monto: 1850, vencimiento: '2024-01-20', estado: 'pendiente', notas: 'Factura #1042' },
                        { id: uid(), proveedor: 'Verduras La Cosecha', concepto: 'Verduras y frutas semana', monto: 680, vencimiento: '2024-01-18', estado: 'vencida', notas: '' },
                        { id: uid(), proveedor: 'Granos del Sur', concepto: 'Quinoa y avena', monto: 540, vencimiento: '2024-01-25', estado: 'pendiente', notas: 'Crédito 15 días' },
                    ];
                }
                save();
            }

            // ========== UTILS ==========
            let uidCounter = Date.now();
            function uid() { return 'id_' + (uidCounter++).toString(36); }
            function fmt(n) { return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0); }
            function fmtFecha(iso) { if (!iso) return '—'; const d = new Date(iso + 'T12:00:00'); return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }); }
            function hoy() { return new Date().toISOString().split('T')[0]; }
            function hora() { return new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }); }

            function toast(msg, type = 'success') {
                const c = document.getElementById('toast-container');
                const t = document.createElement('div');
                t.className = `toast ${type}`;
                t.innerHTML = `<span>${type === 'success' ? '✓' : '⚠'}</span>${msg}`;
                c.appendChild(t);
                setTimeout(() => t.remove(), 3000);
            }

            function showPage(page) {
                document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                document.getElementById('page-' + page).classList.add('active');
                const items = document.querySelectorAll('.nav-item');
                items.forEach(i => { if (i.getAttribute('onclick')?.includes(page)) i.classList.add('active'); });
                renderPage(page);
            }

            function renderPage(page) {
                if (page === 'dashboard') renderDashboard();
                else if (page === 'pedidos') renderPedidos();
                else if (page === 'menu') renderMenu();
                else if (page === 'dietas') renderDietas();
                else if (page === 'inventario') renderInventario();
                else if (page === 'caja') renderCaja();
                else if (page === 'proveedores') renderProveedores();
                else if (page === 'cxp') renderCXP();
                else if (page === 'cxc') renderCXC();
                else if (page === 'compras') renderCompras();
                else if (page === 'reportes') renderReportes();
                else if (page === 'usuarios') renderUsuarios();
                else if (page === 'importar') renderImportar();
                else if (page === 'clientes') renderClientes();
                else if (page === 'producciones') renderProducciones();
                else if (page === 'eliminacion') renderEliminacion();
                else if (page === 'crm-kanban') renderCRMKanban();
            }

            function openModal(id) { document.getElementById(id).classList.add('open'); }
            function closeModal(id) { document.getElementById(id).classList.remove('open'); }

            // ========== DASHBOARD ==========
            function renderDashboard() {
                document.getElementById('fecha-hoy').textContent = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
                const hoyStr = hoy();
                const pedidosHoy = pedidos.filter(p => p.fecha === hoyStr);
                const ventasHoy = pedidosHoy.filter(p => p.estado === 'Entregado').reduce((s, p) => s + p.total, 0);
                const enProceso = pedidos.filter(p => ['Nuevo', 'En preparación', 'Listo'].includes(p.estado)).length;
                const pendCXP = cxp.filter(c => c.estado !== 'pagada').reduce((s, c) => s + c.monto, 0);
                const pendCXC = cxc.filter(c => c.estado !== 'cobrada').reduce((s, c) => s + c.monto, 0);
                const ticket = pedidosHoy.filter(p => p.estado === 'Entregado').length ? ventasHoy / pedidosHoy.filter(p => p.estado === 'Entregado').length : 0;

                document.getElementById('kpi-ventas').textContent = fmt(ventasHoy);
                document.getElementById('kpi-pedidos-count').textContent = pedidosHoy.length;
                document.getElementById('kpi-pedidos-delta').textContent = `${enProceso} en proceso`;
                document.getElementById('kpi-ticket').textContent = fmt(ticket);
                document.getElementById('kpi-cobrar').textContent = fmt(pendCXC);
                document.getElementById('kpi-cobrar-delta').textContent = `${cxc.filter(c => c.estado !== 'cobrada').length} pendientes →`;
                document.getElementById('kpi-pagar').textContent = fmt(pendCXP);
                document.getElementById('kpi-pagar-delta').textContent = `${cxp.filter(c => c.estado !== 'pagada').length} pendientes →`;

                // Pedidos activos
                const activos = pedidos.filter(p => ['Nuevo', 'En preparación', 'Listo'].includes(p.estado)).slice(0, 5);
                const listaEl = document.getElementById('dash-pedidos-lista');
                if (activos.length === 0) {
                    listaEl.innerHTML = '<div class="empty"><div class="empty-icon">🧾</div><div class="empty-title">Sin pedidos activos</div></div>';
                } else {
                    listaEl.innerHTML = activos.map(p => `
      <div class="flex items-center gap-12" style="padding:10px 0;border-bottom:1px solid var(--border);">
        <div style="flex:1">
          <div style="font-size:13px;font-weight:500">${p.cliente}</div>
          <div style="font-size:11px;color:var(--text3)">${p.items.map(i => i.nombre || i).join(', ').substring(0, 40)}</div>
        </div>
        <div class="text-right">
          <div class="badge ${estadoBadge(p.estado)}">${p.estado}</div>
          <div style="font-size:12px;color:var(--green);font-weight:600;margin-top:3px">${fmt(p.total)}</div>
        </div>
      </div>`).join('');
                }

                // Alertas inventario
                const alertas = inventario.filter(i => i.stock <= i.minimo);
                const alertasEl = document.getElementById('dash-alertas');
                if (alertas.length === 0) {
                    alertasEl.innerHTML = '<div class="empty" style="padding:24px"><div class="empty-icon">✅</div><div class="empty-title">Inventario en buen nivel</div></div>';
                } else {
                    alertasEl.innerHTML = alertas.map(i => `
      <div class="flex items-center gap-8" style="padding:8px 0;border-bottom:1px solid var(--border);">
        <span class="dot ${i.stock === 0 ? 'dot-red' : 'dot-amber'}"></span>
        <div style="flex:1;font-size:13px">${i.nombre}</div>
        <div style="font-size:12px;color:${i.stock === 0 ? 'var(--red)' : 'var(--amber)'};">${i.stock} ${i.unidad}</div>
      </div>`).join('');
                }

                // Top platillos
                const conteo = {};
                pedidosHoy.forEach(p => p.items.forEach(it => {
                    const n = it.nombre || it;
                    conteo[n] = (conteo[n] || 0) + (it.cantidad || 1);
                }));
                const top = Object.entries(conteo).sort((a, b) => b[1] - a[1]).slice(0, 5);
                const maxC = top[0]?.[1] || 1;
                document.getElementById('dash-top-platillos').innerHTML = top.length === 0
                    ? '<div class="empty" style="padding:24px"><div class="empty-text">Sin ventas registradas hoy</div></div>'
                    : top.map(([nombre, cnt]) => `
      <div style="margin-bottom:10px">
        <div class="flex justify-between mb-4"><span style="font-size:13px">${nombre}</span><span class="font-mono text-sm">${cnt}</span></div>
        <div class="stat-bar"><div class="stat-bar-fill" style="width:${(cnt / maxC) * 100}%"></div></div>
      </div>`).join('');

                // Canales
                const canales = {};
                pedidosHoy.forEach(p => canales[p.canal] = (canales[p.canal] || 0) + p.total);
                const totalCanal = Object.values(canales).reduce((s, v) => s + v, 0) || 1;
                const canalEmoji = { WhatsApp: '💬', Presencial: '🏠', Instagram: '📸', Facebook: '👥', Teléfono: '📞' };
                document.getElementById('dash-canales').innerHTML = Object.entries(canales).length === 0
                    ? '<div class="empty" style="padding:24px"><div class="empty-text">Sin datos de canales hoy</div></div>'
                    : Object.entries(canales).map(([canal, monto]) => `
      <div style="margin-bottom:12px">
        <div class="flex justify-between mb-4">
          <span style="font-size:13px">${canalEmoji[canal] || '📱'} ${canal}</span>
          <span class="font-mono text-sm">${fmt(monto)}</span>
        </div>
        <div class="stat-bar"><div class="stat-bar-fill" style="width:${(monto / totalCanal) * 100}%;background:var(--blue)"></div></div>
      </div>`).join('');

                // Badge
                document.getElementById('badge-pedidos').textContent = enProceso;
                if (enProceso === 0) document.getElementById('badge-pedidos').style.display = 'none';
                else document.getElementById('badge-pedidos').style.display = '';
            }

            // ========== PEDIDOS ==========
            const ESTADOS = ['Nuevo', 'En preparación', 'Listo', 'Entregado'];
            const ESTADO_COLORS = { 'Nuevo': 'badge-blue', 'En preparación': 'badge-amber', 'Listo': 'badge-green', 'Entregado': 'badge-gray' };
            function estadoBadge(e) { return ESTADO_COLORS[e] || 'badge-gray'; }

            // ---- Cliente rápido desde pedido ----
            function toggleNuevoClienteRapido() {
                const panel = document.getElementById('panel-nuevo-cliente');
                const visible = panel.style.display !== 'none';
                panel.style.display = visible ? 'none' : 'block';
                if (!visible) document.getElementById('quick-cli-nombre').focus();
            }

            function crearClienteRapido() {
                const nombre = document.getElementById('quick-cli-nombre').value.trim();
                if (!nombre) { toast('Ingresa el nombre del cliente', 'error'); return; }
                const nuevo = {
                    id: uid(), nombre,
                    tel: document.getElementById('quick-cli-tel').value.trim(),
                    canal: document.getElementById('pedido-canal')?.value || 'WhatsApp',
                    tieneDieta: false, pedidos: 0, ultimoPedido: null, notas: ''
                };
                clientes.push(nuevo);
                save();
                // Actualizar select y seleccionar nuevo cliente
                const sel = document.getElementById('pedido-cliente');
                const opt = document.createElement('option');
                opt.value = nuevo.id; opt.textContent = nuevo.nombre;
                sel.appendChild(opt);
                sel.value = nuevo.id;
                // Limpiar y cerrar
                document.getElementById('quick-cli-nombre').value = '';
                document.getElementById('quick-cli-tel').value = '';
                document.getElementById('panel-nuevo-cliente').style.display = 'none';
                toast(`Cliente "${nuevo.nombre}" creado`);
            }

            // ---- Modo pago (inmediato vs crédito) ----
            function setModoPago(el, modo) {
                modoPagoActual = modo;
                document.querySelectorAll('#modal-pedido .form-group:nth-child(2) .chip').forEach(c => c.classList.remove('active'));
                el.classList.add('active');
                document.getElementById('panel-pago-inmediato').style.display = modo === 'inmediato' ? 'block' : 'none';
                document.getElementById('panel-pago-credito').style.display = modo === 'credito' ? 'block' : 'none';
            }

            // ---- Modo envío ----
            let modoEnvioActual = 'sin_envio';
            function setModoEnvio(el, modo) {
                modoEnvioActual = modo;
                document.querySelectorAll('#modal-pedido .form-group:has([onclick*="setModoEnvio"]) .chip').forEach(c => c.classList.remove('active'));
                el.classList.add('active');
                const panel = document.getElementById('panel-envio');
                const info = document.getElementById('envio-info');
                if (modo === 'sin_envio') {
                    panel.style.display = 'none';
                } else if (modo === 'gratis') {
                    panel.style.display = 'block';
                    document.getElementById('envio-costo').value = '0';
                    info.innerHTML = '<span style="color:var(--green)">✓ Envío gratis — sin cargo al cliente ni al repartidor</span>';
                } else if (modo === 'efectivo') {
                    panel.style.display = 'block';
                    info.innerHTML = '💵 El <strong>repartidor cobra todo en efectivo</strong> al cliente (comida + envío).<br>Tú recibes del repartidor solo el monto de la comida. El envío queda con el repartidor.';
                } else if (modo === 'transferencia') {
                    panel.style.display = 'block';
                    info.innerHTML = '📲 El cliente transfirió comida + envío.<br>⚠ Debes <strong>pagar el envío en efectivo al repartidor</strong> cuando recoja el pedido.';
                }
                actualizarTotalPedido();
            }

            function renderPedidos() {
                renderResumenPlatillos();
                if (vistaKanban) renderKanban();
                else renderTablaPedidos(pedidos);
            }

            function renderKanban() {
                const board = document.getElementById('vista-kanban');
                board.innerHTML = ESTADOS.map(estado => {
                    const cols = pedidos.filter(p => p.estado === estado);
                    const colColors = { 'Nuevo': 'var(--blue)', 'En preparación': 'var(--amber)', 'Listo': 'var(--green)', 'Entregado': 'var(--text3)' };
                    return `
      <div class="kanban-col">
        <div class="kanban-header">
          <span class="kanban-title" style="color:${colColors[estado]}">${estado.toUpperCase()}</span>
          <span class="kanban-count">${cols.length}</span>
        </div>
        ${cols.length === 0 ? '<div style="text-align:center;padding:20px;color:var(--text3);font-size:12px">Sin pedidos</div>' :
                            cols.map(p => pedidoCard(p)).join('')}
      </div>`;
                }).join('');
            }

            function pedidoCard(p) {
                const mins = Math.floor((Date.now() - new Date(p.createdAt || Date.now())) / 60000);
                const timerClass = mins < 15 ? 'timer-ok' : mins < 30 ? 'timer-warn' : 'timer-late';
                const canalEmoji = { WhatsApp: '💬', Presencial: '🏠', Instagram: '📸', Facebook: '👥', Teléfono: '📞' };
                return `
    <div class="pedido-card" onclick="verDetallePedido('${p.id}')">
      <div class="flex justify-between mb-4">
        <span class="pedido-id">#${p.id.slice(-4).toUpperCase()}</span>
        <span class="canal-badge badge-gray">${canalEmoji[p.canal] || '📱'} ${p.canal}</span>
      </div>
      <div class="pedido-cliente">${p.cliente}</div>
      <div class="pedido-items">${p.items.slice(0, 2).map(i => i.nombre || i).join(', ')}${p.items.length > 2 ? ` +${p.items.length - 2}` : ''}</div>
      <div class="pedido-footer">
        <span class="timer-chip ${timerClass}">${mins < 1 ? 'Ahora' : mins + 'm'}</span>
        <span class="pedido-monto">${fmt(p.total)}</span>
      </div>
    </div>`;
            }

            function renderTablaPedidos(lista) {
                const tbody = document.getElementById('tabla-pedidos');
                tbody.innerHTML = lista.map(p => `
    <tr>
      <td><span class="font-mono text-xs text-dim">#${p.id.slice(-4).toUpperCase()}</span></td>
      <td>${p.cliente}</td>
      <td><span class="badge badge-gray">${p.canal}</span></td>
      <td>${p.items.slice(0, 2).map(i => i.nombre || i).join(', ')}${p.items.length > 2 ? ` +${p.items.length - 2}` : ''}</td>
      <td class="highlight-green font-mono">${fmt(p.total)}</td>
      <td><span class="badge ${estadoBadge(p.estado)}">${p.estado}</span></td>
      <td class="text-dim">${p.horaStr || p.hora}</td>
      <td><button class="btn btn-secondary btn-sm" onclick="verDetallePedido('${p.id}')">Ver</button></td>
    </tr>`).join('') || '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text3)">Sin pedidos registrados</td></tr>';
            }

            function toggleVistaPedidos() {
                vistaKanban = !vistaKanban;
                document.getElementById('vista-kanban').style.display = vistaKanban ? 'grid' : 'none';
                document.getElementById('vista-lista').style.display = vistaKanban ? 'none' : 'block';
                renderPedidos();
            }

            function filtrarPedidos(q) {
                const f = pedidos.filter(p => p.cliente.toLowerCase().includes(q.toLowerCase()) || p.id.includes(q));
                renderTablaPedidos(f);
            }

            function filtrarPorEstado(e) {
                const f = e ? pedidos.filter(p => p.estado === e) : pedidos;
                renderTablaPedidos(f);
            }

            function openNuevoPedido() {
                itemsPedidoActual = {};
                etiquetasSeleccionadas = [];
                modoEnvioActual = 'sin_envio';
                descuentoTipoActual = 'ninguno';
                // Reset fecha al día de hoy
                const fechaInp = document.getElementById('pedido-fecha');
                if (fechaInp) { fechaInp.value = hoy(); onChangeFechaPedido(hoy()); }
                // Reset envío chips
                document.getElementById('panel-envio').style.display = 'none';
                document.getElementById('panel-nuevo-cliente').style.display = 'none';
                document.getElementById('panel-descuento').style.display = 'none';
                document.getElementById('fila-descuento').style.display = 'none';
                document.getElementById('panel-pago-inmediato').style.display = 'block';
                document.getElementById('panel-pago-credito').style.display = 'none';
                modoPagoActual = 'inmediato';
                // Populate cliente select
                const sel = document.getElementById('pedido-cliente');
                sel.innerHTML = '<option value="">Seleccionar cliente...</option>' +
                    clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
                // Reset envío chips visual
                setTimeout(() => {
                    document.querySelectorAll('#modal-pedido .chip').forEach(c => {
                        if (c.getAttribute('onclick')?.includes('setModoEnvio')) c.classList.remove('active');
                        if (c.getAttribute('onclick')?.includes("setTipoPedido(this,'menu')")) c.classList.add('active');
                        else if (c.getAttribute('onclick')?.includes('setTipoPedido')) c.classList.remove('active');
                    });
                }, 10);
                // Populate menu selector
                const ms = document.getElementById('menu-selector');
                ms.innerHTML = menu.filter(m => m.disponible).map(m => `
    <div class="flex items-center gap-8" style="padding:8px;border-radius:6px;cursor:pointer;transition:background 0.1s" 
         data-nombre="${m.nombre}"
         onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background=''"
         onclick="toggleItemPedido('${m.id}','${m.nombre.replace(/'/g, "\\'")}',${m.precio})">
      <div style="flex:1">
        <div style="font-size:13px;font-weight:500">${m.nombre}</div>
        <div style="font-size:11px;color:var(--text3)">${m.categoria} • ${fmt(m.precio)}</div>
      </div>
      <div class="num-input" id="num-${m.id}" style="display:none">
        <button class="num-btn" onclick="event.stopPropagation();cambiarCantidad('${m.id}','${m.nombre.replace(/'/g, "\\'")}',${m.precio},-1)">-</button>
        <span class="num-val" id="qty-${m.id}">1</span>
        <button class="num-btn" onclick="event.stopPropagation();cambiarCantidad('${m.id}','${m.nombre.replace(/'/g, "\\'")}',${m.precio},1)">+</button>
      </div>
      <div id="check-${m.id}" style="width:18px;height:18px;border:1.5px solid var(--border2);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;transition:all 0.15s"></div>
    </div>`).join('');
                // Limpiar buscador
                const buscador = document.getElementById('buscador-platillos-modal');
                if (buscador) buscador.value = '';
                actualizarConteoSel();
                // Populate dietas
                const ds = document.getElementById('pedido-dieta-sel');
                ds.innerHTML = '<option value="">Nueva instrucción...</option>' +
                    dietas.map(d => `<option value="${d.id}">${d.clienteNombre} — ${d.nombre}</option>`).join('');
                actualizarTotalPedido();
                openModal('modal-pedido');
            }

            function toggleItemPedido(id, nombre, precio) {
                if (itemsPedidoActual[id]) {
                    delete itemsPedidoActual[id];
                    document.getElementById('check-' + id).textContent = '';
                    document.getElementById('check-' + id).style.background = '';
                    document.getElementById('check-' + id).style.borderColor = 'var(--border2)';
                    document.getElementById('num-' + id).style.display = 'none';
                } else {
                    itemsPedidoActual[id] = { nombre, precio, cantidad: 1 };
                    document.getElementById('check-' + id).textContent = '✓';
                    document.getElementById('check-' + id).style.background = 'var(--green)';
                    document.getElementById('check-' + id).style.borderColor = 'var(--green)';
                    document.getElementById('check-' + id).style.color = '#0a1a0a';
                    document.getElementById('num-' + id).style.display = 'flex';
                }
                actualizarTotalPedido();
                actualizarConteoSel();
            }

            function cambiarCantidad(id, nombre, precio, delta) {
                if (!itemsPedidoActual[id]) return;
                itemsPedidoActual[id].cantidad = Math.max(1, (itemsPedidoActual[id].cantidad || 1) + delta);
                document.getElementById('qty-' + id).textContent = itemsPedidoActual[id].cantidad;
                actualizarTotalPedido();
            }

            function actualizarTotalPedido() {
                const subtotal = Object.values(itemsPedidoActual).reduce((s, i) => s + i.precio * i.cantidad, 0);
                const costoEnvio = modoEnvioActual !== 'sin_envio' ? (parseFloat(document.getElementById('envio-costo')?.value) || 0) : 0;

                // Calcular descuento
                let montoDescuento = 0;
                if (descuentoTipoActual === 'porcentaje') {
                    const pct = parseFloat(document.getElementById('descuento-valor')?.value) || 0;
                    montoDescuento = subtotal * (pct / 100);
                } else if (descuentoTipoActual === 'fijo') {
                    montoDescuento = parseFloat(document.getElementById('descuento-valor')?.value) || 0;
                }
                montoDescuento = Math.min(montoDescuento, subtotal);
                const subtotalConDescuento = subtotal - montoDescuento;

                document.getElementById('pedido-subtotal').textContent = fmt(subtotal);

                // Fila descuento
                const filaDesc = document.getElementById('fila-descuento');
                if (montoDescuento > 0) {
                    filaDesc.style.display = 'flex';
                    const motivo = document.getElementById('descuento-motivo')?.value || '';
                    document.getElementById('label-descuento-resumen').textContent = `Descuento${motivo ? ' (' + motivo + ')' : ''}`;
                    document.getElementById('pedido-descuento-display').textContent = '-' + fmt(montoDescuento);
                } else { filaDesc.style.display = 'none'; }

                const filaEnvio = document.getElementById('fila-envio');
                const filaPago = document.getElementById('fila-pago-repartidor');

                if (modoEnvioActual === 'sin_envio' || modoEnvioActual === 'gratis') {
                    filaEnvio.style.setProperty('display', 'none', 'important');
                    filaPago.style.setProperty('display', 'none', 'important');
                    document.getElementById('pedido-total-display').textContent = fmt(subtotalConDescuento);
                } else if (modoEnvioActual === 'efectivo') {
                    filaEnvio.style.setProperty('display', 'flex', 'important');
                    document.getElementById('label-envio-resumen').textContent = 'Envío (cobra repartidor)';
                    document.getElementById('pedido-envio-display').textContent = fmt(costoEnvio);
                    filaPago.style.setProperty('display', 'none', 'important');
                    document.getElementById('pedido-total-display').textContent = fmt(subtotalConDescuento);
                } else if (modoEnvioActual === 'transferencia') {
                    filaEnvio.style.setProperty('display', 'flex', 'important');
                    document.getElementById('label-envio-resumen').textContent = 'Envío (incluido en transferencia)';
                    document.getElementById('pedido-envio-display').textContent = fmt(costoEnvio);
                    filaPago.style.setProperty('display', 'flex', 'important');
                    document.getElementById('pedido-pago-repartidor').textContent = fmt(costoEnvio);
                    document.getElementById('pedido-total-display').textContent = fmt(subtotalConDescuento + costoEnvio);
                }
            }

            // ---- Descuentos ----
            function setDescuentoTipo(el, tipo) {
                descuentoTipoActual = tipo;
                document.querySelectorAll('#descuento-tipo-chips .chip').forEach(c => c.classList.remove('active'));
                el.classList.add('active');
                const panel = document.getElementById('panel-descuento');
                panel.style.display = tipo === 'ninguno' ? 'none' : 'block';
                if (tipo !== 'ninguno') {
                    document.querySelector('#panel-descuento .form-label').textContent =
                        tipo === 'porcentaje' ? 'Porcentaje de descuento (%)' : 'Monto fijo de descuento (MXN)';
                    document.getElementById('descuento-valor').placeholder = tipo === 'porcentaje' ? 'Ej: 10' : 'Ej: 50';
                    document.getElementById('descuento-valor').value = '';
                }
                actualizarTotalPedido();
            }

            function setTipoPedido(el, tipo) {
                tipoPedidoActual = tipo;
                document.querySelectorAll('#modal-pedido .chip').forEach(c => c.classList.remove('active'));
                el.classList.add('active');
                document.getElementById('seccion-menu-pedido').style.display = tipo === 'menu' ? 'block' : 'none';
                document.getElementById('seccion-dieta-pedido').style.display = tipo === 'dieta' ? 'block' : 'none';
            }

            function autocompletarCliente(cid) {
                const c = clientes.find(x => x.id === cid);
                if (c && c.tieneDieta) {
                    const chip = document.querySelector('#modal-pedido .chip:last-child');
                }
            }

            function guardarPedido() {
                const clienteId = document.getElementById('pedido-cliente').value;
                const clienteObj = clientes.find(c => c.id === clienteId);
                const clienteNombre = clienteObj ? clienteObj.nombre : 'Cliente sin registrar';
                const canal = document.getElementById('pedido-canal').value;
                const pago = document.getElementById('pedido-pago').value;
                const notas = document.getElementById('pedido-notas').value;
                const costoEnvio = modoEnvioActual !== 'sin_envio' ? (parseFloat(document.getElementById('envio-costo')?.value) || 0) : 0;
                const empresaEnvio = document.getElementById('envio-empresa')?.value || '';
                let items = [];
                let subtotal = 0;

                if (tipoPedidoActual === 'menu') {
                    items = Object.values(itemsPedidoActual);
                    if (items.length === 0) { toast('Agrega al menos un platillo', 'error'); return; }
                    subtotal = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
                    // Descontar inventario según recetas
                    items.forEach(item => {
                        const platillo = menu.find(m => m.nombre === item.nombre || m.id === item.id);
                        if (platillo?.receta?.length) {
                            platillo.receta.forEach(linea => {
                                const ing = inventario.find(i => i.id === linea.ingId);
                                if (ing) ing.stock = Math.max(0, ing.stock - (linea.cantidad * (item.cantidad || 1)));
                            });
                        }
                    });
                } else {
                    const dietaId = document.getElementById('pedido-dieta-sel').value;
                    const instrucciones = document.getElementById('pedido-instrucciones').value;
                    const dieta = dietas.find(d => d.id === dietaId);
                    items = [{ nombre: dieta ? dieta.nombre : 'Dieta personalizada', precio: 0, cantidad: 1, instrucciones }];
                    subtotal = 0;
                }

                // Descuento
                let montoDescuento = 0;
                const motivoDescuento = document.getElementById('descuento-motivo')?.value || '';
                if (descuentoTipoActual === 'porcentaje') {
                    const pct = parseFloat(document.getElementById('descuento-valor')?.value) || 0;
                    montoDescuento = Math.min(subtotal * (pct / 100), subtotal);
                } else if (descuentoTipoActual === 'fijo') {
                    montoDescuento = Math.min(parseFloat(document.getElementById('descuento-valor')?.value) || 0, subtotal);
                }
                const subtotalConDescuento = subtotal - montoDescuento;

                // Total según modo envío
                let totalCliente = subtotalConDescuento;
                if (modoEnvioActual === 'transferencia') totalCliente = subtotalConDescuento + costoEnvio;

                const p = {
                    id: uid(), cliente: clienteNombre, clienteId, canal, items, subtotal,
                    descuento: montoDescuento, descuentoTipo: descuentoTipoActual, descuentoMotivo: motivoDescuento,
                    costoEnvio, modoEnvio: modoEnvioActual, empresaEnvio,
                    total: totalCliente, pago,
                    notas, estado: 'Nuevo',
                    fecha: document.getElementById('pedido-fecha')?.value || hoy(),
                    hora: hora(), horaStr: hora(), createdAt: Date.now()
                };
                pedidos.unshift(p);

                if (clienteObj) { clienteObj.pedidos = (clienteObj.pedidos || 0) + 1; clienteObj.ultimoPedido = hoy(); }
                if (modoPagoActual === 'inmediato' && subtotalConDescuento > 0)
                    movCaja.push({ hora: hora(), pedidoId: p.id, cliente: clienteNombre, metodo: pago, monto: subtotalConDescuento, tipo: 'venta', estado: 'Nuevo' });

                // Envío pagado por el cliente con transferencia → se paga al repartidor (salida de efectivo)
                if (modoEnvioActual === 'transferencia' && costoEnvio > 0) {
                    movCaja.push({ hora: hora(), pedidoId: p.id, cliente: empresaEnvio || 'Repartidor', metodo: 'Efectivo', monto: costoEnvio, tipo: 'envio_salida', estado: 'Pendiente pago' });
                }
                // Envío gratis (absorbido por el negocio) → también es gasto, se registra en caja como salida
                if (modoEnvioActual === 'gratis' && costoEnvio > 0) {
                    movCaja.push({ hora: hora(), pedidoId: p.id, cliente: empresaEnvio || 'Repartidor', metodo: 'Efectivo', monto: costoEnvio, tipo: 'envio_gratis', estado: 'Gasto absorbido' });
                }
                save();
                closeModal('modal-pedido');

                if (modoPagoActual === 'credito' && totalCliente > 0) {
                    // Crear CxC automáticamente
                    const vencCxC = document.getElementById('credito-vencimiento')?.value || '';
                    const conceptoCxC = document.getElementById('credito-concepto')?.value || `Pedido #${p.id.slice(-4).toUpperCase()}`;
                    const estadoCxC = vencCxC && new Date(vencCxC) < new Date() ? 'vencida' : 'pendiente';
                    cxc.push({
                        id: uid(), clienteId, clienteNombre,
                        concepto: conceptoCxC, monto: totalCliente,
                        vencimiento: vencCxC, fecha: hoy(), estado: estadoCxC,
                        pedidoId: p.id, notas: 'Generado automáticamente desde pedido'
                    });
                    save();
                    toast(`Pedido creado y registrado en Cuentas por Cobrar`);
                } else {
                    toast(`Pedido de ${clienteNombre} creado${montoDescuento > 0 ? ' con descuento de ' + fmt(montoDescuento) : ''}`);
                }
                renderPedidos();
                renderDashboard();
                if (vistaCalActiva) renderCalendario();
                // Verificar alertas de inventario tras guardar pedido
                verificarAlertasInventarioPedido(items);
            }

            function verificarAlertasInventarioPedido(items) {
                // Descontar ingredientes del inventario por receta y mostrar alertas
                const alertasAgotado = [];
                const alertasBajo = [];

                items.forEach(item => {
                    const platillo = menu.find(m => m.nombre === (item.nombre || item));
                    if (!platillo || !platillo.receta?.length) return;
                    platillo.receta.forEach(linea => {
                        const ing = inventario.find(i => i.id === linea.ingId);
                        if (!ing) return;
                        // Descontar stock
                        ing.stock = Math.max(0, ing.stock - linea.cantidad * (item.cantidad || 1));
                        if (ing.stock === 0) alertasAgotado.push(ing.nombre);
                        else if (ing.stock <= ing.minimo) alertasBajo.push(`${ing.nombre} (${ing.stock} ${ing.unidad})`);
                    });
                });

                if (alertasAgotado.length || alertasBajo.length) {
                    save();
                    let msg = '';
                    if (alertasAgotado.length) msg += `⛔ AGOTADO: ${alertasAgotado.join(', ')}. `;
                    if (alertasBajo.length) msg += `⚠ Stock bajo: ${alertasBajo.join(', ')}.`;
                    // Toast de advertencia sin bloquear operación
                    setTimeout(() => {
                        const t = document.createElement('div');
                        t.className = 'toast toast-error';
                        t.style.cssText = 'max-width:420px;line-height:1.5;padding:12px 16px';
                        t.innerHTML = `<div style="font-size:12px;font-weight:600;margin-bottom:4px">⚠ Alerta de inventario</div><div style="font-size:11px">${msg}</div>`;
                        const tc = document.getElementById('toast-container');
                        if (tc) { tc.appendChild(t); setTimeout(() => t.remove(), 6000); }
                    }, 600);
                }
            }

            function verDetallePedido(id) {
                const p = pedidos.find(x => x.id === id);
                if (!p) return;
                document.getElementById('detalle-titulo').textContent = `Pedido #${id.slice(-4).toUpperCase()}`;
                const idxEstado = ESTADOS.indexOf(p.estado);
                document.getElementById('detalle-body').innerHTML = `
    <div class="flex items-center gap-8 mb-16">
      ${ESTADOS.map((e, i) => `<div style="display:flex;align-items:center;gap:4px">
        <span style="width:24px;height:24px;border-radius:50%;background:${i <= idxEstado ? 'var(--green)' : 'var(--bg4)'};display:flex;align-items:center;justify-content:center;font-size:11px;color:${i <= idxEstado ? '#0a1a0a' : 'var(--text3)'}">${i + 1}</span>
        <span style="font-size:11px;color:${i === idxEstado ? 'var(--green)' : 'var(--text3)'}">${e}</span>
        ${i < ESTADOS.length - 1 ? '<span style="color:var(--text3);margin:0 4px">→</span>' : ''}
      </div>`).join('')}
    </div>
    <div class="grid grid-2 mb-16" style="font-size:13px">
      <div><span class="text-dim">Cliente:</span> <strong>${p.cliente}</strong></div>
      <div><span class="text-dim">Canal:</span> ${p.canal}</div>
      <div><span class="text-dim">Fecha:</span> ${p.fecha}</div>
      <div><span class="text-dim">Pago:</span> ${p.pago}</div>
    </div>
    <div style="margin-bottom:12px">
      <div class="text-dim mb-8" style="font-size:12px">ITEMS</div>
      ${p.items.map(i => `
        <div class="flex justify-between" style="padding:8px 0;border-bottom:1px solid var(--border)">
          <span>${i.nombre || i} ${i.cantidad > 1 ? `×${i.cantidad}` : ''}</span>
          <span class="font-mono">${fmt((i.precio || 0) * (i.cantidad || 1))}</span>
        </div>`).join('')}
      <div class="flex justify-between mt-8"><strong>Total</strong><strong class="highlight-green font-mono">${fmt(p.total)}</strong></div>
    </div>
    ${p.notas ? `<div class="card card-sm" style="background:var(--amber-dim);border-color:rgba(251,191,36,0.2)"><span style="font-size:12px">📝 ${p.notas}</span></div>` : ''}`;
                const footer = document.getElementById('detalle-footer');
                const nextEstado = ESTADOS[idxEstado + 1];
                footer.innerHTML = `
    <button class="btn btn-danger btn-sm" onclick="cancelarPedido('${id}')">Cancelar pedido</button>
    <div style="flex:1"></div>
    ${nextEstado ? `<button class="btn btn-primary" onclick="avanzarEstado('${id}')">→ Marcar como "${nextEstado}"</button>` : '<span class="badge badge-green">✓ Pedido completado</span>'}`;
                openModal('modal-detalle-pedido');
            }

            function avanzarEstado(id) {
                const p = pedidos.find(x => x.id === id);
                if (!p) return;
                const idx = ESTADOS.indexOf(p.estado);
                if (idx < ESTADOS.length - 1) {
                    p.estado = ESTADOS[idx + 1];
                    if (p.estado === 'Entregado') {
                        const mov = movCaja.find(m => m.pedidoId === id);
                        if (mov) mov.estado = 'Cobrado';
                    }
                    save();
                    closeModal('modal-detalle-pedido');
                    toast(`Pedido actualizado a "${p.estado}"`);
                    renderPedidos();
                    renderDashboard();
                }
            }

            function cancelarPedido(id) {
                const p = pedidos.find(x => x.id === id);
                if (p) { p.estado = 'Cancelado'; save(); }
                closeModal('modal-detalle-pedido');
                toast('Pedido cancelado', 'error');
                renderPedidos();
                renderDashboard();
            }

            // ========== MENÚ ==========
            let categoriaFiltro = 'todas';
            function renderMenu() {
                actualizarSelectsCategorias();
                const lista = categoriaFiltro === 'todas' ? menu : menu.filter(m => m.categoria === categoriaFiltro);
                const grid = document.getElementById('menu-grid');
                grid.innerHTML = lista.map(m => {
                    const margen = m.precio && m.costo ? Math.round(((m.precio - m.costo) / m.precio) * 100) : 0;
                    return `
      <div class="card" style="padding:16px;transition:all 0.15s" onmouseover="this.style.borderColor='var(--border2)'" onmouseout="this.style.borderColor='var(--border)'">
        <div class="flex justify-between items-center mb-8">
          <span class="badge badge-gray">${m.categoria}</span>
          <span class="badge ${m.disponible ? 'badge-green' : 'badge-red'}">${m.disponible ? 'Disponible' : 'No disponible'}</span>
        </div>
        <div style="font-size:15px;font-weight:600;margin-bottom:4px">${m.nombre}</div>
        <div style="font-size:12px;color:var(--text3);margin-bottom:10px;line-height:1.5">${m.desc || ''}</div>
        ${m.etiquetas?.length ? `<div class="flex gap-4 mb-10" style="flex-wrap:wrap">${m.etiquetas.map(e => `<span style="font-size:10px;padding:2px 7px;background:var(--bg3);border-radius:10px;color:var(--text2)">${e}</span>`).join('')}</div>` : ''}
        ${m.calorias ? `<div style="font-size:11px;color:var(--text3);margin-bottom:8px">🔥 ${m.calorias} kcal</div>` : ''}
        <hr class="divider">
        <div class="flex justify-between items-center">
          <div>
            <div style="font-size:18px;font-weight:600;color:var(--green)">${fmt(m.precio)}</div>
            <div style="font-size:11px;color:var(--text3)">costo: ${fmt(m.costo)} • margen: <span style="color:${margen > 50 ? 'var(--green)' : margen > 30 ? 'var(--amber)' : 'var(--red)'}">${margen}%</span></div>
            ${m.receta?.length ? `<div style="font-size:11px;color:var(--text3);margin-top:2px">📋 ${m.receta.length} ingrediente${m.receta.length > 1 ? 's' : ''} en receta</div>` : '<div style="font-size:11px;color:var(--amber);margin-top:2px">⚠ Sin receta cargada</div>'}
          </div>
          <div class="flex gap-6">
            <button class="btn btn-secondary btn-sm" onclick="editarPlatillo('${m.id}')">Editar</button>
            <button class="btn btn-danger btn-sm" onclick="eliminarPlatillo('${m.id}')">🗑</button>
          </div>
        </div>
      </div>`;
                }).join('') || `<div class="empty" style="grid-column:1/-1"><div class="empty-icon">🥗</div><div class="empty-title">Sin platillos en esta categoría</div></div>`;
            }

            function filtrarCategoria(el, cat) {
                categoriaFiltro = cat;
                document.querySelectorAll('#page-menu .chip').forEach(c => c.classList.remove('active'));
                el.classList.add('active');
                renderMenu();
            }

            function openNuevoPlatillo() {
                platilloEditId = null;
                recetaActual = [];
                document.getElementById('platillo-modal-title').textContent = 'Nuevo Platillo';
                document.getElementById('platillo-nombre').value = '';
                document.getElementById('platillo-precio').value = '';
                document.getElementById('platillo-costo').value = '';
                document.getElementById('platillo-calorias').value = '';
                document.getElementById('platillo-desc').value = '';
                etiquetasSeleccionadas = [];
                actualizarSelectsCategorias();
                document.querySelectorAll('#etiquetas-wrap .chip').forEach(c => c.classList.remove('active'));
                renderRecetaLineas();
                openModal('modal-platillo');
            }

            // ---- Recetas ----
            let recetaActual = [];

            function agregarLineaReceta() {
                recetaActual.push({ ingId: '', cantidad: 0 });
                renderRecetaLineas();
            }

            function renderRecetaLineas() {
                const cont = document.getElementById('receta-items');
                if (recetaActual.length === 0) {
                    cont.innerHTML = '<div style="padding:12px;text-align:center;font-size:12px;color:var(--text3)">Sin ingredientes. Agrega uno para calcular el costo automáticamente.</div>';
                    document.getElementById('receta-costo-total').textContent = '$0.00';
                    document.getElementById('platillo-costo').value = '';
                    return;
                }
                cont.innerHTML = recetaActual.map((linea, idx) => {
                    const ing = inventario.find(i => i.id === linea.ingId);
                    const costoLinea = ing ? (ing.costo * (linea.cantidad || 0)) : 0;
                    return `
    <div style="display:grid;grid-template-columns:1fr 90px 80px 36px;gap:0;padding:7px 10px;border-top:1px solid var(--border);align-items:center;">
      <select class="form-input" style="font-size:12px;padding:5px 8px;border-radius:4px" 
              onchange="actualizarLineaReceta(${idx},'ingId',this.value)">
        <option value="">Seleccionar...</option>
        ${inventario.map(i => `<option value="${i.id}" ${i.id === linea.ingId ? 'selected' : ''}>${i.nombre} (${i.unidad})</option>`).join('')}
      </select>
      <input type="number" class="form-input" style="font-size:12px;padding:5px 8px;border-radius:4px;margin-left:6px" 
             placeholder="0" value="${linea.cantidad || ''}"
             onchange="actualizarLineaReceta(${idx},'cantidad',parseFloat(this.value)||0)">
      <span class="font-mono" style="font-size:12px;color:var(--amber);padding-left:8px">${fmt(costoLinea)}</span>
      <button onclick="eliminarLineaReceta(${idx})" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:16px;padding:0 4px;">×</button>
    </div>`;
                }).join('');
                recalcularCostoReceta();
            }

            function actualizarLineaReceta(idx, campo, valor) {
                recetaActual[idx][campo] = valor;
                recalcularCostoReceta();
                // Re-render solo costos sin rebuilding inputs (para no perder focus)
                const items = document.querySelectorAll('#receta-items > div');
                recetaActual.forEach((linea, i) => {
                    const ing = inventario.find(x => x.id === linea.ingId);
                    const costoLinea = ing ? (ing.costo * (linea.cantidad || 0)) : 0;
                    const costoEl = items[i]?.querySelectorAll('span')[0];
                    if (costoEl) costoEl.textContent = fmt(costoLinea);
                });
            }

            function eliminarLineaReceta(idx) {
                recetaActual.splice(idx, 1);
                renderRecetaLineas();
            }

            function recalcularCostoReceta() {
                const total = recetaActual.reduce((s, linea) => {
                    const ing = inventario.find(i => i.id === linea.ingId);
                    return s + (ing ? ing.costo * (linea.cantidad || 0) : 0);
                }, 0);
                document.getElementById('receta-costo-total').textContent = fmt(total);
                document.getElementById('platillo-costo').value = total.toFixed(2);
            }

            function editarPlatillo(id) {
                const m = menu.find(x => x.id === id);
                if (!m) return;
                platilloEditId = id;
                recetaActual = m.receta ? JSON.parse(JSON.stringify(m.receta)) : [];
                document.getElementById('platillo-modal-title').textContent = 'Editar Platillo';
                document.getElementById('platillo-nombre').value = m.nombre;
                document.getElementById('platillo-precio').value = m.precio;
                document.getElementById('platillo-costo').value = m.costo;
                document.getElementById('platillo-calorias').value = m.calorias || '';
                document.getElementById('platillo-desc').value = m.desc || '';
                document.getElementById('platillo-disponible').value = m.disponible.toString();
                document.getElementById('platillo-categoria').value = m.categoria;
                etiquetasSeleccionadas = [...(m.etiquetas || [])];
                document.querySelectorAll('#etiquetas-wrap .chip').forEach(c => {
                    c.classList.toggle('active', etiquetasSeleccionadas.includes(c.textContent.trim().replace(/^[^\s]+\s/, '')));
                });
                renderRecetaLineas();
                openModal('modal-platillo');
            }

            function guardarPlatillo() {
                const nombre = document.getElementById('platillo-nombre').value.trim();
                if (!nombre) { toast('Ingresa el nombre del platillo', 'error'); return; }
                const costoReceta = recetaActual.length > 0
                    ? recetaActual.reduce((s, l) => { const i = inventario.find(x => x.id === l.ingId); return s + (i ? i.costo * (l.cantidad || 0) : 0); }, 0)
                    : parseFloat(document.getElementById('platillo-costo').value) || 0;
                const datos = {
                    nombre,
                    categoria: document.getElementById('platillo-categoria').value,
                    precio: parseFloat(document.getElementById('platillo-precio').value) || 0,
                    costo: costoReceta,
                    calorias: parseInt(document.getElementById('platillo-calorias').value) || 0,
                    desc: document.getElementById('platillo-desc').value,
                    etiquetas: etiquetasSeleccionadas,
                    disponible: document.getElementById('platillo-disponible').value === 'true',
                    receta: recetaActual.filter(l => l.ingId && l.cantidad > 0),
                };
                if (platilloEditId) {
                    const idx = menu.findIndex(m => m.id === platilloEditId);
                    menu[idx] = { ...menu[idx], ...datos };
                    toast('Platillo actualizado');
                } else {
                    menu.push({ id: uid(), ...datos });
                    toast('Platillo agregado al menú');
                }
                save();
                closeModal('modal-platillo');
                renderMenu();
            }

            function eliminarPlatillo(id) {
                menu = menu.filter(m => m.id !== id);
                save();
                renderMenu();
                toast('Platillo eliminado');
            }

            function toggleEtiqueta(el, etiqueta) {
                el.classList.toggle('active');
                if (el.classList.contains('active')) {
                    if (!etiquetasSeleccionadas.includes(etiqueta)) etiquetasSeleccionadas.push(etiqueta);
                } else {
                    etiquetasSeleccionadas = etiquetasSeleccionadas.filter(e => e !== etiqueta);
                }
            }

            // ========== DIETAS ==========
            function renderDietas() {
                const grid = document.getElementById('dietas-grid');
                grid.innerHTML = dietas.map(d => {
                    const tieneCot = d.cotizacion && d.cotizacion.platillos?.length > 0;
                    const costoTotal = tieneCot ? d.cotizacion.platillos.reduce((s, p) => s + p.costo, 0) : 0;
                    return `
    <div class="card" style="padding:16px">
      <div class="flex justify-between items-center mb-8">
        <span class="badge badge-purple">${d.objetivo}</span>
        <div class="flex gap-6">
          <button class="btn btn-secondary btn-sm" onclick="openCotizacion('${d.id}')">💰 Cotizar</button>
          <button class="btn btn-danger btn-sm" onclick="eliminarDieta('${d.id}')">🗑</button>
        </div>
      </div>
      <div style="font-size:15px;font-weight:600;margin-bottom:2px">${d.nombre}</div>
      <div style="font-size:12px;color:var(--blue);margin-bottom:10px">👤 ${d.clienteNombre}</div>
      ${d.pdfNombre ? `<div style="font-size:11px;background:var(--bg3);border-radius:6px;padding:6px 10px;margin-bottom:8px;color:var(--text2)">📄 ${d.pdfNombre}</div>` : ''}
      ${d.calorias ? `<div class="grid" style="grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px">
        <div style="text-align:center"><div style="font-size:16px;font-weight:600">${d.calorias}</div><div style="font-size:10px;color:var(--text3)">kcal</div></div>
        <div style="text-align:center"><div style="font-size:16px;font-weight:600;color:var(--red)">${d.proteinas || '—'}</div><div style="font-size:10px;color:var(--text3)">prot g</div></div>
        <div style="text-align:center"><div style="font-size:16px;font-weight:600;color:var(--amber)">${d.carbos || '—'}</div><div style="font-size:10px;color:var(--text3)">carbs g</div></div>
        <div style="text-align:center"><div style="font-size:16px;font-weight:600;color:var(--blue)">${d.grasas || '—'}</div><div style="font-size:10px;color:var(--text3)">grasas g</div></div>
      </div>` : ''}
      ${d.restricciones?.length ? `<div class="flex gap-4 mb-8" style="flex-wrap:wrap">${d.restricciones.map(r => `<span style="font-size:10px;padding:2px 7px;background:var(--red-dim);color:var(--red);border-radius:10px">${r}</span>`).join('')}</div>` : ''}
      ${d.instrucciones ? `<div style="font-size:12px;color:var(--text2);background:var(--bg3);border-radius:6px;padding:10px;line-height:1.5;margin-bottom:8px">${d.instrucciones}</div>` : ''}
      ${tieneCot ? `
        <div style="background:var(--green-dim);border:1px solid rgba(74,222,128,0.2);border-radius:6px;padding:10px;margin-top:4px">
          <div style="font-size:11px;color:var(--green);font-weight:600;margin-bottom:6px">💰 COTIZACIÓN</div>
          <div style="font-size:12px;color:var(--text2);margin-bottom:6px">${d.cotizacion.platillos.length} platillo${d.cotizacion.platillos.length > 1 ? 's' : ''} · costo base ${fmt(costoTotal)}/día</div>
          <div class="grid" style="grid-template-columns:repeat(3,1fr);gap:6px">
            <div style="text-align:center;background:var(--bg2);border-radius:6px;padding:8px">
              <div style="font-size:15px;font-weight:700;color:var(--green)">${fmt(d.cotizacion.preciodia)}</div>
              <div style="font-size:10px;color:var(--text3)">por día</div>
            </div>
            <div style="text-align:center;background:var(--bg2);border-radius:6px;padding:8px">
              <div style="font-size:15px;font-weight:700;color:var(--green)">${fmt(d.cotizacion.preciosemana)}</div>
              <div style="font-size:10px;color:var(--text3)">por semana</div>
            </div>
            <div style="text-align:center;background:var(--bg2);border-radius:6px;padding:8px">
              <div style="font-size:15px;font-weight:700;color:var(--green)">${fmt(d.cotizacion.preciomes)}</div>
              <div style="font-size:10px;color:var(--text3)">por mes</div>
            </div>
          </div>
        </div>` : `<div style="font-size:12px;color:var(--text3);text-align:center;padding:8px;border:1px dashed var(--border);border-radius:6px">Sin cotización — presiona 💰 Cotizar</div>`}
      ${d.inicio ? `<div style="font-size:11px;color:var(--text3);margin-top:8px">📅 ${fmtFecha(d.inicio)} → ${fmtFecha(d.fin)}</div>` : ''}
    </div>`;
                }).join('') || '<div class="empty" style="grid-column:1/-1"><div class="empty-icon">📋</div><div class="empty-title">Sin dietas registradas</div><div class="empty-text">Agrega el plan alimenticio de tus clientes</div></div>';
            }

            function openNuevaDieta() {
                etiquetasSeleccionadas = [];
                document.querySelectorAll('#restricciones-wrap .chip').forEach(c => c.classList.remove('active'));
                const sel = document.getElementById('dieta-cliente');
                sel.innerHTML = '<option value="">Seleccionar cliente...</option>' +
                    clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
                const hoyDate = hoy();
                document.getElementById('dieta-inicio').value = hoyDate;
                document.getElementById('dieta-fin').value = '';
                document.getElementById('dieta-pdf-label').textContent = '📄 Haz clic para subir el PDF del nutriólogo';
                document.getElementById('dieta-pdf-input').value = '';
                window._dietaPDFNombre = '';
                openModal('modal-dieta');
            }

            function cargarPDFDieta(input) {
                const file = input.files[0];
                if (!file) return;
                window._dietaPDFNombre = file.name;
                document.getElementById('dieta-pdf-label').innerHTML = `✅ <strong>${file.name}</strong> cargado — se guardará el nombre como referencia`;
            }

            function guardarDieta() {
                const clienteId = document.getElementById('dieta-cliente').value;
                const clienteObj = clientes.find(c => c.id === clienteId);
                const nombre = document.getElementById('dieta-nombre').value.trim();
                if (!nombre) { toast('Ingresa un nombre para la dieta', 'error'); return; }
                const d = {
                    id: uid(),
                    clienteId,
                    clienteNombre: clienteObj ? clienteObj.nombre : 'Sin cliente',
                    nombre,
                    objetivo: document.getElementById('dieta-objetivo').value,
                    calorias: parseInt(document.getElementById('dieta-calorias').value) || 0,
                    proteinas: parseInt(document.getElementById('dieta-proteinas').value) || 0,
                    carbos: parseInt(document.getElementById('dieta-carbos').value) || 0,
                    grasas: parseInt(document.getElementById('dieta-grasas').value) || 0,
                    restricciones: [...etiquetasSeleccionadas],
                    instrucciones: document.getElementById('dieta-instrucciones').value,
                    inicio: document.getElementById('dieta-inicio').value,
                    fin: document.getElementById('dieta-fin').value,
                    pdfNombre: window._dietaPDFNombre || '',
                };
                dietas.push(d);
                if (clienteObj) clienteObj.tieneDieta = true;
                save();
                closeModal('modal-dieta');
                toast('Dieta guardada');
                renderDietas();
            }

            // ---- Cotización ----
            let cotizacionDietaId = null;
            let platillosCotizacion = [];

            function openCotizacion(dietaId) {
                cotizacionDietaId = dietaId;
                const d = dietas.find(x => x.id === dietaId);
                if (!d) return;
                document.getElementById('cotizacion-titulo').textContent = `Cotización — ${d.nombre} (${d.clienteNombre})`;
                // Cargar cotización existente o vacía
                platillosCotizacion = d.cotizacion?.platillos ? JSON.parse(JSON.stringify(d.cotizacion.platillos)) : [];
                document.getElementById('cotizacion-margen').value = d.cotizacion?.margen ?? 40;
                document.getElementById('cotizacion-notas').value = d.cotizacion?.notas || '';
                renderPlatillosCotizacion();
                recalcularCotizacion();
                openModal('modal-cotizacion');
            }

            const TIEMPOS_COMIDA = ['Desayuno', 'Colación AM', 'Comida', 'Colación PM', 'Cena', 'Cena ligera', 'Otro'];

            function agregarPlatilloCotizacion() {
                platillosCotizacion.push({ nombre: '', tiempo: 'Desayuno', ingIds: [], costo: 0, notas: '' });
                renderPlatillosCotizacion();
            }

            function renderPlatillosCotizacion() {
                const cont = document.getElementById('cotizacion-platillos-lista');
                if (platillosCotizacion.length === 0) {
                    cont.innerHTML = '<div style="padding:14px;text-align:center;font-size:12px;color:var(--text3)">Agrega los platillos del plan diario del cliente</div>';
                    recalcularCotizacion();
                    return;
                }
                cont.innerHTML = platillosCotizacion.map((p, idx) => `
    <div style="border-top:1px solid var(--border);padding:10px 12px;">
      <div style="display:grid;grid-template-columns:1fr 120px 90px 36px;gap:6px;align-items:center;margin-bottom:6px">
        <input class="form-input" style="font-size:12px;padding:5px 8px" placeholder="Nombre del platillo"
               value="${p.nombre}" onchange="actualizarPlatilloCot(${idx},'nombre',this.value)">
        <select class="form-input" style="font-size:12px;padding:5px 8px"
                onchange="actualizarPlatilloCot(${idx},'tiempo',this.value)">
          ${TIEMPOS_COMIDA.map(t => `<option ${t === p.tiempo ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
        <span class="font-mono" style="font-size:12px;color:var(--amber);text-align:right">${fmt(p.costo)}</span>
        <button onclick="eliminarPlatilloCot(${idx})" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:16px">×</button>
      </div>
      <!-- Ingredientes del platillo -->
      <div style="padding-left:4px">
        <div style="display:grid;grid-template-columns:1fr 80px 36px;gap:4px;margin-bottom:4px">
          ${(p.lineas || []).map((l, li) => `
            <select class="form-input" style="font-size:11px;padding:4px 6px"
                    onchange="actualizarLineaCot(${idx},${li},'ingId',this.value)">
              <option value="">Ingrediente...</option>
              ${inventario.map(i => `<option value="${i.id}" ${i.id === l.ingId ? 'selected' : ''}>${i.nombre} (${i.unidad})</option>`).join('')}
            </select>
            <input type="number" class="form-input" style="font-size:11px;padding:4px 6px" placeholder="cant"
                   value="${l.cantidad || ''}" onchange="actualizarLineaCot(${idx},${li},'cantidad',parseFloat(this.value)||0)">
            <button onclick="eliminarLineaCot(${idx},${li})" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:14px">×</button>
          `).join('')}
        </div>
        <button onclick="agregarLineaCot(${idx})" class="btn btn-secondary btn-sm" style="font-size:11px;padding:3px 8px">+ ingrediente</button>
      </div>
    </div>`).join('');
                recalcularCotizacion();
            }

            function actualizarPlatilloCot(idx, campo, valor) {
                platillosCotizacion[idx][campo] = valor;
                if (campo !== 'nombre' && campo !== 'tiempo') recalcularCotizacion();
            }

            function eliminarPlatilloCot(idx) {
                platillosCotizacion.splice(idx, 1);
                renderPlatillosCotizacion();
            }

            function agregarLineaCot(idx) {
                if (!platillosCotizacion[idx].lineas) platillosCotizacion[idx].lineas = [];
                platillosCotizacion[idx].lineas.push({ ingId: '', cantidad: 0 });
                renderPlatillosCotizacion();
            }

            function actualizarLineaCot(platIdx, lineaIdx, campo, valor) {
                platillosCotizacion[platIdx].lineas[lineaIdx][campo] = valor;
                // Recalcular costo del platillo
                const lineas = platillosCotizacion[platIdx].lineas || [];
                platillosCotizacion[platIdx].costo = lineas.reduce((s, l) => {
                    const ing = inventario.find(i => i.id === l.ingId);
                    return s + (ing ? ing.costo * (l.cantidad || 0) : 0);
                }, 0);
                recalcularCotizacion();
                // Actualizar solo el costo del platillo sin re-render completo
                const costoEls = document.querySelectorAll('#cotizacion-platillos-lista > div span.font-mono');
                if (costoEls[platIdx]) costoEls[platIdx].textContent = fmt(platillosCotizacion[platIdx].costo);
            }

            function eliminarLineaCot(platIdx, lineaIdx) {
                platillosCotizacion[platIdx].lineas.splice(lineaIdx, 1);
                platillosCotizacion[platIdx].costo = (platillosCotizacion[platIdx].lineas || []).reduce((s, l) => {
                    const ing = inventario.find(i => i.id === l.ingId);
                    return s + (ing ? ing.costo * (l.cantidad || 0) : 0);
                }, 0);
                renderPlatillosCotizacion();
            }

            function recalcularCotizacion() {
                const costoDia = platillosCotizacion.reduce((s, p) => s + p.costo, 0);
                const margen = parseFloat(document.getElementById('cotizacion-margen')?.value) || 40;
                const factor = 1 + margen / 100;
                const precioDia = costoDia * factor;
                const precioSemana = precioDia * 7;
                const precioMes = precioDia * 30;

                document.getElementById('cotizacion-costo-dia').value = fmt(costoDia);
                document.getElementById('cot-precio-dia').textContent = fmt(precioDia);
                document.getElementById('cot-margen-dia').textContent = `${margen}% margen · costo ${fmt(costoDia)}`;
                document.getElementById('cot-precio-semana').textContent = fmt(precioSemana);
                document.getElementById('cot-precio-mes').textContent = fmt(precioMes);
            }

            function guardarCotizacion() {
                const d = dietas.find(x => x.id === cotizacionDietaId);
                if (!d) return;
                const margen = parseFloat(document.getElementById('cotizacion-margen').value) || 40;
                const costoDia = platillosCotizacion.reduce((s, p) => s + p.costo, 0);
                const factor = 1 + margen / 100;
                d.cotizacion = {
                    platillos: platillosCotizacion,
                    margen,
                    costoDia,
                    preciodia: costoDia * factor,
                    preciosemana: costoDia * factor * 7,
                    preciomes: costoDia * factor * 30,
                    notas: document.getElementById('cotizacion-notas').value,
                    fecha: hoy(),
                };
                save();
                closeModal('modal-cotizacion');
                toast(`Cotización guardada — ${fmt(d.cotizacion.preciodia)}/día`);
                renderDietas();
            }

            function generarImagenCotizacion() {
                const d = dietas.find(x => x.id === cotizacionDietaId);
                if (!d) return;
                const margen = parseFloat(document.getElementById('cotizacion-margen').value) || 40;
                const costoDia = platillosCotizacion.reduce((s, p) => s + p.costo, 0);
                const factor = 1 + margen / 100;
                const pdia = costoDia * factor;
                const psemana = pdia * 7;
                const pmes = pdia * 30;
                const notas = document.getElementById('cotizacion-notas').value;

                const W = 800, H = 1000;
                const canvas = document.getElementById('canvas-cotizacion');
                canvas.width = W; canvas.height = H;
                const ctx = canvas.getContext('2d');

                // Fondo degradado oscuro
                const grad = ctx.createLinearGradient(0, 0, 0, H);
                grad.addColorStop(0, '#0f1a0f');
                grad.addColorStop(1, '#0f0f1a');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, W, H);

                // Patrón de puntos sutil
                ctx.fillStyle = 'rgba(74,222,128,0.03)';
                for (let x = 0; x < W; x += 30) for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill(); }

                // Header verde
                const hgrad = ctx.createLinearGradient(0, 0, W, 120);
                hgrad.addColorStop(0, '#166534'); hgrad.addColorStop(1, '#14532d');
                ctx.fillStyle = hgrad;
                roundRect(ctx, 0, 0, W, 130, 0); ctx.fill();

                // Logo emoji + nombre
                ctx.font = 'bold 36px serif'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left';
                ctx.fillText('🥗', 36, 75);
                ctx.font = 'bold 32px system-ui, sans-serif'; ctx.fillStyle = '#ffffff';
                ctx.fillText('Fit&Go', 90, 72);
                ctx.font = '14px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.7)';
                ctx.fillText('Cocina saludable · Mérida', 90, 96);
                ctx.font = 'bold 14px system-ui, sans-serif'; ctx.fillStyle = '#4ade80';
                ctx.textAlign = 'right';
                ctx.fillText('COTIZACIÓN', W - 36, 60);
                ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.6)';
                ctx.fillText(new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }), W - 36, 82);
                ctx.textAlign = 'left';

                // Cliente y plan
                ctx.font = 'bold 22px system-ui, sans-serif'; ctx.fillStyle = '#ffffff';
                ctx.fillText(d.clienteNombre, 36, 175);
                ctx.font = '15px system-ui, sans-serif'; ctx.fillStyle = '#4ade80';
                ctx.fillText(d.nombre, 36, 200);

                // Separador
                ctx.fillStyle = 'rgba(74,222,128,0.2)'; ctx.fillRect(36, 215, W - 72, 1);

                // Platillos
                ctx.font = 'bold 13px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.5)';
                ctx.fillText('PLAN DIARIO', 36, 244);
                let y = 268;
                const platillosMostrar = platillosCotizacion.filter(p => p.nombre).slice(0, 6);
                platillosMostrar.forEach(p => {
                    // Punto verde
                    ctx.fillStyle = '#4ade80'; ctx.beginPath(); ctx.arc(44, y - 4, 4, 0, Math.PI * 2); ctx.fill();
                    ctx.font = '15px system-ui, sans-serif'; ctx.fillStyle = '#ffffff';
                    ctx.fillText(p.nombre, 60, y);
                    ctx.font = '13px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.4)';
                    ctx.textAlign = 'right'; ctx.fillText(p.tiempo, W - 36, y); ctx.textAlign = 'left';
                    y += 32;
                });
                if (platillosCotizacion.filter(p => p.nombre).length > 6) {
                    ctx.font = '13px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.3)';
                    ctx.fillText(`+ ${platillosCotizacion.filter(p => p.nombre).length - 6} platillos más...`, 60, y); y += 28;
                }

                y = Math.max(y + 20, 480);

                // Separador
                ctx.fillStyle = 'rgba(74,222,128,0.2)'; ctx.fillRect(36, y, W - 72, 1); y += 24;

                // Restricciones si hay
                if (d.restricciones?.length) {
                    ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.4)';
                    ctx.fillText('Sin: ' + d.restricciones.join(' · '), 36, y); y += 30;
                }

                // Precios — 3 cards
                const cardW = (W - 72 - 24) / 3, cardH = 110, cardY = y + 10;
                const cards = [
                    { label: 'Diario', precio: pdia, sub: 'por día', color: 'rgba(74,222,128,0.15)', border: 'rgba(74,222,128,0.3)' },
                    { label: 'Semanal ⭐', precio: psemana, sub: '7 días', color: 'rgba(74,222,128,0.25)', border: 'rgba(74,222,128,0.6)' },
                    { label: 'Mensual', precio: pmes, sub: '30 días', color: 'rgba(74,222,128,0.15)', border: 'rgba(74,222,128,0.3)' },
                ];
                cards.forEach((c, i) => {
                    const cx = 36 + i * (cardW + 12);
                    ctx.strokeStyle = c.border; ctx.lineWidth = 1.5;
                    ctx.fillStyle = c.color;
                    roundRect(ctx, cx, cardY, cardW, cardH, 10); ctx.fill();
                    roundRect(ctx, cx, cardY, cardW, cardH, 10); ctx.stroke();
                    ctx.font = 'bold 12px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.textAlign = 'center';
                    ctx.fillText(c.label.toUpperCase(), cx + cardW / 2, cardY + 22);
                    ctx.font = 'bold 28px system-ui, sans-serif'; ctx.fillStyle = '#4ade80';
                    ctx.fillText(fmt(c.precio), cx + cardW / 2, cardY + 60);
                    ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.4)';
                    ctx.fillText(c.sub, cx + cardW / 2, cardY + 82);
                    ctx.textAlign = 'left';
                });

                y = cardY + cardH + 30;

                // Notas
                if (notas) {
                    ctx.fillStyle = 'rgba(255,255,255,0.06)';
                    roundRect(ctx, 36, y, W - 72, 60, 8); ctx.fill();
                    ctx.font = '13px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.5)';
                    ctx.fillText('📝 ' + notas.substring(0, 90) + (notas.length > 90 ? '…' : ''), 50, y + 22);
                    y += 70;
                }

                // Footer
                ctx.fillStyle = 'rgba(74,222,128,0.08)'; ctx.fillRect(0, H - 60, W, 60);
                ctx.font = '13px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.textAlign = 'center';
                ctx.fillText('Cotización válida por 7 días · Fit&Go Mérida', W / 2, H - 32);
                ctx.fillStyle = '#4ade80'; ctx.font = 'bold 13px system-ui, sans-serif';
                ctx.fillText('fitandgo.mx', W / 2, H - 14);
                ctx.textAlign = 'left';

                openModal('modal-imagen-cotizacion');
            }

            function roundRect(ctx, x, y, w, h, r) {
                ctx.beginPath(); ctx.moveTo(x + r, y);
                ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
                ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
                ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
                ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
                ctx.closePath();
            }

            function descargarImagenCotizacion() {
                const d = dietas.find(x => x.id === cotizacionDietaId);
                const canvas = document.getElementById('canvas-cotizacion');
                const a = document.createElement('a');
                a.href = canvas.toDataURL('image/png');
                a.download = `cotizacion_${d?.clienteNombre?.replace(/\s+/g, '_') || 'fitgo'}_${hoy()}.png`;
                a.click();
                toast('Imagen descargada ✅');
            }

            function eliminarDieta(id) {
                dietas = dietas.filter(d => d.id !== id);
                save();
                renderDietas();
                toast('Dieta eliminada');
            }

            // ========== INVENTARIO ==========
            function renderInventario() {
                actualizarSelectsCategorias();
                const bajo = inventario.filter(i => i.stock <= i.minimo && i.stock > 0).length;
                const agotado = inventario.filter(i => i.stock === 0).length;
                const ok = inventario.filter(i => i.stock > i.minimo).length;
                document.getElementById('inv-total').textContent = inventario.length;
                document.getElementById('inv-bajo').textContent = bajo + agotado;
                document.getElementById('inv-agotando').textContent = bajo;
                document.getElementById('inv-ok').textContent = ok;
                renderTablaInventario(inventario);
            }

            function renderTablaInventario(lista) {
                const tbody = document.getElementById('tabla-inventario');
                tbody.innerHTML = lista.map(i => {
                    const pct = i.minimo > 0 ? Math.min(100, Math.round((i.stock / (i.minimo * 2)) * 100)) : 50;
                    const color = i.stock === 0 ? 'var(--red)' : i.stock <= i.minimo ? 'var(--amber)' : 'var(--green)';
                    const estado = i.stock === 0 ? 'badge-red' : i.stock <= i.minimo ? 'badge-amber' : 'badge-green';
                    const estadoTxt = i.stock === 0 ? 'Agotado' : i.stock <= i.minimo ? 'Stock bajo' : 'Normal';
                    const presCnt = (presentaciones || []).filter(p => p.ingId === i.id).length;
                    const presDefault = (presentaciones || []).find(p => p.ingId === i.id && p.esDefault);
                    return `
      <tr>
        <td style="font-weight:500">${i.nombre}</td>
        <td><span class="badge badge-gray">${i.categoria}</span></td>
        <td><span style="font-weight:600;color:${color}">${i.stock}</span></td>
        <td class="text-dim">${i.unidad}</td>
        <td class="text-dim">${i.minimo}</td>
        <td>
          <div class="stock-level">
            <div class="stock-bar"><div class="stock-fill" style="width:${pct}%;background:${color}"></div></div>
            <span class="badge ${estado}" style="font-size:10px">${estadoTxt}</span>
          </div>
        </td>
        <td class="font-mono text-sm">${fmt(i.costo)}</td>
        <td>
          ${presCnt > 0
                            ? `<span class="badge badge-amber" style="cursor:pointer" title="${presDefault ? presDefault.nombre : ''}" onclick="openNuevaPresentacion('${i.id}')">${presCnt} present.</span>`
                            : `<button class="btn btn-secondary btn-sm" onclick="openNuevaPresentacion('${i.id}')">+ Agregar</button>`}
        </td>
        <td>
          <div class="flex gap-6">
            <button class="btn btn-secondary btn-sm" onclick="ajustarStock('${i.id}')">±</button>
            <button class="btn btn-danger btn-sm" onclick="eliminarIngrediente('${i.id}')">🗑</button>
          </div>
        </td>
      </tr>`;
                }).join('') || '<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--text3)">Sin ingredientes registrados</td></tr>';
            }

            function buscarIngrediente(q) {
                renderTablaInventario(inventario.filter(i => i.nombre.toLowerCase().includes(q.toLowerCase())));
            }

            function filtrarCategIngrediente(cat) {
                renderTablaInventario(cat ? inventario.filter(i => i.categoria === cat) : inventario);
            }

            function openNuevoIngrediente() {
                document.getElementById('ing-modal-title').textContent = 'Nuevo Ingrediente';
                ['ing-nombre', 'ing-stock', 'ing-minimo', 'ing-costo'].forEach(id => document.getElementById(id).value = '');
                actualizarSelectsCategorias();
                const sel = document.getElementById('ing-proveedor');
                sel.innerHTML = '<option value="">Sin asignar</option>' + proveedores.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
                openModal('modal-ingrediente');
            }

            function guardarIngrediente() {
                const nombre = document.getElementById('ing-nombre').value.trim();
                if (!nombre) { toast('Ingresa el nombre del ingrediente', 'error'); return; }
                inventario.push({
                    id: uid(),
                    nombre,
                    categoria: document.getElementById('ing-categoria').value,
                    unidad: document.getElementById('ing-unidad').value,
                    stock: parseFloat(document.getElementById('ing-stock').value) || 0,
                    minimo: parseFloat(document.getElementById('ing-minimo').value) || 0,
                    costo: parseFloat(document.getElementById('ing-costo').value) || 0,
                    proveedor: document.getElementById('ing-proveedor').value,
                });
                save();
                closeModal('modal-ingrediente');
                toast('Ingrediente agregado');
                renderInventario();
            }

            function eliminarIngrediente(id) {
                inventario = inventario.filter(i => i.id !== id);
                save();
                renderInventario();
                toast('Ingrediente eliminado');
            }

            function ajustarStock(id) {
                const i = inventario.find(x => x.id === id);
                if (!i) return;
                const delta = parseFloat(prompt(`Ajustar stock de ${i.nombre} (${i.stock} ${i.unidad}).\nIngresa cantidad a sumar (+) o restar (-):`) || '0');
                if (isNaN(delta)) return;
                i.stock = Math.max(0, i.stock + delta);
                save();
                renderInventario();
                toast(`Stock de ${i.nombre} actualizado a ${i.stock} ${i.unidad}`);
            }

            function openAjusteInventario() {
                const ing = inventario[0];
                if (ing) ajustarStock(ing.id);
            }

            // ========== CAJA ==========

            // Denominaciones MXN
            const BILLETES = [1000, 500, 200, 100, 50, 20];
            const MONEDAS = [10, 5, 2, 1, 0.50];
            let conteoEfectivo = {}; // { '500': 3, '100': 2, ... }

            // Estado de caja: guardado por día
            function getCajaHoy() {
                const hoyStr = hoy();
                let caja = DB.get('cajaEstado') || {};
                if (!caja[hoyStr]) caja[hoyStr] = { abierta: false, saldoInicial: 0, horaApertura: null, cortes: [] };
                return caja[hoyStr];
            }
            function setCajaHoy(estado) {
                const hoyStr = hoy();
                let caja = DB.get('cajaEstado') || {};
                caja[hoyStr] = estado;
                DB.set('cajaEstado', caja);
            }

            function accionCaja() {
                const estado = getCajaHoy();
                if (!estado.abierta) openAperturaCaja();
                else openCierreCaja();
            }

            // ---------- APERTURA ----------
            function openAperturaCaja() {
                conteoEfectivo = {};
                renderGridDenominaciones();
                openModal('modal-apertura-caja');
            }

            function renderGridDenominaciones() {
                const makeCell = (val, tipo) => {
                    const key = String(val);
                    const cnt = conteoEfectivo[key] || 0;
                    const esBillete = tipo === 'billete';
                    return `
    <div style="border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px;text-align:center;background:var(--bg2)">
      <div style="font-size:${esBillete ? '18' : '15'}px;font-weight:700;color:${esBillete ? 'var(--green)' : 'var(--amber)'};margin-bottom:6px">
        ${val >= 1 ? '$' + val : val * 100 + '¢'}
      </div>
      <div class="num-input" style="justify-content:center">
        <button class="num-btn" onclick="cambiarConteo('${key}',-1)">−</button>
        <span class="num-val" id="cnt-${key.replace('.', '_')}">${cnt}</span>
        <button class="num-btn" onclick="cambiarConteo('${key}',1)">+</button>
      </div>
      <div style="font-size:10px;color:var(--text3);margin-top:5px" id="sub-${key.replace('.', '_')}">${fmt(val * cnt)}</div>
    </div>`;
                };
                document.getElementById('grid-billetes').innerHTML = BILLETES.map(v => makeCell(v, 'billete')).join('');
                document.getElementById('grid-monedas').innerHTML = MONEDAS.map(v => makeCell(v, 'moneda')).join('');
                calcularTotalApertura();
            }

            function cambiarConteo(key, delta) {
                conteoEfectivo[key] = Math.max(0, (conteoEfectivo[key] || 0) + delta);
                const safeKey = key.replace('.', '_');
                const el = document.getElementById('cnt-' + safeKey);
                const sub = document.getElementById('sub-' + safeKey);
                if (el) el.textContent = conteoEfectivo[key];
                if (sub) sub.textContent = fmt(parseFloat(key) * conteoEfectivo[key]);
                calcularTotalApertura();
            }

            function calcularTotalApertura() {
                const total = Object.entries(conteoEfectivo).reduce((s, [k, v]) => s + parseFloat(k) * v, 0);
                document.getElementById('apertura-total-display').textContent = fmt(total);
                return total;
            }

            function confirmarApertura() {
                const saldo = calcularTotalApertura();
                const estado = getCajaHoy();
                estado.abierta = true;
                estado.saldoInicial = saldo;
                estado.horaApertura = hora();
                estado.conteoInicial = { ...conteoEfectivo };
                setCajaHoy(estado);
                closeModal('modal-apertura-caja');
                toast(`✅ Caja abierta con saldo inicial de ${fmt(saldo)}`);
                renderCaja();
            }

            // ---------- CIERRE ----------
            function openCierreCaja() {
                const hoyStr = hoy();
                const estado = getCajaHoy();
                const movHoy = getMovimientosHoy();
                const ventas = movHoy.filter(m => m.tipo === 'venta' || !m.tipo);
                const enviosGasto = movHoy.filter(m => m.tipo === 'envio_salida' || m.tipo === 'envio_gratis');
                const efectivoCobrado = ventas.filter(m => m.metodo === 'Efectivo').reduce((s, m) => s + m.monto, 0);
                const digitalCobrado = ventas.filter(m => m.metodo !== 'Efectivo').reduce((s, m) => s + m.monto, 0);
                const totalEnvios = enviosGasto.reduce((s, m) => s + m.monto, 0);
                const totalVentas = ventas.reduce((s, m) => s + m.monto, 0);

                const saldoEfectivoFinal = estado.saldoInicial + efectivoCobrado - totalEnvios;
                const saldoFinalTotal = totalVentas - totalEnvios;

                document.getElementById('cierre-caja-body').innerHTML = `
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:12px;color:var(--text3)">${new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      <div style="font-size:11px;color:var(--text3)">Apertura: ${estado.horaApertura || '—'} · Cierre: ${hora()}</div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
      <div class="card card-sm" style="text-align:center">
        <div style="font-size:11px;color:var(--text3)">Saldo inicial</div>
        <div style="font-size:20px;font-weight:700;margin-top:2px;font-family:'DM Mono',monospace">${fmt(estado.saldoInicial)}</div>
      </div>
      <div class="card card-sm" style="text-align:center">
        <div style="font-size:11px;color:var(--text3)">Ingresos totales</div>
        <div style="font-size:20px;font-weight:700;margin-top:2px;font-family:'DM Mono',monospace;color:var(--green)">${fmt(totalVentas)}</div>
      </div>
      <div class="card card-sm" style="text-align:center">
        <div style="font-size:11px;color:var(--text3)">Efectivo cobrado</div>
        <div style="font-size:20px;font-weight:700;margin-top:2px;font-family:'DM Mono',monospace">${fmt(efectivoCobrado)}</div>
      </div>
      <div class="card card-sm" style="text-align:center;border-color:rgba(251,191,36,0.2)">
        <div style="font-size:11px;color:var(--text3)">Digital (transf/tarjeta)</div>
        <div style="font-size:20px;font-weight:700;margin-top:2px;font-family:'DM Mono',monospace;color:var(--blue)">${fmt(digitalCobrado)}</div>
      </div>
      <div class="card card-sm" style="text-align:center;border-color:rgba(248,113,113,0.2)">
        <div style="font-size:11px;color:var(--text3)">Gasto de envíos (salida)</div>
        <div style="font-size:20px;font-weight:700;margin-top:2px;font-family:'DM Mono',monospace;color:var(--red)">−${fmt(totalEnvios)}</div>
      </div>
      <div class="card card-sm" style="text-align:center;border-color:rgba(74,222,128,0.25);background:var(--green-dim)">
        <div style="font-size:11px;color:var(--text3)">💵 Efectivo físico en caja</div>
        <div style="font-size:22px;font-weight:700;margin-top:2px;font-family:'DM Mono',monospace;color:var(--green)">${fmt(saldoEfectivoFinal)}</div>
        <div style="font-size:10px;color:var(--text3);margin-top:2px">Inicial + efectivo cobrado − envíos</div>
      </div>
    </div>

    ${enviosGasto.length > 0 ? `
    <div style="font-size:12px;font-weight:600;color:var(--text3);margin-bottom:8px">DETALLE DE GASTOS DE ENVÍO</div>
    <div style="border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden;margin-bottom:12px">
      ${enviosGasto.map(m => `
        <div class="flex justify-between" style="padding:7px 12px;border-bottom:1px solid var(--border);font-size:12px">
          <span>${m.cliente} <span class="badge ${m.tipo === 'envio_gratis' ? 'badge-amber' : 'badge-red'}" style="font-size:10px">${m.tipo === 'envio_gratis' ? 'Gratis (absorbido)' : 'Pagado repartidor'}</span></span>
          <span class="font-mono highlight-red">−${fmt(m.monto)}</span>
        </div>`).join('')}
    </div>` : ''}

    <div class="card card-sm" style="background:var(--bg3);margin-bottom:0">
      <div style="font-size:12px;color:var(--text2)">💡 Al confirmar el cierre, el día quedará bloqueado. Los envíos gratuitos ya están contabilizados como <strong>Gasto de Envío</strong> en el estado de resultados.</div>
    </div>`;

                openModal('modal-cierre-caja');
            }

            function confirmarCierre() {
                const estado = getCajaHoy();
                estado.cerrada = true;
                estado.horaCierre = hora();
                setCajaHoy(estado);

                // Registrar envíos gratis como gasto en gastos (estado de resultados)
                const movHoy = getMovimientosHoy();
                const enviosGratis = movHoy.filter(m => m.tipo === 'envio_gratis');
                enviosGratis.forEach(m => {
                    // Verificar que no esté ya registrado
                    if (!gastos.find(g => g._movCajaRef === m.pedidoId + '_envio')) {
                        gastos.push({
                            id: uid(),
                            concepto: `Gasto de envío — Pedido #${m.pedidoId.slice(-4).toUpperCase()} (${m.cliente})`,
                            categoria: 'Gasto de envío',
                            monto: m.monto,
                            fecha: hoy(),
                            recurrente: 'no',
                            notas: 'Registrado automáticamente al cerrar caja',
                            _movCajaRef: m.pedidoId + '_envio',
                        });
                    }
                });
                save();
                closeModal('modal-cierre-caja');
                toast('✅ Turno cerrado. Gastos de envío registrados en estado de resultados.');
                renderCaja();
            }

            function getMovimientosHoy() {
                const hoyStr = hoy();
                return movCaja.filter(m => {
                    const p = pedidos.find(x => x.id === m.pedidoId);
                    return p && p.fecha === hoyStr;
                });
            }

            function renderCaja() {
                const hoyStr = hoy();
                const estado = getCajaHoy();
                const movHoy = getMovimientosHoy();
                const ventas = movHoy.filter(m => m.tipo === 'venta' || !m.tipo);
                const enviosGasto = movHoy.filter(m => m.tipo === 'envio_salida' || m.tipo === 'envio_gratis');
                const totalVentas = ventas.reduce((s, m) => s + m.monto, 0);
                const totalEnvios = enviosGasto.reduce((s, m) => s + m.monto, 0);
                const efectivoCobrado = ventas.filter(m => m.metodo === 'Efectivo').reduce((s, m) => s + m.monto, 0);
                const digital = ventas.filter(m => m.metodo !== 'Efectivo').reduce((s, m) => s + m.monto, 0);
                const saldoEfectivoFinal = estado.saldoInicial + efectivoCobrado - totalEnvios;

                // Botón topbar
                const btn = document.getElementById('btn-apertura-corte');
                if (btn) {
                    if (!estado.abierta) { btn.textContent = '🔓 Abrir caja'; btn.className = 'btn btn-primary btn-sm'; }
                    else if (estado.cerrada) { btn.textContent = '🔒 Turno cerrado'; btn.className = 'btn btn-secondary btn-sm'; btn.disabled = true; }
                    else { btn.textContent = '🔒 Cerrar turno'; btn.className = 'btn btn-danger btn-sm'; btn.disabled = false; }
                }

                // Banner caja cerrada
                const banner = document.getElementById('banner-caja-cerrada');
                if (banner) banner.style.display = !estado.abierta ? '' : 'none';

                // Saldo inicial card
                const cardSaldo = document.getElementById('card-saldo-inicial');
                if (cardSaldo) cardSaldo.style.display = estado.abierta ? '' : 'none';
                if (estado.abierta) {
                    document.getElementById('caja-saldo-inicial-display').textContent = fmt(estado.saldoInicial);
                    document.getElementById('caja-saldo-final-display').textContent = fmt(saldoEfectivoFinal);
                    document.getElementById('caja-hora-apertura').textContent = `Apertura: ${estado.horaApertura}${estado.cerrada ? ' · Cierre: ' + estado.horaCierre : ''}`;
                    const badge = document.getElementById('caja-estado-badge');
                    if (badge) { badge.textContent = estado.cerrada ? '🔒 Cerrada' : '🟢 Abierta'; badge.className = 'badge ' + (estado.cerrada ? 'badge-red' : 'badge-green'); }
                }

                // KPIs
                document.getElementById('caja-total').textContent = fmt(totalVentas);
                document.getElementById('caja-efectivo-real').textContent = fmt(saldoEfectivoFinal);
                document.getElementById('caja-digital').textContent = fmt(digital);
                document.getElementById('caja-envios-total').textContent = fmt(totalEnvios);
                document.getElementById('caja-efectivo-detalle').textContent =
                    `${fmt(estado.saldoInicial)} inicial + ${fmt(efectivoCobrado)} cobrado − ${fmt(totalEnvios)} envíos`;

                // Tabla de movimientos
                const tbody = document.getElementById('tabla-caja');
                const todosMovs = [...ventas, ...enviosGasto].sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
                tbody.innerHTML = todosMovs.map(m => {
                    const p = pedidos.find(x => x.id === m.pedidoId);
                    const esSalida = m.tipo === 'envio_salida' || m.tipo === 'envio_gratis';
                    const conceptoLabel = m.tipo === 'envio_gratis' ? '🛵 Envío absorbido (gratis)' : m.tipo === 'envio_salida' ? '🛵 Pagar envío' : '💰 Venta';
                    const badgeClass = m.tipo === 'envio_gratis' ? 'badge-amber' : esSalida ? 'badge-red' : 'badge-green';
                    return `<tr style="${esSalida ? 'background:var(--red-dim)' : ''}">
      <td class="font-mono text-sm">${m.hora || '—'}</td>
      <td class="font-mono text-xs text-dim">#${(m.pedidoId || '').slice(-4).toUpperCase()}</td>
      <td>${m.cliente || '—'}</td>
      <td><span class="badge badge-gray">${m.metodo || '—'}</span></td>
      <td><span class="badge ${badgeClass}" style="font-size:10px">${conceptoLabel}</span></td>
      <td class="${esSalida ? 'highlight-red' : 'highlight-green'} font-mono">${esSalida ? '−' : ''}${fmt(m.monto)}</td>
      <td><span class="badge badge-gray" style="font-size:10px">${p?.estado || m.estado || '—'}</span></td>
    </tr>`;
                }).join('') || '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text3)">Sin movimientos hoy</td></tr>';
            }

            function openCorteCaja() { openCierreCaja(); }
            function confirmarCorte() { confirmarCierre(); }

            function exportarCaja() {
                const hoyStr = hoy();
                const movHoy = getMovimientosHoy();
                const csv = ['Hora,Pedido,Cliente,Método,Concepto,Monto,Estado'].concat(
                    movHoy.map(m => { const p = pedidos.find(x => x.id === m.pedidoId); return `${m.hora || ''},#${(m.pedidoId || '').slice(-4).toUpperCase()},${m.cliente || ''},${m.metodo || ''},${m.tipo || 'venta'},${m.monto || 0},${p?.estado || ''}`; })
                ).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `fitgo_caja_${hoyStr}.csv`; a.click();
                toast('Corte exportado');
            }

            // ========== PROVEEDORES ==========
            function renderProveedores() {
                const grid = document.getElementById('proveedores-grid');
                const catEmoji = { 'Carnes y proteínas': '🥩', 'Verduras y frutas': '🥦', 'Granos y cereales': '🌾', 'Lácteos': '🥛', 'Condimentos': '🧂', 'Bebidas': '🥤', 'Empaques': '📦', 'Otro': '📋' };
                grid.innerHTML = proveedores.map(p => `
    <div class="card" style="padding:16px">
      <div class="flex justify-between items-center mb-8">
        <span class="badge badge-gray">${catEmoji[p.categoria] || '📋'} ${p.categoria}</span>
        <button class="btn btn-danger btn-sm" onclick="eliminarProveedor('${p.id}')">🗑</button>
      </div>
      <div style="font-size:16px;font-weight:600;margin-bottom:4px">${p.nombre}</div>
      ${p.contacto ? `<div style="font-size:12px;color:var(--text3);margin-bottom:2px">👤 ${p.contacto}</div>` : ''}
      ${p.tel ? `<div style="font-size:12px;color:var(--blue);margin-bottom:8px">📞 ${p.tel}</div>` : ''}
      ${p.dias ? `<div class="badge badge-green" style="margin-bottom:8px">📅 ${p.dias}</div>` : ''}
      ${p.notas ? `<div style="font-size:12px;color:var(--text2);background:var(--bg3);border-radius:6px;padding:8px;margin-top:8px">${p.notas}</div>` : ''}
    </div>`).join('') || '<div class="empty" style="grid-column:1/-1"><div class="empty-icon">🚛</div><div class="empty-title">Sin proveedores</div></div>';
            }

            function openNuevoProveedor() {
                ['prov-nombre', 'prov-contacto', 'prov-tel', 'prov-dias', 'prov-notas'].forEach(id => document.getElementById(id).value = '');
                openModal('modal-proveedor');
            }

            function guardarProveedor() {
                const nombre = document.getElementById('prov-nombre').value.trim();
                if (!nombre) { toast('Ingresa el nombre del proveedor', 'error'); return; }
                const p = {
                    id: uid(),
                    nombre,
                    contacto: document.getElementById('prov-contacto').value,
                    tel: document.getElementById('prov-tel').value,
                    categoria: document.getElementById('prov-categoria').value,
                    dias: document.getElementById('prov-dias').value,
                    notas: document.getElementById('prov-notas').value,
                };
                proveedores.push(p);
                save();
                closeModal('modal-proveedor');
                toast('Proveedor agregado');
                renderProveedores();
            }

            function eliminarProveedor(id) {
                proveedores = proveedores.filter(p => p.id !== id);
                save();
                renderProveedores();
                toast('Proveedor eliminado');
            }

            // ========== CXP ==========
            function filtrarCxp(el, cat) {
                cxpCategoriaFiltro = cat;
                document.querySelectorAll('#page-cxp .chip').forEach(c => c.classList.remove('active'));
                el.classList.add('active');
                renderCXP();
            }
            function filtrarCxpEstado(val) { cxpEstadoFiltro = val; renderCXP(); }

            function setCxpTipo(el, tipo) {
                cxpTipoActual = tipo;
                document.querySelectorAll('#cxp-tipo-chips .chip').forEach(c => c.classList.remove('active'));
                el.classList.add('active');
                document.getElementById('cxp-prov-wrap').style.display = tipo === 'proveedor' ? 'block' : 'none';
                document.getElementById('cxp-acreedor-wrap').style.display = tipo !== 'proveedor' ? 'block' : 'none';
            }

            function renderCXP() {
                let lista = cxp;
                if (cxpCategoriaFiltro !== 'todas') lista = lista.filter(c => c.tipo === cxpCategoriaFiltro);
                if (cxpEstadoFiltro) lista = lista.filter(c => c.estado === cxpEstadoFiltro);

                const pendiente = cxp.filter(c => c.estado !== 'pagada');
                const total = pendiente.reduce((s, c) => s + c.monto, 0);
                const vencidas = pendiente.filter(c => c.estado === 'vencida').length;
                const porVencer = pendiente.filter(c => c.estado === 'pendiente' && c.vencimiento && new Date(c.vencimiento) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length;
                const ok = pendiente.filter(c => c.estado === 'pendiente' && (!c.vencimiento || new Date(c.vencimiento) > new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))).length;
                document.getElementById('cxp-total').textContent = fmt(total);
                document.getElementById('cxp-vencidas').textContent = vencidas;
                document.getElementById('cxp-porvencer').textContent = porVencer;
                document.getElementById('cxp-ok').textContent = ok;

                const tipoEmoji = { proveedor: '🚛', servicio: '🏢', otro: '📋' };
                const tbody = document.getElementById('tabla-cxp');
                tbody.innerHTML = lista.map(c => {
                    const badge = c.estado === 'pagada' ? 'badge-green' : c.estado === 'vencida' ? 'badge-red' : 'badge-amber';
                    const txt = c.estado === 'pagada' ? 'Pagada' : c.estado === 'vencida' ? 'Vencida' : 'Pendiente';
                    return `<tr>
      <td><span class="badge badge-gray">${tipoEmoji[c.tipo] || '📋'} ${c.tipo || 'proveedor'}</span></td>
      <td style="font-weight:500">${c.acreedor || c.proveedor || '—'}</td>
      <td>${c.concepto}</td>
      <td class="highlight-red font-mono">${fmt(c.monto)}</td>
      <td class="text-dim">${c.vencimiento ? fmtFecha(c.vencimiento) : '—'}</td>
      <td><span class="badge ${badge}">${txt}</span></td>
      <td><span class="badge badge-gray" style="font-size:10px">${c.estado === 'pagada' ? (c.metodoPagoRealizado || c.metodoPago || '—') : (c.metodoPago || 'Efectivo')}</span></td>
      <td class="text-dim text-sm">${c.notas || '—'}</td>
      <td>
        <div class="flex gap-6">
          ${c.estado !== 'pagada' ? `<button class="btn btn-secondary btn-sm" onclick="marcarPagada('${c.id}')">✓ Pagar</button>` : ''}
          <button class="btn btn-danger btn-sm" onclick="eliminarCuenta('${c.id}')">🗑</button>
        </div>
      </td>
    </tr>`;
                }).join('') || '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text3)">Sin cuentas registradas</td></tr>';
            }

            function openNuevaCuenta() {
                cxpTipoActual = 'proveedor';
                ['cxp-concepto', 'cxp-monto', 'cxp-notas', 'cxp-acreedor'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
                document.getElementById('cxp-vencimiento').value = '';
                document.getElementById('cxp-prov-wrap').style.display = 'block';
                document.getElementById('cxp-acreedor-wrap').style.display = 'none';
                document.querySelectorAll('#cxp-tipo-chips .chip').forEach((c, i) => c.classList.toggle('active', i === 0));
                const sel = document.getElementById('cxp-proveedor');
                sel.innerHTML = '<option value="">Seleccionar proveedor...</option>' + proveedores.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
                openModal('modal-cxp');
            }

            function guardarCuenta() {
                const monto = parseFloat(document.getElementById('cxp-monto').value) || 0;
                if (!monto) { toast('Ingresa el monto', 'error'); return; }
                const venc = document.getElementById('cxp-vencimiento').value;
                const estado = venc && new Date(venc) < new Date() ? 'vencida' : 'pendiente';
                let acreedor = '';
                if (cxpTipoActual === 'proveedor') {
                    const provId = document.getElementById('cxp-proveedor').value;
                    const prov = proveedores.find(p => p.id === provId);
                    acreedor = prov ? prov.nombre : 'Sin proveedor';
                } else {
                    acreedor = document.getElementById('cxp-acreedor').value.trim() || 'Sin especificar';
                }
                cxp.push({
                    id: uid(), tipo: cxpTipoActual, acreedor,
                    concepto: document.getElementById('cxp-concepto').value,
                    monto, vencimiento: venc, estado,
                    metodoPago: document.getElementById('cxp-metodo-pago')?.value || 'Efectivo',
                    notas: document.getElementById('cxp-notas').value,
                });
                save();
                closeModal('modal-cxp');
                toast('Cuenta registrada');
                renderCXP();
            }

            function marcarPagada(id) {
                const c = cxp.find(x => x.id === id);
                if (!c) return;
                // Mostrar mini modal de confirmación con método de pago
                const metodo = c.metodoPago || 'Efectivo';
                document.getElementById('pagar-cxp-id').value = id;
                document.getElementById('pagar-cxp-info').innerHTML = `
    <div class="flex justify-between mb-4"><span style="font-weight:600">${c.acreedor || c.proveedor}</span><span class="font-mono highlight-red">${fmt(c.monto)}</span></div>
    <div style="font-size:12px;color:var(--text2)">${c.concepto}</div>`;
                document.getElementById('pagar-cxp-metodo').value = metodo;
                document.getElementById('pagar-cxp-fecha').value = hoy();
                openModal('modal-pagar-cxp');
            }

            function confirmarPagoCXP() {
                const id = document.getElementById('pagar-cxp-id').value;
                const metodo = document.getElementById('pagar-cxp-metodo').value;
                const fecha = document.getElementById('pagar-cxp-fecha').value || hoy();
                const c = cxp.find(x => x.id === id);
                if (!c) return;
                c.estado = 'pagada';
                c.metodoPagoRealizado = metodo;
                c.fechaPago = fecha;
                // Registrar salida en movimientos de banco/caja
                if (!c._movRegistrado) {
                    movCaja.push({
                        hora: hora(), pedidoId: uid(), cliente: c.acreedor || c.proveedor || 'CxP',
                        metodo, monto: c.monto, tipo: 'pago_cxp', concepto: c.concepto,
                        estado: 'Pagado', fecha,
                    });
                    c._movRegistrado = true;
                }
                save();
                closeModal('modal-pagar-cxp');
                renderCXP();
                renderEstadosFinancieros();
                toast(`CxP pagada con ${metodo} — ${fmt(c.monto)}`);
            }

            function eliminarCuenta(id) {
                cxp = cxp.filter(c => c.id !== id);
                save(); renderCXP(); toast('Cuenta eliminada');
            }

            // ========== CXC ==========
            function renderCXC() {
                const pendientes = cxc.filter(c => c.estado !== 'cobrada');
                const total = pendientes.reduce((s, c) => s + c.monto, 0);
                const vencidas = pendientes.filter(c => c.estado === 'vencida').length;
                const porVencer = pendientes.filter(c => c.estado === 'pendiente' && c.vencimiento && new Date(c.vencimiento) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length;
                const ok = pendientes.filter(c => c.estado === 'pendiente' && (!c.vencimiento || new Date(c.vencimiento) > new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))).length;

                document.getElementById('cxc-total').textContent = fmt(total);
                document.getElementById('cxc-vencidas').textContent = vencidas;
                document.getElementById('cxc-porvencer').textContent = porVencer;
                document.getElementById('cxc-ok').textContent = ok;

                // Resumen por cliente (agrupado)
                const porCliente = {};
                pendientes.forEach(c => {
                    if (!porCliente[c.clienteNombre]) porCliente[c.clienteNombre] = { total: 0, cuentas: 0, vencidas: 0 };
                    porCliente[c.clienteNombre].total += c.monto;
                    porCliente[c.clienteNombre].cuentas++;
                    if (c.estado === 'vencida') porCliente[c.clienteNombre].vencidas++;
                });
                const resumenEl = document.getElementById('cxc-resumen-clientes');
                const clientesPendientes = Object.entries(porCliente);
                if (clientesPendientes.length === 0) {
                    resumenEl.innerHTML = '<div class="empty" style="padding:24px"><div class="empty-icon">✅</div><div class="empty-title">Sin cuentas pendientes</div></div>';
                } else {
                    resumenEl.innerHTML = clientesPendientes.map(([nombre, data]) => `
      <div class="flex items-center gap-12" style="padding:10px 0;border-bottom:1px solid var(--border);">
        <div class="avatar" style="background:var(--blue-dim);color:var(--blue)">${nombre[0]}</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:500">${nombre}</div>
          <div style="font-size:11px;color:var(--text3)">${data.cuentas} cargo${data.cuentas > 1 ? 's' : ''}${data.vencidas > 0 ? ` · <span style="color:var(--red)">${data.vencidas} vencida${data.vencidas > 1 ? 's' : ''}</span>` : ''}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:15px;font-weight:600;color:var(--blue)">${fmt(data.total)}</div>
          <div style="font-size:11px;color:var(--text3)">pendiente</div>
        </div>
      </div>`).join('');
                }

                // Tabla completa
                const tbody = document.getElementById('tabla-cxc');
                tbody.innerHTML = cxc.map(c => {
                    const badge = c.estado === 'cobrada' ? 'badge-green' : c.estado === 'vencida' ? 'badge-red' : 'badge-amber';
                    const txt = c.estado === 'cobrada' ? 'Cobrada' : c.estado === 'vencida' ? 'Vencida' : 'Pendiente';
                    return `<tr>
      <td style="font-weight:500">${c.clienteNombre}</td>
      <td>${c.concepto}</td>
      <td class="font-mono" style="color:var(--blue)">${fmt(c.monto)}</td>
      <td class="text-dim">${fmtFecha(c.fecha)}</td>
      <td class="text-dim">${c.vencimiento ? fmtFecha(c.vencimiento) : '—'}</td>
      <td><span class="badge ${badge}">${txt}</span></td>
      <td>
        <div class="flex gap-6">
          ${c.estado !== 'cobrada' ? `<button class="btn btn-secondary btn-sm" onclick="marcarCobrada('${c.id}')">✓ Cobrar</button>` : ''}
          <button class="btn btn-danger btn-sm" onclick="eliminarCxC('${c.id}')">🗑</button>
        </div>
      </td>
    </tr>`;
                }).join('') || '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text3)">Sin cuentas registradas</td></tr>';

                // Badge sidebar
                const badgeEl = document.getElementById('badge-cxc');
                if (vencidas > 0) { badgeEl.textContent = vencidas; badgeEl.style.display = ''; }
                else badgeEl.style.display = 'none';
            }

            function openNuevaCxC() {
                ['cxc-concepto', 'cxc-monto', 'cxc-notas'].forEach(id => document.getElementById(id).value = '');
                document.getElementById('cxc-vencimiento').value = '';
                const sel = document.getElementById('cxc-cliente');
                sel.innerHTML = '<option value="">Seleccionar cliente...</option>' + clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
                openModal('modal-cxc');
            }

            function guardarCxC() {
                const clienteId = document.getElementById('cxc-cliente').value;
                const clienteObj = clientes.find(c => c.id === clienteId);
                const monto = parseFloat(document.getElementById('cxc-monto').value) || 0;
                if (!monto) { toast('Ingresa el monto', 'error'); return; }
                const venc = document.getElementById('cxc-vencimiento').value;
                const estado = venc && new Date(venc) < new Date() ? 'vencida' : 'pendiente';
                cxc.push({
                    id: uid(),
                    clienteId, clienteNombre: clienteObj ? clienteObj.nombre : 'Sin cliente',
                    concepto: document.getElementById('cxc-concepto').value,
                    monto, vencimiento: venc, fecha: hoy(), estado,
                    notas: document.getElementById('cxc-notas').value,
                });
                save();
                closeModal('modal-cxc');
                toast('Cuenta por cobrar registrada');
                renderCXC();
            }

            function marcarCobrada(id) {
                const c = cxc.find(x => x.id === id);
                if (c) { c.estado = 'cobrada'; save(); renderCXC(); toast('¡Cobro registrado!'); }
            }

            function eliminarCxC(id) {
                cxc = cxc.filter(c => c.id !== id);
                save(); renderCXC(); toast('Registro eliminado');
            }

            // ========== CLIENTES ==========
            function renderClientes() {
                renderTablaClientes(clientes);
            }

            function renderTablaClientes(lista) {
                const tbody = document.getElementById('tabla-clientes');
                tbody.innerHTML = lista.map(c => `
    <tr>
      <td style="font-weight:500">${c.nombre}</td>
      <td class="font-mono text-sm">${c.tel || '—'}</td>
      <td><span class="badge badge-gray">${c.canal}</span></td>
      <td>${c.tieneDieta ? '<span class="badge badge-purple">📋 Sí</span>' : '<span class="badge badge-gray">No</span>'}</td>
      <td class="font-mono">${c.pedidos || 0}</td>
      <td class="text-dim">${c.ultimoPedido ? fmtFecha(c.ultimoPedido) : '—'}</td>
      <td><button class="btn btn-danger btn-sm" onclick="eliminarCliente('${c.id}')">🗑</button></td>
    </tr>`).join('') || '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text3)">Sin clientes registrados</td></tr>';
            }

            function buscarCliente(q) {
                renderTablaClientes(clientes.filter(c => c.nombre.toLowerCase().includes(q.toLowerCase()) || (c.tel || '').includes(q)));
            }

            function openNuevoCliente() {
                ['cli-nombre', 'cli-tel', 'cli-notas'].forEach(id => document.getElementById(id).value = '');
                openModal('modal-cliente');
            }

            function guardarCliente() {
                const nombre = document.getElementById('cli-nombre').value.trim();
                if (!nombre) { toast('Ingresa el nombre del cliente', 'error'); return; }
                clientes.push({
                    id: uid(),
                    nombre,
                    tel: document.getElementById('cli-tel').value,
                    canal: document.getElementById('cli-canal').value,
                    tieneDieta: document.getElementById('cli-dieta').value === 'true',
                    notas: document.getElementById('cli-notas').value,
                    pedidos: 0,
                    ultimoPedido: null,
                });
                save();
                closeModal('modal-cliente');
                toast('Cliente agregado');
                renderClientes();
            }

            function eliminarCliente(id) {
                clientes = clientes.filter(c => c.id !== id);
                save();
                renderClientes();
                toast('Cliente eliminado');
            }

            // ========== COMPRAS ==========
            function renderCompras() {
                const mes = new Date().getMonth();
                const anio = new Date().getFullYear();
                const comprasMes = compras.filter(c => {
                    const d = new Date(c.fecha + 'T12:00:00');
                    return d.getMonth() === mes && d.getFullYear() === anio;
                });
                const totalMes = comprasMes.reduce((s, c) => s + c.total, 0);
                const pendientes = compras.filter(c => c.estado === 'pendiente').length;
                const recibidas = compras.filter(c => c.estado === 'recibida').length;

                document.getElementById('compras-mes').textContent = fmt(totalMes);
                document.getElementById('compras-ordenes').textContent = comprasMes.length;
                document.getElementById('compras-pendientes').textContent = pendientes;
                document.getElementById('compras-recibidas').textContent = recibidas;

                // Sugerencias: ingredientes bajo mínimo
                const bajos = inventario.filter(i => i.stock <= i.minimo);
                const sugEl = document.getElementById('compras-sugerencias');
                if (bajos.length === 0) {
                    document.getElementById('compras-sugerencias-wrap').style.display = 'none';
                } else {
                    document.getElementById('compras-sugerencias-wrap').style.display = 'block';
                    sugEl.innerHTML = bajos.map(i => `
      <div class="flex items-center gap-12" style="padding:8px 0;border-bottom:1px solid var(--border)">
        <span class="dot ${i.stock === 0 ? 'dot-red' : 'dot-amber'}"></span>
        <span style="flex:1;font-size:13px">${i.nombre}</span>
        <span style="font-size:12px;color:var(--text3)">${i.stock} / mín ${i.minimo} ${i.unidad}</span>
        <span class="badge ${i.stock === 0 ? 'badge-red' : 'badge-amber'}">${i.stock === 0 ? 'Agotado' : 'Stock bajo'}</span>
      </div>`).join('');
                }

                // Tabla historial
                const tbody = document.getElementById('tabla-compras');
                tbody.innerHTML = [...compras].reverse().map(c => {
                    const badge = c.estado === 'recibida' ? 'badge-green' : 'badge-amber';
                    const txt = c.estado === 'recibida' ? '✅ Recibida' : '⏳ Pendiente';
                    return `<tr>
      <td class="text-dim">${fmtFecha(c.fecha)}</td>
      <td>${c.proveedor || '—'}</td>
      <td style="font-size:12px;color:var(--text2)">${c.lineas.slice(0, 2).map(l => l.nombre).join(', ')}${c.lineas.length > 2 ? ` +${c.lineas.length - 2}` : ''}</td>
      <td class="highlight-green font-mono">${fmt(c.total)}</td>
      <td><span class="badge ${badge}">${txt}</span></td>
      <td class="text-dim text-sm">${c.notas || '—'}</td>
      <td>
        <div class="flex gap-6">
          ${c.estado === 'pendiente' ? `<button class="btn btn-secondary btn-sm" onclick="recibirCompra('${c.id}')">✓ Recibir</button>` : ''}
          <button class="btn btn-secondary btn-sm" onclick="verDetalleCompra('${c.id}')">Ver</button>
        </div>
      </td>
    </tr>`;
                }).join('') || '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text3)">Sin compras registradas</td></tr>';
            }

            // ---- Líneas de compra ----
            function openNuevaCompra() {
                lineasCompraActual = [];
                document.getElementById('compra-modal-title').textContent = 'Nueva Compra de Insumos';
                document.getElementById('compra-fecha').value = hoy();
                document.getElementById('compra-notas').value = '';
                document.getElementById('compra-estado').value = 'recibida';
                document.getElementById('compra-genera-cxp').value = 'no';
                document.getElementById('panel-compra-cxp').style.display = 'none';
                const sel = document.getElementById('compra-proveedor');
                sel.innerHTML = '<option value="">Sin proveedor / mercado</option>' +
                    proveedores.map(p => `<option value="${p.nombre}">${p.nombre}</option>`).join('');
                renderLineasCompra();
                openModal('modal-compra');
            }

            function agregarLineaCompra() {
                lineasCompraActual.push({ ingId: '', nombre: '', cantidad: 0, costoUnit: 0 });
                renderLineasCompra();
            }

            function renderLineasCompra() {
                const cont = document.getElementById('compra-lineas');
                if (lineasCompraActual.length === 0) {
                    cont.innerHTML = '<div style="padding:12px;text-align:center;font-size:12px;color:var(--text3)">Agrega los ingredientes que compraste</div>';
                    document.getElementById('compra-total-display').textContent = '$0.00';
                    return;
                }
                cont.innerHTML = lineasCompraActual.map((l, idx) => {
                    const sub = (l.cantidad || 0) * (l.costoUnit || 0);
                    return `
    <div style="display:grid;grid-template-columns:1fr 80px 90px 100px 36px;gap:0;padding:7px 10px;border-top:1px solid var(--border);align-items:center;">
      <select class="form-input" style="font-size:12px;padding:5px 8px;border-radius:4px"
              onchange="actualizarLineaCompra(${idx},'ingId',this.value,this.options[this.selectedIndex].text)">
        <option value="">Seleccionar...</option>
        ${inventario.map(i => `<option value="${i.id}" ${i.id === l.ingId ? 'selected' : ''}>${i.nombre} (${i.unidad})</option>`).join('')}
      </select>
      <input type="number" class="form-input" style="font-size:12px;padding:5px 8px;border-radius:4px;margin-left:6px"
             placeholder="0" value="${l.cantidad || ''}"
             onchange="actualizarLineaCompra(${idx},'cantidad',parseFloat(this.value)||0)">
      <input type="number" class="form-input" style="font-size:12px;padding:5px 8px;border-radius:4px;margin-left:6px"
             placeholder="0.00" value="${l.costoUnit || ''}"
             onchange="actualizarLineaCompra(${idx},'costoUnit',parseFloat(this.value)||0)">
      <span class="font-mono" style="font-size:12px;color:var(--green);padding-left:8px">${fmt(sub)}</span>
      <button onclick="eliminarLineaCompra(${idx})" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:16px;padding:0 4px;">×</button>
    </div>`;
                }).join('');
                recalcularTotalCompra();
            }

            function actualizarLineaCompra(idx, campo, valor, texto) {
                if (campo === 'ingId') {
                    lineasCompraActual[idx].ingId = valor;
                    lineasCompraActual[idx].nombre = texto?.replace(/\s*\(.*\)$/, '') || '';
                    // Autocompletar costo unitario del inventario
                    const ing = inventario.find(i => i.id === valor);
                    if (ing) lineasCompraActual[idx].costoUnit = ing.costo;
                    renderLineasCompra(); return;
                }
                lineasCompraActual[idx][campo] = valor;
                recalcularTotalCompra();
            }

            function eliminarLineaCompra(idx) {
                lineasCompraActual.splice(idx, 1);
                renderLineasCompra();
            }

            function recalcularTotalCompra() {
                const total = lineasCompraActual.reduce((s, l) => s + (l.cantidad || 0) * (l.costoUnit || 0), 0);
                document.getElementById('compra-total-display').textContent = fmt(total);
                // Actualizar subtotales en DOM sin re-render completo
                const celdas = document.querySelectorAll('#compra-lineas > div span.font-mono');
                lineasCompraActual.forEach((l, i) => {
                    if (celdas[i]) celdas[i].textContent = fmt((l.cantidad || 0) * (l.costoUnit || 0));
                });
            }

            function toggleCompraCredito(val) {
                document.getElementById('panel-compra-cxp').style.display = val === 'si' ? 'block' : 'none';
            }

            function guardarCompra() {
                const lineasValidas = lineasCompraActual.filter(l => l.ingId && l.cantidad > 0);
                if (lineasValidas.length === 0) { toast('Agrega al menos un ingrediente', 'error'); return; }
                const total = lineasValidas.reduce((s, l) => s + (l.cantidad || 0) * (l.costoUnit || 0), 0);
                const estado = document.getElementById('compra-estado').value;
                const proveedor = document.getElementById('compra-proveedor').value;
                const fechaCompra = document.getElementById('compra-fecha').value || hoy();

                // Si está recibida, actualizar inventario
                if (estado === 'recibida') {
                    lineasValidas.forEach(l => {
                        const ing = inventario.find(i => i.id === l.ingId);
                        if (ing) {
                            ing.stock = +(ing.stock + l.cantidad).toFixed(3);
                            // Actualizar costo: usar presentación predeterminada si existe, si no usar el costo capturado
                            const presDefault = presentaciones.find(p => p.ingId === l.ingId && p.esDefault);
                            if (presDefault) {
                                ing.costo = presDefault.costoUnit;
                            } else if (l.costoUnit > 0) {
                                ing.costo = l.costoUnit;
                            }
                        }
                    });
                }

                const compra = {
                    id: uid(), fecha: fechaCompra, proveedor, lineas: lineasValidas,
                    total, estado, notas: document.getElementById('compra-notas').value,
                };
                compras.push(compra);

                // Generar CxP si se indica
                if (document.getElementById('compra-genera-cxp').value === 'si') {
                    const venc = document.getElementById('compra-cxp-vencimiento').value;
                    cxp.push({
                        id: uid(), tipo: 'proveedor', acreedor: proveedor || 'Proveedor de compra',
                        concepto: `Compra de insumos ${fmtFecha(fechaCompra)}`,
                        monto: total, vencimiento: venc,
                        estado: venc && new Date(venc) < new Date() ? 'vencida' : 'pendiente',
                        notas: `Compra ID ${compra.id.slice(-4).toUpperCase()}`,
                    });
                }

                save();
                closeModal('modal-compra');
                toast(`Compra registrada${estado === 'recibida' ? ' — inventario actualizado' : ' — pendiente de recibir'}`);
                renderCompras();
                renderInventario();
            }

            function recibirCompra(id) {
                const c = compras.find(x => x.id === id);
                if (!c) return;
                c.estado = 'recibida';
                // Actualizar inventario al recibir
                c.lineas.forEach(l => {
                    const ing = inventario.find(i => i.id === l.ingId);
                    if (ing) {
                        ing.stock = +(ing.stock + l.cantidad).toFixed(3);
                        if (l.costoUnit > 0) ing.costo = l.costoUnit;
                    }
                });
                save();
                toast('Compra recibida — inventario actualizado ✅');
                renderCompras();
                renderInventario();
            }

            function generarOrdenSugerida() {
                const bajos = inventario.filter(i => i.stock <= i.minimo && i.id);
                if (bajos.length === 0) { toast('No hay ingredientes por reponer'); return; }
                lineasCompraActual = bajos.map(i => ({ ingId: i.id, nombre: i.nombre, cantidad: Math.max(i.minimo * 2 - i.stock, i.minimo), costoUnit: i.costo }));
                document.getElementById('compra-fecha').value = hoy();
                document.getElementById('compra-notas').value = 'Orden generada automáticamente por stock bajo';
                renderLineasCompra();
                openModal('modal-compra');
            }

            function verDetalleCompra(id) {
                const c = compras.find(x => x.id === id);
                if (!c) return;
                document.getElementById('detalle-compra-body').innerHTML = `
    <div class="grid grid-2 mb-16" style="font-size:13px">
      <div><span class="text-dim">Fecha:</span> <strong>${fmtFecha(c.fecha)}</strong></div>
      <div><span class="text-dim">Proveedor:</span> ${c.proveedor || '—'}</div>
      <div><span class="text-dim">Estado:</span> <span class="badge ${c.estado === 'recibida' ? 'badge-green' : 'badge-amber'}">${c.estado === 'recibida' ? 'Recibida' : 'Pendiente'}</span></div>
      <div><span class="text-dim">Total:</span> <strong class="highlight-green">${fmt(c.total)}</strong></div>
    </div>
    <div style="margin-bottom:12px">
      <div class="text-dim mb-8" style="font-size:12px">INGREDIENTES</div>
      <div style="border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden">
        <div style="display:grid;grid-template-columns:1fr 80px 90px 90px;padding:7px 12px;background:var(--bg3);font-size:11px;color:var(--text3);font-weight:500">
          <span>INGREDIENTE</span><span>CANT.</span><span>COSTO/U</span><span>SUBTOTAL</span>
        </div>
        ${c.lineas.map(l => `
          <div style="display:grid;grid-template-columns:1fr 80px 90px 90px;padding:9px 12px;border-top:1px solid var(--border);font-size:13px">
            <span>${l.nombre}</span>
            <span class="font-mono">${l.cantidad}</span>
            <span class="font-mono text-dim">${fmt(l.costoUnit)}</span>
            <span class="font-mono highlight-green">${fmt(l.cantidad * l.costoUnit)}</span>
          </div>`).join('')}
      </div>
    </div>
    ${c.notas ? `<div class="card card-sm" style="background:var(--bg3);font-size:12px">📝 ${c.notas}</div>` : ''}`;
                document.getElementById('detalle-compra-footer').innerHTML =
                    `<button class="btn btn-secondary" onclick="closeModal('modal-detalle-compra')">Cerrar</button>
     ${c.estado === 'pendiente' ? `<button class="btn btn-primary" onclick="recibirCompra('${c.id}');closeModal('modal-detalle-compra')">✓ Marcar como recibida</button>` : ''}`;
                openModal('modal-detalle-compra');
            }

            // ========== REPORTES ==========
            let repTabActual = 'ventas';

            function switchRepTab(el, tab) {
                repTabActual = tab;
                document.querySelectorAll('#rep-tabs .tab').forEach(t => t.classList.remove('active'));
                el.classList.add('active');
                ['ventas', 'platillos', 'clientes', 'inventario', 'finanzas', 'estados'].forEach(t => {
                    const el = document.getElementById(`rep-tab-${t}`);
                    if (el) el.style.display = t === tab ? 'block' : 'none';
                });
                if (tab === 'estados') renderEstadosFinancieros();
            }

            function cambiarPeriodo(val) {
                const diaEl = document.getElementById('reporte-dia');
                const desdeEl = document.getElementById('reporte-desde');
                const hastaEl = document.getElementById('reporte-hasta');
                const sepEl = document.getElementById('reporte-rango-sep');
                diaEl.style.display = val === 'dia' ? 'block' : 'none';
                desdeEl.style.display = val === 'rango' ? 'block' : 'none';
                hastaEl.style.display = val === 'rango' ? 'block' : 'none';
                sepEl.style.display = val === 'rango' ? 'inline' : 'none';
                if (val === 'dia' && !diaEl.value) diaEl.value = hoy();
                renderReportes();
            }

            function getPeriodoDias() {
                const val = document.getElementById('reporte-periodo')?.value || '30';
                if (val === 'dia' || val === 'rango') return null;
                return val === 'todo' ? 36500 : parseInt(val);
            }

            function pedidosEnPeriodo() {
                const val = document.getElementById('reporte-periodo')?.value || '30';
                const cancelados = p => p.estado !== 'Cancelado';

                if (val === 'dia') {
                    const dia = document.getElementById('reporte-dia')?.value || hoy();
                    return pedidos.filter(p => cancelados(p) && p.fecha === dia);
                }
                if (val === 'rango') {
                    const desde = document.getElementById('reporte-desde')?.value;
                    const hasta = document.getElementById('reporte-hasta')?.value;
                    if (!desde || !hasta) return pedidos.filter(cancelados);
                    return pedidos.filter(p => cancelados(p) && p.fecha >= desde && p.fecha <= hasta);
                }
                const dias = val === 'todo' ? 36500 : parseInt(val);
                const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
                return pedidos.filter(p => cancelados(p) && new Date(p.fecha + 'T12:00:00') >= desde);
            }

            function renderReportes() {
                const lista = pedidosEnPeriodo();
                const totalVentas = lista.reduce((s, p) => s + (p.subtotal || p.total || 0), 0);
                const totalPedidos = lista.length;
                const ticket = totalPedidos ? totalVentas / totalPedidos : 0;
                const conDesc = lista.filter(p => p.descuento > 0).length;
                const totalDescuentos = lista.reduce((s, p) => s + (p.descuento || 0), 0);

                // KPIs
                document.getElementById('rep-kpis').innerHTML = `
    <div class="card card-sm" style="border-color:rgba(74,222,128,0.2)">
      <div class="card-title">Ventas período</div>
      <div class="metric-big highlight-green" style="font-size:22px">${fmt(totalVentas)}</div>
    </div>
    <div class="card card-sm">
      <div class="card-title">Pedidos</div>
      <div class="metric-big" style="font-size:22px">${totalPedidos}</div>
    </div>
    <div class="card card-sm">
      <div class="card-title">Ticket promedio</div>
      <div class="metric-big" style="font-size:22px">${fmt(ticket)}</div>
    </div>
    <div class="card card-sm" style="border-color:rgba(251,191,36,0.2)">
      <div class="card-title">Descuentos otorgados</div>
      <div class="metric-big highlight-amber" style="font-size:22px">${fmt(totalDescuentos)}</div>
      <div style="font-size:11px;color:var(--text3)">${conDesc} pedidos</div>
    </div>
    <div class="card card-sm" style="border-color:rgba(96,165,250,0.2)">
      <div class="card-title">Clientes únicos</div>
      <div class="metric-big" style="color:var(--blue);font-size:22px">${new Set(lista.map(p => p.clienteId || p.cliente)).size}</div>
    </div>`;

                renderTabVentas(lista);
                renderTabPlatillos(lista);
                renderTabClientes(lista);
                renderTabInventario(lista);
                renderTabFinanzas(lista);
            }

            // ---- TAB VENTAS ----
            function renderTabVentas(lista) {
                // Agrupar por día
                const porDia = {};
                lista.forEach(p => {
                    if (!porDia[p.fecha]) porDia[p.fecha] = { pedidos: 0, ventas: 0, canales: {}, descuentos: 0 };
                    porDia[p.fecha].pedidos++;
                    porDia[p.fecha].ventas += p.subtotal || p.total || 0;
                    porDia[p.fecha].canales[p.canal] = (porDia[p.fecha].canales[p.canal] || 0) + 1;
                    porDia[p.fecha].descuentos += p.descuento || 0;
                });
                const dias = Object.keys(porDia).sort();
                const maxVenta = Math.max(...dias.map(d => porDia[d].ventas), 1);

                // Gráfica de barras SVG
                const W = 100, barW = dias.length > 0 ? Math.max(8, Math.min(40, Math.floor(700 / dias.length) - 4)) : 20;
                const grafH = 140;
                const bars = dias.map((dia, i) => {
                    const v = porDia[dia].ventas;
                    const h = Math.max(3, Math.round((v / maxVenta) * grafH));
                    const x = 20 + i * (barW + 4);
                    const color = v === maxVenta ? 'var(--green)' : 'rgba(74,222,128,0.4)';
                    const fechaCorta = new Date(dia + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' });
                    return `<g>
      <rect x="${x}" y="${grafH + 10 - h}" width="${barW}" height="${h}" rx="3" fill="${color}"/>
      <title>${fechaCorta}: ${fmt(v)} (${porDia[dia].pedidos} pedidos)</title>
    </g>`;
                }).join('');
                const svgW = Math.max(400, 40 + dias.length * (barW + 4));
                document.getElementById('rep-grafica-ventas').innerHTML = dias.length === 0
                    ? '<div class="empty" style="padding:24px"><div class="empty-text">Sin datos en este período</div></div>'
                    : `<div style="overflow-x:auto"><svg width="${svgW}" height="${grafH + 30}" style="display:block">
        ${bars}
        ${dias.map((dia, i) => {
                        const x = 20 + i * (barW + 4) + barW / 2;
                        const fechaCorta = new Date(dia + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' });
                        return dias.length <= 14 ? `<text x="${x}" y="${grafH + 26}" text-anchor="middle" font-size="9" fill="var(--text3)">${fechaCorta}</text>` : '';
                    }).join('')}
      </svg></div>
      <div style="display:flex;gap:16px;margin-top:8px;flex-wrap:wrap">
        ${dias.slice(-3).map(d => `<span style="font-size:11px;color:var(--text3)">${new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short' })}: <strong style="color:var(--text)">${fmt(porDia[d].ventas)}</strong></span>`).join('')}
      </div>`;

                // Canales
                const canales = {};
                lista.forEach(p => canales[p.canal] = (canales[p.canal] || 0) + (p.subtotal || p.total || 0));
                const totalCanal = Object.values(canales).reduce((s, v) => s + v, 0) || 1;
                const canalEmoji = { WhatsApp: '💬', Presencial: '🏠', Instagram: '📸', Facebook: '👥', 'Teléfono': '📞' };
                document.getElementById('rep-canales').innerHTML = Object.entries(canales).sort((a, b) => b[1] - a[1]).map(([c, v]) => `
    <div style="margin-bottom:14px">
      <div class="flex justify-between mb-4">
        <span style="font-size:13px">${canalEmoji[c] || '📱'} ${c}</span>
        <span class="font-mono text-sm">${fmt(v)} · ${Math.round(v / totalCanal * 100)}%</span>
      </div>
      <div class="stat-bar"><div class="stat-bar-fill" style="width:${v / totalCanal * 100}%;background:var(--blue)"></div></div>
    </div>`).join('') || '<div class="empty" style="padding:16px"><div class="empty-text">Sin datos</div></div>';

                // Tabla días
                document.getElementById('rep-tabla-ventas').innerHTML = dias.reverse().map(dia => {
                    const d = porDia[dia];
                    const canalTop = Object.entries(d.canales).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
                    return `<tr>
      <td>${new Date(dia + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</td>
      <td class="font-mono">${d.pedidos}</td>
      <td class="highlight-green font-mono">${fmt(d.ventas)}</td>
      <td class="font-mono">${fmt(d.pedidos ? d.ventas / d.pedidos : 0)}</td>
      <td class="font-mono ${d.descuentos > 0 ? 'highlight-amber' : ''}">${d.descuentos > 0 ? fmt(d.descuentos) : '—'}</td>
      <td><span class="badge badge-gray">${canalTop}</span></td>
    </tr>`;
                }).join('') || '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text3)">Sin ventas en este período</td></tr>';
            }

            // ---- TAB PLATILLOS ----
            function renderTabPlatillos(lista) {
                const conteo = {};
                lista.forEach(p => p.items.forEach(it => {
                    const n = it.nombre || it;
                    if (!conteo[n]) conteo[n] = { ventas: 0, ingresos: 0 };
                    conteo[n].ventas += it.cantidad || 1;
                    conteo[n].ingresos += (it.precio || 0) * (it.cantidad || 1);
                }));
                const top = Object.entries(conteo).sort((a, b) => b[1].ventas - a[1].ventas);
                const maxV = top[0]?.[1].ventas || 1;

                // Top vendidos
                document.getElementById('rep-top-platillos').innerHTML = top.slice(0, 8).map(([nombre, d], i) => `
    <div style="margin-bottom:12px">
      <div class="flex justify-between mb-4">
        <span style="font-size:13px"><span style="color:var(--text3);margin-right:6px">${i + 1}.</span>${nombre}</span>
        <span class="font-mono text-sm">${d.ventas} uds · ${fmt(d.ingresos)}</span>
      </div>
      <div class="stat-bar"><div class="stat-bar-fill" style="width:${d.ventas / maxV * 100}%"></div></div>
    </div>`).join('') || '<div class="empty" style="padding:16px"><div class="empty-text">Sin datos</div></div>';

                // Rentabilidad
                const menuConDatos = menu.map(m => {
                    const datos = conteo[m.nombre];
                    const margen = m.precio && m.costo ? ((m.precio - m.costo) / m.precio * 100) : 0;
                    const foodCost = m.precio ? (m.costo / m.precio * 100) : 0;
                    return { ...m, vendidos: datos?.ventas || 0, ingresos: datos?.ingresos || 0, margen, foodCost };
                }).filter(m => m.vendidos > 0).sort((a, b) => b.margen - a.margen);

                document.getElementById('rep-rentabilidad').innerHTML = menuConDatos.slice(0, 6).map(m => {
                    const color = m.margen >= 50 ? 'var(--green)' : m.margen >= 30 ? 'var(--amber)' : 'var(--red)';
                    return `<div style="margin-bottom:12px">
      <div class="flex justify-between mb-4">
        <span style="font-size:13px">${m.nombre}</span>
        <span style="font-size:12px;font-weight:600;color:${color}">${Math.round(m.margen)}% margen</span>
      </div>
      <div class="stat-bar"><div class="stat-bar-fill" style="width:${Math.min(m.margen, 100)}%;background:${color}"></div></div>
    </div>`;
                }).join('') || '<div class="empty" style="padding:16px"><div class="empty-text">Sin ventas registradas</div></div>';

                // Tabla completa
                const todosMenu = menu.map(m => {
                    const datos = conteo[m.nombre];
                    const margen = m.precio && m.costo ? ((m.precio - m.costo) / m.precio * 100) : 0;
                    const foodCost = m.precio ? (m.costo / m.precio * 100) : 0;
                    const semaforo = margen >= 50 ? '🟢' : margen >= 30 ? '🟡' : '🔴';
                    return { ...m, vendidos: datos?.ventas || 0, ingresos: datos?.ingresos || 0, margen, foodCost, semaforo };
                }).sort((a, b) => b.vendidos - a.vendidos);

                document.getElementById('rep-tabla-platillos').innerHTML = todosMenu.map(m => `<tr>
    <td style="font-weight:500">${m.nombre}</td>
    <td class="font-mono">${m.vendidos}</td>
    <td class="highlight-green font-mono">${fmt(m.ingresos)}</td>
    <td class="font-mono text-dim">${fmt(m.costo)}</td>
    <td class="font-mono">${fmt(m.precio)}</td>
    <td style="color:${m.margen >= 50 ? 'var(--green)' : m.margen >= 30 ? 'var(--amber)' : 'var(--red)'};font-weight:600">${Math.round(m.margen)}%</td>
    <td style="color:${m.foodCost <= 35 ? 'var(--green)' : m.foodCost <= 50 ? 'var(--amber)' : 'var(--red)'}">${Math.round(m.foodCost)}%</td>
    <td style="font-size:16px">${m.semaforo}</td>
  </tr>`).join('') || '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text3)">Sin platillos</td></tr>';
            }

            // ---- TAB CLIENTES ----
            function renderTabClientes(lista) {
                const porCliente = {};
                lista.forEach(p => {
                    const k = p.clienteId || p.cliente;
                    if (!porCliente[k]) porCliente[k] = { nombre: p.cliente, pedidos: 0, total: 0, canal: p.canal, ultimo: p.fecha };
                    porCliente[k].pedidos++;
                    porCliente[k].total += p.subtotal || p.total || 0;
                    if (p.fecha > porCliente[k].ultimo) porCliente[k].ultimo = p.fecha;
                });
                const topC = Object.values(porCliente).sort((a, b) => b.total - a.total);
                const maxT = topC[0]?.total || 1;

                document.getElementById('rep-top-clientes').innerHTML = topC.slice(0, 8).map((c, i) => `
    <div style="margin-bottom:12px">
      <div class="flex justify-between mb-4">
        <span style="font-size:13px"><span style="color:var(--text3);margin-right:6px">${i + 1}.</span>${c.nombre}</span>
        <span class="font-mono text-sm">${c.pedidos} pedidos · ${fmt(c.total)}</span>
      </div>
      <div class="stat-bar"><div class="stat-bar-fill" style="width:${c.total / maxT * 100}%;background:var(--blue)"></div></div>
    </div>`).join('') || '<div class="empty" style="padding:16px"><div class="empty-text">Sin datos</div></div>';

                // Canal preferido clientes
                const canalesC = {};
                Object.values(porCliente).forEach(c => canalesC[c.canal] = (canalesC[c.canal] || 0) + 1);
                const totalCC = Object.values(canalesC).reduce((s, v) => s + v, 0) || 1;
                const canalEmoji = { WhatsApp: '💬', Presencial: '🏠', Instagram: '📸', Facebook: '👥', 'Teléfono': '📞' };
                document.getElementById('rep-clientes-canal').innerHTML = Object.entries(canalesC).sort((a, b) => b[1] - a[1]).map(([c, n]) => `
    <div style="margin-bottom:14px">
      <div class="flex justify-between mb-4">
        <span style="font-size:13px">${canalEmoji[c] || '📱'} ${c}</span>
        <span class="font-mono text-sm">${n} clientes · ${Math.round(n / totalCC * 100)}%</span>
      </div>
      <div class="stat-bar"><div class="stat-bar-fill" style="width:${n / totalCC * 100}%;background:var(--purple)"></div></div>
    </div>`).join('');

                document.getElementById('rep-tabla-clientes').innerHTML = topC.map(c => {
                    const cli = clientes.find(x => x.nombre === c.nombre);
                    return `<tr>
      <td style="font-weight:500">${c.nombre}</td>
      <td class="font-mono">${c.pedidos}</td>
      <td class="font-mono highlight-green">${fmt(c.total)}</td>
      <td class="font-mono">${fmt(c.pedidos ? c.total / c.pedidos : 0)}</td>
      <td class="text-dim">${fmtFecha(c.ultimo)}</td>
      <td><span class="badge badge-gray">${c.canal}</span></td>
      <td>${cli?.tieneDieta ? '<span class="badge badge-purple">📋 Sí</span>' : '—'}</td>
    </tr>`;
                }).join('') || '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text3)">Sin datos</td></tr>';
            }

            // ---- TAB INVENTARIO/CONSUMO ----
            function renderTabInventario(lista) {
                // Consumo estimado por ingrediente (de recetas × unidades vendidas)
                const consumo = {};
                lista.forEach(p => p.items.forEach(it => {
                    const platillo = menu.find(m => m.nombre === (it.nombre || it));
                    if (platillo?.receta?.length) {
                        platillo.receta.forEach(l => {
                            const ing = inventario.find(i => i.id === l.ingId);
                            if (!ing) return;
                            if (!consumo[ing.nombre]) consumo[ing.nombre] = { unidad: ing.unidad, total: 0, costo: 0 };
                            consumo[ing.nombre].total += l.cantidad * (it.cantidad || 1);
                            consumo[ing.nombre].costo += l.cantidad * (it.cantidad || 1) * ing.costo;
                        });
                    }
                }));
                const topI = Object.entries(consumo).sort((a, b) => b[1].total - a[1].total);
                const maxI = topI[0]?.[1].total || 1;

                document.getElementById('rep-consumo-ingredientes').innerHTML = topI.slice(0, 8).map(([nombre, d]) => `
    <div style="margin-bottom:12px">
      <div class="flex justify-between mb-4">
        <span style="font-size:13px">${nombre}</span>
        <span class="font-mono text-sm">${d.total.toFixed(2)} ${d.unidad} · ${fmt(d.costo)}</span>
      </div>
      <div class="stat-bar"><div class="stat-bar-fill" style="width:${d.total / maxI * 100}%;background:var(--amber)"></div></div>
    </div>`).join('') || '<div class="empty" style="padding:16px"><div class="empty-text">Agrega recetas a tus platillos para ver el consumo</div></div>';

                // Valor inventario por categoría
                const valCat = {};
                inventario.forEach(i => {
                    if (!valCat[i.categoria]) valCat[i.categoria] = 0;
                    valCat[i.categoria] += i.stock * i.costo;
                });
                const totalVal = Object.values(valCat).reduce((s, v) => s + v, 0);
                document.getElementById('rep-valor-inventario').innerHTML = `
    <div style="text-align:center;margin-bottom:16px">
      <div style="font-size:11px;color:var(--text3);margin-bottom:4px">VALOR TOTAL EN INVENTARIO</div>
      <div style="font-size:28px;font-weight:700;color:var(--green);font-family:'DM Mono',monospace">${fmt(totalVal)}</div>
    </div>
    ${Object.entries(valCat).sort((a, b) => b[1] - a[1]).map(([cat, val]) => `
      <div style="margin-bottom:10px">
        <div class="flex justify-between mb-4">
          <span style="font-size:13px">${cat}</span>
          <span class="font-mono text-sm">${fmt(val)}</span>
        </div>
        <div class="stat-bar"><div class="stat-bar-fill" style="width:${totalVal ? val / totalVal * 100 : 0}%;background:var(--amber)"></div></div>
      </div>`).join('')}`;

                // Tabla compras del período
                const dias = getPeriodoDias();
                const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
                const comprasPeriodo = compras.filter(c => new Date(c.fecha + 'T12:00:00') >= desde);
                document.getElementById('rep-tabla-compras').innerHTML = comprasPeriodo.reverse().map(c => {
                    const itemsTexto = c.lineas.slice(0, 2).map(l => l.nombre).join(', ') + (c.lineas.length > 2 ? ' +' + (c.lineas.length - 2) : '');
                    return `<tr>
    <td class="text-dim">${fmtFecha(c.fecha)}</td>
    <td>${c.proveedor || '—'}</td>
    <td style="font-size:12px;color:var(--text2)">${itemsTexto}</td>
    <td class="highlight-green font-mono">${fmt(c.total)}</td>
    <td><span class="badge ${c.estado === 'recibida' ? 'badge-green' : 'badge-amber'}">${c.estado === 'recibida' ? 'Recibida' : 'Pendiente'}</span></td>
  </tr>`;
                }).join('') || '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text3)">Sin compras en este período</td></tr>';
            }

            // ---- TAB FINANZAS ----
            function renderTabFinanzas(lista) {
                const ventas = lista.reduce((s, p) => s + (p.subtotal || p.total || 0), 0);
                const descuentos = lista.reduce((s, p) => s + (p.descuento || 0), 0);
                const diasP = getPeriodoDias();
                const desde = new Date(Date.now() - diasP * 24 * 60 * 60 * 1000);
                const comprasPeriodo = compras.filter(c => new Date(c.fecha + 'T12:00:00') >= desde);
                const costoCompras = comprasPeriodo.reduce((s, c) => s + c.total, 0);
                const cxpPend = cxp.filter(c => c.estado !== 'pagada').reduce((s, c) => s + c.monto, 0);
                const cxcPend = cxc.filter(c => c.estado !== 'cobrada').reduce((s, c) => s + c.monto, 0);
                const utilidad = ventas - costoCompras;
                const margenNeto = ventas ? (utilidad / ventas * 100) : 0;
                const foodCostPct = ventas ? (costoCompras / ventas * 100) : 0;

                document.getElementById('rep-resumen-financiero').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:12px">
      ${[
                        ['Ingresos por ventas', ventas, 'var(--green)', true],
                        ['Descuentos otorgados', -descuentos, 'var(--amber)', false],
                        ['Costo de compras (período)', -costoCompras, 'var(--red)', false],
                        ['Utilidad bruta estimada', utilidad, utilidad >= 0 ? 'var(--green)' : 'var(--red)', true],
                    ].map(([label, val, color, bold]) => `
        <div class="flex justify-between items-center" style="padding:8px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:13px${bold ? ';font-weight:600' : ''}">${label}</span>
          <span class="font-mono" style="color:${color};font-weight:${bold ? 700 : 400}">${val >= 0 ? fmt(val) : '-' + fmt(Math.abs(val))}</span>
        </div>`).join('')}
      <div class="flex justify-between" style="padding:8px 0">
        <span style="font-size:12px;color:var(--text3)">Food cost %</span>
        <span style="font-size:13px;font-weight:600;color:${foodCostPct <= 35 ? 'var(--green)' : foodCostPct <= 50 ? 'var(--amber)' : 'var(--red)'}">${Math.round(foodCostPct)}%</span>
      </div>
      <div class="flex justify-between" style="padding:8px 0">
        <span style="font-size:12px;color:var(--text3)">Margen neto estimado</span>
        <span style="font-size:13px;font-weight:600;color:${margenNeto >= 30 ? 'var(--green)' : margenNeto >= 10 ? 'var(--amber)' : 'var(--red)'}">${Math.round(margenNeto)}%</span>
      </div>
    </div>`;

                // CxP por proveedor
                const cxpPorProv = {};
                cxp.filter(c => c.estado !== 'pagada').forEach(c => {
                    const k = c.acreedor || c.proveedor || 'Sin especificar';
                    cxpPorProv[k] = (cxpPorProv[k] || 0) + c.monto;
                });
                document.getElementById('rep-cxp-resumen').innerHTML = Object.entries(cxpPorProv).sort((a, b) => b[1] - a[1]).map(([prov, monto]) => `
    <div class="flex justify-between items-center" style="padding:9px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:13px">${prov}</span>
      <span class="font-mono highlight-red">${fmt(monto)}</span>
    </div>`).join('') || '<div class="empty" style="padding:16px"><div class="empty-text">Sin cuentas pendientes 🎉</div></div>';

                // Comparativo: período actual vs anterior
                const diasComp = diasP === 36500 ? 30 : diasP;
                const desdeAnterior = new Date(Date.now() - (diasComp * 2) * 24 * 60 * 60 * 1000);
                const desdeActual = new Date(Date.now() - diasComp * 24 * 60 * 60 * 1000);
                const anterior = pedidos.filter(p => p.estado !== 'Cancelado' && new Date(p.fecha + 'T12:00:00') >= desdeAnterior && new Date(p.fecha + 'T12:00:00') < desdeActual);
                const actual = pedidos.filter(p => p.estado !== 'Cancelado' && new Date(p.fecha + 'T12:00:00') >= desdeActual);
                const vAnt = anterior.reduce((s, p) => s + (p.subtotal || p.total || 0), 0);
                const vAct = actual.reduce((s, p) => s + (p.subtotal || p.total || 0), 0);
                const diff = vAnt ? ((vAct - vAnt) / vAnt * 100) : 0;
                const color = diff >= 0 ? 'var(--green)' : 'var(--red)';
                document.getElementById('rep-comparativo').innerHTML = `
    <div class="grid grid-2" style="gap:14px">
      <div style="text-align:center;padding:20px;background:var(--bg3);border-radius:var(--radius)">
        <div style="font-size:11px;color:var(--text3);margin-bottom:6px">PERÍODO ANTERIOR (${diasComp} días)</div>
        <div style="font-size:26px;font-weight:700;font-family:'DM Mono',monospace;color:var(--text2)">${fmt(vAnt)}</div>
        <div style="font-size:12px;color:var(--text3);margin-top:4px">${anterior.length} pedidos</div>
      </div>
      <div style="text-align:center;padding:20px;background:var(--bg3);border-radius:var(--radius);border:1px solid rgba(74,222,128,0.2)">
        <div style="font-size:11px;color:var(--green);font-weight:600;margin-bottom:6px">PERÍODO ACTUAL (${diasComp} días)</div>
        <div style="font-size:26px;font-weight:700;font-family:'DM Mono',monospace;color:var(--green)">${fmt(vAct)}</div>
        <div style="font-size:12px;color:var(--text3);margin-top:4px">${actual.length} pedidos · <span style="color:${color};font-weight:600">${diff >= 0 ? '+' : ''}${Math.round(diff)}% vs anterior</span></div>
      </div>
    </div>`;
            }

            // ---- Exportar CSV ----
            function exportarReporteCSV() {
                const lista = pedidosEnPeriodo();
                const filas = [['Fecha', 'Pedido', 'Cliente', 'Canal', 'Items', 'Subtotal', 'Descuento', 'Total', 'Pago', 'Estado']];
                lista.forEach(p => filas.push([
                    p.fecha,
                    '#' + p.id.slice(-4).toUpperCase(),
                    p.cliente,
                    p.canal,
                    p.items.map(i => i.nombre || i).join(' | '),
                    p.subtotal || p.total || 0,
                    p.descuento || 0,
                    p.total || 0,
                    p.pago || '—',
                    p.estado
                ]));
                const csv = filas.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
                const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `fitgo_reporte_${hoy()}.csv`;
                a.click();
                toast(`CSV exportado — ${lista.length} pedidos`);
            }

            // ========== GASTOS FIJOS ==========
            function openNuevoGasto() {
                ['gasto-concepto', 'gasto-monto', 'gasto-notas'].forEach(id => document.getElementById(id).value = '');
                document.getElementById('gasto-fecha').value = hoy();
                openModal('modal-gasto');
            }

            function guardarGasto() {
                const concepto = document.getElementById('gasto-concepto').value.trim();
                const monto = parseFloat(document.getElementById('gasto-monto').value) || 0;
                if (!concepto || !monto) { toast('Ingresa concepto y monto', 'error'); return; }
                gastos.push({
                    id: uid(), concepto,
                    categoria: document.getElementById('gasto-categoria').value,
                    monto, fecha: document.getElementById('gasto-fecha').value || hoy(),
                    recurrente: document.getElementById('gasto-recurrente').value,
                    notas: document.getElementById('gasto-notas').value,
                });
                save();
                closeModal('modal-gasto');
                toast('Gasto registrado');
                renderEstadosFinancieros();
            }

            function eliminarGasto(id) {
                gastos = gastos.filter(g => g.id !== id);
                save(); renderEstadosFinancieros(); toast('Gasto eliminado');
            }

            // ========== ESTADOS FINANCIEROS ==========
            function getEFPeriodo() {
                const mes = document.getElementById('ef-mes')?.value || 'actual';
                const ahora = new Date();
                let desde, hasta;
                if (mes === 'actual') {
                    desde = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().split('T')[0];
                    hasta = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).toISOString().split('T')[0];
                } else if (mes === 'anterior') {
                    desde = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1).toISOString().split('T')[0];
                    hasta = new Date(ahora.getFullYear(), ahora.getMonth(), 0).toISOString().split('T')[0];
                } else {
                    desde = document.getElementById('ef-desde')?.value || new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().split('T')[0];
                    hasta = document.getElementById('ef-hasta')?.value || hoy();
                }
                return { desde, hasta };
            }

            function renderEstadosFinancieros() {
                const mesVal = document.getElementById('ef-mes')?.value || 'actual';
                const wrap = document.getElementById('ef-rango-wrap');
                if (wrap) wrap.style.display = mesVal === 'personalizado' ? 'flex' : 'none';

                const { desde, hasta } = getEFPeriodo();

                // Filtrar datos del período
                const pedEF = pedidos.filter(p => p.estado !== 'Cancelado' && p.fecha >= desde && p.fecha <= hasta);
                const compEF = compras.filter(c => c.fecha >= desde && c.fecha <= hasta && c.estado === 'recibida');
                const gastEF = gastos.filter(g => g.fecha >= desde && g.fecha <= hasta);
                const cxpEF = cxp.filter(c => c.vencimiento >= desde && c.vencimiento <= hasta);
                const cxcEF = cxc.filter(c => c.fecha >= desde && c.fecha <= hasta);

                // Envíos gratis del período (gasto de ventas)
                const enviosGratisMov = movCaja.filter(m => {
                    const p = pedidos.find(x => x.id === m.pedidoId);
                    return m.tipo === 'envio_gratis' && p && p.fecha >= desde && p.fecha <= hasta;
                });
                const totalEnviosGratis = enviosGratisMov.reduce((s, m) => s + m.monto, 0);

                // Envíos pagados con transferencia al repartidor (salida de banco)
                const enviosSalidaMov = movCaja.filter(m => { const p = pedidos.find(x => x.id === m.pedidoId); return m.tipo === 'envio_salida' && p && p.fecha >= desde && p.fecha <= hasta; });
                const totalEnviosSalida = enviosSalidaMov.reduce((s, m) => s + m.monto, 0);

                // Ingresos
                const ingresos = pedEF.reduce((s, p) => s + (p.subtotal || p.total || 0), 0);
                const descuentos = pedEF.reduce((s, p) => s + (p.descuento || 0), 0);
                const ingresosNetos = ingresos - descuentos;

                // Ingresos por método
                const ingresosPorMetodo = {};
                pedEF.forEach(p => { const m = p.pago || 'Otro'; ingresosPorMetodo[m] = (ingresosPorMetodo[m] || 0) + (p.subtotal || p.total || 0); });

                // Costo de ventas
                const costVentas = compEF.reduce((s, c) => s + c.total, 0);
                const utilidadBruta = ingresosNetos - costVentas;

                // Gastos de venta (envíos gratis + categoría "Gasto de envío")
                const gastEnvio = gastEF.filter(g => g.categoria === 'Gasto de envío').reduce((s, g) => s + g.monto, 0);
                const totalGastosVenta = totalEnviosGratis + gastEnvio;

                // Gastos operativos (todo lo demás)
                const gastosOpDetalle = {};
                gastEF.filter(g => g.categoria !== 'Gasto de envío').forEach(g => gastosOpDetalle[g.categoria] = (gastosOpDetalle[g.categoria] || 0) + g.monto);
                const gastosOp = Object.values(gastosOpDetalle).reduce((s, v) => s + v, 0);

                const utilidadOp = utilidadBruta - totalGastosVenta - gastosOp;

                // ── SALDO BANCO ──
                // Entradas banco: transferencias/tarjeta cobradas en el período
                const movPeriodo = movCaja.filter(m => { const p = pedidos.find(x => x.id === m.pedidoId); return p && p.fecha >= desde && p.fecha <= hasta; });
                const entradasBanco = movPeriodo.filter(m => (m.tipo === 'venta' || !m.tipo) && (m.metodo === 'Transferencia / SPEI' || m.metodo === 'Tarjeta' || m.metodo === 'Transferencia')).reduce((s, m) => s + m.monto, 0);
                const cxpPagadasTransf = cxp.filter(c => c.estado === 'pagada' && (c.fechaPago || '') >= desde && (c.fechaPago || '') <= hasta && (c.metodoPagoRealizado === 'Transferencia' || c.metodoPagoRealizado === 'Tarjeta')).reduce((s, c) => s + c.monto, 0);
                const saldoBanco = entradasBanco - cxpPagadasTransf - totalEnviosSalida;

                // Flujo
                const cobradoEfectivo = movPeriodo.filter(m => (m.tipo === 'venta' || !m.tipo) && m.metodo === 'Efectivo').reduce((s, m) => s + m.monto, 0);
                const cxcCobradas = cxc.filter(c => c.estado === 'cobrada' && c.fecha >= desde && c.fecha <= hasta).reduce((s, c) => s + c.monto, 0);
                const totalEntradas = cobradoEfectivo + entradasBanco + cxcCobradas;
                const cxpPagadasTotal = cxp.filter(c => c.estado === 'pagada' && (c.fechaPago || '') >= desde && (c.fechaPago || '') <= hasta).reduce((s, c) => s + c.monto, 0);
                const totalSalidas = costVentas + gastosOp + totalGastosVenta + cxpPagadasTotal;
                const flujoNeto = totalEntradas - totalSalidas;

                // Balance
                const valorInventario = inventario.reduce((s, i) => s + i.stock * i.costo, 0);
                const cxcPendTotal = cxc.filter(c => c.estado !== 'cobrada').reduce((s, c) => s + c.monto, 0);
                const cxpPendTotal = cxp.filter(c => c.estado !== 'pagada').reduce((s, c) => s + c.monto, 0);
                const totalActivos = valorInventario + cxcPendTotal + cobradoEfectivo + entradasBanco;
                const capital = totalActivos - cxpPendTotal;

                const labelPeriodo = `${fmtFecha(desde)} – ${fmtFecha(hasta)}`;

                // ── Helper: fila simple ──
                const filaER = (label, val, bold, color, indent) =>
                    `<div class="flex justify-between" style="padding:7px 0;border-bottom:1px solid var(--border);${indent ? 'padding-left:14px' : ''}">
      <span style="font-size:${bold ? '13.5' : '12.5'}px;${bold ? 'font-weight:600' : 'color:var(--text2)'}${indent ? ';color:var(--text2)' : ''}">${label}</span>
      <span class="font-mono" style="font-size:13px;${bold ? 'font-weight:700' : ''}${color ? ';color:' + color : ''}">${val >= 0 ? fmt(val) : '-' + fmt(Math.abs(val))}</span>
    </div>`;

                // ── Helper: bloque expandible ──
                let desgloseCont = 0;
                const bloqueDesglose = (titulo, total, detalles, colorTitulo) => {
                    const id = 'desglose-' + (desgloseCont++);
                    const hayDetalle = Object.entries(detalles).length > 0;
                    return `
    <div>
      <div class="flex justify-between items-center" style="padding:7px 0;border-bottom:1px solid var(--border);cursor:${hayDetalle ? 'pointer' : 'default'}" onclick="${hayDetalle ? `toggleDesglose('${id}')` : ''}" >
        <span style="font-size:12.5px;color:var(--text2);display:flex;align-items:center;gap:6px">
          ${hayDetalle ? `<span id="${id}-icon" style="font-size:10px;color:var(--text3)">▶</span>` : ''}
          ${titulo}
        </span>
        <span class="font-mono" style="font-size:13px;${colorTitulo ? 'color:' + colorTitulo : ''}">${fmt(total)}</span>
      </div>
      ${hayDetalle ? `<div id="${id}" style="display:none;background:var(--bg3);border-radius:0 0 6px 6px;padding:0 12px">
        ${Object.entries(detalles).map(([k, v]) => `
          <div class="flex justify-between" style="padding:5px 0;border-bottom:1px solid var(--border);font-size:12px">
            <span style="color:var(--text2)">${k}</span>
            <span class="font-mono">${fmt(v)}</span>
          </div>`).join('')}
      </div>`: ''}
    </div>`;
                };

                // ── ESTADO DE RESULTADOS ──
                document.getElementById('ef-resultados').innerHTML = `
    <div style="font-size:11px;color:var(--text3);margin-bottom:12px">📅 ${labelPeriodo}</div>

    <div style="font-size:11px;font-weight:700;color:var(--green);padding:4px 0;margin-bottom:2px">INGRESOS</div>
    ${bloqueDesglose('Ingresos por ventas', ingresos, ingresosPorMetodo, 'var(--green)')}
    ${filaER('(-) Descuentos', descuentos, false, 'var(--amber)', true)}
    ${filaER('= Ingresos netos', ingresosNetos, true, 'var(--green)')}
    <div style="height:8px"></div>

    <div style="font-size:11px;font-weight:700;color:var(--red);padding:4px 0;margin-bottom:2px">COSTO DE VENTAS</div>
    ${bloqueDesglose('Compras de insumos', costVentas,
                    Object.fromEntries(compEF.map(c => [c.proveedor || 'Sin proveedor', c.total])), 'var(--red)')}
    ${filaER('= Utilidad bruta', utilidadBruta, true, utilidadBruta >= 0 ? 'var(--green)' : 'var(--red)')}
    <div style="height:8px"></div>

    <div style="font-size:11px;font-weight:700;color:var(--amber);padding:4px 0;margin-bottom:2px">GASTOS DE VENTA</div>
    ${bloqueDesglose('Gasto de envíos (gratis)',
                        totalEnviosGratis + gastEnvio,
                        {
                            ...(totalEnviosGratis ? { 'Envíos absorbidos (gratis)': totalEnviosGratis } : {}),
                            ...(gastEnvio ? { 'Gastos de envío registrados': gastEnvio } : {}),
                        }, 'var(--amber)')}
    <div style="height:8px"></div>

    <div style="font-size:11px;font-weight:700;color:var(--red);padding:4px 0;margin-bottom:2px">GASTOS OPERATIVOS</div>
    ${bloqueDesglose('Total gastos operativos', gastosOp, gastosOpDetalle, 'var(--red)')}
    <div style="height:8px"></div>

    <div style="padding:10px;background:${utilidadOp >= 0 ? 'var(--green-dim)' : 'var(--red-dim)'};border-radius:6px;margin-top:4px">
      <div class="flex justify-between">
        <span style="font-weight:700">UTILIDAD OPERATIVA</span>
        <span class="font-mono" style="font-weight:700;font-size:16px;color:${utilidadOp >= 0 ? 'var(--green)' : 'var(--red)'}">${fmt(Math.abs(utilidadOp))} ${utilidadOp < 0 ? '⚠' : ''}</span>
      </div>
      <div style="font-size:11px;color:var(--text3);margin-top:4px">Margen: ${ingresosNetos ? Math.round(utilidadOp / ingresosNetos * 100) : 0}%</div>
    </div>

    <div style="height:14px"></div>
    <div style="padding:10px;background:var(--blue-dim);border-radius:6px;border:1px solid rgba(96,165,250,0.2)">
      <div class="flex justify-between mb-6">
        <span style="font-weight:600;color:var(--blue)">🏦 Saldo de banco (transferencias)</span>
        <span class="font-mono font-semibold" style="color:${saldoBanco >= 0 ? 'var(--blue)' : 'var(--red)'}">${fmt(saldoBanco)}</span>
      </div>
      <div style="font-size:11px;color:var(--text3);line-height:1.7">
        Entradas por transf/tarjeta: ${fmt(entradasBanco)}<br>
        − CxP pagadas con transf: ${fmt(cxpPagadasTransf)}<br>
        − Pagos a repartidores: ${fmt(totalEnviosSalida)}
      </div>
    </div>`;

                // ── BALANCE GENERAL ──
                document.getElementById('ef-balance').innerHTML = `
    <div style="font-size:11px;color:var(--text3);margin-bottom:12px">📅 Al ${fmtFecha(hasta)}</div>
    <div style="font-size:11px;font-weight:700;color:var(--blue);margin-bottom:6px;padding:4px 0">ACTIVOS</div>
    ${filaER('Efectivo en caja', cobradoEfectivo, false, 'var(--green)')}
    ${filaER('Saldo banco', entradasBanco - cxpPagadasTransf, false, 'var(--blue)')}
    ${filaER('Cuentas por cobrar', cxcPendTotal, false, 'var(--blue)')}
    ${filaER('Inventario (valor)', valorInventario, false, 'var(--amber)')}
    ${filaER('TOTAL ACTIVOS', totalActivos, true, 'var(--blue)')}
    <div style="height:12px"></div>
    <div style="font-size:11px;font-weight:700;color:var(--red);margin-bottom:6px;padding:4px 0">PASIVOS</div>
    ${filaER('Cuentas por pagar', cxpPendTotal, false, 'var(--red)')}
    ${filaER('TOTAL PASIVOS', cxpPendTotal, true, 'var(--red)')}
    <div style="height:8px"></div>
    <div style="padding:10px;background:var(--green-dim);border-radius:6px;margin-top:4px">
      <div class="flex justify-between">
        <span style="font-weight:700">CAPITAL / PATRIMONIO</span>
        <span class="font-mono" style="font-weight:700;font-size:16px;color:${capital >= 0 ? 'var(--green)' : 'var(--red)'}">${fmt(Math.abs(capital))}</span>
      </div>
      <div style="font-size:11px;color:var(--text3);margin-top:4px">Activos − Pasivos</div>
    </div>`;

                // ── FLUJO DE EFECTIVO ──
                document.getElementById('ef-flujo').innerHTML = `
    <div style="font-size:11px;color:var(--text3);margin-bottom:12px">📅 ${labelPeriodo}</div>
    <div style="font-size:11px;font-weight:700;color:var(--green);margin-bottom:6px">ENTRADAS</div>
    ${filaER('Cobros en efectivo', cobradoEfectivo, false, 'var(--green)')}
    ${filaER('Cobros banco (transf/tarjeta)', entradasBanco, false, 'var(--blue)')}
    ${filaER('CxC cobradas', cxcCobradas, false, 'var(--green)')}
    ${filaER('TOTAL ENTRADAS', totalEntradas, true, 'var(--green)')}
    <div style="height:12px"></div>
    <div style="font-size:11px;font-weight:700;color:var(--red);margin-bottom:6px">SALIDAS</div>
    ${filaER('Compras de insumos', costVentas, false, 'var(--red)')}
    ${filaER('Gastos operativos', gastosOp, false, 'var(--red)')}
    ${filaER('Gastos de envío', totalGastosVenta, false, 'var(--amber)')}
    ${filaER('CxP pagadas', cxpPagadasTotal, false, 'var(--red)')}
    ${filaER('TOTAL SALIDAS', totalSalidas, true, 'var(--red)')}
    <div style="height:8px"></div>
    <div style="padding:10px;background:${flujoNeto >= 0 ? 'var(--green-dim)' : 'var(--red-dim)'};border-radius:6px;margin-top:4px">
      <div class="flex justify-between">
        <span style="font-weight:700">FLUJO NETO</span>
        <span class="font-mono" style="font-weight:700;font-size:16px;color:${flujoNeto >= 0 ? 'var(--green)' : 'var(--red)'}">${fmt(Math.abs(flujoNeto))} ${flujoNeto < 0 ? '⚠' : ''}</span>
      </div>
      <div style="font-size:11px;color:var(--text3);margin-top:4px">${flujoNeto >= 0 ? 'Flujo positivo ✅' : 'Flujo negativo ⚠'}</div>
    </div>`;

                // ── TABLA GASTOS ──
                const tbody = document.getElementById('ef-tabla-gastos');
                const recLabel = { no: 'Único', mensual: 'Mensual', semanal: 'Semanal' };
                tbody.innerHTML = gastos.sort((a, b) => b.fecha.localeCompare(a.fecha)).map(g => `<tr>
    <td style="font-weight:500">${g.concepto}</td>
    <td><span class="badge badge-gray">${g.categoria}</span></td>
    <td class="highlight-red font-mono">${fmt(g.monto)}</td>
    <td class="text-dim">${fmtFecha(g.fecha)}</td>
    <td><span class="badge ${g.recurrente !== 'no' ? 'badge-amber' : 'badge-gray'}">${recLabel[g.recurrente] || '—'}</span></td>
    <td><button class="btn btn-danger btn-sm" onclick="eliminarGasto('${g.id}')">🗑</button></td>
  </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text3)">Sin gastos registrados</td></tr>';
            }

            function toggleDesglose(id) {
                const el = document.getElementById(id);
                const icon = document.getElementById(id + '-icon');
                if (!el) return;
                const open = el.style.display !== 'none';
                el.style.display = open ? 'none' : 'block';
                if (icon) icon.textContent = open ? '▶' : '▼';
            }

            function exportarEstadosCSV() {
                const { desde, hasta } = getEFPeriodo();
                const gastEF = gastos.filter(g => g.fecha >= desde && g.fecha <= hasta);
                const filas = [['Tipo', 'Concepto', 'Categoría', 'Monto', 'Fecha']];
                const pedEF = pedidos.filter(p => p.estado !== 'Cancelado' && p.fecha >= desde && p.fecha <= hasta);
                pedEF.forEach(p => filas.push(['Ingreso', `Pedido #${p.id.slice(-4).toUpperCase()} - ${p.cliente}`, 'Ventas', p.subtotal || p.total || 0, p.fecha]));
                gastEF.forEach(g => filas.push(['Gasto', g.concepto, g.categoria, g.monto, g.fecha]));
                compras.filter(c => c.fecha >= desde && c.fecha <= hasta).forEach(c => filas.push(['Compra', `Compra ${c.proveedor || ''}`.trim(), 'Insumos', c.total, c.fecha]));
                const csv = filas.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
                const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `fitgo_estados_${desde}_${hasta}.csv`;
                a.click();
                toast('Estados exportados a CSV');
            }

            // ========== AUTH & USUARIOS ==========
            let usuarios = DB.get('usuarios') || [
                { id: 'u1', nombre: 'Administrador', user: 'admin', pass: 'fitgo2024', rol: 'admin', activo: true },
                { id: 'u2', nombre: 'Operador Caja', user: 'caja', pass: 'caja2024', rol: 'caja', activo: true },
            ];
            let sesionActual = null;

            // Permisos por defecto del perfil caja
            const PERMISOS_DEFAULT = {
                pedidos: true, menu: true, dietas: false, inventario: false,
                caja: true, proveedores: false, cxp: false, cxc: false,
                compras: false, clientes: false, reportes: false, usuarios: false, importar: false
            };
            let permisosCaja = DB.get('permisosCaja') || { ...PERMISOS_DEFAULT };

            const MODULOS_LABELS = {
                pedidos: '🧾 Pedidos', menu: '🥙 Menú', dietas: '📋 Dietas',
                inventario: '📦 Inventario', caja: '💰 Caja del día', proveedores: '🚛 Proveedores',
                cxp: '📤 Cuentas por pagar', cxc: '📥 Cuentas por cobrar', compras: '🛒 Compras',
                clientes: '👤 Clientes', reportes: '📈 Reportes', importar: '📥 Carga masiva'
            };

            function doLogin() {
                const user = document.getElementById('login-user').value.trim().toLowerCase();
                const pass = document.getElementById('login-pass').value;
                const errEl = document.getElementById('login-error');
                const u = usuarios.find(x => x.user.toLowerCase() === user && x.pass === pass && x.activo);
                if (!u) { errEl.style.display = 'block'; return; }
                errEl.style.display = 'none';
                sesionActual = u;
                DB.set('sesion', { id: u.id, user: u.user, rol: u.rol, nombre: u.nombre });
                document.getElementById('login-screen').style.display = 'none';
                document.getElementById('sidebar-nombre').textContent = u.nombre;
                document.getElementById('sidebar-rol').textContent = u.rol === 'admin' ? 'Administrador' : 'Operador / Caja';
                document.getElementById('sidebar-avatar').textContent = u.nombre[0].toUpperCase();
                aplicarPermisos();
                renderDashboard();
            }

            function doLogout() {
                sesionActual = null;
                DB.set('sesion', null);
                document.getElementById('login-screen').style.display = 'flex';
                document.getElementById('login-user').value = '';
                document.getElementById('login-pass').value = '';
            }

            function aplicarPermisos() {
                if (!sesionActual) return;
                const isAdmin = sesionActual.rol === 'admin';
                // Sección admin siempre visible solo para admin
                document.getElementById('nav-admin-section').style.display = isAdmin ? 'block' : 'none';
                if (isAdmin) return; // Admin ve todo
                // Caja: ocultar nav items según permisos
                const navMap = {
                    pedidos: 'nav-item', menu: 'nav-item', dietas: 'nav-item', inventario: 'nav-item',
                    caja: 'nav-item', proveedores: 'nav-item', cxp: 'nav-item', cxc: 'nav-item',
                    compras: 'nav-item', clientes: 'nav-item', reportes: 'nav-item'
                };
                document.querySelectorAll('.nav-item').forEach(el => {
                    const onclick = el.getAttribute('onclick') || '';
                    const modulo = Object.keys(navMap).find(k => onclick.includes("'" + k + "'"));
                    if (modulo && !permisosCaja[modulo]) el.style.display = 'none';
                    else if (modulo) el.style.display = '';
                });
            }

            // ---- Gestión de usuarios ----
            let usrRolActual = 'admin';
            let usrEditId = null;

            function renderUsuarios() {
                const lista = document.getElementById('usuarios-lista');
                lista.innerHTML = usuarios.map(u => `
    <div class="flex items-center gap-10" style="padding:10px 0;border-bottom:1px solid var(--border)">
      <div class="avatar" style="background:${u.rol === 'admin' ? 'var(--green-dim)' : 'var(--blue-dim)'};color:${u.rol === 'admin' ? 'var(--green)' : 'var(--blue)'}">${u.nombre[0]}</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:500">${u.nombre} <span style="font-size:11px;color:var(--text3)">@${u.user}</span></div>
        <div style="font-size:11px;color:${u.rol === 'admin' ? 'var(--green)' : 'var(--blue)'}">
          ${u.rol === 'admin' ? '👑 Administrador' : '🧾 Caja / Operador'}
        </div>
      </div>
      <div class="flex gap-6">
        <button class="btn btn-secondary btn-sm" onclick="toggleUsuario('${u.id}')" style="color:${u.activo ? 'var(--green)' : 'var(--red)'}">
          ${u.activo ? '✓ Activo' : '✗ Inactivo'}
        </button>
        ${u.id !== 'u1' ? `<button class="btn btn-danger btn-sm" onclick="eliminarUsuario('${u.id}')">🗑</button>` : ''}
      </div>
    </div>`).join('');

                // Permisos caja
                const permEl = document.getElementById('permisos-lista');
                permEl.innerHTML = Object.entries(MODULOS_LABELS).map(([mod, label]) => `
    <div class="flex items-center justify-between" style="padding:8px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:13px">${label}</span>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
        <span style="font-size:12px;color:${permisosCaja[mod] ? 'var(--green)' : 'var(--red)'}" id="perm-label-${mod}">${permisosCaja[mod] ? 'Habilitado' : 'Deshabilitado'}</span>
        <div style="position:relative;width:36px;height:20px" onclick="togglePermiso('${mod}')">
          <div style="position:absolute;inset:0;background:${permisosCaja[mod] ? 'var(--green)' : 'var(--bg4)'};border-radius:10px;transition:background 0.2s"></div>
          <div style="position:absolute;top:2px;left:${permisosCaja[mod] ? '18' : '2'}px;width:16px;height:16px;background:#fff;border-radius:50%;transition:left 0.2s"></div>
        </div>
      </label>
    </div>`).join('');
            }

            function togglePermiso(mod) {
                permisosCaja[mod] = !permisosCaja[mod];
                DB.set('permisosCaja', permisosCaja);
                renderUsuarios();
                if (sesionActual?.rol === 'caja') aplicarPermisos();
                toast(`Permiso "${MODULOS_LABELS[mod]}" ${permisosCaja[mod] ? 'habilitado' : 'deshabilitado'}`);
            }

            function openNuevoUsuario() {
                usrEditId = null; usrRolActual = 'admin';
                document.getElementById('usuario-modal-title').textContent = 'Nuevo Usuario';
                ['usr-nombre', 'usr-user', 'usr-pass'].forEach(id => document.getElementById(id).value = '');
                document.querySelectorAll('#usr-rol-chips .chip').forEach((c, i) => c.classList.toggle('active', i === 0));
                openModal('modal-usuario');
            }

            function setUsrRol(el, rol) {
                usrRolActual = rol;
                document.querySelectorAll('#usr-rol-chips .chip').forEach(c => c.classList.remove('active'));
                el.classList.add('active');
            }

            function guardarUsuario() {
                const nombre = document.getElementById('usr-nombre').value.trim();
                const user = document.getElementById('usr-user').value.trim().toLowerCase();
                const pass = document.getElementById('usr-pass').value;
                if (!nombre || !user || !pass) { toast('Completa todos los campos', 'error'); return; }
                if (usuarios.find(u => u.user === user && u.id !== usrEditId)) { toast('Ese usuario ya existe', 'error'); return; }
                usuarios.push({ id: uid(), nombre, user, pass, rol: usrRolActual, activo: true });
                DB.set('usuarios', usuarios);
                closeModal('modal-usuario');
                toast('Usuario creado');
                renderUsuarios();
            }

            function toggleUsuario(id) {
                if (id === 'u1') { toast('No puedes desactivar el admin principal', 'error'); return; }
                const u = usuarios.find(x => x.id === id);
                if (u) { u.activo = !u.activo; DB.set('usuarios', usuarios); renderUsuarios(); toast(`Usuario ${u.activo ? 'activado' : 'desactivado'}`); }
            }

            function eliminarUsuario(id) {
                if (id === 'u1') return;
                usuarios = usuarios.filter(u => u.id !== id);
                DB.set('usuarios', usuarios); renderUsuarios(); toast('Usuario eliminado');
            }

            // ========== IMPORTAR (XLSX/CSV) ==========
            // Usar SheetJS via CDN (se carga dinámicamente)
            async function cargarSheetJS() {
                if (window.XLSX) return;
                await new Promise((res, rej) => {
                    const s = document.createElement('script');
                    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
                    s.onload = res; s.onerror = rej;
                    document.head.appendChild(s);
                });
            }

            async function importarArchivo(input, tipo) {
                const file = input.files[0]; if (!file) return;
                const resEl = document.getElementById('res-' + tipo);
                resEl.innerHTML = '<span style="color:var(--text3)">⏳ Leyendo archivo...</span>';
                try {
                    await cargarSheetJS();
                    const data = await file.arrayBuffer();
                    const wb = XLSX.read(data, { type: 'array' });
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
                    if (!rows.length) { resEl.innerHTML = '<span style="color:var(--amber)">⚠ El archivo está vacío</span>'; return; }
                    let count = 0;
                    if (tipo === 'clientes') count = importarClientes(rows);
                    else if (tipo === 'insumos') count = importarInsumos(rows);
                    else if (tipo === 'proveedores') count = importarProveedores(rows);
                    else if (tipo === 'recetas') count = importarRecetas(rows);
                    else if (tipo === 'recetas_insumos') count = importarRecetasInsumos(rows);
                    else if (tipo === 'ventas') count = importarVentas(rows);
                    save();
                    resEl.innerHTML = `<span style="color:var(--green)">✅ ${count} registros importados correctamente</span>`;
                    toast(`${count} ${tipo} importados`);
                } catch (e) {
                    resEl.innerHTML = `<span style="color:var(--red)">❌ Error: ${e.message}</span>`;
                    toast('Error al leer el archivo', 'error');
                }
                input.value = '';
            }

            function normalizar(obj, campos) {
                // Buscar columna ignorando mayúsculas/tildes
                const keys = Object.keys(obj);
                const find = (nombre) => {
                    const n = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    const k = keys.find(k => k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === n);
                    return k ? String(obj[k]).trim() : '';
                };
                const result = {};
                campos.forEach(c => result[c] = find(c));
                return result;
            }

            function importarClientes(rows) {
                let count = 0;
                rows.forEach(r => {
                    const d = normalizar(r, ['nombre', 'telefono', 'canal', 'notas']);
                    if (!d.nombre) return;
                    if (clientes.find(c => c.nombre.toLowerCase() === d.nombre.toLowerCase())) return;
                    clientes.push({ id: uid(), nombre: d.nombre, tel: d.telefono || '', canal: d.canal || 'WhatsApp', tieneDieta: false, pedidos: 0, ultimoPedido: null, notas: d.notas || '' });
                    count++;
                });
                return count;
            }

            function importarInsumos(rows) {
                let count = 0;
                rows.forEach(r => {
                    const d = normalizar(r, ['nombre', 'categoria', 'stock', 'minimo', 'unidad', 'costo']);
                    if (!d.nombre) return;
                    if (inventario.find(i => i.nombre.toLowerCase() === d.nombre.toLowerCase())) {
                        const ing = inventario.find(i => i.nombre.toLowerCase() === d.nombre.toLowerCase());
                        if (d.stock) ing.stock = parseFloat(d.stock) || ing.stock;
                        if (d.costo) ing.costo = parseFloat(d.costo) || ing.costo;
                        count++; return;
                    }
                    inventario.push({ id: uid(), nombre: d.nombre, categoria: d.categoria || 'Otros', stock: parseFloat(d.stock) || 0, minimo: parseFloat(d.minimo) || 0, unidad: d.unidad || 'kg', costo: parseFloat(d.costo) || 0, proveedor: '' });
                    count++;
                });
                return count;
            }

            function importarProveedores(rows) {
                let count = 0;
                rows.forEach(r => {
                    const d = normalizar(r, ['nombre', 'contacto', 'telefono', 'categoria', 'dias', 'notas']);
                    if (!d.nombre) return;
                    if (proveedores.find(p => p.nombre.toLowerCase() === d.nombre.toLowerCase())) return;
                    proveedores.push({ id: uid(), nombre: d.nombre, contacto: d.contacto || '', tel: d.telefono || '', categoria: d.categoria || 'Otro', dias: d.dias || '', notas: d.notas || '' });
                    count++;
                });
                return count;
            }

            function importarRecetas(rows) {
                let count = 0;
                rows.forEach(r => {
                    const d = normalizar(r, ['nombre', 'categoria', 'precio', 'costo', 'calorias', 'descripcion']);
                    if (!d.nombre) return;
                    if (menu.find(m => m.nombre.toLowerCase() === d.nombre.toLowerCase())) return;
                    menu.push({ id: uid(), nombre: d.nombre, categoria: d.categoria || 'Comida', precio: parseFloat(d.precio) || 0, costo: parseFloat(d.costo) || 0, calorias: parseInt(d.calorias) || 0, desc: d.descripcion || '', etiquetas: [], disponible: true, receta: [] });
                    count++;
                });
                return count;
            }

            function importarRecetasInsumos(rows) {
                // Cada fila: platillo, insumo, cantidad, unidad
                // Agrupa por platillo y construye la receta con costos automáticos
                let platillosActualizados = new Set();
                let advertencias = [];

                // Agrupar filas por nombre de platillo
                const grupos = {};
                rows.forEach(r => {
                    const d = normalizar(r, ['platillo', 'insumo', 'cantidad', 'unidad']);
                    if (!d.platillo || !d.insumo) return;
                    if (!grupos[d.platillo]) grupos[d.platillo] = [];
                    grupos[d.platillo].push(d);
                });

                Object.entries(grupos).forEach(([nombrePlatillo, lineas]) => {
                    // Buscar o crear el platillo en el menú
                    let platillo = menu.find(m => m.nombre.toLowerCase() === nombrePlatillo.toLowerCase());
                    if (!platillo) {
                        platillo = { id: uid(), nombre: nombrePlatillo, categoria: 'Comida', precio: 0, costo: 0, calorias: 0, desc: '', etiquetas: [], disponible: true, receta: [] };
                        menu.push(platillo);
                    }

                    // Construir receta e calcular costo
                    const recetaLineas = [];
                    let costoTotal = 0;

                    lineas.forEach(linea => {
                        const cantidad = parseFloat(linea.cantidad) || 0;
                        // Buscar insumo en inventario (nombre exacto o parcial)
                        const ing = inventario.find(i =>
                            i.nombre.toLowerCase() === linea.insumo.toLowerCase() ||
                            i.nombre.toLowerCase().includes(linea.insumo.toLowerCase())
                        );

                        if (!ing) {
                            advertencias.push(linea.insumo);
                            // Agregar a receta sin costo (insumo no encontrado)
                            recetaLineas.push({ ingId: '', nombre: linea.insumo, cantidad, unidad: linea.unidad || '', costoLinea: 0 });
                            return;
                        }

                        const costoLinea = ing.costo * cantidad;
                        costoTotal += costoLinea;
                        recetaLineas.push({ ingId: ing.id, nombre: ing.nombre, cantidad, unidad: linea.unidad || ing.unidad, costoLinea });
                    });

                    // Actualizar platillo
                    platillo.receta = recetaLineas;
                    platillo.costo = costoTotal;
                    platillosActualizados.add(nombrePlatillo);
                });

                // Mostrar advertencias si hubo insumos no encontrados
                if (advertencias.length) {
                    setTimeout(() => toast(`⚠ Insumos no encontrados en inventario: ${[...new Set(advertencias)].join(', ')}. Verifica los nombres.`, 'error'), 800);
                }

                return platillosActualizados.size;
            }

            function importarVentas(rows) {
                let count = 0;
                rows.forEach(r => {
                    const d = normalizar(r, ['fecha', 'cliente', 'platillo', 'cantidad', 'total', 'canal', 'pago']);
                    if (!d.fecha || !d.total) return;
                    const fechaStr = d.fecha.includes('/')
                        ? d.fecha.split('/').reverse().join('-')
                        : d.fecha.substring(0, 10);
                    const p = {
                        id: uid(), cliente: d.cliente || 'Importado', clienteId: '',
                        canal: d.canal || 'WhatsApp', pago: d.pago || 'Efectivo',
                        items: [{ nombre: d.platillo || 'Venta importada', precio: parseFloat(d.total) || 0, cantidad: parseInt(d.cantidad) || 1 }],
                        subtotal: parseFloat(d.total) || 0, total: parseFloat(d.total) || 0,
                        descuento: 0, modoEnvio: 'sin_envio', costoEnvio: 0,
                        estado: 'Entregado', fecha: fechaStr, hora: '00:00', horaStr: '00:00', createdAt: Date.now()
                    };
                    pedidos.push(p);
                    movCaja.push({ hora: '00:00', pedidoId: p.id, cliente: p.cliente, metodo: p.pago, monto: p.total, tipo: 'venta', estado: 'Cobrado' });
                    count++;
                });
                return count;
            }

            function descargarPlantillas() {
                const plantillas = {
                    'clientes': [['nombre', 'telefono', 'canal', 'notas'], ['María González', '999-123-4567', 'WhatsApp', 'Sin lactosa']],
                    'insumos': [['nombre', 'categoria', 'stock', 'minimo', 'unidad', 'costo'], ['Pechuga de pollo', 'Proteínas', '10', '5', 'kg', '95']],
                    'proveedores': [['nombre', 'contacto', 'telefono', 'categoria', 'dias', 'notas'], ['Carnes Don Pepe', 'José Pérez', '999-500-0001', 'Carnes y proteínas', 'Lunes, Jueves', 'Pago semanal']],
                    'recetas': [['nombre', 'categoria', 'precio', 'costo', 'calorias', 'descripcion'], ['Bowl de pollo', 'Comida', '145', '52', '480', 'Pollo a la plancha con quinoa']],
                    'recetas_insumos': [
                        ['platillo', 'insumo', 'cantidad', 'unidad'],
                        ['Bowl de pollo', 'Pechuga de pollo', '0.2', 'kg'],
                        ['Bowl de pollo', 'Quinoa', '0.08', 'kg'],
                        ['Bowl de pollo', 'Espinacas', '0.05', 'kg'],
                        ['Wrap de atún', 'Atún en agua', '0.1', 'kg'],
                        ['Wrap de atún', 'Tortilla integral', '1', 'pza'],
                    ],
                    'ventas': [['fecha', 'cliente', 'platillo', 'cantidad', 'total', 'canal', 'pago'], ['2024-01-15', 'María González', 'Bowl de pollo', '1', '145', 'WhatsApp', 'Efectivo']],
                };
                Object.entries(plantillas).forEach(([nombre, datos]) => {
                    const csv = datos.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
                    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `plantilla_${nombre}.csv`;
                    a.click();
                });
                toast('6 plantillas descargadas');
            }

            function renderImportar() { } // página estática, no necesita render dinámico

            // ========== BUSCADOR PLATILLOS MODAL ==========
            let menuItemsData = []; // cache de items generados para el selector

            function filtrarMenuModal(q) {
                const sel = document.getElementById('menu-selector');
                if (!sel) return;
                const items = sel.querySelectorAll('[data-nombre]');
                items.forEach(el => {
                    const nombre = el.getAttribute('data-nombre') || '';
                    el.style.display = nombre.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
                });
                // Mostrar "sin resultados" si todos ocultos
                const visibles = [...items].filter(el => el.style.display !== 'none');
                let empty = sel.querySelector('.menu-empty-search');
                if (visibles.length === 0 && q) {
                    if (!empty) { empty = document.createElement('div'); empty.className = 'menu-empty-search'; empty.style.cssText = 'padding:14px;text-align:center;font-size:12px;color:var(--text3)'; sel.appendChild(empty); }
                    empty.textContent = `Sin platillos con "${q}"`;
                } else if (empty) empty.remove();
            }

            function actualizarConteoSel() {
                const n = Object.keys(itemsPedidoActual).length;
                const el = document.getElementById('menu-conteo-sel');
                if (el) el.textContent = n === 0 ? '0 seleccionados' : `${n} seleccionado${n > 1 ? 's' : ''}`;
            }

            // ========== FECHA / CALENDARIO PEDIDOS ==========
            let calMesActual = new Date();
            let calFechaSeleccionada = null;
            let vistaCalActiva = false;

            function onChangeFechaPedido(val) {
                const hoyStr = hoy();
                const badge = document.getElementById('pedido-fecha-badge');
                const hint = document.getElementById('pedido-fecha-hint');
                const title = document.getElementById('pedido-modal-title');
                const sub = document.getElementById('pedido-modal-sub');
                if (!val || val === hoyStr) {
                    if (badge) { badge.textContent = '📅 Hoy'; badge.className = 'badge badge-green'; }
                    if (hint) hint.textContent = 'Registro normal';
                    if (title) title.textContent = 'Nuevo Pedido';
                    if (sub) sub.textContent = 'Pedido del día de hoy';
                } else if (val < hoyStr) {
                    if (badge) { badge.textContent = '📋 Pasado'; badge.className = 'badge badge-amber'; }
                    if (hint) hint.textContent = 'Registrando pedido de fecha anterior';
                    if (title) title.textContent = 'Registrar Pedido Anterior';
                    if (sub) sub.textContent = `Fecha: ${fmtFecha(val)}`;
                } else {
                    if (badge) { badge.textContent = '🗓 Agendado'; badge.className = 'badge badge-blue'; }
                    if (hint) hint.textContent = 'Pedido agendado a futuro';
                    if (title) title.textContent = 'Agendar Pedido';
                    if (sub) sub.textContent = `Para: ${fmtFecha(val)}`;
                }
            }

            function openNuevoPedidoFecha(fecha) {
                openNuevoPedido();
                setTimeout(() => {
                    const inp = document.getElementById('pedido-fecha');
                    if (inp) { inp.value = fecha || hoy(); onChangeFechaPedido(inp.value); }
                }, 50);
            }

            function toggleVistaCal() {
                vistaCalActiva = !vistaCalActiva;
                const calEl = document.getElementById('vista-calendario');
                const btn = document.getElementById('btn-vista-cal');
                if (calEl) calEl.style.display = vistaCalActiva ? 'block' : 'none';
                if (btn) { btn.textContent = vistaCalActiva ? '✕ Cerrar calendario' : '📅 Calendario'; btn.className = vistaCalActiva ? 'btn btn-secondary btn-sm' : 'btn btn-secondary btn-sm'; }
                if (vistaCalActiva) renderCalendario();
            }

            function navCalendario(delta) {
                calMesActual = new Date(calMesActual.getFullYear(), calMesActual.getMonth() + delta, 1);
                renderCalendario();
            }

            function renderCalendario() {
                const año = calMesActual.getFullYear();
                const mes = calMesActual.getMonth();
                const titulo = calMesActual.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
                const tituloEl = document.getElementById('cal-titulo-mes');
                if (tituloEl) tituloEl.textContent = titulo.charAt(0).toUpperCase() + titulo.slice(1);

                // Construir mapa de pedidos por fecha
                const porFecha = {};
                pedidos.forEach(p => {
                    if (!porFecha[p.fecha]) porFecha[p.fecha] = { count: 0, total: 0 };
                    porFecha[p.fecha].count++;
                    porFecha[p.fecha].total += (p.total || 0);
                });

                const primerDia = new Date(año, mes, 1).getDay(); // 0=Dom
                const diasMes = new Date(año, mes + 1, 0).getDate();
                const hoyStr = hoy();

                const grid = document.getElementById('cal-grid');
                if (!grid) return;

                let celdas = [];
                // Celdas vacías al inicio
                for (let i = 0; i < primerDia; i++) celdas.push(`<div></div>`);
                // Días del mes
                for (let d = 1; d <= diasMes; d++) {
                    const fechaStr = `${año}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const data = porFecha[fechaStr];
                    const esHoy = fechaStr === hoyStr;
                    const esSel = fechaStr === calFechaSeleccionada;
                    const esFuturo = fechaStr > hoyStr;
                    const borderColor = esSel ? 'var(--green)' : esHoy ? 'rgba(74,222,128,0.4)' : 'var(--border)';
                    const bg = esSel ? 'var(--green-dim)' : esHoy ? 'rgba(74,222,128,0.07)' : esFuturo ? 'var(--bg3)' : 'var(--bg2)';
                    celdas.push(`
      <div onclick="seleccionarDiaCal('${fechaStr}')" style="min-height:62px;border:1px solid ${borderColor};border-radius:8px;padding:7px 8px;cursor:pointer;background:${bg};transition:all 0.1s"
           onmouseover="this.style.borderColor='var(--border2)'" onmouseout="this.style.borderColor='${borderColor}'">
        <div style="font-size:12px;font-weight:${esHoy ? '700' : '500'};color:${esHoy ? 'var(--green)' : esFuturo ? 'var(--text3)' : 'var(--text)'};margin-bottom:4px">${d}${esHoy ? ' ●' : ''}</div>
        ${data ? `
          <div style="font-size:10px;font-weight:600;color:var(--green)">${data.count} ped.</div>
          <div style="font-size:10px;color:var(--text3)">${fmt(data.total).replace('MX$', '$')}</div>
        ` : esFuturo ? '' : `<div style="font-size:10px;color:var(--text3)">—</div>`}
      </div>`);
                }
                grid.innerHTML = celdas.join('');
            }

            function seleccionarDiaCal(fecha) {
                calFechaSeleccionada = fecha;
                renderCalendario(); // re-render para marcar selección
                const detalle = document.getElementById('cal-detalle-dia');
                const titulo = document.getElementById('cal-detalle-titulo');
                const lista = document.getElementById('cal-detalle-lista');
                if (!detalle) return;
                detalle.style.display = 'block';
                titulo.textContent = `Pedidos del ${fmtFecha(fecha)}`;
                const pedidosDia = pedidos.filter(p => p.fecha === fecha);
                if (pedidosDia.length === 0) {
                    lista.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text3);font-size:13px">Sin pedidos en esta fecha</div>`;
                    return;
                }
                lista.innerHTML = `<div style="display:grid;gap:8px">` + pedidosDia.map(p => `
    <div class="card card-sm" style="padding:12px;cursor:pointer" onclick="verDetallePedido('${p.id}')">
      <div class="flex justify-between items-center">
        <div>
          <span class="font-mono text-xs text-dim">#${p.id.slice(-4).toUpperCase()}</span>
          <span style="font-size:13px;font-weight:500;margin-left:8px">${p.cliente}</span>
        </div>
        <span class="badge ${estadoBadge(p.estado)}">${p.estado}</span>
      </div>
      <div style="font-size:12px;color:var(--text2);margin-top:4px">${(p.items || []).slice(0, 3).map(i => i.nombre || i).join(', ')}</div>
      <div class="flex justify-between mt-4">
        <span style="font-size:11px;color:var(--text3)">${p.horaStr || ''} · ${p.canal}</span>
        <span class="font-mono highlight-green" style="font-size:13px">${fmt(p.total)}</span>
      </div>
    </div>`).join('') + '</div>';
            }

            // ========== CATEGORÍAS ==========
            let categModalTipo = 'insumos';

            function openGestionCategorias(tipo) {
                categModalTipo = tipo;
                document.getElementById('categ-modal-title').textContent =
                    tipo === 'insumos' ? 'Categorías de Insumos' : 'Categorías del Menú';
                document.getElementById('nueva-categ-input').value = '';
                renderListaCategorias();
                openModal('modal-categorias');
            }

            function renderListaCategorias() {
                const lista = categModalTipo === 'insumos' ? categoriasInsumos : categoriasMenu;
                document.getElementById('lista-categorias').innerHTML = lista.map((c, i) => `
    <div class="flex items-center justify-between" style="padding:9px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:13px">${c}</span>
      <button class="btn btn-danger btn-sm" onclick="eliminarCategoria(${i})">🗑</button>
    </div>`).join('') || '<div style="text-align:center;padding:24px;color:var(--text3);font-size:13px">Sin categorías</div>';
            }

            function agregarCategoria() {
                const val = document.getElementById('nueva-categ-input').value.trim();
                if (!val) return;
                const lista = categModalTipo === 'insumos' ? categoriasInsumos : categoriasMenu;
                if (lista.includes(val)) { toast('Esa categoría ya existe', 'error'); return; }
                lista.push(val);
                save();
                document.getElementById('nueva-categ-input').value = '';
                renderListaCategorias();
                actualizarSelectsCategorias();
                toast(`Categoría "${val}" agregada`);
            }

            function eliminarCategoria(idx) {
                const lista = categModalTipo === 'insumos' ? categoriasInsumos : categoriasMenu;
                const nombre = lista[idx];
                lista.splice(idx, 1);
                save();
                renderListaCategorias();
                actualizarSelectsCategorias();
                toast(`Categoría "${nombre}" eliminada`);
            }

            function actualizarSelectsCategorias() {
                // Actualizar select de ingrediente
                const ingCat = document.getElementById('ing-categoria');
                if (ingCat) ingCat.innerHTML = categoriasInsumos.map(c => `<option>${c}</option>`).join('');
                // Actualizar select de platillo
                const platCat = document.getElementById('platillo-categoria');
                if (platCat) platCat.innerHTML = categoriasMenu.map(c => `<option>${c}</option>`).join('');
                // Actualizar filtro de inventario
                const filtroIng = document.getElementById('filtro-categ-ing');
                if (filtroIng) {
                    const sel = filtroIng.value;
                    filtroIng.innerHTML = '<option value="">Todas las categorías</option>' +
                        categoriasInsumos.map(c => `<option ${c === sel ? 'selected' : ''}>${c}</option>`).join('');
                }
                // Actualizar chips del menú
                const chipsWrap = document.getElementById('menu-categ-chips');
                if (chipsWrap) {
                    const active = document.querySelector('#menu-categ-chips .chip.active')?.textContent || 'Todas';
                    chipsWrap.innerHTML = `<span class="chip ${categoriaFiltro === 'todas' ? 'active' : ''}" onclick="filtrarCategoria(this,'todas')">Todas</span>` +
                        categoriasMenu.map(c => `<span class="chip ${categoriaFiltro === c ? 'active' : ''}" onclick="filtrarCategoria(this,'${c}')">${c}</span>`).join('');
                }
            }

            // ========== PRODUCCIONES ==========
            let preparadoEditId = null;
            let lineasPreparadoActual = [];
            let preparadoEjecId = null;

            function renderProducciones() {
                actualizarSelectsCategorias();
                // KPIs
                document.getElementById('prod-total').textContent = preparados.length;
                const mesStr = hoy().substring(0, 7);
                const ejecMes = historialProd.filter(h => h.fecha.startsWith(mesStr));
                document.getElementById('prod-mes').textContent = ejecMes.length;
                const costoTotal = ejecMes.reduce((s, h) => s + (h.costoTotal || 0), 0);
                document.getElementById('prod-costo-total').textContent = fmt(costoTotal);
                // Grid
                renderGridPreparados(preparados);
                // Historial
                renderHistorialProd();
            }

            function buscarPreparado(q) {
                renderGridPreparados(preparados.filter(p =>
                    p.nombre.toLowerCase().includes(q.toLowerCase())));
            }

            function renderGridPreparados(lista) {
                const grid = document.getElementById('preparados-grid');
                grid.innerHTML = lista.map(p => {
                    const costoUnit = p.rendimiento > 0 ? p.costoTotal / p.rendimiento : 0;
                    return `
    <div class="card" style="padding:16px;transition:all 0.15s" onmouseover="this.style.borderColor='var(--border2)'" onmouseout="this.style.borderColor='var(--border)'">
      <div class="flex justify-between items-center mb-8">
        <span class="badge badge-purple">${p.categoria}</span>
        <span style="font-size:11px;color:var(--text3);font-family:'DM Mono',monospace">${p.rendimiento} ${p.unidad}</span>
      </div>
      <div style="font-size:15px;font-weight:600;margin-bottom:4px">${p.nombre}</div>
      ${p.desc ? `<div style="font-size:12px;color:var(--text3);margin-bottom:10px;line-height:1.5">${p.desc.substring(0, 80)}${p.desc.length > 80 ? '…' : ''}</div>` : ''}
      <div style="font-size:12px;color:var(--text2);margin-bottom:10px">
        ${(p.lineas || []).length} insumo${(p.lineas || []).length !== 1 ? 's' : ''}:
        ${(p.lineas || []).slice(0, 3).map(l => {
                        const ing = inventario.find(i => i.id === l.ingId);
                        return ing ? `<span style="color:var(--text3)">${ing.nombre}</span>` : '';
                    }).filter(Boolean).join(', ')}${(p.lineas || []).length > 3 ? '…' : ''}
      </div>
      <hr class="divider">
      <div class="flex justify-between items-center mb-12">
        <div>
          <div style="font-size:11px;color:var(--text3)">Costo total</div>
          <div style="font-size:16px;font-weight:600;color:var(--purple)">${fmt(p.costoTotal)}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;color:var(--text3)">Costo / ${p.unidad}</div>
          <div style="font-size:16px;font-weight:600;color:var(--green)">${fmt(costoUnit)}</div>
        </div>
      </div>
      <div class="flex gap-6">
        <button class="btn btn-primary btn-sm flex-1" onclick="openEjecutarProduccion('${p.id}')">▶ Ejecutar producción</button>
        <button class="btn btn-secondary btn-sm" onclick="editarPreparado('${p.id}')">✏</button>
        <button class="btn btn-danger btn-sm" onclick="eliminarPreparado('${p.id}')">🗑</button>
      </div>
    </div>`;
                }).join('') || '<div class="empty" style="grid-column:1/-1"><div class="empty-icon">🧪</div><div class="empty-title">Sin preparados registrados</div><div class="empty-text">Crea tu primera receta de salsa o base</div></div>';
            }

            function renderHistorialProd() {
                const tbody = document.getElementById('tabla-historial-prod');
                const sorted = [...historialProd].sort((a, b) => b.fecha.localeCompare(a.fecha));
                tbody.innerHTML = sorted.map(h => `<tr>
    <td class="text-dim">${fmtFecha(h.fecha)}</td>
    <td style="font-weight:500">${h.nombrePreparado}</td>
    <td class="font-mono">${h.cantidadProducida} ${h.unidad}</td>
    <td class="font-mono highlight-green">${fmt(h.costoTotal)}</td>
    <td class="text-dim">${h.usuario || 'Admin'}</td>
  </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text3)">Sin producciones ejecutadas</td></tr>';
            }

            function openNuevoPreparado() {
                preparadoEditId = null;
                lineasPreparadoActual = [];
                document.getElementById('preparado-modal-title').textContent = 'Nueva Producción';
                ['prep-nombre', 'prep-rendimiento', 'prep-desc'].forEach(id => document.getElementById(id).value = '');
                renderLineasPreparado();
                openModal('modal-preparado');
            }

            function editarPreparado(id) {
                const p = preparados.find(x => x.id === id);
                if (!p) return;
                preparadoEditId = id;
                lineasPreparadoActual = JSON.parse(JSON.stringify(p.lineas || []));
                document.getElementById('preparado-modal-title').textContent = 'Editar Preparado';
                document.getElementById('prep-nombre').value = p.nombre;
                document.getElementById('prep-rendimiento').value = p.rendimiento;
                document.getElementById('prep-desc').value = p.desc || '';
                document.getElementById('prep-categoria').value = p.categoria;
                document.getElementById('prep-unidad').value = p.unidad;
                renderLineasPreparado();
                openModal('modal-preparado');
            }

            function eliminarPreparado(id) {
                preparados = preparados.filter(p => p.id !== id);
                save();
                renderProducciones();
                toast('Preparado eliminado');
            }

            function agregarLineaPrep() {
                lineasPreparadoActual.push({ ingId: '', cantidad: 0 });
                renderLineasPreparado();
            }

            function renderLineasPreparado() {
                const cont = document.getElementById('prep-lineas-items');
                if (lineasPreparadoActual.length === 0) {
                    cont.innerHTML = '<div style="padding:12px;text-align:center;font-size:12px;color:var(--text3)">Sin insumos. Agrega los ingredientes del preparado.</div>';
                    document.getElementById('prep-costo-total').textContent = '$0.00';
                    document.getElementById('prep-costo-unit').textContent = '$0.00';
                    return;
                }
                cont.innerHTML = lineasPreparadoActual.map((linea, idx) => {
                    const ing = inventario.find(i => i.id === linea.ingId);
                    const costoLinea = ing ? ing.costo * (linea.cantidad || 0) : 0;
                    return `
    <div style="display:grid;grid-template-columns:1fr 90px 80px 36px;gap:0;padding:7px 10px;border-top:1px solid var(--border);align-items:center">
      <select class="form-input" style="font-size:12px;padding:5px 8px;border-radius:4px"
              onchange="actualizarLineaPrep(${idx},'ingId',this.value)">
        <option value="">Seleccionar insumo...</option>
        ${inventario.map(i => `<option value="${i.id}" ${i.id === linea.ingId ? 'selected' : ''}>${i.nombre} (${i.unidad})</option>`).join('')}
      </select>
      <input type="number" class="form-input" style="font-size:12px;padding:5px 8px;border-radius:4px;margin-left:6px"
             placeholder="0" value="${linea.cantidad || ''}"
             onchange="actualizarLineaPrep(${idx},'cantidad',parseFloat(this.value)||0)">
      <span class="font-mono" style="font-size:12px;color:var(--purple);padding-left:8px">${fmt(costoLinea)}</span>
      <button onclick="eliminarLineaPrep(${idx})" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:16px;padding:0 4px">×</button>
    </div>`;
                }).join('');
                calcularCostoPreparado();
            }

            function actualizarLineaPrep(idx, campo, valor) {
                lineasPreparadoActual[idx][campo] = valor;
                const items = document.querySelectorAll('#prep-lineas-items > div');
                lineasPreparadoActual.forEach((linea, i) => {
                    const ing = inventario.find(x => x.id === linea.ingId);
                    const costoLinea = ing ? ing.costo * (linea.cantidad || 0) : 0;
                    const costoEl = items[i]?.querySelectorAll('span')[0];
                    if (costoEl) costoEl.textContent = fmt(costoLinea);
                });
                calcularCostoPreparado();
            }

            function eliminarLineaPrep(idx) {
                lineasPreparadoActual.splice(idx, 1);
                renderLineasPreparado();
            }

            function calcularCostoPreparado() {
                const total = lineasPreparadoActual.reduce((s, l) => {
                    const ing = inventario.find(i => i.id === l.ingId);
                    return s + (ing ? ing.costo * (l.cantidad || 0) : 0);
                }, 0);
                const rendimiento = parseFloat(document.getElementById('prep-rendimiento')?.value) || 0;
                const costoUnit = rendimiento > 0 ? total / rendimiento : 0;
                document.getElementById('prep-costo-total').textContent = fmt(total);
                document.getElementById('prep-costo-unit').textContent = fmt(costoUnit) + ' / ' + (document.getElementById('prep-unidad')?.value || 'u');
                return total;
            }

            function guardarPreparado() {
                const nombre = document.getElementById('prep-nombre').value.trim();
                if (!nombre) { toast('Ingresa el nombre del preparado', 'error'); return; }
                const rendimiento = parseFloat(document.getElementById('prep-rendimiento').value) || 0;
                if (!rendimiento) { toast('Ingresa el rendimiento', 'error'); return; }
                if (!lineasPreparadoActual.length) { toast('Agrega al menos un insumo', 'error'); return; }

                const costoTotal = lineasPreparadoActual.reduce((s, l) => {
                    const ing = inventario.find(i => i.id === l.ingId);
                    return s + (ing ? ing.costo * (l.cantidad || 0) : 0);
                }, 0);
                const unidad = document.getElementById('prep-unidad').value;
                const costoUnit = rendimiento > 0 ? costoTotal / rendimiento : 0;

                if (preparadoEditId) {
                    const p = preparados.find(x => x.id === preparadoEditId);
                    if (p) { Object.assign(p, { nombre, categoria: document.getElementById('prep-categoria').value, rendimiento, unidad, desc: document.getElementById('prep-desc').value, lineas: lineasPreparadoActual, costoTotal, costoUnit }); }
                } else {
                    preparados.push({ id: uid(), nombre, categoria: document.getElementById('prep-categoria').value, rendimiento, unidad, desc: document.getElementById('prep-desc').value, lineas: lineasPreparadoActual, costoTotal, costoUnit });
                }
                save();
                closeModal('modal-preparado');
                toast(`Preparado "${nombre}" guardado — costo/u: ${fmt(costoUnit)}/${unidad}`);
                renderProducciones();
            }

            // --- Ejecutar producción ---
            let cantidadEjecucion = 1;

            function openEjecutarProduccion(id) {
                const p = preparados.find(x => x.id === id);
                if (!p) return;
                preparadoEjecId = id;
                cantidadEjecucion = 1;

                // Verificar stock disponible
                const advertencias = p.lineas.map(l => {
                    const ing = inventario.find(i => i.id === l.ingId);
                    if (!ing) return `<div style="color:var(--red);font-size:12px">⚠ Insumo "${l.nombre || l.ingId}" no encontrado en inventario</div>`;
                    const disponible = ing.stock;
                    const necesita = l.cantidad * 1;
                    if (disponible < necesita) return `<div style="color:var(--amber);font-size:12px">⚠ ${ing.nombre}: necesitas ${necesita} ${ing.unidad}, tienes ${disponible}</div>`;
                    return null;
                }).filter(Boolean);

                document.getElementById('ejecutar-prod-body').innerHTML = `
    <div style="margin-bottom:16px">
      <div style="font-size:16px;font-weight:600;margin-bottom:4px">${p.nombre}</div>
      <div style="font-size:12px;color:var(--text3)">Rendimiento base: ${p.rendimiento} ${p.unidad} · Costo: ${fmt(p.costoTotal)}</div>
    </div>
    <div class="form-group">
      <label class="form-label">¿Cuántas veces producir? (multiplicador de la receta)</label>
      <div class="num-input">
        <button class="num-btn" onclick="cambiarCantEjec(-1)">−</button>
        <span class="num-val" id="cant-ejec-val">1</span>
        <button class="num-btn" onclick="cambiarCantEjec(1)">+</button>
      </div>
    </div>
    <div class="card card-sm mt-12" id="resumen-ejecucion" style="background:var(--bg3)"></div>
    ${advertencias.length ? `<div class="card card-sm mt-8" style="background:var(--amber-dim);border-color:rgba(251,191,36,0.2)">${advertencias.join('')}</div>` : ''}
    <div class="card card-sm mt-8" style="background:var(--purple-dim);border-color:rgba(167,139,250,0.2);font-size:12px;color:var(--text2)">
      ✅ Al confirmar: se descontarán los insumos del inventario y se agregará <strong style="color:var(--green)">${p.nombre}</strong> como insumo disponible.
    </div>`;
                actualizarResumenEjec(p);
                openModal('modal-ejecutar-prod');
            }

            function cambiarCantEjec(delta) {
                cantidadEjecucion = Math.max(1, cantidadEjecucion + delta);
                document.getElementById('cant-ejec-val').textContent = cantidadEjecucion;
                const p = preparados.find(x => x.id === preparadoEjecId);
                if (p) actualizarResumenEjec(p);
            }

            function actualizarResumenEjec(p) {
                const n = cantidadEjecucion;
                const costoTotal = p.costoTotal * n;
                const cantProducida = p.rendimiento * n;
                const el = document.getElementById('resumen-ejecucion');
                if (!el) return;
                el.innerHTML = `
    <div class="flex justify-between mb-6">
      <span style="color:var(--text3);font-size:12px">Insumos a descontar:</span>
    </div>
    ${p.lineas.map(l => {
                    const ing = inventario.find(i => i.id === l.ingId);
                    const necesita = l.cantidad * n;
                    const ok = ing && ing.stock >= necesita;
                    return `<div class="flex justify-between" style="font-size:12px;padding:3px 0">
        <span>${ing?.nombre || '—'}</span>
        <span style="font-family:'DM Mono',monospace;color:${ok ? 'var(--text)' : 'var(--red)'}">${necesita} ${ing?.unidad || ''} ${ok ? '' : '⚠'}</span>
      </div>`;
                }).join('')}
    <hr style="border:none;border-top:1px solid var(--border);margin:8px 0">
    <div class="flex justify-between" style="font-size:13px;font-weight:600">
      <span>Producirás:</span>
      <span style="color:var(--green);font-family:'DM Mono',monospace">${cantProducida} ${p.unidad} de ${p.nombre}</span>
    </div>
    <div class="flex justify-between" style="font-size:12px;margin-top:4px">
      <span style="color:var(--text3)">Costo total de esta corrida:</span>
      <span style="color:var(--purple);font-family:'DM Mono',monospace">${fmt(costoTotal)}</span>
    </div>`;
            }

            function confirmarEjecucion() {
                const p = preparados.find(x => x.id === preparadoEjecId);
                if (!p) return;
                const n = cantidadEjecucion;

                // Verificar stock suficiente
                for (const l of p.lineas) {
                    const ing = inventario.find(i => i.id === l.ingId);
                    if (!ing) continue;
                    if (ing.stock < l.cantidad * n) {
                        toast(`Stock insuficiente: ${ing.nombre} (tienes ${ing.stock}, necesitas ${l.cantidad * n})`, 'error');
                        return;
                    }
                }

                // Descontar insumos del inventario
                p.lineas.forEach(l => {
                    const ing = inventario.find(i => i.id === l.ingId);
                    if (ing) ing.stock = Math.max(0, ing.stock - l.cantidad * n);
                });

                // Agregar el preparado al inventario (o sumar si ya existe)
                const cantProducida = p.rendimiento * n;
                const costoUnit = p.costoUnit;
                let ingExistente = inventario.find(i => i.nombre.toLowerCase() === p.nombre.toLowerCase() && i._esPreparado);
                if (ingExistente) {
                    ingExistente.stock += cantProducida;
                    ingExistente.costo = costoUnit; // Actualizar costo unitario
                } else {
                    inventario.push({
                        id: uid(),
                        nombre: p.nombre,
                        categoria: 'Preparados',
                        stock: cantProducida,
                        minimo: 0,
                        unidad: p.unidad,
                        costo: costoUnit,
                        proveedor: '',
                        _esPreparado: true,
                    });
                    // Asegurar que "Preparados" exista en categorías de insumos
                    if (!categoriasInsumos.includes('Preparados')) {
                        categoriasInsumos.push('Preparados');
                    }
                }

                // Registrar en historial
                historialProd.push({
                    id: uid(),
                    preparadoId: p.id,
                    nombrePreparado: p.nombre,
                    cantidadProducida: cantProducida,
                    unidad: p.unidad,
                    costoTotal: p.costoTotal * n,
                    fecha: hoy(),
                    usuario: sesionActual?.nombre || 'Admin',
                });

                save();
                closeModal('modal-ejecutar-prod');
                toast(`✅ ${cantProducida} ${p.unidad} de "${p.nombre}" producidos y agregados al inventario`);
                renderProducciones();
            }

            // ========== RESUMEN PLATILLOS ==========
            function renderResumenPlatillos() {
                const hoyStr = hoy();
                const filtroEl = document.getElementById('resumen-estado-filtro');
                const filtro = filtroEl ? filtroEl.value : '';
                let pedidosBase = pedidos.filter(p => p.fecha === hoyStr && p.estado !== 'Cancelado');
                if (filtro === 'activos') pedidosBase = pedidosBase.filter(p => ['Nuevo', 'En preparación', 'Listo'].includes(p.estado));
                else if (filtro) pedidosBase = pedidosBase.filter(p => p.estado === filtro);

                const conteo = {};
                pedidosBase.forEach(p => {
                    (p.items || []).forEach(it => {
                        const n = it.nombre || it;
                        conteo[n] = (conteo[n] || 0) + (it.cantidad || 1);
                    });
                });
                const sorted = Object.entries(conteo).sort((a, b) => b[1] - a[1]);
                const max = sorted[0]?.[1] || 1;
                const grid = document.getElementById('resumen-platillos-grid');
                if (!grid) return;
                if (sorted.length === 0) {
                    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:16px;color:var(--text3);font-size:13px">Sin pedidos para mostrar hoy</div>';
                    return;
                }
                grid.innerHTML = sorted.map(([nombre, cnt]) => `
    <div class="card card-sm" style="padding:12px;transition:all 0.15s" onmouseover="this.style.borderColor='var(--border2)'" onmouseout="this.style.borderColor='var(--border)'">
      <div style="font-size:11px;color:var(--text3);margin-bottom:4px;line-height:1.3">${nombre}</div>
      <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:6px">
        <span style="font-size:24px;font-weight:700;font-family:'DM Mono',monospace;color:var(--green)">${cnt}</span>
        <span style="font-size:11px;color:var(--text3)">pza</span>
      </div>
      <div style="height:3px;background:var(--bg4);border-radius:2px;overflow:hidden">
        <div style="height:100%;width:${(cnt / max) * 100}%;background:var(--green);border-radius:2px"></div>
      </div>
    </div>`).join('');
            }

            // ========== ELIMINACIÓN DE PEDIDOS ==========
            let historialEliminaciones = DB.get('historialEliminaciones') || [];
            let pedidoEliminarId = null;
            let filtroAdminEstado = '';
            let filtroAdminFecha = '';
            let filtroAdminBusqueda = '';

            function renderEliminacion() {
                // Solo admins
                if (sesionActual?.rol !== 'admin') {
                    document.getElementById('tabla-admin-pedidos').innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text3)">Acceso solo para administradores</td></tr>';
                    return;
                }
                renderTablaPedidosAdmin();
                renderHistorialEliminaciones();
            }

            function filtrarPedidosAdmin(q) { filtroAdminBusqueda = q; renderTablaPedidosAdmin(); }
            function filtrarEstadoAdmin(v) { filtroAdminEstado = v; renderTablaPedidosAdmin(); }
            function filtrarFechaAdmin(v) { filtroAdminFecha = v; renderTablaPedidosAdmin(); }

            function renderTablaPedidosAdmin() {
                let lista = [...pedidos];
                if (filtroAdminBusqueda) lista = lista.filter(p => p.cliente.toLowerCase().includes(filtroAdminBusqueda.toLowerCase()) || p.id.includes(filtroAdminBusqueda));
                if (filtroAdminEstado) lista = lista.filter(p => p.estado === filtroAdminEstado);
                if (filtroAdminFecha) lista = lista.filter(p => p.fecha === filtroAdminFecha);
                lista.sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));

                const tbody = document.getElementById('tabla-admin-pedidos');
                if (!tbody) return;
                tbody.innerHTML = lista.map(p => `
    <tr>
      <td class="font-mono text-xs text-dim">#${p.id.slice(-4).toUpperCase()}</td>
      <td class="text-dim">${fmtFecha(p.fecha)} ${p.horaStr || ''}</td>
      <td style="font-weight:500">${p.cliente}</td>
      <td style="font-size:12px;color:var(--text2)">${(p.items || []).slice(0, 3).map(i => i.nombre || i).join(', ')}${(p.items || []).length > 3 ? ` +${(p.items || []).length - 3}` : ''}</td>
      <td class="font-mono highlight-green">${fmt(p.total)}</td>
      <td><span class="badge ${estadoBadge(p.estado)}">${p.estado}</span></td>
      <td><button class="btn btn-danger btn-sm" onclick="openEliminarPedido('${p.id}')">🗑 Eliminar</button></td>
    </tr>`).join('') || '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text3)">Sin pedidos con esos filtros</td></tr>';
            }

            function openEliminarPedido(id) {
                const p = pedidos.find(x => x.id === id);
                if (!p) return;
                pedidoEliminarId = id;
                document.getElementById('eliminar-pedido-info').innerHTML = `
    <div class="flex justify-between mb-6">
      <strong>#${id.slice(-4).toUpperCase()}</strong>
      <span class="badge ${estadoBadge(p.estado)}">${p.estado}</span>
    </div>
    <div style="font-size:13px;margin-bottom:4px">👤 ${p.cliente} · ${p.canal} · ${fmtFecha(p.fecha)}</div>
    <div style="font-size:12px;color:var(--text2)">${(p.items || []).map(i => `${i.nombre || i} ×${i.cantidad || 1}`).join(', ')}</div>
    <div style="font-size:14px;font-weight:600;color:var(--green);margin-top:8px">${fmt(p.total)}</div>`;
                document.getElementById('eliminar-motivo').value = '';
                document.getElementById('eliminar-notas').value = '';
                document.getElementById('eliminar-otro-wrap').style.display = 'none';
                document.getElementById('eliminar-motivo').onchange = function () {
                    document.getElementById('eliminar-otro-wrap').style.display = this.value === 'Otro' ? 'block' : 'none';
                };
                openModal('modal-eliminar-pedido');
            }

            function confirmarEliminarPedido() {
                const motivo = document.getElementById('eliminar-motivo').value;
                if (!motivo) { toast('Selecciona un motivo de eliminación', 'error'); return; }
                const motivoFinal = motivo === 'Otro' ? (document.getElementById('eliminar-otro-texto').value || 'Otro') : motivo;
                const p = pedidos.find(x => x.id === pedidoEliminarId);
                if (!p) return;

                // Guardar en historial antes de eliminar
                historialEliminaciones.push({
                    id: uid(),
                    pedidoId: pedidoEliminarId,
                    pedidoNum: pedidoEliminarId.slice(-4).toUpperCase(),
                    cliente: p.cliente,
                    total: p.total,
                    estado: p.estado,
                    fecha: p.fecha,
                    motivo: motivoFinal,
                    notas: document.getElementById('eliminar-notas').value,
                    eliminadoPor: sesionActual?.nombre || 'Admin',
                    fechaEliminacion: hoy(),
                    horaEliminacion: hora(),
                });

                pedidos = pedidos.filter(x => x.id !== pedidoEliminarId);
                DB.set('historialEliminaciones', historialEliminaciones);
                save();
                closeModal('modal-eliminar-pedido');
                toast(`Pedido #${pedidoEliminarId.slice(-4).toUpperCase()} eliminado — Motivo: ${motivoFinal}`);
                renderEliminacion();
                renderDashboard();
            }

            function renderHistorialEliminaciones() {
                const tbody = document.getElementById('tabla-historial-eliminaciones');
                if (!tbody) return;
                const sorted = [...historialEliminaciones].sort((a, b) => (b.fechaEliminacion + b.horaEliminacion).localeCompare(a.fechaEliminacion + a.horaEliminacion));
                tbody.innerHTML = sorted.map(h => `
    <tr>
      <td class="text-dim">${fmtFecha(h.fechaEliminacion)} ${h.horaEliminacion || ''}</td>
      <td class="font-mono text-dim">#${h.pedidoNum}</td>
      <td>${h.cliente}</td>
      <td class="font-mono">${fmt(h.total)}</td>
      <td><span class="badge badge-amber" style="font-size:11px">${h.motivo}</span>${h.notas ? `<div style="font-size:11px;color:var(--text3);margin-top:2px">${h.notas}</div>` : ''}</td>
      <td class="text-dim">${h.eliminadoPor}</td>
    </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text3)">Sin eliminaciones registradas</td></tr>';
            }

            // ========== ALERTAS INVENTARIO ==========
            let configAlertasTemp = {};

            function renderAlertas() {
                const agotados = inventario.filter(i => i.stock === 0);
                const bajo = inventario.filter(i => i.stock > 0 && i.stock <= i.minimo);
                const bagBadge = document.getElementById('badge-agotados');
                const bajoBadge = document.getElementById('badge-stock-bajo');
                if (bagBadge) bagBadge.textContent = agotados.length;
                if (bajoBadge) bajoBadge.textContent = bajo.length;

                const listaAgotados = document.getElementById('lista-agotados');
                const listaBajo = document.getElementById('lista-stock-bajo');

                if (listaAgotados) {
                    listaAgotados.innerHTML = agotados.length === 0
                        ? '<div style="text-align:center;padding:16px;color:var(--text3);font-size:12px">✅ Ningún ingrediente agotado</div>'
                        : agotados.map(i => `
        <div class="flex items-center justify-between" style="padding:8px 0;border-bottom:1px solid var(--border)">
          <div>
            <div style="font-size:13px;font-weight:500">${i.nombre}</div>
            <div style="font-size:11px;color:var(--text3)">${i.categoria} · Mín: ${i.minimo} ${i.unidad}</div>
          </div>
          <div class="flex gap-6 items-center">
            <span class="badge badge-red">0 ${i.unidad}</span>
            <button class="btn btn-secondary btn-sm" onclick="ajustarStock('${i.id}')">+ Stock</button>
          </div>
        </div>`).join('');
                }

                if (listaBajo) {
                    listaBajo.innerHTML = bajo.length === 0
                        ? '<div style="text-align:center;padding:16px;color:var(--text3);font-size:12px">✅ Stock en buen nivel</div>'
                        : bajo.map(i => {
                            const pct = Math.round((i.stock / i.minimo) * 100);
                            return `
          <div class="flex items-center justify-between" style="padding:8px 0;border-bottom:1px solid var(--border)">
            <div style="flex:1">
              <div style="font-size:13px;font-weight:500">${i.nombre}</div>
              <div style="font-size:11px;color:var(--text3);margin-bottom:4px">${i.categoria} · Mín: ${i.minimo} ${i.unidad}</div>
              <div style="height:3px;background:var(--bg4);border-radius:2px;width:80px">
                <div style="height:100%;width:${Math.min(pct, 100)}%;background:var(--amber);border-radius:2px"></div>
              </div>
            </div>
            <div class="flex gap-6 items-center">
              <span class="badge badge-amber">${i.stock} ${i.unidad}</span>
              <button class="btn btn-secondary btn-sm" onclick="ajustarStock('${i.id}')">+ Stock</button>
            </div>
          </div>`}).join('');
                }

                // Tabla de configuración
                renderTablaConfigAlertas(inventario);
            }

            function filtrarConfigAlertas(q) {
                renderTablaConfigAlertas(inventario.filter(i => i.nombre.toLowerCase().includes(q.toLowerCase())));
            }

            function renderTablaConfigAlertas(lista) {
                const tbody = document.getElementById('tabla-config-alertas');
                if (!tbody) return;
                tbody.innerHTML = lista.map(i => {
                    const color = i.stock === 0 ? 'var(--red)' : i.stock <= i.minimo ? 'var(--amber)' : 'var(--green)';
                    const tmpMin = configAlertasTemp[i.id]?.minimo ?? i.minimo;
                    const tmpNotif = configAlertasTemp[i.id]?.notif ?? (i.minimo * 1.5).toFixed(1);
                    return `<tr>
      <td style="font-weight:500">${i.nombre}</td>
      <td><span class="badge badge-gray">${i.categoria}</span></td>
      <td><span style="font-weight:600;color:${color}">${i.stock}</span> <span class="text-dim" style="font-size:11px">${i.unidad}</span></td>
      <td class="font-mono text-dim">${i.minimo} ${i.unidad}</td>
      <td><input type="number" class="form-input" style="width:90px;padding:5px 8px;font-size:12px" value="${tmpMin}" min="0" onchange="setConfigAlertaTemp('${i.id}','minimo',parseFloat(this.value)||0)"></td>
      <td><input type="number" class="form-input" style="width:90px;padding:5px 8px;font-size:12px" value="${tmpNotif}" min="0" onchange="setConfigAlertaTemp('${i.id}','notif',parseFloat(this.value)||0)" placeholder="Avisar cuando llegue a..."></td>
      <td><button class="btn btn-secondary btn-sm" onclick="guardarAlertaIndividual('${i.id}')">Guardar</button></td>
    </tr>`;
                }).join('') || '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text3)">Sin ingredientes</td></tr>';
            }

            function setConfigAlertaTemp(id, campo, valor) {
                if (!configAlertasTemp[id]) configAlertasTemp[id] = {};
                configAlertasTemp[id][campo] = valor;
            }

            function guardarAlertaIndividual(id) {
                const ing = inventario.find(i => i.id === id);
                if (!ing) return;
                if (configAlertasTemp[id]?.minimo !== undefined) ing.minimo = configAlertasTemp[id].minimo;
                if (configAlertasTemp[id]?.notif !== undefined) ing.notifEn = configAlertasTemp[id].notif;
                save();
                toast(`Alerta de ${ing.nombre} actualizada`);
                renderAlertas();
            }

            function guardarConfigAlertas() {
                let cambios = 0;
                Object.entries(configAlertasTemp).forEach(([id, cfg]) => {
                    const ing = inventario.find(i => i.id === id);
                    if (!ing) return;
                    if (cfg.minimo !== undefined) ing.minimo = cfg.minimo;
                    if (cfg.notif !== undefined) ing.notifEn = cfg.notif;
                    cambios++;
                });
                configAlertasTemp = {};
                save();
                toast(`${cambios} alertas actualizadas`);
                renderAlertas();
            }

            function openConfigAlertas() { openModal('modal-config-alertas'); }
            function guardarConfigAlertasGlobal() {
                const umbral = parseFloat(document.getElementById('alerta-umbral-global').value) || 1.5;
                inventario.forEach(i => { i.notifEn = i.minimo * umbral; });
                save();
                closeModal('modal-config-alertas');
                toast(`Umbral global actualizado: ${umbral}× el mínimo`);
                renderAlertas();
            }

            // ========== PRESENTACIONES ==========
            let presentaciones = DB.get('presentaciones') || [];

            // Guardar presentaciones en save() — integrado directamente arriba

            function switchInvTab(el, tab) {
                document.querySelectorAll('#page-inventario .tab').forEach(t => t.classList.remove('active'));
                el.classList.add('active');
                document.getElementById('inv-tab-ingredientes').style.display = tab === 'ingredientes' ? 'block' : 'none';
                document.getElementById('inv-tab-presentaciones').style.display = tab === 'presentaciones' ? 'block' : 'none';
                document.getElementById('inv-tab-alertas').style.display = tab === 'alertas' ? 'block' : 'none';
                document.getElementById('inv-btns-ingredientes').style.display = tab === 'ingredientes' ? 'flex' : 'none';
                document.getElementById('inv-btns-presentaciones').style.display = tab === 'presentaciones' ? 'flex' : 'none';
                document.getElementById('inv-btns-alertas').style.display = tab === 'alertas' ? 'flex' : 'none';
                if (tab === 'presentaciones') renderPresentaciones(presentaciones);
                if (tab === 'alertas') renderAlertas();
            }

            function renderPresentaciones(lista) {
                const tbody = document.getElementById('tabla-presentaciones');
                if (!tbody) return;
                tbody.innerHTML = lista.map(p => {
                    const ing = inventario.find(i => i.id === p.ingId);
                    const costoUnit = p.cantidad > 0 ? p.costoPres / p.cantidad : 0;
                    return `<tr>
      <td style="font-weight:500">${ing?.nombre || '—'}</td>
      <td>${p.nombre}</td>
      <td class="font-mono">${p.cantidad}</td>
      <td class="text-dim">${p.unidad}</td>
      <td class="font-mono">${fmt(p.costoPres)}</td>
      <td class="font-mono highlight-green">${fmt(costoUnit)}<span style="font-size:10px;color:var(--text3)"> / ${p.unidad}</span></td>
      <td>
        ${p.esDefault
                            ? '<span class="badge badge-green">✓ Predeterminada</span>'
                            : `<button class="btn btn-secondary btn-sm" onclick="setDefaultPres('${p.id}','${p.ingId}')">Usar como default</button>`}
      </td>
      <td><button class="btn btn-danger btn-sm" onclick="eliminarPresentacion('${p.id}')">🗑</button></td>
    </tr>`;
                }).join('') || '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text3)">Sin presentaciones registradas</td></tr>';
            }

            function buscarPresentacion(q) {
                const f = presentaciones.filter(p => {
                    const ing = inventario.find(i => i.id === p.ingId);
                    return (ing?.nombre || '').toLowerCase().includes(q.toLowerCase()) ||
                        p.nombre.toLowerCase().includes(q.toLowerCase());
                });
                renderPresentaciones(f);
            }

            function openNuevaPresentacion(ingId) {
                document.getElementById('pres-modal-title').textContent = 'Nueva Presentación';
                document.getElementById('pres-nombre').value = '';
                document.getElementById('pres-cantidad').value = '';
                document.getElementById('pres-costo').value = '';
                document.getElementById('pres-costo-unit').textContent = '$0.00';
                document.getElementById('pres-costo-formula').textContent = '—';
                document.getElementById('pres-default').value = 'true';
                const sel = document.getElementById('pres-insumo');
                sel.innerHTML = '<option value="">Seleccionar insumo...</option>' +
                    inventario.map(i => `<option value="${i.id}" ${i.id === ingId ? 'selected' : ''}>${i.nombre} (${i.unidad})</option>`).join('');
                if (ingId) actualizarUnidadPres(ingId);
                openModal('modal-presentacion');
            }

            function actualizarUnidadPres(ingId) {
                const ing = inventario.find(i => i.id === ingId);
                if (!ing) return;
                document.getElementById('pres-unidad').value = ing.unidad;
            }

            function calcularCostoUnitario() {
                const cantidad = parseFloat(document.getElementById('pres-cantidad').value) || 0;
                const costo = parseFloat(document.getElementById('pres-costo').value) || 0;
                const unidad = document.getElementById('pres-unidad').value || 'u';
                const costoUnit = cantidad > 0 ? costo / cantidad : 0;
                document.getElementById('pres-costo-unit').textContent = fmt(costoUnit);
                document.getElementById('pres-costo-formula').textContent =
                    cantidad > 0 ? `${fmt(costo)} ÷ ${cantidad} ${unidad} = ${fmt(costoUnit)} por ${unidad}` : '—';
            }

            function guardarPresentacion() {
                const ingId = document.getElementById('pres-insumo').value;
                const nombre = document.getElementById('pres-nombre').value.trim();
                const cantidad = parseFloat(document.getElementById('pres-cantidad').value) || 0;
                const costoPres = parseFloat(document.getElementById('pres-costo').value) || 0;
                const unidad = document.getElementById('pres-unidad').value;
                const esDefault = document.getElementById('pres-default').value === 'true';

                if (!ingId) { toast('Selecciona un insumo', 'error'); return; }
                if (!nombre) { toast('Ingresa el nombre de la presentación', 'error'); return; }
                if (!cantidad || !costoPres) { toast('Ingresa cantidad y costo', 'error'); return; }

                const costoUnit = costoPres / cantidad;

                // Si es default, marcar las demás de este insumo como no default
                if (esDefault) {
                    presentaciones.forEach(p => { if (p.ingId === ingId) p.esDefault = false; });
                    // Actualizar costo del ingrediente automáticamente
                    const ing = inventario.find(i => i.id === ingId);
                    if (ing) {
                        ing.costo = costoUnit;
                        ing.unidad = unidad;
                    }
                }

                presentaciones.push({ id: uid(), ingId, nombre, cantidad, unidad, costoPres, costoUnit, esDefault });
                save();
                closeModal('modal-presentacion');
                toast(`Presentación guardada — costo unitario: ${fmt(costoUnit)}/${unidad}${esDefault ? ' (actualizado en insumo)' : ''}`);
                renderPresentaciones(presentaciones);
                renderInventario();
            }

            function setDefaultPres(presId, ingId) {
                // Quitar default de las demás del mismo insumo
                presentaciones.forEach(p => { if (p.ingId === ingId) p.esDefault = false; });
                const p = presentaciones.find(x => x.id === presId);
                if (p) {
                    p.esDefault = true;
                    // Actualizar costo del insumo automáticamente
                    const ing = inventario.find(i => i.id === ingId);
                    if (ing) { ing.costo = p.costoUnit; ing.unidad = p.unidad; }
                }
                save();
                renderPresentaciones(presentaciones);
                renderInventario();
                toast('Presentación predeterminada actualizada — costo del insumo actualizado ✅');
            }

            function eliminarPresentacion(id) {
                presentaciones = presentaciones.filter(p => p.id !== id);
                save();
                renderPresentaciones(presentaciones);
                toast('Presentación eliminada');
            }

            // ========== INIT ==========
            seedData();
            DB.set('usuarios', usuarios); // persist default users if first time

            // Restaurar sesión o mostrar login
            const sesionGuardada = DB.get('sesion');
            if (sesionGuardada) {
                const u = usuarios.find(x => x.id === sesionGuardada.id && x.activo);
                if (u) {
                    sesionActual = u;
                    document.getElementById('login-screen').style.display = 'none';
                    document.getElementById('sidebar-nombre').textContent = u.nombre;
                    document.getElementById('sidebar-rol').textContent = u.rol === 'admin' ? 'Administrador' : 'Operador / Caja';
                    document.getElementById('sidebar-avatar').textContent = u.nombre[0].toUpperCase();
                    aplicarPermisos();
                    renderDashboard();
                }
            document.getElementById('fecha-hoy').textContent = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

            // ========== CRM KANBAN ==========
            const crmColumns = ['Nuevo Lead', 'Interesado', 'Cotización Enviada', 'Cliente Activo', 'Inactivo / Pausado'];

            function renderCRMKanban() {
                const board = document.getElementById('crm-kanban-board');
                if (!board) return;
                board.innerHTML = '';

                crmColumns.forEach(col => {
                    const colDiv = document.createElement('div');
                    colDiv.className = 'kanban-col';
                    
                    const colClients = clientes.filter(c => {
                        const estado = c.crm_estado || 'Nuevo Lead';
                        return estado === col;
                    });

                    colDiv.innerHTML = `
                        <div class="kanban-header">
                            <div class="kanban-title">${col}</div>
                            ${col === 'Interesado' ? `<button class="btn btn-secondary btn-sm" style="font-size: 9px; padding: 2px 5px;" onclick="enviarWAMasivo('${col}')">💬 Masivo</button>` : ''}
                            <span class="kanban-count">${colClients.length}</span>
                        </div>
                        <div class="kanban-cards" ondragover="allowDropCRM(event)" ondrop="dropCRM(event, '${col}')" style="min-height: 200px;">
                            ${colClients.map(c => `
                                <div class="pedido-card" draggable="true" ondragstart="dragCRM(event, '${c.id}')" style="cursor: grab; margin-bottom: 8px;">
                                    <div class="pedido-cliente" style="font-weight: 500;">${c.nombre}</div>
                                    <div class="pedido-items" style="font-size: 11px; color: var(--text3);">📱 ${c.tel || 'Sin Tel'}</div>
                                    ${c.pedidos > 0 ? `<div class="pedido-items" style="font-size: 11px; color:var(--green)">Pedidos: ${c.pedidos}</div>` : ''}
                                    ${c.ultimoPedido ? `<div class="pedido-items" style="font-size: 10px; color:var(--text3)">Último pedido: ${fmtFecha(c.ultimoPedido)}</div>` : ''}
                                    ${c.crm_nota_pausa && col === 'Inactivo / Pausado' ? `<div class="pedido-items" style="font-size: 10px; color:var(--red); font-style: italic; margin-top: 4px;">Nota: ${c.crm_nota_pausa}</div>` : ''}
                                    <div class="pedido-footer" style="margin-top: 6px; display: flex; align-items: center; justify-content: space-between;">
                                        <span class="canal-badge badge-gray" style="font-size: 10px; background: var(--bg4); padding: 2px 6px; border-radius: 4px;">${c.canal || 'N/A'}</span>
                                        ${c.tel ? `<a href="https://wa.me/52${c.tel.replace(/\D/g, '')}?text=${encodeURIComponent('Hola ' + c.nombre + ', somos de Fit&Go. ¿En qué podemos ayudarte?')}" target="_blank" class="btn btn-primary btn-sm" style="padding: 2px 6px; font-size: 10px; text-decoration: none;" onclick="event.stopPropagation();">💬 WA</a>` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                    board.appendChild(colDiv);
                });
            }

            window.allowDropCRM = function(ev) {
                ev.preventDefault();
            }

            window.dragCRM = function(ev, id) {
                ev.dataTransfer.setData("text", id);
            }

            window.clienteEnPausa = null;

            window.dropCRM = function(ev, colName) {
                ev.preventDefault();
                const id = ev.dataTransfer.getData("text");
                const c = clientes.find(x => x.id === id);
                if (c && (c.crm_estado || 'Nuevo Lead') !== colName) {
                    if (colName === 'Inactivo / Pausado') {
                        window.clienteEnPausa = c;
                        document.getElementById('pausa-motivo').value = c.crm_nota_pausa || '';
                        openModal('modal-pausa-crm');
                        return; // Esperamos a que guarde en el modal
                    }

                    c.crm_estado = colName;
                    save();
                    renderCRMKanban();
                }
            }

            window.guardarPausaCRM = function() {
                const motivo = document.getElementById('pausa-motivo').value.trim();
                if (window.clienteEnPausa) {
                    window.clienteEnPausa.crm_estado = 'Inactivo / Pausado';
                    window.clienteEnPausa.crm_nota_pausa = motivo;
                    save();
                    renderCRMKanban();
                }
                closeModal('modal-pausa-crm');
            }

            window.filtrarCRM = function(q) {
                const term = q.toLowerCase();
                const cards = document.querySelectorAll('#crm-kanban-board .pedido-card');
                cards.forEach(card => {
                    const text = card.innerText.toLowerCase();
                    card.style.display = text.includes(term) ? '' : 'none';
                });
            }

            window.clientesMasivoActual = [];

            window.enviarWAMasivo = function(colName) {
                const colClients = clientes.filter(c => (c.crm_estado || 'Nuevo Lead') === colName && c.tel);
                if (colClients.length === 0) return toast('No hay clientes con teléfono en esta columna');
                
                window.clientesMasivoActual = colClients;
                document.getElementById('wa-masivo-col').textContent = colName;
                document.getElementById('wa-masivo-count').textContent = colClients.length;
                
                const destinatariosContainer = document.getElementById('wa-masivo-destinatarios');
                destinatariosContainer.innerHTML = colClients.map(c => `• ${c.nombre} (${c.tel})`).join('<br>');
                
                const statusDiv = document.getElementById('wa-masivo-status');
                statusDiv.style.display = 'none';
                statusDiv.textContent = '';
                
                const btn = document.getElementById('btn-enviar-masivo');
                btn.disabled = false;
                btn.textContent = '🚀 Enviar a todos';
                
                openModal('modal-wa-masivo');
            }

            window.ejecutarEnvioMasivo = async function() {
                const destinatarios = window.clientesMasivoActual.map(c => ({ phone: c.tel, name: c.nombre }));
                if (destinatarios.length === 0) return toast('No hay destinatarios con teléfono');

                const btn = document.getElementById('btn-enviar-masivo');
                const statusDiv = document.getElementById('wa-masivo-status');
                
                btn.disabled = true;
                btn.textContent = 'Enviando... (por favor espera)';
                statusDiv.style.display = 'block';
                statusDiv.style.color = 'var(--text2)';
                statusDiv.textContent = 'Iniciando envío con plantilla... esto puede tomar unos segundos.';

                try {
                    const response = await fetch('/api/send-masivo', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ destinatarios })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        statusDiv.style.color = data.failed > 0 ? 'var(--red)' : 'var(--green)';
                        let msg = `✅ ¡Listo! Se enviaron ${data.sent} mensajes. (${data.failed} fallaron).`;
                        
                        if (data.failed > 0) {
                            const errores = data.results.filter(r => r.status === 'error').map(r => `• ${r.phone}: ${r.error}`).join('<br>');
                            msg += `<br><br><b>Detalle de errores:</b><br>${errores}`;
                        }
                        
                        statusDiv.innerHTML = msg;
                        
                        if (data.sent > 0) toast(`Envío masivo completado: ${data.sent} exitosos`);
                        btn.disabled = false;
                        btn.textContent = '🚀 Reintentar los que fallaron';
                    } else {
                        statusDiv.style.color = 'var(--red)';
                        statusDiv.textContent = `❌ Error: ${data.error || 'No se pudo enviar el mensaje masivo'}`;
                        btn.disabled = false;
                        btn.textContent = '🚀 Reintentar';
                    }
                } catch (error) {
                    console.error("Error en envío masivo:", error);
                    statusDiv.style.color = 'var(--red)';
                    statusDiv.innerHTML = `❌ Fallo en la conexión:<br><small>${error.message || error.toString()}</small>`;
                    btn.disabled = false;
                    btn.textContent = '🚀 Reintentar';
                }
            }
        }