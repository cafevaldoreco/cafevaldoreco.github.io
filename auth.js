// auth.js - CORREGIDO con persistencia de sesión

let firebaseModules = {
  auth: null,
  loaded: false
};

const errorMsg = document.getElementById('errorMsg');
const successMsg = document.getElementById('successMsg');

async function loadFirebaseForAuth() {
  if (firebaseModules.loaded) {
    return firebaseModules;
  }

  console.log('📦 Auth: Cargando Firebase...');

  try {
    const configModule = await import('./firebaseconfig.js');
    firebaseModules.auth = configModule.auth;
    
    const authModule = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
    firebaseModules.signInWithEmailAndPassword = authModule.signInWithEmailAndPassword;
    firebaseModules.createUserWithEmailAndPassword = authModule.createUserWithEmailAndPassword;
    firebaseModules.updateProfile = authModule.updateProfile;
    firebaseModules.sendPasswordResetEmail = authModule.sendPasswordResetEmail;
    firebaseModules.updatePassword = authModule.updatePassword;
    firebaseModules.reauthenticateWithCredential = authModule.reauthenticateWithCredential;
    firebaseModules.EmailAuthProvider = authModule.EmailAuthProvider;
    firebaseModules.onAuthStateChanged = authModule.onAuthStateChanged;
    
    firebaseModules.loaded = true;
    console.log('✅ Auth: Firebase cargado');
    
    return firebaseModules;
  } catch (error) {
    console.error('❌ Auth: Error cargando Firebase:', error);
    throw error;
  }
}

function showError(message) {
  errorMsg.textContent = message;
  errorMsg.style.display = 'block';
  successMsg.style.display = 'none';
  setTimeout(() => {
    errorMsg.style.display = 'none';
  }, 5000);
}

function showSuccess(message) {
  successMsg.textContent = message;
  successMsg.style.display = 'block';
  errorMsg.style.display = 'none';
  setTimeout(() => {
    successMsg.style.display = 'none';
  }, 5000);
}

window.toggleForm = function(formType) {
  const forms = document.querySelectorAll('.auth-form');
  forms.forEach(form => form.classList.remove('active'));
  
  const targetForm = document.getElementById(formType + 'Form');
  if (targetForm) {
    targetForm.classList.add('active');
  }
  
  errorMsg.style.display = 'none';
  successMsg.style.display = 'none';
};

// LOGIN
document.getElementById('loginBtn').addEventListener('click', async () => {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    showError('Por favor completa todos los campos');
    return;
  }

  try {
    await loadFirebaseForAuth();
    
    const userCredential = await firebaseModules.signInWithEmailAndPassword(
      firebaseModules.auth, 
      email, 
      password
    );
    
    console.log('✅ Login exitoso:', userCredential.user.uid);
    showSuccess('¡Bienvenido de vuelta!');
    
    // Esperar un poco para asegurar que Firebase persista la sesión
    setTimeout(() => {
      console.log('🔄 Redirigiendo a index.html...');
      window.location.href = 'index.html';
    }, 1500);
  } catch (error) {
    console.error('Error en login:', error);
    switch (error.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        showError('Credenciales incorrectas');
        break;
      case 'auth/invalid-email':
        showError('Correo electrónico inválido');
        break;
      case 'auth/too-many-requests':
        showError('Demasiados intentos. Intenta más tarde');
        break;
      default:
        showError('Error al iniciar sesión');
    }
  }
});

// REGISTRO
document.getElementById('registerBtn').addEventListener('click', async () => {
  const name = document.getElementById('registerName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;

  if (!name || !email || !password) {
    showError('Por favor completa todos los campos');
    return;
  }

  if (password.length < 6) {
    showError('La contraseña debe tener al menos 6 caracteres');
    return;
  }

  try {
    await loadFirebaseForAuth();
    
    const userCredential = await firebaseModules.createUserWithEmailAndPassword(
      firebaseModules.auth, 
      email, 
      password
    );
    await firebaseModules.updateProfile(userCredential.user, { displayName: name });
    
    console.log('✅ Registro exitoso:', userCredential.user.uid);
    showSuccess('¡Cuenta creada exitosamente!');
    
    setTimeout(() => {
      console.log('🔄 Redirigiendo a index.html...');
      window.location.href = 'index.html';
    }, 1500);
  } catch (error) {
    console.error('Error en registro:', error);
    switch (error.code) {
      case 'auth/email-already-in-use':
        showError('Este correo ya está registrado');
        break;
      case 'auth/invalid-email':
        showError('Correo electrónico inválido');
        break;
      case 'auth/weak-password':
        showError('La contraseña es muy débil');
        break;
      default:
        showError('Error al crear cuenta: ' + error.message);
    }
  }
});

// ENVÍO DE CORREO PARA RESTABLECER CONTRASEÑA
document.getElementById('sendResetBtn').addEventListener('click', async () => {
  const email = document.getElementById('forgotEmail').value.trim();

  if (!email) {
    showError('Por favor ingresa tu correo electrónico');
    return;
  }

  try {
    await loadFirebaseForAuth();
    await firebaseModules.sendPasswordResetEmail(firebaseModules.auth, email);
    showSuccess('¡Correo enviado! Revisa tu bandeja de entrada para restablecer tu contraseña.');
    setTimeout(() => {
      toggleForm('login');
    }, 3000);
  } catch (error) {
    console.error('Error al enviar correo:', error);
    switch (error.code) {
      case 'auth/user-not-found':
        showError('No existe una cuenta con este correo electrónico');
        break;
      case 'auth/invalid-email':
        showError('Correo electrónico inválido');
        break;
      default:
        showError('Error al enviar correo: ' + error.message);
    }
  }
});

// CAMBIO DE CONTRASEÑA
document.getElementById('changePassBtn').addEventListener('click', async () => {
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (!currentPassword || !newPassword || !confirmPassword) {
    showError('Por favor completa todos los campos');
    return;
  }

  if (newPassword.length < 6) {
    showError('La nueva contraseña debe tener al menos 6 caracteres');
    return;
  }

  if (newPassword !== confirmPassword) {
    showError('Las contraseñas nuevas no coinciden');
    return;
  }

  try {
    await loadFirebaseForAuth();
    
    const user = firebaseModules.auth.currentUser;
    
    if (!user) {
      showError('Debes iniciar sesión para cambiar tu contraseña');
      toggleForm('login');
      return;
    }

    const credential = firebaseModules.EmailAuthProvider.credential(user.email, currentPassword);
    await firebaseModules.reauthenticateWithCredential(user, credential);
    await firebaseModules.updatePassword(user, newPassword);
    
    showSuccess('¡Contraseña actualizada correctamente!');
    
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    
    setTimeout(() => {
      toggleForm('login');
    }, 2000);
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    switch (error.code) {
      case 'auth/wrong-password':
        showError('La contraseña actual es incorrecta');
        break;
      case 'auth/requires-recent-login':
        showError('Por seguridad, debes iniciar sesión nuevamente para cambiar tu contraseña');
        break;
      default:
        showError('Error al cambiar contraseña: ' + error.message);
    }
  }
});

document.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    if (document.getElementById('loginForm').classList.contains('active')) {
      document.getElementById('loginBtn').click();
    } else if (document.getElementById('registerForm').classList.contains('active')) {
      document.getElementById('registerBtn').click();
    } else if (document.getElementById('forgotForm').classList.contains('active')) {
      document.getElementById('sendResetBtn').click();
    } else if (document.getElementById('changePassForm').classList.contains('active')) {
      document.getElementById('changePassBtn').click();
    }
  }
});

// VERIFICACIÓN DE SESIÓN AL CARGAR LA PÁGINA
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🔍 Verificando sesión activa...');
  
  await loadFirebaseForAuth();
  
  firebaseModules.onAuthStateChanged(firebaseModules.auth, (user) => {
    if (user) {
      console.log('✅ Sesión activa detectada:', user.uid);
      // Si hay un usuario autenticado y estamos en auth.html, redirigir a index
      if (window.location.pathname.endsWith('auth.html')) {
        console.log('🔄 Usuario ya autenticado, redirigiendo a index.html...');
        window.location.href = 'index.html';
      }
    } else {
      console.log('❌ No hay sesión activa');
    }
  });
});

console.log('✅ auth.js cargado - Modo optimizado con persistencia');