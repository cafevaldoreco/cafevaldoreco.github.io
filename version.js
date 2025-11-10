// version.js - Sistema de versionado y debugging
const APP_VERSION = '2.2.1';
const BUILD_DATE = '2025-10-10';

console.log(`
╔════════════════════════════════════════╗
║     ☕ CAFÉ VALDORE - v${APP_VERSION}        ║
║     Build: ${BUILD_DATE}               ║
║     Cache: cafe-valdore-v${APP_VERSION}    ║
╚════════════════════════════════════════╝
`);

// Función para limpiar TODO el caché
window.limpiarCache = function() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for(let registration of registrations) {
        registration.unregister();
        console.log('🗑️ Service Worker desregistrado');
      }
    });
  }
  
  if ('caches' in window) {
    caches.keys().then(function(names) {
      for (let name of names) {
        caches.delete(name);
        console.log('🗑️ Cache eliminado:', name);
      }
    });
  }
  
  const confirmacion = confirm('¿Limpiar también datos locales (carrito, etc)?');
  if (confirmacion) {
    localStorage.clear();
    sessionStorage.clear();
    console.log('🗑️ LocalStorage y SessionStorage limpiados');
  }
  
  alert('✅ Caché limpiado completamente.\n\nRecarga la página con Ctrl+Shift+R');
};

// Función para verificar versión actual
window.verificarVersion = function() {
  console.log(`📋 Versión actual: ${APP_VERSION}`);
  console.log(`📅 Build: ${BUILD_DATE}`);
  console.log(`💾 Cache name: cafe-valdore-v${APP_VERSION}`);
  
  // Mostrar caches activos
  if ('caches' in window) {
    caches.keys().then(names => {
      console.log('📦 Caches activos:', names);
    });
  }
  
  // Mostrar Service Workers activos
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      console.log('🔧 Service Workers:', registrations.length);
    });
  }
};

// Función para forzar actualización del Service Worker
window.actualizarSW = function() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        registration.update();
        console.log('🔄 Actualizando Service Worker...');
      });
    });
    
    setTimeout(() => {
      console.log('✅ Recarga la página para ver cambios');
      if (confirm('Service Worker actualizado. ¿Recargar página?')) {
        window.location.reload();
      }
    }, 1000);
  }
};

// En modo desarrollo, mostrar comandos
if (window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '') {
  console.log('🔧 Modo desarrollo detectado');
  console.log('💡 Comandos disponibles en consola:');
  console.log('   limpiarCache()    - Limpiar TODO el caché y SW');
  console.log('   verificarVersion() - Ver versión y estado');
  console.log('   actualizarSW()    - Forzar actualización del SW');
}

export const version = APP_VERSION;
export const buildDate = BUILD_DATE;