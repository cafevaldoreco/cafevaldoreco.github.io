# ☕ CAFÉ VALDORE - Sistema de Gestión Integral

**¡Bienvenido al corazón del café especial del Huila!** 🌄

![Café Valdore](https://img.shields.io/badge/Café-Valdore-brown?style=for-the-badge)
![Version](https://img.shields.io/badge/version-2.0.0-green?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange?style=for-the-badge&logo=firebase)

---

## 📖 Descripción

Sistema de comercio electrónico integral especializado en la venta de café premium del Huila. Incluye gestión completa de inventario en tiempo real, procesamiento automático de pedidos, control de stock con alertas, sistema de autenticación seguro, panel administrativo completo, y comunicación directa con clientes mediante chat en vivo.

---

## 🚀 Características Principales

| Funcionalidad | Estado | Descripción |
|---------------|--------|-------------|
| 🛒 **E-commerce Completo** | ✅ Activo | Catálogo dinámico con Firebase |
| 📦 **Control de Inventario** | ✅ Activo | Gestión automática de stock en tiempo real |
| ⚠️ **Alertas de Stock** | ✅ Activo | Badges visuales (agotado, pocas unidades) |
| 🔐 **Autenticación** | ✅ Activo | Login/Registro con Firebase Auth |
| 💬 **Chat en Tiempo Real** | ✅ Activo | Comunicación directa admin-cliente |
| 📱 **Responsive Design** | ✅ Activo | Optimizado para todos los dispositivos |
| 🎨 **Panel Administrativo** | ✅ Activo | Gestión de pedidos, inventario y mensajes |
| 📊 **Reportes y Exportación** | ✅ Activo | Exportación de inventario a CSV |
| 🔔 **Notificaciones** | ✅ Activo | Sistema de notificaciones en tiempo real |
| ⚡ **PWA Ready** | ✅ Activo | Service Worker para funcionamiento offline |

---

## 📂 Estructura del Proyecto

```
CAFEVALDORE/
│
├── 📁 CSS/
│   ├── admin-login.css          # Estilos del login administrativo
│   ├── admin.css                # Estilos del panel admin
│   ├── admin-inventario.css     # Estilos de gestión de inventario
│   ├── auth.css                 # Estilos de autenticación
│   ├── carrito.css              # Estilos del carrito de compras
│   ├── cerrarcarrito.css        # Animaciones del carrito
│   ├── contacto.css             # Página de contacto
│   ├── formulario.css           # Formularios generales
│   ├── historia.css             # Página "Nuestra Historia"
│   ├── pedidos.css              # Página de pedidos del usuario
│   ├── productos.css            # Estilos de productos y badges
│   └── styles.css               # Estilos globales
│
├── 📁 JS/
│   ├── admin-chat.js            # Chat administrativo
│   ├── admin-inventario.js      # Gestión completa de inventario
│   ├── admin-login.js           # Login de administradores
│   ├── admin.js                 # Panel administrativo
│   ├── auth-guard.js            # Protección de rutas
│   ├── auth.js                  # Sistema de autenticación
│   ├── cargarProductos.js       # Carga dinámica de productos
│   ├── cargarPedidos.js         # Carga de pedidos del usuario
│   ├── chat.js                  # Chat del cliente
│   ├── firebaseconfig.js        # Configuración de Firebase
│   ├── main.js                  # Lógica principal del sitio
│   └── version.js               # Control de versiones
│
├── 📁 images/
│   ├── bourbon.webp             # Café Bourbon Rosado
│   ├── caturra.webp             # Café Caturra
│   ├── promocion.webp           # Promoción 1+1
│   ├── superpromocion.webp      # Súper Promoción 2+2
│   ├── logo.webp                # Logo del sitio
│   └── fondocafe.webp           # Imagen de fondo
│
├── 📄 index.html                # Página principal
├── 📄 admin.html                # Panel administrativo
├── 📄 admin-login.html          # Login de administradores
├── 📄 admin-inventario.html     # Gestión de inventario
├── 📄 auth.html                 # Autenticación de usuarios
├── 📄 contacto.html             # Formulario de contacto
├── 📄 historia.html             # Nuestra historia
├── 📄 pedidos.html              # Historial de pedidos
├── 📄 sw.js                     # Service Worker (PWA)
├── 📄 manifest.json             # Manifest PWA
└── 📄 README.md                 # Este archivo
```

---

## 🛠️ Tecnologías Utilizadas

### Frontend
```javascript
HTML5                    // Estructura semántica
CSS3                     // Diseño responsive y animaciones
JavaScript ES6+          // Lógica del cliente
Firebase 10.12.0         // Backend as a Service
  ├── Authentication     // Gestión de usuarios
  ├── Firestore          // Base de datos NoSQL
  └── Storage            // Almacenamiento de archivos
```

### Características Técnicas
- ⚡ **Carga Diferida**: Módulos ES6 con importación dinámica
- 🔒 **Seguridad**: CSP headers, validación de entrada
- 📱 **PWA**: Service Worker para funcionalidad offline
- 🎨 **UI/UX**: Animaciones CSS, transiciones suaves
- ♿ **Accesibilidad**: Semantic HTML, ARIA labels
- 🚀 **Optimización**: Lazy loading, WebP images

---

## 📊 Base de Datos (Firestore)

### Colecciones

#### `productos`
```javascript
{
  id: "cafe-bourbon",
  nombre: "Bourbon Rosado 500g",
  descripcion: "Café de tueste medio...",
  precio: 50000,
  imagen: "bourbon.webp",
  categoria: "cafe",
  destacado: true
}
```

#### `inventario`
```javascript
{
  stock: 100,
  stockMinimo: 10,
  stockMaximo: 500,
  activo: true,
  ultimaActualizacion: Timestamp,
  ultimoMotivo: "Venta automática"
}
```

#### `pedidos`
```javascript
{
  uid: "user123",
  datosCliente: {
    nombre: "Juan Pérez",
    telefono: "300123456",
    direccion: "Calle 123",
    ciudad: "Pitalito",
    email: "juan@example.com"
  },
  pedido: [
    { producto: "Café Bourbon", precio: 50000, cantidad: 2 }
  ],
  total: 100000,
  fecha: "2025-10-10T10:30:00Z",
  estado: "pendiente"
}
```

#### `usuarios`
```javascript
{
  email: "usuario@example.com",
  rol: "cliente", // "cliente" | "admin"
  createdAt: Timestamp
}
```

#### `mensajesContacto`
```javascript
{
  nombre: "Cliente",
  email: "cliente@example.com",
  asunto: "Consulta",
  mensaje: "Texto del mensaje",
  fecha: Timestamp,
  leido: false
}
```

#### `conversacionesClientes`
```javascript
{
  clienteId: "user123",
  clienteNombre: "Juan Pérez",
  ultimoMensaje: "Hola",
  fechaUltimoMensaje: Timestamp,
  mensajesNoLeidos: 2
}
```

#### `movimientos_inventario`
```javascript
{
  productoId: "cafe-bourbon",
  productoNombre: "Café Bourbon",
  cantidad: 5,
  motivo: "Venta automática",
  fecha: Timestamp
}
```

---

## 🚀 Instalación y Configuración

### 1. Clonar el Repositorio
```bash
git clone https://github.com/tuusuario/cafevaldore.git
cd cafevaldore
```

### 2. Configurar Firebase

#### a) Crear Proyecto en Firebase Console
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto
3. Habilita **Authentication** (Email/Password y Google)
4. Crea una base de datos **Firestore**
5. Configura las reglas de seguridad (ver abajo)

#### b) Obtener Credenciales
1. En Firebase Console: `Project Settings > General`
2. Copia la configuración de Firebase
3. Pégala en `JS/firebaseconfig.js`:

```javascript
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

### 3. Reglas de Seguridad de Firestore

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Usuarios pueden leer/escribir su propio documento
    match /usuarios/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Productos: todos pueden leer, solo admin puede escribir
    match /productos/{productId} {
      allow read: if true;
      allow write: if request.auth != null && 
                     get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.rol == 'admin';
    }
    
    // Inventario: todos pueden leer, solo admin puede escribir
    match /inventario/{inventoryId} {
      allow read: if true;
      allow write: if request.auth != null && 
                     get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.rol == 'admin';
    }
    
    // Pedidos: usuarios pueden leer/crear sus propios pedidos
    match /pedidos/{pedidoId} {
      allow read: if request.auth != null && 
                    (resource.data.uid == request.auth.uid || 
                     get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.rol == 'admin');
      allow create: if request.auth != null;
    }
    
    // Mensajes de contacto
    match /mensajesContacto/{messageId} {
      allow create: if true;
      allow read, update: if request.auth != null && 
                            get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.rol == 'admin';
    }
  }
}
```

### 4. Crear Usuario Administrador

Después de registrar tu primer usuario, ejecuta esto en la consola de Firestore:

```javascript
// En Firestore Console, agrega un documento en la colección 'usuarios'
{
  email: "admin@cafevaldore.com",
  rol: "admin",
  createdAt: [timestamp actual]
}
```

### 5. Inicializar Productos e Inventario

Usa el panel de administración o ejecuta este script en la consola:

```javascript
// Crear productos
await addDoc(collection(db, "productos"), {
  id: "cafe-bourbon",
  nombre: "Bourbon Rosado 500g",
  precio: 50000,
  imagen: "bourbon.webp",
  descripcion: "Café de tueste medio..."
});

// Crear inventario
await setDoc(doc(db, "inventario", "cafe-bourbon"), {
  stock: 100,
  stockMinimo: 10,
  stockMaximo: 500,
  activo: true
});
```

### 6. Ejecutar Localmente

```bash
# Opción 1: Usar Python
python -m http.server 5500

# Opción 2: Usar Node.js
npx http-server -p 5500

# Opción 3: Usar PHP
php -S localhost:5500

# Opción 4: Usar Live Server (VS Code Extension)
```

Abre tu navegador en `http://localhost:5500`

---

## 📖 Guía de Uso

### Para Clientes

#### 1. Registro e Inicio de Sesión
- Accede a `auth.html`
- Regístrate con email y contraseña o Google
- Inicia sesión para acceder al carrito

#### 2. Comprar Productos
- Navega por el catálogo en `index.html`
- Los badges indican disponibilidad:
  - 🔴 **AGOTADO**: Sin stock
  - 🔥 **ÚLTIMAS UNIDADES**: 1-5 unidades
  - ⚡ **POCAS UNIDADES**: 6-10 unidades
  - ✅ **DISPONIBLE**: Más de 10 unidades
- Haz clic en "Agregar al carrito"
- Verifica tu carrito
- Completa el formulario de pedido
- ¡Listo! Tu pedido se procesará

#### 3. Ver Historial de Pedidos
- Accede a `pedidos.html`
- Visualiza todos tus pedidos anteriores
- Revisa el estado de cada pedido

#### 4. Chat con Soporte
- Usa el botón flotante 💬 en cualquier página
- Chatea directamente con el administrador
- Recibe respuestas en tiempo real

### Para Administradores

#### 1. Acceso al Panel
- Accede a `admin-login.html`
- Inicia sesión con credenciales de admin
- Serás redirigido al panel administrativo

#### 2. Gestión de Pedidos
- Vista completa de todos los pedidos
- Filtra por estado (pendiente, completado)
- Busca pedidos específicos
- Cambia el estado de los pedidos

#### 3. Gestión de Inventario (`admin-inventario.html`)
- **Resumen**: Estadísticas generales
- **Inventario**: Control de stock
  - Editar stock manualmente
  - Activar/desactivar productos
  - Ver última actualización
- **Alertas**: Productos con stock bajo o agotados
- **Movimientos**: Historial completo de cambios
- **Exportar**: Descargar inventario en CSV

#### 4. Sistema de Reducción Automática
- El stock se reduce automáticamente al confirmar pedidos
- Detección inteligente de promociones:
  - **Promoción 1+1**: Reduce 1 Bourbon + 1 Caturra
  - **Súper Promoción 2+2**: Reduce 2 Bourbon + 2 Caturra
- Registro de todos los movimientos

#### 5. Chat Administrativo
- Responde a mensajes de clientes en tiempo real
- Vista de todas las conversaciones activas
- Notificaciones de nuevos mensajes

---

## 🔒 Seguridad

### Características de Seguridad Implementadas

✅ **Content Security Policy (CSP)**
✅ **Validación de entrada en todos los formularios**
✅ **Autenticación con Firebase Auth**
✅ **Reglas de seguridad de Firestore**
✅ **Protección de rutas administrativas**
✅ **Sanitización de datos del usuario**
✅ **HTTPS requerido en producción**

### Recomendaciones

- Cambia las credenciales de Firebase regularmente
- Usa contraseñas fuertes para cuentas admin
- Revisa los logs de Firebase periódicamente
- Mantén actualizado el código y dependencias

---

## 🎨 Personalización

### Colores del Tema
```css
:root {
  --primary: #231a11;      /* Marrón café oscuro */
  --secondary: #DAA520;    /* Dorado */
  --accent: #ffed4e;       /* Amarillo claro */
  --bg: #f7f3ef;          /* Beige claro */
  --text: #333;           /* Gris oscuro */
}
```

### Modificar Productos
Edita los documentos en Firestore o usa el panel de administración.

### Cambiar Imágenes
Reemplaza los archivos en la carpeta `images/` manteniendo los nombres.

---

## 📱 PWA (Progressive Web App)

El sitio funciona como PWA:

✅ Instalable en dispositivos móviles
✅ Funciona offline (caché de recursos)
✅ Notificaciones push (próximamente)
✅ Íconos y splash screens configurados

---

## 🐛 Solución de Problemas

### Los productos no cargan
- Verifica la configuración de Firebase
- Revisa la consola del navegador (F12)
- Asegúrate de que Firestore tenga datos
- Verifica las reglas de seguridad

### El login no funciona
- Confirma que Firebase Auth esté habilitado
- Verifica las credenciales en `firebaseconfig.js`
- Revisa los proveedores habilitados en Firebase Console

### El inventario no se reduce
- Verifica que los IDs de productos coincidan
- Revisa la consola para errores
- Confirma que `admin-inventario.js` esté cargado
- Ejecuta sincronización desde el panel admin

---

## 📈 Roadmap

### Próximas Funcionalidades

- [ ] Pasarela de pago integrada (MercadoPago/Stripe)
- [ ] Sistema de cupones y descuentos
- [ ] Programa de fidelización
- [ ] Notificaciones push
- [ ] App móvil nativa
- [ ] Dashboard de analytics avanzado
- [ ] Sistema de reseñas y calificaciones
- [ ] Blog integrado
- [ ] Múltiples métodos de envío

---

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

---

## 👥 Autor

**Jarol Medina**
- Email: jarolmedina41@gmail.com
- GitHub: [@tuusuario](https://github.com/tuusuario)

---

## 🙏 Agradecimientos

- Firebase por el excelente BaaS
- La comunidad de desarrolladores de JavaScript
- Los caficultores del Huila por el mejor café del mundo ☕

---

## 📞 Soporte

¿Necesitas ayuda? Contáctanos:

- 📧 Email: jarolmedina41@gmail.com
- 💬 Chat en vivo: Disponible en el sitio web
- 📱 WhatsApp: [Tu número]

---

<div align="center">

**Hecho con ❤️ y ☕ en Huila, Colombia**

[Sitio Web](https://cafevaldore.com) • [Documentación](https://docs.cafevaldore.com) • [Soporte](mailto:jarolmedina41@gmail.com)

</div>