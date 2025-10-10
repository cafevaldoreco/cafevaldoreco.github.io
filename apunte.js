
// ========================================
// 🔧 REEMPLAZAR en main.js
// ========================================

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

// 4️⃣ OPCIONAL: Agregar validación extra al confirmar pedido
// Modificar la función dentro de mostrarFormularioPedido()

// Busca esta línea en mostrarFormularioPedido():
// formulario.querySelector('#formPedido').addEventListener('submit', async (e) => {

// Y REEMPLAZA todo el contenido del evento submit con esto:


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