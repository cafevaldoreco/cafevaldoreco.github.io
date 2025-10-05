# 🔒 Seguridad - Café Valdore

## 🛡️ Medidas de Seguridad Implementadas

### ✅ Content Security Policy (CSP)
```html
<!-- PROTECCIÓN CONTRA XSS -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self';
               script-src 'self' 'unsafe-eval' https://www.gstatic.com https://apis.google.com;
               style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
               font-src 'self' https://fonts.gstatic.com;
               img-src 'self' data: https:;
               connect-src 'self' https://www.gstatic.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://www.googleapis.com https://cafelaesperanza-231a4.firebaseapp.com;
               frame-src 'self' https://cafelaesperanza-231a4.firebaseapp.com https://apis.google.com;">