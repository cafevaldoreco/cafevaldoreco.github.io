// cargarProductos.js - VERSIÓN FIRESTORE COMPLETA

let firebaseModules = {
  db: null,
  loaded: false
};

// Cargar Firebase solo cuando se necesite
async function loadFirebaseForProductos() {
  if (firebaseModules.loaded) {
    return firebaseModules;
  }

  console.log('📦 Productos: Cargando Firebase...');

  try {
    const configModule = await import('./firebaseconfig.js');
    firebaseModules.db = configModule.db;
    
    const firestoreModule = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    firebaseModules.collection = firestoreModule.collection;
    firebaseModules.getDocs = firestoreModule.getDocs;
    firebaseModules.doc = firestoreModule.doc;
    firebaseModules.onSnapshot = firestoreModule.onSnapshot;
    
    firebaseModules.loaded = true;
    console.log('✅ Productos: Firebase cargado');
    
    return firebaseModules;
  } catch (error) {
    console.error('❌ Productos: Error cargando Firebase:', error);
    throw error;
  }
}

export async function cargarProductos() {
  const productosContainer = document.getElementById("productosContainer");
  if (!productosContainer) {
    console.log('ℹ️ No hay contenedor de productos en esta página');
    return;
  }
  
  // Mostrar loading
  productosContainer.innerHTML = `
    <div class="loading-productos">
      <div class="loading-spinner"></div>
      <p>Cargando productos...</p>
    </div>
  `;
  
  try {
    await loadFirebaseForProductos();
    
    console.log("📦 Cargando productos desde Firestore...");
    
    // ✅ USAR FIRESTORE en lugar de Realtime Database
    const productosSnapshot = await firebaseModules.getDocs(
      firebaseModules.collection(firebaseModules.db, 'productos')
    );
    
    const inventarioSnapshot = await firebaseModules.getDocs(
      firebaseModules.collection(firebaseModules.db, 'inventario')
    );
    
    // Convertir inventario a Map para acceso rápido
    const inventarioMap = new Map();
    inventarioSnapshot.forEach(doc => {
      inventarioMap.set(doc.id, doc.data());
    });
    
    // Convertir productos a array
    const productosArray = [];
    productosSnapshot.forEach(doc => {
      const productoData = doc.data();
      const inventarioData = inventarioMap.get(doc.id) || {};
      
      productosArray.push({
        id: doc.id,
        ...productoData,
        stock: inventarioData.stock || 0,
        stockMinimo: inventarioData.stockMinimo || 5,
        activo: inventarioData.activo !== false
      });
    });

    if (productosArray.length === 0) {
      mostrarSinProductos();
      return;
    }

    mostrarProductos(productosArray);
    configurarListenersInventario();

  } catch (error) {
    console.error("Error cargando productos:", error);
    productosContainer.innerHTML = `
      <div class="error-productos">
        <h3>Error al cargar productos</h3>
        <p>Hubo un problema al cargar los productos. Por favor, intenta recargar la página.</p>
        <button onclick="location.reload()" class="btn-primary">
          Recargar página
        </button>
      </div>
    `;
  }
}

function mostrarSinProductos() {
  const productosContainer = document.getElementById("productosContainer");
  if (!productosContainer) return;
  
  productosContainer.innerHTML = `
    <div class="no-productos">
      <div class="no-productos-icon">☕</div>
      <h3>No hay productos disponibles</h3>
      <p>Estamos actualizando nuestro catálogo. Vuelve pronto.</p>
    </div>
  `;
}

function mostrarProductos(productos) {
  const productosContainer = document.getElementById("productosContainer");
  if (!productosContainer) return;
  
  const productosHTML = productos.map(producto => {
    const disponible = producto.stock > 0 && producto.activo !== false;
    const stockBajo = producto.stock > 0 && producto.stock <= producto.stockMinimo;
    
    return `
      <div class="producto ${!disponible ? 'producto-agotado' : ''}">
        <div class="producto-imagen">
          <img src="${producto.imagen || 'images/default-coffee.jpg'}" 
               alt="${producto.nombre}"
               onerror="this.src='images/default-coffee.jpg'">
          
          ${!disponible ? '<div class="badge-agotado">AGOTADO</div>' : ''}
          ${disponible && stockBajo ? '<div class="badge-stock-bajo">¡ÚLTIMAS UNIDADES!</div>' : ''}
        </div>
        
        <div class="producto-info">
          <h3>${producto.nombre}</h3>
          <p class="producto-descripcion">${producto.descripcion || ''}</p>
          
          <div class="producto-footer">
            <p class="producto-precio">$${parseInt(producto.precio).toLocaleString()}</p>
            
            <button 
              class="add-to-cart-btn ${!disponible ? 'disabled' : ''}"
              data-producto="${producto.nombre}"
              data-precio="${producto.precio}"
              data-id="${producto.id}"
              ${!disponible ? 'disabled' : ''}
              onclick="window.agregarAlCarrito('${producto.nombre}', ${producto.precio})">
              ${disponible ? '🛒 Agregar' : '❌ No disponible'}
            </button>
          </div>
          
          ${disponible && stockBajo ? 
            `<small class="stock-info">Quedan solo ${producto.stock} unidades</small>` : 
            ''}
        </div>
      </div>
    `;
  }).join('');

  productosContainer.innerHTML = productosHTML;
  console.log(`✅ Mostrando ${productos.length} productos`);
}

// Configurar listeners para actualizaciones en tiempo real
function configurarListenersInventario() {
  if (!firebaseModules.db) return;
  
  const inventarioRef = firebaseModules.collection(firebaseModules.db, 'inventario');
  
  firebaseModules.onSnapshot(inventarioRef, (snapshot) => {
    snapshot.docChanges().forEach(change => {
      if (change.type === 'modified') {
        const productoId = change.doc.id;
        const nuevoInventario = change.doc.data();
        
        console.log(`📊 Stock actualizado para ${productoId}:`, nuevoInventario.stock);
        actualizarProductoEnDOM(productoId, nuevoInventario);
      }
    });
  });
}

// Actualizar un producto específico en el DOM sin recargar todo
function actualizarProductoEnDOM(productoId, inventario) {
  const boton = document.querySelector(`button[data-id="${productoId}"]`);
  if (!boton) return;
  
  const productoCard = boton.closest('.producto');
  if (!productoCard) return;
  
  const disponible = inventario.stock > 0 && inventario.activo !== false;
  const stockBajo = inventario.stock > 0 && inventario.stock <= (inventario.stockMinimo || 5);
  
  // Actualizar clase del producto
  if (disponible) {
    productoCard.classList.remove('producto-agotado');
  } else {
    productoCard.classList.add('producto-agotado');
  }
  
  // Actualizar badge
  let badgeAgotado = productoCard.querySelector('.badge-agotado');
  let badgeStockBajo = productoCard.querySelector('.badge-stock-bajo');
  
  if (!disponible) {
    if (!badgeAgotado) {
      const imagenDiv = productoCard.querySelector('.producto-imagen');
      badgeAgotado = document.createElement('div');
      badgeAgotado.className = 'badge-agotado';
      badgeAgotado.textContent = 'AGOTADO';
      imagenDiv.appendChild(badgeAgotado);
    }
    if (badgeStockBajo) badgeStockBajo.remove();
  } else {
    if (badgeAgotado) badgeAgotado.remove();
    
    if (stockBajo && !badgeStockBajo) {
      const imagenDiv = productoCard.querySelector('.producto-imagen');
      badgeStockBajo = document.createElement('div');
      badgeStockBajo.className = 'badge-stock-bajo';
      badgeStockBajo.textContent = '¡ÚLTIMAS UNIDADES!';
      imagenDiv.appendChild(badgeStockBajo);
    } else if (!stockBajo && badgeStockBajo) {
      badgeStockBajo.remove();
    }
  }
  
  // Actualizar botón
  boton.disabled = !disponible;
  boton.className = `add-to-cart-btn ${!disponible ? 'disabled' : ''}`;
  boton.textContent = disponible ? '🛒 Agregar' : '❌ No disponible';
  
  // Actualizar info de stock
  let stockInfo = productoCard.querySelector('.stock-info');
  if (disponible && stockBajo) {
    if (!stockInfo) {
      stockInfo = document.createElement('small');
      stockInfo.className = 'stock-info';
      productoCard.querySelector('.producto-footer').after(stockInfo);
    }
    stockInfo.textContent = `Quedan solo ${inventario.stock} unidades`;
  } else if (stockInfo) {
    stockInfo.remove();
  }
  
  console.log(`✅ Producto ${productoId} actualizado en tiempo real`);
}

console.log('✅ cargarProductos.js cargado - Sistema de inventario Firestore activo');