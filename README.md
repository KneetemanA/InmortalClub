# Inmortal Club

Sistema de gestión de socios, cuotas y finanzas. El proyecto contiene el backend original y un frontend administrativo en React + TypeScript.

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
- Administración de planes y visualización de beneficios.
- Auditoría exclusiva para administradores.
- Cambio de contraseña.
- Diseño responsive para escritorio, tablet y celular.

## Roles

- `ADMIN`: acceso completo, edición de planes y auditoría.
- `RECEPTIONIST`: operación diaria de socios, pagos y finanzas.

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
