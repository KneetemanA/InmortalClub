# Cargar socios de septiembre de 2026

La carga usa únicamente **Sep26** de `Socio Activos.xlsx`: 232 registros. Es una importación del padrón y de sus vencimientos de referencia. **No genera pagos, no asigna planes o beneficios y no suma ingresos a Finanzas.**

## Aplicar este cambio

En la rama `developer-inmortalclub` donde ya aplicaste las dos entregas anteriores, descargá `InmortalClub-importacion.patch` y `Socios-Septiembre-2026.json` en Descargas. Ejecutá desde la carpeta del proyecto:

```bash
git am ~/Downloads/InmortalClub-importacion.patch
cd backend
npx prisma generate
npx prisma migrate deploy
npm test
```

Esto agrega una migración. Antes de ejecutar los comandos, comprobá que `backend/.env` apunte a tu base **de desarrollo**, y que `ADMIN_EMAIL` sea el email del administrador activo de esa base.

## Revisar antes de cargar

Desde `backend`, simulá la carga:

```bash
npm run members:import -- --file "C:/Users/Ariana/Downloads/Socios-Septiembre-2026.json"
```

El comando muestra el servidor/base de destino y un resumen:

- `total`: 232 registros del archivo.
- `wouldCreate`: registros que se crearían.
- `skipped`: registros ya existentes por DNI o por referencia de importación.
- `existingRows`: filas del Excel que se omitieron porque ya existen.

La simulación no modifica datos. Sobre una base sin esos socios, debe mostrar `wouldCreate: 232`. Si hay socios de prueba con el mismo DNI, se omiten y no se sobrescriben: revisá esas filas antes de decidir qué conservar.

## Cargar en desarrollo

```bash
npm run members:import -- --file "C:/Users/Ariana/Downloads/Socios-Septiembre-2026.json" --apply
```

El lote y su auditoría se guardan juntos. Si falla una operación, PostgreSQL revierte el lote. Repetir la carga con el mismo archivo no duplica registros ni sobrescribe datos que el club haya corregido. Conservá la referencia `importKey` del archivo: identifica cada fila aun cuando después se complete o cambie su DNI.

No subas el JSON con datos personales a GitHub. El importador es código; el padrón se descarga y ejecuta por separado.

## Qué queda cargado

- Nombre, apellido, DNI y teléfono cuando existen y son válidos.
- Fecha de nacimiento cuando Excel contiene una fecha válida.
- 230 fechas de vencimiento válidas, guardadas al final del día en Argentina. Las otras 2 quedan pendientes.
- Notas con hoja/fila de origen e incidencias por revisar. Los valores originales y los importes del Excel se conservan como referencia, sin registrarlos como cobros.
- Los 232 socios quedan activos en el padrón. Activo significa miembro del club; la vigencia de su cuota se muestra por separado.

No inventamos DNI ni apellido: 7 DNI quedan vacíos (filas 114, 121, 134, 146, 189, 205, 226); el apellido de la fila 134 queda vacío porque contenía una fecha. También hay 4 teléfonos faltantes y fechas de nacimiento por revisar. Las observaciones permanecen en notas hasta que las revise el club.

La fecha de alta que muestra el sistema es la fecha de carga; el Excel no contiene la inscripción original. Los importados no se cuentan automáticamente como nuevas inscripciones del mes en Resumen.

## Cómo completa los datos el club

1. En **Socios**, click en un socio → **Editar datos**. Completar DNI/teléfono/apellido si faltan, y asignar plan y beneficio. Guardar esto no crea ningún cobro. Los beneficios no son acumulables y los exclusivos de Full Pass se validan contra el plan.
2. El vencimiento del Excel se muestra en Socios y en **Pagos y cuotas → Importados pendientes**. Se usa como referencia de vigencia aunque todavía no exista un pago registrado. Si luego hay una cuota válida con vencimiento posterior, se usa esa fecha. No se asigna automáticamente fecha de pago a partir del vencimiento.
3. Registrar un pago solo cuando se conoce su información real. En **Pagos y cuotas → Registrar pago**, elegir socio, plan y beneficio, e ingresar fecha real e importe realmente cobrado. Para un pago histórico, completar explícitamente el importe: si se deja vacío, se calcula con la tarifa vigente del plan y su beneficio. También verificar el método de pago y el vencimiento.
4. Cuando se elige un socio importado, se propone su plan/beneficio asignado y el vencimiento del Excel. La fecha y el importe del pago siguen pendientes de entrada manual. El importe del Excel no se asume automáticamente, porque existen contradicciones de método de pago.

Un importe manual distinto de la tarifa se guarda como un ajuste separado y queda auditado. Finanzas suma solo el total realmente registrado, en la fecha de pago elegida. Para una renovación se usa el plan y beneficio actuales asignados al socio; si no tiene asignación, se conserva el comportamiento anterior basado en el último pago.

**Sin renovar** sigue midiendo pagos registrados por mes calendario. No deduce la fecha de pago de un vencimiento del Excel; mientras falten esos datos, revisá **Importados pendientes**.

## Comprobar la carga

- Revisar el resumen de creados/omitidos y buscar varios socios por DNI.
- Verificar que el historial de pagos esté vacío para los nuevos importados y que los ingresos de Finanzas no cambien.
- Confirmar las fechas del Excel y que un socio con vencimiento futuro figure vigente, sin cobro inventado.
- Completar un plan/beneficio, recargar y verificar que persista sin generar pago.
- Registrar un pago de prueba con fecha histórica e importe explícito; revisar que Finanzas lo registre en ese período y que el pago conserve el vencimiento indicado.
- Repetir la simulación: los socios recién cargados deben aparecer omitidos.
- Verificar los permisos de administrador/recepcionista y los modales a 1440 × 900.

La compilación y los tests de servicios, permisos, importación y vigencia se verifican en el entorno de trabajo. Sigue pendiente aplicar la migración y probar la importación contra PostgreSQL real en tu computadora.

## Después, producción

Los datos de tu base local no se transfieren a Render al subir código a GitHub. Después de probar esta versión y desplegarla, hay que ejecutar esta misma importación sobre la base de producción, con el administrador de esa base y una copia de seguridad previa. Primero ejecutar la simulación y revisar el destino mostrado; después usar `--apply`.

No ejecutar `seed`, `migrate reset` ni cambiar el JSON para introducir pagos o planes ficticios. El archivo no debe ejecutarse automáticamente en el arranque de Render.
