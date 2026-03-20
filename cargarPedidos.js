// cargarPedidos.js - OPTIMIZADO con carga diferida

// Variables para módulos de Firebase
let firebaseModules = {
  db: null,
  loaded: false
};

// Cargar Firebase solo cuando se necesite
async function loadFirebaseForPedidos() {
  if (firebaseModules.loaded) {
    return firebaseModules;
  }

  console.log('📦 Pedidos: Cargando Firebase...');

  try {
    // Cargar configuración
    const configModule = await import('./firebaseconfig.js');
    firebaseModules.db = configModule.db;
    
    // Cargar Firestore
    const firestoreModule = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    firebaseModules.collection = firestoreModule.collection;
    firebaseModules.getDocs = firestoreModule.getDocs;
    firebaseModules.query = firestoreModule.query;
    firebaseModules.where = firestoreModule.where;
    
    firebaseModules.loaded = true;
    console.log('✅ Pedidos: Firebase cargado');
    
    return firebaseModules;
  } catch (error) {
    console.error('❌ Pedidos: Error cargando Firebase:', error);
    throw error;
  }
}

export async function cargarPedidos(uid) {
  const pedidosContainer = document.getElementById("pedidosContainer");
  if (!pedidosContainer) return;
  
  // Mostrar loading
  pedidosContainer.innerHTML = `
    <div class="loading">
      <div class="loading-spinner"></div>
      <p>Cargando tus pedidos...</p>
    </div>
  `;
  
  try {
    // Cargar Firebase bajo demanda
    await loadFirebaseForPedidos();
    
    console.log("Cargando pedidos para usuario:", uid);
    
    const q = firebaseModules.query(
      firebaseModules.collection(firebaseModules.db, "pedidos"), 
      firebaseModules.where("uid", "==", uid)
    );
    const querySnapshot = await firebaseModules.getDocs(q);

    if (querySnapshot.empty) {
      mostrarSinPedidos();
      return;
    }

    const pedidos = [];
    querySnapshot.forEach((doc) => {
      const pedidoData = doc.data();
      pedidos.push({
        id: doc.id,
        ...pedidoData
      });
    });

    // Ordenar por fecha (más recientes primero)
    pedidos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    mostrarPedidos(pedidos);

  } catch (error) {
    console.error("Error cargando pedidos:", error);
    pedidosContainer.innerHTML = `
      <div class="no-pedidos">
        <h3>Error al cargar pedidos</h3>
        <p>Hubo un problema al cargar tus pedidos. Por favor, intenta recargar la página.</p>
        <button onclick="location.reload()" class="btn-primary">
          Recargar página
        </button>
      </div>
    `;
  }
}

function mostrarSinPedidos() {
  const pedidosContainer = document.getElementById("pedidosContainer");
  if (!pedidosContainer) return;
  
  pedidosContainer.innerHTML = `
    <div class="no-pedidos">
      <div class="no-pedidos-icon">📦</div>
      <h3>No tienes pedidos aún</h3>
      <p>Aún no has realizado ningún pedido. Ve a nuestra tienda y prueba nuestros deliciosos cafés especiales.</p>
      <a href="index.html" class="btn-primary">
        Ver productos
      </a>
    </div>
  `;
}

function mostrarPedidos(pedidos) {
  const pedidosContainer = document.getElementById("pedidosContainer");
  if (!pedidosContainer) return;
  
  const pedidosHTML = pedidos.map(pedido => {
    const fecha = new Date(pedido.fecha);
    const fechaFormateada = fecha.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const productosHTML = pedido.pedido.map(producto => `
      <div class="producto-item">
        <span class="producto-nombre">${producto.producto}</span>
        <span class="producto-cantidad">×${producto.cantidad}</span>
      </div>
    `).join('');

    return `
      <div class="pedido-card">
        <div class="pedido-header">
          <div class="pedido-id">
            Pedido #${pedido.numeroPedido || pedido.id.substring(0, 8)}
          </div>
          <div class="pedido-fecha">
            ${fechaFormateada}
          </div>
        </div>
        
        <div class="pedido-total">
          Total: ${parseInt(pedido.total).toLocaleString()}
        </div>
        
        <div class="productos-list">
          <h4>Productos:</h4>
          <div class="productos-items">
            ${productosHTML}
          </div>
        </div>
        
        <div class="pedido-status">
          <span class="status-badge status-${pedido.estado || 'pendiente'}">
            ${pedido.estado === 'completado' ? '✅ Completado' : 
              pedido.estado === 'en-proceso' ? '⏳ En proceso' : 
              '🟡 Pendiente'}
          </span>
        </div>
      </div>
    `;
  }).join('');

  pedidosContainer.innerHTML = `
    <div class="pedidos-grid">
      ${pedidosHTML}
    </div>
  `;

  console.log(`Mostrando ${pedidos.length} pedidos`);
}

console.log('✅ cargarPedidos.js cargado - Modo optimizado');