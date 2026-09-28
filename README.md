# Inmortal Club

Sistema de gestión de socios, cuotas y finanzas. El proyecto contiene el backend original y un frontend administrativo en React + TypeScript.

## Publicar en Render

El archivo `render.yaml` de esta carpeta crea un **servicio web** (React + API en el mismo dominio) y una base PostgreSQL. El servicio aplica las migraciones antes de iniciar y crea el administrador inicial solo si el email aún no existe. No copia los datos de tu PostgreSQL local.

1. Creá un repositorio en GitHub y subí **el contenido de la carpeta `InmortalClub` a la raíz** (de modo que `render.yaml`, `backend` y `frontend` queden en el primer nivel). No subas archivos `.env`, `node_modules` ni `dist`.
2. En [Render](https://dashboard.render.com/), elegí **New → Blueprint**, conectá ese repositorio y revisá los recursos antes de confirmar.
3. Cuando Render solicite las variables, completá `ADMIN_EMAIL` (por ejemplo, tu correo de administración) y una `ADMIN_PASSWORD` nueva de al menos 6 caracteres. `DATABASE_URL` y `JWT_SECRET` se configuran automáticamente en el Blueprint. No agregues `VITE_API_URL`: React llamará a `/api` en el mismo dominio.
4. Esperá a que el despliegue termine. Abrí la URL del servicio y probá `/health` y el inicio de sesión. Si tenías datos en tu base local, tendrás que importarlos aparte; crear una base nueva en Render empieza con tablas vacías, salvo la cuenta administradora.

**Antes de usarlo con datos reales:** el Blueprint usa el plan gratuito para empezar. Render indica que su PostgreSQL gratuito caduca a los 30 días; elegí un plan de base de datos pago para conservar datos operativos, o cambiá `databases[0].plan` en `render.yaml` antes de crear el Blueprint. El servidor gratuito también puede suspenderse por inactividad.

Si el despliegue falla, revisá el log del servicio: el comando de compilación instala dependencias, genera Prisma y construye backend y frontend; el comando de inicio aplica migraciones y crea el administrador inicial. Los usuarios, socios y movimientos de tu base local no se transfieren al publicar el código.

## Requisitos

- Node.js 20 o superior
- PostgreSQL
- Backend configurado según `backend/.env`

## Iniciar el backend

```bash
cd backend
npm install
npm run dev
```

El backend usa por defecto `http://localhost:3000` y documenta la API en `http://localhost:3000/api-docs`.

## Iniciar el frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Abrir `http://localhost:5173`.

La variable `VITE_API_URL` permite apuntar el frontend a otra URL del backend:

```env
VITE_API_URL=http://localhost:3000/api
```

## Funcionalidades del frontend

- Inicio de sesión y sesión persistente con JWT.
- Dashboard de socios, ingresos, balance, pagos recientes y vencimientos.
- Alta, búsqueda, detalle, baja y reactivación de socios.
- Primer pago automático al registrar un socio.
- Registro de pagos, renovación de cuotas y alertas de vencimiento.
- Gestión de ingresos y egresos con resumen por período.
- Creación de categorías de ingresos y egresos desde Finanzas para administradores; el formulario avisa cuando todavía no hay categorías disponibles.
- Administración de planes y visualización de beneficios.
- Auditoría exclusiva para administradores.
- Alta de usuarios administradores y recepcionistas desde **Usuarios** (solo administradores), con listado y registro de la creación en auditoría.
- Cambio de contraseña.
- Diseño responsive para escritorio, tablet y celular.

## Roles

- `ADMIN`: acceso completo, edición de planes y auditoría.
- `RECEPTIONIST`: operación diaria de socios, pagos y finanzas.

Para crear un acceso, ingresá con una cuenta `ADMIN`, abrí **Usuarios → Nuevo usuario**, completá nombre, email, rol y contraseña. La cuenta nueva ya puede iniciar sesión. No confundas esta sección con **Socios**, que sigue igual.

Si no existe ninguna cuenta administradora en la base configurada, completá `ADMIN_EMAIL` y `ADMIN_PASSWORD` en `backend/.env` y ejecutá `cd backend && npm run admin:bootstrap`. Este comando solo crea esa cuenta si falta; no cambia su contraseña si ya existe y no modifica socios ni planes. Un error de credenciales desde la primera búsqueda indica que el email no figura en la base a la que apunta `DATABASE_URL`.

API: `GET /api/auth/users` lista las cuentas y `POST /api/auth/register` acepta `name`, `email`, `password` y `roleName` (`ADMIN` o `RECEPTIONIST`). Ambas rutas requieren el token de un administrador. Los roles deben existir en la base; el seed del backend los crea si falta alguno.

## Actualización Inmortal Club

- Finanzas: `GET /api/financial/periods?date=2026-09-16T03:00:00.000Z&timezoneOffsetMinutes=180` devuelve resúmenes de la semana (lunes a domingo), del mes y del año calendario. Admite `categoryId=<uuid>` para movimientos manuales y `categoryId=MEMBERSHIP` para cuotas. La pantalla también conserva el filtro por rango libre de fechas y permite elegir una categoría en cualquiera de las vistas.
- Beneficios: `POST /api/benefits` (rol ADMIN) recibe `name`, `description` opcional, `discountPercentage` (mayor a 0 y hasta 100) y `onlyFullPass` booleano. Los nuevos beneficios son de tipo `CUSTOM` y aparecen en el alta de socios.
- Aplicá las migraciones antes de iniciar el backend: `cd backend && npx prisma migrate deploy && npx prisma generate`. La migración nueva permite varios beneficios personalizados.
- Identidad visual: el panel usa negro, rojo `#E10818`, gris `#575756` y Manrope. El logo oficial se incluye en `frontend/src/assets/logo-inmortal-club.png` y se muestra en el login de escritorio y móvil.
- Instalá dependencias con `npm ci` en `backend` y `frontend` si abrís esta copia sin `node_modules`. Conservá tu archivo `.env` original; no se incluye en la entrega.

## Ajustes de interfaz (septiembre de 2026)

- Finanzas: en **Rango libre**, pulsá la fecha o el botón con calendario de **Desde** y **Hasta**. El resumen y los movimientos se actualizan automáticamente al elegir la fecha; las vistas semanal, mensual y anual tienen su propia fecha de referencia. Si adelantás «Desde» más allá de «Hasta», esta última se ajusta al mismo día.
- Los selectores nativos de fecha usan el tema oscuro y mantienen visible su icono. El filtro de categoría funciona junto con la fecha elegida.
- En teléfonos, las tablas de Socios, Pagos y Resumen muestran cada registro como una ficha con etiquetas; también se ajustaron filtros, tarjetas, navegación lateral, perfil, inicio de sesión y formularios. En tablet se reducen las columnas de panel y planes.
- Verificación: `cd frontend && npm ci && npm run build`. Para probar datos reales hace falta iniciar el backend con PostgreSQL y tus variables de entorno locales.
