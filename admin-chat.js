// admin-chat.js - OPTIMIZADO (Firebase ya cargado por admin.js)

// Variables para módulos de Firebase (reutilizar del scope global)
let firebaseModules = {
  db: null,
  loaded: false
};

// Función para obtener Firebase (ya debería estar cargado por admin.js)
async function getFirebaseModules() {
  if (firebaseModules.loaded) {
    return firebaseModules;
  }

  // Cargar si no está disponible
  console.log('📦 Admin-chat: Cargando Firebase...');
  
  const configModule = await import('./firebaseconfig.js');
  firebaseModules.db = configModule.db;
  
  const firestoreModule = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
  firebaseModules.collection = firestoreModule.collection;
  firebaseModules.getDocs = firestoreModule.getDocs;
  firebaseModules.addDoc = firestoreModule.addDoc;
  firebaseModules.doc = firestoreModule.doc;
  firebaseModules.query = firestoreModule.query;
  firebaseModules.orderBy = firestoreModule.orderBy;
  firebaseModules.where = firestoreModule.where;
  firebaseModules.Timestamp = firestoreModule.Timestamp;
  firebaseModules.onSnapshot = firestoreModule.onSnapshot;
  firebaseModules.updateDoc = firestoreModule.updateDoc;
  
  firebaseModules.loaded = true;
  return firebaseModules;
}

// Variables globales para el chat
let conversacionesData = [];
let conversacionActiva = null;
let unsubscribeConversaciones = null;
let unsubscribeMensajes = null;

// Elementos del DOM
const conversacionesLista = document.getElementById('conversacionesLista');
const buscarConversacion = document.getElementById('buscarConversacion');
const filtroConversacionesEstado = document.getElementById('filtroConversacionesEstado');
const actualizarConversaciones = document.getElementById('actualizarConversaciones');
const chatMessages = document.getElementById('chatMessages');
const clienteNombre = document.getElementById('clienteNombre');
const clienteEmail = document.getElementById('clienteEmail');
const chatStatus = document.getElementById('chatStatus');
const mensajeAdmin = document.getElementById('mensajeAdmin');
const enviarMensajeAdmin = document.getElementById('enviarMensajeAdmin');
const chatInputContainer = document.getElementById('chatInputContainer');

document.addEventListener('DOMContentLoaded', function() {
  setTimeout(() => {
    inicializarChatAdmin();
  }, 100);
});

async function inicializarChatAdmin() {
  console.log('Inicializando chat admin...');
  
  // Asegurar que Firebase esté cargado
  await getFirebaseModules();
  
  if (buscarConversacion) {
    buscarConversacion.addEventListener('input', filtrarConversaciones);
  }
  
  if (filtroConversacionesEstado) {
    filtroConversacionesEstado.addEventListener('change', filtrarConversaciones);
  }
  
  if (actualizarConversaciones) {
    actualizarConversaciones.addEventListener('click', cargarConversaciones);
  }
  
  if (enviarMensajeAdmin) {
    enviarMensajeAdmin.addEventListener('click', enviarMensajeComoAdmin);
  }
  
  if (mensajeAdmin) {
    mensajeAdmin.addEventListener('keypress', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        enviarMensajeComoAdmin();
      }
    });
  }
  
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(button => {
    if (button.dataset.tab === 'chat') {
      button.addEventListener('click', () => {
        setTimeout(() => {
          cargarConversaciones();
        }, 100);
      });
    }
  });
  
  const tabChat = document.getElementById('tab-chat');
  if (tabChat && tabChat.classList.contains('active')) {
    cargarConversaciones();
  }
}

async function cargarConversaciones() {
  try {
    await getFirebaseModules();
    
    if (unsubscribeConversaciones) {
      unsubscribeConversaciones();
    }
    
    mostrarCargandoConversaciones();
    
    const q = firebaseModules.query(
      firebaseModules.collection(firebaseModules.db, "conversacionesClientes"), 
      firebaseModules.orderBy("fechaUltimoMensaje", "desc")
    );
    
    unsubscribeConversaciones = firebaseModules.onSnapshot(q, (snapshot) => {
      conversacionesData = [];
      
      snapshot.forEach((documento) => {
        const data = documento.data();
        conversacionesData.push({
          id: documento.id,
          usuarioId: data.usuarioId,
          usuarioEmail: data.usuarioEmail || 'Cliente sin email',
          fechaCreacion: data.fechaCreacion,
          fechaUltimoMensaje: data.fechaUltimoMensaje,
          estado: data.estado || 'activa',
          mensajesSinLeer: 0
        });
      });
      
      calcularMensajesSinLeer();
      mostrarConversaciones();
    }, (error) => {
      console.error("Error cargando conversaciones:", error);
      mostrarErrorConversaciones();
    });
    
  } catch (error) {
    console.error("Error inicializando conversaciones:", error);
    mostrarErrorConversaciones();
  }
}

async function calcularMensajesSinLeer() {
  for (let conversacion of conversacionesData) {
    try {
      const mensajesRef = firebaseModules.collection(firebaseModules.db, "conversacionesClientes", conversacion.id, "mensajes");
      const q = firebaseModules.query(
        mensajesRef, 
        firebaseModules.where("remitente", "==", "cliente"),
        firebaseModules.where("leido", "==", false)
      );
      
      const snapshot = await firebaseModules.getDocs(q);
      conversacion.mensajesSinLeer = snapshot.size;
    } catch (error) {
      console.error("Error contando mensajes sin leer:", error);
      conversacion.mensajesSinLeer = 0;
    }
  }
}

function mostrarConversaciones() {
  if (!conversacionesLista) return;
  
  const conversacionesFiltradas = filtrarConversacionesData();
  
  if (conversacionesFiltradas.length === 0) {
    conversacionesLista.innerHTML = `
      <div class="empty-conversaciones">
        <p>💬 No hay conversaciones</p>
        <small>Las conversaciones aparecerán cuando los clientes envíen mensajes</small>
      </div>
    `;
    return;
  }
  
  conversacionesLista.innerHTML = conversacionesFiltradas.map(conversacion => {
    const fechaFormateada = formatearFechaRelativa(conversacion.fechaUltimoMensaje);
    const esActiva = conversacionActiva?.id === conversacion.id;
    const tieneMensajesSinLeer = conversacion.mensajesSinLeer > 0;
    
    return `
      <div class="conversacion-item ${esActiva ? 'activa' : ''} ${tieneMensajesSinLeer ? 'sin-leer' : ''}"
           onclick="seleccionarConversacion('${conversacion.id}')">
        <div class="conversacion-avatar">
          <span>👤</span>
        </div>
        <div class="conversacion-info">
          <div class="conversacion-header">
            <h4>${conversacion.usuarioEmail}</h4>
            <span class="conversacion-tiempo">${fechaFormateada}</span>
          </div>
          <div class="conversacion-preview">
            <span>ID: ${conversacion.usuarioId.substring(0, 8)}...</span>
            ${tieneMensajesSinLeer ? `<span class="mensajes-sin-leer">${conversacion.mensajesSinLeer}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function filtrarConversaciones() {
  mostrarConversaciones();
}

function filtrarConversacionesData() {
  let conversacionesFiltradas = [...conversacionesData];
  
  const busqueda = buscarConversacion?.value.toLowerCase();
  if (busqueda) {
    conversacionesFiltradas = conversacionesFiltradas.filter(c => 
      c.usuarioEmail.toLowerCase().includes(busqueda) || 
      c.usuarioId.toLowerCase().includes(busqueda)
    );
  }
  
  const filtro = filtroConversacionesEstado?.value;
  if (filtro === 'sin-responder') {
    conversacionesFiltradas = conversacionesFiltradas.filter(c => c.mensajesSinLeer > 0);
  } else if (filtro === 'activas') {
    conversacionesFiltradas = conversacionesFiltradas.filter(c => c.estado === 'activa');
  }
  
  return conversacionesFiltradas;
}

window.seleccionarConversacion = async function(conversacionId) {
  await getFirebaseModules();
  
  const conversacion = conversacionesData.find(c => c.id === conversacionId);
  if (!conversacion) return;
  
  conversacionActiva = conversacion;
  
  if (clienteNombre) clienteNombre.textContent = conversacion.usuarioEmail;
  if (clienteEmail) clienteEmail.textContent = `ID: ${conversacion.usuarioId}`;
  if (chatStatus) {
    chatStatus.innerHTML = `<span class="status-indicator online"></span> En línea`;
  }
  
  if (chatInputContainer) chatInputContainer.style.display = 'block';
  
  cargarMensajesConversacion(conversacionId);
  mostrarConversaciones();
  marcarMensajesComoLeidos(conversacionId);
};

function cargarMensajesConversacion(conversacionId) {
  if (unsubscribeMensajes) {
    unsubscribeMensajes();
  }
  
  const mensajesRef = firebaseModules.collection(firebaseModules.db, "conversacionesClientes", conversacionId, "mensajes");
  const q = firebaseModules.query(mensajesRef, firebaseModules.orderBy("fecha", "asc"));
  
  unsubscribeMensajes = firebaseModules.onSnapshot(q, (snapshot) => {
    if (!chatMessages) return;
    
    chatMessages.innerHTML = '';
    
    if (snapshot.empty) {
      chatMessages.innerHTML = `
        <div class="chat-welcome">
          <p>💬 Conversación iniciada</p>
          <p>Puedes comenzar a chatear con este cliente.</p>
        </div>
      `;
      return;
    }
    
    snapshot.forEach((doc) => {
      const mensaje = doc.data();
      agregarMensajeAlChat(mensaje);
    });
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

function agregarMensajeAlChat(mensaje) {
  if (!chatMessages) return;
  
  const welcomeMsg = chatMessages.querySelector('.chat-welcome');
  if (welcomeMsg) {
    welcomeMsg.remove();
  }
  
  const mensajeElement = document.createElement('div');
  const esAdmin = mensaje.remitente === 'admin';
  
  const esMensajeLargo = mensaje.contenido.length > 200;
  mensajeElement.className = `mensaje-chat-admin ${esAdmin ? 'mensaje-admin' : 'mensaje-cliente'} ${esMensajeLargo ? 'mensaje-largo' : ''}`;
  
  const fecha = mensaje.fecha?.toDate ? mensaje.fecha.toDate() : new Date();
  const fechaFormateada = fecha.toLocaleTimeString('es-CO', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  mensajeElement.innerHTML = `
    <div class="mensaje-contenido-admin">
      <div class="mensaje-avatar">
        ${esAdmin ? '👨‍💼' : '👤'}
      </div>
      <div class="mensaje-texto">
        <div class="mensaje-header-admin">
          <span class="remitente">${esAdmin ? 'Tú (Admin)' : 'Cliente'}</span>
          <span class="mensaje-hora">${fechaFormateada}</span>
        </div>
        <p>${mensaje.contenido}</p>
      </div>
    </div>
  `;
  
  chatMessages.appendChild(mensajeElement);
}

async function enviarMensajeComoAdmin() {
  if (!conversacionActiva || !mensajeAdmin) return;
  
  const mensajeTexto = mensajeAdmin.value.trim();
  if (!mensajeTexto) return;
  
  try {
    await getFirebaseModules();
    
    const nuevoMensaje = {
      contenido: mensajeTexto,
      remitente: 'admin',
      fecha: firebaseModules.Timestamp.now(),
      leido: false
    };
    
    await firebaseModules.addDoc(
      firebaseModules.collection(firebaseModules.db, "conversacionesClientes", conversacionActiva.id, "mensajes"), 
      nuevoMensaje
    );
    
    await firebaseModules.updateDoc(
      firebaseModules.doc(firebaseModules.db, "conversacionesClientes", conversacionActiva.id), 
      { fechaUltimoMensaje: firebaseModules.Timestamp.now() }
    );
    
    mensajeAdmin.value = '';
    mensajeAdmin.style.height = 'auto';
    
  } catch (error) {
    console.error("Error enviando mensaje:", error);
    mostrarNotificacionChat("Error al enviar el mensaje. Intenta nuevamente.", 'error');
  }
}

async function marcarMensajesComoLeidos(conversacionId) {
  try {
    await getFirebaseModules();
    
    const mensajesRef = firebaseModules.collection(firebaseModules.db, "conversacionesClientes", conversacionId, "mensajes");
    const q = firebaseModules.query(
      mensajesRef, 
      firebaseModules.where("remitente", "==", "cliente"),
      firebaseModules.where("leido", "==", false)
    );
    
    const snapshot = await firebaseModules.getDocs(q);
    
    const actualizaciones = [];
    snapshot.forEach((documento) => {
      actualizaciones.push(
        firebaseModules.updateDoc(
          firebaseModules.doc(firebaseModules.db, "conversacionesClientes", conversacionId, "mensajes", documento.id), 
          { leido: true }
        )
      );
    });
    
    await Promise.all(actualizaciones);
    
    const conversacion = conversacionesData.find(c => c.id === conversacionId);
    if (conversacion) {
      conversacion.mensajesSinLeer = 0;
    }
    
  } catch (error) {
    console.error("Error marcando mensajes como leídos:", error);
  }
}

function formatearFechaRelativa(fecha) {
  if (!fecha) return 'Hace tiempo';
  
  try {
    let fechaObj;
    if (fecha.toDate) {
      fechaObj = fecha.toDate();
    } else {
      fechaObj = new Date(fecha);
    }
    
    const ahora = new Date();
    const diferencia = ahora - fechaObj;
    
    if (diferencia < 60000) return 'Ahora';
    if (diferencia < 3600000) {
      const minutos = Math.floor(diferencia / 60000);
      return `Hace ${minutos}m`;
    }
    if (diferencia < 86400000) {
      const horas = Math.floor(diferencia / 3600000);
      return `Hace ${horas}h`;
    }
    
    const dias = Math.floor(diferencia / 86400000);
    if (dias === 1) return 'Ayer';
    if (dias < 7) return `Hace ${dias} días`;
    
    return fechaObj.toLocaleDateString('es-CO', { 
      day: 'numeric', 
      month: 'short' 
    });
    
  } catch (error) {
    return 'Fecha inválida';
  }
}

function mostrarCargandoConversaciones() {
  if (conversacionesLista) {
    conversacionesLista.innerHTML = `
      <div class="loading-conversaciones">
        <p>⏳ Cargando conversaciones...</p>
      </div>
    `;
  }
}

function mostrarErrorConversaciones() {
  if (conversacionesLista) {
    conversacionesLista.innerHTML = `
      <div class="error-conversaciones">
        <p>❌ Error cargando conversaciones</p>
        <button onclick="cargarConversaciones()" class="btn-reintentar">🔄 Reintentar</button>
      </div>
    `;
  }
}

function mostrarNotificacionChat(mensaje, tipo = 'info') {
  if (window.mostrarNotificacion) {
    window.mostrarNotificacion(mensaje, tipo);
  } else {
    console.log(`[${tipo.toUpperCase()}] ${mensaje}`);
  }
}

window.addEventListener('beforeunload', () => {
  if (unsubscribeConversaciones) {
    unsubscribeConversaciones();
  }
  if (unsubscribeMensajes) {
    unsubscribeMensajes();
  }
});

document.addEventListener('DOMContentLoaded', function() {
  const textarea = document.getElementById('mensajeAdmin');
  if (textarea) {
    textarea.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
  }
});

console.log('✅ admin-chat.js cargado - Modo optimizado');