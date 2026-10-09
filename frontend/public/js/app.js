
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

// 2. InicializaciÃ³n segura
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
    try { return JSON.parse(localStorage.getItem('fitgo_'+k) || 'null'); } 
    catch(e) { return null; } 
  },
  set: (k,v) => { 
    // Guardado local inmediato para que la app responda al instante en pantalla
    localStorage.setItem('fitgo_'+k, JSON.stringify(v)); 
    
    // ðŸ›‘ BLOQUEO CRÃTICO: Si Firebase no ha terminado de descargar los datos reales de la nube,
    // se prohÃ­be rotundamente subir informaciÃ³n para evitar sobreescribir o borrar la base de datos.
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
    }, 250); // Tiempo de espera estratÃ©gico para acumular el lote de guardado
  }
};

// 4. Sincronizador en Tiempo Real Protegido
function sincronizarDesdeLaNube() {
  database.ref('fitgo_erp').on('value', (snapshot) => {
    // Si este mismo dispositivo estÃ¡ realizando una escritura voluntaria, ignoramos el reflejo
    if (estoyEscribiendo) return;
    
    const datosNube = snapshot.val();
    
    if (datosNube) {
      // Replicamos la base de datos de la nube en el almacenamiento local de este dispositivo
      Object.keys(datosNube).forEach(k => {
        localStorage.setItem('fitgo_'+k, JSON.stringify(datosNube[k]));
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
        if (datosNube.historialMerma) historialMerma = datosNube.historialMerma;
      } catch(e) {
        console.log("Sincronizando flujo de datos...");
      }
      
      // Â¡Freno liberado con Ã©xito! La nube ya se descargÃ³. Se permiten modificaciones futuras.
      inicializadoFirebase = true;

      // Redibujamos la pestaÃ±a actual en la pantalla del usuario
      const paginaActivaEl = document.querySelector('.page.active');
      if (paginaActivaEl) {
        const paginaActiva = paginaActivaEl.id.replace('page-', '');
        if (typeof renderPage === 'function') { 
          renderPage(paginaActiva); 
        }
      }
    } else {
      // RECOBRAR DATOS / INICIALIZACIÃ“N SEGURO
      // Si la nube estÃ¡ totalmente vacÃ­a, verificamos si este dispositivo tiene historial local previo
      const tieneDatosLocales = localStorage.getItem('fitgo_clientes');
      
      if (!inicializadoFirebase) {
        inicializadoFirebase = true;
        // Solo si el dispositivo NO es nuevo, sube su informaciÃ³n para restaurar o inicializar la nube
        if (tieneDatosLocales && typeof save === "function") {
          save();
        }
      }
    }
  });
}

// Iniciar la escucha en tiempo real inmediatamente al cargar la pÃ¡gina
sincronizarDesdeLaNube();

let gastos = DB.get('gastos') || [];
// MigraciÃ³n: vincular gastos de cortesÃ­a histÃ³ricos sin pedidoId
(function _migrarGastosCortesia() {
  const pedidosGuardados = DB.get('pedidos') || [];
  let changed = false;
  gastos.forEach(g => {
    if (!g.pedidoId && g.categoria === 'Gastos de Venta' && g.notas) {
      const match = g.notas.match(/cortesÃ­a #([A-F0-9]{4})/i);
      if (match) {
        const p = pedidosGuardados.find(x => x.id && x.id.slice(-4).toUpperCase() === match[1].toUpperCase());
        if (p) { g.pedidoId = p.id; changed = true; }
      }
    }
  });
  if (changed) DB.set('gastos', gastos);
})();
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
let categoriasInsumos = DB.get('categoriasInsumos') || ['ProteÃ­nas','Verduras','Granos','LÃ¡cteos','Condimentos','Frutas','Preparados'];
let categoriasMenu = DB.get('categoriasMenu') || ['Desayuno','Comida','Cena','Snack','Bebida'];
let pedidoEditId = null;
let platilloEditId = null;
let etiquetasSeleccionadas = [];
let tipoPedidoActual = 'menu';
let itemsPedidoActual = {};
let _editandoPedidoId = null;
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
  DB.set('historialMerma', historialMerma);
  // cajaEstado se guarda directamente en DB.set dentro de setCajaHoy
}

// ========== SEED DATA ==========
function seedData() {
  if (menu.length === 0) {
    menu = [
      { id: uid(), nombre: 'Bowl de pollo con quinoa', categoria: 'Comida', precio: 145, costo: 52, calorias: 480, desc: 'Pollo a la plancha, quinoa, verduras asadas y aderezo de limÃ³n', etiquetas: ['Alto en proteÃ­na', 'Sin gluten'], disponible: true },
      { id: uid(), nombre: 'Wrap de atÃºn', categoria: 'Comida', precio: 120, costo: 38, calorias: 380, desc: 'AtÃºn en agua, aguacate, pepino y tortilla integral', etiquetas: ['Alto en proteÃ­na'], disponible: true },
      { id: uid(), nombre: 'Smoothie verde detox', categoria: 'Bebida', precio: 75, costo: 22, calorias: 180, desc: 'Espinaca, manzana verde, pepino, jengibre y limÃ³n', etiquetas: ['Vegano', 'Bajo carbos'], disponible: true },
      { id: uid(), nombre: 'Omelette de claras', categoria: 'Desayuno', precio: 95, costo: 28, calorias: 220, desc: 'Claras de huevo, champiÃ±ones, espinaca y queso cottage', etiquetas: ['Keto', 'Sin gluten', 'Alto en proteÃ­na'], disponible: true },
      { id: uid(), nombre: 'Ensalada mediterrÃ¡nea', categoria: 'Comida', precio: 130, costo: 42, calorias: 350, desc: 'Lechuga, tomate cherry, pepino, aceitunas, queso feta', etiquetas: ['Vegano'], disponible: true },
      { id: uid(), nombre: 'Overnight oats', categoria: 'Desayuno', precio: 85, costo: 25, calorias: 340, desc: 'Avena, leche de almendra, frutos rojos y miel de agave', etiquetas: ['Vegano'], disponible: true },
    ];
  }
  if (inventario.length === 0) {
    inventario = [
      { id: uid(), nombre: 'Pechuga de pollo', categoria: 'ProteÃ­nas', stock: 8, minimo: 5, unidad: 'kg', costo: 95, proveedor: '' },
      { id: uid(), nombre: 'AtÃºn en agua', categoria: 'ProteÃ­nas', stock: 24, minimo: 10, unidad: 'pza', costo: 22, proveedor: '' },
      { id: uid(), nombre: 'Quinoa', categoria: 'Granos', stock: 3, minimo: 4, unidad: 'kg', costo: 85, proveedor: '' },
      { id: uid(), nombre: 'Espinaca', categoria: 'Verduras', stock: 2, minimo: 3, unidad: 'kg', costo: 35, proveedor: '' },
      { id: uid(), nombre: 'Aguacate', categoria: 'Frutas', stock: 15, minimo: 10, unidad: 'pza', costo: 18, proveedor: '' },
      { id: uid(), nombre: 'Claras de huevo', categoria: 'ProteÃ­nas', stock: 36, minimo: 20, unidad: 'pza', costo: 5, proveedor: '' },
      { id: uid(), nombre: 'Avena', categoria: 'Granos', stock: 5, minimo: 3, unidad: 'kg', costo: 45, proveedor: '' },
      { id: uid(), nombre: 'Leche de almendra', categoria: 'LÃ¡cteos', stock: 1, minimo: 4, unidad: 'L', costo: 55, proveedor: '' },
    ];
  }
  if (clientes.length === 0) {
    clientes = [
      { id: uid(), nombre: 'MarÃ­a GonzÃ¡lez', tel: '999-123-4567', canal: 'WhatsApp', tieneDieta: true, pedidos: 8, ultimoPedido: '2024-01-15', notas: 'Alergia a mariscos' },
      { id: uid(), nombre: 'Carlos RamÃ­rez', tel: '999-234-5678', canal: 'Instagram', tieneDieta: false, pedidos: 3, ultimoPedido: '2024-01-14', notas: '' },
      { id: uid(), nombre: 'Ana LÃ³pez', tel: '999-345-6789', canal: 'WhatsApp', tieneDieta: true, pedidos: 12, ultimoPedido: '2024-01-15', notas: 'Plan pÃ©rdida de peso' },
    ];
  }
  if (proveedores.length === 0) {
    proveedores = [
      { id: uid(), nombre: 'Carnes Don Pepe', contacto: 'JosÃ© PÃ©rez', tel: '999-500-0001', categoria: 'Carnes y proteÃ­nas', dias: 'Lunes, Jueves', notas: 'Pago semanal' },
      { id: uid(), nombre: 'Verduras La Cosecha', contacto: 'Rosa MartÃ­nez', tel: '999-500-0002', categoria: 'Verduras y frutas', dias: 'Martes, Viernes', notas: 'Pedido mÃ­nimo $500' },
      { id: uid(), nombre: 'Granos del Sur', contacto: 'Luis Torres', tel: '999-500-0003', categoria: 'Granos y cereales', dias: 'MiÃ©rcoles', notas: 'CrÃ©dito a 15 dÃ­as' },
    ];
  }
  if (dietas.length === 0) {
    dietas = [
      { id: uid(), clienteId: clientes[0]?.id, clienteNombre: 'MarÃ­a GonzÃ¡lez', nombre: 'Plan bajo en sodio', estado: 'confirmada', vigente: true, esHistorica: false, fechaRecibida: '2024-01-01', fechaConfirmada: '2024-01-01', instrucciones: 'Sin sal agregada. Cocinar al vapor o plancha.', pdfRef: null, cotizacion: null },
      { id: uid(), clienteId: clientes[2]?.id, clienteNombre: 'Ana LÃ³pez', nombre: 'Plan pÃ©rdida de peso', estado: 'recibida', vigente: false, esHistorica: false, fechaRecibida: '2024-01-10', instrucciones: 'Alta proteÃ­na, baja en carbos.', pdfRef: null, cotizacion: null },
    ];
  }
  if (cxp.length === 0) {
    cxp = [
      { id: uid(), proveedor: 'Carnes Don Pepe', concepto: 'Compra semanal proteÃ­nas', monto: 1850, vencimiento: '2024-01-20', estado: 'pendiente', notas: 'Factura #1042' },
      { id: uid(), proveedor: 'Verduras La Cosecha', concepto: 'Verduras y frutas semana', monto: 680, vencimiento: '2024-01-18', estado: 'vencida', notas: '' },
      { id: uid(), proveedor: 'Granos del Sur', concepto: 'Quinoa y avena', monto: 540, vencimiento: '2024-01-25', estado: 'pendiente', notas: 'CrÃ©dito 15 dÃ­as' },
    ];
  }
  save();
}

// ========== UTILS ==========
let uidCounter = Date.now();
function uid() { return 'id_' + (uidCounter++).toString(36); }
function fmt(n) { return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0); }
function fmtFecha(iso) { if (!iso) return 'â€”'; const d = new Date(iso + 'T12:00:00'); return d.toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' }); }
// Devuelve la fecha LOCAL en formato YYYY-MM-DD.
// No usar toISOString(): convierte a UTC y en zonas con offset negativo
// (ej. MÃ©rida UTC-6) devuelve el dÃ­a siguiente despuÃ©s de las 6 PM.
function _fechaLocal(d) {
  const dt = d || new Date();
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
function hoy() { return _fechaLocal(); }
function hora() { return new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }); }

function toast(msg, type='success') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${type==='success'?'âœ“':'âš '}</span>${msg}`;
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
  else if (page === 'bancos') renderBancos();
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
}

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ========== DASHBOARD ==========


function renderDashboard() {
  document.getElementById('fecha-hoy').textContent = new Date().toLocaleDateString('es-MX', { weekday:'long', day:'numeric', month:'long' });
  const hoyStr = hoy();
  const pedidosHoy = pedidos.filter(p => p.fecha === hoyStr);
  const ventasHoy = pedidosHoy.filter(p => p.estado === 'Entregado').reduce((s,p) => s + p.total, 0);
  const enProceso = pedidos.filter(p => ['Nuevo','En preparaciÃ³n','Listo'].includes(p.estado)).length;
  const pendCXP = cxp.filter(c => c.estado !== 'pagada').reduce((s,c) => s + c.monto, 0);
  const pendCXC = cxc.filter(c => c.estado !== 'cobrada').reduce((s,c) => s + _saldoCxC(c), 0);
  const ticket = pedidosHoy.filter(p=>p.estado==='Entregado').length ? ventasHoy / pedidosHoy.filter(p=>p.estado==='Entregado').length : 0;

  document.getElementById('kpi-ventas').textContent = fmt(ventasHoy);
  const totalPlatillosHoy = pedidosHoy.reduce((s,p) => s + (p.items||[]).reduce((ss,it)=>ss+(it.cantidad||1),0), 0);
  document.getElementById('kpi-pedidos-count').textContent = totalPlatillosHoy;
  document.getElementById('kpi-pedidos-delta').textContent = `${pedidosHoy.length} pedidos Â· ${enProceso} en proceso`;
  document.getElementById('kpi-ticket').textContent = fmt(ticket);
  document.getElementById('kpi-cobrar').textContent = fmt(pendCXC);
  document.getElementById('kpi-cobrar-delta').textContent = `${cxc.filter(c=>c.estado!=='cobrada').length} pendientes â†’`;
  document.getElementById('kpi-pagar').textContent = fmt(pendCXP);
  document.getElementById('kpi-pagar-delta').textContent = `${cxp.filter(c=>c.estado!=='pagada').length} pendientes â†’`;

  // Pedidos activos
  const activos = pedidos.filter(p => ['Nuevo','En preparaciÃ³n','Listo'].includes(p.estado)).slice(0, 5);
  const listaEl = document.getElementById('dash-pedidos-lista');
  if (activos.length === 0) {
    listaEl.innerHTML = '<div class="empty"><div class="empty-icon">ðŸ§¾</div><div class="empty-title">Sin pedidos activos</div></div>';
  } else {
    listaEl.innerHTML = activos.map(p => `
      <div class="flex items-center gap-12" style="padding:10px 0;border-bottom:1px solid var(--border);">
        <div style="flex:1">
          <div style="font-size:13px;font-weight:500">${p.cliente}</div>
          <div style="font-size:11px;color:var(--text3)">${p.items.map(i=>i.nombre||i).join(', ').substring(0,40)}</div>
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
    alertasEl.innerHTML = '<div class="empty" style="padding:24px"><div class="empty-icon">âœ…</div><div class="empty-title">Inventario en buen nivel</div></div>';
  } else {
    alertasEl.innerHTML = alertas.map(i => `
      <div class="flex items-center gap-8" style="padding:8px 0;border-bottom:1px solid var(--border);">
        <span class="dot ${i.stock === 0 ? 'dot-red' : 'dot-amber'}"></span>
        <div style="flex:1;font-size:13px">${i.nombre}</div>
        <div style="font-size:12px;color:${i.stock===0?'var(--red)':'var(--amber)'};">${i.stock} ${i.unidad}</div>
      </div>`).join('');
  }

  // Top platillos
  const conteo = {};
  pedidosHoy.forEach(p => p.items.forEach(it => {
    const n = it.nombre || it;
    conteo[n] = (conteo[n] || 0) + (it.cantidad || 1);
  }));
  const top = Object.entries(conteo).sort((a,b) => b[1]-a[1]).slice(0,5);
  const maxC = top[0]?.[1] || 1;
  document.getElementById('dash-top-platillos').innerHTML = top.length === 0
    ? '<div class="empty" style="padding:24px"><div class="empty-text">Sin ventas registradas hoy</div></div>'
    : top.map(([nombre,cnt]) => `
      <div style="margin-bottom:10px">
        <div class="flex justify-between mb-4"><span style="font-size:13px">${nombre}</span><span class="font-mono text-sm">${cnt}</span></div>
        <div class="stat-bar"><div class="stat-bar-fill" style="width:${(cnt/maxC)*100}%"></div></div>
      </div>`).join('');

  // Canales
  const canales = {};
  pedidosHoy.forEach(p => canales[p.canal] = (canales[p.canal] || 0) + p.total);
  const totalCanal = Object.values(canales).reduce((s,v) => s+v, 0) || 1;
  const canalEmoji = { WhatsApp:'ðŸ’¬', Presencial:'ðŸ ', Instagram:'ðŸ“¸', Facebook:'ðŸ‘¥', TelÃ©fono:'ðŸ“ž' };
  document.getElementById('dash-canales').innerHTML = Object.entries(canales).length === 0
    ? '<div class="empty" style="padding:24px"><div class="empty-text">Sin datos de canales hoy</div></div>'
    : Object.entries(canales).map(([canal,monto]) => `
      <div style="margin-bottom:12px">
        <div class="flex justify-between mb-4">
          <span style="font-size:13px">${canalEmoji[canal]||'ðŸ“±'} ${canal}</span>
          <span class="font-mono text-sm">${fmt(monto)}</span>
        </div>
        <div class="stat-bar"><div class="stat-bar-fill" style="width:${(monto/totalCanal)*100}%;background:var(--blue)"></div></div>
      </div>`).join('');

  // Badge
  document.getElementById('badge-pedidos').textContent = enProceso;
  if (enProceso === 0) document.getElementById('badge-pedidos').style.display = 'none';
  else document.getElementById('badge-pedidos').style.display = '';
}

// ========== PEDIDOS ==========
const ESTADOS = ['Nuevo', 'En preparaciÃ³n', 'Listo', 'Entregado'];
const ESTADO_COLORS = { 'Nuevo':'badge-blue', 'En preparaciÃ³n':'badge-amber', 'Listo':'badge-green', 'Entregado':'badge-gray' };
function estadoBadge(e) { return ESTADO_COLORS[e] || 'badge-gray'; }

// ---- Cliente rÃ¡pido desde pedido ----
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

// ---- Modo pago (inmediato vs crÃ©dito) ----
function setModoPago(el, modo) {
  modoPagoActual = modo;
  document.querySelectorAll('#modal-pedido .form-group:nth-child(2) .chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('panel-pago-inmediato').style.display = modo === 'inmediato' ? 'block' : 'none';
  document.getElementById('panel-pago-credito').style.display = modo === 'credito' ? 'block' : 'none';
}

// ---- Modo envÃ­o ----
let modoEnvioActual = 'sin_envio';
function setModoEnvio(el, modo) {
  modoEnvioActual = modo;
  document.querySelectorAll('#modal-pedido .form-group:has([onclick*="setModoEnvio"]) .chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  const panel = document.getElementById('panel-envio');
  const info = document.getElementById('envio-info');
  const desglose = document.getElementById('panel-envio-desglose');
  if (modo === 'sin_envio') {
    panel.style.display = 'none';
    if (desglose) desglose.style.display = 'none';
    _limitarMetodoPago('');
  } else if (modo === 'gratis') {
    panel.style.display = 'block';
    if (desglose) desglose.style.display = 'block';
    // No pisar la tarifa si ya venÃ­a precargada (ej. desde la direcciÃ³n del cliente):
    // el envÃ­o "gratis" para el cliente igual tiene un costo real que la empresa absorbe.
    const costoInp = document.getElementById('envio-costo');
    if (costoInp && (!costoInp.value || parseFloat(costoInp.value) === 0)) costoInp.value = '';
    document.getElementById('envio-cliente-paga').value = '0';
    // El cliente paga 0 y no debe editarse en modo gratis
    const cpEl = document.getElementById('envio-cliente-paga');
    if (cpEl) { cpEl.readOnly = true; cpEl.style.opacity = '0.6'; }
    document.getElementById('envio-absorbemos').value = '0';
    info.innerHTML = 'ðŸŽ El cliente no paga el envÃ­o. Ingresa la <strong>tarifa real del repartidor</strong>: esa cantidad se registra como gasto de envÃ­o en el estado de resultados.';
    _limitarMetodoPago('');
  } else if (modo === 'didi') {
    panel.style.display = 'block';
    if (desglose) desglose.style.display = 'block';
    const cpEl = document.getElementById('envio-cliente-paga');
    if (cpEl) { cpEl.readOnly = false; cpEl.style.opacity = '1'; }
    info.innerHTML = 'ðŸ›µ <strong>DiDi Food</strong>: el total del envÃ­o se manda a CxP (DiDi te cobra despuÃ©s). La diferencia vs lo que pagÃ³ el cliente va a gasto de venta.';
    _limitarMetodoPago('');
  } else if (modo === 'efectivo') {
    panel.style.display = 'block';
    if (desglose) desglose.style.display = 'block';
    const cpEl = document.getElementById('envio-cliente-paga');
    if (cpEl) { cpEl.readOnly = false; cpEl.style.opacity = '1'; cpEl.value = ''; }
    document.getElementById('envio-absorbemos').value = '0';
    info.innerHTML = 'ðŸ’µ Repartidor cobra en efectivo. Si hubo tarifa extra (lluvia, etc.), ingresa cuÃ¡nto paga el cliente y cuÃ¡nto absorbemos nosotros.';
    _limitarMetodoPago('Efectivo');
  } else if (modo === 'transferencia') {
    panel.style.display = 'block';
    if (desglose) desglose.style.display = 'block';
    const cpEl = document.getElementById('envio-cliente-paga');
    if (cpEl) { cpEl.readOnly = false; cpEl.style.opacity = '1'; cpEl.value = ''; }
    document.getElementById('envio-absorbemos').value = '0';
    info.innerHTML = 'ðŸ“² Cliente transfiriÃ³. Ingresa la tarifa total y si absorbemos algo adicional.';
    _limitarMetodoPago('Transferencia / SPEI');
  }
  actualizarTotalPedido();
}

function renderPedidos() {
  initDiaTrabajo();
  renderResumenPlatillos();
  if (vistaKanban) renderKanban();
  else renderTablaPedidos(pedidos);
}

function renderKanban() {
  const board = document.getElementById('vista-kanban');
  board.innerHTML = ESTADOS.map(estado => {
    const cols = pedidos.filter(p => p.estado === estado);
    const colColors = { 'Nuevo':'var(--blue)', 'En preparaciÃ³n':'var(--amber)', 'Listo':'var(--green)', 'Entregado':'var(--text3)' };
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
  const canalEmoji = { WhatsApp:'ðŸ’¬', Presencial:'ðŸ ', Instagram:'ðŸ“¸', Facebook:'ðŸ‘¥', TelÃ©fono:'ðŸ“ž' };
  return `
    <div class="pedido-card" onclick="verDetallePedido('${p.id}')">
      <div class="flex justify-between mb-4">
        <span class="pedido-id">#${p.id.slice(-4).toUpperCase()}</span>
        <span class="canal-badge badge-gray">${canalEmoji[p.canal]||'ðŸ“±'} ${p.canal}</span>
      </div>
      <div class="pedido-cliente">${p.cliente}</div>
      <div class="pedido-items">${p.items.slice(0,2).map(i=>i.nombre||i).join(', ')}${p.items.length>2?` +${p.items.length-2}`:''}</div>
      ${p.horaEntrega ? `<div style="font-size:11px;color:var(--blue);margin-top:4px">ðŸ• Entregar: <strong>${p.horaEntrega}</strong></div>` : ''}
      ${p.notas ? `<div style="font-size:11px;color:var(--amber);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">ðŸ“ ${p.notas}</div>` : ''}
      <div class="pedido-footer">
        <span class="timer-chip ${timerClass}">${mins < 1 ? 'Ahora' : mins+'m'}</span>
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
      <td>${p.items.slice(0,2).map(i=>i.nombre||i).join(', ')}${p.items.length>2?` +${p.items.length-2}`:''}</td>
      <td class="highlight-green font-mono">${fmt(p.total)}</td>
      <td><span class="badge ${estadoBadge(p.estado)}">${p.estado}</span></td>
      <td class="text-dim">${p.horaStr || p.hora}</td>
      <td class="text-dim">${p.horaEntrega ? 'ðŸ• '+p.horaEntrega : 'â€”'}</td>
      <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:var(--amber)">${p.notas||'â€”'}</td>
      <td><button class="btn btn-secondary btn-sm" onclick="verDetallePedido('${p.id}')">Ver</button></td>
    </tr>`).join('') || '<tr><td colspan="10" style="text-align:center;padding:32px;color:var(--text3)">Sin pedidos registrados</td></tr>';
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

// ========== AGENDAR SEMANA ==========
const SEM_DIAS = ['Lunes','Martes','MiÃ©rcoles','Jueves','Viernes','SÃ¡bado','Domingo'];
let _semData = {}; // { 0: {items:{}, dietaItems:[], pago:'Efectivo', modoPago:'inmediato'}, ... }

function _semFechaDe(idx) {
  const ini = document.getElementById('sem-inicio')?.value;
  if (!ini) return '';
  const d = new Date(ini + 'T12:00:00');
  d.setDate(d.getDate() + idx);
  return _fechaLocal(d);
}

function openAgendarSemana() {
  _semData = {};
  const sel = document.getElementById('sem-cliente');
  sel.innerHTML = '<option value="">Seleccionar cliente...</option>' +
    clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
  // PrÃ³ximo lunes (o hoy si es lunes)
  const hoyD = new Date(hoy() + 'T12:00:00');
  const diaSem = hoyD.getDay(); // 0=dom
  const diffLunes = diaSem === 1 ? 0 : (diaSem === 0 ? 1 : 8 - diaSem);
  hoyD.setDate(hoyD.getDate() + diffLunes);
  document.getElementById('sem-inicio').value = _fechaLocal(hoyD);
  _semRenderDias();
  openModal('modal-agendar-semana');
}

function _semCambiarCliente() { _semRenderDias(); }

function _semRenderDias() {
  const wrap = document.getElementById('sem-dias-wrap');
  if (!wrap) return;
  const clienteId = document.getElementById('sem-cliente').value;
  const dietaCliente = dietas.find(d => d.clienteId === clienteId && d.estado === 'confirmada' && d.vigente);
  const dirsCliente = getDireccionesCliente(clienteId);
  const dirPrin = dirsCliente.find(d => d.principal) || dirsCliente[0] || null;

  wrap.innerHTML = SEM_DIAS.map((nombre, i) => {
    if (!_semData[i]) _semData[i] = {
      items:{}, dietaItems:[], pago:'Efectivo', modoPago:'inmediato', activo:false,
      modoEnvio:'sin_envio', direccionId: dirPrin?.id || '', costoEnvioBase:0, envioClientePaga:0,
    };
    const d = _semData[i];
    const fecha = _semFechaDe(i);
    const nSel = Object.keys(d.items).length + d.dietaItems.filter(x=>x.incluido).length;
    return `
    <div class="card card-sm mb-8" style="${d.activo?'border-color:rgba(46,204,113,0.35)':''}">
      <div class="flex justify-between items-center" style="cursor:pointer" onclick="_semToggleDia(${i})">
        <div class="flex items-center gap-8">
          <input type="checkbox" ${d.activo?'checked':''} onclick="event.stopPropagation();_semToggleDia(${i})"
                 style="width:16px;height:16px;accent-color:var(--green);cursor:pointer">
          <div>
            <div style="font-size:13px;font-weight:600">${nombre}</div>
            <div style="font-size:10px;color:var(--text3)">${fecha ? fmtFecha(fecha) : 'â€”'}</div>
          </div>
        </div>
        <div style="font-size:11px;color:${nSel?'var(--green)':'var(--text3)'}">${nSel} platillo${nSel!==1?'s':''}</div>
      </div>
      <div id="sem-detalle-${i}" style="display:${d.activo?'block':'none'};margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
        <div class="form-row mb-8">
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label" style="font-size:10px">Modo de pago</label>
            <select class="form-input" style="font-size:12px;padding:4px 8px" onchange="_semData[${i}].modoPago=this.value;_semRenderDias()">
              <option value="inmediato" ${d.modoPago==='inmediato'?'selected':''}>Paga ahora</option>
              <option value="credito" ${d.modoPago==='credito'?'selected':''}>Queda a deber</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label" style="font-size:10px">MÃ©todo</label>
            <select class="form-input" style="font-size:12px;padding:4px 8px" ${d.modoPago==='credito'?'disabled':''} onchange="_semData[${i}].pago=this.value">
              <option ${d.pago==='Efectivo'?'selected':''}>Efectivo</option>
              <option ${d.pago==='Transferencia'?'selected':''}>Transferencia</option>
              <option ${d.pago==='Tarjeta'?'selected':''}>Tarjeta</option>
            </select>
          </div>
        </div>

        <!-- ENVÃO del dÃ­a -->
        <div style="background:var(--bg3);border:1px solid rgba(52,152,219,0.15);border-radius:6px;padding:8px;margin-bottom:8px">
          <div style="font-size:10px;font-weight:600;color:var(--blue);margin-bottom:6px">ðŸ›µ ENVÃO DE ESTE DÃA</div>
          <div class="form-row" style="margin-bottom:6px">
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label" style="font-size:10px">Modo</label>
              <select class="form-input" style="font-size:12px;padding:4px 8px" onchange="_semSetEnvio(${i},'modo',this.value)">
                <option value="sin_envio" ${d.modoEnvio==='sin_envio'?'selected':''}>ðŸ  Sin envÃ­o</option>
                <option value="efectivo" ${d.modoEnvio==='efectivo'?'selected':''}>ðŸ’µ Repartidor cobra</option>
                <option value="transferencia" ${d.modoEnvio==='transferencia'?'selected':''}>ðŸ“² Transferido</option>
                <option value="gratis" ${d.modoEnvio==='gratis'?'selected':''}>ðŸŽ Gratis / absorbido</option>
                <option value="didi" ${d.modoEnvio==='didi'?'selected':''}>ðŸ›µ DiDi Food</option>
              </select>
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label" style="font-size:10px">DirecciÃ³n</label>
              <select class="form-input" style="font-size:12px;padding:4px 8px" ${d.modoEnvio==='sin_envio'?'disabled':''} onchange="_semSetDireccion(${i},this.value)">
                <option value="">Manual</option>
                ${dirsCliente.map(dd => `<option value="${dd.id}" ${d.direccionId===dd.id?'selected':''}>${dd.principal?'â˜… ':''}${dd.nombre||'Sin nombre'}</option>`).join('')}
              </select>
            </div>
          </div>
          ${d.modoEnvio !== 'sin_envio' ? `
          <div class="form-row" style="margin-bottom:0">
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label" style="font-size:10px">Tarifa base</label>
              <input class="form-input" type="number" step="0.01" min="0" style="font-size:12px;padding:4px 8px"
                     value="${d.costoEnvioBase||0}" onchange="_semSetEnvio(${i},'base',parseFloat(this.value)||0)">
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label" style="font-size:10px;color:var(--green)">Cliente paga</label>
              <input class="form-input" type="number" step="0.01" min="0" style="font-size:12px;padding:4px 8px"
                     value="${d.envioClientePaga||0}" onchange="_semSetEnvio(${i},'cliente',parseFloat(this.value)||0)">
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label" style="font-size:10px;color:var(--amber)">Absorbemos</label>
              <input class="form-input" type="number" style="font-size:12px;padding:4px 8px;background:var(--bg4)" readonly
                     value="${Math.max(0,(d.costoEnvioBase||0)-(d.envioClientePaga||0)).toFixed(2)}">
            </div>
          </div>` : ''}
        </div>

        <div style="font-size:11px;font-weight:600;color:var(--text3);margin-bottom:4px">PLATILLOS DEL MENÃš</div>
        <div style="max-height:120px;overflow-y:auto;border:1px solid var(--border);border-radius:6px;padding:6px;margin-bottom:8px">
          ${menu.filter(m=>m.disponible).map(m => `
            <div class="flex items-center gap-6" style="padding:3px 0">
              <input type="checkbox" ${d.items[m.id]?'checked':''} onchange="_semToggleItem(${i},'${m.id}','${(m.nombre||'').replace(/'/g,"\\'")}',${m.precio})"
                     style="width:14px;height:14px;accent-color:var(--green);cursor:pointer">
              <span style="flex:1;font-size:12px">${m.nombre}</span>
              ${d.items[m.id] ? `
                <button class="btn btn-secondary btn-sm" style="padding:0 6px;font-size:12px" onclick="_semCantItem(${i},'${m.id}',-1)">âˆ’</button>
                <span style="font-size:12px;min-width:16px;text-align:center">${d.items[m.id].cantidad}</span>
                <button class="btn btn-secondary btn-sm" style="padding:0 6px;font-size:12px" onclick="_semCantItem(${i},'${m.id}',1)">+</button>` : ''}
              <span style="font-size:11px;color:var(--text3);min-width:48px;text-align:right">${fmt(m.precio)}</span>
            </div>`).join('') || '<div style="font-size:11px;color:var(--text3);padding:6px">Sin platillos disponibles</div>'}
        </div>
        ${dietaCliente ? `
          <div style="font-size:11px;font-weight:600;color:var(--blue);margin-bottom:4px">DIETA PERSONALIZADA</div>
          <div style="border:1px solid rgba(52,152,219,0.25);border-radius:6px;padding:6px">
            ${(dietaCliente.cotizacion?.platillos||[]).filter(pl=>pl.seleccionado!==false).map((pl,pi) => {
              const guardado = d.dietaItems.find(x=>x.nombre===pl.nombre);
              const inc = guardado?.incluido || false;
              const cant = guardado?.cantidad || 1;
              return `
              <div class="flex items-center gap-6" style="padding:3px 0">
                <input type="checkbox" ${inc?'checked':''} onchange="_semToggleDieta(${i},'${(pl.nombre||'').replace(/'/g,"\\'")}',${pl.precioDia||0},'${dietaCliente.id}')"
                       style="width:14px;height:14px;accent-color:var(--blue);cursor:pointer">
                <span style="flex:1;font-size:12px">${pl.nombre}<span style="font-size:10px;color:var(--text3)"> Â· ${pl.tiempo||''}</span></span>
                ${inc ? `
                  <button class="btn btn-secondary btn-sm" style="padding:0 6px;font-size:12px" onclick="_semCantDieta(${i},'${(pl.nombre||'').replace(/'/g,"\\'")}',-1)">âˆ’</button>
                  <span style="font-size:12px;min-width:16px;text-align:center">${cant}</span>
                  <button class="btn btn-secondary btn-sm" style="padding:0 6px;font-size:12px" onclick="_semCantDieta(${i},'${(pl.nombre||'').replace(/'/g,"\\'")}',1)">+</button>` : ''}
                <span style="font-size:11px;color:var(--text3);min-width:48px;text-align:right">${fmt(pl.precioDia||0)}</span>
              </div>`;
            }).join('')}
          </div>` : ''}
      </div>
    </div>`;
  }).join('');
  _semActualizarTotal();
}

function _semToggleDia(i) {
  _semData[i].activo = !_semData[i].activo;
  _semRenderDias();
}
function _semToggleItem(i, id, nombre, precio) {
  const d = _semData[i];
  if (d.items[id]) delete d.items[id];
  else d.items[id] = { id, nombre, precio, cantidad: 1 };
  _semRenderDias();
}
function _semCantItem(i, id, delta) {
  const it = _semData[i].items[id];
  if (!it) return;
  it.cantidad = Math.max(1, it.cantidad + delta);
  _semRenderDias();
}
function _semToggleDieta(i, nombre, precio, dietaId) {
  const d = _semData[i];
  const ex = d.dietaItems.find(x=>x.nombre===nombre);
  if (ex) ex.incluido = !ex.incluido;
  else d.dietaItems.push({ nombre, precio, cantidad:1, incluido:true, esDieta:true, dietaId });
  _semRenderDias();
}
function _semCantDieta(i, nombre, delta) {
  const it = _semData[i].dietaItems.find(x=>x.nombre===nombre);
  if (!it) return;
  it.cantidad = Math.max(1, it.cantidad + delta);
  _semRenderDias();
}

function _semSetEnvio(i, campo, valor) {
  const d = _semData[i];
  if (!d) return;
  if (campo === 'modo') {
    d.modoEnvio = valor;
    if (valor === 'sin_envio') { d.costoEnvioBase = 0; d.envioClientePaga = 0; }
    else if (valor === 'gratis') {
      // Precargar tarifa de la direcciÃ³n si aÃºn no hay una capturada (igual que en los demÃ¡s modos):
      // el envÃ­o "gratis" para el cliente igual tiene un costo real que la empresa absorbe.
      if (d.costoEnvioBase === 0 && d.direccionId) {
        const clienteId = document.getElementById('sem-cliente').value;
        const dir = getDireccionesCliente(clienteId).find(x => x.id === d.direccionId);
        if (dir?.costoEnvio) d.costoEnvioBase = dir.costoEnvio;
      }
      d.envioClientePaga = 0; // absorbemos todo
    }
    else if (d.costoEnvioBase === 0 && d.direccionId) {
      // precargar tarifa de la direcciÃ³n
      const clienteId = document.getElementById('sem-cliente').value;
      const dir = getDireccionesCliente(clienteId).find(x => x.id === d.direccionId);
      if (dir?.costoEnvio) { d.costoEnvioBase = dir.costoEnvio; d.envioClientePaga = dir.costoEnvio; }
    }
  } else if (campo === 'base') {
    d.costoEnvioBase = valor;
    if (d.modoEnvio === 'gratis') d.envioClientePaga = 0;
    else if (d.envioClientePaga > valor) d.envioClientePaga = valor;
  } else if (campo === 'cliente') {
    d.envioClientePaga = Math.min(valor, d.costoEnvioBase || 0);
  }
  _semRenderDias();
}

function _semSetDireccion(i, dirId) {
  const d = _semData[i];
  if (!d) return;
  d.direccionId = dirId;
  const clienteId = document.getElementById('sem-cliente').value;
  const dir = getDireccionesCliente(clienteId).find(x => x.id === dirId);
  if (dir && dir.costoEnvio > 0 && d.modoEnvio !== 'sin_envio') {
    d.costoEnvioBase = dir.costoEnvio;
    if (d.modoEnvio !== 'gratis') d.envioClientePaga = dir.costoEnvio;
  }
  _semRenderDias();
}

function _semActualizarTotal() {
  let total = 0, dias = 0, totalEnvios = 0;
  Object.values(_semData).forEach(d => {
    if (!d.activo) return;
    const tMenu = Object.values(d.items).reduce((s,i)=>s+i.precio*i.cantidad,0);
    const tDieta = d.dietaItems.filter(x=>x.incluido).reduce((s,i)=>s+i.precio*i.cantidad,0);
    if (tMenu + tDieta > 0) {
      total += tMenu + tDieta + (d.envioClientePaga||0);
      totalEnvios += (d.envioClientePaga||0);
      dias++;
    }
  });
  const tEl = document.getElementById('sem-total');
  const rEl = document.getElementById('sem-resumen');
  if (tEl) tEl.textContent = fmt(total);
  if (rEl) rEl.textContent = `${dias} dÃ­a${dias!==1?'s':''} con pedido` + (totalEnvios>0 ? ` Â· ${fmt(totalEnvios)} en envÃ­os` : '');
}

function guardarSemana() {
  const clienteId = document.getElementById('sem-cliente').value;
  if (!clienteId) { toast('Selecciona un cliente', 'error'); return; }
  const cliente = clientes.find(c => c.id === clienteId);
  const canal = document.getElementById('sem-canal').value;
  const inicio = document.getElementById('sem-inicio').value;
  if (!inicio) { toast('Selecciona la fecha de inicio', 'error'); return; }

  let creados = 0;
  SEM_DIAS.forEach((nombreDia, i) => {
    const d = _semData[i];
    if (!d || !d.activo) return;
    const itemsMenu = Object.values(d.items);
    const itemsDieta = d.dietaItems.filter(x=>x.incluido).map(x=>({ nombre:x.nombre, precio:x.precio, cantidad:x.cantidad, esDieta:true, dietaId:x.dietaId }));
    const items = [...itemsMenu, ...itemsDieta];
    if (items.length === 0) return;

    const subtotal = items.reduce((s,it)=>s+it.precio*(it.cantidad||1),0);
    const fecha = _semFechaDe(i);
    const esCredito = d.modoPago === 'credito';

    // EnvÃ­o del dÃ­a
    const modoEnv = d.modoEnvio || 'sin_envio';
    const costoEnvioBase = (modoEnv === 'sin_envio') ? 0 : (d.costoEnvioBase || 0);
    const envioClientePaga = (modoEnv === 'sin_envio' || modoEnv === 'gratis') ? 0 : (d.envioClientePaga || 0);
    const envioAbsorbemos = Math.max(0, costoEnvioBase - envioClientePaga);
    const dirObj = getDireccionesCliente(clienteId).find(x => x.id === d.direccionId) || null;

    // Total que paga el cliente (misma lÃ³gica que un pedido normal)
    let totalCliente = subtotal;
    if (modoEnv === 'transferencia' || modoEnv === 'gratis' || modoEnv === 'didi') totalCliente = subtotal + envioClientePaga;
    else if (modoEnv === 'efectivo') totalCliente = subtotal + envioClientePaga;

    const p = {
      id: uid(), cliente: cliente.nombre, clienteId, canal, items, subtotal,
      descuento: 0, descuentoTipo: 'ninguno', descuentoMotivo: '',
      costoEnvio: costoEnvioBase, modoEnvio: modoEnv, empresaEnvio: '',
      envioClientePaga, envioAbsorbemos,
      direccionId: d.direccionId || '',
      direccion: dirObj ? { nombre: dirObj.nombre, direccion: dirObj.direccion, maps: dirObj.maps } : null,
      total: totalCliente,
      pago: esCredito ? 'Pendiente' : d.pago,
      modoPago: d.modoPago,
      estado: 'Nuevo', fecha,
      hora: hora(), horaEntrega: '', notas: `Agendado semanal â€” ${nombreDia}`,
      esCortesia: false,
    };
    // Datos financieros diferidos (se registran al Entregar)
    p.finPendiente = {
      esCortesia:false, modoPagoActual:d.modoPago, modoEnvioActual:modoEnv, pago:p.pago,
      clienteNombre:cliente.nombre, empresaEnvio:'',
      subtotalConDescuento:subtotal, envioClientePaga, envioAbsorbemos,
      costoEnvio:costoEnvioBase, costoEnvioBase, costoProduccionEstimado:0,
    };
    if (esCredito && totalCliente > 0) {
      const montoCxC = (modoEnv === 'efectivo' && envioAbsorbemos > 0) ? subtotal + envioClientePaga : totalCliente;
      p.cxcPendiente = { monto: montoCxC, vencimiento: '', concepto: `Pedido semanal ${nombreDia} #${p.id.slice(-4).toUpperCase()}` };
    }
    pedidos.unshift(p);
    creados++;
  });

  if (creados === 0) { toast('Activa al menos un dÃ­a con platillos', 'error'); return; }
  save();
  closeModal('modal-agendar-semana');
  toast(`âœ… ${creados} pedido${creados!==1?'s':''} creado${creados!==1?'s':''} para la semana de ${cliente.nombre}`);
  renderPedidos();
  renderDashboard();
  if (vistaCalActiva) renderCalendario();
}

// ===== DÃA DE TRABAJO (fecha activa para nuevos pedidos) =====
let _diaTrabajo = null; // null = hoy

function getDiaTrabajo() { return _diaTrabajo || hoy(); }

function cambiarDiaTrabajo(fecha) {
  _diaTrabajo = fecha || hoy();
  const inp = document.getElementById('dia-trabajo');
  if (inp) inp.value = _diaTrabajo;
  const esHoy = _diaTrabajo === hoy();
  toast(esHoy ? 'DÃ­a de trabajo: hoy' : `DÃ­a de trabajo: ${fmtFecha(_diaTrabajo)}`);
  renderPedidos();
  renderResumenPlatillos();
}

function resetDiaTrabajo() { cambiarDiaTrabajo(hoy()); }

function initDiaTrabajo() {
  const inp = document.getElementById('dia-trabajo');
  if (inp && !inp.value) inp.value = hoy();
}

function openNuevoPedido() {
  // Solo resetear flag de ediciÃ³n si NO venimos de openEditarPedido
  if (!_editandoPedidoId) {
    const titEl = document.querySelector('#modal-pedido .modal-title');
    if (titEl) titEl.textContent = 'Nuevo pedido';
    const btnGuardar = document.querySelector('#modal-pedido .modal-footer .btn-primary');
    if (btnGuardar) btnGuardar.textContent = 'Confirmar pedido';
  }
  itemsPedidoActual = {};
  etiquetasSeleccionadas = [];
  modoEnvioActual = 'sin_envio';
  descuentoTipoActual = 'ninguno';
  // La fecha del pedido viene del "DÃ­a de trabajo" seleccionado en la barra
  const fechaInp = document.getElementById('pedido-fecha');
  if (fechaInp) { const f = getDiaTrabajo(); fechaInp.value = f; onChangeFechaPedido(f); }
  // Reset envÃ­o chips
  document.getElementById('panel-envio').style.display = 'none';
  document.getElementById('panel-nuevo-cliente').style.display = 'none';
  document.getElementById('panel-descuento').style.display = 'none';
  document.getElementById('fila-descuento').style.display = 'none';
  document.getElementById('panel-pago-inmediato').style.display = 'block';
  document.getElementById('panel-pago-credito').style.display = 'none';
  modoPagoActual = 'inmediato';
  // Reset chips de modo pago â€” ninguno activo al inicio
  setTimeout(() => {
    const pagoChips = document.querySelectorAll('#chips-modo-pago .chip');
    pagoChips.forEach(c => { c.classList.remove('active'); c.style.opacity='1'; c.style.pointerEvents='auto'; });
    const wrap = document.getElementById('panel-credito-wrap');
    if (wrap) wrap.innerHTML = '';
    const envioWrap = document.getElementById('seccion-envio-wrap');
    if (envioWrap) envioWrap.style.display = 'none';
  }, 10);
  modoPagoActual = '';
  // Populate cliente select
  const sel = document.getElementById('pedido-cliente');
  sel.innerHTML = '<option value="">Seleccionar cliente...</option>' +
    clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
  // Reset envÃ­o chips visual
  setTimeout(() => {
    document.querySelectorAll('#modal-pedido .chip').forEach(c => {
      if (c.getAttribute('onclick')?.includes('setModoEnvio')) c.classList.remove('active');
    });
  }, 10);
  // Populate menu selector
  const ms = document.getElementById('menu-selector');
  ms.innerHTML = menu.filter(m=>m.disponible).map(m => `
    <div class="flex items-center gap-8" style="padding:8px;border-radius:6px;cursor:pointer;transition:background 0.1s" 
         data-nombre="${m.nombre}"
         onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background=''"
         onclick="toggleItemPedido('${m.id}','${m.nombre.replace(/'/g,"\\'")}',${m.precio})">
      <div style="flex:1">
        <div style="font-size:13px;font-weight:500">${m.nombre}</div>
        <div style="font-size:11px;color:var(--text3)">${m.categoria} â€¢ ${fmt(m.precio)}</div>
      </div>
      <div class="num-input" id="num-${m.id}" style="display:none">
        <button class="num-btn" onclick="event.stopPropagation();cambiarCantidad('${m.id}','${m.nombre.replace(/'/g,"\\'")}',${m.precio},-1)">-</button>
        <span class="num-val" id="qty-${m.id}">1</span>
        <button class="num-btn" onclick="event.stopPropagation();cambiarCantidad('${m.id}','${m.nombre.replace(/'/g,"\\'")}',${m.precio},1)">+</button>
      </div>
      <div id="check-${m.id}" style="width:18px;height:18px;border:1.5px solid var(--border2);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;transition:all 0.15s"></div>
    </div>`).join('');
  // Limpiar buscador
  const buscador = document.getElementById('buscador-platillos-modal');
  if (buscador) buscador.value = '';
  // Reset notas y cortesÃ­a por pedido
  const notasEl = document.getElementById('pedido-notas');
  if (notasEl) notasEl.value = '';
  const horaEntEl = document.getElementById('pedido-hora-entrega');
  if (horaEntEl) horaEntEl.value = '';
  const cortesiaEl = document.getElementById('pedido-cortesia');
  if (cortesiaEl) { cortesiaEl.checked = false; }
  const panelCort = document.getElementById('panel-cortesia');
  if (panelCort) panelCort.style.display = 'none';
  // Reset envÃ­o desglose
  const cpEl = document.getElementById('envio-cliente-paga');
  if (cpEl) cpEl.value = '';
  const absEl = document.getElementById('envio-absorbemos');
  if (absEl) absEl.value = '';
  const desglosePanel = document.getElementById('panel-envio-desglose');
  if (desglosePanel) desglosePanel.style.display = 'none';
  actualizarConteoSel();
  // Populate dietas â€” solo las vigentes (confirmadas y activas)
  const ds = document.getElementById('pedido-dieta-sel');
  const dietasVigentes = dietas.filter(d => d.estado === 'confirmada' && d.vigente && d.cotizacion?.platillos?.length);
  ds.innerHTML = '<option value="">Sin dieta â€” solo menÃº</option>' +
    dietasVigentes.map(d => `<option value="${d.id}">${d.clienteNombre}${d.nombre ? ' â€” '+d.nombre : ''}</option>`).join('');
  // Reset panel platillos dieta
  window._dietaPlatillosPrecios = [];
  window._dietaPlanActual = 'Dia';
  const panelPlatDieta = document.getElementById('panel-platillos-dieta');
  if (panelPlatDieta) panelPlatDieta.style.display = 'none';
  actualizarTotalPedido();
  openModal('modal-pedido');
}

function toggleItemPedido(id, nombre, precio) {
  if (itemsPedidoActual[id]) {
    delete itemsPedidoActual[id];
    document.getElementById('check-'+id).textContent = '';
    document.getElementById('check-'+id).style.background = '';
    document.getElementById('check-'+id).style.borderColor = 'var(--border2)';
    document.getElementById('num-'+id).style.display = 'none';
  } else {
    itemsPedidoActual[id] = { nombre, precio, cantidad: 1 };
    document.getElementById('check-'+id).textContent = 'âœ“';
    document.getElementById('check-'+id).style.background = 'var(--green)';
    document.getElementById('check-'+id).style.borderColor = 'var(--green)';
    document.getElementById('check-'+id).style.color = '#FFFFFF';
    document.getElementById('num-'+id).style.display = 'flex';
  }
  actualizarTotalPedido();
  actualizarConteoSel();
}

function cambiarCantidad(id, nombre, precio, delta) {
  if (!itemsPedidoActual[id]) return;
  itemsPedidoActual[id].cantidad = Math.max(1, (itemsPedidoActual[id].cantidad||1) + delta);
  document.getElementById('qty-'+id).textContent = itemsPedidoActual[id].cantidad;
  actualizarTotalPedido();
}

function actualizarTotalPedido() {
  let subtotal = 0;
  let items = Object.values(itemsPedidoActual);
  // Subtotal del menÃº
  const subtotalMenu = items.reduce((s,i) => s + i.precio * i.cantidad, 0);
  // Subtotal de la dieta (platillos incluidos Ã— cantidad)
  const subtotalDieta = (window._dietaPlatillosPrecios || []).filter(p => p.incluido).reduce((s, p) => s + (p.precio || 0) * (p.cantidad || 1), 0);
  subtotal = subtotalMenu + subtotalDieta;

  // Desglose items (menÃº + dieta)
  const itemsDieta = (window._dietaPlatillosPrecios || []).filter(p => p.incluido).map(p => ({ nombre: p.nombre, precio: p.precio, cantidad: p.cantidad||1 }));
  const todosItems = [...items, ...itemsDieta];
  const desgloseEl = document.getElementById('desglose-items-pedido');
  if (desgloseEl) {
    if (todosItems.length > 0) {
      desgloseEl.style.display = 'block';
      desgloseEl.innerHTML = todosItems.map(i => `${i.nombre} Ã—${i.cantidad} <span style="float:right;color:var(--text2)">${fmt(i.precio*i.cantidad)}</span>`).join('<br>');
    } else {
      desgloseEl.style.display = 'none';
    }
  }

  // CortesÃ­a
  const esCortesia = document.getElementById('pedido-cortesia')?.checked;

  // EnvÃ­o
  let costoEnvioBase = 0, envioClientePaga = 0, envioAbsorbemos = 0;
  if (modoEnvioActual !== 'sin_envio') {
    costoEnvioBase = parseFloat(document.getElementById('envio-costo')?.value) || 0;
    if (modoEnvioActual === 'gratis') {
      // EnvÃ­o GRATIS para el cliente â†’ nosotros absorbemos todo el costo
      envioClientePaga = 0;
      envioAbsorbemos = costoEnvioBase;
      const absEl = document.getElementById('envio-absorbemos');
      if (absEl) { absEl.value = envioAbsorbemos.toFixed(2); absEl.readOnly = true; }
    } else if (modoEnvioActual === 'didi' || modoEnvioActual === 'efectivo' || modoEnvioActual === 'transferencia') {
      const cpEl = document.getElementById('envio-cliente-paga');
      envioClientePaga = cpEl && cpEl.value !== '' ? (parseFloat(cpEl.value) || 0) : costoEnvioBase;
      envioAbsorbemos = Math.max(0, costoEnvioBase - envioClientePaga);
      const absEl = document.getElementById('envio-absorbemos');
      if (absEl) { absEl.value = envioAbsorbemos.toFixed(2); absEl.readOnly = true; }
    }
  }

  // Calcular descuento
  let montoDescuento = 0;
  if (descuentoTipoActual === 'porcentaje') {
    const pct = parseFloat(document.getElementById('descuento-valor')?.value) || 0;
    montoDescuento = subtotal * (pct / 100);
  } else if (descuentoTipoActual === 'fijo') {
    montoDescuento = parseFloat(document.getElementById('descuento-valor')?.value) || 0;
  }
  montoDescuento = Math.min(montoDescuento, subtotal);
  const subtotalConDescuento = esCortesia ? 0 : (subtotal - montoDescuento);

  document.getElementById('pedido-subtotal').textContent = esCortesia ? '$0.00 (cortesÃ­a)' : fmt(subtotal);

  // Fila descuento
  const filaDesc = document.getElementById('fila-descuento');
  if (montoDescuento > 0 && !esCortesia) {
    filaDesc.style.display = 'flex';
    const motivo = document.getElementById('descuento-motivo')?.value || '';
    document.getElementById('label-descuento-resumen').textContent = `Descuento${motivo ? ' ('+motivo+')' : ''}`;
    document.getElementById('pedido-descuento-display').textContent = '-' + fmt(montoDescuento);
  } else { filaDesc.style.display = 'none'; }

  const filaEnvio = document.getElementById('fila-envio');
  const filaPago = document.getElementById('fila-pago-repartidor');
  const filaAbs = document.getElementById('fila-absorbemos');

  if (modoEnvioActual === 'sin_envio') {
    filaEnvio.style.setProperty('display', 'none', 'important');
    filaPago.style.setProperty('display', 'none', 'important');
    if (filaAbs) filaAbs.style.setProperty('display', 'none', 'important');
    document.getElementById('pedido-total-display').textContent = fmt(subtotalConDescuento);
  } else if (modoEnvioActual === 'gratis' || modoEnvioActual === 'didi') {
    filaEnvio.style.setProperty('display', 'flex', 'important');
    document.getElementById('label-envio-resumen').textContent = modoEnvioActual === 'didi' ? 'EnvÃ­o DiDi (cliente paga)' : 'EnvÃ­o (cliente paga)';
    document.getElementById('pedido-envio-display').textContent = fmt(envioClientePaga);
    filaPago.style.setProperty('display', 'none', 'important');
    if (filaAbs) {
      if (envioAbsorbemos > 0) {
        filaAbs.style.setProperty('display', 'flex', 'important');
        document.getElementById('pedido-absorbemos-display').textContent = fmt(envioAbsorbemos);
      } else {
        filaAbs.style.setProperty('display', 'none', 'important');
      }
    }
    document.getElementById('pedido-total-display').textContent = fmt(subtotalConDescuento + envioClientePaga);
  } else if (modoEnvioActual === 'efectivo') {
    filaEnvio.style.setProperty('display', 'flex', 'important');
    document.getElementById('label-envio-resumen').textContent = 'EnvÃ­o (cliente paga)';
    document.getElementById('pedido-envio-display').textContent = fmt(envioClientePaga);
    filaPago.style.setProperty('display', 'none', 'important');
    if (filaAbs) {
      if (envioAbsorbemos > 0) {
        filaAbs.style.setProperty('display', 'flex', 'important');
        document.getElementById('pedido-absorbemos-display').textContent = fmt(envioAbsorbemos);
      } else {
        filaAbs.style.setProperty('display', 'none', 'important');
      }
    }
    // Total que paga el cliente = comida + envÃ­o que Ã©l paga (aunque se lo dÃ© al repartidor)
    document.getElementById('pedido-total-display').textContent = fmt(subtotalConDescuento + envioClientePaga);
  } else if (modoEnvioActual === 'transferencia') {
    filaEnvio.style.setProperty('display', 'flex', 'important');
    document.getElementById('label-envio-resumen').textContent = 'EnvÃ­o (cliente transfiere)';
    document.getElementById('pedido-envio-display').textContent = fmt(envioClientePaga);
    filaPago.style.setProperty('display', 'flex', 'important');
    document.getElementById('pedido-pago-repartidor').textContent = fmt(envioClientePaga);
    if (filaAbs) {
      if (envioAbsorbemos > 0) {
        filaAbs.style.setProperty('display', 'flex', 'important');
        document.getElementById('pedido-absorbemos-display').textContent = fmt(envioAbsorbemos);
      } else {
        filaAbs.style.setProperty('display', 'none', 'important');
      }
    }
    // Total = comida + lo que paga el cliente por envÃ­o (no el absorbido)
    document.getElementById('pedido-total-display').textContent = fmt(subtotalConDescuento + envioClientePaga);
  }

  // "Nosotros recibimos" = solo la comida menos lo que absorbemos del envÃ­o
  // (el envÃ­o que paga el cliente se entrega completo al repartidor, no es ingreso nuestro)
  // En transferencia NO se muestra (el cliente transfiere todo junto)
  const recibimosEl = document.getElementById('pedido-recibimos-display');
  const filaRecibimos = recibimosEl ? recibimosEl.closest('.flex') : null;
  const notaRecibimos = filaRecibimos ? filaRecibimos.nextElementSibling : null;
  if (modoEnvioActual === 'transferencia') {
    if (filaRecibimos) filaRecibimos.style.display = 'none';
    if (notaRecibimos) notaRecibimos.style.display = 'none';
  } else {
    if (filaRecibimos) filaRecibimos.style.display = 'flex';
    if (notaRecibimos) notaRecibimos.style.display = 'block';
    const recibimos = Math.max(0, subtotalConDescuento - envioAbsorbemos);
    if (recibimosEl) recibimosEl.textContent = fmt(recibimos);
  }
}

// ---- Descuentos ----
function resetModoPago() {
  modoPagoActual = '';
  const pagoChips = document.querySelectorAll('#chips-modo-pago .chip');
  pagoChips.forEach(c => { c.classList.remove('active'); c.style.opacity = '1'; c.style.pointerEvents = 'auto'; });
  const wrap = document.getElementById('panel-credito-wrap');
  if (wrap) wrap.innerHTML = '';
  const envioWrap = document.getElementById('seccion-envio-wrap');
  if (envioWrap) envioWrap.style.display = 'none';
  modoEnvioActual = 'sin_envio';
}

function _limitarMetodoPago(metodo) {
  const sel = document.getElementById('pedido-pago');
  if (!sel) return;
  if (metodo === 'Efectivo') {
    sel.value = 'Efectivo';
    Array.from(sel.options).forEach(o => o.disabled = o.value !== 'Efectivo');
  } else if (metodo === 'Transferencia / SPEI') {
    sel.value = 'Transferencia / SPEI';
    Array.from(sel.options).forEach(o => o.disabled = o.value !== 'Transferencia / SPEI');
  } else {
    Array.from(sel.options).forEach(o => o.disabled = false);
  }
}

function toggleCortesia(checked) {
  const panel = document.getElementById('panel-cortesia');
  if (panel) panel.style.display = checked ? 'block' : 'none';
  actualizarTotalPedido();
}

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
    // Auto-seleccionar dieta del cliente si existe
    const ds = document.getElementById('pedido-dieta-sel');
    if (ds) {
      const dietaCliente = dietas.find(d => d.clienteId === cid && d.estado === 'confirmada' && d.vigente);
      if (dietaCliente) { ds.value = dietaCliente.id; mostrarPlatillosDieta(dietaCliente.id); }
    }
  }
  // Cargar direcciones guardadas del cliente
  _cargarDireccionesPedido(cid);
}

// Llena el selector de direcciones del pedido con las del cliente
function _cargarDireccionesPedido(clienteId) {
  const sel = document.getElementById('pedido-direccion');
  const wrap = document.getElementById('wrap-dir-pedido');
  if (!sel || !wrap) return;
  const dirs = getDireccionesCliente(clienteId);
  if (!dirs.length) {
    wrap.style.display = 'none';
    sel.innerHTML = '<option value="">Otra direcciÃ³n / manual</option>';
    return;
  }
  wrap.style.display = 'block';
  sel.innerHTML = '<option value="">Otra direcciÃ³n / manual</option>' +
    dirs.map(d => `<option value="${d.id}">${d.principal?'â˜… ':''}${d.nombre || 'Sin nombre'}${d.costoEnvio ? ' â€” '+fmt(d.costoEnvio) : ''}</option>`).join('');
  // Preseleccionar la principal
  const prin = dirs.find(d => d.principal) || dirs[0];
  if (prin) { sel.value = prin.id; _aplicarDireccionPedido(prin.id); }
}

// Aplica el costo de envÃ­o de la direcciÃ³n seleccionada
function _aplicarDireccionPedido(dirId) {
  const mapsBtn = document.getElementById('pedido-dir-maps');
  const clienteId = document.getElementById('pedido-cliente')?.value;
  const dirs = getDireccionesCliente(clienteId);
  const dir = dirs.find(d => d.id === dirId);
  if (!dir) { if (mapsBtn) mapsBtn.style.display = 'none'; return; }
  // Precargar tarifa base
  const costoInp = document.getElementById('envio-costo');
  if (costoInp && dir.costoEnvio > 0) {
    costoInp.value = dir.costoEnvio;
    // Por defecto el cliente paga todo el envÃ­o
    const cpInp = document.getElementById('envio-cliente-paga');
    if (cpInp && !cpInp.value) cpInp.value = dir.costoEnvio;
    actualizarTotalPedido();
  }
  // BotÃ³n de Maps
  if (mapsBtn) {
    if (dir.maps) { mapsBtn.href = dir.maps; mapsBtn.style.display = 'inline-block'; }
    else mapsBtn.style.display = 'none';
  }
}

function mostrarPlatillosDieta(dietaId) {
  const panel = document.getElementById('panel-platillos-dieta');
  const lista = document.getElementById('lista-platillos-dieta');
  if (!panel || !lista) return;
  window._dietaPlatillosPrecios = [];
  if (!dietaId) { panel.style.display = 'none'; return; }
  const dieta = dietas.find(d => d.id === dietaId);
  if (!dieta) { panel.style.display = 'none'; return; }

  if (dieta.cotizacion?.platillos?.length) {
    // Solo platillos que estaban seleccionados en la cotizaciÃ³n
    const platillos = dieta.cotizacion.platillos.filter(p => p.seleccionado !== false);
    // plan por defecto: diario
    window._dietaPlanActual = window._dietaPlanActual || 'Dia';
    window._dietaPlatillosPrecios = platillos.map(p => ({
      nombre: p.nombre,
      tiempo: p.tiempo || 'Comida',
      precioDia: p.precioDia || 0,
      precioSem: p.precioSem || 0,
      precioMes: p.precioMes || 0,
      precio: p['precio'+(window._dietaPlanActual)] || p.precioDia || 0,
      incluido: true,
      cantidad: 1,
    }));
  } else {
    window._dietaPlatillosPrecios = [{ nombre: dieta.nombre || 'Plan', tiempo: 'Plan diario', precio: 0, precioDia:0, precioSem:0, precioMes:0, incluido: true, cantidad: 1 }];
  }
  renderListaPlatillosDieta();
  panel.style.display = 'block';
}

function _cambiarPlanDieta(plan) {
  window._dietaPlanActual = plan;
  (window._dietaPlatillosPrecios || []).forEach(p => {
    p.precio = p['precio'+plan] || 0;
  });
  renderListaPlatillosDieta();
}

function renderListaPlatillosDieta() {
  const lista = document.getElementById('lista-platillos-dieta');
  if (!lista) return;
  const plan = window._dietaPlanActual || 'Dia';
  const planLabel = { Dia:'Diario', Sem:'Semanal', Mes:'Mensual' };
  // Selector de plan
  let html = `
    <div class="flex gap-6 mb-8" style="flex-wrap:wrap">
      <span style="font-size:11px;color:var(--text3);align-self:center">Plan:</span>
      ${['Dia','Sem','Mes'].map(pl => `
        <span class="chip ${plan===pl?'active':''}" style="font-size:11px;padding:3px 10px" onclick="_cambiarPlanDieta('${pl}')">${planLabel[pl]}</span>
      `).join('')}
    </div>`;
  // Lista de platillos con checkbox
  html += (window._dietaPlatillosPrecios || []).map((p, i) => `
    <div class="flex items-center gap-8" style="padding:6px 0;border-bottom:1px solid var(--border);${p.incluido?'':'opacity:0.4'}">
      <input type="checkbox" ${p.incluido?'checked':''} onchange="_dietaPlatillosPrecios[${i}].incluido=this.checked;renderListaPlatillosDieta()"
             style="width:16px;height:16px;accent-color:var(--green);cursor:pointer">
      <div style="flex:1">
        <div style="font-size:13px;font-weight:500">${p.nombre}</div>
        <div style="font-size:11px;color:var(--text3)">${p.tiempo}</div>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <button class="btn btn-secondary btn-sm" style="padding:2px 8px;font-size:14px" onclick="_cambiarCantidadDieta(${i},-1)">âˆ’</button>
        <span style="min-width:20px;text-align:center;font-size:13px;font-weight:600">${p.cantidad||1}</span>
        <button class="btn btn-secondary btn-sm" style="padding:2px 8px;font-size:14px" onclick="_cambiarCantidadDieta(${i},1)">+</button>
      </div>
      <div style="display:flex;align-items:center;gap:4px">
        <span style="font-size:11px;color:var(--text3)">$</span>
        <input type="number" class="form-input" style="width:80px;padding:5px 8px;font-size:13px"
               value="${(p.precio||0).toFixed(2)}" min="0" step="0.01"
               oninput="_dietaPlatillosPrecios[${i}].precio=parseFloat(this.value)||0;calcularTotalDieta()">
      </div>
    </div>`).join('');
  lista.innerHTML = html;
  calcularTotalDieta();
}

function _cambiarCantidadDieta(i, delta) {
  const p = window._dietaPlatillosPrecios[i];
  if (!p) return;
  p.cantidad = Math.max(1, (p.cantidad || 1) + delta);
  renderListaPlatillosDieta();
}

function calcularTotalDieta() {
  // Solo suma los platillos marcados (incluido), multiplicado por cantidad
  const total = (window._dietaPlatillosPrecios || []).filter(p => p.incluido).reduce((s, p) => s + (p.precio || 0) * (p.cantidad || 1), 0);
  const el = document.getElementById('total-dieta-display');
  if (el) el.textContent = fmt(total);
  actualizarTotalPedido();
}

function guardarPedido() {
  const clienteId = document.getElementById('pedido-cliente').value;
  if (!clienteId) {
    toast('Selecciona un cliente antes de confirmar el pedido', 'error');
    document.getElementById('pedido-cliente').focus();
    return;
  }
  if (!modoPagoActual) {
    toast('Selecciona el modo de pago (Paga ahora / Queda a deber)', 'error');
    return;
  }
  const clienteObj = clientes.find(c => c.id === clienteId);
  const clienteNombre = clienteObj ? clienteObj.nombre : 'Cliente sin registrar';
  const canal = document.getElementById('pedido-canal').value;
  const pagoSeleccionado = document.getElementById('pedido-pago').value;
  const pago = modoPagoActual === 'credito' ? 'Pendiente' : pagoSeleccionado;
  const notas = document.getElementById('pedido-notas').value;
  const esCortesia = document.getElementById('pedido-cortesia')?.checked || false;
  const costoEnvioBase = modoEnvioActual !== 'sin_envio' ? (parseFloat(document.getElementById('envio-costo')?.value) || 0) : 0;
  let envioClientePaga = 0, envioAbsorbemos = 0;
  if (modoEnvioActual === 'gratis') {
    // EnvÃ­o GRATIS para el cliente â†’ absorbemos todo
    envioClientePaga = 0;
    envioAbsorbemos = costoEnvioBase;
  } else if (['didi','efectivo','transferencia'].includes(modoEnvioActual)) {
    const _cpVal = document.getElementById('envio-cliente-paga')?.value;
    envioClientePaga = (_cpVal !== '' && _cpVal !== undefined) ? (parseFloat(_cpVal) || 0) : costoEnvioBase;
    envioAbsorbemos = Math.max(0, costoEnvioBase - envioClientePaga);
  } else {
    envioClientePaga = costoEnvioBase;
    envioAbsorbemos = 0;
  }
  const costoEnvio = costoEnvioBase;
  const empresaEnvio = document.getElementById('envio-empresa')?.value || '';
  let items = [];
  let subtotal = 0;

  // --- Items del MENÃš (inventario se descuenta al pasar a "En preparaciÃ³n") ---
  const itemsMenu = Object.values(itemsPedidoActual);

  // --- Items de la DIETA ---
  const dietaId = document.getElementById('pedido-dieta-sel').value;
  const instrucciones = document.getElementById('pedido-instrucciones').value;
  const dieta = dietas.find(d => d.id === dietaId);
  let itemsDieta = [];
  if (dieta && window._dietaPlatillosPrecios && window._dietaPlatillosPrecios.length > 0) {
    itemsDieta = window._dietaPlatillosPrecios.filter(p => p.incluido).map(p => ({ nombre: p.nombre, precio: p.precio, cantidad: p.cantidad || 1, tiempo: p.tiempo, esDieta: true, dietaId: dieta.id }));
  }

  // --- Combinar ambos ---
  items = [...itemsMenu, ...itemsDieta];
  if (items.length === 0) { toast('Agrega al menos un platillo (menÃº o dieta)', 'error'); return; }
  subtotal = items.reduce((s, i) => s + i.precio * (i.cantidad || 1), 0);
  if (instrucciones && itemsDieta.length) items.instrucciones = instrucciones;

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

  // Total segÃºn modo envÃ­o y cortesÃ­a
  let totalCliente = esCortesia ? 0 : subtotalConDescuento;
  if (!esCortesia) {
    if (modoEnvioActual === 'transferencia') totalCliente = subtotalConDescuento + envioClientePaga;
    else if (modoEnvioActual === 'gratis' || modoEnvioActual === 'didi') totalCliente = subtotalConDescuento + envioClientePaga;
    else if (modoEnvioActual === 'efectivo') totalCliente = subtotalConDescuento; // el envÃ­o lo cobra el repartidor, no cuenta en lo que nos debe
  }

  // Calcular costo de producciÃ³n estimado para cortesÃ­a (menÃº + dieta)
  let costoProduccionEstimado = 0;
  if (esCortesia) {
    items.forEach(item => {
      const plat = menu.find(m => m.nombre === item.nombre || m.id === item.id);
      if (plat) { costoProduccionEstimado += (plat.costo || 0) * (item.cantidad || 1); return; }
      // Si es de dieta, buscar su costo en la cotizaciÃ³n
      if (dieta?.cotizacion?.platillos) {
        const pc = dieta.cotizacion.platillos.find(x => x.nombre === item.nombre);
        if (pc) costoProduccionEstimado += (pc.costo || 0) * (item.cantidad || 1);
      }
    });
  }

  // Si estamos editando, revertir el pedido anterior antes de crear el nuevo
  let _editandoPedidoEstado = null;
  if (_editandoPedidoId) {
    const viejo = pedidos.find(x => x.id === _editandoPedidoId);
    if (viejo) {
      _editandoPedidoEstado = viejo.estado;
      _reversarPedido(viejo, viejo.estado);
      pedidos = pedidos.filter(x => x.id !== _editandoPedidoId);
    }
  }

  const p = {
    id: uid(), cliente: clienteNombre, clienteId, canal, items, subtotal,
    descuento: montoDescuento, descuentoTipo: descuentoTipoActual, descuentoMotivo: motivoDescuento,
    costoEnvio, modoEnvio: modoEnvioActual, empresaEnvio,
    direccionId: document.getElementById('pedido-direccion')?.value || '',
    direccion: (() => {
      const did = document.getElementById('pedido-direccion')?.value;
      const d = getDireccionesCliente(clienteId).find(x => x.id === did);
      return d ? { nombre: d.nombre, direccion: d.direccion, maps: d.maps } : null;
    })(),
    envioClientePaga, envioAbsorbemos,
    total: totalCliente, pago,
    notas, horaEntrega: document.getElementById('pedido-hora-entrega')?.value || '', esCortesia,
    estado: _editandoPedidoEstado || 'Nuevo',
    fecha: document.getElementById('pedido-fecha')?.value || hoy(),
    hora: hora(), horaStr: hora(), createdAt: Date.now()
  };
  pedidos.unshift(p);
  const _eraEdicion = !!_editandoPedidoId;
  _editandoPedidoId = null;

  // Si se editÃ³ un pedido que ya estaba en estado avanzado, re-aplicar descuento de inventario
  if (_eraEdicion && _editandoPedidoEstado) {
    if (['En preparaciÃ³n','Listo','Entregado'].includes(_editandoPedidoEstado)) {
      _descontarInventarioPedido(p);
    }
  }

  if (clienteObj && !_eraEdicion) { clienteObj.pedidos = (clienteObj.pedidos || 0) + 1; clienteObj.ultimoPedido = hoy(); }

  // Guardar datos financieros en el pedido â€” se registran cuando llegue a "Entregado"
  p.finPendiente = {
    esCortesia, modoPagoActual, modoEnvioActual, pago,
    clienteNombre, empresaEnvio,
    subtotalConDescuento, envioClientePaga, envioAbsorbemos,
    costoEnvio, costoEnvioBase, costoProduccionEstimado,
  };

  save();
  closeModal('modal-pedido');
  if (_eraEdicion) toast('Pedido actualizado correctamente');

  if (modoPagoActual === 'credito' && totalCliente > 0) {
    // Guardar datos de CxC en el pedido â€” se genera cuando el pedido llegue a "Entregado"
    const montoCxC = (modoEnvioActual === 'efectivo' && envioAbsorbemos > 0)
      ? subtotalConDescuento + (envioClientePaga || 0)
      : totalCliente;
    const vencCxC = document.getElementById('credito-vencimiento')?.value || '';
    const conceptoCxC = document.getElementById('credito-concepto')?.value || `Pedido #${p.id.slice(-4).toUpperCase()}`;
    p.cxcPendiente = { monto: montoCxC, vencimiento: vencCxC, concepto: conceptoCxC };
    if (!_eraEdicion) toast(`Pedido creado â€” la cuenta por cobrar se generarÃ¡ al marcarlo Entregado`);
  } else if (!_eraEdicion) {
    toast(`Pedido de ${clienteNombre} creado${montoDescuento > 0 ? ' con descuento de '+fmt(montoDescuento) : ''}`);
  }

  // Si el pedido estÃ¡ Entregado (nace asÃ­ o se editÃ³ estando entregado): registrar financieros + CxC
  if (p.estado === 'Entregado') {
    _registrarFinancierosPedido(p);
    _generarCxCDesdePedido(p);
  }
  save();
  renderPedidos();
  renderDashboard();
  if (vistaCalActiva) renderCalendario();
}

// Registra todos los movimientos financieros de un pedido (caja, gastos, CxP).
// Se llama cuando el pedido llega a "Entregado".
function _registrarFinancierosPedido(p) {
  if (!p.finPendiente || p.financierosRegistrados) return;
  const f = p.finPendiente;
  const ref = `Pedido #${p.id.slice(-4).toUpperCase()}`;
  // La fecha del movimiento es la de ENTREGA (cuando afecta las cuentas), no la de creaciÃ³n
  const fechaMov = p.fechaEntrega || hoy();

  // Venta con pago inmediato â†’ entra a caja/banco
  if (!f.esCortesia && f.modoPagoActual === 'inmediato') {
    const montoACaja = f.modoEnvioActual === 'transferencia'
      ? f.subtotalConDescuento + f.envioClientePaga
      : f.subtotalConDescuento;
    if (montoACaja > 0)
      movCaja.push({ hora: hora(), pedidoId: p.id, cliente: f.clienteNombre, metodo: f.pago, monto: montoACaja, tipo: 'venta', estado: 'Cobrado', fecha: fechaMov });
    if (f.modoEnvioActual === 'efectivo' && f.envioAbsorbemos > 0) {
      movCaja.push({ hora: hora(), pedidoId: p.id, cliente: f.clienteNombre, metodo: 'Efectivo', monto: f.envioAbsorbemos, tipo: 'envio_absorbido', estado: 'Gasto absorbido', concepto: `Tarifa extra â€” ${f.clienteNombre}`, fecha: fechaMov });
      gastos.push({ id: uid(), pedidoId: p.id, concepto: `Tarifa extra envÃ­o: ${f.clienteNombre}`, categoria: 'Gastos de Venta', monto: f.envioAbsorbemos, fecha: fechaMov, recurrente: 'no', notas: ref });
    }
  }

  // AbsorciÃ³n en crÃ©dito efectivo
  if (f.modoPagoActual === 'credito' && f.envioAbsorbemos > 0 && f.modoEnvioActual === 'efectivo') {
    gastos.push({ id: uid(), pedidoId: p.id, concepto: `Tarifa extra envÃ­o: ${f.clienteNombre}`, categoria: 'Gastos de Venta', monto: f.envioAbsorbemos, fecha: fechaMov, recurrente: 'no', notas: ref });
    movCaja.push({ hora: hora(), pedidoId: p.id, cliente: f.clienteNombre, metodo: 'Efectivo', monto: f.envioAbsorbemos, tipo: 'envio_absorbido', estado: 'Gasto absorbido', concepto: `Tarifa extra â€” ${f.clienteNombre}`, fecha: fechaMov });
  }

  // CortesÃ­a â†’ su costo de producciÃ³n se refleja en COSTO DE VENTAS (no genera ingreso).
  // Solo se deja el rastro en movCaja para trazabilidad; NO se duplica en gastos[].
  if (f.esCortesia && f.costoProduccionEstimado > 0) {
    movCaja.push({ hora: hora(), pedidoId: p.id, cliente: f.clienteNombre, metodo: 'â€”', monto: f.costoProduccionEstimado, tipo: 'cortesia_gasto', estado: 'Costo producciÃ³n', concepto: 'CortesÃ­a â€” costo producciÃ³n', fecha: fechaMov });
  }

  // EnvÃ­o transferencia â†’ salida de efectivo al repartidor
  if (f.modoEnvioActual === 'transferencia' && f.costoEnvio > 0) {
    movCaja.push({ hora: hora(), pedidoId: p.id, cliente: f.empresaEnvio || 'Repartidor', metodo: 'Efectivo', monto: f.costoEnvio, tipo: 'envio_salida', estado: 'Pendiente pago', fecha: fechaMov });
  }

  // EnvÃ­o gratis absorbido / DiDi
  if (f.modoEnvioActual === 'gratis') {
    if (f.envioAbsorbemos > 0) {
      movCaja.push({ hora: hora(), pedidoId: p.id, cliente: f.clienteNombre, metodo: 'Efectivo', monto: f.envioAbsorbemos, tipo: 'envio_gratis', estado: 'Gasto de envÃ­o', concepto: `EnvÃ­o absorbido â€” ${f.clienteNombre}`, fecha: fechaMov });
      gastos.push({ id: uid(), pedidoId: p.id, concepto: `EnvÃ­o absorbido: ${f.clienteNombre}`, categoria: 'Gastos de Venta', monto: f.envioAbsorbemos, fecha: fechaMov, recurrente: 'no', notas: ref });
    }
  } else if (f.modoEnvioActual === 'didi') {
    if (f.costoEnvioBase > 0) {
      cxp.push({ id: uid(), pedidoId: p.id, concepto: `EnvÃ­o DiDi â€” ${f.clienteNombre} #${p.id.slice(-4).toUpperCase()}`, proveedor: f.empresaEnvio || 'DiDi Food', categoria: 'servicio', monto: f.costoEnvioBase, vencimiento: p.fecha, estado: 'pendiente', notas: `Cargo de plataforma DiDi ${ref}` });
    }
    if (f.envioAbsorbemos > 0) {
      gastos.push({ id: uid(), pedidoId: p.id, concepto: `EnvÃ­o DiDi absorbido: ${f.clienteNombre}`, categoria: 'Gastos de Venta', monto: f.envioAbsorbemos, fecha: fechaMov, recurrente: 'no', notas: ref });
    }
  }

  p.financierosRegistrados = true;
  save();
}

// Genera la CxC de un pedido a crÃ©dito (se llama al marcar Entregado)
function _generarCxCDesdePedido(p) {
  if (!p.cxcPendiente) return;
  // Evitar duplicado si ya existe
  if (cxc.some(c => c.pedidoId === p.id)) return;
  const { monto, vencimiento, concepto } = p.cxcPendiente;
  const estadoCxC = vencimiento && new Date(vencimiento) < new Date() ? 'vencida' : 'pendiente';
  cxc.push({
    id: uid(), clienteId: p.clienteId, clienteNombre: p.cliente,
    concepto, monto,
    vencimiento, fecha: hoy(), estado: estadoCxC,
    pedidoId: p.id, notas: 'Generado al entregar el pedido'
  });
}

// Descuenta inventario de un pedido (menÃº + dieta) y muestra alertas.
// Se llama cuando el pedido pasa a "En preparaciÃ³n".
function _descontarInventarioPedido(p) {
  if (p.inventarioDescontado) return; // evitar doble descuento
  const alertasAgotado = [];
  const alertasBajo = [];

  (p.items || []).forEach(item => {
    let receta = null;
    // Platillo de menÃº
    const platillo = menu.find(m => m.nombre === (item.nombre||item) || m.id === item.id);
    if (platillo?.receta?.length) receta = platillo.receta;
    // Platillo de dieta: buscar receta en la cotizaciÃ³n de la dieta
    if (!receta && item.esDieta && item.dietaId) {
      const dieta = dietas.find(d => d.id === item.dietaId);
      const platCot = dieta?.cotizacion?.platillos?.find(pc => pc.nombre === item.nombre);
      if (platCot?.lineas?.length) receta = platCot.lineas;
    }
    if (!receta) return;
    receta.forEach(linea => {
      const ing = inventario.find(i => i.id === linea.ingId);
      if (!ing) return;
      ing.stock = Math.max(0, ing.stock - linea.cantidad * (item.cantidad||1));
      if (ing.stock === 0) alertasAgotado.push(ing.nombre);
      else if (ing.stock <= ing.minimo) alertasBajo.push(`${ing.nombre} (${ing.stock} ${ing.unidad})`);
    });
  });

  p.inventarioDescontado = true;
  save();

  if (alertasAgotado.length || alertasBajo.length) {
    let msg = '';
    if (alertasAgotado.length) msg += `â›” AGOTADO: ${alertasAgotado.join(', ')}. `;
    if (alertasBajo.length) msg += `âš  Stock bajo: ${alertasBajo.join(', ')}.`;
    setTimeout(() => {
      const t = document.createElement('div');
      t.className = 'toast toast-error';
      t.style.cssText = 'max-width:420px;line-height:1.5;padding:12px 16px';
      t.innerHTML = `<div style="font-size:12px;font-weight:600;margin-bottom:4px">âš  Alerta de inventario</div><div style="font-size:11px">${msg}</div>`;
      const tc = document.getElementById('toast-container');
      if (tc) { tc.appendChild(t); setTimeout(()=>t.remove(), 6000); }
    }, 300);
  }
}

function verDetallePedido(id) {
  const p = pedidos.find(x => x.id === id);
  if (!p) return;
  document.getElementById('detalle-titulo').textContent = `Pedido #${id.slice(-4).toUpperCase()}`;
  const idxEstado = ESTADOS.indexOf(p.estado);
  document.getElementById('detalle-body').innerHTML = `
    <div class="flex items-center gap-8 mb-16">
      ${ESTADOS.map((e,i) => `<div style="display:flex;align-items:center;gap:4px">
        <span style="width:24px;height:24px;border-radius:50%;background:${i<=idxEstado?'var(--green)':'var(--bg4)'};display:flex;align-items:center;justify-content:center;font-size:11px;color:${i<=idxEstado?'#FFFFFF':'var(--text3)'}">${i+1}</span>
        <span style="font-size:11px;color:${i===idxEstado?'var(--green)':'var(--text3)'}">${e}</span>
        ${i<ESTADOS.length-1?'<span style="color:var(--text3);margin:0 4px">â†’</span>':''}
      </div>`).join('')}
    </div>
    <div class="grid grid-2 mb-16" style="font-size:13px">
      <div><span class="text-dim">Cliente:</span> <strong>${p.cliente}</strong></div>
      <div><span class="text-dim">Canal:</span> ${p.canal}</div>
      <div><span class="text-dim">Fecha:</span> ${p.fecha}</div>
      <div><span class="text-dim">MÃ©todo de pago:</span> <strong>${p.pago}${p.modoPago==='credito'?' (crÃ©dito)':''}</strong></div>
      ${p.horaEntrega ? `<div><span class="text-dim">Hora entrega:</span> ${p.horaEntrega}</div>` : ''}
      ${p.modoEnvio && p.modoEnvio!=='sin' ? `<div><span class="text-dim">EnvÃ­o:</span> ${p.modoEnvio}</div>` : ''}
    </div>
    ${(p.costoEnvio > 0 || p.envioClientePaga > 0 || p.envioAbsorbemos > 0) ? `
      <div class="card card-sm mb-12" style="background:var(--bg3)">
        <div style="font-size:11px;color:var(--text3);margin-bottom:6px;font-weight:600">ðŸ›µ ENVÃO</div>
        ${p.direccion ? `
          <div class="flex justify-between items-center" style="padding-bottom:6px;margin-bottom:6px;border-bottom:1px solid var(--border)">
            <div>
              <div style="font-size:12px;font-weight:600">ðŸ“ ${p.direccion.nombre||'DirecciÃ³n'}</div>
              ${p.direccion.direccion ? `<div style="font-size:11px;color:var(--text3)">${p.direccion.direccion}</div>` : ''}
            </div>
            ${p.direccion.maps ? `<a href="${p.direccion.maps}" target="_blank" class="btn btn-secondary btn-sm" style="padding:4px 10px;font-size:11px;text-decoration:none">Abrir Maps</a>` : ''}
          </div>` : ''}
        <div class="flex justify-between" style="font-size:12px"><span>Cliente paga:</span><span class="font-mono">${fmt(p.envioClientePaga||0)}</span></div>
        ${p.envioAbsorbemos > 0 ? `<div class="flex justify-between" style="font-size:12px;color:var(--amber)"><span>Nosotros absorbemos:</span><span class="font-mono">${fmt(p.envioAbsorbemos)}</span></div>` : ''}
        <div class="flex justify-between" style="font-size:12px;color:var(--text2)"><span>Costo total envÃ­o:</span><span class="font-mono">${fmt(p.costoEnvio||0)}</span></div>
      </div>` : ''}
    <div style="margin-bottom:12px">
      <div class="text-dim mb-8" style="font-size:12px">ITEMS (${(p.items||[]).reduce((s,i)=>s+(i.cantidad||1),0)} platillos)</div>
      ${p.items.map(i => `
        <div class="flex justify-between" style="padding:8px 0;border-bottom:1px solid var(--border)">
          <span>${i.nombre || i} ${i.cantidad > 1 ? `Ã—${i.cantidad}` : ''}${i.tiempo ? ` <span style="font-size:10px;color:var(--text3)">(${i.tiempo})</span>`:''}</span>
          <span class="font-mono">${fmt((i.precio||0)*(i.cantidad||1))}</span>
        </div>`).join('')}
      <div class="flex justify-between mt-8"><strong>Total que paga el cliente</strong><strong class="highlight-green font-mono">${fmt(p.total)}</strong></div>
    </div>
    ${p.notas ? `<div class="card card-sm mb-8" style="background:var(--amber-dim);border-color:rgba(255,122,0,0.3)"><span style="font-size:12px">ðŸ“ <strong>Notas:</strong> ${p.notas}</span></div>` : ''}
    ${p.esCortesia ? `<div class="card card-sm mb-8" style="background:var(--purple-dim);border-color:rgba(155,89,182,0.3)"><span style="font-size:12px;color:var(--purple)">ðŸŽ CortesÃ­a â€” costo de producciÃ³n registrado como gasto de venta</span></div>` : ''}
    ${(p.envioAbsorbemos > 0) ? `<div class="card card-sm" style="background:var(--purple-dim);border-color:rgba(155,89,182,0.2)"><span style="font-size:12px;color:var(--purple)">ðŸ“‰ EnvÃ­o absorbido: ${fmt(p.envioAbsorbemos)} (registrado como gasto)</span></div>` : ''}`;
  const footer = document.getElementById('detalle-footer');
  const nextEstado = ESTADOS[idxEstado + 1];
  const esEditable = ['Nuevo','En preparaciÃ³n','Listo'].includes(p.estado);
  footer.innerHTML = `
    ${p.estado !== 'Cancelado' ? `<button class="btn btn-danger btn-sm" onclick="cancelarPedido('${id}')">Cancelar</button>` : ''}
    <button class="btn btn-secondary btn-sm" onclick="openCambiarPago('${id}')">ðŸ’³ Pago</button>
    ${esEditable ? `<button class="btn btn-secondary btn-sm" onclick="openEditarPedido('${id}')">âœï¸ Editar</button>` : ''}
    <div style="flex:1"></div>
    ${nextEstado ? `<button class="btn btn-primary" onclick="avanzarEstado('${id}')">â†’ "${nextEstado}"</button>` : '<span class="badge badge-green">âœ“ Completado</span>'}`;
  openModal('modal-detalle-pedido');
}

// ========== CAMBIAR MÃ‰TODO DE PAGO ==========
function openEditarPedido(id) {
  const p = pedidos.find(x => x.id === id);
  if (!p) return;
  closeModal('modal-detalle-pedido');
  // Abrir el modal completo de creaciÃ³n, luego precargar datos
  _editandoPedidoId = id;
  openNuevoPedido();

  setTimeout(() => {
    // Cambiar tÃ­tulo y botÃ³n
    const titEl = document.querySelector('#modal-pedido .modal-title');
    if (titEl) titEl.textContent = `Editar pedido #${id.slice(-4).toUpperCase()}`;
    const btnGuardar = document.querySelector('#modal-pedido .modal-footer .btn-primary');
    if (btnGuardar) btnGuardar.textContent = 'âœ“ Guardar cambios';

    // Cliente
    document.getElementById('pedido-cliente').value = p.clienteId || '';
    // Canal
    const canalEl = document.getElementById('pedido-canal'); if (canalEl) canalEl.value = p.canal || 'WhatsApp';
    // Fecha
    const fechaEl = document.getElementById('pedido-fecha'); if (fechaEl) fechaEl.value = p.fecha || hoy();
    // Hora entrega y notas
    const heEl = document.getElementById('pedido-hora-entrega'); if (heEl) heEl.value = p.horaEntrega || '';
    const ntEl = document.getElementById('pedido-notas'); if (ntEl) ntEl.value = p.notas || '';

    // Cargar items del MENÃš (los que no son de dieta)
    itemsPedidoActual = {};
    (p.items||[]).filter(i => !i.esDieta).forEach(item => {
      const plat = menu.find(m => m.nombre === item.nombre || m.id === item.id);
      const pid = plat ? plat.id : item.id || item.nombre;
      itemsPedidoActual[pid] = { id: pid, nombre: item.nombre, precio: item.precio, cantidad: item.cantidad||1 };
      // Marcar en el selector visual
      const numEl = document.getElementById('num-'+pid);
      const checkEl = document.getElementById('check-'+pid);
      const qtyEl = document.getElementById('qty-'+pid);
      if (numEl) numEl.style.display = 'flex';
      if (qtyEl) qtyEl.textContent = item.cantidad||1;
      if (checkEl) { checkEl.style.background='var(--green)'; checkEl.style.borderColor='var(--green)'; checkEl.textContent='âœ“'; }
    });
    actualizarConteoSel();

    // Cargar items de DIETA (si el pedido los tiene)
    const itemsDietaGuardados = (p.items||[]).filter(i => i.esDieta);
    if (itemsDietaGuardados.length > 0) {
      const dietaId = itemsDietaGuardados[0].dietaId;
      const dietaSel = document.getElementById('pedido-dieta-sel');
      if (dietaSel && dietaId) {
        dietaSel.value = dietaId;
        mostrarPlatillosDieta(dietaId); // reconstruye la lista base
        // Restaurar exactamente lo que se habÃ­a guardado: marcados, cantidades y precios
        setTimeout(() => {
          (window._dietaPlatillosPrecios || []).forEach(pp => {
            const guardado = itemsDietaGuardados.find(g => g.nombre === pp.nombre);
            if (guardado) {
              pp.incluido = true;
              pp.cantidad = guardado.cantidad || 1;
              pp.precio = guardado.precio || pp.precio;
            } else {
              pp.incluido = false; // no estaba en el pedido original
            }
          });
          renderListaPlatillosDieta();
        }, 30);
      }
    }

    // CortesÃ­a
    const cortEl = document.getElementById('pedido-cortesia');
    if (cortEl) { cortEl.checked = !!p.esCortesia; if (p.esCortesia) { const pc=document.getElementById('panel-cortesia'); if(pc) pc.style.display='block'; } }

    // Modo de pago â€” activar el chip correspondiente
    const modoPago = (p.pago === 'Pendiente') ? 'credito' : 'inmediato';
    const pagoChips = document.querySelectorAll('#chips-modo-pago .chip');
    pagoChips.forEach(c => {
      const oc = c.getAttribute('onclick')||'';
      if (oc.includes(`'${modoPago}'`)) c.click();
    });

    setTimeout(() => {
      // MÃ©todo de pago especÃ­fico
      if (p.pago && p.pago !== 'Pendiente') {
        const mpEl = document.getElementById('pedido-pago'); if (mpEl) mpEl.value = p.pago;
      }
      // Modo de envÃ­o â€” activar chip
      const envioModo = p.modoEnvio || 'sin_envio';
      modoEnvioActual = envioModo;
      document.querySelectorAll('#modal-pedido .chip').forEach(c => {
        const oc = c.getAttribute('onclick')||'';
        if (oc.includes('setModoEnvio') && oc.includes(`'${envioModo}'`)) c.click();
      });
      setTimeout(() => {
        // Datos de envÃ­o
        const ecEl = document.getElementById('envio-costo'); if (ecEl) ecEl.value = p.costoEnvio || '';
        const emEl = document.getElementById('envio-empresa'); if (emEl) emEl.value = p.empresaEnvio || '';
        const cpEl = document.getElementById('envio-cliente-paga'); if (cpEl && p.envioClientePaga !== undefined) cpEl.value = p.envioClientePaga;
        actualizarTotalPedido();
      }, 30);
    }, 30);
  }, 60);
}

function confirmarEditarPedido() {
  const id = document.getElementById('editar-pedido-id').value;
  const p = pedidos.find(x => x.id === id);
  if (!p) return;
  const clienteId = document.getElementById('editar-pedido-cliente').value;
  const clienteObj = clientes.find(c => c.id === clienteId);
  p.clienteId = clienteId;
  p.cliente = clienteObj ? clienteObj.nombre : p.cliente;
  p.canal = document.getElementById('editar-pedido-canal').value;
  p.notas = document.getElementById('editar-pedido-notas').value;
  p.horaEntrega = document.getElementById('editar-pedido-hora-entrega')?.value || '';
  p.fecha = document.getElementById('editar-pedido-fecha').value;
  // Actualizar CxC asociada si existe
  const cxcItem = cxc.find(c => c.pedidoId === id);
  if (cxcItem) { cxcItem.clienteId = clienteId; cxcItem.clienteNombre = p.cliente; }
  save();
  closeModal('modal-editar-pedido');
  closeModal('modal-detalle-pedido');
  toast('Pedido actualizado');
  renderPedidos();
}

function openCambiarPago(id) {
  const p = pedidos.find(x => x.id === id);
  if (!p) return;
  document.getElementById('cambio-pago-pedido-id').value = id;
  document.getElementById('cambio-pago-info').innerHTML = `<strong>${p.cliente}</strong> â€” Pedido #${id.slice(-4).toUpperCase()} â€” ${fmt(p.total)}<br><span style="font-size:11px;color:var(--text3)">Pago actual: <strong>${p.pago || 'Sin definir'}</strong></span>`;
  document.getElementById('cambio-pago-metodo').value = p.pago || 'Efectivo';
  openModal('modal-cambiar-pago');
}

function confirmarCambiarPago() {
  const id = document.getElementById('cambio-pago-pedido-id').value;
  const nuevoMetodo = document.getElementById('cambio-pago-metodo').value;
  const p = pedidos.find(x => x.id === id);
  if (!p) return;
  const metodoAnterior = p.pago;
  p.pago = nuevoMetodo;

  // Actualizar movimiento en caja si existe
  const mov = movCaja.find(m => m.pedidoId === id && m.tipo === 'venta');
  if (mov) {
    mov.metodo = nuevoMetodo;
  } else if (p.total > 0) {
    // Si no existÃ­a movimiento (venÃ­a de crÃ©dito), crear entrada en caja
    movCaja.push({ hora: hora(), pedidoId: id, cliente: p.cliente, metodo: nuevoMetodo, monto: p.total, tipo: 'venta', estado: p.estado === 'Entregado' ? 'Cobrado' : 'Nuevo', concepto: 'Pago registrado (cambio de mÃ©todo)' });
    // Cerrar CxC si existÃ­a
    const cxcItem = cxc.find(c => c.pedidoId === id && c.estado !== 'pagada');
    if (cxcItem) { cxcItem.estado = 'pagada'; cxcItem.fechaPago = hoy(); }
  }
  save();
  closeModal('modal-cambiar-pago');
  closeModal('modal-detalle-pedido');
  toast(`MÃ©todo de pago actualizado a "${nuevoMetodo}"`);
  renderPedidos();
  renderDashboard();
}

function avanzarEstado(id) {
  const p = pedidos.find(x => x.id === id);
  if (!p) return;
  const idx = ESTADOS.indexOf(p.estado);
  if (idx < ESTADOS.length - 1) {
    p.estado = ESTADOS[idx + 1];
    // Al pasar a "En preparaciÃ³n": descontar insumos del inventario
    if (p.estado === 'En preparaciÃ³n') {
      _descontarInventarioPedido(p);
    }
    if (p.estado === 'Entregado') {
      // Marcar la fecha de entrega (dÃ­a en que afecta las cuentas)
      p.fechaEntrega = hoy();
      // Registrar todos los movimientos financieros ahora que se entregÃ³
      _registrarFinancierosPedido(p);
      _generarCxCDesdePedido(p);
    }
    save();
    closeModal('modal-detalle-pedido');
    toast(`Pedido actualizado a "${p.estado}"`);
    renderPedidos();
    renderDashboard();
    if (p.estado === 'Entregado') { renderCaja(); if (document.getElementById('page-bancos')) renderBancos(); if (document.getElementById('page-cxc')) renderCXC(); }
  }
}

// Revierte todos los efectos de un pedido (insumos, gastos, movCaja, CxC)
function _reversarPedido(p, estadoAnterior, sinMerma) {
  const id = p.id;

  // 1. Insumos: solo si se habÃ­an descontado (estado habÃ­a llegado a "En preparaciÃ³n" o mÃ¡s)
  if (p.inventarioDescontado && p.items && p.items.length) {
    p.items.forEach(item => {
      // Obtener receta (menÃº o dieta)
      let receta = null;
      const plat = menu.find(m => m.nombre === item.nombre || m.id === item.id);
      if (plat?.receta?.length) receta = plat.receta;
      if (!receta && item.esDieta && item.dietaId) {
        const dieta = dietas.find(d => d.id === item.dietaId);
        const platCot = dieta?.cotizacion?.platillos?.find(pc => pc.nombre === item.nombre);
        if (platCot?.lineas?.length) receta = platCot.lineas;
      }
      if (!receta) return;

      // sinMerma = true (ej. "Error al capturar"): devolver insumos, NO registrar merma
      const yaPreparado = (estadoAnterior === 'Entregado' || estadoAnterior === 'Listo' || estadoAnterior === 'En preparaciÃ³n');
      if (yaPreparado && !sinMerma) {
        // Ya se habÃ­a preparado â†’ merma
        const totalMerma = receta.reduce((s, l) => {
          const ing = inventario.find(i => i.id === l.ingId);
          return s + (ing ? (ing.costo||0) * l.cantidad * (item.cantidad || 1) : 0);
        }, 0);
        if (totalMerma > 0) {
          historialMerma.push({ id: uid(), fecha: hoy(), hora: hora(), pedidoId: id, cliente: p.cliente, concepto: `CancelaciÃ³n: ${item.nombre} Ã—${item.cantidad||1}`, monto: totalMerma, tipo: 'pedido_cancelado' });
          gastos.push({ id: uid(), concepto: `Merma: ${item.nombre} (cancelado)`, categoria: 'Merma', monto: totalMerma, fecha: hoy(), recurrente: 'no', notas: `Pedido #${id.slice(-4).toUpperCase()}` });
        }
      } else {
        // Devolver insumos al inventario (nunca se preparÃ³, o fue error de captura)
        receta.forEach(linea => {
          const ing = inventario.find(i => i.id === linea.ingId);
          if (ing) ing.stock = Math.round((ing.stock + linea.cantidad * (item.cantidad || 1)) * 1000) / 1000;
        });
      }
    });
  }

  // 2. Revertir gastos ligados al pedido (cortesÃ­a, envÃ­o gratis, etc.)
  gastos = gastos.filter(g => g.pedidoId !== id);

  // 3. Revertir movimientos de caja del pedido
  movCaja = movCaja.filter(m => !(m.pedidoId === id && (m.tipo === 'cortesia_gasto' || m.tipo === 'envio_gratis' || m.tipo === 'envio_absorbido' || m.tipo === 'envio_salida' || m.tipo === 'venta')));

  // 4. Eliminar CxC asociada
  cxc = cxc.filter(c => c.pedidoId !== id);

  // 5. Eliminar CxP asociada (envÃ­o DiDi)
  cxp = cxp.filter(c => c.pedidoId !== id);
}

function cancelarPedido(id) {
  const p = pedidos.find(x => x.id === id);
  if (!p) return;
  const estadoAnterior = p.estado;
  p.estado = 'Cancelado';
  _reversarPedido(p, estadoAnterior);
  save();
  closeModal('modal-detalle-pedido');
  const esCort = p.esCortesia;
  const msg = esCort
    ? 'CortesÃ­a cancelada â€” gasto revertido en estado de resultados'
    : estadoAnterior === 'En preparaciÃ³n'
      ? 'Pedido cancelado â€” insumos registrados como merma'
      : 'Pedido cancelado â€” insumos devueltos al inventario';
  toast(msg, 'error');
  renderPedidos();
  renderDashboard();
}

// ========== MENÃš ==========
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
        ${m.etiquetas?.length ? `<div class="flex gap-4 mb-10" style="flex-wrap:wrap">${m.etiquetas.map(e=>`<span style="font-size:10px;padding:2px 7px;background:var(--bg3);border-radius:10px;color:var(--text2)">${e}</span>`).join('')}</div>` : ''}
        ${m.calorias ? `<div style="font-size:11px;color:var(--text3);margin-bottom:8px">ðŸ”¥ ${m.calorias} kcal</div>` : ''}
        <hr class="divider">
        <div class="flex justify-between items-center">
          <div>
            <div style="font-size:18px;font-weight:600;color:var(--green)">${fmt(m.precio)}</div>
            <div style="font-size:11px;color:var(--text3)">costo: ${fmt(m.costo)} â€¢ margen: <span style="color:${margen>50?'var(--green)':margen>30?'var(--amber)':'var(--red)'}">${margen}%</span></div>
            ${m.receta?.length ? `<div style="font-size:11px;color:var(--text3);margin-top:2px">ðŸ“‹ ${m.receta.length} ingrediente${m.receta.length>1?'s':''} en receta</div>` : '<div style="font-size:11px;color:var(--amber);margin-top:2px">âš  Sin receta cargada</div>'}
          </div>
          <div class="flex gap-6">
            <button class="btn btn-secondary btn-sm" onclick="editarPlatillo('${m.id}')">Editar</button>
            <button class="btn btn-danger btn-sm" onclick="eliminarPlatillo('${m.id}')">ðŸ—‘</button>
          </div>
        </div>
      </div>`;
  }).join('') || `<div class="empty" style="grid-column:1/-1"><div class="empty-icon">ðŸ¥—</div><div class="empty-title">Sin platillos en esta categorÃ­a</div></div>`;
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
    cont.innerHTML = '<div style="padding:12px;text-align:center;font-size:12px;color:var(--text3)">Sin ingredientes. Agrega uno para calcular el costo automÃ¡ticamente.</div>';
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
        ${inventario.map(i => `<option value="${i.id}" ${i.id===linea.ingId?'selected':''}>${i.nombre} (${i.unidad})</option>`).join('')}
      </select>
      <input type="number" class="form-input" style="font-size:12px;padding:5px 8px;border-radius:4px;margin-left:6px" 
             placeholder="0" value="${linea.cantidad||''}"
             onchange="actualizarLineaReceta(${idx},'cantidad',parseFloat(this.value)||0)">
      <span class="font-mono" style="font-size:12px;color:var(--amber);padding-left:8px">${fmt(costoLinea)}</span>
      <button onclick="eliminarLineaReceta(${idx})" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:16px;padding:0 4px;">Ã—</button>
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
    c.classList.toggle('active', etiquetasSeleccionadas.includes(c.textContent.trim().replace(/^[^\s]+\s/,'')));
  });
  renderRecetaLineas();
  openModal('modal-platillo');
}

function guardarPlatillo() {
  const nombre = document.getElementById('platillo-nombre').value.trim();
  if (!nombre) { toast('Ingresa el nombre del platillo', 'error'); return; }
  const costoReceta = recetaActual.length > 0
    ? recetaActual.reduce((s, l) => { const i = inventario.find(x=>x.id===l.ingId); return s+(i?i.costo*(l.cantidad||0):0); }, 0)
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
    toast('Platillo agregado al menÃº');
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
// ====== ESTADOS DEL PIPELINE DE DIETAS ======
const DIETA_ESTADOS = [
  { key: 'recibida',   label: 'Recibida',   emoji: 'ðŸ“¥', color: 'var(--text2)' },
  { key: 'cotizada',   label: 'Cotizada',   emoji: 'ðŸ’°', color: 'var(--blue)' },
  { key: 'enviada',    label: 'Enviada',    emoji: 'ðŸ“¤', color: 'var(--amber)' },
  { key: 'confirmada', label: 'Confirmada', emoji: 'âœ…', color: 'var(--green)' },
  { key: 'rechazada',  label: 'Rechazada',  emoji: 'âŒ', color: 'var(--red)' },
];

function _diasDesde(fechaStr) {
  if (!fechaStr) return null;
  const ms = Date.now() - new Date(fechaStr).getTime();
  return Math.floor(ms / (1000*60*60*24));
}
function _textoHaceCuanto(fechaStr) {
  const d = _diasDesde(fechaStr);
  if (d === null) return '';
  if (d === 0) return 'hoy';
  if (d === 1) return 'hace 1 dÃ­a';
  if (d < 30) return `hace ${d} dÃ­as`;
  const meses = Math.floor(d/30);
  return meses === 1 ? 'hace 1 mes' : `hace ${meses} meses`;
}

function renderDietas() {
  // MigraciÃ³n: dietas viejas sin estado â†’ confirmada + vigente
  let cambios = false;
  dietas.forEach(d => {
    if (!d.estado) {
      d.estado = d.cotizacion?.platillos?.length ? 'confirmada' : 'recibida';
      if (d.estado === 'confirmada') { d.vigente = true; d.fechaConfirmada = d.fechaConfirmada || d.inicio || hoy(); }
      d.fechaRecibida = d.fechaRecibida || d.inicio || hoy();
      cambios = true;
    }
  });
  if (cambios) save();

  // KPIs de conversiÃ³n (mes en curso)
  const desde = hoy().slice(0,7) + '-01';
  const enMes = d => (d.fechaEnviada || d.fechaConfirmada || d.fechaRechazada || d.fechaRecibida || '') >= desde;
  const enviadas = dietas.filter(d => ['enviada','confirmada','rechazada'].includes(d.estado) && enMes(d)).length;
  const confirmadas = dietas.filter(d => d.estado === 'confirmada' && enMes(d)).length;
  const rechazadas = dietas.filter(d => d.estado === 'rechazada' && enMes(d)).length;
  const pendientes = dietas.filter(d => ['recibida','cotizada','enviada'].includes(d.estado)).length;
  const conv = enviadas > 0 ? Math.round(confirmadas/enviadas*100) : 0;
  const set = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  set('diet-kpi-enviadas', enviadas);
  set('diet-kpi-confirmadas', confirmadas);
  set('diet-kpi-rechazadas', rechazadas);
  set('diet-kpi-pendientes', pendientes);
  set('diet-kpi-conversion', `${conv}% conversiÃ³n`);

  // Pipeline kanban
  const kanban = document.getElementById('dietas-kanban');
  if (kanban) {
    kanban.innerHTML = DIETA_ESTADOS.map(est => {
      const items = dietas.filter(d => d.estado === est.key && !d.esHistorica);
      return `
      <div class="kanban-col" style="background:var(--bg2);border-radius:10px;padding:8px;min-height:120px">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 6px 8px;border-bottom:1px solid var(--border);margin-bottom:8px">
          <span style="font-size:12px;font-weight:600;color:${est.color}">${est.emoji} ${est.label}</span>
          <span class="badge badge-gray" style="font-size:10px">${items.length}</span>
        </div>
        ${items.map(d => _tarjetaDietaPipeline(d)).join('') || '<div style="font-size:11px;color:var(--text3);text-align:center;padding:12px 4px">â€”</div>'}
      </div>`;
    }).join('');
  }

  // Dietas vigentes
  renderDietasVigentes();
}

function _tarjetaDietaPipeline(d) {
  const tieneCot = d.cotizacion && d.cotizacion.platillos?.length > 0;
  const fechaEstado = d['fecha'+d.estado.charAt(0).toUpperCase()+d.estado.slice(1)] || d.fechaRecibida;
  let acciones = '';
  if (d.estado === 'recibida') acciones = `<button class="btn btn-primary btn-sm" style="font-size:10px;padding:3px 8px" onclick="openCotizacion('${d.id}')">ðŸ’° Cotizar</button>`;
  else if (d.estado === 'cotizada') acciones = `<button class="btn btn-secondary btn-sm" style="font-size:10px;padding:3px 8px" onclick="openCotizacion('${d.id}')">âœï¸</button><button class="btn btn-primary btn-sm" style="font-size:10px;padding:3px 8px" onclick="avanzarDieta('${d.id}','enviada')">ðŸ“¤ Enviar</button>`;
  else if (d.estado === 'enviada') acciones = `<button class="btn btn-secondary btn-sm" style="font-size:10px;padding:3px 8px;color:var(--green)" onclick="avanzarDieta('${d.id}','confirmada')">âœ…</button><button class="btn btn-secondary btn-sm" style="font-size:10px;padding:3px 8px;color:var(--red)" onclick="rechazarDieta('${d.id}')">âŒ</button>`;
  else if (d.estado === 'rechazada') acciones = `<button class="btn btn-secondary btn-sm" style="font-size:10px;padding:3px 8px" onclick="openCotizacion('${d.id}')">â†» Recotizar</button>`;
  else if (d.estado === 'confirmada') acciones = `<span class="badge badge-green" style="font-size:9px">${d.vigente?'VIGENTE':'histÃ³rica'}</span>`;

  return `
  <div class="card" style="padding:10px;margin-bottom:8px;cursor:default">
    <div style="font-size:13px;font-weight:600;margin-bottom:2px">${d.clienteNombre}</div>
    ${d.nombre ? `<div style="font-size:10px;color:var(--text3);margin-bottom:4px">${d.nombre}</div>` : ''}
    ${tieneCot ? `<div style="font-size:11px;color:var(--green);font-family:'DM Mono',monospace;margin-bottom:4px">${fmt(d.cotizacion.preciodia)}/dÃ­a</div>` : ''}
    ${d.pdfRef?.nombre ? `<div style="font-size:10px;color:var(--text2);margin-bottom:4px">ðŸ“„ ${d.pdfRef.nombre}</div>` : ''}
    <div style="font-size:10px;color:var(--text3);margin-bottom:6px">${_textoHaceCuanto(fechaEstado)}</div>
    <div class="flex gap-4" style="flex-wrap:wrap">${acciones}
      <button class="btn btn-danger btn-sm" style="font-size:10px;padding:3px 6px" onclick="eliminarDieta('${d.id}')">ðŸ—‘</button>
    </div>
  </div>`;
}

function renderDietasVigentes() {
  const grid = document.getElementById('dietas-vigentes-grid');
  if (!grid) return;
  const vigentes = dietas.filter(d => d.estado === 'confirmada' && d.vigente);
  grid.innerHTML = vigentes.map(d => {
    const cot = d.cotizacion;
    const nPlatillos = cot?.platillos?.filter(p=>p.seleccionado!==false).length || 0;
    return `
    <div class="card" style="padding:16px;border-color:rgba(46,204,113,0.25)">
      <div class="flex justify-between items-center mb-8">
        <span class="badge badge-green">âœ… Vigente Â· ${_textoHaceCuanto(d.fechaConfirmada)}</span>
        <div class="flex gap-6">
          <button class="btn btn-secondary btn-sm" onclick="openCotizacion('${d.id}')">âœï¸ Ver/editar</button>
          <button class="btn btn-secondary btn-sm" onclick="verHistorialDieta('${d.clienteId}')">ðŸ• Historial</button>
        </div>
      </div>
      <div style="font-size:15px;font-weight:600;margin-bottom:2px">${d.clienteNombre}</div>
      ${d.nombre ? `<div style="font-size:12px;color:var(--text3);margin-bottom:8px">${d.nombre}</div>` : ''}
      ${d.pdfRef?.dataUrl ? `<div style="margin-bottom:8px"><a href="${d.pdfRef.dataUrl}" download="${d.pdfRef.nombre}" style="font-size:11px;color:var(--blue);text-decoration:none">ðŸ“„ ${d.pdfRef.nombre} (descargar)</a></div>` : ''}
      ${cot ? `
        <div style="background:var(--green-dim);border:1px solid rgba(46,204,113,0.2);border-radius:6px;padding:10px">
          <div style="font-size:11px;color:var(--text2);margin-bottom:6px">${nPlatillos} platillo${nPlatillos!==1?'s':''}</div>
          <div class="grid" style="grid-template-columns:repeat(3,1fr);gap:6px">
            <div style="text-align:center;background:var(--bg2);border-radius:6px;padding:8px"><div style="font-size:14px;font-weight:700;color:var(--green)">${fmt(cot.preciodia)}</div><div style="font-size:10px;color:var(--text3)">dÃ­a</div></div>
            <div style="text-align:center;background:var(--bg2);border-radius:6px;padding:8px"><div style="font-size:14px;font-weight:700;color:var(--green)">${fmt(cot.preciosemana)}</div><div style="font-size:10px;color:var(--text3)">semana</div></div>
            <div style="text-align:center;background:var(--bg2);border-radius:6px;padding:8px"><div style="font-size:14px;font-weight:700;color:var(--green)">${fmt(cot.preciomes)}</div><div style="font-size:10px;color:var(--text3)">mes</div></div>
          </div>
        </div>` : ''}
    </div>`;
  }).join('') || '<div class="empty" style="grid-column:1/-1"><div class="empty-icon">ðŸ½</div><div class="empty-title">Sin dietas vigentes</div><div class="empty-text">Confirma una cotizaciÃ³n para activar la dieta de un cliente</div></div>';
}

// ====== TRANSICIONES DE ESTADO ======
function avanzarDieta(id, nuevoEstado) {
  const d = dietas.find(x => x.id === id);
  if (!d) return;
  d.estado = nuevoEstado;
  const campo = 'fecha' + nuevoEstado.charAt(0).toUpperCase() + nuevoEstado.slice(1);
  d[campo] = hoy();

  if (nuevoEstado === 'confirmada') {
    // Las demÃ¡s dietas confirmadas del mismo cliente pasan a histÃ³ricas
    dietas.forEach(otra => {
      if (otra.id !== id && otra.clienteId === d.clienteId && otra.estado === 'confirmada') {
        otra.vigente = false;
        otra.esHistorica = true;
      }
    });
    d.vigente = true;
    d.esHistorica = false;
    // Marcar cliente con dieta
    const cli = clientes.find(c => c.id === d.clienteId);
    if (cli) cli.tieneDieta = true;
  }
  save();
  toast(`Dieta marcada como "${nuevoEstado}"`);
  renderDietas();
}

function rechazarDieta(id) {
  const motivo = prompt('Motivo del rechazo (opcional):') || '';
  const d = dietas.find(x => x.id === id);
  if (!d) return;
  d.estado = 'rechazada';
  d.fechaRechazada = hoy();
  d.motivoRechazo = motivo;
  save();
  toast('CotizaciÃ³n marcada como rechazada', 'error');
  renderDietas();
}

function verHistorialDieta(clienteId) {
  const historico = dietas.filter(d => d.clienteId === clienteId && d.estado === 'confirmada');
  const cli = clientes.find(c => c.id === clienteId);
  if (!historico.length) { toast('Sin historial para este cliente'); return; }
  const lista = historico.sort((a,b)=>(b.fechaConfirmada||'').localeCompare(a.fechaConfirmada||''))
    .map(d => `â€¢ ${d.nombre||'Dieta'} â€” ${fmt(d.cotizacion?.preciodia||0)}/dÃ­a â€” ${d.vigente?'VIGENTE':'histÃ³rica'} (${fmtFecha(d.fechaConfirmada)})`).join('\n');
  alert(`Historial de dietas â€” ${cli?.nombre||''}\n\n${lista}`);
}

// ====== REMARKETING ======
function openRemarketing() {
  renderRemarketing();
  openModal('modal-remarketing');
}

function renderRemarketing() {
  const cont = document.getElementById('remarketing-lista');
  if (!cont) return;
  // Rechazados + confirmados con 7+ dÃ­as sin actividad
  const candidatos = [];
  dietas.forEach(d => {
    if (d.estado === 'rechazada') {
      candidatos.push({ dieta: d, razon: 'RechazÃ³ cotizaciÃ³n', dias: _diasDesde(d.fechaRechazada) });
    } else if (d.estado === 'confirmada' && d.vigente) {
      const dias = _diasDesde(d.fechaConfirmada);
      if (dias !== null && dias >= 7) candidatos.push({ dieta: d, razon: `Confirmada hace ${dias} dÃ­as`, dias });
    }
  });
  candidatos.sort((a,b)=>(b.dias||0)-(a.dias||0));
  if (!candidatos.length) {
    cont.innerHTML = '<div class="empty"><div class="empty-icon">âœ…</div><div class="empty-title">Nada por ahora</div><div class="empty-text">No hay clientes pendientes de seguimiento</div></div>';
    return;
  }
  cont.innerHTML = `<div style="font-size:11px;font-weight:600;color:var(--text3);margin-bottom:8px">${candidatos.length} CLIENTE(S) PARA CONTACTAR</div>` +
    candidatos.map(c => {
      const cli = clientes.find(x => x.id === c.dieta.clienteId);
      const tel = cli?.tel || '';
      const tieneTel = tel.replace(/\D/g,'').length >= 10;
      return `
      <div class="flex justify-between items-center" style="padding:10px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px">
        <div>
          <div style="font-size:13px;font-weight:600">${c.dieta.clienteNombre}</div>
          <div style="font-size:11px;color:var(--text3)">${c.razon}${tieneTel?'':' Â· âš  sin telÃ©fono'}</div>
        </div>
        ${tieneTel
          ? `<button class="btn btn-primary btn-sm" onclick="enviarWhatsappRemarketing('${c.dieta.clienteId}')">ðŸ“² WhatsApp</button>`
          : `<span class="badge badge-gray" style="font-size:10px">Sin tel.</span>`}
      </div>`;
    }).join('');
}

function enviarWhatsappRemarketing(clienteId) {
  const cli = clientes.find(c => c.id === clienteId);
  if (!cli) return;
  let tel = (cli.tel||'').replace(/\D/g,'');
  if (tel.length === 10) tel = '521' + tel; // MÃ©xico
  else if (tel.length === 12 && tel.startsWith('52')) tel = '521' + tel.slice(2);
  const plantilla = document.getElementById('remarketing-mensaje').value || '';
  const mensaje = plantilla.replace(/\[Nombre\]/g, cli.nombre.split(' ')[0]);
  const url = `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');
}

function openNuevaDieta() {
  document.getElementById('dieta-edit-id').value = '';
  document.getElementById('modal-dieta-titulo').textContent = 'Nueva cotizaciÃ³n de dieta';
  const sel = document.getElementById('dieta-cliente');
  sel.innerHTML = '<option value="">Seleccionar cliente...</option>' +
    clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
  document.getElementById('dieta-nombre').value = '';
  document.getElementById('dieta-instrucciones').value = '';
  document.getElementById('dieta-pdf-label').textContent = 'ðŸ“„ Haz clic para subir el PDF que mandÃ³ el cliente';
  document.getElementById('dieta-pdf-input').value = '';
  window._dietaPDF = null;
  openModal('modal-dieta');
}

function cargarPDFDieta(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    window._dietaPDF = { nombre: file.name, dataUrl: e.target.result };
    document.getElementById('dieta-pdf-label').innerHTML = `âœ… <strong>${file.name}</strong> cargado`;
  };
  reader.readAsDataURL(file);
}

function guardarDieta() {
  const clienteId = document.getElementById('dieta-cliente').value;
  if (!clienteId) { toast('Selecciona un cliente', 'error'); return; }
  const clienteObj = clientes.find(c => c.id === clienteId);
  const editId = document.getElementById('dieta-edit-id').value;

  if (editId) {
    const d = dietas.find(x => x.id === editId);
    if (d) {
      d.clienteId = clienteId;
      d.clienteNombre = clienteObj ? clienteObj.nombre : 'Sin cliente';
      d.nombre = document.getElementById('dieta-nombre').value.trim();
      d.instrucciones = document.getElementById('dieta-instrucciones').value;
      if (window._dietaPDF) d.pdfRef = window._dietaPDF;
    }
  } else {
    const d = {
      id: uid(),
      clienteId,
      clienteNombre: clienteObj ? clienteObj.nombre : 'Sin cliente',
      nombre: document.getElementById('dieta-nombre').value.trim(),
      instrucciones: document.getElementById('dieta-instrucciones').value,
      pdfRef: window._dietaPDF || null,
      estado: 'recibida',
      fechaRecibida: hoy(),
      vigente: false,
      esHistorica: false,
      cotizacion: null,
    };
    dietas.push(d);
  }
  save();
  closeModal('modal-dieta');
  toast('CotizaciÃ³n guardada');
  renderDietas();
}

// ---- CotizaciÃ³n ----
let cotizacionDietaId = null;
let platillosCotizacion = [];

function openCotizacion(dietaId) {
  cotizacionDietaId = dietaId;
  const d = dietas.find(x => x.id === dietaId);
  if (!d) return;
  document.getElementById('cotizacion-titulo').textContent = `CotizaciÃ³n â€” ${d.nombre} (${d.clienteNombre})`;
  // Cargar cotizaciÃ³n existente o vacÃ­a
  platillosCotizacion = d.cotizacion?.platillos ? JSON.parse(JSON.stringify(d.cotizacion.platillos)) : [];
  document.getElementById('cotizacion-notas').value = d.cotizacion?.notas || '';
  // Restaurar mÃ¡rgenes guardados
  const mDiaEl = document.getElementById('cot-margen-dia-val');
  const mSemEl = document.getElementById('cot-margen-sem-val');
  const mMesEl = document.getElementById('cot-margen-mes-val');
  if (mDiaEl) mDiaEl.value = d.cotizacion?.margen ?? 50;
  if (mSemEl) mSemEl.value = d.cotizacion?.margenSem ?? 40;
  if (mMesEl) mMesEl.value = d.cotizacion?.margenMes ?? 30;
  renderPlatillosCotizacion();
  recalcularCotizacion();
  openModal('modal-cotizacion');
}

const TIEMPOS_COMIDA = ['Desayuno', 'ColaciÃ³n AM', 'Comida', 'ColaciÃ³n PM', 'Cena', 'Cena ligera', 'Otro'];

function agregarPlatilloCotizacion() {
  platillosCotizacion.push({ nombre: '', tiempo: 'Desayuno', ingIds: [], costo: 0, notas: '' });
  renderPlatillosCotizacion();
}

function renderPlatillosCotizacion() {
  const cont = document.getElementById('cotizacion-platillos-lista');
  if (platillosCotizacion.length === 0) {
    cont.innerHTML = '<div style="padding:14px;text-align:center;font-size:12px;color:var(--text3)">Agrega los platillos del plan del cliente</div>';
    recalcularCotizacion();
    return;
  }
  cont.innerHTML = platillosCotizacion.map((p, idx) => {
    const sel = p.seleccionado !== false; // default true
    const costoPlat = p.costo || 0;
    return `
    <div style="border-top:1px solid var(--border);padding:8px 10px;${sel?'':'opacity:0.45'}">
      <div style="display:grid;grid-template-columns:28px 1fr 100px 70px 36px;gap:6px;align-items:center;margin-bottom:6px">
        <input type="checkbox" ${sel?'checked':''} onchange="_cotToggleSel(${idx},this.checked)"
               style="width:16px;height:16px;accent-color:var(--green);cursor:pointer">
        <input class="form-input" style="font-size:12px;padding:5px 8px" placeholder="Nombre del platillo"
               value="${p.nombre}" onchange="actualizarPlatilloCot(${idx},'nombre',this.value)">
        <select class="form-input" style="font-size:12px;padding:5px 8px"
                onchange="actualizarPlatilloCot(${idx},'tiempo',this.value)">
          ${TIEMPOS_COMIDA.map(t=>`<option ${t===p.tiempo?'selected':''}>${t}</option>`).join('')}
        </select>
        <span style="font-size:12px;color:var(--red);text-align:right;font-family:'DM Mono',monospace">${fmt(costoPlat)}</span>
        <button onclick="eliminarPlatilloCot(${idx})" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:16px">Ã—</button>
      </div>
      <!-- Ingredientes del platillo -->
      <div style="padding-left:34px">
        <div style="display:grid;grid-template-columns:1fr 80px 36px;gap:4px;margin-bottom:4px">
          ${(p.lineas||[]).map((l,li)=>`
            <select class="form-input" style="font-size:11px;padding:4px 6px"
                    onchange="actualizarLineaCot(${idx},${li},'ingId',this.value)">
              <option value="">Ingrediente...</option>
              ${inventario.map(i=>`<option value="${i.id}" ${i.id===l.ingId?'selected':''}>${i.nombre} (${i.unidad})</option>`).join('')}
            </select>
            <input type="number" class="form-input" style="font-size:11px;padding:4px 6px" placeholder="cant"
                   value="${l.cantidad||''}" onchange="actualizarLineaCot(${idx},${li},'cantidad',parseFloat(this.value)||0)">
            <button onclick="eliminarLineaCot(${idx},${li})" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:14px">Ã—</button>
          `).join('')}
        </div>
        <button onclick="agregarLineaCot(${idx})" class="btn btn-secondary btn-sm" style="font-size:11px;padding:3px 8px">+ ingrediente</button>
      </div>
    </div>`;
  }).join('');
  recalcularCotizacion();
}

function actualizarPlatilloCot(idx, campo, valor) {
  platillosCotizacion[idx][campo] = valor;
  if (campo !== 'nombre' && campo !== 'tiempo') recalcularCotizacion();
}

function eliminarPlatilloCot(idx) {
  platillosCotizacion.splice(idx,1);
  renderPlatillosCotizacion();
}

function agregarLineaCot(idx) {
  if (!platillosCotizacion[idx].lineas) platillosCotizacion[idx].lineas = [];
  platillosCotizacion[idx].lineas.push({ ingId:'', cantidad:0 });
  renderPlatillosCotizacion();
}

function actualizarLineaCot(platIdx, lineaIdx, campo, valor) {
  platillosCotizacion[platIdx].lineas[lineaIdx][campo] = valor;
  // Recalcular costo del platillo
  const lineas = platillosCotizacion[platIdx].lineas || [];
  platillosCotizacion[platIdx].costo = lineas.reduce((s,l)=>{
    const ing = inventario.find(i=>i.id===l.ingId);
    return s + (ing ? ing.costo*(l.cantidad||0) : 0);
  }, 0);
  recalcularCotizacion();
  // Actualizar solo el costo del platillo sin re-render completo
  const costoEls = document.querySelectorAll('#cotizacion-platillos-lista > div span.font-mono');
  if (costoEls[platIdx]) costoEls[platIdx].textContent = fmt(platillosCotizacion[platIdx].costo);
}

function eliminarLineaCot(platIdx, lineaIdx) {
  platillosCotizacion[platIdx].lineas.splice(lineaIdx,1);
  platillosCotizacion[platIdx].costo = (platillosCotizacion[platIdx].lineas||[]).reduce((s,l)=>{
    const ing = inventario.find(i=>i.id===l.ingId);
    return s + (ing ? ing.costo*(l.cantidad||0) : 0);
  }, 0);
  renderPlatillosCotizacion();
}

function recalcularCotizacion() {
  const mDia = parseFloat(document.getElementById('cot-margen-dia-val')?.value) || 60;
  const mSem = parseFloat(document.getElementById('cot-margen-sem-val')?.value) || 50;
  const mMes = parseFloat(document.getElementById('cot-margen-mes-val')?.value) || 45;

  // Asegurar que cada platillo tenga sus precios unitarios (con redondeo manual preservado)
  platillosCotizacion.forEach(p => {
    const costo = p.costo || 0;
    // Si el usuario no ha redondeado manualmente, recalcular del margen
    if (!p._editDia) p.precioDia = Math.round(costo * (1 + mDia/100) * 100) / 100;
    if (!p._editSem) p.precioSem = Math.round(costo * (1 + mSem/100) * 100) / 100;
    if (!p._editMes) p.precioMes = Math.round(costo * (1 + mMes/100) * 100) / 100;
  });

  renderTablaPreciosCot();

  // Totales (suma de seleccionados) para compatibilidad y guardado
  const sel = platillosCotizacion.filter(p => p.seleccionado !== false);
  const totDia = sel.reduce((s,p)=>s+(p.precioDia||0),0);
  const totSem = sel.reduce((s,p)=>s+(p.precioSem||0),0);
  const totMes = sel.reduce((s,p)=>s+(p.precioMes||0),0);
  const costoSel = sel.reduce((s,p)=>s+(p.costo||0),0);
  const setHid = (id,v) => { const el=document.getElementById(id); if(el) el.value=(v||0).toFixed(2); };
  setHid('cot-costo-sel', costoSel);
  setHid('cot-total-dia', totDia);
  setHid('cot-total-semana', totSem);
  setHid('cot-total-mes', totMes);
  setHid('cot-precio-dia', totDia);
  setHid('cot-precio-semana', totSem);
  setHid('cot-precio-mes', totMes);
  const mEl = document.getElementById('cotizacion-margen'); if(mEl) mEl.value = mDia;
}

function renderTablaPreciosCot() {
  const cont = document.getElementById('cot-tabla-precios');
  if (!cont) return;
  if (!platillosCotizacion.length) {
    cont.innerHTML = '<div style="padding:14px;text-align:center;font-size:12px;color:var(--text3)">Agrega platillos para ver los precios</div>';
    return;
  }
  cont.innerHTML = platillosCotizacion.map((p, idx) => {
    const sel = p.seleccionado !== false;
    return `
    <div style="display:grid;grid-template-columns:1.4fr 70px 1fr 1fr 1fr;padding:7px 10px;border-top:1px solid var(--border);align-items:center;gap:6px;${sel?'':'opacity:0.45'}">
      <span style="font-size:12px;font-weight:500">${p.nombre||'â€”'}<div style="font-size:10px;color:var(--text3)">${p.tiempo||''}</div></span>
      <span style="font-size:12px;color:var(--red);text-align:right;font-family:'DM Mono',monospace">${fmt(p.costo||0)}</span>
      <input type="number" class="form-input" style="font-size:12px;padding:4px 5px;text-align:center;font-family:'DM Mono',monospace"
             value="${(p.precioDia||0).toFixed(2)}" min="0" step="0.5"
             oninput="_cotEditarPrecio(${idx},'Dia',parseFloat(this.value)||0)" title="Precio diario (editable)">
      <input type="number" class="form-input" style="font-size:12px;padding:4px 5px;text-align:center;font-family:'DM Mono',monospace;color:var(--green);border-color:rgba(46,204,113,0.3)"
             value="${(p.precioSem||0).toFixed(2)}" min="0" step="0.5"
             oninput="_cotEditarPrecio(${idx},'Sem',parseFloat(this.value)||0)" title="Precio semanal (editable)">
      <input type="number" class="form-input" style="font-size:12px;padding:4px 5px;text-align:center;font-family:'DM Mono',monospace"
             value="${(p.precioMes||0).toFixed(2)}" min="0" step="0.5"
             oninput="_cotEditarPrecio(${idx},'Mes',parseFloat(this.value)||0)" title="Precio mensual (editable)">
    </div>`;
  }).join('');
}

function _cotEditarPrecio(idx, plan, valor) {
  // Marca el precio como editado manualmente para no sobreescribirlo al recalcular
  platillosCotizacion[idx]['precio'+plan] = valor;
  platillosCotizacion[idx]['_edit'+plan] = true;
  // Recalcular solo totales ocultos, sin re-render (para no perder foco del input)
  const sel = platillosCotizacion.filter(p => p.seleccionado !== false);
  const setHid = (id,v) => { const el=document.getElementById(id); if(el) el.value=(v||0).toFixed(2); };
  setHid('cot-total-dia', sel.reduce((s,p)=>s+(p.precioDia||0),0));
  setHid('cot-total-semana', sel.reduce((s,p)=>s+(p.precioSem||0),0));
  setHid('cot-total-mes', sel.reduce((s,p)=>s+(p.precioMes||0),0));
}

function renderResumenPrecios() { recalcularCotizacion(); } // alias

function _cotToggleSel(idx, checked) {
  platillosCotizacion[idx].seleccionado = checked;
  // Actualizar visualmente sin re-render completo
  const rows = document.querySelectorAll('#cotizacion-platillos-lista > div');
  if (rows[idx]) rows[idx].style.opacity = checked ? '1' : '0.45';
  recalcularCotizacion();
}

function _cotSeleccionarTodos(val) {
  platillosCotizacion.forEach(p => p.seleccionado = val);
  renderPlatillosCotizacion();
}

function _cotCambiarMargen(idx, margen) {
  platillosCotizacion[idx].margen = margen;
  recalcularCotizacion();
}

function _cotCambiarPrecio(idx, precio) {
  platillosCotizacion[idx].precioVenta = precio;
  recalcularCotizacion();
}

function ajustarPreciosCotManual(campo) { /* legacy - no-op */ }

function guardarCotizacion() {
  const d = dietas.find(x => x.id === cotizacionDietaId);
  if (!d) return;
  recalcularCotizacion(); // asegura precios actualizados
  const mDia = parseFloat(document.getElementById('cot-margen-dia-val')?.value) || 60;
  const mSem = parseFloat(document.getElementById('cot-margen-sem-val')?.value) || 50;
  const mMes = parseFloat(document.getElementById('cot-margen-mes-val')?.value) || 45;
  const sel = platillosCotizacion.filter(p => p.seleccionado !== false);
  const costoSel = sel.reduce((s,p) => s+(p.costo||0), 0);
  // Totales = suma de precios unitarios de platillos seleccionados
  const totDia = sel.reduce((s,p)=>s+(p.precioDia||0),0);
  const totSem = sel.reduce((s,p)=>s+(p.precioSem||0),0);
  const totMes = sel.reduce((s,p)=>s+(p.precioMes||0),0);
  d.cotizacion = {
    platillos: platillosCotizacion,
    margen: mDia, margenSem: mSem, margenMes: mMes,
    costoSel,
    preciodia: totDia,
    preciosemana: totSem,
    preciomes: totMes,
    notas: document.getElementById('cotizacion-notas').value,
    fecha: hoy(),
  };
  save();
  if (d.estado === 'recibida' || d.estado === 'rechazada') {
    d.estado = 'cotizada';
    d.fechaCotizada = hoy();
    save();
  }
  closeModal('modal-cotizacion');
  toast(`CotizaciÃ³n guardada â€” ${sel.length} platillo(s)`);
  renderDietas();
}

function generarImagenCotizacion() {
  const d = dietas.find(x => x.id === cotizacionDietaId);
  if (!d) return;
  const margen = parseFloat(document.getElementById('cotizacion-margen').value) || 40;
  const costoDia = platillosCotizacion.reduce((s,p)=>s+p.costo,0);
  const factor = 1 + margen/100;
  const pdia = costoDia * factor;
  const psemana = pdia * 7;
  const pmes = pdia * 30;
  const notas = document.getElementById('cotizacion-notas').value;

  const W = 800, H = 1000;
  const canvas = document.getElementById('canvas-cotizacion');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Fondo degradado claro de marca
  const grad = ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0, '#FFFFFF');
  grad.addColorStop(1, '#F2F2F7');
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,W,H);

  // PatrÃ³n de puntos sutil
  ctx.fillStyle = 'rgba(46,204,113,0.03)';
  for(let x=0;x<W;x+=30) for(let y=0;y<H;y+=30) { ctx.beginPath(); ctx.arc(x,y,1,0,Math.PI*2); ctx.fill(); }

  // Header verde
  const hgrad = ctx.createLinearGradient(0,0,W,120);
  hgrad.addColorStop(0,'#2ECC71'); hgrad.addColorStop(1,'#27AE60');
  ctx.fillStyle = hgrad;
  roundRect(ctx,0,0,W,130,0); ctx.fill();

  // Logo emoji + nombre
  ctx.font = 'bold 36px serif'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left';
  ctx.fillText('ðŸ¥—', 36, 75);
  ctx.font = 'bold 32px system-ui, sans-serif'; ctx.fillStyle = '#ffffff';
  ctx.fillText('Fit&Go', 90, 72);
  ctx.font = '14px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('Cocina saludable Â· MÃ©rida', 90, 96);
  ctx.font = 'bold 14px system-ui, sans-serif'; ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'right';
  ctx.fillText('COTIZACIÃ“N', W-36, 60);
  ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText(new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'long',year:'numeric'}), W-36, 82);
  ctx.textAlign = 'left';

  // Cliente y plan
  ctx.font = 'bold 22px system-ui, sans-serif'; ctx.fillStyle = '#1C1C1E';
  ctx.fillText(d.clienteNombre, 36, 175);
  ctx.font = '15px system-ui, sans-serif'; ctx.fillStyle = '#27AE60';
  ctx.fillText(d.nombre, 36, 200);

  // Separador
  ctx.fillStyle = 'rgba(46,204,113,0.2)'; ctx.fillRect(36,215,W-72,1);

  // Platillos
  ctx.font = 'bold 13px system-ui, sans-serif'; ctx.fillStyle = 'rgba(28,28,30,0.55)';
  ctx.fillText('PLAN DIARIO', 36, 244);
  let y = 268;
  const platillosMostrar = platillosCotizacion.filter(p=>p.nombre).slice(0,6);
  platillosMostrar.forEach(p => {
    // Punto verde
    ctx.fillStyle = '#2ECC71'; ctx.beginPath(); ctx.arc(44, y-4, 4, 0, Math.PI*2); ctx.fill();
    ctx.font = '15px system-ui, sans-serif'; ctx.fillStyle = '#1C1C1E';
    ctx.fillText(p.nombre, 60, y);
    ctx.font = '13px system-ui, sans-serif'; ctx.fillStyle = 'rgba(28,28,30,0.45)';
    ctx.textAlign = 'right'; ctx.fillText(p.tiempo, W-36, y); ctx.textAlign = 'left';
    y += 32;
  });
  if (platillosCotizacion.filter(p=>p.nombre).length > 6) {
    ctx.font = '13px system-ui, sans-serif'; ctx.fillStyle = 'rgba(28,28,30,0.35)';
    ctx.fillText(`+ ${platillosCotizacion.filter(p=>p.nombre).length - 6} platillos mÃ¡s...`, 60, y); y+=28;
  }

  y = Math.max(y + 20, 480);

  // Separador
  ctx.fillStyle = 'rgba(46,204,113,0.2)'; ctx.fillRect(36,y,W-72,1); y+=24;

  // Restricciones si hay
  if (d.restricciones?.length) {
    ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = 'rgba(28,28,30,0.45)';
    ctx.fillText('Sin: ' + d.restricciones.join(' Â· '), 36, y); y+=30;
  }

  // Precios â€” 3 cards
  const cardW = (W-72-24)/3, cardH = 110, cardY = y+10;
  const cards = [
    { label:'Diario', precio:pdia, sub:'por dÃ­a', color:'rgba(46,204,113,0.15)', border:'rgba(46,204,113,0.3)' },
    { label:'Semanal â­', precio:psemana, sub:'7 dÃ­as', color:'rgba(46,204,113,0.25)', border:'rgba(46,204,113,0.6)' },
    { label:'Mensual', precio:pmes, sub:'30 dÃ­as', color:'rgba(46,204,113,0.15)', border:'rgba(46,204,113,0.3)' },
  ];
  cards.forEach((c,i) => {
    const cx = 36 + i*(cardW+12);
    ctx.strokeStyle = c.border; ctx.lineWidth = 1.5;
    ctx.fillStyle = c.color;
    roundRect(ctx,cx,cardY,cardW,cardH,10); ctx.fill();
    roundRect(ctx,cx,cardY,cardW,cardH,10); ctx.stroke();
    ctx.font = 'bold 12px system-ui, sans-serif'; ctx.fillStyle = 'rgba(28,28,30,0.55)'; ctx.textAlign='center';
    ctx.fillText(c.label.toUpperCase(), cx+cardW/2, cardY+22);
    ctx.font = 'bold 28px system-ui, sans-serif'; ctx.fillStyle = '#27AE60';
    ctx.fillText(fmt(c.precio), cx+cardW/2, cardY+60);
    ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = 'rgba(28,28,30,0.45)';
    ctx.fillText(c.sub, cx+cardW/2, cardY+82);
    ctx.textAlign='left';
  });

  y = cardY + cardH + 30;

  // Notas
  if (notas) {
    ctx.fillStyle = 'rgba(28,28,30,0.05)';
    roundRect(ctx,36,y,W-72,60,8); ctx.fill();
    ctx.font = '13px system-ui, sans-serif'; ctx.fillStyle = 'rgba(28,28,30,0.55)';
    ctx.fillText('ðŸ“ ' + notas.substring(0,90)+(notas.length>90?'â€¦':''), 50, y+22);
    y+=70;
  }

  // Footer
  ctx.fillStyle = 'rgba(46,204,113,0.08)'; ctx.fillRect(0,H-60,W,60);
  ctx.font = '13px system-ui, sans-serif'; ctx.fillStyle = 'rgba(28,28,30,0.35)'; ctx.textAlign='center';
  ctx.fillText('CotizaciÃ³n vÃ¡lida por 7 dÃ­as Â· Fit&Go MÃ©rida', W/2, H-32);
  ctx.fillStyle = '#27AE60'; ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('fitandgo.mx', W/2, H-14);
  ctx.textAlign='left';

  openModal('modal-imagen-cotizacion');
}

function roundRect(ctx,x,y,w,h,r) {
  ctx.beginPath(); ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r);
  ctx.closePath();
}

function descargarImagenCotizacion() {
  const d = dietas.find(x=>x.id===cotizacionDietaId);
  const canvas = document.getElementById('canvas-cotizacion');
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `cotizacion_${d?.clienteNombre?.replace(/\s+/g,'_')||'fitgo'}_${hoy()}.png`;
  a.click();
  toast('Imagen descargada âœ…');
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
    const presCnt = (presentaciones||[]).filter(p => p.ingId === i.id).length;
    const presDefault = (presentaciones||[]).find(p => p.ingId === i.id && p.esDefault);
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
            ? `<span class="badge badge-amber" style="cursor:pointer" title="${presDefault?presDefault.nombre:''}" onclick="openNuevaPresentacion('${i.id}')">${presCnt} present.</span>`
            : `<button class="btn btn-secondary btn-sm" onclick="openNuevaPresentacion('${i.id}')">+ Agregar</button>`}
        </td>
        <td>
          <div class="flex gap-6">
            <button class="btn btn-danger btn-sm" onclick="eliminarIngrediente('${i.id}')">ðŸ—‘</button>
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
  ['ing-nombre','ing-stock','ing-minimo','ing-costo'].forEach(id => document.getElementById(id).value = '');
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
const BILLETES = [1000,500,200,100,50,20];
const MONEDAS  = [10,5,2,1,0.50];
let conteoEfectivo = {}; // { '500': 3, '100': 2, ... }

// Estado de caja: guardado por dÃ­a
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
      <div style="font-size:${esBillete?'18':'15'}px;font-weight:700;color:${esBillete?'var(--green)':'var(--amber)'};margin-bottom:6px">
        ${val >= 1 ? '$'+val : val*100+'Â¢'}
      </div>
      <div class="num-input" style="justify-content:center">
        <button class="num-btn" onclick="cambiarConteo('${key}',-1)">âˆ’</button>
        <span class="num-val" id="cnt-${key.replace('.','_')}">${cnt}</span>
        <button class="num-btn" onclick="cambiarConteo('${key}',1)">+</button>
      </div>
      <div style="font-size:10px;color:var(--text3);margin-top:5px" id="sub-${key.replace('.','_')}">${fmt(val * cnt)}</div>
    </div>`;
  };
  document.getElementById('grid-billetes').innerHTML = BILLETES.map(v => makeCell(v,'billete')).join('');
  document.getElementById('grid-monedas').innerHTML = MONEDAS.map(v => makeCell(v,'moneda')).join('');
  calcularTotalApertura();
}

function cambiarConteo(key, delta) {
  conteoEfectivo[key] = Math.max(0, (conteoEfectivo[key] || 0) + delta);
  const safeKey = key.replace('.','_');
  const el = document.getElementById('cnt-'+safeKey);
  const sub = document.getElementById('sub-'+safeKey);
  if (el) el.textContent = conteoEfectivo[key];
  if (sub) sub.textContent = fmt(parseFloat(key) * conteoEfectivo[key]);
  calcularTotalApertura();
}

function calcularTotalApertura() {
  const total = Object.entries(conteoEfectivo).reduce((s,[k,v]) => s + parseFloat(k)*v, 0);
  document.getElementById('apertura-total-display').textContent = fmt(total);
  return total;
}

function confirmarApertura() {
  const saldo = calcularTotalApertura();
  const estado = getCajaHoy();
  estado.abierta = true;
  estado.saldoInicial = saldo;
  estado.horaApertura = hora();
  estado.conteoInicial = {...conteoEfectivo};
  setCajaHoy(estado);
  closeModal('modal-apertura-caja');
  toast(`âœ… Caja abierta con saldo inicial de ${fmt(saldo)}`);
  renderCaja();
}

// ---------- CIERRE ----------
function openCierreCaja() {
  const hoyStr = hoy();
  const estado = getCajaHoy();
  const movHoy = getMovimientosHoy();
  const ventas = movHoy.filter(m => m.tipo === 'venta' || !m.tipo);
  const enviosGasto = movHoy.filter(m => m.tipo === 'envio_salida' || m.tipo === 'envio_gratis');
  const efectivoCobrado = ventas.filter(m => m.metodo === 'Efectivo').reduce((s,m)=>s+m.monto,0);
  const digitalCobrado = ventas.filter(m => m.metodo !== 'Efectivo').reduce((s,m)=>s+m.monto,0);
  const totalEnvios = enviosGasto.reduce((s,m)=>s+m.monto,0);
  const totalVentas = ventas.reduce((s,m)=>s+m.monto,0);

  const saldoEfectivoFinal = estado.saldoInicial + efectivoCobrado - totalEnvios;
  const saldoFinalTotal = totalVentas - totalEnvios;

  document.getElementById('cierre-caja-body').innerHTML = `
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:12px;color:var(--text3)">${new Date().toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'})}</div>
      <div style="font-size:11px;color:var(--text3)">Apertura: ${estado.horaApertura || 'â€”'} Â· Cierre: ${hora()}</div>
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
      <div class="card card-sm" style="text-align:center;border-color:rgba(255,122,0,0.2)">
        <div style="font-size:11px;color:var(--text3)">Digital (transf/tarjeta)</div>
        <div style="font-size:20px;font-weight:700;margin-top:2px;font-family:'DM Mono',monospace;color:var(--blue)">${fmt(digitalCobrado)}</div>
      </div>
      <div class="card card-sm" style="text-align:center;border-color:rgba(231,76,60,0.2)">
        <div style="font-size:11px;color:var(--text3)">Gasto de envÃ­os (salida)</div>
        <div style="font-size:20px;font-weight:700;margin-top:2px;font-family:'DM Mono',monospace;color:var(--red)">âˆ’${fmt(totalEnvios)}</div>
      </div>
      <div class="card card-sm" style="text-align:center;border-color:rgba(46,204,113,0.25);background:var(--green-dim)">
        <div style="font-size:11px;color:var(--text3)">ðŸ’µ Efectivo fÃ­sico en caja</div>
        <div style="font-size:22px;font-weight:700;margin-top:2px;font-family:'DM Mono',monospace;color:var(--green)">${fmt(saldoEfectivoFinal)}</div>
        <div style="font-size:10px;color:var(--text3);margin-top:2px">Inicial + efectivo cobrado âˆ’ envÃ­os</div>
      </div>
    </div>

    ${enviosGasto.length > 0 ? `
    <div style="font-size:12px;font-weight:600;color:var(--text3);margin-bottom:8px">DETALLE DE GASTOS DE ENVÃO</div>
    <div style="border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden;margin-bottom:12px">
      ${enviosGasto.map(m=>`
        <div class="flex justify-between" style="padding:7px 12px;border-bottom:1px solid var(--border);font-size:12px">
          <span>${m.cliente} <span class="badge ${m.tipo==='envio_gratis'?'badge-amber':'badge-red'}" style="font-size:10px">${m.tipo==='envio_gratis'?'Gratis (absorbido)':'Pagado repartidor'}</span></span>
          <span class="font-mono highlight-red">âˆ’${fmt(m.monto)}</span>
        </div>`).join('')}
    </div>` : ''}

    <div class="card card-sm" style="background:var(--bg3);margin-bottom:0">
      <div style="font-size:12px;color:var(--text2)">ðŸ’¡ Al confirmar el cierre, el dÃ­a quedarÃ¡ bloqueado. Los envÃ­os gratuitos/absorbidos ya quedaron registrados como <strong>gasto de venta</strong> en el estado de resultados desde que se entregÃ³ cada pedido.</div>
    </div>`;

  openModal('modal-cierre-caja');
}

function confirmarCierre() {
  const estado = getCajaHoy();
  estado.cerrada = true;
  estado.horaCierre = hora();
  setCajaHoy(estado);

  // Nota: los envÃ­os gratis/absorbidos NO se registran aquÃ­. Ya se registran una sola vez
  // como gasto (categorÃ­a 'Gastos de Venta') en _registrarFinancierosPedido() al momento
  // de marcar el pedido como "Entregado". Hacerlo tambiÃ©n aquÃ­ duplicaba el gasto cada
  // vez que se cerraba caja (el candado _movCajaRef nunca coincidÃ­a con ese registro).
  save();
  closeModal('modal-cierre-caja');
  toast('âœ… Turno cerrado');
  renderCaja();
}

// ===== FECHA DE CAJA (dÃ­a que se estÃ¡ viendo) =====
let _fechaCaja = null; // null = hoy
function getFechaCaja() { return _fechaCaja || hoy(); }
function cambiarFechaCaja(fecha) {
  _fechaCaja = fecha || null;
  const inp = document.getElementById('caja-fecha-sel');
  if (inp) inp.value = getFechaCaja();
  renderCaja();
}

function getMovimientosHoy() {
  const ref = getFechaCaja();
  return movCaja.filter(m => {
    // Cobros de CxC y abonos: filtrar por su propia fecha
    if (m.tipo === 'cobro_cxc') return (m.fecha || ref) === ref;
    // Movimientos con fecha propia (registrados al entregar): usar esa fecha
    if (m.fecha) return m.fecha === ref;
    // Compatibilidad: movimientos viejos sin fecha propia â†’ usar fecha del pedido
    const p = pedidos.find(x => x.id === m.pedidoId);
    return p && p.fecha === ref;
  });
}

let _tipoMovExtra = 'gasto';
function _setTipoMovExtra(tipo) {
  _tipoMovExtra = tipo;
  ['gasto','retiro','entrada'].forEach(t => {
    const chip = document.getElementById('chip-mov-'+t);
    if (chip) chip.classList.toggle('active', t === tipo);
  });
  // La categorÃ­a solo aplica a gastos y retiros (que van al ER); entrada no necesita categorÃ­a de gasto
  const catWrap = document.getElementById('mov-extra-cat-wrap');
  if (catWrap) catWrap.style.display = (tipo === 'entrada') ? 'none' : 'block';
}

function openMovimientoExtra() {
  _setTipoMovExtra('gasto');
  document.getElementById('mov-extra-concepto').value = '';
  document.getElementById('mov-extra-monto').value = '';
  document.getElementById('mov-extra-metodo').value = 'Efectivo';
  document.getElementById('mov-extra-categoria').value = 'Gastos Administrativos';
  openModal('modal-movimiento-extra');
}

function guardarMovimientoExtra() {
  const concepto = document.getElementById('mov-extra-concepto').value.trim();
  const monto = parseFloat(document.getElementById('mov-extra-monto').value) || 0;
  const metodo = document.getElementById('mov-extra-metodo').value;
  const categoria = document.getElementById('mov-extra-categoria').value;
  if (!concepto) { toast('Ingresa un concepto', 'error'); return; }
  if (monto <= 0) { toast('Ingresa un monto vÃ¡lido', 'error'); return; }

  const esEntrada = _tipoMovExtra === 'entrada';
  const tipoMov = esEntrada ? 'mov_extra_entrada' : 'mov_extra_salida';
  const etiqueta = _tipoMovExtra === 'gasto' ? 'ðŸ’¸ Gasto' : _tipoMovExtra === 'retiro' ? 'ðŸ§ Retiro' : 'ðŸ’µ Entrada';

  // Registrar en caja/movimientos
  movCaja.push({
    hora: hora(), fecha: hoy(), pedidoId: '',
    cliente: concepto, metodo, monto,
    tipo: tipoMov,
    estado: etiqueta,
    concepto,
    esExtra: true,
  });

  // Gastos y retiros van al Estado de Resultados como gasto operativo/administrativo
  if (!esEntrada) {
    gastos.push({
      id: uid(), concepto: `${_tipoMovExtra === 'retiro' ? 'Retiro' : 'Gasto'}: ${concepto}`,
      categoria: categoria || 'Gastos Administrativos',
      monto, fecha: hoy(), recurrente: 'no',
      notas: `Movimiento extra de caja (${_tipoMovExtra})`,
      metodoPago: metodo,
    });
  }

  save();
  closeModal('modal-movimiento-extra');
  toast(`${etiqueta} de ${fmt(monto)} registrado`);
  renderCaja();
  if (document.getElementById('page-bancos')) renderBancos();
}

function renderCaja() {
  const hoyStr = hoy();
  // Inicializar el selector de fecha si estÃ¡ vacÃ­o
  const fechaInp = document.getElementById('caja-fecha-sel');
  if (fechaInp && !fechaInp.value) fechaInp.value = getFechaCaja();
  const estado = getCajaHoy();
  const movHoy = getMovimientosHoy();
  // Caja del dÃ­a: SOLO movimientos en efectivo (las transferencias no entran a caja fÃ­sica)
  // Las ventas solo cuentan cuando el pedido estÃ¡ ENTREGADO
  const ventasTodas = movHoy.filter(m => {
    if (m.tipo === 'cobro_cxc') return true; // cobros de CxC siempre cuentan
    if (m.tipo === 'venta' || !m.tipo) {
      const p = pedidos.find(x => x.id === m.pedidoId);
      return p && p.estado === 'Entregado';
    }
    return false;
  });
  const ventas = ventasTodas.filter(m => m.metodo === 'Efectivo');
  const enviosGasto = movHoy.filter(m => (m.tipo === 'envio_salida' || m.tipo === 'envio_gratis' || m.tipo === 'envio_absorbido') && (m.metodo === 'Efectivo' || !m.metodo));
  const totalVentas = ventas.reduce((s,m) => s + m.monto, 0);
  // Todas las salidas de envÃ­o restan de caja fÃ­sica: pagar repartidor, envÃ­o gratis, y tarifa absorbida
  const enviosQueRestan = enviosGasto.filter(m => m.tipo === 'envio_salida' || m.tipo === 'envio_gratis' || m.tipo === 'envio_absorbido');
  const totalEnvios = enviosQueRestan.reduce((s,m) => s + m.monto, 0);
  const efectivoCobrado = ventas.reduce((s,m)=>s+m.monto,0);
  // Movimientos extraordinarios en efectivo (gastos/retiros restan, entradas suman)
  const movExtraEfectivo = movHoy.filter(m => (m.tipo === 'mov_extra_salida' || m.tipo === 'mov_extra_entrada') && m.metodo === 'Efectivo');
  const extraSalidas = movExtraEfectivo.filter(m => m.tipo === 'mov_extra_salida').reduce((s,m)=>s+m.monto,0);
  const extraEntradas = movExtraEfectivo.filter(m => m.tipo === 'mov_extra_entrada').reduce((s,m)=>s+m.monto,0);
  const digital = 0; // no se muestra en caja fÃ­sica
  const saldoEfectivoFinal = estado.saldoInicial + efectivoCobrado - totalEnvios - extraSalidas + extraEntradas;

  // BotÃ³n topbar
  const btn = document.getElementById('btn-apertura-corte');
  if (btn) {
    if (!estado.abierta) { btn.textContent = 'ðŸ”“ Abrir caja'; btn.className = 'btn btn-primary btn-sm'; }
    else if (estado.cerrada) { btn.textContent = 'ðŸ”’ Turno cerrado'; btn.className = 'btn btn-secondary btn-sm'; btn.disabled = true; }
    else { btn.textContent = 'ðŸ”’ Cerrar turno'; btn.className = 'btn btn-danger btn-sm'; btn.disabled = false; }
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
    document.getElementById('caja-hora-apertura').textContent = `Apertura: ${estado.horaApertura}${estado.cerrada ? ' Â· Cierre: '+estado.horaCierre : ''}`;
    const badge = document.getElementById('caja-estado-badge');
    if (badge) { badge.textContent = estado.cerrada ? 'ðŸ”’ Cerrada' : 'ðŸŸ¢ Abierta'; badge.className = 'badge ' + (estado.cerrada ? 'badge-red' : 'badge-green'); }
  }

  // KPIs
  document.getElementById('caja-total').textContent = fmt(totalVentas);
  document.getElementById('caja-efectivo-real').textContent = fmt(saldoEfectivoFinal);
  document.getElementById('caja-digital').textContent = fmt(digital);
  document.getElementById('caja-envios-total').textContent = fmt(totalEnvios);
  document.getElementById('caja-efectivo-detalle').textContent =
    `${fmt(estado.saldoInicial)} inicial + ${fmt(efectivoCobrado)} cobrado âˆ’ ${fmt(totalEnvios)} envÃ­os`;

  // Tabla de movimientos
  const tbody = document.getElementById('tabla-caja');
  const movExtraEfec = movHoy.filter(m => (m.tipo === 'mov_extra_salida' || m.tipo === 'mov_extra_entrada') && m.metodo === 'Efectivo');
  const todosMovs = [...ventas, ...enviosGasto, ...movExtraEfec].sort((a,b) => (a.hora||'').localeCompare(b.hora||''));
  tbody.innerHTML = todosMovs.map(m => {
    const p = pedidos.find(x => x.id === m.pedidoId);
    // Salida real de efectivo: pagar envÃ­o al repartidor, envÃ­o gratis, o tarifa absorbida (excedente que sale de nuestra caja)
    const esSalida = m.tipo === 'envio_salida' || m.tipo === 'envio_gratis' || m.tipo === 'envio_absorbido' || m.tipo === 'mov_extra_salida';
    const pedidoCliente = p ? p.cliente : '';
    let conceptoLabel = 'ðŸ’° Venta';
    if (m.tipo === 'envio_gratis') conceptoLabel = 'ðŸ›µ EnvÃ­o absorbido' + (pedidoCliente ? ' â€” '+pedidoCliente : '');
    else if (m.tipo === 'envio_salida') conceptoLabel = 'ðŸ›µ Pagar envÃ­o' + (pedidoCliente ? ' â€” '+pedidoCliente : '');
    else if (m.tipo === 'envio_absorbido') conceptoLabel = 'ðŸŒ§ Tarifa absorbida' + (pedidoCliente ? ' â€” '+pedidoCliente : '');
    else if (m.tipo === 'mov_extra_salida') conceptoLabel = (m.estado||'ðŸ’¸ Gasto') + ' â€” ' + (m.concepto||'');
    else if (m.tipo === 'mov_extra_entrada') conceptoLabel = 'ðŸ’µ Entrada â€” ' + (m.concepto||'');
    const badgeClass = esSalida ? 'badge-red' : 'badge-green';
    // Color del nÃºmero: rojo si sale de caja efectivo (incluye tarifa absorbida)
    const colorNum = esSalida ? 'highlight-red' : 'highlight-green';
    const signo = esSalida ? 'âˆ’' : '';
    return `<tr style="${esSalida?'background:var(--red-dim)':''}">
      <td class="font-mono text-sm">${m.hora||'â€”'}</td>
      <td class="font-mono text-xs text-dim">#${(m.pedidoId||'').slice(-4).toUpperCase()}</td>
      <td>${m.cliente||'â€”'}</td>
      <td><span class="badge badge-gray">${m.metodo||'â€”'}</span></td>
      <td><span class="badge ${badgeClass}" style="font-size:10px">${conceptoLabel}</span></td>
      <td class="${colorNum} font-mono">${signo}${fmt(m.monto)}</td>
      <td><span class="badge badge-gray" style="font-size:10px">${p?.estado||m.estado||'â€”'}</span></td>
    </tr>`;
  }).join('') || '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text3)">Sin movimientos en efectivo hoy</td></tr>';
}

function openCorteCaja() { openCierreCaja(); }
function confirmarCorte() { confirmarCierre(); }

function exportarCaja() {
  const hoyStr = hoy();
  const movHoy = getMovimientosHoy();
  const csv = ['Hora,Pedido,Cliente,MÃ©todo,Concepto,Monto,Estado'].concat(
    movHoy.map(m => { const p=pedidos.find(x=>x.id===m.pedidoId); return `${m.hora||''},#${(m.pedidoId||'').slice(-4).toUpperCase()},${m.cliente||''},${m.metodo||''},${m.tipo||'venta'},${m.monto||0},${p?.estado||''}`;})
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
  const catEmoji = { 'Carnes y proteÃ­nas':'ðŸ¥©','Verduras y frutas':'ðŸ¥¦','Granos y cereales':'ðŸŒ¾','LÃ¡cteos':'ðŸ¥›','Condimentos':'ðŸ§‚','Bebidas':'ðŸ¥¤','Empaques':'ðŸ“¦','Otro':'ðŸ“‹' };
  grid.innerHTML = proveedores.map(p => `
    <div class="card" style="padding:16px">
      <div class="flex justify-between items-center mb-8">
        <span class="badge badge-gray">${catEmoji[p.categoria]||'ðŸ“‹'} ${p.categoria}</span>
        <button class="btn btn-danger btn-sm" onclick="eliminarProveedor('${p.id}')">ðŸ—‘</button>
      </div>
      <div style="font-size:16px;font-weight:600;margin-bottom:4px">${p.nombre}</div>
      ${p.contacto ? `<div style="font-size:12px;color:var(--text3);margin-bottom:2px">ðŸ‘¤ ${p.contacto}</div>` : ''}
      ${p.tel ? `<div style="font-size:12px;color:var(--blue);margin-bottom:8px">ðŸ“ž ${p.tel}</div>` : ''}
      ${p.dias ? `<div class="badge badge-green" style="margin-bottom:8px">ðŸ“… ${p.dias}</div>` : ''}
      ${p.notas ? `<div style="font-size:12px;color:var(--text2);background:var(--bg3);border-radius:6px;padding:8px;margin-top:8px">${p.notas}</div>` : ''}
    </div>`).join('') || '<div class="empty" style="grid-column:1/-1"><div class="empty-icon">ðŸš›</div><div class="empty-title">Sin proveedores</div></div>';
}

function openNuevoProveedor() {
  ['prov-nombre','prov-contacto','prov-tel','prov-dias','prov-notas'].forEach(id => document.getElementById(id).value = '');
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
  const total = pendiente.reduce((s,c) => s+c.monto, 0);
  const vencidas = pendiente.filter(c => c.estado === 'vencida').length;
  const porVencer = pendiente.filter(c => c.estado === 'pendiente' && c.vencimiento && new Date(c.vencimiento) <= new Date(Date.now() + 7*24*60*60*1000)).length;
  const ok = pendiente.filter(c => c.estado === 'pendiente' && (!c.vencimiento || new Date(c.vencimiento) > new Date(Date.now() + 7*24*60*60*1000))).length;
  document.getElementById('cxp-total').textContent = fmt(total);
  document.getElementById('cxp-vencidas').textContent = vencidas;
  document.getElementById('cxp-porvencer').textContent = porVencer;
  document.getElementById('cxp-ok').textContent = ok;

  const tipoEmoji = { proveedor:'ðŸš›', servicio:'ðŸ¢', otro:'ðŸ“‹' };
  const tbody = document.getElementById('tabla-cxp');
  tbody.innerHTML = lista.map(c => {
    const badge = c.estado === 'pagada' ? 'badge-green' : c.estado === 'vencida' ? 'badge-red' : 'badge-amber';
    const txt = c.estado === 'pagada' ? 'Pagada' : c.estado === 'vencida' ? 'Vencida' : 'Pendiente';
    return `<tr>
      <td><span class="badge badge-gray">${tipoEmoji[c.tipo]||'ðŸ“‹'} ${c.tipo||'proveedor'}</span></td>
      <td style="font-weight:500">${c.acreedor||c.proveedor||'â€”'}</td>
      <td>${c.concepto}</td>
      <td class="highlight-red font-mono">${fmt(c.monto)}</td>
      <td class="text-dim">${c.vencimiento ? fmtFecha(c.vencimiento) : 'â€”'}</td>
      <td><span class="badge ${badge}">${txt}</span></td>
      <td><span class="badge badge-gray" style="font-size:10px">${c.estado==='pagada'?(c.metodoPagoRealizado||c.metodoPago||'â€”'):(c.metodoPago||'Efectivo')}</span></td>
      <td class="text-dim text-sm">${c.notas||'â€”'}</td>
      <td>
        <div class="flex gap-6">
          ${c.estado !== 'pagada' ? `<button class="btn btn-secondary btn-sm" onclick="marcarPagada('${c.id}')">âœ“ Pagar</button>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('') || '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text3)">Sin cuentas registradas</td></tr>';
}

function openNuevaCuenta() {
  cxpTipoActual = 'proveedor';
  ['cxp-concepto','cxp-monto','cxp-notas','cxp-acreedor'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  document.getElementById('cxp-vencimiento').value = '';
  document.getElementById('cxp-prov-wrap').style.display = 'block';
  document.getElementById('cxp-acreedor-wrap').style.display = 'none';
  document.querySelectorAll('#cxp-tipo-chips .chip').forEach((c,i) => c.classList.toggle('active', i===0));
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
  // Mostrar mini modal de confirmaciÃ³n con mÃ©todo de pago
  const metodo = c.metodoPago || 'Efectivo';
  document.getElementById('pagar-cxp-id').value = id;
  document.getElementById('pagar-cxp-info').innerHTML = `
    <div class="flex justify-between mb-4"><span style="font-weight:600">${c.acreedor||c.proveedor}</span><span class="font-mono highlight-red">${fmt(c.monto)}</span></div>
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
      hora: hora(), pedidoId: uid(), cliente: c.acreedor||c.proveedor||'CxP',
      metodo, monto: c.monto, tipo: 'pago_cxp', concepto: c.concepto,
      estado: 'Pagado', fecha,
    });
    c._movRegistrado = true;
  }
  save();
  closeModal('modal-pagar-cxp');
  renderCXP();
  renderEstadosFinancieros();
  toast(`CxP pagada con ${metodo} â€” ${fmt(c.monto)}`);
}

function eliminarCuenta(id) {
  cxp = cxp.filter(c => c.id !== id);
  save(); renderCXP(); toast('Cuenta eliminada');
}

// ========== CXC ==========
function renderCXC() {
  const pendientes = cxc.filter(c => c.estado !== 'cobrada');
  const total = pendientes.reduce((s,c) => s+_saldoCxC(c), 0);
  const vencidas = pendientes.filter(c => c.estado === 'vencida').length;
  const porVencer = pendientes.filter(c => c.estado === 'pendiente' && c.vencimiento && new Date(c.vencimiento) <= new Date(Date.now()+7*24*60*60*1000)).length;
  const ok = pendientes.filter(c => c.estado === 'pendiente' && (!c.vencimiento || new Date(c.vencimiento) > new Date(Date.now()+7*24*60*60*1000))).length;

  document.getElementById('cxc-total').textContent = fmt(total);
  document.getElementById('cxc-vencidas').textContent = vencidas;
  document.getElementById('cxc-porvencer').textContent = porVencer;
  document.getElementById('cxc-ok').textContent = ok;

  // Resumen por cliente (agrupado) â€” usa saldo pendiente
  const porCliente = {};
  pendientes.forEach(c => {
    if (!porCliente[c.clienteNombre]) porCliente[c.clienteNombre] = { total:0, cuentas:0, vencidas:0 };
    porCliente[c.clienteNombre].total += _saldoCxC(c);
    porCliente[c.clienteNombre].cuentas++;
    if (c.estado === 'vencida') porCliente[c.clienteNombre].vencidas++;
  });
  const resumenEl = document.getElementById('cxc-resumen-clientes');
  const clientesPendientes = Object.entries(porCliente);
  if (clientesPendientes.length === 0) {
    resumenEl.innerHTML = '<div class="empty" style="padding:24px"><div class="empty-icon">âœ…</div><div class="empty-title">Sin cuentas pendientes</div></div>';
  } else {
    resumenEl.innerHTML = clientesPendientes.map(([nombre, data]) => `
      <div class="flex items-center gap-12" style="padding:10px 0;border-bottom:1px solid var(--border);">
        <div class="avatar" style="background:var(--blue-dim);color:var(--blue)">${nombre[0]}</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:500">${nombre}</div>
          <div style="font-size:11px;color:var(--text3)">${data.cuentas} cargo${data.cuentas>1?'s':''}${data.vencidas>0?` Â· <span style="color:var(--red)">${data.vencidas} vencida${data.vencidas>1?'s':''}</span>`:''}</div>
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
    const badge = c.estado==='cobrada'?'badge-green':c.estado==='vencida'?'badge-red':'badge-amber';
    const txt = c.estado==='cobrada'?'Cobrada':c.estado==='vencida'?'Vencida':'Pendiente';
    const saldo = _saldoCxC(c);
    const abonado = (c.abonos||[]).reduce((s,a)=>s+a.monto,0);
    const tieneAbonos = abonado > 0 && c.estado !== 'cobrada';
    return `<tr>
      <td style="font-weight:500">${c.clienteNombre}</td>
      <td>${c.concepto}${tieneAbonos ? `<div style="font-size:10px;color:var(--green)">Abonado: ${fmt(abonado)}</div>` : ''}</td>
      <td class="font-mono" style="color:var(--blue)">${fmt(c.monto)}${tieneAbonos ? `<div style="font-size:10px;color:var(--amber)">Saldo: ${fmt(saldo)}</div>` : ''}</td>
      <td class="text-dim">${fmtFecha(c.fecha)}</td>
      <td class="text-dim">${c.vencimiento?fmtFecha(c.vencimiento):'â€”'}</td>
      <td><span class="badge ${badge}">${txt}</span></td>
      <td><span class="badge badge-gray" style="font-size:10px">${c.metodoCobro || (c.estado==='cobrada' ? 'âœ“ cobrada' : 'â€”')}</span></td>
      <td>
        <div class="flex gap-6">
          ${c.estado!=='cobrada'?`<button class="btn btn-secondary btn-sm" onclick="openCobrarCxC('${c.id}')">ðŸ’µ Abonar / cobrar</button>`:'<span class="badge badge-green" style="font-size:10px">âœ“ Liquidada</span>'}
          <button class="btn btn-danger btn-sm" onclick="eliminarCxC('${c.id}')">ðŸ—‘</button>
        </div>
      </td>
    </tr>`;
  }).join('') || '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text3)">Sin cuentas registradas</td></tr>';

  // Badge sidebar
  const badgeEl = document.getElementById('badge-cxc');
  if (vencidas > 0) { badgeEl.textContent = vencidas; badgeEl.style.display = ''; }
  else badgeEl.style.display = 'none';
}

function openNuevaCxC() {
  ['cxc-concepto','cxc-monto','cxc-notas'].forEach(id => document.getElementById(id).value = '');
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

// Calcula el saldo pendiente de una CxC (monto - abonos)
function _saldoCxC(c) {
  const abonado = (c.abonos || []).reduce((s,a) => s + a.monto, 0);
  return Math.max(0, (c.monto || 0) - abonado);
}

function openCobrarCxC(id) {
  const c = cxc.find(x => x.id === id);
  if (!c) return;
  document.getElementById('cobrar-cxc-id').value = id;
  const saldo = _saldoCxC(c);
  const abonado = (c.abonos || []).reduce((s,a) => s + a.monto, 0);
  document.getElementById('cobrar-cxc-titulo').textContent = 'âœ“ Registrar cobro / abono';
  document.getElementById('cobrar-cxc-info').innerHTML = `
    <div class="flex justify-between mb-4">
      <span style="font-weight:600">${c.clienteNombre}</span>
      <span class="font-mono" style="color:var(--blue)">${fmt(c.monto)}</span>
    </div>
    <div style="font-size:12px;color:var(--text2)">${c.concepto}</div>
    <div class="flex justify-between mt-8" style="padding-top:6px;border-top:1px solid var(--border)">
      <span style="font-size:12px;color:var(--text3)">Ya abonado</span>
      <span class="font-mono" style="font-size:12px;color:var(--green)">${fmt(abonado)}</span>
    </div>
    <div class="flex justify-between">
      <span style="font-size:13px;font-weight:600;color:var(--amber)">Saldo pendiente</span>
      <span class="font-mono font-semibold" style="color:var(--amber)">${fmt(saldo)}</span>
    </div>`;
  // Historial de abonos
  const abonosEl = document.getElementById('cobrar-cxc-abonos');
  if (c.abonos && c.abonos.length) {
    abonosEl.innerHTML = `<div style="font-size:11px;font-weight:600;color:var(--text3);margin-bottom:4px">ABONOS REGISTRADOS</div>` +
      c.abonos.map(a => `<div class="flex justify-between" style="font-size:11px;padding:3px 0;border-bottom:1px solid var(--border)">
        <span>${fmtFecha(a.fecha)} Â· ${a.metodo}</span>
        <span class="font-mono" style="color:var(--green)">${fmt(a.monto)}</span>
      </div>`).join('');
  } else {
    abonosEl.innerHTML = '';
  }
  document.getElementById('cobrar-cxc-monto').value = saldo.toFixed(2);
  document.getElementById('cobrar-cxc-metodo').value = 'Efectivo';
  document.getElementById('cobrar-cxc-fecha').value = hoy();
  _previewAbono();
  openModal('modal-cobrar-cxc');
}

function _previewAbono() {
  const id = document.getElementById('cobrar-cxc-id').value;
  const c = cxc.find(x => x.id === id);
  if (!c) return;
  const saldo = _saldoCxC(c);
  const monto = parseFloat(document.getElementById('cobrar-cxc-monto').value) || 0;
  const previewEl = document.getElementById('cobrar-cxc-preview');
  if (!previewEl) return;
  const nuevoSaldo = Math.max(0, saldo - monto);
  if (monto <= 0) {
    previewEl.innerHTML = 'â„¹ Ingresa el monto del abono.';
  } else if (nuevoSaldo === 0) {
    previewEl.innerHTML = `âœ… Con este abono la cuenta queda <strong>liquidada</strong>.`;
  } else {
    previewEl.innerHTML = `ðŸ“Š Tras este abono quedarÃ¡ un saldo pendiente de <strong>${fmt(nuevoSaldo)}</strong>.`;
  }
}

function confirmarCobrarCxC() {
  const id = document.getElementById('cobrar-cxc-id').value;
  const metodo = document.getElementById('cobrar-cxc-metodo').value;
  const fecha = document.getElementById('cobrar-cxc-fecha').value || hoy();
  const monto = parseFloat(document.getElementById('cobrar-cxc-monto').value) || 0;
  const c = cxc.find(x => x.id === id);
  if (!c) return;
  if (monto <= 0) { toast('Ingresa el monto del abono', 'error'); return; }
  const saldo = _saldoCxC(c);
  if (monto > saldo + 0.01) { toast(`El abono no puede superar el saldo (${fmt(saldo)})`, 'error'); return; }

  // Registrar abono
  if (!c.abonos) c.abonos = [];
  c.abonos.push({ monto, metodo, fecha, hora: hora() });

  // Registrar movimiento en caja/banco
  movCaja.push({
    hora: hora(), cxcId: id, pedidoId: c.pedidoId || '',
    cliente: c.clienteNombre, metodo, monto,
    tipo: 'cobro_cxc', concepto: c.concepto + ((_saldoCxC(c) > 0) ? ' (abono)' : ' (liquidaciÃ³n)'),
    estado: 'Cobrado', fecha,
  });

  // Actualizar estado segÃºn saldo restante
  const nuevoSaldo = _saldoCxC(c);
  if (nuevoSaldo === 0) {
    c.estado = 'cobrada';
    c.fechaCobro = fecha;
    c.metodoCobro = metodo;
  } else {
    c.estado = (c.vencimiento && new Date(c.vencimiento) < new Date()) ? 'vencida' : 'pendiente';
    c.metodoCobro = 'Abono parcial';
  }

  save();
  closeModal('modal-cobrar-cxc');
  toast(nuevoSaldo === 0 ? `Cuenta liquidada â€” ${metodo}` : `Abono de ${fmt(monto)} registrado Â· saldo ${fmt(nuevoSaldo)}`);
  renderCXC();
  renderDashboard();
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
      <td class="font-mono text-sm">${c.tel||'â€”'}</td>
      <td><span class="badge badge-gray">${c.canal}</span></td>
      <td>${c.tieneDieta ? '<span class="badge badge-purple">ðŸ“‹ SÃ­</span>' : '<span class="badge badge-gray">No</span>'}</td>
      <td class="font-mono">${c.pedidos||0}</td>
      <td class="text-dim">${c.ultimoPedido ? fmtFecha(c.ultimoPedido) : 'â€”'}</td>
      <td>
        <div class="flex gap-6">
          <button class="btn btn-secondary btn-sm" onclick="openEditarCliente('${c.id}')">âœï¸ Editar</button>
          <button class="btn btn-danger btn-sm" onclick="eliminarCliente('${c.id}')">ðŸ—‘</button>
        </div>
      </td>
    </tr>`).join('') || '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text3)">Sin clientes registrados</td></tr>';
}

function buscarCliente(q) {
  renderTablaClientes(clientes.filter(c => c.nombre.toLowerCase().includes(q.toLowerCase()) || (c.tel||'').includes(q)));
}

// ===== DIRECCIONES DE CLIENTE =====
let _cliDirecciones = []; // buffer de ediciÃ³n

function _cliRenderDirecciones() {
  const cont = document.getElementById('cli-direcciones-lista');
  if (!cont) return;
  if (!_cliDirecciones.length) {
    cont.innerHTML = '<div style="font-size:12px;color:var(--text3);text-align:center;padding:14px;border:1px dashed var(--border);border-radius:8px">Sin direcciones. Agrega una para precargar el envÃ­o en sus pedidos.</div>';
    return;
  }
  cont.innerHTML = _cliDirecciones.map((d, i) => `
    <div class="card card-sm mb-6" style="${d.principal?'border-color:rgba(46,204,113,0.4)':''}">
      <div class="flex items-center gap-8 mb-6">
        <button class="btn btn-secondary btn-sm" style="padding:2px 7px;font-size:13px;${d.principal?'color:var(--amber)':'color:var(--text3)'}"
                onclick="_cliSetPrincipal(${i})" title="Marcar como principal">${d.principal?'â˜…':'â˜†'}</button>
        <input class="form-input" style="flex:0 0 130px;font-size:12px;padding:5px 8px" placeholder="Casa, Oficina..."
               value="${(d.nombre||'').replace(/"/g,'&quot;')}" oninput="_cliDirecciones[${i}].nombre=this.value">
        <input class="form-input" style="flex:1;font-size:12px;padding:5px 8px" placeholder="DirecciÃ³n / referencia"
               value="${(d.direccion||'').replace(/"/g,'&quot;')}" oninput="_cliDirecciones[${i}].direccion=this.value">
        <div style="display:flex;align-items:center;gap:3px">
          <span style="font-size:11px;color:var(--text3)">$</span>
          <input class="form-input" type="number" step="0.01" min="0" style="width:75px;font-size:12px;padding:5px 6px;text-align:right"
                 placeholder="0.00" value="${d.costoEnvio||0}" oninput="_cliDirecciones[${i}].costoEnvio=parseFloat(this.value)||0">
        </div>
        <button class="btn btn-danger btn-sm" style="padding:3px 7px" onclick="_cliBorrarDireccion(${i})">ðŸ—‘</button>
      </div>
      <div class="flex items-center gap-6">
        <span style="font-size:11px;color:var(--text3);min-width:74px">ðŸ“ Maps:</span>
        <input class="form-input" style="flex:1;font-size:11px;padding:4px 8px" placeholder="Pega el link de Google Maps (opcional)"
               value="${(d.maps||'').replace(/"/g,'&quot;')}" oninput="_cliDirecciones[${i}].maps=this.value">
        ${d.maps ? `<a href="${d.maps}" target="_blank" class="btn btn-secondary btn-sm" style="padding:3px 8px;font-size:11px;text-decoration:none">Abrir</a>` : ''}
      </div>
    </div>`).join('');
}

function _cliAgregarDireccion() {
  _cliDirecciones.push({ id: uid(), nombre:'', direccion:'', maps:'', costoEnvio:0, principal: _cliDirecciones.length === 0 });
  _cliRenderDirecciones();
}
function _cliBorrarDireccion(i) {
  const eraPrincipal = _cliDirecciones[i].principal;
  _cliDirecciones.splice(i,1);
  if (eraPrincipal && _cliDirecciones.length) _cliDirecciones[0].principal = true;
  _cliRenderDirecciones();
}
function _cliSetPrincipal(i) {
  _cliDirecciones.forEach((d,j) => d.principal = (j === i));
  _cliRenderDirecciones();
}

// Helper global: obtener direcciones de un cliente
function getDireccionesCliente(clienteId) {
  const c = clientes.find(x => x.id === clienteId);
  return (c && Array.isArray(c.direcciones)) ? c.direcciones : [];
}
function getDireccionPrincipal(clienteId) {
  const dirs = getDireccionesCliente(clienteId);
  return dirs.find(d => d.principal) || dirs[0] || null;
}

function openNuevoCliente() {
  document.getElementById('cli-edit-id').value = '';
  document.getElementById('modal-cliente-titulo').textContent = 'Nuevo Cliente';
  ['cli-nombre','cli-tel','cli-notas'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('cli-canal').value = 'WhatsApp';
  document.getElementById('cli-dieta').value = 'false';
  _cliDirecciones = [];
  _cliRenderDirecciones();
  openModal('modal-cliente');
}

function openEditarCliente(id) {
  const c = clientes.find(x => x.id === id);
  if (!c) return;
  document.getElementById('cli-edit-id').value = id;
  document.getElementById('modal-cliente-titulo').textContent = 'Editar Cliente';
  document.getElementById('cli-nombre').value = c.nombre || '';
  document.getElementById('cli-tel').value = c.tel || '';
  document.getElementById('cli-canal').value = c.canal || 'WhatsApp';
  document.getElementById('cli-dieta').value = c.tieneDieta ? 'true' : 'false';
  document.getElementById('cli-notas').value = c.notas || '';
  _cliDirecciones = JSON.parse(JSON.stringify(c.direcciones || []));
  _cliRenderDirecciones();
  openModal('modal-cliente');
}

function guardarCliente() {
  const nombre = document.getElementById('cli-nombre').value.trim();
  if (!nombre) { toast('Ingresa el nombre del cliente', 'error'); return; }
  const editId = document.getElementById('cli-edit-id').value;
  // Limpiar direcciones vacÃ­as
  const dirs = _cliDirecciones.filter(d => (d.nombre||'').trim() || (d.direccion||'').trim() || d.costoEnvio > 0);
  if (dirs.length && !dirs.some(d => d.principal)) dirs[0].principal = true;

  if (editId) {
    const c = clientes.find(x => x.id === editId);
    if (c) {
      c.nombre = nombre;
      c.tel = document.getElementById('cli-tel').value;
      c.canal = document.getElementById('cli-canal').value;
      c.tieneDieta = document.getElementById('cli-dieta').value === 'true';
      c.notas = document.getElementById('cli-notas').value;
      c.direcciones = dirs;
    }
    toast('Cliente actualizado');
  } else {
    clientes.push({
      id: uid(), nombre,
      tel: document.getElementById('cli-tel').value,
      canal: document.getElementById('cli-canal').value,
      tieneDieta: document.getElementById('cli-dieta').value === 'true',
      notas: document.getElementById('cli-notas').value,
      direcciones: dirs,
      pedidos: 0, ultimoPedido: null,
    });
    toast('Cliente agregado');
  }
  save();
  closeModal('modal-cliente');
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
    const d = new Date(c.fecha+'T12:00:00');
    return d.getMonth()===mes && d.getFullYear()===anio;
  });
  const totalMes = comprasMes.reduce((s,c)=>s+c.total,0);
  const pendientes = compras.filter(c=>c.estado==='pendiente').length;
  const recibidas = compras.filter(c=>c.estado==='recibida').length;

  document.getElementById('compras-mes').textContent = fmt(totalMes);
  document.getElementById('compras-ordenes').textContent = comprasMes.length;
  document.getElementById('compras-pendientes').textContent = pendientes;
  document.getElementById('compras-recibidas').textContent = recibidas;

  // Sugerencias: ingredientes bajo mÃ­nimo
  const bajos = inventario.filter(i => i.stock <= i.minimo);
  const sugEl = document.getElementById('compras-sugerencias');
  if (bajos.length === 0) {
    document.getElementById('compras-sugerencias-wrap').style.display = 'none';
  } else {
    document.getElementById('compras-sugerencias-wrap').style.display = 'block';
    sugEl.innerHTML = bajos.map(i => `
      <div class="flex items-center gap-12" style="padding:8px 0;border-bottom:1px solid var(--border)">
        <span class="dot ${i.stock===0?'dot-red':'dot-amber'}"></span>
        <span style="flex:1;font-size:13px">${i.nombre}</span>
        <span style="font-size:12px;color:var(--text3)">${i.stock} / mÃ­n ${i.minimo} ${i.unidad}</span>
        <span class="badge ${i.stock===0?'badge-red':'badge-amber'}">${i.stock===0?'Agotado':'Stock bajo'}</span>
      </div>`).join('');
  }

  // Tabla historial
  const tbody = document.getElementById('tabla-compras');
  tbody.innerHTML = [...compras].reverse().map(c => {
    const badge = c.estado==='recibida' ? 'badge-green' : 'badge-amber';
    const txt = c.estado==='recibida' ? 'âœ… Recibida' : 'â³ Pendiente';
    return `<tr>
      <td class="text-dim">${fmtFecha(c.fecha)}</td>
      <td>${c.proveedor||'â€”'}</td>
      <td style="font-size:12px;color:var(--text2)">${c.lineas.slice(0,2).map(l=>l.nombre).join(', ')}${c.lineas.length>2?` +${c.lineas.length-2}`:''}</td>
      <td class="highlight-green font-mono">${fmt(c.total)}</td>
      <td><span class="badge ${badge}">${txt}</span></td>
      <td class="text-dim text-sm">${c.notas||'â€”'}</td>
      <td>
        <div class="flex gap-6">
          ${c.estado==='pendiente'?`<button class="btn btn-secondary btn-sm" onclick="recibirCompra('${c.id}')">âœ“ Recibir</button>`:''}
          <button class="btn btn-secondary btn-sm" onclick="verDetalleCompra('${c.id}')">Ver</button>
          <button class="btn btn-secondary btn-sm" onclick="openEditarCompra('${c.id}')">âœï¸</button>
        </div>
      </td>
    </tr>`;
  }).join('') || '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text3)">Sin compras registradas</td></tr>';
}

// ---- LÃ­neas de compra ----
function openEditarCompra(id) {
  const c = compras.find(x => x.id === id);
  if (!c) return;
  lineasCompraActual = JSON.parse(JSON.stringify(c.lineas || []));
  document.getElementById('compra-modal-title').textContent = 'Editar Compra';
  document.getElementById('compra-fecha').value = c.fecha || hoy();
  document.getElementById('compra-notas').value = c.notas || '';
  document.getElementById('compra-estado').value = c.estado || 'recibida';
  document.getElementById('compra-genera-cxp').value = 'no';
  document.getElementById('panel-compra-cxp').style.display = 'none';
  const sel = document.getElementById('compra-proveedor');
  sel.innerHTML = '<option value="">Sin proveedor / mercado</option>' +
    proveedores.map(p=>`<option value="${p.nombre}" ${p.nombre===c.proveedor?'selected':''}>${p.nombre}</option>`).join('');
  renderLineasCompra();
  // Store edit id
  window._editandoCompraId = id;
  openModal('modal-compra');
}

function openNuevaCompra() {
  window._editandoCompraId = null;
  lineasCompraActual = [];
  document.getElementById('compra-modal-title').textContent = 'Nueva Compra de Insumos';
  document.getElementById('compra-fecha').value = hoy();
  document.getElementById('compra-notas').value = '';
  document.getElementById('compra-estado').value = 'recibida';
  document.getElementById('compra-genera-cxp').value = 'no';
  document.getElementById('panel-compra-cxp').style.display = 'none';
  const sel = document.getElementById('compra-proveedor');
  sel.innerHTML = '<option value="">Sin proveedor / mercado</option>' +
    proveedores.map(p=>`<option value="${p.nombre}">${p.nombre}</option>`).join('');
  renderLineasCompra();
  openModal('modal-compra');
}

function agregarLineaCompra() {
  lineasCompraActual.push({ ingId:'', nombre:'', cantidad:0, costoUnit:0 });
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
    const sub = (l.cantidad||0) * (l.costoUnit||0);
    return `
    <div style="display:grid;grid-template-columns:1fr 80px 90px 100px 36px;gap:0;padding:7px 10px;border-top:1px solid var(--border);align-items:center;">
      <select class="form-input" style="font-size:12px;padding:5px 8px;border-radius:4px"
              onchange="actualizarLineaCompra(${idx},'ingId',this.value,this.options[this.selectedIndex].text)">
        <option value="">Seleccionar...</option>
        ${inventario.map(i=>`<option value="${i.id}" ${i.id===l.ingId?'selected':''}>${i.nombre} (${i.unidad})</option>`).join('')}
      </select>
      <input type="number" class="form-input" style="font-size:12px;padding:5px 8px;border-radius:4px;margin-left:6px"
             placeholder="0" value="${l.cantidad||''}"
             onchange="actualizarLineaCompra(${idx},'cantidad',parseFloat(this.value)||0)">
      <input type="number" class="form-input" style="font-size:12px;padding:5px 8px;border-radius:4px;margin-left:6px"
             placeholder="0.00" value="${l.costoUnit||''}"
             onchange="actualizarLineaCompra(${idx},'costoUnit',parseFloat(this.value)||0)">
      <span class="font-mono" style="font-size:12px;color:var(--green);padding-left:8px">${fmt(sub)}</span>
      <button onclick="eliminarLineaCompra(${idx})" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:16px;padding:0 4px;">Ã—</button>
    </div>`;
  }).join('');
  recalcularTotalCompra();
}

function actualizarLineaCompra(idx, campo, valor, texto) {
  if (campo === 'ingId') {
    lineasCompraActual[idx].ingId = valor;
    lineasCompraActual[idx].nombre = texto?.replace(/\s*\(.*\)$/,'') || '';
    // Autocompletar costo unitario del inventario
    const ing = inventario.find(i=>i.id===valor);
    if (ing) lineasCompraActual[idx].costoUnit = ing.costo;
    renderLineasCompra(); return;
  }
  lineasCompraActual[idx][campo] = valor;
  recalcularTotalCompra();
}

function eliminarLineaCompra(idx) {
  lineasCompraActual.splice(idx,1);
  renderLineasCompra();
}

function recalcularTotalCompra() {
  const total = lineasCompraActual.reduce((s,l)=>s+(l.cantidad||0)*(l.costoUnit||0),0);
  document.getElementById('compra-total-display').textContent = fmt(total);
  // Actualizar subtotales en DOM sin re-render completo
  const celdas = document.querySelectorAll('#compra-lineas > div span.font-mono');
  lineasCompraActual.forEach((l,i)=>{
    if(celdas[i]) celdas[i].textContent = fmt((l.cantidad||0)*(l.costoUnit||0));
  });
}

function toggleCompraCredito(val) {
  document.getElementById('panel-compra-cxp').style.display = val==='si' ? 'block' : 'none';
}

function guardarCompra_orig() {}
function guardarCompra() {
  // If editing, update existing
  if (window._editandoCompraId) {
    const c = compras.find(x => x.id === window._editandoCompraId);
    if (c) {
      const lineas = lineasCompraActual.filter(l => l.ingId && l.cantidad > 0);
      if (!lineas.length) { toast('Agrega al menos un ingrediente', 'error'); return; }
      // Revert old stock changes if already received
      if (c.estado === 'recibida') {
        c.lineas.forEach(l => {
          const ing = inventario.find(i => i.id === l.ingId);
          if (ing) ing.stock = Math.round((ing.stock - (l.cantidad||0)) * 1000) / 1000;
        });
      }
      c.fecha = document.getElementById('compra-fecha').value || hoy();
      c.proveedor = document.getElementById('compra-proveedor').value || 'Sin proveedor';
      c.notas = document.getElementById('compra-notas').value;
      c.estado = document.getElementById('compra-estado').value;
      c.lineas = lineas;
      c.total = lineas.reduce((s,l) => s + (l.cantidad||0)*(l.costoUnit||0), 0);
      // Re-apply stock if received
      if (c.estado === 'recibida') {
        lineas.forEach(l => {
          const ing = inventario.find(i => i.id === l.ingId);
          if (ing) {
            ing.stock = Math.round((ing.stock + (l.cantidad||0)) * 1000) / 1000;
            if (l.costoUnit > 0) ing.costo = l.costoUnit;
          }
        });
      }
      save();
      closeModal('modal-compra');
      toast('Compra actualizada');
      renderCompras();
      window._editandoCompraId = null;
      return;
    }
  }

  const lineasValidas = lineasCompraActual.filter(l=>l.ingId && l.cantidad>0);
  if (lineasValidas.length===0) { toast('Agrega al menos un ingrediente', 'error'); return; }
  const total = lineasValidas.reduce((s,l)=>s+(l.cantidad||0)*(l.costoUnit||0),0);
  const estado = document.getElementById('compra-estado').value;
  const proveedor = document.getElementById('compra-proveedor').value;
  const fechaCompra = document.getElementById('compra-fecha').value || hoy();

  // Si estÃ¡ recibida, actualizar inventario
  if (estado === 'recibida') {
    lineasValidas.forEach(l => {
      const ing = inventario.find(i=>i.id===l.ingId);
      if (ing) {
        ing.stock = +(ing.stock + l.cantidad).toFixed(3);
        // Actualizar costo: usar presentaciÃ³n predeterminada si existe, si no usar el costo capturado
        const presDefault = presentaciones.find(p=>p.ingId===l.ingId && p.esDefault);
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
      id: uid(), tipo: 'proveedor', acreedor: proveedor||'Proveedor de compra',
      concepto: `Compra de insumos ${fmtFecha(fechaCompra)}`,
      monto: total, vencimiento: venc,
      estado: venc && new Date(venc)<new Date() ? 'vencida' : 'pendiente',
      notas: `Compra ID ${compra.id.slice(-4).toUpperCase()}`,
    });
  }

  save();
  closeModal('modal-compra');
  toast(`Compra registrada${estado==='recibida'?' â€” inventario actualizado':' â€” pendiente de recibir'}`);
  renderCompras();
  renderInventario();
}

function recibirCompra(id) {
  const c = compras.find(x=>x.id===id);
  if (!c) return;
  c.estado = 'recibida';
  // Actualizar inventario al recibir
  c.lineas.forEach(l => {
    const ing = inventario.find(i=>i.id===l.ingId);
    if (ing) {
      ing.stock = +(ing.stock + l.cantidad).toFixed(3);
      if (l.costoUnit > 0) ing.costo = l.costoUnit;
    }
  });
  save();
  toast('Compra recibida â€” inventario actualizado âœ…');
  renderCompras();
  renderInventario();
}

function generarOrdenSugerida() {
  const bajos = inventario.filter(i=>i.stock<=i.minimo && i.id);
  if (bajos.length===0) { toast('No hay ingredientes por reponer'); return; }
  lineasCompraActual = bajos.map(i=>({ ingId:i.id, nombre:i.nombre, cantidad: Math.max(i.minimo*2-i.stock, i.minimo), costoUnit:i.costo }));
  document.getElementById('compra-fecha').value = hoy();
  document.getElementById('compra-notas').value = 'Orden generada automÃ¡ticamente por stock bajo';
  renderLineasCompra();
  openModal('modal-compra');
}

function verDetalleCompra(id) {
  const c = compras.find(x=>x.id===id);
  if (!c) return;
  document.getElementById('detalle-compra-body').innerHTML = `
    <div class="grid grid-2 mb-16" style="font-size:13px">
      <div><span class="text-dim">Fecha:</span> <strong>${fmtFecha(c.fecha)}</strong></div>
      <div><span class="text-dim">Proveedor:</span> ${c.proveedor||'â€”'}</div>
      <div><span class="text-dim">Estado:</span> <span class="badge ${c.estado==='recibida'?'badge-green':'badge-amber'}">${c.estado==='recibida'?'Recibida':'Pendiente'}</span></div>
      <div><span class="text-dim">Total:</span> <strong class="highlight-green">${fmt(c.total)}</strong></div>
    </div>
    <div style="margin-bottom:12px">
      <div class="text-dim mb-8" style="font-size:12px">INGREDIENTES</div>
      <div style="border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden">
        <div style="display:grid;grid-template-columns:1fr 80px 90px 90px;padding:7px 12px;background:var(--bg3);font-size:11px;color:var(--text3);font-weight:500">
          <span>INGREDIENTE</span><span>CANT.</span><span>COSTO/U</span><span>SUBTOTAL</span>
        </div>
        ${c.lineas.map(l=>`
          <div style="display:grid;grid-template-columns:1fr 80px 90px 90px;padding:9px 12px;border-top:1px solid var(--border);font-size:13px">
            <span>${l.nombre}</span>
            <span class="font-mono">${l.cantidad}</span>
            <span class="font-mono text-dim">${fmt(l.costoUnit)}</span>
            <span class="font-mono highlight-green">${fmt(l.cantidad*l.costoUnit)}</span>
          </div>`).join('')}
      </div>
    </div>
    ${c.notas?`<div class="card card-sm" style="background:var(--bg3);font-size:12px">ðŸ“ ${c.notas}</div>`:''}`;
  document.getElementById('detalle-compra-footer').innerHTML =
    `<button class="btn btn-secondary" onclick="closeModal('modal-detalle-compra')">Cerrar</button>
     ${c.estado==='pendiente'?`<button class="btn btn-primary" onclick="recibirCompra('${c.id}');closeModal('modal-detalle-compra')">âœ“ Marcar como recibida</button>`:''}`;
  openModal('modal-detalle-compra');
}

// ========== REPORTES ==========
let repTabActual = 'ventas';

function switchRepTab(el, tab) {
  repTabActual = tab;
  document.querySelectorAll('#rep-tabs .tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  ['ventas','platillos','clientes','inventario','finanzas','estados'].forEach(t => {
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
  return pedidos.filter(p => cancelados(p) && new Date(p.fecha+'T12:00:00') >= desde);
}

function renderReportes() {
  const lista = pedidosEnPeriodo();
  const totalVentas = lista.reduce((s,p) => s + (p.subtotal||p.total||0), 0);
  const totalPedidos = lista.length;
  const ticket = totalPedidos ? totalVentas / totalPedidos : 0;
  const conDesc = lista.filter(p => p.descuento > 0).length;
  const totalDescuentos = lista.reduce((s,p) => s + (p.descuento||0), 0);

  // ===== Resumen de platillos: vendidos vs cortesÃ­a =====
  const _costoDeItem = (item) => {
    const plat = menu.find(m => m.nombre === (item.nombre||item) || m.id === item.id);
    if (plat) return plat.costo || 0;
    if (item.esDieta && item.dietaId) {
      const d = dietas.find(x => x.id === item.dietaId);
      const pc = d?.cotizacion?.platillos?.find(x => x.nombre === item.nombre);
      if (pc) return pc.costo || 0;
    }
    return 0;
  };
  let platVendidos = 0, platCortesia = 0, ingresosVendidos = 0, costoCortesia = 0;
  let pedVendidos = 0, pedCortesia = 0;
  lista.forEach(p => {
    const nPlat = (p.items||[]).reduce((s,it)=>s+(it.cantidad||1),0);
    if (p.esCortesia) {
      platCortesia += nPlat;
      pedCortesia++;
      costoCortesia += (p.items||[]).reduce((s,it)=>s + _costoDeItem(it)*(it.cantidad||1), 0);
    } else {
      platVendidos += nPlat;
      pedVendidos++;
      ingresosVendidos += (p.subtotal||p.total||0);
    }
  });
  const setTxt = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  setTxt('rep-plat-total', platVendidos + platCortesia);
  setTxt('rep-plat-total-det', `en ${totalPedidos} pedido${totalPedidos!==1?'s':''}`);
  setTxt('rep-plat-vendidos', platVendidos);
  setTxt('rep-plat-vendidos-det', `${fmt(ingresosVendidos)} en ingresos Â· ${pedVendidos} pedidos`);
  setTxt('rep-plat-cortesia', platCortesia);
  setTxt('rep-plat-cortesia-det', `${fmt(costoCortesia)} de costo Â· ${pedCortesia} pedidos`);

  // KPIs
  document.getElementById('rep-kpis').innerHTML = `
    <div class="card card-sm" style="border-color:rgba(46,204,113,0.2)">
      <div class="card-title">Ventas perÃ­odo</div>
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
    <div class="card card-sm" style="border-color:rgba(255,122,0,0.2)">
      <div class="card-title">Descuentos otorgados</div>
      <div class="metric-big highlight-amber" style="font-size:22px">${fmt(totalDescuentos)}</div>
      <div style="font-size:11px;color:var(--text3)">${conDesc} pedidos</div>
    </div>
    <div class="card card-sm" style="border-color:rgba(52,152,219,0.2)">
      <div class="card-title">Clientes Ãºnicos</div>
      <div class="metric-big" style="color:var(--blue);font-size:22px">${new Set(lista.map(p=>p.clienteId||p.cliente)).size}</div>
    </div>`;

  renderTabVentas(lista);
  renderTabPlatillos(lista);
  renderTabClientes(lista);
  renderTabInventario(lista);
  renderTabFinanzas(lista);
}

// ---- TAB VENTAS ----
function renderTabVentas(lista) {
  // Agrupar por dÃ­a
  const porDia = {};
  lista.forEach(p => {
    if (!porDia[p.fecha]) porDia[p.fecha] = { pedidos:0, ventas:0, canales:{}, descuentos:0 };
    porDia[p.fecha].pedidos++;
    porDia[p.fecha].ventas += p.subtotal||p.total||0;
    porDia[p.fecha].canales[p.canal] = (porDia[p.fecha].canales[p.canal]||0)+1;
    porDia[p.fecha].descuentos += p.descuento||0;
  });
  const dias = Object.keys(porDia).sort();
  const maxVenta = Math.max(...dias.map(d=>porDia[d].ventas), 1);

  // GrÃ¡fica de barras SVG
  const W = 100, barW = dias.length > 0 ? Math.max(8, Math.min(40, Math.floor(700/dias.length)-4)) : 20;
  const grafH = 140;
  const bars = dias.map((dia, i) => {
    const v = porDia[dia].ventas;
    const h = Math.max(3, Math.round((v/maxVenta)*grafH));
    const x = 20 + i*(barW+4);
    const color = v === maxVenta ? 'var(--green)' : 'rgba(46,204,113,0.4)';
    const fechaCorta = new Date(dia+'T12:00:00').toLocaleDateString('es-MX',{day:'2-digit',month:'2-digit'});
    return `<g>
      <rect x="${x}" y="${grafH+10-h}" width="${barW}" height="${h}" rx="3" fill="${color}"/>
      <title>${fechaCorta}: ${fmt(v)} (${porDia[dia].pedidos} pedidos)</title>
    </g>`;
  }).join('');
  const svgW = Math.max(400, 40 + dias.length*(barW+4));
  document.getElementById('rep-grafica-ventas').innerHTML = dias.length === 0
    ? '<div class="empty" style="padding:24px"><div class="empty-text">Sin datos en este perÃ­odo</div></div>'
    : `<div style="overflow-x:auto"><svg width="${svgW}" height="${grafH+30}" style="display:block">
        ${bars}
        ${dias.map((dia,i) => {
          const x = 20 + i*(barW+4) + barW/2;
          const fechaCorta = new Date(dia+'T12:00:00').toLocaleDateString('es-MX',{day:'2-digit',month:'2-digit'});
          return dias.length <= 14 ? `<text x="${x}" y="${grafH+26}" text-anchor="middle" font-size="9" fill="var(--text3)">${fechaCorta}</text>` : '';
        }).join('')}
      </svg></div>
      <div style="display:flex;gap:16px;margin-top:8px;flex-wrap:wrap">
        ${dias.slice(-3).map(d=>`<span style="font-size:11px;color:var(--text3)">${new Date(d+'T12:00:00').toLocaleDateString('es-MX',{weekday:'short',day:'2-digit',month:'short'})}: <strong style="color:var(--text)">${fmt(porDia[d].ventas)}</strong></span>`).join('')}
      </div>`;

  // Canales
  const canales = {};
  lista.forEach(p => canales[p.canal] = (canales[p.canal]||0) + (p.subtotal||p.total||0));
  const totalCanal = Object.values(canales).reduce((s,v)=>s+v,0)||1;
  const canalEmoji = {WhatsApp:'ðŸ’¬',Presencial:'ðŸ ',Instagram:'ðŸ“¸',Facebook:'ðŸ‘¥','TelÃ©fono':'ðŸ“ž'};
  document.getElementById('rep-canales').innerHTML = Object.entries(canales).sort((a,b)=>b[1]-a[1]).map(([c,v])=>`
    <div style="margin-bottom:14px">
      <div class="flex justify-between mb-4">
        <span style="font-size:13px">${canalEmoji[c]||'ðŸ“±'} ${c}</span>
        <span class="font-mono text-sm">${fmt(v)} Â· ${Math.round(v/totalCanal*100)}%</span>
      </div>
      <div class="stat-bar"><div class="stat-bar-fill" style="width:${v/totalCanal*100}%;background:var(--blue)"></div></div>
    </div>`).join('') || '<div class="empty" style="padding:16px"><div class="empty-text">Sin datos</div></div>';

  // Tabla dÃ­as
  document.getElementById('rep-tabla-ventas').innerHTML = dias.reverse().map(dia => {
    const d = porDia[dia];
    const canalTop = Object.entries(d.canales).sort((a,b)=>b[1]-a[1])[0]?.[0]||'â€”';
    return `<tr>
      <td>${new Date(dia+'T12:00:00').toLocaleDateString('es-MX',{weekday:'short',day:'2-digit',month:'short',year:'numeric'})}</td>
      <td class="font-mono">${d.pedidos}</td>
      <td class="highlight-green font-mono">${fmt(d.ventas)}</td>
      <td class="font-mono">${fmt(d.pedidos?d.ventas/d.pedidos:0)}</td>
      <td class="font-mono ${d.descuentos>0?'highlight-amber':''}">${d.descuentos>0?fmt(d.descuentos):'â€”'}</td>
      <td><span class="badge badge-gray">${canalTop}</span></td>
    </tr>`;
  }).join('') || '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text3)">Sin ventas en este perÃ­odo</td></tr>';
}

// ---- TAB PLATILLOS ----
function renderTabPlatillos(lista) {
  const conteo = {};
  lista.forEach(p => p.items.forEach(it => {
    const n = it.nombre||it;
    if (!conteo[n]) conteo[n] = { ventas:0, ingresos:0 };
    conteo[n].ventas += it.cantidad||1;
    conteo[n].ingresos += (it.precio||0)*(it.cantidad||1);
  }));
  const top = Object.entries(conteo).sort((a,b)=>b[1].ventas-a[1].ventas);
  const maxV = top[0]?.[1].ventas||1;

  // Top vendidos
  document.getElementById('rep-top-platillos').innerHTML = top.slice(0,8).map(([nombre,d],i)=>`
    <div style="margin-bottom:12px">
      <div class="flex justify-between mb-4">
        <span style="font-size:13px"><span style="color:var(--text3);margin-right:6px">${i+1}.</span>${nombre}</span>
        <span class="font-mono text-sm">${d.ventas} uds Â· ${fmt(d.ingresos)}</span>
      </div>
      <div class="stat-bar"><div class="stat-bar-fill" style="width:${d.ventas/maxV*100}%"></div></div>
    </div>`).join('') || '<div class="empty" style="padding:16px"><div class="empty-text">Sin datos</div></div>';

  // Rentabilidad
  const menuConDatos = menu.map(m => {
    const datos = conteo[m.nombre];
    const margen = m.precio && m.costo ? ((m.precio-m.costo)/m.precio*100) : 0;
    const foodCost = m.precio ? (m.costo/m.precio*100) : 0;
    return { ...m, vendidos: datos?.ventas||0, ingresos: datos?.ingresos||0, margen, foodCost };
  }).filter(m=>m.vendidos>0).sort((a,b)=>b.margen-a.margen);

  document.getElementById('rep-rentabilidad').innerHTML = menuConDatos.slice(0,6).map(m=>{
    const color = m.margen>=50?'var(--green)':m.margen>=30?'var(--amber)':'var(--red)';
    return `<div style="margin-bottom:12px">
      <div class="flex justify-between mb-4">
        <span style="font-size:13px">${m.nombre}</span>
        <span style="font-size:12px;font-weight:600;color:${color}">${Math.round(m.margen)}% margen</span>
      </div>
      <div class="stat-bar"><div class="stat-bar-fill" style="width:${Math.min(m.margen,100)}%;background:${color}"></div></div>
    </div>`;
  }).join('') || '<div class="empty" style="padding:16px"><div class="empty-text">Sin ventas registradas</div></div>';

  // Tabla completa
  const todosMenu = menu.map(m => {
    const datos = conteo[m.nombre];
    const margen = m.precio && m.costo ? ((m.precio-m.costo)/m.precio*100) : 0;
    const foodCost = m.precio ? (m.costo/m.precio*100) : 0;
    const semaforo = margen>=50?'ðŸŸ¢':margen>=30?'ðŸŸ¡':'ðŸ”´';
    return { ...m, vendidos:datos?.ventas||0, ingresos:datos?.ingresos||0, margen, foodCost, semaforo };
  }).sort((a,b)=>b.vendidos-a.vendidos);

  document.getElementById('rep-tabla-platillos').innerHTML = todosMenu.map(m=>`<tr>
    <td style="font-weight:500">${m.nombre}</td>
    <td class="font-mono">${m.vendidos}</td>
    <td class="highlight-green font-mono">${fmt(m.ingresos)}</td>
    <td class="font-mono text-dim">${fmt(m.costo)}</td>
    <td class="font-mono">${fmt(m.precio)}</td>
    <td style="color:${m.margen>=50?'var(--green)':m.margen>=30?'var(--amber)':'var(--red)'};font-weight:600">${Math.round(m.margen)}%</td>
    <td style="color:${m.foodCost<=35?'var(--green)':m.foodCost<=50?'var(--amber)':'var(--red)'}">${Math.round(m.foodCost)}%</td>
    <td style="font-size:16px">${m.semaforo}</td>
  </tr>`).join('') || '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text3)">Sin platillos</td></tr>';
}

// ---- TAB CLIENTES ----
function renderTabClientes(lista) {
  const porCliente = {};
  lista.forEach(p => {
    const k = p.clienteId||p.cliente;
    if (!porCliente[k]) porCliente[k] = { nombre:p.cliente, pedidos:0, total:0, canal:p.canal, ultimo:p.fecha };
    porCliente[k].pedidos++;
    porCliente[k].total += p.subtotal||p.total||0;
    if (p.fecha > porCliente[k].ultimo) porCliente[k].ultimo = p.fecha;
  });
  const topC = Object.values(porCliente).sort((a,b)=>b.total-a.total);
  const maxT = topC[0]?.total||1;

  document.getElementById('rep-top-clientes').innerHTML = topC.slice(0,8).map((c,i)=>`
    <div style="margin-bottom:12px">
      <div class="flex justify-between mb-4">
        <span style="font-size:13px"><span style="color:var(--text3);margin-right:6px">${i+1}.</span>${c.nombre}</span>
        <span class="font-mono text-sm">${c.pedidos} pedidos Â· ${fmt(c.total)}</span>
      </div>
      <div class="stat-bar"><div class="stat-bar-fill" style="width:${c.total/maxT*100}%;background:var(--blue)"></div></div>
    </div>`).join('') || '<div class="empty" style="padding:16px"><div class="empty-text">Sin datos</div></div>';

  // Canal preferido clientes
  const canalesC = {};
  Object.values(porCliente).forEach(c => canalesC[c.canal]=(canalesC[c.canal]||0)+1);
  const totalCC = Object.values(canalesC).reduce((s,v)=>s+v,0)||1;
  const canalEmoji = {WhatsApp:'ðŸ’¬',Presencial:'ðŸ ',Instagram:'ðŸ“¸',Facebook:'ðŸ‘¥','TelÃ©fono':'ðŸ“ž'};
  document.getElementById('rep-clientes-canal').innerHTML = Object.entries(canalesC).sort((a,b)=>b[1]-a[1]).map(([c,n])=>`
    <div style="margin-bottom:14px">
      <div class="flex justify-between mb-4">
        <span style="font-size:13px">${canalEmoji[c]||'ðŸ“±'} ${c}</span>
        <span class="font-mono text-sm">${n} clientes Â· ${Math.round(n/totalCC*100)}%</span>
      </div>
      <div class="stat-bar"><div class="stat-bar-fill" style="width:${n/totalCC*100}%;background:var(--purple)"></div></div>
    </div>`).join('');

  document.getElementById('rep-tabla-clientes').innerHTML = topC.map(c=>{
    const cli = clientes.find(x=>x.nombre===c.nombre);
    return `<tr>
      <td style="font-weight:500">${c.nombre}</td>
      <td class="font-mono">${c.pedidos}</td>
      <td class="font-mono highlight-green">${fmt(c.total)}</td>
      <td class="font-mono">${fmt(c.pedidos?c.total/c.pedidos:0)}</td>
      <td class="text-dim">${fmtFecha(c.ultimo)}</td>
      <td><span class="badge badge-gray">${c.canal}</span></td>
      <td>${cli?.tieneDieta?'<span class="badge badge-purple">ðŸ“‹ SÃ­</span>':'â€”'}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text3)">Sin datos</td></tr>';
}

// ---- TAB INVENTARIO/CONSUMO ----
function renderTabInventario(lista) {
  // Consumo estimado por ingrediente (de recetas Ã— unidades vendidas)
  const consumo = {};
  lista.forEach(p => p.items.forEach(it => {
    const platillo = menu.find(m=>m.nombre===(it.nombre||it));
    if (platillo?.receta?.length) {
      platillo.receta.forEach(l => {
        const ing = inventario.find(i=>i.id===l.ingId);
        if (!ing) return;
        if (!consumo[ing.nombre]) consumo[ing.nombre] = { unidad:ing.unidad, total:0, costo:0 };
        consumo[ing.nombre].total += l.cantidad*(it.cantidad||1);
        consumo[ing.nombre].costo += l.cantidad*(it.cantidad||1)*ing.costo;
      });
    }
  }));
  const topI = Object.entries(consumo).sort((a,b)=>b[1].total-a[1].total);
  const maxI = topI[0]?.[1].total||1;

  document.getElementById('rep-consumo-ingredientes').innerHTML = topI.slice(0,8).map(([nombre,d])=>`
    <div style="margin-bottom:12px">
      <div class="flex justify-between mb-4">
        <span style="font-size:13px">${nombre}</span>
        <span class="font-mono text-sm">${d.total.toFixed(2)} ${d.unidad} Â· ${fmt(d.costo)}</span>
      </div>
      <div class="stat-bar"><div class="stat-bar-fill" style="width:${d.total/maxI*100}%;background:var(--amber)"></div></div>
    </div>`).join('') || '<div class="empty" style="padding:16px"><div class="empty-text">Agrega recetas a tus platillos para ver el consumo</div></div>';

  // Valor inventario por categorÃ­a
  const valCat = {};
  inventario.forEach(i => {
    if (!valCat[i.categoria]) valCat[i.categoria] = 0;
    valCat[i.categoria] += i.stock * i.costo;
  });
  const totalVal = Object.values(valCat).reduce((s,v)=>s+v,0);
  document.getElementById('rep-valor-inventario').innerHTML = `
    <div style="text-align:center;margin-bottom:16px">
      <div style="font-size:11px;color:var(--text3);margin-bottom:4px">VALOR TOTAL EN INVENTARIO</div>
      <div style="font-size:28px;font-weight:700;color:var(--green);font-family:'DM Mono',monospace">${fmt(totalVal)}</div>
    </div>
    ${Object.entries(valCat).sort((a,b)=>b[1]-a[1]).map(([cat,val])=>`
      <div style="margin-bottom:10px">
        <div class="flex justify-between mb-4">
          <span style="font-size:13px">${cat}</span>
          <span class="font-mono text-sm">${fmt(val)}</span>
        </div>
        <div class="stat-bar"><div class="stat-bar-fill" style="width:${totalVal?val/totalVal*100:0}%;background:var(--amber)"></div></div>
      </div>`).join('')}`;

  // Tabla compras del perÃ­odo
  const dias = getPeriodoDias();
  const desde = new Date(Date.now()-dias*24*60*60*1000);
  const comprasPeriodo = compras.filter(c=>new Date(c.fecha+'T12:00:00')>=desde);
  document.getElementById('rep-tabla-compras').innerHTML = comprasPeriodo.reverse().map(c=>{
    const itemsTexto = c.lineas.slice(0,2).map(l=>l.nombre).join(', ') + (c.lineas.length>2?' +' + (c.lineas.length-2) : '');
    return `<tr>
    <td class="text-dim">${fmtFecha(c.fecha)}</td>
    <td>${c.proveedor||'â€”'}</td>
    <td style="font-size:12px;color:var(--text2)">${itemsTexto}</td>
    <td class="highlight-green font-mono">${fmt(c.total)}</td>
    <td><span class="badge ${c.estado==='recibida'?'badge-green':'badge-amber'}">${c.estado==='recibida'?'Recibida':'Pendiente'}</span></td>
  </tr>`;
  }).join('') || '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text3)">Sin compras en este perÃ­odo</td></tr>';
}

// ---- TAB FINANZAS ----
function renderTabFinanzas(lista) {
  const ventas = lista.reduce((s,p)=>s+(p.subtotal||p.total||0),0);
  const descuentos = lista.reduce((s,p)=>s+(p.descuento||0),0);
  const diasP = getPeriodoDias();
  const desde = new Date(Date.now()-diasP*24*60*60*1000);
  const comprasPeriodo = compras.filter(c=>new Date(c.fecha+'T12:00:00')>=desde);
  const costoCompras = comprasPeriodo.reduce((s,c)=>s+c.total,0);
  const cxpPend = cxp.filter(c=>c.estado!=='pagada').reduce((s,c)=>s+c.monto,0);
  const cxcPend = cxc.filter(c=>c.estado!=='cobrada').reduce((s,c)=>s+c.monto,0);
  const utilidad = ventas - costoCompras;
  const margenNeto = ventas ? (utilidad/ventas*100) : 0;
  const foodCostPct = ventas ? (costoCompras/ventas*100) : 0;

  document.getElementById('rep-resumen-financiero').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:12px">
      ${[
        ['Ingresos por ventas', ventas, 'var(--green)', true],
        ['Descuentos otorgados', -descuentos, 'var(--amber)', false],
        ['Costo de compras (perÃ­odo)', -costoCompras, 'var(--red)', false],
        ['Utilidad bruta estimada', utilidad, utilidad>=0?'var(--green)':'var(--red)', true],
      ].map(([label,val,color,bold])=>`
        <div class="flex justify-between items-center" style="padding:8px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:13px${bold?';font-weight:600':''}">${label}</span>
          <span class="font-mono" style="color:${color};font-weight:${bold?700:400}">${val>=0?fmt(val):'-'+fmt(Math.abs(val))}</span>
        </div>`).join('')}
      <div class="flex justify-between" style="padding:8px 0">
        <span style="font-size:12px;color:var(--text3)">Food cost %</span>
        <span style="font-size:13px;font-weight:600;color:${foodCostPct<=35?'var(--green)':foodCostPct<=50?'var(--amber)':'var(--red)'}">${Math.round(foodCostPct)}%</span>
      </div>
      <div class="flex justify-between" style="padding:8px 0">
        <span style="font-size:12px;color:var(--text3)">Margen neto estimado</span>
        <span style="font-size:13px;font-weight:600;color:${margenNeto>=30?'var(--green)':margenNeto>=10?'var(--amber)':'var(--red)'}">${Math.round(margenNeto)}%</span>
      </div>
    </div>`;

  // CxP por proveedor
  const cxpPorProv = {};
  cxp.filter(c=>c.estado!=='pagada').forEach(c => {
    const k = c.acreedor||c.proveedor||'Sin especificar';
    cxpPorProv[k] = (cxpPorProv[k]||0) + c.monto;
  });
  document.getElementById('rep-cxp-resumen').innerHTML = Object.entries(cxpPorProv).sort((a,b)=>b[1]-a[1]).map(([prov,monto])=>`
    <div class="flex justify-between items-center" style="padding:9px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:13px">${prov}</span>
      <span class="font-mono highlight-red">${fmt(monto)}</span>
    </div>`).join('') || '<div class="empty" style="padding:16px"><div class="empty-text">Sin cuentas pendientes ðŸŽ‰</div></div>';

  // Comparativo: perÃ­odo actual vs anterior
  const diasComp = diasP === 36500 ? 30 : diasP;
  const desdeAnterior = new Date(Date.now()-(diasComp*2)*24*60*60*1000);
  const desdeActual = new Date(Date.now()-diasComp*24*60*60*1000);
  const anterior = pedidos.filter(p=>p.estado!=='Cancelado'&&new Date(p.fecha+'T12:00:00')>=desdeAnterior&&new Date(p.fecha+'T12:00:00')<desdeActual);
  const actual = pedidos.filter(p=>p.estado!=='Cancelado'&&new Date(p.fecha+'T12:00:00')>=desdeActual);
  const vAnt = anterior.reduce((s,p)=>s+(p.subtotal||p.total||0),0);
  const vAct = actual.reduce((s,p)=>s+(p.subtotal||p.total||0),0);
  const diff = vAnt ? ((vAct-vAnt)/vAnt*100) : 0;
  const color = diff>=0?'var(--green)':'var(--red)';
  document.getElementById('rep-comparativo').innerHTML = `
    <div class="grid grid-2" style="gap:14px">
      <div style="text-align:center;padding:20px;background:var(--bg3);border-radius:var(--radius)">
        <div style="font-size:11px;color:var(--text3);margin-bottom:6px">PERÃODO ANTERIOR (${diasComp} dÃ­as)</div>
        <div style="font-size:26px;font-weight:700;font-family:'DM Mono',monospace;color:var(--text2)">${fmt(vAnt)}</div>
        <div style="font-size:12px;color:var(--text3);margin-top:4px">${anterior.length} pedidos</div>
      </div>
      <div style="text-align:center;padding:20px;background:var(--bg3);border-radius:var(--radius);border:1px solid rgba(46,204,113,0.2)">
        <div style="font-size:11px;color:var(--green);font-weight:600;margin-bottom:6px">PERÃODO ACTUAL (${diasComp} dÃ­as)</div>
        <div style="font-size:26px;font-weight:700;font-family:'DM Mono',monospace;color:var(--green)">${fmt(vAct)}</div>
        <div style="font-size:12px;color:var(--text3);margin-top:4px">${actual.length} pedidos Â· <span style="color:${color};font-weight:600">${diff>=0?'+':''}${Math.round(diff)}% vs anterior</span></div>
      </div>
    </div>`;
}

// ---- Exportar CSV ----
function exportarReporteCSV() {
  const lista = pedidosEnPeriodo();
  const filas = [['Fecha','Pedido','Cliente','Canal','Items','Subtotal','Descuento','Total','Pago','Estado']];
  lista.forEach(p => filas.push([
    p.fecha,
    '#'+p.id.slice(-4).toUpperCase(),
    p.cliente,
    p.canal,
    p.items.map(i=>i.nombre||i).join(' | '),
    p.subtotal||p.total||0,
    p.descuento||0,
    p.total||0,
    p.pago||'â€”',
    p.estado
  ]));
  const csv = filas.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `fitgo_reporte_${hoy()}.csv`;
  a.click();
  toast(`CSV exportado â€” ${lista.length} pedidos`);
}

// ========== GASTOS FIJOS ==========
function openNuevoGasto() {
  ['gasto-concepto','gasto-monto','gasto-notas'].forEach(id => document.getElementById(id).value='');
  document.getElementById('gasto-fecha').value = hoy();
  openModal('modal-gasto');
}

function guardarGasto() {
  const concepto = document.getElementById('gasto-concepto').value.trim();
  const monto = parseFloat(document.getElementById('gasto-monto').value)||0;
  if (!concepto || !monto) { toast('Ingresa concepto y monto','error'); return; }
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
  gastos = gastos.filter(g=>g.id!==id);
  save(); renderEstadosFinancieros(); toast('Gasto eliminado');
}

// ========== ESTADOS FINANCIEROS ==========
function getEFPeriodo() {
  const mes = document.getElementById('ef-mes')?.value || 'actual';
  const ahora = new Date();
  let desde, hasta;
  if (mes === 'actual') {
    desde = _fechaLocal(new Date(ahora.getFullYear(), ahora.getMonth(), 1));
    hasta = _fechaLocal(new Date(ahora.getFullYear(), ahora.getMonth()+1, 0));
  } else if (mes === 'anterior') {
    desde = _fechaLocal(new Date(ahora.getFullYear(), ahora.getMonth()-1, 1));
    hasta = _fechaLocal(new Date(ahora.getFullYear(), ahora.getMonth(), 0));
  } else {
    desde = document.getElementById('ef-desde')?.value || _fechaLocal(new Date(ahora.getFullYear(), ahora.getMonth(), 1));
    hasta = document.getElementById('ef-hasta')?.value || hoy();
  }
  return { desde, hasta };
}

function renderEstadosFinancieros() {
  const mesVal = document.getElementById('ef-mes')?.value || 'actual';
  const wrap = document.getElementById('ef-rango-wrap');
  if (wrap) wrap.style.display = mesVal === 'personalizado' ? 'flex' : 'none';

  const { desde, hasta } = getEFPeriodo();

  // Filtrar datos del perÃ­odo
  // Los pedidos se filtran por su fecha efectiva (entrega si existe, si no la de creaciÃ³n)
  // para que coincidan con la fecha de sus gastos/movimientos financieros.
  const _fechaEfectiva = p => p.fechaEntrega || p.fecha;
  const pedEF = pedidos.filter(p => p.estado!=='Cancelado' && _fechaEfectiva(p)>=desde && _fechaEfectiva(p)<=hasta);
  const compEF = compras.filter(c => c.fecha>=desde && c.fecha<=hasta && c.estado==='recibida');
  const gastEF = gastos.filter(g => g.fecha>=desde && g.fecha<=hasta);
  const cxpEF = cxp.filter(c => c.vencimiento>=desde && c.vencimiento<=hasta);
  const cxcEF = cxc.filter(c => c.fecha>=desde && c.fecha<=hasta);

  // EnvÃ­os gratis: ya estÃ¡n en gastos[] con categoria 'Gastos de Venta'
  // No leer de movCaja para evitar doble conteo
  const totalEnviosGratis = 0; // Fuente Ãºnica: gastos[]

  // EnvÃ­os pagados al repartidor en efectivo (solo afectan caja efectivo, NO banco)
  const enviosSalidaMov = movCaja.filter(m=>{const p=pedidos.find(x=>x.id===m.pedidoId);return m.tipo==='envio_salida'&&p&&p.fecha>=desde&&p.fecha<=hasta;});
  const totalEnviosSalida = 0; // envio_salida es siempre en efectivo, no afecta saldo banco

  // Ingresos â€” las CORTESÃAS no generan ingreso (producto regalado), pero sÃ­ cuestan producir
  const pedFacturables = pedEF.filter(p => !p.esCortesia);
  const ingresos = pedFacturables.reduce((s,p)=>s+(p.subtotal||p.total||0),0);
  const descuentos = pedFacturables.reduce((s,p)=>s+(p.descuento||0),0);
  const ingresosNetos = ingresos - descuentos;

  // Ingresos por mÃ©todo (sin cortesÃ­as)
  const ingresosPorMetodo = {};
  pedFacturables.forEach(p => { const m = p.pago||'Otro'; ingresosPorMetodo[m]=(ingresosPorMetodo[m]||0)+(p.subtotal||p.total||0); });

  // Costo de ventas = costo de PRODUCCIÃ“N de los platillos entregados en el perÃ­odo
  const pedEntregados = pedEF.filter(p => p.estado === 'Entregado');
  let costVentas = 0;
  pedEntregados.forEach(p => {
    (p.items || []).forEach(item => {
      let costoUnit = 0;
      // Platillo de menÃº: usar su costo guardado
      const plat = menu.find(m => m.nombre === (item.nombre||item) || m.id === item.id);
      if (plat) costoUnit = plat.costo || 0;
      // Platillo de dieta: buscar costo en la cotizaciÃ³n
      else if (item.esDieta && item.dietaId) {
        const dieta = dietas.find(d => d.id === item.dietaId);
        const pc = dieta?.cotizacion?.platillos?.find(x => x.nombre === item.nombre);
        if (pc) costoUnit = pc.costo || 0;
      }
      costVentas += costoUnit * (item.cantidad || 1);
    });
  });
  const utilidadBruta = ingresosNetos - costVentas;

  // Gastos de venta: envÃ­os absorbidos + merma. 
  // NOTA: el costo de producciÃ³n de las cortesÃ­as ya estÃ¡ contado en costVentas (arriba),
  // por eso se excluye aquÃ­ para no duplicarlo.
  const CATS_GASTO_VENTA = ['Gastos de Venta', 'Gasto de envÃ­o', 'Merma'];
  const gastosVentaDetalle = {};
  const gastosOpDetalle = {};
  gastEF.forEach(g => {
    if (CATS_GASTO_VENTA.includes(g.categoria)) {
      gastosVentaDetalle[g.categoria] = (gastosVentaDetalle[g.categoria]||0) + g.monto;
    } else {
      gastosOpDetalle[g.categoria] = (gastosOpDetalle[g.categoria]||0) + g.monto;
    }
  });
  const gastosVentaFromGastos = Object.values(gastosVentaDetalle).reduce((s,v)=>s+v,0);
  const totalGastosVenta = totalEnviosGratis + gastosVentaFromGastos;
  const gastosOp = Object.values(gastosOpDetalle).reduce((s,v)=>s+v,0);

  const totalGastosOperativos = gastosOp + totalGastosVenta; // Gastos de venta es subcuenta de operativos
  const utilidadOp = utilidadBruta - totalGastosOperativos;

  // â”€â”€ SALDO BANCO â”€â”€
  // Entradas banco: transferencias/tarjeta cobradas en el perÃ­odo
  const movPeriodo = movCaja.filter(m=>{const p=pedidos.find(x=>x.id===m.pedidoId);return p&&p.fecha>=desde&&p.fecha<=hasta;});
  // Banco: usar misma funciÃ³n central que renderBancos
  const _movsBanco = _calcularMovsBanco(desde, hasta);
  const entradasBanco = _movsBanco.filter(m=>m.tipo!=='cxp').reduce((s,m)=>s+m.entrada,0);
  const cxpPagadasTransf = _movsBanco.filter(m=>m.tipo==='cxp').reduce((s,m)=>s+m.salida,0);
  const saldoBanco = entradasBanco - cxpPagadasTransf;

  // Flujo â€” efectivo cobrado NETO (resta envÃ­os absorbidos/gratis que salen de caja, igual que la Caja del dÃ­a)
  const cobradoEfectivoBruto = movPeriodo.filter(m=>(m.tipo==='venta'||!m.tipo)&&m.metodo==='Efectivo').reduce((s,m)=>s+m.monto,0);
  const enviosSalenDeCaja = movPeriodo.filter(m=>(m.tipo==='envio_salida'||m.tipo==='envio_gratis'||m.tipo==='envio_absorbido')&&(m.metodo==='Efectivo'||!m.metodo)).reduce((s,m)=>s+m.monto,0);
  const cobradoEfectivo = cobradoEfectivoBruto - enviosSalenDeCaja;
  const cxcCobradas = cxc.filter(c=>c.estado==='cobrada'&&c.fecha>=desde&&c.fecha<=hasta).reduce((s,c)=>s+c.monto,0);
  const totalEntradas = cobradoEfectivo + entradasBanco + cxcCobradas;
  const cxpPagadasTotal = cxp.filter(c=>c.estado==='pagada'&&(c.fechaPago||'')>=desde&&(c.fechaPago||'')<=hasta).reduce((s,c)=>s+c.monto,0);
  const totalSalidas = costVentas + gastosOp + totalGastosVenta + cxpPagadasTotal;
  const flujoNeto = totalEntradas - totalSalidas;

  // Balance
  const valorInventario = inventario.reduce((s,i)=>s+i.stock*i.costo,0);
  const cxcPendTotal = cxc.filter(c=>c.estado!=='cobrada').reduce((s,c)=>s+c.monto,0);
  const cxpPendTotal = cxp.filter(c=>c.estado!=='pagada').reduce((s,c)=>s+c.monto,0);
  const totalActivos = valorInventario + cxcPendTotal + cobradoEfectivo + entradasBanco;
  const capital = totalActivos - cxpPendTotal;

  const labelPeriodo = `${fmtFecha(desde)} â€“ ${fmtFecha(hasta)}`;

  // â”€â”€ Helper: fila simple â”€â”€
  const filaER = (label, val, bold, color, indent) =>
    `<div class="flex justify-between" style="padding:7px 0;border-bottom:1px solid var(--border);${indent?'padding-left:14px':''}">
      <span style="font-size:${bold?'13.5':'12.5'}px;${bold?'font-weight:600':'color:var(--text2)'}${indent?';color:var(--text2)':''}">${label}</span>
      <span class="font-mono" style="font-size:13px;${bold?'font-weight:700':''}${color?';color:'+color:''}">${val>=0?fmt(val):'-'+fmt(Math.abs(val))}</span>
    </div>`;

  // â”€â”€ Helper: bloque expandible â”€â”€
  let desgloseCont = 0;
  const bloqueDesglose = (titulo, total, detalles, colorTitulo) => {
    const id = 'desglose-' + (desgloseCont++);
    const hayDetalle = Object.entries(detalles).length > 0;
    return `
    <div>
      <div class="flex justify-between items-center" style="padding:7px 0;border-bottom:1px solid var(--border);cursor:${hayDetalle?'pointer':'default'}" onclick="${hayDetalle?`toggleDesglose('${id}')`:''}" >
        <span style="font-size:12.5px;color:var(--text2);display:flex;align-items:center;gap:6px">
          ${hayDetalle?`<span id="${id}-icon" style="font-size:10px;color:var(--text3)">â–¶</span>`:''}
          ${titulo}
        </span>
        <span class="font-mono" style="font-size:13px;${colorTitulo?'color:'+colorTitulo:''}">${fmt(total)}</span>
      </div>
      ${hayDetalle?`<div id="${id}" style="display:none;background:var(--bg3);border-radius:0 0 6px 6px;padding:0 12px">
        ${Object.entries(detalles).map(([k,v])=>`
          <div class="flex justify-between" style="padding:5px 0;border-bottom:1px solid var(--border);font-size:12px">
            <span style="color:var(--text2)">${k}</span>
            <span class="font-mono">${fmt(v)}</span>
          </div>`).join('')}
      </div>`:''}
    </div>`;
  };

  // â”€â”€ ESTADO DE RESULTADOS â”€â”€
  document.getElementById('ef-resultados').innerHTML = `
    <div style="font-size:11px;color:var(--text3);margin-bottom:12px">ðŸ“… ${labelPeriodo}</div>

    <div style="font-size:11px;font-weight:700;color:var(--green);padding:4px 0;margin-bottom:2px">INGRESOS</div>
    ${bloqueDesglose('Ingresos por ventas', ingresos, ingresosPorMetodo, 'var(--green)')}
    ${filaER('(-) Descuentos', descuentos, false, 'var(--amber)', true)}
    ${filaER('= Ingresos netos', ingresosNetos, true, 'var(--green)')}
    <div style="height:8px"></div>

    <div style="font-size:11px;font-weight:700;color:var(--red);padding:4px 0;margin-bottom:2px">COSTO DE VENTAS</div>
    ${bloqueDesglose('Compras de insumos', costVentas,
      Object.fromEntries(compEF.map(c=>[c.proveedor||'Sin proveedor', c.total])), 'var(--red)')}
    ${filaER('= Utilidad bruta', utilidadBruta, true, utilidadBruta>=0?'var(--green)':'var(--red)')}
    <div style="height:8px"></div>

    <div style="font-size:11px;font-weight:700;color:var(--red);padding:4px 0;margin-bottom:2px">GASTOS OPERATIVOS</div>
    ${bloqueDesglose('Gastos generales', gastosOp, gastosOpDetalle, 'var(--red)')}
    ${bloqueDesglose('Gastos de venta (envÃ­os, merma, cortesÃ­as)', totalGastosVenta, gastosVentaDetalle, 'var(--amber)')}
    ${filaER('= Total gastos operativos', totalGastosOperativos, true, 'var(--red)')}
    <div style="height:8px"></div>

    <div style="padding:10px;background:${utilidadOp>=0?'var(--green-dim)':'var(--red-dim)'};border-radius:6px;margin-top:4px">
      <div class="flex justify-between">
        <span style="font-weight:700">UTILIDAD OPERATIVA</span>
        <span class="font-mono" style="font-weight:700;font-size:16px;color:${utilidadOp>=0?'var(--green)':'var(--red)'}">${fmt(Math.abs(utilidadOp))} ${utilidadOp<0?'âš ':''}</span>
      </div>
      <div style="font-size:11px;color:var(--text3);margin-top:4px">Margen: ${ingresosNetos?Math.round(utilidadOp/ingresosNetos*100):0}%</div>
    </div>

  `;

  // â”€â”€ BALANCE GENERAL â”€â”€
  document.getElementById('ef-balance').innerHTML = `
    <div style="font-size:11px;color:var(--text3);margin-bottom:12px">ðŸ“… Al ${fmtFecha(hasta)}</div>
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
        <span class="font-mono" style="font-weight:700;font-size:16px;color:${capital>=0?'var(--green)':'var(--red)'}">${fmt(Math.abs(capital))}</span>
      </div>
      <div style="font-size:11px;color:var(--text3);margin-top:4px">Activos âˆ’ Pasivos</div>
    </div>`;

  // â”€â”€ FLUJO DE EFECTIVO â”€â”€
  document.getElementById('ef-flujo').innerHTML = `
    <div style="font-size:11px;color:var(--text3);margin-bottom:12px">ðŸ“… ${labelPeriodo}</div>
    <div style="font-size:11px;font-weight:700;color:var(--green);margin-bottom:6px">ENTRADAS</div>
    ${filaER('Cobros en efectivo', cobradoEfectivo, false, 'var(--green)')}
    ${filaER('Cobros banco (transf/tarjeta)', entradasBanco, false, 'var(--blue)')}
    ${filaER('CxC cobradas', cxcCobradas, false, 'var(--green)')}
    ${filaER('TOTAL ENTRADAS', totalEntradas, true, 'var(--green)')}
    <div style="height:12px"></div>
    <div style="font-size:11px;font-weight:700;color:var(--red);margin-bottom:6px">SALIDAS</div>
    ${filaER('Compras de insumos', costVentas, false, 'var(--red)')}
    ${filaER('Gastos operativos', totalGastosOperativos, false, 'var(--red)')}
    ${filaER('CxP pagadas', cxpPagadasTotal, false, 'var(--red)')}
    ${filaER('TOTAL SALIDAS', totalSalidas, true, 'var(--red)')}
    <div style="height:8px"></div>
    <div style="padding:10px;background:${flujoNeto>=0?'var(--green-dim)':'var(--red-dim)'};border-radius:6px;margin-top:4px">
      <div class="flex justify-between">
        <span style="font-weight:700">FLUJO NETO</span>
        <span class="font-mono" style="font-weight:700;font-size:16px;color:${flujoNeto>=0?'var(--green)':'var(--red)'}">${fmt(Math.abs(flujoNeto))} ${flujoNeto<0?'âš ':''}</span>
      </div>
      <div style="font-size:11px;color:var(--text3);margin-top:4px">${flujoNeto>=0?'Flujo positivo âœ…':'Flujo negativo âš '}</div>
    </div>`;

  // â”€â”€ TABLA GASTOS â”€â”€
  const tbody = document.getElementById('ef-tabla-gastos');
  const recLabel = {no:'Ãšnico',mensual:'Mensual',semanal:'Semanal'};
  tbody.innerHTML = gastos.sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(g=>`<tr>
    <td style="font-weight:500">${g.concepto}</td>
    <td><span class="badge badge-gray">${g.categoria}</span></td>
    <td class="highlight-red font-mono">${fmt(g.monto)}</td>
    <td class="text-dim">${fmtFecha(g.fecha)}</td>
    <td><span class="badge ${g.recurrente!=='no'?'badge-amber':'badge-gray'}">${recLabel[g.recurrente]||'â€”'}</span></td>
    <td><button class="btn btn-danger btn-sm" onclick="eliminarGasto('${g.id}')">ðŸ—‘</button></td>
  </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text3)">Sin gastos registrados</td></tr>';
}

function toggleDesglose(id) {
  const el = document.getElementById(id);
  const icon = document.getElementById(id+'-icon');
  if (!el) return;
  const open = el.style.display !== 'none';
  el.style.display = open ? 'none' : 'block';
  if (icon) icon.textContent = open ? 'â–¶' : 'â–¼';
}

function exportarEstadosCSV() {
  const { desde, hasta } = getEFPeriodo();
  const gastEF = gastos.filter(g=>g.fecha>=desde&&g.fecha<=hasta);
  const filas = [['Tipo','Concepto','CategorÃ­a','Monto','Fecha']];
  const pedEF = pedidos.filter(p=>p.estado!=='Cancelado'&&p.fecha>=desde&&p.fecha<=hasta);
  pedEF.forEach(p=>filas.push(['Ingreso',`Pedido #${p.id.slice(-4).toUpperCase()} - ${p.cliente}`,'Ventas',p.subtotal||p.total||0,p.fecha]));
  gastEF.forEach(g=>filas.push(['Gasto',g.concepto,g.categoria,g.monto,g.fecha]));
  compras.filter(c=>c.fecha>=desde&&c.fecha<=hasta).forEach(c=>filas.push(['Compra',`Compra ${c.proveedor||''}`.trim(),'Insumos',c.total,c.fecha]));
  const csv = filas.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `fitgo_estados_${desde}_${hasta}.csv`;
  a.click();
  toast('Estados exportados a CSV');
}

// ========== AUTH & USUARIOS ==========
let usuarios = DB.get('usuarios') || [
  { id:'u1', nombre:'Administrador', user:'admin', pass:'fitgo2024', rol:'admin', activo:true },
  { id:'u2', nombre:'Operador Caja', user:'caja', pass:'caja2024', rol:'caja', activo:true },
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
  pedidos:'ðŸ§¾ Pedidos', menu:'ðŸ¥™ MenÃº', dietas:'ðŸ“‹ Dietas',
  inventario:'ðŸ“¦ Inventario', caja:'ðŸ’° Caja del dÃ­a', proveedores:'ðŸš› Proveedores',
  cxp:'ðŸ“¤ Cuentas por pagar', cxc:'ðŸ“¥ Cuentas por cobrar', compras:'ðŸ›’ Compras',
  clientes:'ðŸ‘¤ Clientes', reportes:'ðŸ“ˆ Reportes', importar:'ðŸ“¥ Carga masiva'
};

function doLogin() {
  const user = document.getElementById('login-user').value.trim().toLowerCase();
  const pass = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-error');
  const u = usuarios.find(x => x.user.toLowerCase()===user && x.pass===pass && x.activo);
  if (!u) { errEl.style.display='block'; return; }
  errEl.style.display='none';
  sesionActual = u;
  DB.set('sesion', { id:u.id, user:u.user, rol:u.rol, nombre:u.nombre });
  document.getElementById('login-screen').style.display='none';
  document.getElementById('sidebar-nombre').textContent = u.nombre;
  document.getElementById('sidebar-rol').textContent = u.rol==='admin'?'Administrador':'Operador / Caja';
  document.getElementById('sidebar-avatar').textContent = u.nombre[0].toUpperCase();
  aplicarPermisos();
  renderDashboard();
}

function doLogout() {
  sesionActual = null;
  DB.set('sesion', null);
  document.getElementById('login-screen').style.display='flex';
  document.getElementById('login-user').value='';
  document.getElementById('login-pass').value='';
}

function aplicarPermisos() {
  if (!sesionActual) return;
  const isAdmin = sesionActual.rol === 'admin';
  // SecciÃ³n admin siempre visible solo para admin
  document.getElementById('nav-admin-section').style.display = isAdmin ? 'block' : 'none';
  if (isAdmin) return; // Admin ve todo
  // Caja: ocultar nav items segÃºn permisos
  const navMap = {
    pedidos:'nav-item', menu:'nav-item', dietas:'nav-item', inventario:'nav-item',
    caja:'nav-item', proveedores:'nav-item', cxp:'nav-item', cxc:'nav-item',
    compras:'nav-item', clientes:'nav-item', reportes:'nav-item', bancos:'nav-item'
  };
  document.querySelectorAll('.nav-item').forEach(el => {
    const onclick = el.getAttribute('onclick')||'';
    const modulo = Object.keys(navMap).find(k=>onclick.includes("'"+k+"'"));
    if (modulo && !permisosCaja[modulo]) el.style.display='none';
    else if (modulo) el.style.display='';
  });
}

// ---- GestiÃ³n de usuarios ----
let usrRolActual = 'admin';
let usrEditId = null;

function renderUsuarios() {
  const lista = document.getElementById('usuarios-lista');
  lista.innerHTML = usuarios.map(u=>`
    <div class="flex items-center gap-10" style="padding:10px 0;border-bottom:1px solid var(--border)">
      <div class="avatar" style="background:${u.rol==='admin'?'var(--green-dim)':'var(--blue-dim)'};color:${u.rol==='admin'?'var(--green)':'var(--blue)'}">${u.nombre[0]}</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:500">${u.nombre} <span style="font-size:11px;color:var(--text3)">@${u.user}</span></div>
        <div style="font-size:11px;color:${u.rol==='admin'?'var(--green)':'var(--blue)'}">
          ${u.rol==='admin'?'ðŸ‘‘ Administrador':'ðŸ§¾ Caja / Operador'}
        </div>
      </div>
      <div class="flex gap-6">
        <button class="btn btn-secondary btn-sm" onclick="toggleUsuario('${u.id}')" style="color:${u.activo?'var(--green)':'var(--red)'}">
          ${u.activo?'âœ“ Activo':'âœ— Inactivo'}
        </button>
        ${u.id!=='u1'?`<button class="btn btn-danger btn-sm" onclick="eliminarUsuario('${u.id}')">ðŸ—‘</button>`:''}
      </div>
    </div>`).join('');

  // Permisos caja
  const permEl = document.getElementById('permisos-lista');
  permEl.innerHTML = Object.entries(MODULOS_LABELS).map(([mod,label])=>`
    <div class="flex items-center justify-between" style="padding:8px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:13px">${label}</span>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
        <span style="font-size:12px;color:${permisosCaja[mod]?'var(--green)':'var(--red)'}" id="perm-label-${mod}">${permisosCaja[mod]?'Habilitado':'Deshabilitado'}</span>
        <div style="position:relative;width:36px;height:20px" onclick="togglePermiso('${mod}')">
          <div style="position:absolute;inset:0;background:${permisosCaja[mod]?'var(--green)':'var(--bg4)'};border-radius:10px;transition:background 0.2s"></div>
          <div style="position:absolute;top:2px;left:${permisosCaja[mod]?'18':'2'}px;width:16px;height:16px;background:#fff;border-radius:50%;transition:left 0.2s"></div>
        </div>
      </label>
    </div>`).join('');
}

function togglePermiso(mod) {
  permisosCaja[mod] = !permisosCaja[mod];
  DB.set('permisosCaja', permisosCaja);
  renderUsuarios();
  if (sesionActual?.rol==='caja') aplicarPermisos();
  toast(`Permiso "${MODULOS_LABELS[mod]}" ${permisosCaja[mod]?'habilitado':'deshabilitado'}`);
}

function openNuevoUsuario() {
  usrEditId = null; usrRolActual = 'admin';
  document.getElementById('usuario-modal-title').textContent = 'Nuevo Usuario';
  ['usr-nombre','usr-user','usr-pass'].forEach(id=>document.getElementById(id).value='');
  document.querySelectorAll('#usr-rol-chips .chip').forEach((c,i)=>c.classList.toggle('active',i===0));
  openModal('modal-usuario');
}

function setUsrRol(el, rol) {
  usrRolActual = rol;
  document.querySelectorAll('#usr-rol-chips .chip').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
}

function guardarUsuario() {
  const nombre = document.getElementById('usr-nombre').value.trim();
  const user = document.getElementById('usr-user').value.trim().toLowerCase();
  const pass = document.getElementById('usr-pass').value;
  if (!nombre||!user||!pass) { toast('Completa todos los campos','error'); return; }
  if (usuarios.find(u=>u.user===user&&u.id!==usrEditId)) { toast('Ese usuario ya existe','error'); return; }
  usuarios.push({ id:uid(), nombre, user, pass, rol:usrRolActual, activo:true });
  DB.set('usuarios', usuarios);
  closeModal('modal-usuario');
  toast('Usuario creado');
  renderUsuarios();
}

function toggleUsuario(id) {
  if (id==='u1') { toast('No puedes desactivar el admin principal','error'); return; }
  const u = usuarios.find(x=>x.id===id);
  if (u) { u.activo=!u.activo; DB.set('usuarios',usuarios); renderUsuarios(); toast(`Usuario ${u.activo?'activado':'desactivado'}`); }
}

function eliminarUsuario(id) {
  if (id==='u1') return;
  usuarios = usuarios.filter(u=>u.id!==id);
  DB.set('usuarios',usuarios); renderUsuarios(); toast('Usuario eliminado');
}

// ========== IMPORTAR (XLSX/CSV) ==========
// Usar SheetJS via CDN (se carga dinÃ¡micamente)
async function cargarSheetJS() {
  if (window.XLSX) return;
  await new Promise((res,rej)=>{
    const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload=res; s.onerror=rej;
    document.head.appendChild(s);
  });
}

async function importarArchivo(input, tipo) {
  const file = input.files[0]; if (!file) return;
  const resEl = document.getElementById('res-'+tipo);
  resEl.innerHTML = '<span style="color:var(--text3)">â³ Leyendo archivo...</span>';
  try {
    await cargarSheetJS();
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, {type:'array'});
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, {defval:''});
    if (!rows.length) { resEl.innerHTML='<span style="color:var(--amber)">âš  El archivo estÃ¡ vacÃ­o</span>'; return; }
    let count = 0;
    if (tipo==='clientes') count = importarClientes(rows);
    else if (tipo==='insumos') count = importarInsumos(rows);
    else if (tipo==='proveedores') count = importarProveedores(rows);
    else if (tipo==='recetas') count = importarRecetas(rows);
    else if (tipo==='recetas_insumos') count = importarRecetasInsumos(rows);
    else if (tipo==='ventas') count = importarVentas(rows);
    else if (tipo==='platillos_personalizados') { importarPlatillosPersonalizados(rows); count = rows.length; }
    save();
    resEl.innerHTML=`<span style="color:var(--green)">âœ… ${count} registros importados correctamente</span>`;
    toast(`${count} ${tipo} importados`);
  } catch(e) {
    resEl.innerHTML=`<span style="color:var(--red)">âŒ Error: ${e.message}</span>`;
    toast('Error al leer el archivo','error');
  }
  input.value='';
}

function normalizar(obj, campos) {
  // Buscar columna ignorando mayÃºsculas/tildes
  const keys = Object.keys(obj);
  const find = (nombre) => {
    const n = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const k = keys.find(k=>k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')=== n);
    return k ? String(obj[k]).trim() : '';
  };
  const result = {};
  campos.forEach(c => result[c] = find(c));
  return result;
}

function importarClientes(rows) {
  let count=0;
  rows.forEach(r=>{
    const d = normalizar(r,['nombre','telefono','canal','notas']);
    if (!d.nombre) return;
    if (clientes.find(c=>c.nombre.toLowerCase()===d.nombre.toLowerCase())) return;
    clientes.push({ id:uid(), nombre:d.nombre, tel:d.telefono||'', canal:d.canal||'WhatsApp', tieneDieta:false, pedidos:0, ultimoPedido:null, notas:d.notas||'' });
    count++;
  });
  return count;
}

function importarInsumos(rows) {
  let count=0;
  rows.forEach(r=>{
    const d = normalizar(r,['nombre','categoria','stock','minimo','unidad','costo']);
    if (!d.nombre) return;
    if (inventario.find(i=>i.nombre.toLowerCase()===d.nombre.toLowerCase())) {
      const ing=inventario.find(i=>i.nombre.toLowerCase()===d.nombre.toLowerCase());
      if (d.stock) ing.stock=parseFloat(d.stock)||ing.stock;
      if (d.costo) ing.costo=parseFloat(d.costo)||ing.costo;
      count++; return;
    }
    inventario.push({ id:uid(), nombre:d.nombre, categoria:d.categoria||'Otros', stock:parseFloat(d.stock)||0, minimo:parseFloat(d.minimo)||0, unidad:d.unidad||'kg', costo:parseFloat(d.costo)||0, proveedor:'' });
    count++;
  });
  return count;
}

function importarProveedores(rows) {
  let count=0;
  rows.forEach(r=>{
    const d = normalizar(r,['nombre','contacto','telefono','categoria','dias','notas']);
    if (!d.nombre) return;
    if (proveedores.find(p=>p.nombre.toLowerCase()===d.nombre.toLowerCase())) return;
    proveedores.push({ id:uid(), nombre:d.nombre, contacto:d.contacto||'', tel:d.telefono||'', categoria:d.categoria||'Otro', dias:d.dias||'', notas:d.notas||'' });
    count++;
  });
  return count;
}

function importarRecetas(rows) {
  let count=0;
  rows.forEach(r=>{
    const d = normalizar(r,['nombre','categoria','precio','costo','calorias','descripcion']);
    if (!d.nombre) return;
    if (menu.find(m=>m.nombre.toLowerCase()===d.nombre.toLowerCase())) return;
    menu.push({ id:uid(), nombre:d.nombre, categoria:d.categoria||'Comida', precio:parseFloat(d.precio)||0, costo:parseFloat(d.costo)||0, calorias:parseInt(d.calorias)||0, desc:d.descripcion||'', etiquetas:[], disponible:true, receta:[] });
    count++;
  });
  return count;
}

function importarRecetasInsumos(rows) {
  // Cada fila: platillo, insumo, cantidad, unidad
  // Agrupa por platillo y construye la receta con costos automÃ¡ticos
  let platillosActualizados = new Set();
  let advertencias = [];

  // Agrupar filas por nombre de platillo
  const grupos = {};
  rows.forEach(r => {
    const d = normalizar(r, ['platillo','insumo','cantidad','unidad']);
    if (!d.platillo || !d.insumo) return;
    if (!grupos[d.platillo]) grupos[d.platillo] = [];
    grupos[d.platillo].push(d);
  });

  Object.entries(grupos).forEach(([nombrePlatillo, lineas]) => {
    // Buscar o crear el platillo en el menÃº
    let platillo = menu.find(m => m.nombre.toLowerCase() === nombrePlatillo.toLowerCase());
    if (!platillo) {
      platillo = { id:uid(), nombre:nombrePlatillo, categoria:'Comida', precio:0, costo:0, calorias:0, desc:'', etiquetas:[], disponible:true, receta:[] };
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
        recetaLineas.push({ ingId:'', nombre:linea.insumo, cantidad, unidad:linea.unidad||'', costoLinea:0 });
        return;
      }

      const costoLinea = ing.costo * cantidad;
      costoTotal += costoLinea;
      recetaLineas.push({ ingId:ing.id, nombre:ing.nombre, cantidad, unidad:linea.unidad||ing.unidad, costoLinea });
    });

    // Actualizar platillo
    platillo.receta = recetaLineas;
    platillo.costo = costoTotal;
    platillosActualizados.add(nombrePlatillo);
  });

  // Mostrar advertencias si hubo insumos no encontrados
  if (advertencias.length) {
    setTimeout(() => toast(`âš  Insumos no encontrados en inventario: ${[...new Set(advertencias)].join(', ')}. Verifica los nombres.`, 'error'), 800);
  }

  return platillosActualizados.size;
}

function importarPlatillosPersonalizados(rows) {
  let importados = 0;
  rows.forEach(row => {
    const nombre = row.nombre || row.Nombre || '';
    const clienteNombre = row.cliente || row.Cliente || '';
    const tiempo = row.tiempo_comida || row.Tiempo || 'Comida';
    const precio = parseFloat(row.precio_venta || row.Precio || 0) || 0;
    const notas = row.notas || row.Notas || '';
    if (!nombre) return;
    // Buscar la dieta del cliente
    const cliente = clientes.find(c => c.nombre.toLowerCase().includes(clienteNombre.toLowerCase()));
    const dieta = dietas.find(d => (cliente && d.clienteId === cliente.id) || d.clienteNombre.toLowerCase().includes(clienteNombre.toLowerCase()));
    if (dieta) {
      if (!dieta.cotizacion) dieta.cotizacion = { platillos: [], margen: 40, preciodia: 0, preciosemana: 0, preciomes: 0, notas: '', fecha: hoy() };
      if (!dieta.cotizacion.platillos) dieta.cotizacion.platillos = [];
      dieta.cotizacion.platillos.push({ nombre, tiempo, costo: 0, precioVenta: precio, notas, lineas: [] });
      // Recalcular precio dieta
      const totalVenta = dieta.cotizacion.platillos.reduce((s, p) => s + (p.precioVenta || 0), 0);
      dieta.cotizacion.preciodia = totalVenta;
      dieta.cotizacion.preciosemana = totalVenta * 7;
      dieta.cotizacion.preciomes = totalVenta * 30;
    }
    importados++;
  });
  save();
  const el = document.getElementById('res-platillos_personalizados');
  if (el) el.innerHTML = `<div style="color:var(--green);font-size:12px;margin-top:8px">âœ“ ${importados} platillo(s) personalizados importados</div>`;
  toast(`${importados} platillos personalizados importados`);
}

function importarVentas(rows) {
  let count=0;
  rows.forEach(r=>{
    const d = normalizar(r,['fecha','cliente','platillo','cantidad','total','canal','pago']);
    if (!d.fecha||!d.total) return;
    const fechaStr = d.fecha.includes('/')
      ? d.fecha.split('/').reverse().join('-')
      : d.fecha.substring(0,10);
    const p = {
      id:uid(), cliente:d.cliente||'Importado', clienteId:'',
      canal:d.canal||'WhatsApp', pago:d.pago||'Efectivo',
      items:[{nombre:d.platillo||'Venta importada',precio:parseFloat(d.total)||0,cantidad:parseInt(d.cantidad)||1}],
      subtotal:parseFloat(d.total)||0, total:parseFloat(d.total)||0,
      descuento:0, modoEnvio:'sin_envio', costoEnvio:0,
      estado:'Entregado', fecha:fechaStr, hora:'00:00', horaStr:'00:00', createdAt:Date.now()
    };
    pedidos.push(p);
    movCaja.push({ hora:'00:00', pedidoId:p.id, cliente:p.cliente, metodo:p.pago, monto:p.total, tipo:'venta', estado:'Cobrado' });
    count++;
  });
  return count;
}

function descargarPlantillas() {
  const plantillas = {
    'clientes': [['nombre','telefono','canal','notas'],['MarÃ­a GonzÃ¡lez','999-123-4567','WhatsApp','Sin lactosa']],
    'insumos': [['nombre','categoria','stock','minimo','unidad','costo'],['Pechuga de pollo','ProteÃ­nas','10','5','kg','95']],
    'proveedores': [['nombre','contacto','telefono','categoria','dias','notas'],['Carnes Don Pepe','JosÃ© PÃ©rez','999-500-0001','Carnes y proteÃ­nas','Lunes, Jueves','Pago semanal']],
    'recetas': [['nombre','categoria','precio','costo','calorias','descripcion'],['Bowl de pollo','Comida','145','52','480','Pollo a la plancha con quinoa']],
    'recetas_insumos': [
      ['platillo','insumo','cantidad','unidad'],
      ['Bowl de pollo','Pechuga de pollo','0.2','kg'],
      ['Bowl de pollo','Quinoa','0.08','kg'],
      ['Bowl de pollo','Espinacas','0.05','kg'],
      ['Wrap de atÃºn','AtÃºn en agua','0.1','kg'],
      ['Wrap de atÃºn','Tortilla integral','1','pza'],
    ],
    'ventas': [['fecha','cliente','platillo','cantidad','total','canal','pago'],['2024-01-15','MarÃ­a GonzÃ¡lez','Bowl de pollo','1','145','WhatsApp','Efectivo']],
    'platillos_personalizados': [['nombre','cliente','tiempo_comida','precio_venta','notas'],['Bowl proteico','MarÃ­a GonzÃ¡lez','Comida','145','Sin gluten']],
  };
  Object.entries(plantillas).forEach(([nombre, datos]) => {
    const csv = datos.map(r=>r.map(v=>`"${v}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=`plantilla_${nombre}.csv`;
    a.click();
  });
  toast('7 plantillas descargadas');
}

function renderImportar() {} // pÃ¡gina estÃ¡tica, no necesita render dinÃ¡mico

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
    if (!empty) { empty = document.createElement('div'); empty.className = 'menu-empty-search'; empty.style.cssText='padding:14px;text-align:center;font-size:12px;color:var(--text3)'; sel.appendChild(empty); }
    empty.textContent = `Sin platillos con "${q}"`;
  } else if (empty) empty.remove();
}

function actualizarConteoSel() {
  const n = Object.keys(itemsPedidoActual).length;
  const el = document.getElementById('menu-conteo-sel');
  if (el) el.textContent = n === 0 ? '0 seleccionados' : `${n} seleccionado${n>1?'s':''}`;
}

// ========== FECHA / CALENDARIO PEDIDOS ==========
let calMesActual = new Date();
let calFechaSeleccionada = null;
let vistaCalActiva = false;

function onChangeFechaPedido(val) {
  const hoyStr = hoy();
  const badge = document.getElementById('pedido-fecha-badge');
  const hint  = document.getElementById('pedido-fecha-hint');
  const title = document.getElementById('pedido-modal-title');
  const sub   = document.getElementById('pedido-modal-sub');
  if (!val || val === hoyStr) {
    if (badge) { badge.textContent = 'ðŸ“… Hoy'; badge.className = 'badge badge-green'; }
    if (hint)  hint.textContent = 'Registro normal';
    if (title) title.textContent = 'Nuevo Pedido';
    if (sub)   sub.textContent = 'Pedido del dÃ­a de hoy';
  } else if (val < hoyStr) {
    if (badge) { badge.textContent = 'ðŸ“‹ Pasado'; badge.className = 'badge badge-amber'; }
    if (hint)  hint.textContent = 'Registrando pedido de fecha anterior';
    if (title) title.textContent = 'Registrar Pedido Anterior';
    if (sub)   sub.textContent = `Fecha: ${fmtFecha(val)}`;
  } else {
    if (badge) { badge.textContent = 'ðŸ—“ Agendado'; badge.className = 'badge badge-blue'; }
    if (hint)  hint.textContent = 'Pedido agendado a futuro';
    if (title) title.textContent = 'Agendar Pedido';
    if (sub)   sub.textContent = `Para: ${fmtFecha(val)}`;
  }
}

function openNuevoPedidoFecha(fecha) {
  // Al elegir un dÃ­a en el calendario, ese dÃ­a se vuelve el "dÃ­a de trabajo"
  if (fecha) {
    _diaTrabajo = fecha;
    const inp = document.getElementById('dia-trabajo');
    if (inp) inp.value = fecha;
  }
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
  if (btn) { btn.textContent = vistaCalActiva ? 'âœ• Cerrar calendario' : 'ðŸ“… Calendario'; btn.className = vistaCalActiva ? 'btn btn-secondary btn-sm' : 'btn btn-secondary btn-sm'; }
  if (vistaCalActiva) renderCalendario();
}

function navCalendario(delta) {
  calMesActual = new Date(calMesActual.getFullYear(), calMesActual.getMonth() + delta, 1);
  renderCalendario();
}

function renderCalendario() {
  const aÃ±o = calMesActual.getFullYear();
  const mes = calMesActual.getMonth();
  const titulo = calMesActual.toLocaleDateString('es-MX', { month:'long', year:'numeric' });
  const tituloEl = document.getElementById('cal-titulo-mes');
  if (tituloEl) tituloEl.textContent = titulo.charAt(0).toUpperCase() + titulo.slice(1);

  // Construir mapa de pedidos por fecha
  const porFecha = {};
  pedidos.forEach(p => {
    if (!porFecha[p.fecha]) porFecha[p.fecha] = { count:0, total:0 };
    porFecha[p.fecha].count++;
    porFecha[p.fecha].total += (p.total || 0);
  });

  const primerDia = new Date(aÃ±o, mes, 1).getDay(); // 0=Dom
  const diasMes = new Date(aÃ±o, mes+1, 0).getDate();
  const hoyStr = hoy();

  const grid = document.getElementById('cal-grid');
  if (!grid) return;

  let celdas = [];
  // Celdas vacÃ­as al inicio
  for (let i = 0; i < primerDia; i++) celdas.push(`<div></div>`);
  // DÃ­as del mes
  for (let d = 1; d <= diasMes; d++) {
    const fechaStr = `${aÃ±o}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const data = porFecha[fechaStr];
    const esHoy = fechaStr === hoyStr;
    const esSel = fechaStr === calFechaSeleccionada;
    const esFuturo = fechaStr > hoyStr;
    const borderColor = esSel ? 'var(--green)' : esHoy ? 'rgba(46,204,113,0.4)' : 'var(--border)';
    const bg = esSel ? 'var(--green-dim)' : esHoy ? 'rgba(46,204,113,0.07)' : esFuturo ? 'var(--bg3)' : 'var(--bg2)';
    celdas.push(`
      <div onclick="seleccionarDiaCal('${fechaStr}')" style="min-height:62px;border:1px solid ${borderColor};border-radius:8px;padding:7px 8px;cursor:pointer;background:${bg};transition:all 0.1s"
           onmouseover="this.style.borderColor='var(--border2)'" onmouseout="this.style.borderColor='${borderColor}'">
        <div style="font-size:12px;font-weight:${esHoy?'700':'500'};color:${esHoy?'var(--green)':esFuturo?'var(--text3)':'var(--text)'};margin-bottom:4px">${d}${esHoy?' â—':''}</div>
        ${data ? `
          <div style="font-size:10px;font-weight:600;color:var(--green)">${data.count} ped.</div>
          <div style="font-size:10px;color:var(--text3)">${fmt(data.total).replace('MX$','$')}</div>
        ` : esFuturo ? '' : `<div style="font-size:10px;color:var(--text3)">â€”</div>`}
      </div>`);
  }
  grid.innerHTML = celdas.join('');
}

function seleccionarDiaCal(fecha) {
  calFechaSeleccionada = fecha;
  renderCalendario(); // re-render para marcar selecciÃ³n
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
      <div style="font-size:12px;color:var(--text2);margin-top:4px">${(p.items||[]).slice(0,3).map(i=>i.nombre||i).join(', ')}</div>
      <div class="flex justify-between mt-4">
        <span style="font-size:11px;color:var(--text3)">${p.horaStr||''} Â· ${p.canal}</span>
        <span class="font-mono highlight-green" style="font-size:13px">${fmt(p.total)}</span>
      </div>
    </div>`).join('') + '</div>';
}

// ========== CATEGORÃAS ==========
let categModalTipo = 'insumos';

function openGestionCategorias(tipo) {
  categModalTipo = tipo;
  document.getElementById('categ-modal-title').textContent =
    tipo === 'insumos' ? 'CategorÃ­as de Insumos' : 'CategorÃ­as del MenÃº';
  document.getElementById('nueva-categ-input').value = '';
  renderListaCategorias();
  openModal('modal-categorias');
}

function renderListaCategorias() {
  const lista = categModalTipo === 'insumos' ? categoriasInsumos : categoriasMenu;
  document.getElementById('lista-categorias').innerHTML = lista.map((c, i) => `
    <div class="flex items-center justify-between" style="padding:9px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:13px">${c}</span>
      <button class="btn btn-danger btn-sm" onclick="eliminarCategoria(${i})">ðŸ—‘</button>
    </div>`).join('') || '<div style="text-align:center;padding:24px;color:var(--text3);font-size:13px">Sin categorÃ­as</div>';
}

function agregarCategoria() {
  const val = document.getElementById('nueva-categ-input').value.trim();
  if (!val) return;
  const lista = categModalTipo === 'insumos' ? categoriasInsumos : categoriasMenu;
  if (lista.includes(val)) { toast('Esa categorÃ­a ya existe', 'error'); return; }
  lista.push(val);
  save();
  document.getElementById('nueva-categ-input').value = '';
  renderListaCategorias();
  actualizarSelectsCategorias();
  toast(`CategorÃ­a "${val}" agregada`);
}

function eliminarCategoria(idx) {
  const lista = categModalTipo === 'insumos' ? categoriasInsumos : categoriasMenu;
  const nombre = lista[idx];
  lista.splice(idx, 1);
  save();
  renderListaCategorias();
  actualizarSelectsCategorias();
  toast(`CategorÃ­a "${nombre}" eliminada`);
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
    filtroIng.innerHTML = '<option value="">Todas las categorÃ­as</option>' +
      categoriasInsumos.map(c => `<option ${c===sel?'selected':''}>${c}</option>`).join('');
  }
  // Actualizar chips del menÃº
  const chipsWrap = document.getElementById('menu-categ-chips');
  if (chipsWrap) {
    const active = document.querySelector('#menu-categ-chips .chip.active')?.textContent || 'Todas';
    chipsWrap.innerHTML = `<span class="chip ${categoriaFiltro==='todas'?'active':''}" onclick="filtrarCategoria(this,'todas')">Todas</span>` +
      categoriasMenu.map(c => `<span class="chip ${categoriaFiltro===c?'active':''}" onclick="filtrarCategoria(this,'${c}')">${c}</span>`).join('');
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
      ${p.desc ? `<div style="font-size:12px;color:var(--text3);margin-bottom:10px;line-height:1.5">${p.desc.substring(0,80)}${p.desc.length>80?'â€¦':''}</div>` : ''}
      <div style="font-size:12px;color:var(--text2);margin-bottom:10px">
        ${(p.lineas||[]).length} insumo${(p.lineas||[]).length!==1?'s':''}:
        ${(p.lineas||[]).slice(0,3).map(l => {
          const ing = inventario.find(i => i.id === l.ingId);
          return ing ? `<span style="color:var(--text3)">${ing.nombre}</span>` : '';
        }).filter(Boolean).join(', ')}${(p.lineas||[]).length>3?'â€¦':''}
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
        <button class="btn btn-primary btn-sm flex-1" onclick="openEjecutarProduccion('${p.id}')">â–¶ Ejecutar producciÃ³n</button>
        <button class="btn btn-secondary btn-sm" onclick="editarPreparado('${p.id}')">âœ</button>
        <button class="btn btn-danger btn-sm" onclick="eliminarPreparado('${p.id}')">ðŸ—‘</button>
      </div>
    </div>`;
  }).join('') || '<div class="empty" style="grid-column:1/-1"><div class="empty-icon">ðŸ§ª</div><div class="empty-title">Sin preparados registrados</div><div class="empty-text">Crea tu primera receta de salsa o base</div></div>';
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
  document.getElementById('preparado-modal-title').textContent = 'Nueva ProducciÃ³n';
  ['prep-nombre','prep-rendimiento','prep-desc'].forEach(id => document.getElementById(id).value = '');
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
  lineasPreparadoActual.push({ ingId:'', cantidad:0 });
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
        ${inventario.map(i => `<option value="${i.id}" ${i.id===linea.ingId?'selected':''}>${i.nombre} (${i.unidad})</option>`).join('')}
      </select>
      <input type="number" class="form-input" style="font-size:12px;padding:5px 8px;border-radius:4px;margin-left:6px"
             placeholder="0" value="${linea.cantidad||''}"
             onchange="actualizarLineaPrep(${idx},'cantidad',parseFloat(this.value)||0)">
      <span class="font-mono" style="font-size:12px;color:var(--purple);padding-left:8px">${fmt(costoLinea)}</span>
      <button onclick="eliminarLineaPrep(${idx})" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:16px;padding:0 4px">Ã—</button>
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
  toast(`Preparado "${nombre}" guardado â€” costo/u: ${fmt(costoUnit)}/${unidad}`);
  renderProducciones();
}

// --- Ejecutar producciÃ³n ---
let cantidadEjecucion = 1;

function openEjecutarProduccion(id) {
  const p = preparados.find(x => x.id === id);
  if (!p) return;
  preparadoEjecId = id;
  cantidadEjecucion = 1;

  // Verificar stock disponible
  const advertencias = p.lineas.map(l => {
    const ing = inventario.find(i => i.id === l.ingId);
    if (!ing) return `<div style="color:var(--red);font-size:12px">âš  Insumo "${l.nombre||l.ingId}" no encontrado en inventario</div>`;
    const disponible = ing.stock;
    const necesita = l.cantidad * 1;
    if (disponible < necesita) return `<div style="color:var(--amber);font-size:12px">âš  ${ing.nombre}: necesitas ${necesita} ${ing.unidad}, tienes ${disponible}</div>`;
    return null;
  }).filter(Boolean);

  document.getElementById('ejecutar-prod-body').innerHTML = `
    <div style="margin-bottom:16px">
      <div style="font-size:16px;font-weight:600;margin-bottom:4px">${p.nombre}</div>
      <div style="font-size:12px;color:var(--text3)">Rendimiento base: ${p.rendimiento} ${p.unidad} Â· Costo: ${fmt(p.costoTotal)}</div>
    </div>
    <div class="form-group">
      <label class="form-label">Â¿CuÃ¡ntas veces producir? (multiplicador de la receta)</label>
      <div class="num-input">
        <button class="num-btn" onclick="cambiarCantEjec(-1)">âˆ’</button>
        <span class="num-val" id="cant-ejec-val">1</span>
        <button class="num-btn" onclick="cambiarCantEjec(1)">+</button>
      </div>
    </div>
    <div class="card card-sm mt-12" id="resumen-ejecucion" style="background:var(--bg3)"></div>
    ${advertencias.length ? `<div class="card card-sm mt-8" style="background:var(--amber-dim);border-color:rgba(255,122,0,0.2)">${advertencias.join('')}</div>` : ''}
    <div class="card card-sm mt-8" style="background:var(--purple-dim);border-color:rgba(155,89,182,0.2);font-size:12px;color:var(--text2)">
      âœ… Al confirmar: se descontarÃ¡n los insumos del inventario y se agregarÃ¡ <strong style="color:var(--green)">${p.nombre}</strong> como insumo disponible.
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
        <span>${ing?.nombre||'â€”'}</span>
        <span style="font-family:'DM Mono',monospace;color:${ok?'var(--text)':'var(--red)'}">${necesita} ${ing?.unidad||''} ${ok?'':'âš '}</span>
      </div>`;
    }).join('')}
    <hr style="border:none;border-top:1px solid var(--border);margin:8px 0">
    <div class="flex justify-between" style="font-size:13px;font-weight:600">
      <span>ProducirÃ¡s:</span>
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
    // Asegurar que "Preparados" exista en categorÃ­as de insumos
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
  toast(`âœ… ${cantProducida} ${p.unidad} de "${p.nombre}" producidos y agregados al inventario`);
  renderProducciones();
}

// ========== RESUMEN PLATILLOS ==========
function renderResumenPlatillos() {
  const diaRef = (typeof getDiaTrabajo === 'function') ? getDiaTrabajo() : hoy();

  // ===== KPIs del dÃ­a (sobre TODOS los pedidos del dÃ­a, sin filtro de estado) =====
  const pedDia = pedidos.filter(p => p.fecha === diaRef && p.estado !== 'Cancelado');
  const _nPlat = p => (p.items||[]).reduce((s,it)=>s+(it.cantidad||1),0);
  const pedVend = pedDia.filter(p => !p.esCortesia);
  const pedCort = pedDia.filter(p => p.esCortesia);
  const platVend = pedVend.reduce((s,p)=>s+_nPlat(p),0);
  const platCort = pedCort.reduce((s,p)=>s+_nPlat(p),0);
  const entregados = pedDia.filter(p => p.estado === 'Entregado');
  const ventaDia = entregados.filter(p=>!p.esCortesia).reduce((s,p)=>s+(p.subtotal||p.total||0),0);

  const setK = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  setK('ped-kpi-platillos', platVend + platCort);
  setK('ped-kpi-platillos-det', `${platVend} vendidos Â· ${platCort} cortesÃ­a`);
  setK('ped-kpi-pedidos', pedDia.length);
  setK('ped-kpi-pedidos-det', `${entregados.length} entregado${entregados.length!==1?'s':''}`);
  setK('ped-kpi-cortesias', pedCort.length);
  setK('ped-kpi-cortesias-det', `${platCort} platillo${platCort!==1?'s':''}`);
  setK('ped-kpi-venta', fmt(ventaDia));

  const filtroEl = document.getElementById('resumen-estado-filtro');
  const filtro = filtroEl ? filtroEl.value : '';
  let pedidosBase = pedidos.filter(p => p.fecha === diaRef && p.estado !== 'Cancelado');
  if (filtro === 'activos') pedidosBase = pedidosBase.filter(p => ['Nuevo','En preparaciÃ³n','Listo'].includes(p.estado));
  else if (filtro) pedidosBase = pedidosBase.filter(p => p.estado === filtro);

  const conteo = {};
  pedidosBase.forEach(p => {
    (p.items || []).forEach(it => {
      const n = it.nombre || it;
      conteo[n] = (conteo[n] || 0) + (it.cantidad || 1);
    });
  });
  const sorted = Object.entries(conteo).sort((a,b) => b[1]-a[1]);
  const max = sorted[0]?.[1] || 1;
  const totalPlatillos = sorted.reduce((s,[,cnt])=>s+cnt,0);
  const totalEl = document.getElementById('resumen-total-platillos');
  if (totalEl) totalEl.textContent = totalPlatillos > 0 ? `Â· ${totalPlatillos} platillos en ${pedidosBase.length} pedidos` : '';
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
        <div style="height:100%;width:${(cnt/max)*100}%;background:var(--green);border-radius:2px"></div>
      </div>
    </div>`).join('');
}

// ========== ELIMINACIÃ“N DE PEDIDOS ==========
let historialEliminaciones = DB.get('historialEliminaciones') || [];
let historialMerma = DB.get('historialMerma') || [];
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
  lista.sort((a,b) => (b.fecha+b.hora).localeCompare(a.fecha+a.hora));

  const tbody = document.getElementById('tabla-admin-pedidos');
  if (!tbody) return;
  tbody.innerHTML = lista.map(p => `
    <tr>
      <td class="font-mono text-xs text-dim">#${p.id.slice(-4).toUpperCase()}</td>
      <td class="text-dim">${fmtFecha(p.fecha)} ${p.horaStr||''}</td>
      <td style="font-weight:500">${p.cliente}</td>
      <td style="font-size:12px;color:var(--text2)">${(p.items||[]).slice(0,3).map(i=>i.nombre||i).join(', ')}${(p.items||[]).length>3?` +${(p.items||[]).length-3}`:''}</td>
      <td class="font-mono highlight-green">${fmt(p.total)}</td>
      <td><span class="badge ${estadoBadge(p.estado)}">${p.estado}</span></td>
      <td><button class="btn btn-danger btn-sm" onclick="openEliminarPedido('${p.id}')">ðŸ—‘ Eliminar</button></td>
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
    <div style="font-size:13px;margin-bottom:4px">ðŸ‘¤ ${p.cliente} Â· ${p.canal} Â· ${fmtFecha(p.fecha)}</div>
    <div style="font-size:12px;color:var(--text2)">${(p.items||[]).map(i=>`${i.nombre||i} Ã—${i.cantidad||1}`).join(', ')}</div>
    <div style="font-size:14px;font-weight:600;color:var(--green);margin-top:8px">${fmt(p.total)}</div>`;
  document.getElementById('eliminar-motivo').value = '';
  document.getElementById('eliminar-notas').value = '';
  document.getElementById('eliminar-otro-wrap').style.display = 'none';
  document.getElementById('eliminar-motivo').onchange = function() {
    document.getElementById('eliminar-otro-wrap').style.display = this.value === 'Otro' ? 'block' : 'none';
  };
  openModal('modal-eliminar-pedido');
}

function confirmarEliminarPedido() {
  const motivo = document.getElementById('eliminar-motivo').value;
  if (!motivo) { toast('Selecciona un motivo de eliminaciÃ³n', 'error'); return; }
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

  // Revertir todos los efectos del pedido (insumos, gastos, movCaja, CxC)
  // "Error al capturar" â†’ devolver insumos sin registrar merma
  const sinMerma = (motivoFinal === 'Error al capturar');
  _reversarPedido(p, p.estado, sinMerma);

  pedidos = pedidos.filter(x => x.id !== pedidoEliminarId);
  DB.set('historialEliminaciones', historialEliminaciones);
  save();
  closeModal('modal-eliminar-pedido');
  toast(`Pedido #${pedidoEliminarId.slice(-4).toUpperCase()} eliminado â€” Motivo: ${motivoFinal}`);
  renderEliminacion();
  renderDashboard();
}

function renderHistorialEliminaciones() {
  const tbody = document.getElementById('tabla-historial-eliminaciones');
  if (!tbody) return;
  const sorted = [...historialEliminaciones].sort((a,b) => (b.fechaEliminacion+b.horaEliminacion).localeCompare(a.fechaEliminacion+a.horaEliminacion));
  tbody.innerHTML = sorted.map(h => `
    <tr>
      <td class="text-dim">${fmtFecha(h.fechaEliminacion)} ${h.horaEliminacion||''}</td>
      <td class="font-mono text-dim">#${h.pedidoNum}</td>
      <td>${h.cliente}</td>
      <td class="font-mono">${fmt(h.total)}</td>
      <td><span class="badge badge-amber" style="font-size:11px">${h.motivo}</span>${h.notas?`<div style="font-size:11px;color:var(--text3);margin-top:2px">${h.notas}</div>`:''}</td>
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
      ? '<div style="text-align:center;padding:16px;color:var(--text3);font-size:12px">âœ… NingÃºn ingrediente agotado</div>'
      : agotados.map(i => `
        <div class="flex items-center justify-between" style="padding:8px 0;border-bottom:1px solid var(--border)">
          <div>
            <div style="font-size:13px;font-weight:500">${i.nombre}</div>
            <div style="font-size:11px;color:var(--text3)">${i.categoria} Â· MÃ­n: ${i.minimo} ${i.unidad}</div>
          </div>
          <div class="flex gap-6 items-center">
            <span class="badge badge-red">0 ${i.unidad}</span>
            <button class="btn btn-secondary btn-sm" onclick="ajustarStock('${i.id}')">+ Stock</button>
          </div>
        </div>`).join('');
  }

  if (listaBajo) {
    listaBajo.innerHTML = bajo.length === 0
      ? '<div style="text-align:center;padding:16px;color:var(--text3);font-size:12px">âœ… Stock en buen nivel</div>'
      : bajo.map(i => {
          const pct = Math.round((i.stock / i.minimo) * 100);
          return `
          <div class="flex items-center justify-between" style="padding:8px 0;border-bottom:1px solid var(--border)">
            <div style="flex:1">
              <div style="font-size:13px;font-weight:500">${i.nombre}</div>
              <div style="font-size:11px;color:var(--text3);margin-bottom:4px">${i.categoria} Â· MÃ­n: ${i.minimo} ${i.unidad}</div>
              <div style="height:3px;background:var(--bg4);border-radius:2px;width:80px">
                <div style="height:100%;width:${Math.min(pct,100)}%;background:var(--amber);border-radius:2px"></div>
              </div>
            </div>
            <div class="flex gap-6 items-center">
              <span class="badge badge-amber">${i.stock} ${i.unidad}</span>
              <button class="btn btn-secondary btn-sm" onclick="ajustarStock('${i.id}')">+ Stock</button>
            </div>
          </div>`}).join('');
  }

  // Tabla de configuraciÃ³n
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
  toast(`Umbral global actualizado: ${umbral}Ã— el mÃ­nimo`);
  renderAlertas();
}

// ========== BANCOS ==========
// ========== FUNCIÃ“N CENTRAL DE MOVIMIENTOS BANCO ==========
// Fuente Ãºnica usada por renderBancos Y renderEstadosFinancieros
function _calcularMovsBanco(desde, hasta) {
  const esMetodoBanco = m => {
    const met = (m||'').toLowerCase();
    return met.includes('transfer') || met.includes('spei') || met === 'tarjeta';
  };
  const movs = [];

  // ENTRADAS: pedidos cobrados inmediatamente con transferencia/tarjeta
  // Solo cuentan cuando el pedido estÃ¡ ENTREGADO
  pedidos.forEach(p => {
    if (p.estado === 'Cancelado' || p.esCortesia) return;
    if (p.estado !== 'Entregado') return;
    if (p.pago === 'Pendiente' || !p.fecha) return;
    if (p.fecha < desde || p.fecha > hasta) return;
    if (!esMetodoBanco(p.pago)) return;
    // monto = total cliente (comida + envÃ­o si transferencia)
    const monto = p.modoEnvio === 'transferencia'
      ? (p.subtotal||0) - (p.descuento||0) + (p.costoEnvio||0)
      : (p.total || (p.subtotal||0) - (p.descuento||0));
    if (monto > 0)
      movs.push({
        fecha: p.fecha, hora: p.hora||p.horaStr||'00:00',
        concepto: `Venta â€” ${p.cliente||''}`,
        ref: `#${p.id.slice(-4).toUpperCase()}`,
        tipo: 'venta', entrada: monto, salida: 0
      });
  });

  // ENTRADAS: abonos a CxC con transferencia/tarjeta (cada abono por separado)
  cxc.forEach(c => {
    const abonos = c.abonos || [];
    if (abonos.length) {
      // Sistema de abonos: contar cada abono individual
      abonos.forEach(a => {
        const fecha = a.fecha || '';
        if (fecha < desde || fecha > hasta) return;
        if (!esMetodoBanco(a.metodo||'')) return;
        movs.push({
          fecha, hora: a.hora || 'â€”',
          concepto: `Abono CxC â€” ${c.clienteNombre||''}`,
          ref: c.concepto||'',
          tipo: 'cobro_cxc', entrada: a.monto||0, salida: 0
        });
      });
    } else if (c.estado === 'cobrada') {
      // Compatibilidad: CxC vieja cobrada sin sistema de abonos
      const fecha = c.fechaCobro || c.fecha || '';
      if (fecha < desde || fecha > hasta) return;
      if (!esMetodoBanco(c.metodoCobro||'')) return;
      movs.push({
        fecha, hora: 'â€”',
        concepto: `Cobro CxC â€” ${c.clienteNombre||''}`,
        ref: c.concepto||'',
        tipo: 'cobro_cxc', entrada: c.monto||0, salida: 0
      });
    }
  });

  // SALIDAS: CxP pagadas con transferencia/tarjeta
  cxp.forEach(c => {
    if (c.estado !== 'pagada') return;
    const fecha = c.fechaPago || c.vencimiento || '';
    if (fecha < desde || fecha > hasta) return;
    if (!esMetodoBanco(c.metodoPagoRealizado||'')) return;
    movs.push({
      fecha, hora: 'â€”',
      concepto: `CxP â€” ${c.concepto||''}`,
      ref: c.acreedor||c.proveedor||'',
      tipo: 'cxp', entrada: 0, salida: c.monto||0
    });
  });

  // Movimientos extraordinarios por transferencia/banco (gastos, retiros, entradas)
  movCaja.forEach(m => {
    if (m.tipo !== 'mov_extra_salida' && m.tipo !== 'mov_extra_entrada') return;
    if (!esMetodoBanco(m.metodo)) return;
    const fecha = m.fecha || '';
    if (fecha < desde || fecha > hasta) return;
    const esSalida = m.tipo === 'mov_extra_salida';
    movs.push({
      fecha, hora: m.hora || 'â€”',
      concepto: (esSalida ? (m.estado||'Gasto') : 'Entrada') + ` â€” ${m.concepto||''}`,
      ref: 'Movimiento extra',
      tipo: esSalida ? 'cxp' : 'venta',
      entrada: esSalida ? 0 : m.monto,
      salida: esSalida ? m.monto : 0
    });
  });

  movs.sort((a,b) => (a.fecha+a.hora).localeCompare(b.fecha+b.hora));
  let saldoAcum = 0;
  movs.forEach(m => { saldoAcum += m.entrada - m.salida; m.saldoAcum = saldoAcum; });
  return movs;
}

function openSaldoInicialBanco() {
  document.getElementById('input-saldo-inicial-banco').value = (DB.get('saldoInicialBanco') || 0);
  openModal('modal-saldo-inicial-banco');
}

function guardarSaldoInicialBanco() {
  const val = parseFloat(document.getElementById('input-saldo-inicial-banco').value) || 0;
  DB.set('saldoInicialBanco', val);
  closeModal('modal-saldo-inicial-banco');
  toast('Saldo inicial de bancos actualizado');
  renderBancos();
}

function renderBancos() {
  const periodo = document.getElementById('bancos-periodo')?.value || 'mes';
  const hoyStr = hoy();
  let desde, hasta = hoyStr;
  if (periodo === 'hoy') { desde = hoyStr; }
  else if (periodo === 'semana') { const d=new Date(); d.setDate(d.getDate()-6); desde=_fechaLocal(d); }
  else if (periodo === 'mes') { desde = hoyStr.slice(0,7)+'-01'; }
  else { desde = '2020-01-01'; }

  const saldoInicial = DB.get('saldoInicialBanco') || 0;
  const movs = _calcularMovsBanco(desde, hasta);
  const totalEntradas = movs.filter(m=>m.tipo!=='cxp').reduce((s,m)=>s+m.entrada,0);
  const totalSalidas = movs.filter(m=>m.tipo==='cxp').reduce((s,m)=>s+m.salida,0);
  const cobrosCoC = movs.filter(m=>m.tipo==='cobro_cxc').reduce((s,m)=>s+m.entrada,0);
  // El saldo final incluye el saldo inicial como punto de partida
  const saldoFinal = saldoInicial + totalEntradas - totalSalidas;

  const elIni = document.getElementById('bancos-inicial'); if (elIni) elIni.textContent = fmt(saldoInicial);
  document.getElementById('bancos-entradas').textContent = fmt(totalEntradas);
  document.getElementById('bancos-salidas').textContent = fmt(totalSalidas);
  document.getElementById('bancos-cobros-cxc').textContent = fmt(cobrosCoC);
  const saldoEl = document.getElementById('bancos-saldo');
  saldoEl.textContent = fmt(saldoFinal);
  saldoEl.style.color = saldoFinal >= 0 ? 'var(--blue)' : 'var(--red)';

  // Tabla
  const tbody = document.getElementById('tabla-bancos');
  const tipoBadge = { venta:'badge-blue', cobro_cxc:'badge-green', cxp:'badge-red' };
  const tipoLabel = { venta:'ðŸ’³ Venta', cobro_cxc:'ðŸ“¥ Cobro CxC', cxp:'ðŸ“¤ CxP' };
  // Fila de saldo inicial como base
  let filaInicial = '';
  if (saldoInicial !== 0) {
    filaInicial = `<tr style="background:var(--bg3)">
      <td class="font-mono text-sm">â€”</td>
      <td class="font-mono text-sm text-dim">â€”</td>
      <td style="font-size:13px;font-weight:600">âš™ Saldo inicial</td>
      <td style="font-size:12px;color:var(--text3)">Punto de partida</td>
      <td><span class="badge badge-gray" style="font-size:10px">Inicial</span></td>
      <td class="font-mono highlight-green">${saldoInicial>0?fmt(saldoInicial):'â€”'}</td>
      <td class="font-mono highlight-red">${saldoInicial<0?fmt(Math.abs(saldoInicial)):'â€”'}</td>
      <td class="font-mono" style="color:var(--blue);font-weight:600">${fmt(saldoInicial)}</td>
    </tr>`;
  }
  if (!movs.length && !filaInicial) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text3)">Sin movimientos bancarios en este perÃ­odo</td></tr>';
    return;
  }
  // Recalcular saldo acumulado partiendo del saldo inicial
  let acum = saldoInicial;
  const filasMovs = movs.map(m => {
    acum += (m.entrada||0) - (m.salida||0);
    return `<tr>
      <td class="font-mono text-sm">${m.fecha}</td>
      <td class="font-mono text-sm text-dim">${m.hora}</td>
      <td style="font-size:13px">${m.concepto}</td>
      <td style="font-size:12px;color:var(--text3)">${m.ref}</td>
      <td><span class="badge ${tipoBadge[m.tipo]||'badge-gray'}" style="font-size:10px">${tipoLabel[m.tipo]||m.tipo}</span></td>
      <td class="font-mono highlight-green">${m.entrada>0?fmt(m.entrada):'â€”'}</td>
      <td class="font-mono highlight-red">${m.salida>0?fmt(m.salida):'â€”'}</td>
      <td class="font-mono" style="color:${acum>=0?'var(--blue)':'var(--red)'};font-weight:600">${fmt(acum)}</td>
    </tr>`;
  }).join('');
  tbody.innerHTML = filaInicial + filasMovs;
}

function exportarBancos() {
  const tbody = document.getElementById('tabla-bancos');
  const rows = [['Fecha','Hora','Concepto','Referencia','Tipo','Entrada','Salida','Saldo acum.']];
  document.querySelectorAll('#tabla-bancos tr').forEach(tr => {
    const cells = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim());
    if (cells.length) rows.push(cells);
  });
  const csv = rows.map(r=>r.map(v=>'"'+v+'"').join(',')).join('\n');

  const blob = new Blob(['ï»¿'+csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=`bancos_${hoy()}.csv`;a.click();
  toast('Exportado');
}

// ========== MERMA ==========
function openMermaModal() {
  const sel = document.getElementById('merma-ingrediente');
  sel.innerHTML = '<option value="">Seleccionar ingrediente...</option>' +
    inventario.map(i => `<option value="${i.id}">${i.nombre} (${i.stock} ${i.unidad})</option>`).join('');
  document.getElementById('merma-cantidad').value = '';
  document.getElementById('merma-costo').value = '';
  document.getElementById('merma-notas').value = '';
  openModal('modal-merma');
}

function calcularCostoMerma() {
  const ingId = document.getElementById('merma-ingrediente').value;
  const cant = parseFloat(document.getElementById('merma-cantidad').value) || 0;
  const ing = inventario.find(i => i.id === ingId);
  const costo = ing ? ing.costo * cant : 0;
  document.getElementById('merma-costo').value = costo.toFixed(2);
}

function confirmarMerma() {
  const ingId = document.getElementById('merma-ingrediente').value;
  const cant = parseFloat(document.getElementById('merma-cantidad').value) || 0;
  const motivo = document.getElementById('merma-motivo').value;
  const notas = document.getElementById('merma-notas').value;
  const ing = inventario.find(i => i.id === ingId);
  if (!ing) { toast('Selecciona un ingrediente', 'error'); return; }
  if (cant <= 0) { toast('Ingresa una cantidad vÃ¡lida', 'error'); return; }
  const costoMerma = ing.costo * cant;
  ing.stock = Math.max(0, Math.round((ing.stock - cant) * 1000) / 1000);
  historialMerma.push({
    id: uid(), fecha: hoy(), hora: hora(),
    ingredienteId: ingId, ingredienteNombre: ing.nombre,
    cantidad: cant, unidad: ing.unidad,
    costo: costoMerma, motivo, notas, tipo: 'manual'
  });
  if (costoMerma > 0) {
    gastos.push({ id: uid(), concepto: `Merma: ${ing.nombre} (${cant} ${ing.unidad})`, categoria: 'Merma', monto: costoMerma, fecha: hoy(), recurrente: 'no', notas: motivo });
  }
  save();
  closeModal('modal-merma');
  toast(`Merma registrada: ${cant} ${ing.unidad} de ${ing.nombre}`);
  renderInventario();
}

// ========== CONTRASTE INVENTARIO FÃSICO ==========
let _contrasteTmp = {};
function openContrasteInventario() {
  _contrasteTmp = {};
  const tabla = document.getElementById('contraste-tabla');
  tabla.innerHTML = `
    <div style="overflow-x:auto">
    <table>
      <thead><tr><th>Ingrediente</th><th>TeÃ³rico (sistema)</th><th>FÃ­sico (ingresas tÃº)</th><th>Diferencia</th></tr></thead>
      <tbody>
        ${inventario.map(i => `
          <tr>
            <td style="font-weight:500">${i.nombre} <span style="color:var(--text3);font-size:11px">(${i.unidad})</span></td>
            <td class="font-mono" style="color:var(--green)">${i.stock}</td>
            <td><input type="number" class="form-input" style="width:90px;padding:5px 8px;font-size:12px" placeholder="${i.stock}" oninput="actualizarContraste('${i.id}',this.value)" step="0.001" min="0"></td>
            <td id="diff-${i.id}" class="font-mono" style="color:var(--text3)">â€”</td>
          </tr>`).join('')}
      </tbody>
    </table></div>`;
  openModal('modal-contraste-inv');
}

function actualizarContraste(id, val) {
  const ing = inventario.find(i => i.id === id);
  if (!ing) return;
  const fisico = parseFloat(val);
  if (isNaN(fisico)) { _contrasteTmp[id] = null; document.getElementById('diff-'+id).textContent = 'â€”'; document.getElementById('diff-'+id).style.color = 'var(--text3)'; return; }
  const diff = fisico - ing.stock;
  _contrasteTmp[id] = fisico;
  const el = document.getElementById('diff-'+id);
  el.textContent = (diff >= 0 ? '+' : '') + diff.toFixed(3);
  el.style.color = diff === 0 ? 'var(--text3)' : diff > 0 ? 'var(--green)' : 'var(--red)';
}

function aplicarContrasteInventario() {
  let ajustados = 0;
  Object.entries(_contrasteTmp).forEach(([id, fisico]) => {
    if (fisico === null) return;
    const ing = inventario.find(i => i.id === id);
    if (!ing) return;
    const diff = fisico - ing.stock;
    if (Math.abs(diff) > 0.001) {
      if (diff < 0) {
        // Diferencia negativa â†’ merma
        const costoMerma = Math.abs(diff) * ing.costo;
        historialMerma.push({ id: uid(), fecha: hoy(), hora: hora(), ingredienteId: id, ingredienteNombre: ing.nombre, cantidad: Math.abs(diff), unidad: ing.unidad, costo: costoMerma, motivo: 'Ajuste contraste fÃ­sico', tipo: 'contraste' });
        if (costoMerma > 0) gastos.push({ id: uid(), concepto: `Merma contraste: ${ing.nombre}`, categoria: 'Merma', monto: costoMerma, fecha: hoy(), recurrente: 'no', notas: 'Ajuste inventario fÃ­sico vs teÃ³rico' });
      }
      ing.stock = Math.round(fisico * 1000) / 1000;
      ajustados++;
    }
  });
  save();
  closeModal('modal-contraste-inv');
  toast(`${ajustados} ingrediente${ajustados !== 1 ? 's' : ''} ajustado${ajustados !== 1 ? 's' : ''}`);
  renderInventario();
}

// ========== REQUISICIÃ“N ==========
let _requisicionItems = [];
function openRequisicion() {
  // Calcular consumo promedio basado en pedidos de los Ãºltimos 30 dÃ­as
  const hace30 = new Date(); hace30.setDate(hace30.getDate() - 30);
  const pedidosRecientes = pedidos.filter(p => p.estado !== 'Cancelado' && new Date(p.fecha) >= hace30);
  const consumo = {};
  pedidosRecientes.forEach(p => {
    (p.items || []).forEach(item => {
      const plat = menu.find(m => m.nombre === item.nombre || m.id === item.id);
      if (!plat || !plat.receta?.length) return;
      plat.receta.forEach(l => {
        consumo[l.ingId] = (consumo[l.ingId] || 0) + l.cantidad * (item.cantidad || 1);
      });
    });
  });
  _requisicionItems = inventario.map(ing => ({
    id: ing.id, nombre: ing.nombre, unidad: ing.unidad,
    stockActual: ing.stock, minimo: ing.minimo,
    consumo30: Math.round((consumo[ing.id] || 0) * 100) / 100,
    sugerido: Math.max(0, Math.round(((consumo[ing.id] || 0) - ing.stock + ing.minimo) * 100) / 100),
    manual: null
  })).filter(i => i.sugerido > 0 || i.stockActual <= i.minimo);

  const tabla = document.getElementById('requisicion-tabla');
  tabla.innerHTML = `
    <div style="overflow-x:auto">
    <table>
      <thead><tr><th>Ingrediente</th><th>Stock actual</th><th>MÃ­nimo</th><th>Consumo 30d</th><th>Sugerido</th><th>Cantidad a pedir</th></tr></thead>
      <tbody id="req-tbody">
        ${_requisicionItems.map((r,i) => `
          <tr>
            <td style="font-weight:500">${r.nombre}</td>
            <td class="font-mono" style="color:${r.stockActual <= r.minimo ? 'var(--red)':'var(--text2)'}">${r.stockActual} ${r.unidad}</td>
            <td class="text-dim">${r.minimo} ${r.unidad}</td>
            <td class="font-mono text-dim">${r.consumo30} ${r.unidad}</td>
            <td class="font-mono" style="color:var(--amber)">${r.sugerido} ${r.unidad}</td>
            <td><input type="number" class="form-input" style="width:90px;padding:5px 8px;font-size:12px" value="${r.sugerido}" oninput="_requisicionItems[${i}].manual=parseFloat(this.value)||0" step="0.001" min="0"> ${r.unidad}</td>
          </tr>`).join('')}
      </tbody>
    </table></div>`;
  if (_requisicionItems.length === 0) tabla.innerHTML = '<div class="empty"><div class="empty-icon">âœ…</div><div class="empty-title">No se requieren compras</div><div class="empty-text">El inventario cubre el consumo histÃ³rico</div></div>';
  openModal('modal-requisicion');
}

function exportarRequisicion() {
  const rows = [['Ingrediente','Unidad','Stock actual','MÃ­nimo','Consumo 30d','Cantidad a pedir']];
  _requisicionItems.forEach(r => {
    rows.push([r.nombre, r.unidad, r.stockActual, r.minimo, r.consumo30, r.manual !== null ? r.manual : r.sugerido]);
  });
  const csv = rows.map(r => r.map(v => '"' + v + '"').join(',')).join('\n');

  const blob = new Blob(['ï»¿'+csv], { type:'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `requisicion_${hoy()}.csv`; a.click();
  toast('RequisiciÃ³n exportada');
}

// ========== PRESENTACIONES ==========
let presentaciones = DB.get('presentaciones') || [];

// Guardar presentaciones en save() â€” integrado directamente arriba

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
      <td style="font-weight:500">${ing?.nombre || 'â€”'}</td>
      <td>${p.nombre}</td>
      <td class="font-mono">${p.cantidad}</td>
      <td class="text-dim">${p.unidad}</td>
      <td class="font-mono">${fmt(p.costoPres)}</td>
      <td class="font-mono highlight-green">${fmt(costoUnit)}<span style="font-size:10px;color:var(--text3)"> / ${p.unidad}</span></td>
      <td>
        ${p.esDefault
          ? '<span class="badge badge-green">âœ“ Predeterminada</span>'
          : `<button class="btn btn-secondary btn-sm" onclick="setDefaultPres('${p.id}','${p.ingId}')">Usar como default</button>`}
      </td>
      <td><button class="btn btn-danger btn-sm" onclick="eliminarPresentacion('${p.id}')">ðŸ—‘</button></td>
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
  document.getElementById('pres-modal-title').textContent = 'Nueva PresentaciÃ³n';
  document.getElementById('pres-nombre').value = '';
  document.getElementById('pres-cantidad').value = '';
  document.getElementById('pres-costo').value = '';
  document.getElementById('pres-costo-unit').textContent = '$0.00';
  document.getElementById('pres-costo-formula').textContent = 'â€”';
  document.getElementById('pres-default').value = 'true';
  const sel = document.getElementById('pres-insumo');
  sel.innerHTML = '<option value="">Seleccionar insumo...</option>' +
    inventario.map(i => `<option value="${i.id}" ${i.id===ingId?'selected':''}>${i.nombre} (${i.unidad})</option>`).join('');
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
    cantidad > 0 ? `${fmt(costo)} Ã· ${cantidad} ${unidad} = ${fmt(costoUnit)} por ${unidad}` : 'â€”';
}

function guardarPresentacion() {
  const ingId = document.getElementById('pres-insumo').value;
  const nombre = document.getElementById('pres-nombre').value.trim();
  const cantidad = parseFloat(document.getElementById('pres-cantidad').value) || 0;
  const costoPres = parseFloat(document.getElementById('pres-costo').value) || 0;
  const unidad = document.getElementById('pres-unidad').value;
  const esDefault = document.getElementById('pres-default').value === 'true';

  if (!ingId) { toast('Selecciona un insumo', 'error'); return; }
  if (!nombre) { toast('Ingresa el nombre de la presentaciÃ³n', 'error'); return; }
  if (!cantidad || !costoPres) { toast('Ingresa cantidad y costo', 'error'); return; }

  const costoUnit = costoPres / cantidad;

  // Si es default, marcar las demÃ¡s de este insumo como no default
  if (esDefault) {
    presentaciones.forEach(p => { if (p.ingId === ingId) p.esDefault = false; });
    // Actualizar costo del ingrediente automÃ¡ticamente
    const ing = inventario.find(i => i.id === ingId);
    if (ing) {
      ing.costo = costoUnit;
      ing.unidad = unidad;
    }
  }

  presentaciones.push({ id: uid(), ingId, nombre, cantidad, unidad, costoPres, costoUnit, esDefault });
  save();
  closeModal('modal-presentacion');
  toast(`PresentaciÃ³n guardada â€” costo unitario: ${fmt(costoUnit)}/${unidad}${esDefault ? ' (actualizado en insumo)' : ''}`);
  renderPresentaciones(presentaciones);
  renderInventario();
}

function setDefaultPres(presId, ingId) {
  // Quitar default de las demÃ¡s del mismo insumo
  presentaciones.forEach(p => { if (p.ingId === ingId) p.esDefault = false; });
  const p = presentaciones.find(x => x.id === presId);
  if (p) {
    p.esDefault = true;
    // Actualizar costo del insumo automÃ¡ticamente
    const ing = inventario.find(i => i.id === ingId);
    if (ing) { ing.costo = p.costoUnit; ing.unidad = p.unidad; }
  }
  save();
  renderPresentaciones(presentaciones);
  renderInventario();
  toast('PresentaciÃ³n predeterminada actualizada â€” costo del insumo actualizado âœ…');
}

function eliminarPresentacion(id) {
  presentaciones = presentaciones.filter(p => p.id !== id);
  save();
  renderPresentaciones(presentaciones);
  toast('PresentaciÃ³n eliminada');
}

// ========== INIT ==========
seedData();
DB.set('usuarios', usuarios); // persist default users if first time

// Restaurar sesiÃ³n o mostrar login
const sesionGuardada = DB.get('sesion');
if (sesionGuardada) {
  const u = usuarios.find(x=>x.id===sesionGuardada.id && x.activo);
  if (u) {
    sesionActual = u;
    document.getElementById('login-screen').style.display='none';
    document.getElementById('sidebar-nombre').textContent = u.nombre;
    document.getElementById('sidebar-rol').textContent = u.rol==='admin'?'Administrador':'Operador / Caja';
    document.getElementById('sidebar-avatar').textContent = u.nombre[0].toUpperCase();
    aplicarPermisos();
    renderDashboard();
  }
}
document.getElementById('fecha-hoy').textContent = new Date().toLocaleDateString('es-MX', { weekday:'long', day:'numeric', month:'long' });
