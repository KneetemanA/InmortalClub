export function databaseErrorDetails(error: unknown) {
  const source = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const code = typeof source.code === 'string' && /^[A-Z0-9_]+$/.test(source.code) ? source.code : 'UNKNOWN';
  const errno = typeof source.errno === 'number' ? source.errno : undefined;
  const sqlState = typeof source.sqlState === 'string' && /^[A-Z0-9]{5}$/.test(source.sqlState) ? source.sqlState : undefined;
  const reasons: Record<string, string> = {
    ER_ACCESS_DENIED_ERROR: 'MySQL rechazó la autenticación. Revisar usuario, contraseña y origen autorizado.',
    ER_DBACCESS_DENIED_ERROR: 'El usuario no tiene acceso a la base seleccionada.',
    ER_BAD_DB_ERROR: 'La base indicada no existe en este servidor.',
    ER_HOST_NOT_PRIVILEGED: 'MySQL no autoriza conexiones desde este origen.',
    ECONNREFUSED: 'El host o puerto rechazó la conexión.',
    ETIMEDOUT: 'La conexión al servidor agotó el tiempo de espera.',
    ER_CONNECTION_TIMEOUT: 'La conexión al servidor agotó el tiempo de espera.',
    ENOTFOUND: 'No se pudo resolver el nombre del servidor.',
    ER_CON_COUNT_ERROR: 'El servidor MySQL alcanzó su límite de conexiones.',
    ER_TOO_MANY_USER_CONNECTIONS: 'El usuario MySQL alcanzó su límite de conexiones.',
  };
  return { code, errno, sqlState, reason: reasons[code] || 'Consultar el código original de MySQL en este diagnóstico.' };
}
