import { useCallback, useEffect, useState } from 'react';
import { ArrowDownRight, ArrowRight, ArrowUpRight, BadgeDollarSign, CalendarClock, CircleDollarSign, UserPlus, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, date, money } from '../api';
import type { DashboardData } from '../types';
import { Empty, ErrorState, Loading, Status } from '../components';

export default function Dashboard() {

  const [data, setData] = useState<DashboardData>();
  const [error, setError] = useState('');
  const load = useCallback(() => {
    setError('');

    api<DashboardData>('/dashboard').then(r => setData(r.data)).catch(e => setError(e.message));
  }, []);

  useEffect(load, [load]);
  if (error)
    return <ErrorState message={error} retry={load} />;
  if (!data)
    return <Loading />;

  const s = data.summary, f = data.financial;
  const maxPlan = Math.max(...data.paymentsByPlan.map(p => p.count), 1);
  return <div className="stack">
    <div className="hero-row">
      <div>
        <span className="date-chip">ESTADO DEL MES</span>

        <h2>Todo bajo control.</h2>
        <p>{data.alerts.overdueCount ? `Hay ${data.alerts.overdueCount} cuota${data.alerts.overdueCount === 1 ? '' : 's'} que necesita atención.` : 'No hay vencimientos pendientes para revisar.'}</p>
      </div>

      <Link
        className="btn btn-primary"
        to="/socios">
        <UserPlus />Nuevo socio
      </Link>
    </div>

    <section className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon lime">
          <Users />
        </div>
        <span>Socios activos</span>
        <strong>{s.activeMembers}</strong>
        <small>
          <b>{s.activePercentage}%
          </b>
          del total registrado
        </small>
      </div>

      <div className="stat-card">
        <div className="stat-icon blue">
          <CircleDollarSign />
        </div>
        <span>
          Ingresos del mes
        </span>
        <strong>{money(f.monthlyIncome)}</strong>
        <small>
          <ArrowUpRight />
          {data.recentPayments.length}
          pagos recientes
        </small>
      </div>

      <div className="stat-card">
        <div className="stat-icon orange">
          <CalendarClock />
        </div>
        <span>
          Cuotas vencidas
        </span>
        <strong>
          {data.alerts.overdueCount}
        </strong>

        <small className={data.alerts.overdueCount ? 'warn' : ''}>
          {data.alerts.overdueCount ? 'Requieren seguimiento' : 'Todo al día'}
        </small>
      </div>

      <div className="stat-card">
        <div className="stat-icon violet">
          <UserPlus />
        </div>
        <span>
          Nuevos este mes
        </span>
        <strong>
          {s.newMembersThisMonth}
        </strong>
        <small>
          <ArrowUpRight />
          altas registradas
        </small>
      </div>
    </section>

    <section className="dashboard-grid">
      <div className="card">
        <div className="card-head">
          <div>
            <h3>Ingresos por plan</h3>
            <p>Distribución del mes actual</p>
          </div>
          <BadgeDollarSign />
        </div>

        {data.paymentsByPlan.length ? <div className="plan-bars">{data.paymentsByPlan.map((p, i) =>
          <div className="plan-bar"
            key={p.planName}>
            <div>
              <span>
                <i className={`dot c${i % 4}`} />
                {p.planName}
              </span>
              <b>{p.count} pagos</b>
            </div>

            <div className="bar-track">
              <i className={`c${i % 4}`}
                style={{ width: `${(p.count / maxPlan) * 100}%` }} />
            </div>
            <small>{money(p.total)}</small>
          </div>
        )}
        </div>
          :
          <Empty title="Sin pagos este mes" text="Los ingresos por plan aparecerán acá." />
        }
      </div>

      <div className="card balance-card">
        <div className="card-head">
          <div>
            <h3>Balance mensual</h3>
            <p>Resultado hasta hoy</p>
          </div>
        </div>

        <div className="balance-total">
          <span>BALANCE</span>
          <strong className={f.balance >= 0 ? 'positive' : 'negative'}>
            {money(f.balance)}
          </strong>
        </div>

        <div className="balance-split">
          <div>
            <ArrowUpRight />
            <span>Ingresos</span>
            <b>{money(f.monthlyIncome)}</b>
          </div>

          <div>
            <ArrowDownRight />
            <span>Egresos</span>
            <b>{money(f.monthlyExpense)}</b>
          </div>
        </div>
        <Link to="/finanzas">Ver detalle financiero
          <ArrowRight />
        </Link>
      </div>
    </section>

    <section className="dashboard-grid lower">
      <div className="card table-card">
        <div className="card-head">
          <div>
            <h3>Últimos pagos</h3>
            <p>Movimientos registrados recientemente</p>
          </div>
          <Link to="/pagos">Ver todos
            <ArrowRight />
          </Link>
        </div>
        {data.recentPayments.length ? <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Socio</th>
                <th>Plan</th>
                <th>Fecha</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              {data.recentPayments.slice(0, 6).map(p =>
                <tr
                  key={p.id}>
                  <td data-label="Socio">
                    <b>{p.member?.firstName} {p.member?.lastName}</b>
                  </td>
                  <td data-label="Plan">{p.plan.name}</td>
                  <td data-label="Fecha">{date(p.paymentDate)}</td>
                  <td data-label="Monto" className="amount positive">
                    {money(p.finalAmount)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
          :
          <Empty />
        }
      </div>


      <div className="card alerts-card">
        <div className="card-head">
          <div>
            <h3>Atención requerida</h3>
            <p>Socios con cuota vencida</p>
          </div>
          <span className="count-badge">
            {data.alerts.overdueCount}
          </span>
        </div>
        {data.overdueMembers.length ?
          <div className="alert-list">
            {data.overdueMembers.slice(0, 5).map(m =>
              <Link to="/pagos"
                key={m.id}>
                <div className="avatar small">
                  {m.firstName[0]}
                  {m.lastName[0]}
                </div>
                <div>
                  <b>{m.firstName} {m.lastName}</b>
                  <span>{m.lastPlan}</span>
                </div>
                <Status ok={false}>
                  {m.daysOverdue ? `${m.daysOverdue} días` : 'Sin pago'}
                </Status>
              </Link>
            )}
          </div>
          :
          <Empty title="¡Todo al día!" text="No hay socios con cuotas vencidas." />
        }
      </div>

    </section>
  </div>;
}
