# Mejoras de InmortalClub: probar antes de producción

Esta versión parte de `production` (commit `cb831c7`). Trabajamos en una rama nueva porque la rama remota `developer` tenía un historial distinto. No se desplegó en Render.

Si ya aplicaste la primera entrega (`5bf273e`), permanecé en esa rama y aplicá solamente `InmortalClub-permisos.patch` con `git am ~/Downloads/InmortalClub-permisos.patch`. El parche completo `InmortalClub-developer.patch` incluye ambas entregas y se aplica desde production como se indica abajo.

## Aplicar los cambios en tu computadora

Descargá `InmortalClub-developer.patch` a Descargas. Desde Git Bash, en la carpeta del proyecto y con tus cambios locales guardados:

```bash
git fetch origin production
git switch -c developer-inmortalclub origin/production
git am ~/Downloads/InmortalClub-developer.patch
```

Si esa rama ya existe, elegí otro nombre para la rama nueva. Si `git am` indica un conflicto, detenete y revisalo antes de continuar.

## Base de desarrollo

Creá en PostgreSQL/pgAdmin una base vacía llamada `inmortalclub_developer`. Usá exclusivamente esa base para estas pruebas.

En `backend/.env`, configurá tu conexión local (reemplazá usuario y contraseña) y una cuenta de prueba:

```dotenv
DATABASE_URL=postgresql://postgres:TU_CLAVE_LOCAL@localhost:5432/inmortalclub_developer
PORT=3000
JWT_SECRET=una-clave-larga-distinta-para-desarrollo
ADMIN_EMAIL=admin@inmortal.test
ADMIN_PASSWORD=una-clave-de-prueba
ADMIN_NAME=Administrador de prueba
PLAN_2VECES_PRICE=49000
PLAN_3VECES_PRICE=50000
PLAN_FULL_PRICE=55000
```

No reemplaces variables de Render. Estos comandos preparan la base indicada por tu archivo local:

```bash
cd backend
npm ci
npx prisma generate
npx prisma migrate deploy
npm run seed
npm test
npm run dev
```

`seed` crea roles, planes, beneficios, categorías y administrador. También actualiza precios de planes existentes según las variables anteriores; ejecutalo en la base de desarrollo. No uses el seed para promover esta versión a producción.

En otra terminal:

```bash
cd frontend
npm ci
npm run dev
```

Abrí la dirección que muestra Vite e ingresá con la cuenta de prueba. El frontend de desarrollo usa `http://localhost:3000/api`; si existe `frontend/.env` con `VITE_API_URL`, verificá que apunte al backend local.

## Comportamiento agregado

- Permisos: solo administrador puede editar vencimientos, cancelar o eliminar pagos. El recepcionista ve únicamente Socios y Pagos y cuotas; mantiene altas, edición de socios, cobros y renovaciones. Resumen, Finanzas, Planes, Usuarios, Auditoría y Mi cuenta están reservados al administrador. Los listados de planes y beneficios siguen disponibles como datos de los formularios, sin acceso a su administración.
- Eliminar pago: exclusivo del administrador, con confirmación. Quita el pago del historial y de los totales; eliminación y registro de auditoría son una única transacción. No necesita otra migración.
- Pagos y cuotas: editar vencimiento de un pago registrado, y elegir vencimiento al renovar. El cambio queda auditado. Un pago cancelado no se puede editar.
- Socios: click en la fila o en su botón de detalle → **Editar datos**. Incluye DNI, nombre, apellido, teléfono, email, nacimiento y notas. Se pueden borrar email y nacimiento. Un DNI repetido se rechaza.
- Recepcionistas: el registro crea el rol si falta. El arranque también prepara el rol; crear usuarios sigue siendo una acción exclusiva del administrador.
- Pagos: efectivo, transferencia o efectivo + transferencia. En el combinado se ingresa efectivo y el sistema calcula la transferencia restante. Ambos importes quedan guardados. Los pagos anteriores se conservan y la migración completa su desglose.
- Primer mes: alta después del día 15 permite marcar **Cobrar proporcional hasta fin de mes**. Fórmula: precio mensual con el beneficio aplicable ÷ días reales del mes × días restantes, incluyendo el día de inscripción. Se redondea a centavos. El vencimiento predeterminado es el último día del mes; se puede indicar otro.
- Sin renovar: cantidad y listado por mes de socios activos con pagos anteriores que no registraron un pago durante el mes elegido. Es una medición por mes calendario; el vencimiento de cada cuota se muestra por separado.
- Modales: se muestran sobre toda la página, tienen desplazamiento y botones inferiores accesibles en pantallas bajas.

Precios iniciales: 2 veces por semana $49.000; 3 veces $50.000; Full Pass $55.000. En una base existente se mantienen los precios cargados hasta editarlos desde Planes. La condición de descuento del cartel del día 1 al 10 no está incluida: se mantiene el comportamiento de beneficios existente.

## Prueba manual en desarrollo

1. Crear un recepcionista desde administrador. Cerrar sesión e ingresar con ese usuario. Verificar que solo vea Socios y Pagos y cuotas y que las URL directas de otras pantallas lo redirijan a Socios. Verificar que no aparezcan Editar vencimiento ni Eliminar. Los intentos directos a la API de eliminar, editar, cancelar, finanzas y dashboard deben devolver 403.
2. Registrar un socio con cada método de pago. Para Full Pass combinado, ingresar $20.000 de efectivo: la transferencia debe ser $35.000.
3. Después del día 15, registrar un proporcional: Full Pass sin beneficio el 16 de septiembre debe dar $27.500; el 30, $1.833,33. Con beneficio del 10%, el 16 da $24.750. El vencimiento debe ser 30 de septiembre.
4. Editar datos de ese socio, recargar y comprobar que persisten. Probar borrar email/nacimiento y rechazar un DNI que ya pertenezca a otro socio.
5. Editar un vencimiento desde el historial, recargar y comprobar el cambio y su auditoría. Renovar con vencimiento elegido y pago combinado.
6. Seleccionar un mes en **Sin renovar**, comprobar listado y cantidad. Un socio nuevo en ese mes no debe aparecer; uno con pagos anteriores sin pago en ese mes debe aparecer. La cuota puede seguir vigente: revisar la fecha que muestra la lista.
7. A 1440 × 900 y zoom 100%, abrir alta, edición, detalle con muchos pagos, renovación, vencimiento y creación de usuarios. Desplazarse hasta abajo y verificar acceso a guardar/cancelar/cerrar. Repetir con zoom 125%.
8. Como administrador, cancelar la confirmación de eliminación y verificar que el pago siga. Confirmar la eliminación y comprobar historial, totales, vencimiento y auditoría.
9. Revisar totales financieros: un pago combinado suma una sola vez su total. Cancelar un pago y verificar que deje de contar como pagado.

## Validación realizada y pendiente

- Compilación del frontend y backend.
- Validación del esquema Prisma.
- Tests de cálculos, fechas, campos opcionales y servicios con persistencia simulada (`npm test` en backend).
- Pendientes: aplicar la migración en PostgreSQL real, probar los flujos completos y confirmar visualmente los modales a 1440 × 900. No hay PostgreSQL ni navegador instalados en el entorno de trabajo; la descarga del navegador falló.

## Subir la rama de prueba y promover después

Para guardar esta rama en GitHub:

```bash
git push -u origin developer-inmortalclub
```

Solo después de completar la prueba manual, guardar una copia de seguridad de la base operativa y aprobar la versión, integrar la rama en `production`. Render aplicará la nueva migración al desplegar mediante su comando de arranque existente. Esta versión no borra datos; agrega columnas y el método combinado. No ejecutar `migrate reset` ni `seed` sobre la base operativa.

## Importación del padrón

La entrega de importación agrega una nueva migración y un comando para cargar Sep26 sin generar cobros. Seguí [IMPORTAR-SOCIOS.md](IMPORTAR-SOCIOS.md); el archivo JSON con datos personales se entrega por separado.
