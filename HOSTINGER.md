# InmortalClub en Hostinger con MySQL/MariaDB

Esta variante usa MySQL/MariaDB, no PostgreSQL. Se preparó sobre production 556ace9. Trabajar primero en una rama hostinger-mariadb; no mezclarla con production mientras Render siga desplegando automáticamente contra PostgreSQL.

## 1. Conservar la fuente

Respaldar la base actual de Render (pg_dump de PostgreSQL 18, formato custom) y conservar la aplicación anterior. No borrar Render ni reimportar el Excel: el traslado incluye las diez tablas del sistema, pagos, usuarios con sus hashes y auditoría. El exportador también crea una copia consistente de todas las tablas de negocio, sin escribir en Render. Si Render ya expiró, hay que recuperar acceso antes de exportar.

## 2. Base vacía en Hostinger

hPanel → Sitios web → Administrar → Bases de datos → Administración. Crear base MySQL y usuario con contraseña, sin tablas ni seed. Anotar los nombres completos, incluido el prefijo de cuenta. Para trabajar desde la PC, habilitar acceso remoto solo para su IP y usar el hostname remoto indicado por Hostinger. En el proceso Node alojado en Hostinger usar el host que indique el panel (127.0.0.1 para Node.js). No reutilizar una base de otro sitio.

## 3. Preparar la rama en la PC

Aplicar el parche en una rama nueva creada desde production, sin cambios pendientes. Desde backend:

```bash
npm ci
npx prisma generate --config prisma7.config.ts
npm test
```

Antes de estos comandos configurar backend/.env (ignorado por Git):

```dotenv
DATABASE_URL="mysql://USUARIO:CLAVE_CODIFICADA@HOST_REMOTO:3306/BASE"
SOURCE_DATABASE_URL="URL_EXTERNA_POSTGRESQL_RENDER_CON_SSL"
JWT_SECRET="EL_SECRETO_DEL_SISTEMA"
```

Los caracteres especiales del usuario o clave en una URL deben codificarse (por ejemplo @ → %40). No publicar .env ni los respaldos. El runtime MySQL fija UTC y un pool de cinco conexiones. La búsqueda de socios usa la colación utf8mb4_unicode_ci de MySQL para ignorar mayúsculas y acentos.

## 4. Crear tablas e importar una copia de prueba

Desde backend, con DATABASE_URL apuntando exclusivamente a la nueva base MySQL vacía:

```bash
npm run db:deploy
npm run database:transfer -- export "C:/Users/Ariana/Downloads/InmortalClub-prueba.transfer.json"
npm run database:transfer -- import "C:/Users/Ariana/Downloads/InmortalClub-prueba.transfer.json"
npm run database:transfer -- import "C:/Users/Ariana/Downloads/InmortalClub-prueba.transfer.json" --apply
npm run database:transfer -- verify "C:/Users/Ariana/Downloads/InmortalClub-prueba.transfer.json"
```

Sin --apply, import solo valida el archivo y comprueba que el destino esté vacío. Con --apply, inserta en una transacción, compara todos los campos de todas las filas y confirma únicamente si coinciden. Ante un error revierte todo. Rechaza bases con registros y respaldos alterados o con otro esquema. No usar seed ni admin:bootstrap: las cuentas y los roles se trasladan. Conservar los archivos fuera del repositorio, pues contienen información personal y hashes de contraseñas.

Las migraciones PostgreSQL originales se conservan en prisma/migrations como referencia. Prisma usa ahora prisma/migrations-mysql. Nunca aplicar el SQL de PostgreSQL a MySQL.

## 5. Probar antes del cambio definitivo

Arrancar backend y frontend en desarrollo contra la copia MySQL. Probar login admin/recepción, búsqueda con acentos y mayúsculas, edición de socios, cuotas, pago mixto, vencimientos, proporcional, beneficios y finanzas. Comparar totales y fechas con Render. Las pruebas automáticas con persistencia simulada no sustituyen estas pruebas con MySQL real.

## 6. Corte definitivo

Acordar una pausa de carga con el club: nadie debe agregar pagos o socios en Render durante el corte. Exportar nuevamente a otro archivo y migrar a OTRA base MySQL vacía (la base de prueba contiene cambios de prueba y el importador la rechazará). Verificar todos los registros. Si falla, Render sigue siendo la fuente y se retoma su uso; al reintentar se necesita otro snapshot final después de detener las escrituras.

Subir la rama de migración y seleccionarla en Hostinger. Configuración: Express, Node 22.x, raíz ./, build npm run build, salida dist, entrada app.cjs, inicio npm start. Variables: NODE_ENV=production, PORT=3000, DATABASE_URL de MySQL en Hostinger (host 127.0.0.1), JWT_SECRET seguro y JWT_EXPIRES_IN=7d. No cargar SOURCE_DATABASE_URL en Hostinger. El build solo compila y empaqueta, no migra ni modifica bases.

Probar la URL de Hostinger con los usuarios existentes y verificar socios, historial de pagos, fechas e importes antes de reabrir la carga. El health check solo comprueba el proceso, no la conexión a la base. Anunciar una única URL al club para evitar escrituras divididas.

Conservar Render y un respaldo recuperable hasta que el cliente confirme que todo está correcto. Antes de cancelar, activar y comprobar las copias de seguridad de Hostinger y descargar un respaldo del destino. Solo entonces cancelar la base antigua y el servicio de Render, comprobando cuál contiene los datos. No borrar datos como parte de este parche. La consolidación de ramas y render.yaml se realiza después del corte para no desplegar código MySQL sobre la base PostgreSQL antigua.

## Validación de esta entrega

Backend y frontend compilan; 25 pruebas automáticas pasan. En MariaDB 10.11 local se aplicó la migración y se importó una muestra sintética de las diez tablas; se verificaron todos sus campos, decimales, fechas UTC, JSON, notas extensas y búsqueda por mayúsculas/acentos. La simulación no escribe, repetir la importación se rechaza y un fallo de clave foránea revierte incluso las filas ya insertadas. Se comprobó el empaquetado Hostinger. Estas pruebas no usaron credenciales ni datos reales del cliente. Quedan pendientes el respaldo/exportación de Render, la importación en Hostinger y las pruebas funcionales con la copia real antes del corte.

## Recuperar socios dados de baja

La lista de socios solicita también los inactivos al backend. Sin texto en el buscador muestra los activos; al buscar nombre, DNI o email también aparecen las bajas, identificadas como Inactivo. La búsqueda ignora acentos y mayúsculas. Abrir el detalle y pulsar Reactivar socio conserva el ID, los datos y todo el historial; no genera pagos ni cambia vencimientos. Se conserva el botón de reactivación y se retira la acción Dar de baja del detalle. Los contadores distinguen activos/inactivos y calculan beneficios/vencimientos sobre activos.

Verificado con las 25 pruebas existentes, compilación de ambos proyectos y pruebas manuales de búsqueda. Prueba con MariaDB 10.11 local: la lista normal excluye una baja, includeInactive la recupera, la activación guarda ACTIVE y auditoría sin cambiar ningún campo de los pagos existentes. No requiere otra migración ni repetir la importación.

## Uso diario sin límite de solicitudes en la aplicación

Se retira el middleware global que bloqueaba toda la API al alcanzar 100 solicitudes por IP en 15 minutos. La aplicación no instala ningún límite de cantidad de solicitudes, tampoco en login; mantiene autenticación, permisos y validación. Esto elimina el bloqueo por contador de la aplicación; los recursos y límites del proveedor de hosting son independientes.

El frontend diferencia respuestas 429, fallos temporales HTTP 5xx y problemas de conexión. Si una escritura falla sin una respuesta JSON válida, indica que se revise el registro antes de repetirla; no reintenta automáticamente pagos ni otros cambios. Una respuesta HTML de error no borra la sesión como si fuera un token inválido.

Validación: compilan backend y frontend; pasan las 25 pruebas existentes y tres nuevas pruebas del lector de respuestas. Prueba HTTP local contra el servidor real: 150 consultas, 150 envíos de login inválido y 150 altas sin token desde la misma IP; no hay respuestas 429 y se mantienen los errores de validación/autenticación. Las pruebas no conectan ni modifican bases reales. Revisión pública del 22/10/2026: /health respondió 200 y /api/plans sin token respondió 401 JSON; esto no confirma retrospectivamente el estado durante las capturas del 21/10. Ante una recurrencia, registrar el estado HTTP de la solicitud fallida y los logs de runtime de esa hora para distinguir un fallo del proveedor o de la base.

## Gestión de beneficios en MySQL

En Planes → Beneficios, administración puede editar nombre, descripción, porcentaje y aplicación a Full Pass; desactivar/reactivar beneficios; y eliminar únicamente beneficios sin socios ni pagos asociados (incluyendo asociaciones históricas). Las mutaciones requieren rol ADMIN en la API y registran auditoría. Las ediciones y eliminaciones se confirman en transacción con su auditoría.

Los beneficios desactivados quedan fuera de la selección y de nuevas renovaciones. Editar un socio con un beneficio globalmente inactivo no impide corregir sus datos. Cambiar el descuento no recalcula los importes de pagos anteriores. La reactivación vuelve a habilitar el beneficio para su asignación; revisar el beneficio elegido antes de registrar una nueva cuota. No hay cambios de esquema, de conexión MySQL ni en el retiro del límite de solicitudes.

Validación: 28 pruebas backend (incluyen permisos HTTP y los nuevos casos de beneficios) y tres pruebas frontend, compilación de ambos proyectos. Prueba adicional con MariaDB 10.11 aislada: creación, edición, desactivación/reactivación, eliminación sin uso, rechazo de eliminación con historial, renovación sin descuento inactivo, cobro con porcentaje actualizado, conservación de todos los campos de un pago anterior, edición de socio con beneficio desactivado y reversión de la edición si falla la auditoría. Sin conexiones ni cambios a bases del cliente.


## Diagnóstico de conexión en el arranque

Al iniciar el backend, una conexión directa con tiempo de espera de cinco segundos ejecuta únicamente SELECT 1. Registra [MYSQL_OK] o [MYSQL_ERROR_CONEXION] con host, puerto, base, usuario, presencia de contraseña y código/errno/sqlState originales del driver. No registra la URL, contraseña ni el mensaje crudo del error. La conexión se cierra después del diagnóstico; no se crean endpoints públicos, no se cambian credenciales ni tablas y no se reintentan escrituras. El pool de Prisma conserva su configuración.

Ante un pool timeout con active=0 e idle=0, revisar este registro en Hostinger → Registros de runtime del nuevo despliegue. El objetivo es obtener el motivo real, no aumentar el pool ni afirmar que las credenciales son incorrectas sin evidencia. Para Node alojado en Hostinger, usar 127.0.0.1:3306; para conexiones desde la PC, usar el hostname remoto del panel y autorizar su IP.
