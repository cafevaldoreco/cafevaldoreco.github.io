// ========================================
// 🔧 REEMPLAZAR la función mostrarProductos() en cargarProductos.js
// ========================================

function mostrarProductos(productos) {
  const productosContainer = document.getElementById("productosContainer");
  if (!productosContainer) return;
  
  const productosHTML = productos.map(producto => {
    const disponible = producto.stock > 0 && producto.activo !== false;
    const stockBajo = producto.stock > 0 && producto.stock <= producto.stockMinimo;
    const stockMuyBajo = producto.stock > 0 && producto.stock <= 5;
    const pocasUnidades = producto.stock > 5 && producto.stock <= 10;
    
    // Determinar el badge a mostrar
    let badgeHTML = '';
    let stockInfoHTML = '';
    
    if (!disponible) {
      badgeHTML = '<div class="badge-agotado">❌ AGOTADO</div>';
      stockInfoHTML = '<div class="stock-info agotado">😢 Temporalmente sin stock</div>';
    } else if (stockMuyBajo) {
      badgeHTML = '<div class="badge-urgente">🔥 ¡ÚLTIMAS UNIDADES!</div>';
      stockInfoHTML = `<div class="stock-info urgente">⚠️ Solo quedan ${producto.stock} unidades</div>`;
    } else if (pocasUnidades) {
      badgeHTML = '<div class="badge-stock-bajo">⚡ ¡Pocas unidades!</div>';
      stockInfoHTML = `<div class="stock-info bajo">📦 Quedan ${producto.stock} unidades</div>`;
    } else if (stockBajo) {
      stockInfoHTML = `<div class="stock-info medio">✅ ${producto.stock} unidades disponibles</div>`;
    }
    
    return `
      <div class="producto ${!disponible ? 'producto-agotado' : ''}">
        <div class="producto-imagen">
          <img src="${producto.imagen || 'images/default-coffee.jpg'}" 
               alt="${producto.nombre}"
               onerror="this.src='images/default-coffee.jpg'">
          
          ${badgeHTML}
        </div>
        
        <div class="producto-info">
          <h3>${producto.nombre}</h3>
          <p class="producto-descripcion">${producto.descripcion || ''}</p>
          
          ${stockInfoHTML}
          
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
        </div>
      </div>
    `;
  }).join('');

  productosContainer.innerHTML = productosHTML;
  console.log(`✅ Mostrando ${productos.length} productos con indicadores de stock`);
}

console.log('✅ Función mostrarProductos() mejorada con badges de stock');