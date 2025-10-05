// chat.js - OPTIMIZADO con carga diferida total de Firebase

// Variables globales
let conversacionId = null;
let usuarioActual = null;
let mensajesNoLeidos = 0;
let chatInicializado = false;
let unsubscribeMensajes = null;
let unsubscribeAuth = null;

// Variables para módulos de Firebase (carga diferida)
let firebaseModules = {
  db: null,
  auth: null,
  Timestamp: null,
  loaded: false
};

// Cargar Firebase solo cuando se necesite
async function loadFirebaseForChat() {
  if (firebaseModules.loaded) {
    return firebaseModules;
  }

  console.log('📦 Chat: Cargando Firebase bajo demanda...');

  try {
    // Cargar configuración
    const configModule = await import('./firebaseconfig.js');
    firebaseModules.db = configModule.db;
    
    // Cargar Auth
    const authModule = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
    firebaseModules.auth = authModule.getAuth();
    firebaseModules.onAuthStateChanged = authModule.onAuthStateChanged;
    
    // Cargar Firestore
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
    console.log('✅ Chat: Firebase cargado');
    
    return firebaseModules;
  } catch (error) {
    console.error('❌ Chat: Error cargando Firebase:', error);
    throw error;
  }
}

// Generar ID seguro con Web Crypto API
function generarIdSeguro() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return 'guest_' + Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Inicializar solo los event listeners básicos
document.addEventListener('DOMContentLoaded', function() {
  const chatBadge = document.getElementById('chatBadge');
  if (chatBadge) {
    chatBadge.style.display = 'none';
  }
  
  // Configurar el botón de toggle (sin cargar Firebase aún)
  const chatToggle = document.getElementById('chatToggle');
  if (chatToggle) {
    chatToggle.addEventListener('click', inicializarChatLazy);
  }
  
  // Verificar si hay sesión previa para inicializar el contador
  const lastUserId = localStorage.getItem('lastUserId');
  const guestId = localStorage.getItem('guestChatId');
  
  if (lastUserId || guestId) {
    // Solo cargar Firebase para el contador si hay sesión previa
    inicializarAuthParaContador();
  }
});

// Inicializar solo la autenticación y contador
async function inicializarAuthParaContador() {
  try {
    await loadFirebaseForChat();
    
    unsubscribeAuth = firebaseModules.onAuthStateChanged(firebaseModules.auth, (user) => {
      if (user) {
        // Usuario autenticado
        usuarioActual = {
          uid: user.uid,
          email: user.email
        };
        cargarConversacionUsuario();
      } else {
        // Usuario invitado
        let guestId = localStorage.getItem('guestChatId');
        if (!guestId) {
          guestId = generarIdSeguro();
          localStorage.setItem('guestChatId', guestId);
        }
        
        usuarioActual = {
          uid: guestId,
          email: 'invitado@valdore.com'
        };
        cargarConversacionUsuario();
      }
    });
  } catch (error) {
    console.error('Error inicializando auth para contador:', error);
  }
}

// Inicialización lazy - solo cuando el usuario hace clic
async function inicializarChatLazy() {
  // Si ya está inicializado, solo toggle
  if (chatInicializado) {
    toggleChat();
    return;
  }

  console.log('🚀 Inicializando UI del chat por primera vez...');
  
  // Cargar Firebase si no está cargado
  if (!firebaseModules.loaded) {
    await loadFirebaseForChat();
    
    // Inicializar auth si no se ha hecho
    if (!unsubscribeAuth) {
      await inicializarAuthParaContador();
    }
  }
  
  chatInicializado = true;

  // Remover este listener y agregar el normal
  const chatToggle = document.getElementById('chatToggle');
  if (chatToggle) {
    chatToggle.removeEventListener('click', inicializarChatLazy);
    chatToggle.addEventListener('click', toggleChat);
  }

  // Ahora sí inicializar la UI completa del chat
  await inicializarUICompleta();
  
  // Abrir el chat inmediatamente después de inicializar
  abrirChat();
}

async function inicializarUICompleta() {
  // Configurar event listeners de UI
  const chatClose = document.getElementById('chatClose');
  const enviarMensajeBtn = document.getElementById('enviarMensajeChat');
  
  if (chatClose) {
    chatClose.addEventListener('click', cerrarChat);
  }
  
  if (enviarMensajeBtn) {
    enviarMensajeBtn.addEventListener('click', enviarMensaje);
  }
  
  const mensajeInput = document.getElementById('mensajeChat');
  if (mensajeInput) {
    mensajeInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        enviarMensaje();
      }
    });
  }
  
  // Si ya tenemos una conversación, cargar los mensajes
  if (conversacionId) {
    suscribirMensajes(conversacionId);
  } else {
    mostrarMensajeBienvenida();
  }
}

function toggleChat() {
  const chatWindow = document.getElementById('chatWindow');
  if (chatWindow.classList.contains('active')) {
    cerrarChat();
  } else {
    abrirChat();
  }
}

function abrirChat() {
  const chatWindow = document.getElementById('chatWindow');
  chatWindow.classList.add('active');
  
  marcarMensajesComoLeidos();
  
  setTimeout(() => {
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }, 100);
}

function cerrarChat() {
  const chatWindow = document.getElementById('chatWindow');
  chatWindow.classList.remove('active');
}

async function cargarConversacionUsuario() {
  if (!firebaseModules.loaded) return;
  
  try {
    const q = firebaseModules.query(
      firebaseModules.collection(firebaseModules.db, "conversacionesClientes"),
      firebaseModules.where("usuarioId", "==", usuarioActual.uid),
      firebaseModules.orderBy("fechaUltimoMensaje", "desc")
    );
    
    const querySnapshot = await firebaseModules.getDocs(q);
    
    if (!querySnapshot.empty) {
      const conversacionDoc = querySnapshot.docs[0];
      conversacionId = conversacionDoc.id;
      
      // Suscribirse a mensajes inmediatamente para el contador
      suscribirMensajes(conversacionId);
    } else {
      // Si no hay conversación, mostrar bienvenida solo si la UI está inicializada
      if (chatInicializado) {
        mostrarMensajeBienvenida();
      }
      actualizarContadorMensajes(0);
    }
    
  } catch (error) {
    console.error("Error cargando conversación:", error);
    if (chatInicializado) {
      mostrarMensajeBienvenida();
    }
    actualizarContadorMensajes(0);
  }
}

function suscribirMensajes(conversacionId) {
  if (!firebaseModules.loaded) return;
  
  // Si ya existe una suscripción, cancelarla primero
  if (unsubscribeMensajes) {
    unsubscribeMensajes();
  }

  const mensajesRef = firebaseModules.collection(firebaseModules.db, "conversacionesClientes", conversacionId, "mensajes");
  const q = firebaseModules.query(mensajesRef, firebaseModules.orderBy("fecha", "asc"));
  
  // Guardar la función de desuscripción
  unsubscribeMensajes = firebaseModules.onSnapshot(q, (snapshot) => {
    // Solo manipular el DOM si el chat está inicializado
    if (chatInicializado) {
      const chatMessages = document.getElementById('chatMessages');
      chatMessages.innerHTML = '';
    }
    
    let contadorNoLeidos = 0;
    const chatWindow = document.getElementById('chatWindow');
    const chatAbierto = chatWindow?.classList.contains('active');
    
    snapshot.forEach((doc) => {
      const mensaje = doc.data();
      
      // Solo agregar al DOM si el chat está inicializado
      if (chatInicializado) {
        agregarMensajeAlChat(mensaje);
      }
      
      // Siempre contar mensajes no leídos
      if (mensaje.remitente === 'admin' && mensaje.leido === false && !chatAbierto) {
        contadorNoLeidos++;
      }
    });
    
    mensajesNoLeidos = contadorNoLeidos;
    actualizarContadorMensajes(mensajesNoLeidos);
    
    // Solo hacer scroll si el chat está inicializado y abierto
    if (chatInicializado) {
      const chatMessages = document.getElementById('chatMessages');
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }, (error) => {
    console.error("Error en suscripción de mensajes:", error);
  });
}

function mostrarMensajeBienvenida() {
  const chatMessages = document.getElementById('chatMessages');
  chatMessages.innerHTML = `
    <div class="chat-welcome">
      <p>¡Hola! ¿En qué podemos ayudarte?</p>
      <p>Estamos aquí para responder tus preguntas sobre nuestros productos, pedidos o cualquier consulta que tengas.</p>
    </div>
  `;
}

function agregarMensajeAlChat(mensaje) {
  const chatMessages = document.getElementById('chatMessages');
  
  const welcomeMsg = chatMessages.querySelector('.chat-welcome');
  if (welcomeMsg) {
    welcomeMsg.remove();
  }
  
  const mensajeElement = document.createElement('div');
  mensajeElement.className = `mensaje-chat ${mensaje.remitente === 'admin' ? 'mensaje-admin' : 'mensaje-cliente'}`;
  
  const fecha = mensaje.fecha?.toDate ? mensaje.fecha.toDate() : new Date();
  const fechaFormateada = fecha.toLocaleTimeString('es-CO', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  mensajeElement.innerHTML = `
    <div class="mensaje-contenido">
      <p>${mensaje.contenido}</p>
      <span class="mensaje-hora">${fechaFormateada}</span>
    </div>
  `;
  
  chatMessages.appendChild(mensajeElement);
}

async function enviarMensaje() {
  if (!firebaseModules.loaded) {
    console.error('Firebase no está cargado');
    return;
  }
  
  const mensajeInput = document.getElementById('mensajeChat');
  const mensajeTexto = mensajeInput.value.trim();
  
  if (!mensajeTexto) return;
  
  try {
    if (!conversacionId) {
      const nuevaConversacion = {
        usuarioId: usuarioActual.uid,
        usuarioEmail: usuarioActual.email || 'Cliente invitado',
        fechaCreacion: firebaseModules.Timestamp.now(),
        fechaUltimoMensaje: firebaseModules.Timestamp.now(),
        estado: 'activa'
      };
      
      const conversacionRef = await firebaseModules.addDoc(
        firebaseModules.collection(firebaseModules.db, "conversacionesClientes"), 
        nuevaConversacion
      );
      conversacionId = conversacionRef.id;
      suscribirMensajes(conversacionId);
    }
    
    const nuevoMensaje = {
      contenido: mensajeTexto,
      remitente: 'cliente',
      fecha: firebaseModules.Timestamp.now(),
      leido: true
    };
    
    await firebaseModules.addDoc(
      firebaseModules.collection(firebaseModules.db, "conversacionesClientes", conversacionId, "mensajes"), 
      nuevoMensaje
    );
    
    await firebaseModules.updateDoc(
      firebaseModules.doc(firebaseModules.db, "conversacionesClientes", conversacionId), 
      { fechaUltimoMensaje: firebaseModules.Timestamp.now() }
    );
    
    mensajeInput.value = '';
    
  } catch (error) {
    console.error("Error enviando mensaje:", error);
    alert("Error al enviar el mensaje. Por favor, intenta nuevamente.");
  }
}

async function marcarMensajesComoLeidos() {
  if (!conversacionId || !firebaseModules.loaded) return;
  
  try {
    const mensajesRef = firebaseModules.collection(firebaseModules.db, "conversacionesClientes", conversacionId, "mensajes");
    const q = firebaseModules.query(
      mensajesRef, 
      firebaseModules.where("remitente", "==", "admin"),
      firebaseModules.where("leido", "==", false)
    );
    
    const querySnapshot = await firebaseModules.getDocs(q);
    
    const actualizaciones = querySnapshot.docs.map(docSnap => 
      firebaseModules.updateDoc(
        firebaseModules.doc(firebaseModules.db, "conversacionesClientes", conversacionId, "mensajes", docSnap.id), 
        { leido: true }
      )
    );
    
    await Promise.all(actualizaciones);
    
    mensajesNoLeidos = 0;
    actualizarContadorMensajes(0);
    
  } catch (error) {
    console.error("Error marcando mensajes como leídos:", error);
  }
}

// function actualizarContadorMensajes(cantidad) {
//   const chatBadge = document.getElementById('chatBadge');
  
//   if (!chatBadge) return;
  
//   if (cantidad > 0) {
//     chatBadge.textContent = cantidad;
//     chatBadge.style.cssText = `
//       position: absolute !important;
//       top: -5px !important;
//       right: -5px !important;
//       background: #ef4444 !important;
//       color: white !important;
//       width: 24px !important;
//       height: 24px !important;
//       border-radius: 50% !important;
//       display: flex !important;
//       align-items: center !important;
//       justify-content: center !important;
//       font-size: 0.75rem !important;
//       font-weight: bold !important;
//       border: 2px solid white !important;
//       z-index: 9999 !important;
//     `;
//   } else {
//     chatBadge.style.display = 'none';
//   }
// }
function actualizarContadorMensajes(cantidad) {
  let chatBadge = document.getElementById('chatBadge');
  const chatToggle = document.getElementById('chatToggle');
  
  // Si el badge no existe, crearlo
  if (!chatBadge && chatToggle) {
    chatBadge = document.createElement('span');
    chatBadge.id = 'chatBadge';
    chatBadge.className = 'chat-badge';
    chatToggle.style.position = 'relative'; // Asegurar que el padre sea relative
    chatToggle.appendChild(chatBadge);
    console.log('✅ Badge creado dinámicamente');
  }
  
  if (!chatBadge) {
    console.warn('⚠️ No se pudo encontrar o crear chatBadge');
    return;
  }
  
  if (cantidad > 0) {
    chatBadge.textContent = cantidad;
    // Usar atributos individuales en lugar de cssText para mejor compatibilidad
    chatBadge.style.position = 'absolute';
    chatBadge.style.top = '-5px';
    chatBadge.style.right = '-5px';
    chatBadge.style.background = '#ef4444';
    chatBadge.style.color = 'white';
    chatBadge.style.width = '24px';
    chatBadge.style.height = '24px';
    chatBadge.style.borderRadius = '50%';
    chatBadge.style.display = 'flex';
    chatBadge.style.alignItems = 'center';
    chatBadge.style.justifyContent = 'center';
    chatBadge.style.fontSize = '0.75rem';
    chatBadge.style.fontWeight = 'bold';
    chatBadge.style.border = '2px solid white';
    chatBadge.style.zIndex = '9999';
    chatBadge.style.pointerEvents = 'none';
    
    console.log(`✅ Badge actualizado: ${cantidad} mensajes no leídos`);
  } else {
    chatBadge.style.display = 'none';
    console.log('✅ Badge ocultado (0 mensajes)');
  }
}

// Listener para cerrar chat al hacer clic fuera
document.addEventListener('click', (e) => {
  if (!chatInicializado) return;
  
  const chatWindow = document.getElementById('chatWindow');
  const chatToggle = document.getElementById('chatToggle');
  
  if (chatWindow && chatToggle && 
      !chatWindow.contains(e.target) && 
      e.target !== chatToggle &&
      chatWindow.classList.contains('active')) {
    cerrarChat();
  }
});

// Limpiar suscripciones cuando la página se descarga
window.addEventListener('beforeunload', () => {
  if (unsubscribeMensajes) {
    unsubscribeMensajes();
  }
  if (unsubscribeAuth) {
    unsubscribeAuth();
  }
});

// Función para limpiar recursos manualmente
export function limpiarChat() {
  if (unsubscribeMensajes) {
    unsubscribeMensajes();
    unsubscribeMensajes = null;
  }
  if (unsubscribeAuth) {
    unsubscribeAuth();
    unsubscribeAuth = null;
  }
  chatInicializado = false;
  conversacionId = null;
  usuarioActual = null;
  mensajesNoLeidos = 0;
  firebaseModules.loaded = false;
  console.log('Chat limpiado correctamente');
}

console.log('✅ chat.js cargado - Modo optimizado con carga diferida');