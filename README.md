# Caselli's Pets — Test de Bienestar Articular

App + servidor para Caselli's Pets: un test de 8 preguntas que evalúa movilidad, dolor, actividad física y calidad de vida de un perro, entrega un resultado animado, y guarda cada test realizado para que el negocio pueda verlos en un panel de administración.

## Contenido
- `public/index.html` — la app del test que completan los clientes.
- `public/admin.html` — panel de administración (protegido con clave) para ver todos los tests guardados.
- `server.js` — servidor Node/Express: recibe cada test y lo guarda, y sirve el panel de admin.
- PostgreSQL — almacenamiento persistente en producción.
- `data/registros.json` — respaldo local para desarrollo cuando no existe `DATABASE_URL`.
- `config.example.json` — ejemplo de configuración local. La clave real no se sube al repositorio.

## Cómo correrlo

1. Instalar [Node.js](https://nodejs.org/) (versión 18 o superior) si aún no lo tienes.
2. Abrir una terminal en esta carpeta.
3. Instalar las dependencias (solo la primera vez):
   ```
   npm install
   ```
4. Iniciar el servidor:
   ```
   npm start
   ```
5. Abrir en el navegador:
   - Test: `http://localhost:3000`
   - Panel de administración: `http://localhost:3000/admin.html`

Cada test que se completa se guarda automáticamente en PostgreSQL y aparece en el panel de admin. En desarrollo local, si no se define `DATABASE_URL`, se utiliza `data/registros.json`.

## Configurar la clave del panel de administración
En producción, crear la variable de entorno `ADMIN_PASSWORD` desde el panel del hosting. Para desarrollo local también se puede copiar `config.example.json` como `config.json` y cambiar `adminPassword`. `config.json` está excluido de Git para que la clave real no se publique.

## Publicarlo en internet (para que funcione con un link o QR desde redes)

Mientras el servidor corre solo en una PC local (`localhost`), únicamente esa PC puede usarlo. Para que cualquier persona pueda entrar desde un link o escaneando un QR (por ejemplo compartido en redes sociales), hay que publicarlo en un hosting con una URL pública. La opción gratuita más simple es **Render**:

1. Subir esta carpeta a un repositorio de GitHub (ver más abajo).
2. Crear una cuenta gratis en [render.com](https://render.com) y conectarla con GitHub.
3. Crear un **New Web Service** apuntando a ese repositorio.
   - Build command: `npm ci`
   - Start command: `npm start`
   - Variable de entorno obligatoria: `ADMIN_PASSWORD` con una clave segura.
4. Render va a dar una URL pública fija, por ejemplo `https://caselli-pets.onrender.com`.
5. Generar un código QR con esa URL (por ejemplo en [qr-code-generator.com](https://www.qr-code-generator.com/)) para imprimir o compartir.

## Conectar el dominio propio
Cuando el servicio ya esté publicado en Render:

1. Abrir el servicio en Render y entrar a **Settings > Custom Domains**.
2. Elegir **Add Custom Domain** y escribir el dominio o subdominio que se utilizará.
3. Copiar exactamente los registros DNS que muestre Render en el proveedor donde está registrado el dominio.
4. Volver a Render y pulsar **Verify**.

Render configura y renueva automáticamente el certificado HTTPS. No conviene inventar los registros DNS antes de crear el servicio: deben copiarse los valores concretos que Render indique para ese dominio. Documentación oficial: https://render.com/docs/custom-domains

En producción se debe definir `DATABASE_URL`. Render puede inyectarla automáticamente desde una base PostgreSQL vinculada. El archivo JSON queda únicamente como alternativa de desarrollo local.

## Subir a GitHub
```
git init
git add .
git commit -m "Primera versión del test con servidor y panel admin"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```
(Reemplazar la URL por la del repositorio real una vez creado en GitHub.)

No subir `node_modules`, `data/registros.json`, `.env` ni `config.json`. Ya están contemplados en `.gitignore`.

## Paleta de marca
| Color | Hex | Uso |
|---|---|---|
| Verde (principal) | `#106B3A` | 25% |
| Naranja (acento cálido) | `#F36B32` | 15% |
| Amarillo (acento luz) | `#FFD45A` | 10% |
| Verde claro (acento natural) | `#A7C77C` | 8% |
| Fucsia (acento emocional, uso mínimo) | `#FF2D8F` | 2% |
| Crema (fondo) | `#FFF5DF` | 40% |

## Pendiente para integrarlo al sitio
- Conectar el botón **"Solicitar evaluación en Caselli's Pets"** a un número de WhatsApp, formulario de turnos o link real.
