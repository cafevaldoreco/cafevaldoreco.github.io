// auth-guard.js - OPTIMIZADO con carga diferida

// Variables para módulos de Firebase
let firebaseModules = {
  auth: null,
  loaded: false
};

const ADMIN_EMAILS = [
  'jarolmedina41@gmail.com'
];

// Cargar Firebase solo cuando se necesite
async function loadFirebaseForGuard() {
  if (firebaseModules.loaded) {
    return firebaseModules;
  }

  console.log('📦 Auth-guard: Cargando Firebase...');

  try {
    // Cargar configuración
    const configModule = await import('./firebaseconfig.js');
    firebaseModules.auth = configModule.auth;
    
    // Cargar módulos de Auth
    const authModule = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
    firebaseModules.onAuthStateChanged = authModule.onAuthStateChanged;
    
    firebaseModules.loaded = true;
    console.log('✅ Auth-guard: Firebase cargado');
    
    return firebaseModules;
  } catch (error) {
    console.error('❌ Auth-guard: Error cargando Firebase:', error);
    throw error;
  }
}

// Limpiar localStorage obsoleto (solo una vez)
if (localStorage.getItem('isAdmin')) {
  localStorage.removeItem('isAdmin');
  localStorage.removeItem('adminEmail');
  localStorage.removeItem('adminUID');
  console.log('✅ localStorage obsoleto limpiado');
}

// Verificar autenticación de administrador
async function verificarAccesoAdmin() {
  await loadFirebaseForGuard();
  
  return new Promise((resolve) => {
    firebaseModules.onAuthStateChanged(firebaseModules.auth, (user) => {
      if (!user) {
        showAuthNotification('Debes iniciar sesión', 'warning');
        setTimeout(() => {
          window.location.href = 'admin-login.html';
        }, 2000);
        resolve(false);
        return;
      }

      if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        showAuthNotification('No tienes permisos de administrador', 'error');
        firebaseModules.auth.signOut();
        setTimeout(() => {
          window.location.href = 'admin-login.html';
        }, 2000);
        resolve(false);
        return;
      }

      resolve(true);
    });
  });
}

// Cerrar sesión
async function cerrarSesionAdmin() {
  if (!firebaseModules.loaded) {
    await loadFirebaseForGuard();
  }
  
  showAuthNotification('Cerrando sesión...', 'info');
  
  firebaseModules.auth.signOut().then(() => {
    showAuthNotification('Sesión cerrada exitosamente', 'success');
    setTimeout(() => {
      window.location.href = 'admin-login.html';
    }, 1500);
  }).catch((error) => {
    console.error('Error al cerrar sesión:', error);
    showAuthNotification('Error al cerrar sesión', 'error');
  });
}

// Configurar botones de logout
function configurarLogout() {
  const logoutButtons = document.querySelectorAll('#authBtn, #authMobileBtn, .auth-btn');
  
  logoutButtons.forEach(button => {
    if (button) {
      button.textContent = '🚪 Cerrar Sesión';
      button.addEventListener('click', (e) => {
        e.preventDefault();
        cerrarSesionAdmin();
      });
    }
  });
}

// Mostrar información del admin
async function mostrarInfoAdmin() {
  if (!firebaseModules.loaded) {
    await loadFirebaseForGuard();
  }
  
  firebaseModules.onAuthStateChanged(firebaseModules.auth, (user) => {
    if (user && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      const adminInfoElements = document.querySelectorAll('.admin-info, .user-welcome');
      
      adminInfoElements.forEach(element => {
        if (element) {
          element.innerHTML = `
            <span style="color: #DAA520; font-weight: 600;">
              👤 Administrador: ${user.email}
            </span>
          `;
          element.style.display = 'block';
        }
      });

      const pageTitle = document.querySelector('.admin-header h1, .presentacion h2');
      if (pageTitle && pageTitle.textContent.includes('Bienvenido')) {
        pageTitle.innerHTML = `
          Bienvenido, Administrador
          <br><small style="font-size: 0.6em; color: #4A5568;">${user.email}</small>
        `;
      }
    }
  });
}

// Función para mostrar notificaciones
function showAuthNotification(mensaje, tipo = 'info') {
  const existingNotifications = document.querySelectorAll('.auth-notification');
  existingNotifications.forEach(notif => notif.remove());
  
  const notification = document.createElement('div');
  notification.className = `auth-notification ${tipo}`;
  
  const icons = {
    'success': '✅',
    'error': '❌', 
    'warning': '⚠️',
    'info': 'ℹ️'
  };
  
  notification.innerHTML = `
    <div class="auth-notification-content">
      <div class="auth-notification-icon">${icons[tipo] || 'ℹ️'}</div>
      <div class="auth-notification-message">${mensaje}</div>
      <button class="auth-notification-close">&times;</button>
    </div>
    <div class="auth-notification-progress"></div>
  `;
  
  const colors = {
    'success': {
      bg: 'linear-gradient(135deg, #10B981, #059669)',
      shadow: 'rgba(16, 185, 129, 0.3)'
    },
    'error': {
      bg: 'linear-gradient(135deg, #EF4444, #DC2626)',
      shadow: 'rgba(239, 68, 68, 0.3)'
    },
    'warning': {
      bg: 'linear-gradient(135deg, #F59E0B, #D97706)',
      shadow: 'rgba(245, 158, 11, 0.3)'
    },
    'info': {
      bg: 'linear-gradient(135deg, #3B82F6, #2563EB)',
      shadow: 'rgba(59, 130, 246, 0.3)'
    }
  };
  
  notification.style.cssText = `
    position: fixed;
    top: 30px;
    right: 30px;
    background: ${colors[tipo].bg};
    color: white;
    padding: 0;
    border-radius: 12px;
    box-shadow: 0 8px 32px ${colors[tipo].shadow};
    z-index: 10000;
    min-width: 350px;
    max-width: 500px;
    overflow: hidden;
    animation: slideInBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  
  document.body.appendChild(notification);
  
  const progressBar = notification.querySelector('.auth-notification-progress');
  let duration = tipo === 'info' ? 3000 : 4000;
  
  progressBar.style.cssText = `
    position: absolute;
    bottom: 0;
    left: 0;
    height: 3px;
    background: rgba(255, 255, 255, 0.3);
    width: 100%;
    animation: shrinkProgress ${duration}ms linear;
  `;
  
  const autoClose = setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slideOutRight 0.4s ease-in-out';
      setTimeout(() => notification.remove(), 400);
    }
  }, duration);
  
  const closeBtn = notification.querySelector('.auth-notification-close');
  closeBtn.addEventListener('click', () => {
    clearTimeout(autoClose);
    notification.style.animation = 'slideOutRight 0.4s ease-in-out';
    setTimeout(() => notification.remove(), 400);
  });
}

// Inicializar
document.addEventListener('DOMContentLoaded', async function() {
  const isAdminPage = window.location.pathname.includes('admin') &&
                      !window.location.pathname.includes('admin-login');
  
  if (isAdminPage) {
    // Solo cargar Firebase si estamos en una página de admin que NO sea login
    const tieneAcceso = await verificarAccesoAdmin();
    
    if (tieneAcceso) {
      configurarLogout();
      mostrarInfoAdmin();
      
      firebaseModules.onAuthStateChanged(firebaseModules.auth, (user) => {
        if (user) {
          showAuthNotification(`Bienvenido, ${user.email}`, 'success');
        }
      });
      
      console.log('✅ Acceso de administrador verificado');
    }
  }
});

// CSS
const authNotificationStyles = document.createElement('style');
authNotificationStyles.textContent = `
  @keyframes slideInBounce {
    0% { opacity: 0; transform: translateX(400px) scale(0.8); }
    50% { opacity: 0.8; transform: translateX(-20px) scale(1.05); }
    100% { opacity: 1; transform: translateX(0) scale(1); }
  }
  
  @keyframes slideOutRight {
    0% { opacity: 1; transform: translateX(0) scale(1); }
    100% { opacity: 0; transform: translateX(400px) scale(0.8); }
  }
  
  @keyframes shrinkProgress {
    0% { width: 100%; }
    100% { width: 0%; }
  }
  
  .auth-notification-content {
    display: flex;
    align-items: center;
    padding: 20px;
    gap: 15px;
  }
  
  .auth-notification-icon {
    font-size: 24px;
    flex-shrink: 0;
    animation: pulse 2s infinite;
  }
  
  .auth-notification-message {
    flex: 1;
    font-weight: 500;
    font-size: 16px;
    line-height: 1.4;
  }
  
  .auth-notification-close {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    font-size: 20px;
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }
  
  .auth-notification-close:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
  }
  
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
  
  .auth-btn {
    background: linear-gradient(135deg, #DC2626, #B91C1C);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
    text-decoration: none;
  }
  
  .auth-btn:hover {
    background: linear-gradient(135deg, #B91C1C, #991B1B);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
  }
  
  @media (max-width: 480px) {
    .auth-notification {
      right: 15px !important;
      left: 15px !important;
      min-width: auto !important;
      max-width: none !important;
    }
  }
`;

document.head.appendChild(authNotificationStyles);

console.log('✅ auth-guard.js cargado - Modo optimizado');