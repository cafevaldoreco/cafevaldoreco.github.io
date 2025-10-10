// admin-inventario.js - Gestión COMPLETA de Inventario Café Valdore
// Incluye: Resumen, Exportación, Reportes, Reducción Automática de Stock

// ========================================
// IMPORTACIONES Y CONFIGURACIÓN
// ========================================

let firebaseModules = {
  db: null,
  loaded: false
};

let inventoryManager = null;

// Cargar Firebase
async function loadFirebaseForInventory() {
  if (firebaseModules.loaded) {
    return firebaseModules;
  }

  console.log('📦 Inventario: Cargando Firebase...');

  try {
    const configModule = await import('./firebaseconfig.js');
    firebaseModules.db = configModule.db;
    
    const firestoreModule = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    firebaseModules.collection = firestoreModule.collection;
    firebaseModules.getDocs = firestoreModule.getDocs;
    firebaseModules.getDoc = firestoreModule.getDoc;
    firebaseModules.updateDoc = firestoreModule.updateDoc;
    firebaseModules.setDoc = firestoreModule.setDoc;
    firebaseModules.doc = firestoreModule.doc;
    firebaseModules.query = firestoreModule.query;
    firebaseModules.orderBy = firestoreModule.orderBy;
    firebaseModules.where = firestoreModule.where;
    firebaseModules.Timestamp = firestoreModule.Timestamp;
    firebaseModules.onSnapshot = firestoreModule.onSnapshot;
    
    firebaseModules.loaded = true;
    console.log('✅ Inventario: Firebase cargado');
    
    return firebaseModules;
  } catch (error) {
    console.error('❌ Inventario: Error cargando Firebase:', error);
    throw error;
  }
}

// ========================================
// CLASE INVENTORY MANAGER COMPLETA
// ========================================

class InventoryManager {
  constructor(db) {
    this.db = db;
    this.inventoryCache = new Map();
    this.productosCache = new Map();
    this.unsubscribeInventory = null;
  }

  async initialize() {
    try {
      await this.loadProductos();
      await this.syncInventoryWithProducts();
      this.setupRealtimeListeners();
      console.log('✅ Sistema de inventario inicializado');
      return true;
    } catch (error) {
      console.error('❌ Error al inicializar inventario:', error);
      return false;
    }
  }

  async loadProductos() {
    try {
      const productosRef = firebaseModules.collection(this.db, 'productos');
      const snapshot = await firebaseModules.getDocs(productosRef);
      
      this.productosCache.clear();
      snapshot.forEach(doc => {
        this.productosCache.set(doc.id, {
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log(`📦 ${this.productosCache.size} productos cargados`);
    } catch (error) {
      console.error('❌ Error cargando productos:', error);
    }
  }

  async syncInventoryWithProducts() {
    try {
      for (const [id, producto] of this.productosCache) {
        const inventoryRef = firebaseModules.doc(this.db, 'inventario', id);
        const inventorySnap = await firebaseModules.getDoc(inventoryRef);
        
        if (!inventorySnap.exists()) {
          await firebaseModules.setDoc(inventoryRef, {
            stock: 100,
            stockMinimo: 10,
            stockMaximo: 500,
            activo: true,
            ultimaActualizacion: firebaseModules.Timestamp.now(),
            ultimoMotivo: 'Inicialización'
          });
          console.log(`✅ Inventario creado para: ${producto.nombre}`);
        }
      }
    } catch (error) {
      console.error('❌ Error sincronizando inventario:', error);
    }
  }

  setupRealtimeListeners() {
    const inventoryRef = firebaseModules.collection(this.db, 'inventario');
    
    this.unsubscribeInventory = firebaseModules.onSnapshot(inventoryRef, (snapshot) => {
      snapshot.docChanges().forEach(change => {
        const data = change.doc.data();
        this.inventoryCache.set(change.doc.id, {
          id: change.doc.id,
          ...data
        });
      });
      
      window.dispatchEvent(new CustomEvent('inventoryUpdated', {
        detail: this.getAllInventory()
      }));
    });
  }

  getAllInventory() {
    const inventory = {};
    this.inventoryCache.forEach((data, id) => {
      inventory[id] = data;
    });
    return inventory;
  }

  async getStock(productoId) {
    if (this.inventoryCache.has(productoId)) {
      return this.inventoryCache.get(productoId).stock || 0;
    }
    
    try {
      const inventoryRef = firebaseModules.doc(this.db, 'inventario', productoId);
      const snapshot = await firebaseModules.getDoc(inventoryRef);
      return snapshot.exists() ? snapshot.data().stock : 0;
    } catch (error) {
      console.error('❌ Error obteniendo stock:', error);
      return 0;
    }
  }

  getInventoryInfo(productoId) {
    return this.inventoryCache.get(productoId) || null;
  }

  getProductInfo(productoId) {
    return this.productosCache.get(productoId) || null;
  }

  async updateStock(productoId, nuevoStock, motivo = 'manual') {
    try {
      const inventoryRef = firebaseModules.doc(this.db, 'inventario', productoId);
      
      await firebaseModules.updateDoc(inventoryRef, {
        stock: parseInt(nuevoStock),
        ultimaActualizacion: firebaseModules.Timestamp.now(),
        ultimoMotivo: motivo
      });

      await this.registerMovement(productoId, nuevoStock, motivo);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error actualizando stock:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // NUEVA FUNCIÓN: REDUCIR STOCK AL VENDER
  // ========================================
  async reduceStockFromOrder(pedido) {
    try {
      console.log('📦 Reduciendo stock del pedido...', pedido);
      
      const productosVendidos = [];
      
      // Iterar sobre cada producto en el pedido
      for (const item of pedido.pedido) {
        let productoId = null;
        let cantidadTotal = item.cantidad;

        // Identificar el producto según el nombre
        const nombreProducto = item.producto.toLowerCase();
        
        // Casos especiales: Promociones
        if (nombreProducto.includes('promoción') || nombreProducto.includes('promocion')) {
          
          if (nombreProducto.includes('súper') || nombreProducto.includes('super')) {
            // SÚPER PROMOCIÓN: 2 Caturra + 2 Bourbon
            console.log('🎁 Súper Promoción detectada');
            
            // Reducir 2 de Caturra
            const stockCaturra = await this.getStock('cafe-caturra');
            if (stockCaturra >= 2 * cantidadTotal) {
              await this.updateStock(
                'cafe-caturra', 
                stockCaturra - (2 * cantidadTotal), 
                `venta-super-promocion-${pedido.id || 'pedido'}`
              );
              productosVendidos.push({ nombre: 'Café Caturra', cantidad: 2 * cantidadTotal });
            } else {
              console.warn('⚠️ Stock insuficiente de Caturra para súper promoción');
            }
            
            // Reducir 2 de Bourbon
            const stockBourbon = await this.getStock('cafe-bourbon');
            if (stockBourbon >= 2 * cantidadTotal) {
              await this.updateStock(
                'cafe-bourbon', 
                stockBourbon - (2 * cantidadTotal), 
                `venta-super-promocion-${pedido.id || 'pedido'}`
              );
              productosVendidos.push({ nombre: 'Café Bourbon', cantidad: 2 * cantidadTotal });
            } else {
              console.warn('⚠️ Stock insuficiente de Bourbon para súper promoción');
            }
            
          } else {
            // PROMOCIÓN NORMAL: 1 Caturra + 1 Bourbon
            console.log('🎁 Promoción normal detectada');
            
            // Reducir 1 de Caturra
            const stockCaturra = await this.getStock('cafe-caturra');
            if (stockCaturra >= cantidadTotal) {
              await this.updateStock(
                'cafe-caturra', 
                stockCaturra - cantidadTotal, 
                `venta-promocion-${pedido.id || 'pedido'}`
              );
              productosVendidos.push({ nombre: 'Café Caturra', cantidad: cantidadTotal });
            } else {
              console.warn('⚠️ Stock insuficiente de Caturra para promoción');
            }
            
            // Reducir 1 de Bourbon
            const stockBourbon = await this.getStock('cafe-bourbon');
            if (stockBourbon >= cantidadTotal) {
              await this.updateStock(
                'cafe-bourbon', 
                stockBourbon - cantidadTotal, 
                `venta-promocion-${pedido.id || 'pedido'}`
              );
              productosVendidos.push({ nombre: 'Café Bourbon', cantidad: cantidadTotal });
            } else {
              console.warn('⚠️ Stock insuficiente de Bourbon para promoción');
            }
          }
          
          continue; // Siguiente producto
        }

        // Productos individuales: Buscar por nombre
        for (const [id, producto] of this.productosCache) {
          if (producto.nombre.toLowerCase() === nombreProducto) {
            productoId = id;
            break;
          }
        }

        // Si no se encontró por nombre exacto, buscar parcialmente
        if (!productoId) {
          for (const [id, producto] of this.productosCache) {
            if (nombreProducto.includes(producto.nombre.toLowerCase()) || 
                producto.nombre.toLowerCase().includes(nombreProducto)) {
              productoId = id;
              break;
            }
          }
        }

        // Reducir stock si se encontró el producto
        if (productoId) {
          const stockActual = await this.getStock(productoId);
          
          if (stockActual >= cantidadTotal) {
            const nuevoStock = stockActual - cantidadTotal;
            await this.updateStock(
              productoId, 
              nuevoStock, 
              `venta-${pedido.id || 'pedido'}`
            );
            
            const producto = this.getProductInfo(productoId);
            productosVendidos.push({ 
              nombre: producto.nombre, 
              cantidad: cantidadTotal 
            });
            
            console.log(`✅ ${producto.nombre}: ${stockActual} → ${nuevoStock} (-${cantidadTotal})`);
          } else {
            console.warn(`⚠️ Stock insuficiente: ${item.producto} (disponible: ${stockActual}, solicitado: ${cantidadTotal})`);
          }
        } else {
          console.warn(`⚠️ Producto no encontrado en inventario: ${item.producto}`);
        }
      }

      console.log('✅ Stock reducido correctamente:', productosVendidos);
      return { success: true, productosVendidos };
      
    } catch (error) {
      console.error('❌ Error reduciendo stock:', error);
      return { success: false, error: error.message };
    }
  }

  async adjustStock(productoId, cambio, motivo = 'ajuste-manual') {
    try {
      const stockActual = await this.getStock(productoId);
      const nuevoStock = Math.max(0, stockActual + cambio);
      
      return await this.updateStock(productoId, nuevoStock, motivo);
    } catch (error) {
      console.error('❌ Error ajustando stock:', error);
      return { success: false, error: error.message };
    }
  }

  async toggleActive(productoId, activo) {
    try {
      const inventoryRef = firebaseModules.doc(this.db, 'inventario', productoId);
      
      await firebaseModules.updateDoc(inventoryRef, {
        activo: activo,
        ultimaActualizacion: firebaseModules.Timestamp.now()
      });
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error cambiando estado:', error);
      return { success: false, error: error.message };
    }
  }

  async registerMovement(productoId, cantidad, motivo) {
    try {
      const movimientosRef = firebaseModules.collection(this.db, 'movimientos_inventario');
      const producto = this.getProductInfo(productoId);
      
      await firebaseModules.setDoc(firebaseModules.doc(movimientosRef), {
        productoId: productoId,
        productoNombre: producto?.nombre || productoId,
        cantidad: parseInt(cantidad),
        motivo: motivo,
        fecha: firebaseModules.Timestamp.now(),
        timestamp: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      console.error('❌ Error registrando movimiento:', error);
      return false;
    }
  }

  async getMovementHistory(productoId = null, limit = 50) {
    try {
      const movimientosRef = firebaseModules.collection(this.db, 'movimientos_inventario');
      let q;
      
      if (productoId) {
        q = firebaseModules.query(
          movimientosRef,
          firebaseModules.where('productoId', '==', productoId),
          firebaseModules.orderBy('fecha', 'desc')
        );
      } else {
        q = firebaseModules.query(
          movimientosRef,
          firebaseModules.orderBy('fecha', 'desc')
        );
      }
      
      const snapshot = await firebaseModules.getDocs(q);
      const movimientos = [];
      
      let count = 0;
      snapshot.forEach(doc => {
        if (count < limit) {
          movimientos.push({
            id: doc.id,
            ...doc.data()
          });
          count++;
        }
      });
      
      return movimientos;
    } catch (error) {
      console.error('❌ Error obteniendo historial:', error);
      return [];
    }
  }

  getLowStockProducts() {
    const lowStock = [];
    
    this.inventoryCache.forEach((inv, id) => {
      const producto = this.getProductInfo(id);
      if (inv.stock <= inv.stockMinimo && inv.stock > 0) {
        lowStock.push({
          id,
          nombre: producto?.nombre || id,
          ...inv
        });
      }
    });
    
    return lowStock;
  }

  getOutOfStockProducts() {
    const outOfStock = [];
    
    this.inventoryCache.forEach((inv, id) => {
      const producto = this.getProductInfo(id);
      if (inv.stock === 0 || inv.activo === false) {
        outOfStock.push({
          id,
          nombre: producto?.nombre || id,
          ...inv
        });
      }
    });
    
    return outOfStock;
  }

  generateReport() {
    const report = {
      totalProductos: this.inventoryCache.size,
      stockTotal: 0,
      productosActivos: 0,
      productosInactivos: 0,
      productosBajoStock: 0,
      productosAgotados: 0,
      productos: []
    };

    this.inventoryCache.forEach((inv, id) => {
      const producto = this.getProductInfo(id);
      
      report.stockTotal += inv.stock;
      
      if (inv.activo !== false) {
        report.productosActivos++;
      } else {
        report.productosInactivos++;
      }
      
      if (inv.stock === 0) {
        report.productosAgotados++;
      } else if (inv.stock <= inv.stockMinimo) {
        report.productosBajoStock++;
      }

      report.productos.push({
        id,
        nombre: producto?.nombre || id,
        precio: producto?.precio || 0,
        ...inv
      });
    });

    report.fechaGeneracion = new Date().toISOString();
    return report;
  }

  cleanup() {
    if (this.unsubscribeInventory) {
      this.unsubscribeInventory();
    }
  }
}

// ========================================
// VARIABLES GLOBALES DE LA INTERFAZ
// ========================================

let currentTab = 'resumen';
let inventarioData = [];
let movimientosData = [];

const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');
const btnActualizar = document.getElementById('btnActualizar');
const btnExportar = document.getElementById('btnExportar');

const totalProductosEl = document.getElementById('totalProductos');
const productosActivosEl = document.getElementById('productosActivos');
const stockBajoEl = document.getElementById('stockBajo');
const agotadosEl = document.getElementById('agotados');
const stockTotalEl = document.getElementById('stockTotal');

// ========================================
// INICIALIZACIÓN
// ========================================

document.addEventListener('DOMContentLoaded', async function() {
  await initializeInventory();
  setupOrderListener(); // NUEVO: Escuchar pedidos
});

async function initializeInventory() {
  try {
    showLoading();
    
    await loadFirebaseForInventory();
    
    inventoryManager = new InventoryManager(firebaseModules.db);
    await inventoryManager.initialize();
    
    await cargarDatos();
    
    setupEventListeners();
    
    actualizarEstadisticas();
    mostrarResumen();
    
    console.log('✅ Panel de inventario listo');
    
  } catch (error) {
    console.error('❌ Error inicializando panel:', error);
    mostrarError('Error cargando el panel de inventario');
  }
}

// ========================================
// NUEVO: ESCUCHAR PEDIDOS EN TIEMPO REAL
// ========================================

function setupOrderListener() {
  const pedidosRef = firebaseModules.collection(firebaseModules.db, 'pedidos');
  
  firebaseModules.onSnapshot(pedidosRef, (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === 'added') {
        const pedido = {
          id: change.doc.id,
          ...change.doc.data()
        };
        
        // Solo reducir stock si el pedido es nuevo (tiene menos de 5 segundos)
        const fechaPedido = pedido.fecha?.toDate?.() || new Date(pedido.fecha);
        const ahora = new Date();
        const diferencia = (ahora - fechaPedido) / 1000; // segundos
        
        if (diferencia < 5) {
          console.log('🆕 Nuevo pedido detectado:', pedido.id);
          await inventoryManager.reduceStockFromOrder(pedido);
          mostrarNotificacion(`📦 Stock actualizado por pedido ${pedido.id.slice(-6)}`, 'success');
        }
      }
    });
  });
  
  console.log('👂 Escuchando nuevos pedidos para actualizar inventario...');
}

// function setupEventListeners() {
//   tabButtons.forEach(button => {
//     button.addEventListener('click', (e) => {
//       if (button.hasAttribute('data-tab')) {
//         e.preventDefault();
//         switchTab(button.dataset.tab);
//       }
//     });
//   });

//   if (btnActualizar) {
//     btnActualizar.addEventListener('click', async () => {
//       const originalText = btnActualizar.innerHTML;
//       btnActualizar.innerHTML = '⏳ Actualizando...';
//       btnActualizar.disabled = true;
      
//       await cargarDatos();
//       mostrarNotificacion('Datos actualizados correctamente', 'success');
      
//       btnActualizar.innerHTML = originalText;
//       btnActualizar.disabled = false;
//     });
//   }

//   if (btnExportar) {
//     btnExportar.addEventListener('click', exportarInventario);
//   }

//   const buscarProducto = document.getElementById('buscarProducto');
//   const filtroEstado = document.getElementById('filtroEstadoInventario');
  
//   if (buscarProducto) {
//     buscarProducto.addEventListener('input', filtrarInventario);
//   }
  
//   if (filtroEstado) {
//     filtroEstado.addEventListener('change', filtrarInventario);
//   }

//   window.addEventListener('inventoryUpdated', () => {
//     actualizarEstadisticas();
//     if (currentTab === 'inventario') {
//       mostrarInventario();
//     } else if (currentTab === 'alertas') {
//       mostrarAlertas();
//     } else if (currentTab === 'resumen') {
//       mostrarResumen();
//     }
//   });
// }

//NUEVA FUNCION DE LISTENERS
function setupEventListeners() {
  tabButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      if (button.hasAttribute('data-tab')) {
        e.preventDefault();
        switchTab(button.dataset.tab);
      }
    });
  });

  if (btnActualizar) {
    btnActualizar.addEventListener('click', async () => {
      const originalText = btnActualizar.innerHTML;
      btnActualizar.innerHTML = '⏳ Actualizando...';
      btnActualizar.disabled = true;
      
      await cargarDatos();
      mostrarNotificacion('Datos actualizados correctamente', 'success');
      
      btnActualizar.innerHTML = originalText;
      btnActualizar.disabled = false;
    });
  }

  if (btnExportar) {
    btnExportar.addEventListener('click', exportarInventario);
  }

  // ========================================
  // 🔧 CORRECCIÓN: Listeners de filtrado
  // ========================================
  const buscarProducto = document.getElementById('buscarProducto');
  const filtroEstado = document.getElementById('filtroEstadoInventario');
  
  if (buscarProducto) {
    buscarProducto.addEventListener('input', function(e) {
      console.log('🔍 Búsqueda activada:', e.target.value);
      filtrarInventario();
    });
    console.log('✅ Listener de búsqueda configurado');
  } else {
    console.warn('⚠️ No se encontró el elemento #buscarProducto en el HTML');
  }
  
  if (filtroEstado) {
    filtroEstado.addEventListener('change', function(e) {
      console.log('🔍 Filtro activado:', e.target.value);
      filtrarInventario();
    });
    console.log('✅ Listener de filtro configurado');
  } else {
    console.warn('⚠️ No se encontró el elemento #filtroEstadoInventario en el HTML');
  }

  window.addEventListener('inventoryUpdated', () => {
    actualizarEstadisticas();
    if (currentTab === 'inventario') {
      mostrarInventario();
    } else if (currentTab === 'alertas') {
      mostrarAlertas();
    } else if (currentTab === 'resumen') {
      mostrarResumen();
    }
  });
  
  console.log('✅ Todos los event listeners configurados');
}

function switchTab(tabName) {
  currentTab = tabName;
  
  tabButtons.forEach(btn => btn.classList.remove('active'));
  const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
  if (activeButton) activeButton.classList.add('active');
  
  tabPanes.forEach(pane => pane.classList.remove('active'));
  const activePane = document.getElementById(`tab-${tabName}`);
  if (activePane) activePane.classList.add('active');
  
  switch(tabName) {
    case 'resumen':
      mostrarResumen();
      break;
    case 'inventario':
      mostrarInventario();
      break;
    case 'alertas':
      mostrarAlertas();
      break;
    case 'movimientos':
      mostrarMovimientos();
      break;
  }
}

async function cargarDatos() {
  try {
    inventarioData = Object.values(inventoryManager.getAllInventory());
    movimientosData = await inventoryManager.getMovementHistory(null, 100);
    
    console.log(`📊 Datos cargados: ${inventarioData.length} productos, ${movimientosData.length} movimientos`);
    
  } catch (error) {
    console.error('❌ Error cargando datos:', error);
  }
}

function actualizarEstadisticas() {
  const report = inventoryManager.generateReport();
  
  if (totalProductosEl) totalProductosEl.textContent = report.totalProductos;
  if (productosActivosEl) productosActivosEl.textContent = report.productosActivos;
  if (stockBajoEl) stockBajoEl.textContent = report.productosBajoStock;
  if (agotadosEl) agotadosEl.textContent = report.productosAgotados;
  if (stockTotalEl) stockTotalEl.textContent = report.stockTotal;
}

function mostrarResumen() {
  const alertasRapidasLista = document.getElementById('alertasRapidasLista');
  if (!alertasRapidasLista) return;
  
  const lowStock = inventoryManager.getLowStockProducts();
  const outOfStock = inventoryManager.getOutOfStockProducts();
  
  let html = '';
  
  outOfStock.slice(0, 3).forEach(item => {
    html += `
      <div class="alerta-item critica">
        <span class="alerta-icon">🔴</span>
        <div class="alerta-contenido">
          <strong>${item.nombre}</strong>
          <span>Stock: ${item.stock} - ${item.activo === false ? 'Inactivo' : 'Agotado'}</span>
        </div>
      </div>
    `;
  });
  
  lowStock.slice(0, 3).forEach(item => {
    html += `
      <div class="alerta-item advertencia">
        <span class="alerta-icon">⚠️</span>
        <div class="alerta-contenido">
          <strong>${item.nombre}</strong>
          <span>Stock: ${item.stock} / Mínimo: ${item.stockMinimo}</span>
        </div>
      </div>
    `;
  });
  
  if (html === '') {
    html = `
      <div class="empty-state-inventory">
        <div class="icon">✅</div>
        <p>¡Todo en orden! No hay alertas</p>
      </div>
    `;
  }
  
  alertasRapidasLista.innerHTML = html;
}

// function mostrarInventario() {
//   const tbody = document.getElementById('inventoryTableBody');
//   if (!tbody) return;
  
//   const inventarioFiltrado = filtrarInventarioData();
  
//   if (inventarioFiltrado.length === 0) {
//     tbody.innerHTML = `
//       <tr>
//         <td colspan="7" class="empty-state-inventory">
//           <div class="icon">📦</div>
//           <p>No se encontraron productos</p>
//         </td>
//       </tr>
//     `;
//     return;
//   }
  
//   tbody.innerHTML = inventarioFiltrado.map(item => {
//     const producto = inventoryManager.getProductInfo(item.id);
//     const fecha = item.ultimaActualizacion?.toDate ? 
//       item.ultimaActualizacion.toDate().toLocaleDateString('es-CO') : 
//       'N/A';
    
//     let stockBadgeClass = 'ok';
//     let stockBadgeText = 'Normal';
    
//     if (item.stock === 0) {
//       stockBadgeClass = 'agotado';
//       stockBadgeText = 'Agotado';
//     } else if (item.stock <= item.stockMinimo) {
//       stockBadgeClass = 'bajo';
//       stockBadgeText = 'Stock Bajo';
//     }
    
//     return `
//       <tr>
//         <td><strong>${producto?.nombre || item.id}</strong></td>
//         <td><span class="stock-badge ${stockBadgeClass}">${item.stock}</span></td>
//         <td>${item.stockMinimo}</td>
//         <td>${item.stockMaximo}</td>
//         <td>
//           <label class="toggle-switch">
//             <input type="checkbox" ${item.activo !== false ? 'checked' : ''} 
//                    onchange="toggleProductActive('${item.id}', this.checked)">
//             <span class="toggle-slider"></span>
//           </label>
//         </td>
//         <td>${fecha}</td>
//         <td>
//           <div class="stock-controls">
//             <button class="stock-btn btn-decrease" onclick="adjustStockUI('${item.id}', -10)">-10</button>
//             <input type="number" class="stock-input" value="${item.stock}" 
//                    id="stock-${item.id}" min="0">
//             <button class="stock-btn btn-increase" onclick="adjustStockUI('${item.id}', 10)">+10</button>
//             <button class="stock-btn btn-update" onclick="updateStockUI('${item.id}')">💾</button>
//             <button class="stock-btn btn-history" onclick="verHistorial('${item.id}')">📜</button>
//           </div>
//         </td>
//       </tr>
//     `;
//   }).join('');
// }

//NUEVA FUNCION MOSTRAR INVENTARIO
function mostrarInventario() {
  const tbody = document.getElementById('inventoryTableBody');
  if (!tbody) {
    console.error('❌ No se encontró inventoryTableBody');
    return;
  }
  
  const inventarioFiltrado = filtrarInventarioData();
  
  console.log(`📋 Mostrando ${inventarioFiltrado.length} productos en tabla`);
  
  if (inventarioFiltrado.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state-inventory">
          <div class="icon">🔍</div>
          <p>No se encontraron productos con esos criterios</p>
          <button onclick="limpiarFiltrosInventario()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #DAA520; color: white; border: none; border-radius: 8px; cursor: pointer;">
            Limpiar filtros
          </button>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = inventarioFiltrado.map(item => {
    const producto = inventoryManager.getProductInfo(item.id);
    const fecha = item.ultimaActualizacion?.toDate ? 
      item.ultimaActualizacion.toDate().toLocaleDateString('es-CO') : 
      'N/A';
    
    let stockBadgeClass = 'ok';
    let stockBadgeText = 'Normal';
    
    if (item.stock === 0) {
      stockBadgeClass = 'agotado';
      stockBadgeText = 'Agotado';
    } else if (item.stock <= item.stockMinimo) {
      stockBadgeClass = 'bajo';
      stockBadgeText = 'Stock Bajo';
    }
    
    return `
      <tr>
        <td><strong>${producto?.nombre || item.id}</strong></td>
        <td><span class="stock-badge ${stockBadgeClass}">${item.stock}</span></td>
        <td>${item.stockMinimo}</td>
        <td>${item.stockMaximo}</td>
        <td>
          <label class="toggle-switch">
            <input type="checkbox" ${item.activo !== false ? 'checked' : ''} 
                   onchange="toggleProductActive('${item.id}', this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </td>
        <td>${fecha}</td>
        <td>
          <div class="stock-controls">
            <button class="stock-btn btn-decrease" onclick="adjustStockUI('${item.id}', -10)">-10</button>
            <input type="number" class="stock-input" value="${item.stock}" 
                   id="stock-${item.id}" min="0">
            <button class="stock-btn btn-increase" onclick="adjustStockUI('${item.id}', 10)">+10</button>
            <button class="stock-btn btn-update" onclick="updateStockUI('${item.id}')">💾</button>
            <button class="stock-btn btn-history" onclick="verHistorial('${item.id}')">📜</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// function filtrarInventario() {
//   mostrarInventario();
// }

//NUEVA FUNCION FILTRAR INVENTARIO
function filtrarInventario() {
  console.log('🔄 Ejecutando filtrarInventario()');
  mostrarInventario();
}

// function filtrarInventarioData() {
//   let filtered = [...inventarioData];
  
//   const buscarTexto = document.getElementById('buscarProducto')?.value.toLowerCase();
//   const filtroEstado = document.getElementById('filtroEstadoInventario')?.value;
  
//   if (buscarTexto) {
//     filtered = filtered.filter(item => {
//       const producto = inventoryManager.getProductInfo(item.id);
//       const nombre = producto?.nombre?.toLowerCase() || '';
//       return nombre.includes(buscarTexto) || item.id.toLowerCase().includes(buscarTexto);
//     });
//   }
  
//   if (filtroEstado && filtroEstado !== 'todos') {
//     filtered = filtered.filter(item => {
//       switch(filtroEstado) {
//         case 'activos':
//           return item.activo !== false;
//         case 'inactivos':
//           return item.activo === false;
//         case 'stock-bajo':
//           return item.stock <= item.stockMinimo && item.stock > 0;
//         case 'agotados':
//           return item.stock === 0;
//         default:
//           return true;
//       }
//     });
//   }
  
//   return filtered;
// }
//NUEVO FILTRO DE INVENTARIO
function filtrarInventarioData() {
  let filtered = [...inventarioData];
  
  const buscarInput = document.getElementById('buscarProducto');
  const filtroEstadoSelect = document.getElementById('filtroEstadoInventario');
  
  const buscarTexto = (buscarInput?.value || '').toLowerCase().trim();
  const filtroEstado = filtroEstadoSelect?.value || 'todos';
  
  console.log('🔍 Criterios de filtrado:', { 
    buscarTexto, 
    filtroEstado, 
    totalProductos: filtered.length 
  });
  
  // Filtrar por texto de búsqueda
  if (buscarTexto !== '') {
    filtered = filtered.filter(item => {
      const producto = inventoryManager.getProductInfo(item.id);
      const nombre = (producto?.nombre || '').toLowerCase();
      const id = (item.id || '').toLowerCase();
      
      const coincide = nombre.includes(buscarTexto) || id.includes(buscarTexto);
      
      if (coincide) {
        console.log(`   ✓ Coincide: ${producto?.nombre || item.id}`);
      }
      
      return coincide;
    });
    
    console.log(`   → Después de buscar "${buscarTexto}": ${filtered.length} productos`);
  }
  
  // Filtrar por estado
  if (filtroEstado && filtroEstado !== 'todos') {
    const antesDelFiltro = filtered.length;
    
    filtered = filtered.filter(item => {
      switch(filtroEstado) {
        case 'activos':
          return item.activo !== false;
        case 'inactivos':
          return item.activo === false;
        case 'stock-bajo':
          return item.stock <= item.stockMinimo && item.stock > 0;
        case 'agotados':
          return item.stock === 0;
        default:
          return true;
      }
    });
    
    console.log(`   → Después de filtrar por "${filtroEstado}": ${filtered.length} productos (de ${antesDelFiltro})`);
  }
  
  console.log(`📊 Resultado final: ${filtered.length} productos`);
  
  return filtered;
}

function mostrarAlertas() {
  const container = document.getElementById('alertasContainer');
  if (!container) return;
  
  const lowStock = inventoryManager.getLowStockProducts();
  const outOfStock = inventoryManager.getOutOfStockProducts();
  
  let html = '';
  
  outOfStock.forEach(item => {
    html += `
      <div class="alerta-card critica">
        <div class="alerta-header">
          <span style="font-size: 2rem;">🔴</span>
          <h4>${item.nombre}</h4>
        </div>
        <div class="alerta-body">
          <p><strong>Estado:</strong> ${item.activo === false ? 'Producto inactivo' : 'Stock agotado'}</p>
          <p><strong>Stock actual:</strong> ${item.stock}</p>
          <p><strong>Última actualización:</strong> ${item.ultimaActualizacion?.toDate().toLocaleString('es-CO') || 'N/A'}</p>
        </div>
      </div>
    `;
  });
  
  lowStock.forEach(item => {
    html += `
      <div class="alerta-card advertencia">
        <div class="alerta-header">
          <span style="font-size: 2rem;">⚠️</span>
          <h4>${item.nombre}</h4>
        </div>
        <div class="alerta-body">
          <p><strong>Estado:</strong> Stock bajo</p>
          <p><strong>Stock actual:</strong> ${item.stock} unidades</p>
          <p><strong>Stock mínimo:</strong> ${item.stockMinimo} unidades</p>
          <p><strong>Recomendación:</strong> Reabastecer pronto</p>
        </div>
      </div>
    `;
  });
  
  if (html === '') {
    html = `
      <div class="empty-state-inventory">
        <div class="icon">✅</div>
        <h3>¡Todo en orden!</h3>
        <p>No hay alertas de inventario en este momento</p>
      </div>
    `;
  }
  
  container.innerHTML = html;
}

async function mostrarMovimientos() {
  const container = document.getElementById('movimientosContainer');
  if (!container) return;
  
  container.innerHTML = '<div class="loading">Cargando movimientos...</div>';
  
  movimientosData = await inventoryManager.getMovementHistory(null, 50);
  
  if (movimientosData.length === 0) {
    container.innerHTML = `
      <div class="empty-state-inventory">
        <div class="icon">📜</div>
        <h3>No hay movimientos</h3>
        <p>No se han registrado movimientos de inventario</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = movimientosData.map(mov => {
    const fecha = mov.fecha?.toDate ? 
      mov.fecha.toDate().toLocaleString('es-CO') : 
      mov.timestamp;
    
    const cantidadClass = mov.cantidad >= 0 ? 'positivo' : 'negativo';
    const simbolo = mov.cantidad >= 0 ? '+' : '';
    
    return `
      <div class="movimiento-item">
        <div class="movimiento-info">
          <strong>${mov.productoNombre || mov.productoId}</strong>
          <small>${fecha}</small>
        </div>
        <span class="movimiento-cantidad ${cantidadClass}">
          ${simbolo}${mov.cantidad}
        </span>
        <span class="movimiento-motivo">${mov.motivo}</span>
      </div>
    `;
  }).join('');
}

// ========================================
// FUNCIONES DE ACCIONES
// ========================================

window.adjustStockUI = function(productoId, cambio) {
  const input = document.getElementById(`stock-${productoId}`);
  if (input) {
    const nuevoValor = Math.max(0, parseInt(input.value) + cambio);
    input.value = nuevoValor;
  }
};

window.updateStockUI = async function(productoId) {
  const input = document.getElementById(`stock-${productoId}`);
  if (!input) return;
  
  const nuevoStock = parseInt(input.value);
  
  if (isNaN(nuevoStock) || nuevoStock < 0) {
    mostrarNotificacion('Stock inválido', 'error');
    return;
  }
  
  const result = await inventoryManager.updateStock(productoId, nuevoStock, 'ajuste-manual');
  
  if (result.success) {
    mostrarNotificacion('Stock actualizado correctamente', 'success');
    actualizarEstadisticas();
  } else {
    mostrarNotificacion('Error actualizando stock', 'error');
  }
};

window.toggleProductActive = async function(productoId, activo) {
  const result = await inventoryManager.toggleActive(productoId, activo);
  
  if (result.success) {
    mostrarNotificacion(`Producto ${activo ? 'activado' : 'desactivado'}`, 'success');
    actualizarEstadisticas();
  } else {
    mostrarNotificacion('Error cambiando estado', 'error');
  }
};

window.verHistorial = async function(productoId) {
  const modal = document.getElementById('modalHistorial');
  const modalBody = document.getElementById('modalHistorialBody');
  
  if (!modal || !modalBody) return;
  
  modalBody.innerHTML = '<div class="loading">Cargando historial...</div>';
  modal.style.display = 'block';
  
  const historial = await inventoryManager.getMovementHistory(productoId, 50);
  const producto = inventoryManager.getProductInfo(productoId);
  
  if (historial.length === 0) {
    modalBody.innerHTML = `
      <div class="empty-state-inventory">
        <p>No hay movimientos registrados para este producto</p>
      </div>
    `;
    return;
  }
  
  modalBody.innerHTML = `
    <h3 style="margin-bottom: 1rem;">Historial de ${producto?.nombre || productoId}</h3>
    <div class="historial-lista">
      ${historial.map(mov => {
        const fecha = mov.fecha?.toDate ? 
          mov.fecha.toDate().toLocaleString('es-CO') : 
          mov.timestamp;
        
        const cantidadClass = mov.cantidad >= 0 ? 'positivo' : 'negativo';
        const simbolo = mov.cantidad >= 0 ? '+' : '';
        
        return `
          <div class="historial-item">
            <div>
              <small>${fecha}</small><br>
              <strong>${mov.motivo}</strong>
            </div>
            <span class="movimiento-cantidad ${cantidadClass}">
              ${simbolo}${mov.cantidad}
            </span>
          </div>
        `;
      }).join('')}
    </div>
  `;
};

window.cerrarModalHistorial = function() {
  const modal = document.getElementById('modalHistorial');
  if (modal) modal.style.display = 'none';
};

window.cerrarModalStock = function() {
  const modal = document.getElementById('modalStock');
  if (modal) modal.style.display = 'none';
};

window.addEventListener('click', (e) => {
  const modalHistorial = document.getElementById('modalHistorial');
  const modalStock = document.getElementById('modalStock');
  
  if (e.target === modalHistorial) {
    cerrarModalHistorial();
  }
  if (e.target === modalStock) {
    cerrarModalStock();
  }
});

// ========================================
// ACCIONES RÁPIDAS
// ========================================

window.verStockBajo = function() {
  document.getElementById('filtroEstadoInventario').value = 'stock-bajo';
  switchTab('inventario');
  filtrarInventario();
};

window.verAgotados = function() {
  document.getElementById('filtroEstadoInventario').value = 'agotados';
  switchTab('inventario');
  filtrarInventario();
};

window.generarReporte = function() {
  const report = inventoryManager.generateReport();
  
  console.log('📊 REPORTE COMPLETO DE INVENTARIO:', report);
  console.table(report.productos.map(p => ({
    Producto: p.nombre,
    Stock: p.stock,
    Precio: `${p.precio.toLocaleString('es-CO')}`,
    'Valor Stock': `${(p.stock * p.precio).toLocaleString('es-CO')}`,
    Estado: p.activo !== false ? '✅ Activo' : '❌ Inactivo'
  })));
  
  mostrarNotificacion('Reporte generado. Revisa la consola (F12)', 'info');
  
  alert(`📊 REPORTE DE INVENTARIO - CAFÉ VALDORE\n\n` +
    `📦 Total Productos: ${report.totalProductos}\n` +
    `📈 Stock Total: ${report.stockTotal} unidades\n` +
    `✅ Productos Activos: ${report.productosActivos}\n` +
    `⚠️ Stock Bajo: ${report.productosBajoStock}\n` +
    `🔴 Agotados: ${report.productosAgotados}\n` +
    `💰 Valor Total Inventario: ${report.productos.reduce((sum, p) => sum + (p.stock * p.precio), 0).toLocaleString('es-CO')}\n\n` +
    `📅 Generado: ${new Date(report.fechaGeneracion).toLocaleString('es-CO')}\n\n` +
    `✅ Ver detalles completos en la consola (F12)`
  );
};

window.sincronizarInventario = async function() {
  mostrarNotificacion('Sincronizando inventario...', 'info');
  
  await inventoryManager.syncInventoryWithProducts();
  await cargarDatos();
  actualizarEstadisticas();
  mostrarInventario();
  
  mostrarNotificacion('Inventario sincronizado correctamente', 'success');
};


// 3️⃣ Función auxiliar para limpiar filtros
window.limpiarFiltrosInventario = function() {
  const buscar = document.getElementById('buscarProducto');
  const filtro = document.getElementById('filtroEstadoInventario');
  
  if (buscar) buscar.value = '';
  if (filtro) filtro.value = 'todos';
  
  console.log('🧹 Filtros limpiados');
  mostrarInventario();
  mostrarNotificacion('Filtros limpiados', 'info');
};

console.log('✅ Funciones de filtrado cargadas correctamente');

// ========================================
// EXPORTAR INVENTARIO A CSV
// ========================================

function exportarInventario() {
  const report = inventoryManager.generateReport();
  
  // Crear CSV con información completa
  let csv = 'ID,Nombre,Precio,Stock,Stock Mínimo,Stock Máximo,Valor Stock,Activo,Última Actualización\n';
  
  report.productos.forEach(item => {
    const fecha = item.ultimaActualizacion?.toDate ? 
      item.ultimaActualizacion.toDate().toISOString() : 
      'N/A';
    
    const valorStock = item.stock * item.precio;
    
    csv += `"${item.id}","${item.nombre}",${item.precio},${item.stock},${item.stockMinimo},${item.stockMaximo},${valorStock},${item.activo !== false ? 'Sí' : 'No'},"${fecha}"\n`;
  });
  
  // Agregar resumen al final
  csv += '\n\nRESUMEN\n';
  csv += `Total Productos,${report.totalProductos}\n`;
  csv += `Stock Total,${report.stockTotal}\n`;
  csv += `Productos Activos,${report.productosActivos}\n`;
  csv += `Stock Bajo,${report.productosBajoStock}\n`;
  csv += `Agotados,${report.productosAgotados}\n`;
  csv += `Valor Total Inventario,${report.productos.reduce((sum, p) => sum + (p.stock * p.precio), 0).toLocaleString('es-CO')}\n`;
  
  // Descargar archivo
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().split('T')[0];
  
  link.href = url;
  link.download = `inventario-cafe-valdore-${timestamp}.csv`;
  link.click();
  
  URL.revokeObjectURL(url);
  
  mostrarNotificacion('✅ Inventario exportado a CSV', 'success');
}

// ========================================
// UTILIDADES
// ========================================

function showLoading() {
  const tbody = document.getElementById('inventoryTableBody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="7" class="loading">⏳ Cargando inventario...</td></tr>';
  }
  
  const alertasRapidas = document.getElementById('alertasRapidasLista');
  if (alertasRapidas) {
    alertasRapidas.innerHTML = '<div class="loading">Cargando alertas...</div>';
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
      tipo === 'warning' ? 'background: linear-gradient(135deg, #F59E0B, #D97706);' :
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
  
  .notificacion-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }
  
  .notificacion-close {
    background: none;
    border: none;
    color: white;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    transition: transform 0.2s ease;
  }
  
  .notificacion-close:hover {
    transform: scale(1.2);
  }
`;
document.head.appendChild(styleSheet);

window.addEventListener('beforeunload', () => {
  if (inventoryManager) {
    inventoryManager.cleanup();
  }
});

// ========================================
// DEBUGGING
// ========================================
// 5️⃣ AGREGAR función de debug para verificar elementos HTML
window.verificarElementosHTML = function() {
  console.log('🔍 === VERIFICACIÓN DE ELEMENTOS HTML ===');
  
  const buscarProducto = document.getElementById('buscarProducto');
  console.log('buscarProducto:', buscarProducto ? '✅ Existe' : '❌ NO existe');
  
  const filtroEstadoInventario = document.getElementById('filtroEstadoInventario');
  console.log('filtroEstadoInventario:', filtroEstadoInventario ? '✅ Existe' : '❌ NO existe');
  
  const inventoryTableBody = document.getElementById('inventoryTableBody');
  console.log('inventoryTableBody:', inventoryTableBody ? '✅ Existe' : '❌ NO existe');
  
  console.log('\n📦 Datos de inventario:', inventarioData.length, 'productos');
  
  if (inventarioData.length > 0) {
    console.log('Ejemplo de producto:', inventarioData[0]);
  }
};

console.log('✅ Corrección de filtros aplicada');
console.log('💡 Para verificar elementos HTML, ejecuta: verificarElementosHTML()');

window.inventoryManager = inventoryManager;
window.debugInventario = function() {
  console.log('📦 === DEBUG INVENTARIO ===');
  console.log('Total productos:', inventarioData.length);
  console.log('Movimientos:', movimientosData.length);
  
  const report = inventoryManager?.generateReport();
  console.log('Reporte:', report);
  
  console.table(inventarioData.map(item => ({
    ID: item.id,
    Stock: item.stock,
    Mínimo: item.stockMinimo,
    Activo: item.activo !== false ? 'Sí' : 'No'
  })));
};

console.log('✅ admin-inventario.js COMPLETO cargado');
console.log('📦 Características habilitadas:');
console.log('   ✅ Reducción automática de stock al vender');
console.log('   ✅ Detección de promociones (1+1 y 2+2)');
console.log('   ✅ Resumen de alertas');
console.log('   ✅ Exportación a CSV');
console.log('   ✅ Generación de reportes');
console.log('   ✅ Historial de movimientos');
console.log('   ✅ Escucha de pedidos en tiempo real');
console.log('💡 Funciones de debug: debugInventario()');