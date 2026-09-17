import { useCallback, useEffect, useState } from 'react';
import { FileClock, Filter } from 'lucide-react';
import { api, date } from '../api';
import type { AuditLog } from '../types';
import { Empty, ErrorState, Loading } from '../components';


export default function Audit() {
    const [logs, setLogs] = useState<AuditLog[]>();
    const [entity, setEntity] = useState('');
    const [action, setAction] = useState('');
    const [error, setError] = useState('');
    const load = useCallback(() => {
        const q = new URLSearchParams({ limit: '50' });
        if (entity) q.set('entity', entity);
        if (action) q.set('action', action);
        setError('');

        api<AuditLog[]>(`/audit?${q}`).then(r => setLogs(r.data)).catch(e => setError(e.message))
    }, [entity, action]);
    useEffect(load, [load]); if (error) return <ErrorState message={error} retry={load} />;
    if (!logs) return <Loading />; return <div className="stack">

        <div className="toolbar">
            <div className="filter-title"><Filter />Filtrar registro</div>
            <div className="filter-group">
                <select value={entity} onChange={e => setEntity(e.target.value)}>
                    <option value="">Todas las entidades</option>
                    <option value="MEMBER">Socios</option>
                    <option value="PAYMENT">Pagos</option>
                    <option value="PLAN">Planes</option>
                    <option value="FINANCIAL_MOVEMENT">Finanzas</option>
                </select>

                <select
                    value={action}
                    onChange={e => setAction(e.target.value)}>
                    <option value="">Todas las acciones</option>
                    <option value="CREATE">Creación</option>
                    <option value="UPDATE">Actualización</option>
                    <option value="CANCEL">Cancelación</option>
                    <option value="DELETE">Eliminación</option>
                </select>
            </div>
        </div>

        <div className="card audit-list">
            {logs.map(l =>
                <div className="audit-item"
                    key={l.id}>
                    <div className={`audit-icon ${l.action.toLowerCase()}`}>
                        <FileClock />
                    </div>

                    <div className="grow">
                        <div>
                            <span className="tag">
                                {l.action}
                            </span>
                            <b>{entityLabel(l.entity)}</b>
                        </div>
                        <p>ID de registro: {l.entityId.slice(0, 8)}…</p>
                    </div><div className="audit-user">
                        <b>{l.user.name}</b>
                        <span>
                            {date(l.createdAt)}
                        </span>
                    </div>
                </div>)}

            {!logs.length && <Empty title="Sin actividad" text="No hay acciones que coincidan con los filtros." />}
        </div>
    </div>
}

function entityLabel(v: string) {
    return ({
        MEMBER: 'Socio',
        PAYMENT: 'Pago',
        PLAN: 'Plan',
        FINANCIAL_MOVEMENT: 'Movimiento financiero',
        FINANCIAL_CATEGORY: 'Categoría'
    } as Record<string, string>)[v] || v
}
