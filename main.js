// main.js - OPTIMIZADO con carga diferida de Firebase

// ===== ESTADO GLOBAL =====
let carrito = [];
let total = 0;
let usuarioAutenticado = false;
let currentUserId = null;
let authListenerActive = false;
let unsubscribeAuth = null;

// ===== MÓDULOS DE FIREBASE (carga diferida) =====
let firebaseModules = {
  auth: null,
  db: null,
  loaded: false
};

// ===== FUNCIÓN PARA CARGAR FIREBASE SOLO CUANDO SE NECESITE =====
async function loadFirebase() {
  if (firebaseModules.loaded) {
    return firebaseModules;
  }

  console.log('📦 Cargando Firebase bajo demanda...');

  try {
    const configModule = await import('./firebaseconfig.js');
    firebaseModules.auth = configModule.auth;
    firebaseModules.db = configModule.db;
    firebaseModules.loaded = true;

    console.log('✅ Firebase cargado exitosamente');
    return firebaseModules;
  } catch (error) {
    console.error('❌ Error cargando Firebase:', error);
    throw error;
  }
}

// ==================== SERVICE WORKER ====================
function initServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(function(registration) {
        console.log('✅ Service Worker registrado:', registration.scope);
        registration.update();
        
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('🔄 Nueva versión del Service Worker encontrada');
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🆕 Nueva versión disponible. Recargando...');
              window.location.reload();
            }
          });
        });
      })
      .catch(function(error) {
        console.log('❌ Error registrando Service Worker:', error);
      });

    navigator.serviceWorker.addEventListener('controllerchange', function() {
      console.log('🔄 Controller changed, recargando...');
      window.location.reload();
    });
  }
}

initServiceWorker();

// ==================== MANEJO DE ERRORES ====================
window.addEventListener('error', (event) => {
  if (event.error && event.error.message && 
      event.error.message.includes('message port closed')) {
    event.preventDefault();
    return false;
  }
});

const originalConsoleError = console.error;
console.error = (...args) => {
  if (args[0] && typeof args[0] === 'string' && 
      (args[0].includes('message port closed') || 
       args[0].includes('Content Script Bridge'))) {
    return;
  }
  originalConsoleError.apply(console, args);
};

// ==================== DETECCIÓN DE PÁGINA ====================
// const paginaActual = {
//   tieneCarrito: !!document.getElementById('listaCarrito'),
//   tieneFormularioContacto: !!document.getElementById('formularioContacto'),
//   tienePedidos: !!document.getElementById('pedidosContainer'),
//   tieneFAQ: document.querySelectorAll('.faq-item').length > 0,
//   tieneProductos: document.querySelectorAll('.add-to-cart-btn').length > 0
// };

//=========== NUEVA DETECCIÓN DE PÁGINA ==================
const paginaActual = {
  tieneCarrito: !!document.getElementById('listaCarrito'),
  tieneFormularioContacto: !!document.getElementById('formularioContacto'),
  tienePedidos: !!document.getElementById('pedidosContainer'),
  tieneFAQ: document.querySelectorAll('.faq-item').length > 0,
  tieneProductos: !!document.getElementById('productosContainer') // ✅ DETECTAR EL CONTENEDOR
};

console.log('📄 Página detectada:', paginaActual);

// ===== FUNCIONES DEL CARRITO =====
// window.agregarAlCarrito = async function(producto, precio) {
//   if (!usuarioAutenticado) {
//     mostrarLoginMessage();
//     return;
//   }

//   const existente = carrito.find(item => item.producto === producto);
//   if (existente) {
//     existente.cantidad++;
//   } else {
//     carrito.push({ producto, precio, cantidad: 1 });
//   }
//   guardarCarrito();
//   actualizarCarrito();
//   mostrarNotificacion(`${producto} agregado al carrito`);
// };

//NUEVA FUNCIÓN AGREGAR AL CARRITO

// 1️⃣ AGREGAR función para obtener stock actual de Firebase
async function obtenerStockActual(productoId) {
  try {
    if (!firebaseModules.loaded) {
      await loadFirebase();
    }
    
    const { doc, getDoc } = 
      await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    
    const inventarioRef = doc(firebaseModules.db, 'inventario', productoId);
    const inventarioSnap = await getDoc(inventarioRef);
    
    if (inventarioSnap.exists()) {
      const data = inventarioSnap.data();
      return {
        stock: data.stock || 0,
        activo: data.activo !== false
      };
    }
    
    return { stock: 0, activo: false };
  } catch (error) {
    console.error('Error obteniendo stock:', error);
    return { stock: 0, activo: false };
  }
}

// 2️⃣ AGREGAR función para identificar el ID del producto
function identificarProductoId(nombreProducto) {
  const nombre = nombreProducto.toLowerCase();
  
  // Detectar promociones
  if (nombre.includes('promoción') || nombre.includes('promocion')) {
    if (nombre.includes('súper') || nombre.includes('super')) {
      return 'super-promocion';
    }
    return 'promocion-bourbon-caturra';
  }
  
  // Productos individuales
  if (nombre.includes('bourbon')) {
    return 'cafe-bourbon';
  } else if (nombre.includes('caturra')) {
    return 'cafe-caturra';
  }
  
  return null;
}

// 3️⃣ REEMPLAZAR la función agregarAlCarrito completa

window.agregarAlCarrito = async function(producto, precio) {
  // Verificar autenticación
  if (!usuarioAutenticado) {
    mostrarLoginMessage();
    return;
  }
  
  // Mostrar indicador de carga
  const btnOriginal = event?.target;
  const textoOriginal = btnOriginal?.textContent;
  if (btnOriginal) {
    btnOriginal.disabled = true;
    btnOriginal.textContent = '⏳ Verificando...';
  }
  
  try {
    // Identificar el producto
    const productoId = identificarProductoId(producto);
    
    if (!productoId) {
      mostrarNotificacion(`⚠️ No se pudo identificar el producto: ${producto}`);
      return;
    }
    
    // Obtener stock actual de Firebase
    console.log(`🔍 Verificando stock de ${productoId}...`);
    const stockInfo = await obtenerStockActual(productoId);
    
    console.log(`   Stock disponible: ${stockInfo.stock}`);
    console.log(`   Producto activo: ${stockInfo.activo}`);
    
    // Verificar si el producto está activo
    if (!stockInfo.activo) {
      mostrarNotificacion(`❌ ${producto} no está disponible actualmente`);
      return;
    }
    
    // Verificar si hay stock disponible
    if (stockInfo.stock <= 0) {
      mostrarNotificacion(`❌ ${producto} está agotado`);
      return;
    }
    
    // Calcular cuánto ya tiene en el carrito
    const existente = carrito.find(item => item.producto === producto);
    const cantidadEnCarrito = existente ? existente.cantidad : 0;
    
    // Verificar si puede agregar más
    if (cantidadEnCarrito >= stockInfo.stock) {
      mostrarNotificacion(
        `❌ No hay más stock disponible de ${producto}. ` +
        `Ya tienes ${cantidadEnCarrito} en el carrito (máximo: ${stockInfo.stock})`
      );
      return;
    }
    
    // Agregar al carrito
    if (existente) {
      existente.cantidad++;
      console.log(`   Incrementado a ${existente.cantidad} unidades`);
    } else {
      carrito.push({ 
        producto, 
        precio, 
        cantidad: 1,
        productoId: productoId,
        stockDisponible: stockInfo.stock
      });
      console.log(`   Agregado al carrito (stock disponible: ${stockInfo.stock})`);
    }
    
    guardarCarrito();
    actualizarCarrito();
    
    const unidadesRestantes = stockInfo.stock - (cantidadEnCarrito + 1);
    if (unidadesRestantes <= 3 && unidadesRestantes > 0) {
      mostrarNotificacion(
        `✅ ${producto} agregado al carrito. ` +
        `⚠️ ¡Quedan solo ${unidadesRestantes} unidades!`
      );
    } else {
      mostrarNotificacion(`✅ ${producto} agregado al carrito`);
    }
    
  } catch (error) {
    console.error('Error al agregar al carrito:', error);
    mostrarNotificacion('❌ Error al agregar el producto. Intenta de nuevo.');
  } finally {
    // Restaurar botón
    if (btnOriginal) {
      btnOriginal.disabled = false;
      btnOriginal.textContent = textoOriginal || '🛒 Agregar';
    }
  }
};

window.eliminarDelCarrito = function(index) {
  carrito.splice(index, 1);
  guardarCarrito();
  actualizarCarrito();
  mostrarNotificacion('Producto eliminado del carrito');
};

window.cambiarCantidad = function(index, cambio) {
  carrito[index].cantidad += cambio;
  if (carrito[index].cantidad <= 0) {
    eliminarDelCarrito(index);
  } else {
    guardarCarrito();
    actualizarCarrito();
  }
};

function guardarCarrito() {
  if (currentUserId) {
    localStorage.setItem(`carrito_${currentUserId}`, JSON.stringify(carrito));
  }
}

function cargarCarrito() {
  if (currentUserId) {
    const carritoGuardado = localStorage.getItem(`carrito_${currentUserId}`);
    carrito = carritoGuardado ? JSON.parse(carritoGuardado) : [];
  } else {
    carrito = [];
  }
  actualizarCarrito();
}

// ===== FUNCIONES DE INTERFAZ =====
function mostrarNotificacion(mensaje) {
  const notifExistente = document.querySelector('.notificacion');
  if (notifExistente) notifExistente.remove();
  
  const notif = document.createElement('div');
  notif.className = 'notificacion';
  notif.innerHTML = `<div class="notif-content"><span class="notif-text">${mensaje}</span></div>`;
  document.body.appendChild(notif);
  
  setTimeout(() => {
    if (notif.parentNode) {
      notif.style.animation = 'slideOutBounce 0.4s ease-in';
      setTimeout(() => notif.remove(), 400);
    }
  }, 4000);
}

function mostrarLoginMessage() {
  const loginMessage = document.getElementById("loginMessage");
  if (!loginMessage) return;
  
  loginMessage.style.display = "flex";
  
  const hideMessage = (e) => {
    if (e.target === loginMessage) {
      loginMessage.style.display = "none";
      document.removeEventListener('click', hideMessage);
    }
  };
  
  setTimeout(() => document.addEventListener('click', hideMessage), 100);
}

function mostrarLoginChat() {
  const loginchat = document.getElementById("loginChat");
  if (!loginchat) return;
  
  loginchat.style.display = "flex";
  
  const hideMessage = (e) => {
    if (e.target === loginchat) {
      loginchat.style.display = "none";
      document.removeEventListener('click', hideMessage);
    }
  };
  
  setTimeout(() => document.addEventListener('click', hideMessage), 100);
}

function mostrarCarritoVacio() {
  const listaCarrito = document.getElementById('listaCarrito');
  const totalCarrito = document.getElementById('totalCarrito');
  const guardarPedidoBtn = document.getElementById('guardarPedido');
  const vaciarCarritoBtn = document.getElementById('vaciarCarrito');
  
  if (listaCarrito) {
    listaCarrito.innerHTML = `
      <li class="carrito-vacio">
        <div class="empty-cart-icon">🛒</div>
        <p>Tu carrito está vacío</p>
        <small>Agrega algunos de nuestros deliciosos cafés</small>
      </li>
    `;
  }
  if (totalCarrito) totalCarrito.textContent = 'Total: $0';
  if (guardarPedidoBtn) guardarPedidoBtn.style.display = 'none';
  if (vaciarCarritoBtn) vaciarCarritoBtn.style.display = 'none';
}

function actualizarCarrito() {
  const listaCarrito = document.getElementById('listaCarrito');
  const totalCarrito = document.getElementById('totalCarrito');
  const guardarPedidoBtn = document.getElementById('guardarPedido');
  const vaciarCarritoBtn = document.getElementById('vaciarCarrito');
  const cartCounts = document.querySelectorAll('.cart-count');
  
  if (!listaCarrito || !totalCarrito) return;
  
  listaCarrito.innerHTML = '';
  total = 0;

  if (carrito.length === 0) {
    mostrarCarritoVacio();
    return;
  }

  carrito.forEach((item, index) => {
    const subtotal = item.precio * item.cantidad;
    total += subtotal;

    const li = document.createElement('li');
    li.className = 'carrito-item';
    li.innerHTML = `
      <div class="carrito-item-info">
        <h4 class="carrito-item-nombre">${item.producto}</h4>
        <div class="carrito-item-precio">$${item.precio.toLocaleString()} c/u</div>
      </div>
      <div class="carrito-item-controles">
        <div class="controles-cantidad">
          <button onclick="window.cambiarCantidad(${index}, -1)" class="btn-cantidad">-</button>
          <span class="cantidad">×${item.cantidad}</span>
          <button onclick="window.cambiarCantidad(${index}, 1)" class="btn-cantidad">+</button>
        </div>
        <div class="carrito-item-subtotal">$${subtotal.toLocaleString()}</div>
        <button onclick="window.eliminarDelCarrito(${index})" class="btn-eliminar" title="Eliminar producto">×</button>
      </div>
    `;
    listaCarrito.appendChild(li);
  });

  totalCarrito.innerHTML = `
    <div class="total-info">
      <span class="total-label">Total:</span>
      <span class="total-amount">${total.toLocaleString()}</span>
    </div>
  `;
  
  if (guardarPedidoBtn) guardarPedidoBtn.style.display = 'block';
  if (vaciarCarritoBtn) vaciarCarritoBtn.style.display = 'block';
  
  if (cartCounts) {
    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    cartCounts.forEach(count => count.textContent = totalItems);
  }
}

// ===== FORMULARIO DE PEDIDO =====
window.mostrarFormularioPedido = function() {
  if (!usuarioAutenticado) {
    mostrarNotificacion('Debes iniciar sesión para realizar un pedido');
    mostrarLoginMessage();
    return;
  }

  if (carrito.length === 0) {
    mostrarNotificacion("El carrito está vacío");
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'form-overlay';

  const resumenProductos = carrito.map(item => `
    <div class="resumen-item">
      <span>${item.producto} ×${item.cantidad}</span>
      <span>${(item.precio * item.cantidad).toLocaleString()}</span>
    </div>
  `).join('');

  const formulario = document.createElement('div');
  formulario.className = 'form-container';

  formulario.innerHTML = `
    <h2>Confirmar Pedido</h2>
    
    <div class="resumen-pedido">
      <h3>Resumen de tu pedido:</h3>
      ${resumenProductos}
      <div class="resumen-total">
        <strong>Total: ${total.toLocaleString()}</strong>
      </div>
    </div>

    <form id="formPedido">
      <h3>Información de entrega:</h3>
      
      <input type="text" id="nombreCliente" placeholder="Nombre completo *" required>
      <input type="tel" id="telefonoCliente" placeholder="Teléfono *" required>
      <input type="text" id="direccionCliente" placeholder="Dirección completa *" required>
      <input type="text" id="ciudadCliente" placeholder="Ciudad *" required>
      <textarea id="notas" placeholder="Observaciones adicionales (opcional)" rows="3"></textarea>
      
      <div class="form-buttons">
        <button type="button" id="cancelarPedido">Cancelar</button>
        <button type="submit">Confirmar Pedido</button>
      </div>
    </form>
  `;

  overlay.appendChild(formulario);
  document.body.appendChild(overlay);

  formulario.querySelector('#cancelarPedido').addEventListener('click', () => overlay.remove());

  // formulario.querySelector('#formPedido').addEventListener('submit', async (e) => {
  //   e.preventDefault();
    
  //   const submitBtn = e.target.querySelector('button[type="submit"]');
  //   const originalText = submitBtn.textContent;
  //   submitBtn.textContent = 'Procesando...';
  //   submitBtn.disabled = true;
    
  //   try {
  //     await guardarPedidoFirebase();
  //     overlay.remove();
  //     carrito = [];
  //     guardarCarrito();
  //     actualizarCarrito();
  //     mostrarNotificacion('Pedido confirmado exitosamente');
  //   } catch (error) {
  //     console.error('Error al guardar pedido:', error);
  //     mostrarNotificacion('Error al procesar el pedido. Inténtalo de nuevo.');
  //     submitBtn.textContent = originalText;
  //     submitBtn.disabled = false;
  //   }
  // });

  //NUEVO FORM PEDIDO EN EL FORMULARIO
  
formulario.querySelector('#formPedido').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Verificando stock...';
  submitBtn.disabled = true;
  
  try {
    // Verificar stock de todos los productos antes de confirmar
    console.log('🔍 Verificando stock de todos los productos...');
    
    for (const item of carrito) {
      const productoId = identificarProductoId(item.producto);
      if (!productoId) continue;
      
      const stockInfo = await obtenerStockActual(productoId);
      
      if (!stockInfo.activo) {
        throw new Error(`${item.producto} ya no está disponible`);
      }
      
      if (stockInfo.stock < item.cantidad) {
        throw new Error(
          `Stock insuficiente de ${item.producto}. ` +
          `Solicitado: ${item.cantidad}, Disponible: ${stockInfo.stock}`
        );
      }
    }
    
    console.log('✅ Stock verificado correctamente');
    
    submitBtn.textContent = 'Procesando pedido...';
    
    await guardarPedidoFirebase();
    overlay.remove();
    carrito = [];
    guardarCarrito();
    actualizarCarrito();
    mostrarNotificacion('✅ Pedido confirmado exitosamente');
    
  } catch (error) {
    console.error('Error al guardar pedido:', error);
    mostrarNotificacion(`❌ ${error.message}`);
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
});


console.log('✅ Sistema de verificación de stock agregado a agregarAlCarrito()');

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
};

// async function guardarPedidoFirebase() {
//   if (!firebaseModules.loaded) {
//     await loadFirebase();
//   }

//   const { addDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
  
//   const user = firebaseModules.auth.currentUser;
//   if (!user) throw new Error('Usuario no autenticado');

//   const nombre = document.getElementById('nombreCliente').value.trim();
//   const telefono = document.getElementById('telefonoCliente').value.trim();
//   const direccion = document.getElementById('direccionCliente').value.trim();
//   const ciudad = document.getElementById('ciudadCliente').value.trim();
//   const notas = document.getElementById('notas').value.trim();

//   if (!nombre || !telefono || !direccion || !ciudad) {
//     throw new Error('Por favor completa todos los campos obligatorios');
//   }

//   const pedidoData = {
//     uid: user.uid,
//     datosCliente: {
//       nombre,
//       telefono,
//       direccion,
//       ciudad,
//       email: user.email,
//       notas: notas
//     },
//     pedido: carrito,
//     total: total,
//     fecha: new Date().toISOString(),
//     estado: 'pendiente'
//   };

//   await addDoc(collection(firebaseModules.db, "pedidos"), pedidoData);
//   console.log("Pedido guardado exitosamente");
// }

// 1️⃣ AGREGAR estas funciones auxiliares ANTES de guardarPedidoFirebase()

// Función para reducir stock de un producto específico
async function reducirStockProducto(productoId, cantidad) {
  const { doc, getDoc, updateDoc, Timestamp } = 
    await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
  
  const inventarioRef = doc(firebaseModules.db, 'inventario', productoId);
  const inventarioSnap = await getDoc(inventarioRef);
  
  if (!inventarioSnap.exists()) {
    console.warn(`  ⚠️ Inventario no encontrado para: ${productoId}`);
    return;
  }
  
  const stockActual = inventarioSnap.data().stock || 0;
  const nuevoStock = Math.max(0, stockActual - cantidad);
  
  await updateDoc(inventarioRef, {
    stock: nuevoStock,
    ultimaActualizacion: Timestamp.now(),
    ultimoMotivo: 'Venta automática'
  });
  
  console.log(`  ✓ ${productoId}: ${stockActual} → ${nuevoStock} (-${cantidad})`);
}

// Función para reducir stock cuando se confirma un pedido
// async function reducirStockDesdePedido(pedidoData) {
//   console.log('📦 Reduciendo stock del pedido...', pedidoData);
  
//   try {
//     const productosVendidos = [];
    
//     // Iterar sobre cada producto en el pedido
//     for (const item of pedidoData.pedido) {
//       let cantidadTotal = item.cantidad;
//       const nombreProducto = item.producto.toLowerCase();
      
//       console.log(`  Procesando: ${item.producto} x${item.cantidad}`);
      
//       // Detectar promociones
//       if (nombreProducto.includes('promoción') || nombreProducto.includes('promocion')) {
        
//         if (nombreProducto.includes('súper') || nombreProducto.includes('super')) {
//           // SÚPER PROMOCIÓN: 2 Caturra + 2 Bourbon
//           console.log('  🎁 Súper Promoción detectada');
          
//           await reducirStockProducto('cafe-caturra', 2 * cantidadTotal);
//           await reducirStockProducto('cafe-bourbon', 2 * cantidadTotal);
          
//           productosVendidos.push(
//             { nombre: 'Café Caturra', cantidad: 2 * cantidadTotal },
//             { nombre: 'Café Bourbon', cantidad: 2 * cantidadTotal }
//           );
          
//         } else {
//           // PROMOCIÓN NORMAL: 1 Caturra + 1 Bourbon
//           console.log('  🎁 Promoción 1+1 detectada');
          
//           await reducirStockProducto('cafe-caturra', cantidadTotal);
//           await reducirStockProducto('cafe-bourbon', cantidadTotal);
          
//           productosVendidos.push(
//             { nombre: 'Café Caturra', cantidad: cantidadTotal },
//             { nombre: 'Café Bourbon', cantidad: cantidadTotal }
//           );
//         }
        
//         continue;
//       }
      
//       // Productos individuales
//       let productoId = null;
      
//       if (nombreProducto.includes('bourbon')) {
//         productoId = 'cafe-bourbon';
//       } else if (nombreProducto.includes('caturra')) {
//         productoId = 'cafe-caturra';
//       }
      
//       if (productoId) {
//         await reducirStockProducto(productoId, cantidadTotal);
//         productosVendidos.push({ nombre: item.producto, cantidad: cantidadTotal });
//       } else {
//         console.warn(`  ⚠️ Producto no identificado: ${item.producto}`);
//       }
//     }
    
//     console.log('✅ Stock reducido:', productosVendidos);
//     return { success: true, productosVendidos };
    
//   } catch (error) {
//     console.error('❌ Error reduciendo stock:', error);
//     return { success: false, error: error.message };
//   }
// }

// Función para reducir stock cuando se confirma un pedido - VERSIÓN CORREGIDA
async function reducirStockDesdePedido(pedidoData) {
  console.log('📦 Reduciendo stock del pedido...', pedidoData);
  
  try {
    const productosVendidos = [];
    
    // Iterar sobre cada producto en el pedido
    for (const item of pedidoData.pedido) {
      let cantidadTotal = item.cantidad;
      const nombreProducto = item.producto.toLowerCase();
      
      console.log(`  Procesando: ${item.producto} x${item.cantidad}`);
      
      // Detectar promociones y reducir stock de LA PROMOCIÓN MISMA
      if (nombreProducto.includes('promoción') || nombreProducto.includes('promocion')) {
        
        if (nombreProducto.includes('súper') || nombreProducto.includes('super')) {
          // SÚPER PROMOCIÓN: Reducir stock de super-promocion Y de los productos individuales
          console.log('  🎁 Súper Promoción detectada - Restando stock de super-promocion y productos individuales');
          
          // 1️⃣ REDUCIR STOCK DE LA PROMOCIÓN MISMA
          await reducirStockProducto('super-promocion', cantidadTotal);
          
          // 2️⃣ REDUCIR STOCK DE PRODUCTOS INDIVIDUALES
          await reducirStockProducto('cafe-caturra', 2 * cantidadTotal);
          await reducirStockProducto('cafe-bourbon', 2 * cantidadTotal);
          
          productosVendidos.push(
            { nombre: 'Super Promoción', cantidad: cantidadTotal },
            { nombre: 'Café Caturra', cantidad: 2 * cantidadTotal },
            { nombre: 'Café Bourbon', cantidad: 2 * cantidadTotal }
          );
          
        } else {
          // PROMOCIÓN NORMAL: Reducir stock de promocion-bourbon-caturra Y de los productos individuales
          console.log('  🎁 Promoción 1+1 detectada - Restando stock de promocion-bourbon-caturra y productos individuales');
          
          // 1️⃣ REDUCIR STOCK DE LA PROMOCIÓN MISMA
          await reducirStockProducto('promocion-bourbon-caturra', cantidadTotal); // ← CAMBIO AQUÍ
          
          // 2️⃣ REDUCIR STOCK DE PRODUCTOS INDIVIDUALES
          await reducirStockProducto('cafe-caturra', cantidadTotal);
          await reducirStockProducto('cafe-bourbon', cantidadTotal);
          
          productosVendidos.push(
            { nombre: 'Promoción Bourbon + Caturra', cantidad: cantidadTotal }, // ← CAMBIO AQUÍ
            { nombre: 'Café Caturra', cantidad: cantidadTotal },
            { nombre: 'Café Bourbon', cantidad: cantidadTotal }
          );
        }
        
        continue;
      }
      
      // Productos individuales
      let productoId = null;
      
      if (nombreProducto.includes('bourbon')) {
        productoId = 'cafe-bourbon';
      } else if (nombreProducto.includes('caturra')) {
        productoId = 'cafe-caturra';
      }
      
      if (productoId) {
        await reducirStockProducto(productoId, cantidadTotal);
        productosVendidos.push({ nombre: item.producto, cantidad: cantidadTotal });
      } else {
        console.warn(`  ⚠️ Producto no identificado: ${item.producto}`);
      }
    }
    
    console.log('✅ Stock reducido correctamente:', productosVendidos);
    return { success: true, productosVendidos };
    
  } catch (error) {
    console.error('❌ Error reduciendo stock:', error);
    return { success: false, error: error.message };
  }
}

// 2️⃣ REEMPLAZAR la función guardarPedidoFirebase() completa

async function guardarPedidoFirebase() {
  if (!firebaseModules.loaded) {
    await loadFirebase();
  }

  const { addDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
  
  const user = firebaseModules.auth.currentUser;
  if (!user) throw new Error('Usuario no autenticado');

  const nombre = document.getElementById('nombreCliente').value.trim();
  const telefono = document.getElementById('telefonoCliente').value.trim();
  const direccion = document.getElementById('direccionCliente').value.trim();
  const ciudad = document.getElementById('ciudadCliente').value.trim();
  const notas = document.getElementById('notas').value.trim();

  if (!nombre || !telefono || !direccion || !ciudad) {
    throw new Error('Por favor completa todos los campos obligatorios');
  }

  const pedidoData = {
    uid: user.uid,
    datosCliente: {
      nombre,
      telefono,
      direccion,
      ciudad,
      email: user.email,
      notas: notas
    },
    pedido: carrito,
    total: total,
    fecha: new Date().toISOString(),
    estado: 'pendiente'
  };

  // 1️⃣ Guardar el pedido en Firebase
  console.log('💾 Guardando pedido en Firebase...');
  const docRef = await addDoc(collection(firebaseModules.db, "pedidos"), pedidoData);
  console.log("✅ Pedido guardado exitosamente con ID:", docRef.id);
  
  // 2️⃣ Reducir el stock automáticamente
  console.log('📦 Reduciendo stock del inventario...');
  const resultadoStock = await reducirStockDesdePedido(pedidoData);
  
  if (resultadoStock.success) {
    console.log('✅ Stock actualizado correctamente');
    console.log('   Productos vendidos:', resultadoStock.productosVendidos);
  } else {
    console.warn('⚠️ Advertencia: El stock no se actualizó:', resultadoStock.error);
    // No bloqueamos el pedido, solo advertimos
  }
  
  return docRef.id;
}

console.log('✅ Sistema de reducción automática de stock agregado a guardarPedidoFirebase()');

// ===== CONFIGURACIÓN DE INTERFAZ =====
function configurarInterfaz() {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  const carritoBtn = document.getElementById('carritoBtn');
  const carritoMobileBtn = document.getElementById('carritoMobileBtn');
  const carritoOverlay = document.getElementById('carritoOverlay');
  const carritoSidebar = document.getElementById('carrito');
  const cerrarCarrito = document.getElementById('cerrarCarrito');
  const vaciarCarritoBtn = document.getElementById('vaciarCarrito');
  const guardarPedidoBtn = document.getElementById('guardarPedido');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      mobileMenu.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
      if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
        hamburger.classList.remove('active');
        mobileMenu.classList.remove('active');
      }
    });
  }

  if (paginaActual.tieneCarrito) {
    function toggleCarrito() {
      if (carritoSidebar && carritoOverlay) {
        carritoSidebar.classList.toggle('active');
        carritoOverlay.classList.toggle('active');
        document.body.style.overflow = carritoSidebar.classList.contains('active') ? 'hidden' : 'auto';
      }
    }

    if (carritoBtn) carritoBtn.addEventListener('click', toggleCarrito);
    if (carritoMobileBtn) {
      carritoMobileBtn.addEventListener('click', () => {
        toggleCarrito();
        if (hamburger) hamburger.classList.remove('active');
        if (mobileMenu) mobileMenu.classList.remove('active');
      });
    }

    if (cerrarCarrito) {
      cerrarCarrito.addEventListener('click', () => {
        if (carritoSidebar) carritoSidebar.classList.remove('active');
        if (carritoOverlay) carritoOverlay.classList.remove('active');
        document.body.style.overflow = 'auto';
      });
    }

    if (carritoOverlay) {
      carritoOverlay.addEventListener('click', () => {
        if (carritoSidebar) carritoSidebar.classList.remove('active');
        if (carritoOverlay) carritoOverlay.classList.remove('active');
        document.body.style.overflow = 'auto';
      });
    }

    if (vaciarCarritoBtn) {
      vaciarCarritoBtn.addEventListener('click', () => {
        if (carrito.length === 0) {
          mostrarNotificacion('El carrito ya está vacío');
          return;
        }
        
        if (confirm('¿Estás seguro de que deseas vaciar el carrito?')) {
          carrito = [];
          guardarCarrito();
          actualizarCarrito();
          mostrarNotificacion('Carrito vaciado exitosamente');
        }
      });
    }

    if (guardarPedidoBtn) {
      guardarPedidoBtn.addEventListener('click', window.mostrarFormularioPedido);
    }
  }

  if (paginaActual.tieneFAQ) {
    configurarFAQ();
  }

  if (paginaActual.tieneFormularioContacto) {
    configurarFormularioContacto();
  }

  // if (paginaActual.tieneProductos) {
  //   const addToCartButtons = document.querySelectorAll(".add-to-cart-btn");
  //   addToCartButtons.forEach(button => {
  //     const producto = button.dataset.producto;
  //     const precio = parseInt(button.dataset.precio);
      
  //     button.onclick = () => window.agregarAlCarrito(producto, precio);
  //   });
  // }

  
}

// ===== AUTENTICACIÓN (CARGA DIFERIDA) =====
// async function configurarAutenticacion() {
//   const authBtn = document.getElementById('authBtn');
//   const authMobileBtn = document.getElementById('authMobileBtn');
//   const userWelcome = document.getElementById("userWelcome");
//   const userName = document.getElementById("userName");
//   const loginMessage = document.getElementById("loginMessage");

//   const necesitaAuth = paginaActual.tieneCarrito || paginaActual.tienePedidos || paginaActual.tieneProductos;

//   if (!necesitaAuth) {
//     console.log('⏭️ Página no requiere autenticación');
//     if (authBtn) authBtn.onclick = () => window.location.href = "auth.html";
//     if (authMobileBtn) authMobileBtn.onclick = () => window.location.href = "auth.html";
//     return;
//   }

//   console.log('🔐 Cargando Firebase y verificando sesión...');
//   await loadFirebase();

//   const { onAuthStateChanged, signOut } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');

//   authListenerActive = true;

//   unsubscribeAuth = onAuthStateChanged(firebaseModules.auth, async (user) => {
//     if (user) {
//       console.log('✅ Usuario autenticado:', user.uid);
//       usuarioAutenticado = true;
//       currentUserId = user.uid;
      
//       if (userName) userName.textContent = user.displayName || user.email.split('@')[0];
//       if (userWelcome) userWelcome.style.display = "block";

//       const logoutText = "Cerrar Sesión";
//       if (authBtn) authBtn.textContent = logoutText;
//       if (authMobileBtn) authMobileBtn.textContent = logoutText;

//       const logoutFunction = async () => {
//         try {
//           await signOut(firebaseModules.auth);
//           carrito = [];
//           currentUserId = null;
//           mostrarNotificacion("Sesión cerrada correctamente");
//           setTimeout(() => window.location.reload(), 1000);
//         } catch (error) {
//           console.error('Error al cerrar sesión:', error);
//           mostrarNotificacion("Error al cerrar sesión");
//         }
//       };

//       if (authBtn) authBtn.onclick = logoutFunction;
//       if (authMobileBtn) authMobileBtn.onclick = logoutFunction;

//       if (loginMessage) loginMessage.style.display = "none";
      
//       if (paginaActual.tieneCarrito) {
//         cargarCarrito();
//       }
      
//       if (paginaActual.tienePedidos) {
//         const cargarPedidosModule = await import('./cargarPedidos.js');
//         await cargarPedidosModule.cargarPedidos(user.uid);
//       }
//     } else {
//       console.log('❌ Usuario no autenticado');
//       usuarioAutenticado = false;
//       currentUserId = null;
//       carrito = [];
      
//       if (userWelcome) userWelcome.style.display = "none";

//       const loginText = "Iniciar Sesión";
//       if (authBtn) authBtn.textContent = loginText;
//       if (authMobileBtn) authMobileBtn.textContent = loginText;

//       const loginFunction = () => window.location.href = "auth.html";

//       if (authBtn) authBtn.onclick = loginFunction;
//       if (authMobileBtn) authMobileBtn.onclick = loginFunction;

//       if (paginaActual.tieneCarrito) {
//         actualizarCarrito();
//       }
//     }
//   });

// }

// ===== AUTENTICACIÓN (CARGA DIFERIDA) - VERSIÓN CORREGIDA =====
async function configurarAutenticacion() {
  const authBtn = document.getElementById('authBtn');
  const authMobileBtn = document.getElementById('authMobileBtn');
  const userWelcome = document.getElementById("userWelcome");
  const userName = document.getElementById("userName");
  const loginMessage = document.getElementById("loginMessage");

  const necesitaAuth = paginaActual.tieneCarrito || paginaActual.tienePedidos || paginaActual.tieneProductos;

  // 🆕 CARGAR PRODUCTOS PARA TODOS (autenticados o no)
  if (paginaActual.tieneProductos) {
    console.log('📦 Cargando productos...');
    try {
      const cargarProductosModule = await import('./cargarProductos.js');
      await cargarProductosModule.cargarProductos();
      
      // 🔧 CRÍTICO: Configurar listeners de los botones DESPUÉS de cargar productos
      console.log('🔘 Configurando botones de agregar al carrito...');
      const addToCartButtons = document.querySelectorAll(".add-to-cart-btn");
      console.log(`   Botones encontrados: ${addToCartButtons.length}`);
      
      addToCartButtons.forEach(button => {
        const producto = button.dataset.producto;
        const precio = parseInt(button.dataset.precio);
        
        button.onclick = () => {
          console.log('🖱️ Clic en botón:', producto, precio);
          window.agregarAlCarrito(producto, precio);
        };
      });
      
      console.log('✅ Botones configurados correctamente');
      
    } catch (error) {
      console.error('❌ Error cargando productos:', error);
    }
  }

  if (!necesitaAuth) {
    console.log('⏭️ Página no requiere autenticación');
    if (authBtn) authBtn.onclick = () => window.location.href = "auth.html";
    if (authMobileBtn) authMobileBtn.onclick = () => window.location.href = "auth.html";
    return;
  }

  console.log('🔐 Cargando Firebase y verificando sesión...');
  await loadFirebase();

  const { onAuthStateChanged, signOut } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');

  authListenerActive = true;

  unsubscribeAuth = onAuthStateChanged(firebaseModules.auth, async (user) => {
    if (user) {
      console.log('✅ Usuario autenticado:', user.uid);
      usuarioAutenticado = true;
      currentUserId = user.uid;
      
      if (userName) userName.textContent = user.displayName || user.email.split('@')[0];
      if (userWelcome) userWelcome.style.display = "block";

      const logoutText = "Cerrar Sesión";
      if (authBtn) authBtn.textContent = logoutText;
      if (authMobileBtn) authMobileBtn.textContent = logoutText;

      const logoutFunction = async () => {
        try {
          await signOut(firebaseModules.auth);
          carrito = [];
          currentUserId = null;
          mostrarNotificacion("Sesión cerrada correctamente");
          setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
          console.error('Error al cerrar sesión:', error);
          mostrarNotificacion("Error al cerrar sesión");
        }
      };

      if (authBtn) authBtn.onclick = logoutFunction;
      if (authMobileBtn) authMobileBtn.onclick = logoutFunction;

      if (loginMessage) loginMessage.style.display = "none";
      
      if (paginaActual.tieneCarrito) {
        cargarCarrito();
      }
      
      if (paginaActual.tienePedidos) {
        const cargarPedidosModule = await import('./cargarPedidos.js');
        await cargarPedidosModule.cargarPedidos(user.uid);
      }
      
      // Los productos ya se cargaron arriba con sus listeners configurados
      
    } else {
      console.log('❌ Usuario no autenticado');
      usuarioAutenticado = false;
      currentUserId = null;
      carrito = [];
      
      if (userWelcome) userWelcome.style.display = "none";

      const loginText = "Iniciar Sesión";
      if (authBtn) authBtn.textContent = loginText;
      if (authMobileBtn) authMobileBtn.textContent = loginText;

      const loginFunction = () => window.location.href = "auth.html";

      if (authBtn) authBtn.onclick = loginFunction;
      if (authMobileBtn) authMobileBtn.onclick = loginFunction;

      if (paginaActual.tieneCarrito) {
        actualizarCarrito();
      }
      
      // Los productos están visibles pero los botones mostrarán el mensaje de login
      // cuando el usuario intente agregar sin estar autenticado
    }
  });
}

console.log('✅ configurarAutenticacion() actualizada con listeners de botones');

// ===== FAQ =====
function configurarFAQ() {
  const faqItems = document.querySelectorAll('.faq-item');
  
  faqItems.forEach(item => {
    const pregunta = item.querySelector('.faq-pregunta');
    
    if (pregunta) {
      pregunta.addEventListener('click', () => {
        faqItems.forEach(otherItem => {
          if (otherItem !== item && otherItem.classList.contains('active')) {
            otherItem.classList.remove('active');
          }
        });
        item.classList.toggle('active');
      });
    }
  });
}

// ===== FORMULARIO CONTACTO =====
async function configurarFormularioContacto() {
  const formularioContacto = document.getElementById('formularioContacto');
  
  if (!formularioContacto) return;

  formularioContacto.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!firebaseModules.loaded) {
      await loadFirebase();
    }

    const { addDoc, collection, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    
    const btnEnviar = formularioContacto.querySelector('.btn-enviar');
    const textoOriginal = btnEnviar.textContent;
    
    btnEnviar.textContent = 'Enviando...';
    btnEnviar.disabled = true;
    
    try {
      await addDoc(collection(firebaseModules.db, "mensajesContacto"), {
        nombre: document.getElementById('nombreContacto').value.trim(),
        email: document.getElementById('emailContacto').value.trim(),
        telefono: document.getElementById('telefonoContacto').value.trim(),
        asunto: document.getElementById('asuntoContacto').value,
        mensaje: document.getElementById('mensajeContacto').value.trim(),
        fecha: serverTimestamp(),
        leido: false
      });
      
      mostrarNotificacion('Mensaje enviado correctamente. Te contactaremos pronto');
      formularioContacto.reset();
    } catch (error) {
      console.error('Error al guardar mensaje:', error);
      mostrarNotificacion('Error al enviar el mensaje. Intenta nuevamente.');
    } finally {
      btnEnviar.textContent = textoOriginal;
      btnEnviar.disabled = false;
    }
  });
}

// ===== CHAT VERIFICACIÓN =====
function configurarChatVerificacion() {
  const enviarmensajechat = document.getElementById('enviarMensajeChat');
  
  if (enviarmensajechat) {
    enviarmensajechat.addEventListener("click", async function() {
      if (!usuarioAutenticado) {
        mostrarLoginChat();
        return;
      }
      if (!firebaseModules.loaded) {
        await loadFirebase();
      }
    });
  }
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Inicializando aplicación optimizada...');
  console.log('📄 Funcionalidades detectadas:', paginaActual);
  
  configurarInterfaz();
  configurarChatVerificacion();
  
  await configurarAutenticacion();
  
  console.log('✅ Aplicación inicializada');
});

// ===== LIMPIEZA =====
window.addEventListener('beforeunload', () => {
  if (unsubscribeAuth) {
    unsubscribeAuth();
  }
});

export function limpiarMain() {
  if (unsubscribeAuth) {
    unsubscribeAuth();
    unsubscribeAuth = null;
  }
  authListenerActive = false;
  console.log('Main limpiado correctamente');
}

console.log('✅ main.js cargado - Modo optimizado con carga diferida');
