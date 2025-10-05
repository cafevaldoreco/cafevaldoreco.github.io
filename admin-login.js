// admin-login.js - OPTIMIZADO con carga diferida

// Variables para módulos de Firebase
let firebaseModules = {
  auth: null,
  loaded: false
};

// Cargar Firebase solo cuando se necesite
async function loadFirebaseForAdminLogin() {
  if (firebaseModules.loaded) {
    return firebaseModules;
  }

  console.log('📦 Admin-login: Cargando Firebase...');

  try {
    const configModule = await import('./firebaseconfig.js');
    firebaseModules.auth = configModule.auth;
    
    const authModule = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
    firebaseModules.signInWithEmailAndPassword = authModule.signInWithEmailAndPassword;
    
    firebaseModules.loaded = true;
    console.log('✅ Admin-login: Firebase cargado');
    
    return firebaseModules;
  } catch (error) {
    console.error('❌ Admin-login: Error cargando Firebase:', error);
    throw error;
  }
}

// Elementos DOM
const loginForm = document.getElementById('adminLoginForm');
const emailInput = document.getElementById('adminEmail');
const passwordInput = document.getElementById('adminPassword');
const loginBtn = document.getElementById('loginBtn');
const btnText = document.getElementById('btnText');
const loadingSpinner = document.getElementById('loadingSpinner');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');

// Lista de emails autorizados como administradores
const ADMIN_EMAILS = [
  'jarolmedina41@gmail.com'
];

// Manejo del formulario
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showError('Por favor completa todos los campos');
    return;
  }

  if (!ADMIN_EMAILS.includes(email.toLowerCase())) {
    showError('Este email no tiene permisos de administrador');
    return;
  }

  setLoading(true);
  hideMessages();

  try {
    // Cargar Firebase solo cuando el usuario intenta hacer login
    await loadFirebaseForAdminLogin();
    
    await firebaseModules.signInWithEmailAndPassword(firebaseModules.auth, email, password);
    
    showSuccess('✅ Acceso autorizado. Redirigiendo...');
    
    setTimeout(() => {
      window.location.href = 'admin.html';
    }, 1500);

  } catch (error) {
    console.error('Error de autenticación:', error);
    
    let errorMsg = 'Error de autenticación';
    switch (error.code) {
      case 'auth/user-not-found':
        errorMsg = 'Usuario no encontrado';
        break;
      case 'auth/wrong-password':
        errorMsg = 'Contraseña incorrecta';
        break;
      case 'auth/invalid-email':
        errorMsg = 'Email inválido';
        break;
      case 'auth/too-many-requests':
        errorMsg = 'Demasiados intentos. Intenta más tarde';
        break;
      case 'auth/network-request-failed':
        errorMsg = 'Error de conexión. Verifica tu internet';
        break;
      case 'auth/invalid-credential':
        errorMsg = 'Credenciales incorrectas';
        break;
      default:
        errorMsg = 'Error de acceso. Verifica tus credenciales';
    }
    
    showError(errorMsg);
    setLoading(false);
  }
});

// Funciones auxiliares
function setLoading(loading) {
  loginBtn.disabled = loading;
  loadingSpinner.style.display = loading ? 'inline-block' : 'none';
  btnText.textContent = loading ? 'Verificando...' : 'Iniciar Sesión';
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
  successMessage.style.display = 'none';
}

function showSuccess(message) {
  successMessage.textContent = message;
  successMessage.style.display = 'block';
  errorMessage.style.display = 'none';
}

function hideMessages() {
  errorMessage.style.display = 'none';
  successMessage.style.display = 'none';
}

// Toggle password
window.togglePassword = function() {
  const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
  passwordInput.setAttribute('type', type);
  
  const toggle = document.querySelector('.password-toggle');
  toggle.textContent = type === 'password' ? '👁️' : '🙈';
};

// Limpiar mensajes al escribir
emailInput.addEventListener('input', hideMessages);
passwordInput.addEventListener('input', hideMessages);

console.log('✅ admin-login.js cargado - Modo optimizado');