# Despliegue en Hostinger

La raíz del repositorio contiene package.json y app.cjs para que Hostinger detecte Express. Seleccionar rama production, Node 22.x y directorio raíz del repositorio (./), no backend. Build: npm run build. Directorio de salida: dist. Archivo de entrada: app.cjs (dentro de dist). Inicio si se solicita: npm start.

El build instala dependencias, genera Prisma Client y compila backend y frontend. Empaqueta ambos con las dependencias del backend en dist, conservando las rutas que usa Express para servir React. No incluye archivos .env. No ejecuta seed, bootstrap ni migraciones contra la base de producción. Render continúa usando los comandos de render.yaml sin cambios.

Configurar NODE_ENV=production, PORT=3000, DATABASE_URL con la External Database URL de la base actual de Render y sslmode=verify-full, JWT_SECRET con un secreto largo y JWT_EXPIRES_IN=7d. Las variables de base y JWT solo se utilizan en backend; no usar prefijos VITE_ para secretos. No colocar localhost ni Internal Database URL de Render. Si la URL ya tiene parámetros, añadir SSL con &; de lo contrario con ?. Si ya tiene sslmode, reemplazar su valor.

Antes del primer deploy, conservar un respaldo reciente de la base actual. Verificar /health, login, listado de socios, pagos y resumen financiero desde la URL temporal de Hostinger. Mantener el servicio anterior disponible hasta verificar el nuevo y luego comunicar al equipo cuál URL usar. Nunca importar de nuevo el Excel para trasladar pagos. Si aparecen migraciones nuevas, respaldar y aplicar prisma migrate deploy de manera controlada antes de usar funcionalidades que dependan de ellas.
