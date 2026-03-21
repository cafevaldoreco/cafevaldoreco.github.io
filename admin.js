// admin.js - OPTIMIZADO con carga diferida y filtro de fecha corregido

// Variables para módulos de Firebase
let firebaseModules = {
  db: null,
  loaded: false
};

// Cargar Firebase solo cuando se necesite
async function loadFirebaseForAdmin() {
  if (firebaseModules.loaded) {
    return firebaseModules;
  }

  console.log('📦 Admin: Cargando Firebase...');

  try {
    const configModule = await import('./firebaseconfig.js');
    firebaseModules.db = configModule.db;
    
    const firestoreModule = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    firebaseModules.collection = firestoreModule.collection;
    firebaseModules.getDocs = firestoreModule.getDocs;
    firebaseModules.updateDoc = firestoreModule.updateDoc;
    firebaseModules.doc = firestoreModule.doc;
    firebaseModules.query = firestoreModule.query;
    firebaseModules.orderBy = firestoreModule.orderBy;
    firebaseModules.where = firestoreModule.where;
    firebaseModules.Timestamp = firestoreModule.Timestamp;
    
    firebaseModules.loaded = true;
    console.log('✅ Admin: Firebase cargado');
    
    return firebaseModules;
  } catch (error) {
    console.error('❌ Admin: Error cargando Firebase:', error);
    throw error;
  }
}

// Variables globales
let pedidosData = [];
let mensajesData = [];
let currentTab = 'pedidos';

// Elementos del DOM
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');
const listaPedidos = document.getElementById('listaPedidosAdmin');
const listaMensajes = document.getElementById('listaMensajesAdmin');
const filtroEstado = document.getElementById('filtroEstado');
const filtroFecha = document.getElementById('filtroFecha');
const btnActualizar = document.getElementById('btnActualizar');

// Elementos de modal
const modal = document.getElementById('modalPedido');
const modalBody = document.getElementById('modalPedidoBody');
const closeModal = document.querySelector('.close');

// Elementos de estadísticas
const totalPedidosEl = document.getElementById('totalPedidos');
const pedidosPendientesEl = document.getElementById('pedidosPendientes');
const totalMensajesEl = document.getElementById('totalMensajes');
const totalClientesEl = document.getElementById('totalClientes');

// Inicialización
document.addEventListener('DOMContentLoaded', async function() {
  await initializeAdmin();
});

async function initializeAdmin() {
  try {
    showLoading();
    
    // Cargar Firebase primero
    await loadFirebaseForAdmin();
    
    // Cargar datos iniciales
    await Promise.all([
      cargarPedidos(),
      cargarMensajes()
    ]);
    
    setupEventListeners();
    actualizarEstadisticas();
    mostrarTabPedidos();
    
  } catch (error) {
    console.error('Error inicializando admin:', error);
    mostrarError('Error cargando datos del panel de administración');
  }
}

function setupEventListeners() {
  tabButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      if (button.hasAttribute('data-tab')) {
        e.preventDefault();
        switchTab(button.dataset.tab);
      }
    });
  });

  if (filtroEstado) {
    filtroEstado.addEventListener('change', () => {
      console.log('📊 Filtro estado cambiado:', filtroEstado.value);
      filtrarPedidos();
    });
  }
  
  if (filtroFecha) {
    filtroFecha.addEventListener('change', () => {
      console.log('📅 Filtro fecha cambiado:', filtroFecha.value);
      filtrarPedidos();
    });
  }
  
  if (btnActualizar) {
    btnActualizar.addEventListener('click', async () => {
      try {
        const originalText = btnActualizar.innerHTML;
        btnActualizar.innerHTML = '⏳ Actualizando...';
        btnActualizar.disabled = true;
        
        await Promise.all([
          cargarPedidos(),
          cargarMensajes()
        ]);
        
        actualizarEstadisticas();
        mostrarNotificacion('Datos actualizados correctamente', 'success');
        
        btnActualizar.innerHTML = originalText;
        btnActualizar.disabled = false;
        
      } catch (error) {
        console.error('Error actualizando datos:', error);
        mostrarError('Error al actualizar los datos');
        btnActualizar.innerHTML = '🔄 Actualizar';
        btnActualizar.disabled = false;
      }
    });
  }

  if (closeModal) closeModal.addEventListener('click', cerrarModal);
  window.addEventListener('click', (e) => {
    if (e.target === modal) cerrarModal();
  });
}

function switchTab(tabName) {
  currentTab = tabName;
  
  tabButtons.forEach(btn => btn.classList.remove('active'));
  const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
  if (activeButton) activeButton.classList.add('active');
  
  tabPanes.forEach(pane => pane.classList.remove('active'));
  const activePane = document.getElementById(`tab-${tabName}`);
  if (activePane) activePane.classList.add('active');
  
  if (tabName === 'pedidos') {
    mostrarTabPedidos();
  } else if (tabName === 'mensajes') {
    mostrarTabMensajes();
  } else if (tabName === 'chat') {
    console.log('Tab de chat activado');
  }
}

async function cargarPedidos() {
  try {
    const q = firebaseModules.query(
      firebaseModules.collection(firebaseModules.db, "pedidos"), 
      firebaseModules.orderBy("fecha", "desc")
    );
    const querySnapshot = await firebaseModules.getDocs(q);
    
    pedidosData = [];
    querySnapshot.forEach((documento) => {
      pedidosData.push({
        id: documento.id,
        ...documento.data()
      });
    });
    
    // Debug: Mostrar fechas de los primeros 3 pedidos
    console.log('📦 Pedidos cargados:', pedidosData.length);
    if (pedidosData.length > 0) {
      console.log('🔍 Muestra de fechas de los primeros pedidos:');
      pedidosData.slice(0, 3).forEach((p, i) => {
        console.log(`Pedido ${i+1}:`, {
          id: p.id,
          cliente: p.datosCliente?.nombre,
          fechaRaw: p.fecha,
          tipoFecha: typeof p.fecha
        });
      });
    }
    
    // Exponer globalmente para debugging
    window.pedidosData = pedidosData;
    
    if (currentTab === 'pedidos') {
      mostrarTabPedidos();
    }
    
  } catch (error) {
    console.error("Error cargando pedidos:", error);
    mostrarError('Error cargando pedidos');
  }
}

function mostrarTabPedidos() {
  if (!listaPedidos) return;
  
  const pedidosFiltrados = filtrarPedidosData();
  
  if (pedidosFiltrados.length === 0) {
    listaPedidos.innerHTML = `
      <div class="empty-state">
        <div class="icon">📦</div>
        <h3>No hay pedidos</h3>
        <p>No se encontraron pedidos con los filtros seleccionados.</p>
      </div>
    `;
    return;
  }
  
  listaPedidos.innerHTML = pedidosFiltrados.map(pedido => `
    <div class="pedido-admin-item">
      <div class="pedido-header-admin">
        <div class="pedido-info">
          <h3>Pedido #${pedido.numeroPedido || pedido.id.slice(-6)}</h3>
          <p><strong>Cliente:</strong> ${pedido.datosCliente?.nombre || 'Cliente'}</p>
          <p><strong>Email:</strong> ${pedido.datosCliente?.email || 'No especificado'}</p>
          <p><strong>Teléfono:</strong> ${pedido.datosCliente?.telefono || 'No especificado'}</p>
          <p><strong>Fecha:</strong> ${formatearFecha(pedido.fecha)}</p>
          <p><strong>Total:</strong> $${formatearPrecio(pedido.total || 0)}</p>
          <span class="estado-badge estado-${pedido.estado || 'pendiente'}">${formatearEstado(pedido.estado || 'pendiente')}</span>
        </div>
        <div class="pedido-acciones">
          <button class="btn-estado btn-pendiente" onclick="cambiarEstado('${pedido.id}', 'pendiente')">
            Pendiente
          </button>
          <button class="btn-estado btn-proceso" onclick="cambiarEstado('${pedido.id}', 'en-proceso')">
            En Proceso
          </button>
          <button class="btn-estado btn-completado" onclick="cambiarEstado('${pedido.id}', 'completado')">
            Completado
          </button>
          <button class="btn-estado btn-editar" onclick="abrirModalPedido('${pedido.id}')">
            Ver Detalles
          </button>
        </div>
      </div>
      
      <div class="pedido-detalles">
        <div class="detalles-cliente">
          <h4>👤 Información del Cliente</h4>
          <p><strong>Dirección:</strong> ${pedido.datosCliente?.direccion || 'No especificada'}</p>
          <p><strong>Ciudad:</strong> ${pedido.datosCliente?.ciudad || 'No especificada'}</p>
          ${pedido.datosCliente?.notas ? `<p><strong>Notas:</strong> ${pedido.datosCliente.notas}</p>` : ''}
        </div>
        
        <div class="productos-admin-list">
          <h4>☕ Productos</h4>
          ${(pedido.pedido || []).map(producto => `
            <div class="producto-admin-item">
              <span>${producto.producto}</span>
              <span>Cantidad: ${producto.cantidad} - $${formatearPrecio(producto.precio * producto.cantidad)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `).join('');
}

function filtrarPedidos() {
  mostrarTabPedidos();
}

// FUNCIÓN CORREGIDA: Filtrar pedidos con debug
function filtrarPedidosData() {
  let pedidosFiltrados = [...pedidosData];
  
  console.log('🔍 === INICIO DE FILTRADO ===');
  console.log('Total de pedidos:', pedidosData.length);
  
  // ===== FILTRO POR ESTADO =====
  const estadoFiltro = filtroEstado?.value;
  console.log('Estado filtro:', estadoFiltro);
  
  if (estadoFiltro && estadoFiltro !== 'todos') {
    pedidosFiltrados = pedidosFiltrados.filter(pedido => 
      (pedido.estado || 'pendiente') === estadoFiltro
    );
    console.log('Pedidos después de filtro de estado:', pedidosFiltrados.length);
  }
  
  // ===== FILTRO POR FECHA - CORREGIDO =====
  const fechaFiltro = filtroFecha?.value;
  console.log('Fecha filtro:', fechaFiltro);
  
  if (fechaFiltro) {
    console.log('📅 Aplicando filtro de fecha...');
    
    pedidosFiltrados = pedidosFiltrados.filter(pedido => {
      if (!pedido.fecha) {
        console.log('⚠️ Pedido sin fecha:', pedido.id);
        return false;
      }
      
      try {
        // Convertir la fecha del pedido
        let fechaPedido;
        
        if (pedido.fecha.toDate) {
          // Timestamp de Firebase
          fechaPedido = pedido.fecha.toDate();
        } else if (pedido.fecha.seconds) {
          // Timestamp serializado de Firebase
          fechaPedido = new Date(pedido.fecha.seconds * 1000);
        } else if (pedido.fecha instanceof Date) {
          // Ya es Date
          fechaPedido = pedido.fecha;
        } else if (typeof pedido.fecha === 'string') {
          // String
          fechaPedido = new Date(pedido.fecha);
        } else if (typeof pedido.fecha === 'number') {
          // Timestamp numérico
          fechaPedido = new Date(pedido.fecha);
        } else {
          console.log('⚠️ Formato de fecha desconocido:', pedido.fecha);
          return false;
        }
        
        // Convertir a formato YYYY-MM-DD (en hora local)
        const year = fechaPedido.getFullYear();
        const month = String(fechaPedido.getMonth() + 1).padStart(2, '0');
        const day = String(fechaPedido.getDate()).padStart(2, '0');
        const fechaPedidoStr = `${year}-${month}-${day}`;
        
        const coincide = fechaPedidoStr === fechaFiltro;
        
        if (coincide) {
          console.log('✅ PEDIDO COINCIDE:', {
            pedidoId: pedido.id,
            cliente: pedido.datosCliente?.nombre,
            fechaPedido: fechaPedidoStr,
            fechaFiltro: fechaFiltro
          });
        }
        
        return coincide;
        
      } catch (error) {
        console.error('❌ Error procesando fecha:', error);
        console.error('Pedido problemático:', pedido);
        return false;
      }
    });
    
    console.log(`📊 Total después de filtro de fecha: ${pedidosFiltrados.length}`);
  }
  
  console.log('🔍 === FIN DE FILTRADO ===');
  console.log('Pedidos finales:', pedidosFiltrados.length);
  
  return pedidosFiltrados;
}

// FUNCIÓN DE DEBUG: Ver todas las fechas de pedidos
window.debugFechas = function() {
  console.clear();
  console.log('🔍 === DEBUG DE FECHAS ===');
  console.log('Total de pedidos:', pedidosData.length);
  
  if (pedidosData.length === 0) {
    console.log('⚠️ No hay pedidos cargados');
    mostrarNotificacion('No hay pedidos cargados', 'info');
    return;
  }
  
  pedidosData.forEach((pedido, index) => {
    console.log(`\n--- Pedido ${index + 1} ---`);
    console.log('ID:', pedido.id);
    console.log('Cliente:', pedido.datosCliente?.nombre || 'Sin nombre');
    console.log('Fecha raw:', pedido.fecha);
    console.log('Tipo:', typeof pedido.fecha);
    
    if (pedido.fecha) {
      try {
        let fechaPedido;
        
        if (pedido.fecha.toDate) {
          fechaPedido = pedido.fecha.toDate();
          console.log('✅ Es Timestamp de Firebase');
        } else if (pedido.fecha.seconds) {
          fechaPedido = new Date(pedido.fecha.seconds * 1000);
          console.log('✅ Es Timestamp serializado');
        } else if (pedido.fecha instanceof Date) {
          fechaPedido = pedido.fecha;
          console.log('✅ Ya es Date');
        } else {
          fechaPedido = new Date(pedido.fecha);
          console.log('✅ Convertido a Date desde:', typeof pedido.fecha);
        }
        
        const year = fechaPedido.getFullYear();
        const month = String(fechaPedido.getMonth() + 1).padStart(2, '0');
        const day = String(fechaPedido.getDate()).padStart(2, '0');
        const fechaFormateada = `${year}-${month}-${day}`;
        
        console.log('📅 Fecha formateada:', fechaFormateada);
        console.log('🕐 Fecha completa:', fechaPedido.toLocaleString('es-CO'));
        
      } catch (error) {
        console.error('❌ Error:', error);
      }
    } else {
      console.log('❌ SIN FECHA');
    }
  });
  
  console.log('\n🔍 === FIN DEBUG ===');
  mostrarNotificacion('Revisa la consola (F12)', 'info');
};

// FUNCIÓN PARA LIMPIAR FILTROS
window.limpiarFiltros = function() {
  console.log('🗑️ Limpiando filtros...');
  
  if (filtroEstado) {
    filtroEstado.value = 'todos';
  }
  
  if (filtroFecha) {
    filtroFecha.value = '';
  }
  
  mostrarTabPedidos();
  mostrarNotificacion('Filtros limpiados', 'info');
};

window.cambiarEstado = async function(pedidoId, nuevoEstado) {
  try {
    await firebaseModules.updateDoc(
      firebaseModules.doc(firebaseModules.db, "pedidos", pedidoId), 
      {
        estado: nuevoEstado,
        fechaActualizacion: firebaseModules.Timestamp.now()
      }
    );
    
    const pedidoIndex = pedidosData.findIndex(p => p.id === pedidoId);
    if (pedidoIndex !== -1) {
      pedidosData[pedidoIndex].estado = nuevoEstado;
    }
    
    mostrarTabPedidos();
    actualizarEstadisticas();
    mostrarNotificacion(`Pedido actualizado a: ${formatearEstado(nuevoEstado)}`, 'success');
    
  } catch (error) {
    console.error("Error actualizando estado:", error);
    mostrarNotificacion('Error actualizando el pedido', 'error');
  }
};

window.abrirModalPedido = function(pedidoId) {
  const pedido = pedidosData.find(p => p.id === pedidoId);
  if (!pedido) return;
  
  modalBody.innerHTML = `
    <div class="pedido-detalles-modal">
      <div class="detalles-generales">
        <h3>📦 Pedido #${pedido.numeroPedido || pedido.id.slice(-6)}</h3>
        <div class="info-grid">
          <p><strong>Estado:</strong> <span class="estado-badge estado-${pedido.estado || 'pendiente'}">${formatearEstado(pedido.estado || 'pendiente')}</span></p>
          <p><strong>Fecha:</strong> ${formatearFecha(pedido.fecha)}</p>
          <p><strong>Total:</strong> $${formatearPrecio(pedido.total || 0)}</p>
        </div>
      </div>
      
      <div class="detalles-cliente-modal">
        <h4>👤 Cliente</h4>
        <div class="cliente-info">
          <p><strong>Nombre:</strong> ${pedido.datosCliente?.nombre || 'No especificado'}</p>
          <p><strong>Email:</strong> ${pedido.datosCliente?.email || 'No especificado'}</p>
          <p><strong>Teléfono:</strong> ${pedido.datosCliente?.telefono || 'No especificado'}</p>
          <p><strong>Dirección:</strong> ${pedido.datosCliente?.direccion || 'No especificada'}</p>
          <p><strong>Ciudad:</strong> ${pedido.datosCliente?.ciudad || 'No especificada'}</p>
          ${pedido.datosCliente?.notas ? `<p><strong>Notas:</strong> ${pedido.datosCliente.notas}</p>` : ''}
        </div>
      </div>
      
      <div class="productos-modal">
        <h4>☕ Productos</h4>
        <div class="productos-list-modal">
          ${(pedido.pedido || []).map(producto => `
            <div class="producto-modal-item">
              <div class="producto-info">
                <h5>${producto.producto}</h5>
                <p>Precio unitario: $${formatearPrecio(producto.precio)}</p>
              </div>
              <div class="producto-cantidad">
                <span class="cantidad">x${producto.cantidad}</span>
                <span class="subtotal">$${formatearPrecio(producto.precio * producto.cantidad)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div class="acciones-modal">
        <h4>⚙️ Cambiar Estado</h4>
        <div class="estados-buttons">
          <button class="btn-estado btn-pendiente" onclick="cambiarEstadoYCerrar('${pedido.id}', 'pendiente')">
            Pendiente
          </button>
          <button class="btn-estado btn-proceso" onclick="cambiarEstadoYCerrar('${pedido.id}', 'en-proceso')">
            En Proceso
          </button>
          <button class="btn-estado btn-completado" onclick="cambiarEstadoYCerrar('${pedido.id}', 'completado')">
            Completado
          </button>
        </div>
      </div>
    </div>
  `;
  
  modal.style.display = 'block';
};

window.cambiarEstadoYCerrar = async function(pedidoId, nuevoEstado) {
  await cambiarEstado(pedidoId, nuevoEstado);
  cerrarModal();
};

function cerrarModal() {
  if (modal) modal.style.display = 'none';
}

async function cargarMensajes() {
  try {
    const q = firebaseModules.query(
      firebaseModules.collection(firebaseModules.db, "mensajesContacto"), 
      firebaseModules.orderBy("fecha", "desc")
    );
    const querySnapshot = await firebaseModules.getDocs(q);
    
    mensajesData = [];
    querySnapshot.forEach((documento) => {
      mensajesData.push({
        id: documento.id,
        ...documento.data()
      });
    });
    
    // Exponer globalmente para debugging
    window.mensajesData = mensajesData;
    
    if (currentTab === 'mensajes') {
      mostrarTabMensajes();
    }
    
  } catch (error) {
    console.error("Error cargando mensajes:", error);
    mostrarError('Error cargando mensajes');
  }
}

function mostrarTabMensajes() {
  if (!listaMensajes) return;
  
  if (mensajesData.length === 0) {
    listaMensajes.innerHTML = `
      <div class="empty-state">
        <div class="icon">📩</div>
        <h3>No hay mensajes</h3>
        <p>No se han recibido mensajes de contacto aún.</p>
      </div>
    `;
    return;
  }
  
  listaMensajes.innerHTML = mensajesData.map(mensaje => `
    <div class="mensaje-admin-item ${mensaje.leido ? 'leido' : 'no-leido'}">
      <div class="mensaje-header">
        <div class="mensaje-info">
          <h3>${mensaje.asunto} - ${mensaje.nombre}</h3>
          <p><strong>Email:</strong> ${mensaje.email}</p>
          ${mensaje.telefono ? `<p><strong>Teléfono:</strong> ${mensaje.telefono}</p>` : ''}
          <p><strong>Fecha:</strong> ${formatearFecha(mensaje.fecha)}</p>
          ${!mensaje.leido ? '<span class="badge-nuevo">🆕 Nuevo</span>' : ''}
        </div>
        <div class="mensaje-acciones">
          ${!mensaje.leido ? `
            <button class="btn-estado btn-proceso" onclick="marcarLeido('${mensaje.id}')">
              Marcar como leído
            </button>
          ` : `
            <button class="btn-estado btn-completado" onclick="marcarNoLeido('${mensaje.id}')">
              Marcar como no leído
            </button>
          `}
        </div>
      </div>
      
      <div class="mensaje-contenido">
        <p>${mensaje.mensaje}</p>
      </div>
    </div>
  `).join('');
}

window.marcarLeido = async function(mensajeId) {
  try {
    await firebaseModules.updateDoc(
      firebaseModules.doc(firebaseModules.db, "mensajesContacto", mensajeId), 
      {
        leido: true,
        fechaLeido: firebaseModules.Timestamp.now()
      }
    );
    
    const mensajeIndex = mensajesData.findIndex(m => m.id === mensajeId);
    if (mensajeIndex !== -1) {
      mensajesData[mensajeIndex].leido = true;
    }
    
    mostrarTabMensajes();
    actualizarEstadisticas();
    mostrarNotificacion('Mensaje marcado como leído', 'success');
    
  } catch (error) {
    console.error("Error marcando como leído:", error);
    mostrarNotificacion('Error actualizando el mensaje', 'error');
  }
};

window.marcarNoLeido = async function(mensajeId) {
  try {
    await firebaseModules.updateDoc(
      firebaseModules.doc(firebaseModules.db, "mensajesContacto", mensajeId), 
      { leido: false }
    );
    
    const mensajeIndex = mensajesData.findIndex(m => m.id === mensajeId);
    if (mensajeIndex !== -1) {
      mensajesData[mensajeIndex].leido = false;
    }
    
    mostrarTabMensajes();
    actualizarEstadisticas();
    mostrarNotificacion('Mensaje marcado como no leído', 'success');
    
  } catch (error) {
    console.error("Error marcando como no leído:", error);
    mostrarNotificacion('Error actualizando el mensaje', 'error');
  }
};

function actualizarEstadisticas() {
  if (totalPedidosEl) {
    totalPedidosEl.textContent = pedidosData.length;
  }
  
  if (pedidosPendientesEl) {
    const pendientes = pedidosData.filter(p => 
      !p.estado || p.estado === 'pendiente'
    ).length;
    pedidosPendientesEl.textContent = pendientes;
  }
  
  if (totalMensajesEl) {
    totalMensajesEl.textContent = mensajesData.length;
  }
  
  if (totalClientesEl) {
    const uidsUnicos = new Set();
    
    pedidosData.forEach(pedido => {
      if (pedido.uid) uidsUnicos.add(pedido.uid);
    });
    
    mensajesData.forEach(mensaje => {
      if (mensaje.email) uidsUnicos.add(mensaje.email);
    });
    
    totalClientesEl.textContent = uidsUnicos.size;
  }
}

function formatearFecha(fecha) {
  if (!fecha) return 'Fecha no disponible';
  
  try {
    let fechaObj;
    if (fecha.toDate) {
      fechaObj = fecha.toDate();
    } else {
      fechaObj = new Date(fecha);
    }
    
    return fechaObj.toLocaleString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return 'Fecha inválida';
  }
}

function formatearPrecio(precio) {
  return new Intl.NumberFormat('es-CO').format(precio);
}

function formatearEstado(estado) {
  const estados = {
    'pendiente': '🟡 Pendiente',
    'pendiente-pago': '⏳ Pendiente de pago',
    'pagado': '💳 Pagado',
    'pago-rechazado': '❌ Pago rechazado',
    'pago-cancelado': '🚫 Pago cancelado',
    'en-proceso': '🔄 En Proceso',
    'completado': '✅ Completado'
  };
  return estados[estado] || 'Pendiente';
}

function showLoading() {
  if (listaPedidos) {
    listaPedidos.innerHTML = '<div class="loading">⏳ Cargando pedidos...</div>';
  }
  if (listaMensajes) {
    listaMensajes.innerHTML = '<div class="loading">⏳ Cargando mensajes...</div>';
  }
}

function mostrarError(mensaje) {
  mostrarNotificacion(mensaje, 'error');
}

function mostrarNotificacion(mensaje, tipo = 'info') {
  const notificacion = document.createElement('div');
  notificacion.className = `notificacion ${tipo}`;
  notificacion.innerHTML = `
    <div class="notificacion-content">
      <span>${mensaje}</span>
      <button class="notificacion-close">&times;</button>
    </div>
  `;
  
  notificacion.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    z-index: 9999;
    min-width: 300px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: slideInRight 0.3s ease;
    ${tipo === 'success' ? 'background: linear-gradient(135deg, #10B981, #059669);' : 
      tipo === 'error' ? 'background: linear-gradient(135deg, #EF4444, #DC2626);' : 
      'background: linear-gradient(135deg, #3B82F6, #2563EB);'}
  `;
  
  document.body.appendChild(notificacion);
  
  const autoClose = setTimeout(() => {
    if (notificacion.parentNode) {
      notificacion.remove();
    }
  }, 5000);
  
  const closeBtn = notificacion.querySelector('.notificacion-close');
  closeBtn.addEventListener('click', () => {
    clearTimeout(autoClose);
    notificacion.remove();
  });
}

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(300px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;

document.head.appendChild(styleSheet);

// Exponer variables y funciones globalmente para debugging
window.pedidosData = pedidosData;
window.mensajesData = mensajesData;

console.log('✅ admin.js cargado - Modo optimizado con filtro de fecha corregido');
console.log('💡 Funciones de debug disponibles:');
console.log('   - debugFechas() - Ver todas las fechas de pedidos');
console.log('   - limpiarFiltros() - Limpiar todos los filtros');