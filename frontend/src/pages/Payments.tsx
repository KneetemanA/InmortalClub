import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { AlertCircle, CalendarClock, CheckCircle2, Plus, Search } from 'lucide-react';
import { api, date, money } from '../api';
import type { Member, Payment, Plan } from '../types';
import {
  Button,
  Empty,
  ErrorState,
  Field,
  Loading,
  Modal,
  Status,
  ToastView,
} from '../components';

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>();
  const [overdue, setOverdue] = useState<Member[]>([]);
  const [upcoming, setUpcoming] = useState<Payment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);

  const [tab, setTab] = useState<'all' | 'overdue' | 'upcoming'>('all');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<'payment' | 'renew' | null>(null);
  const [renewMember, setRenewMember] = useState<Member>();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setError('');
      const [p, o, u, m, pl] = await Promise.all([
        api<Payment[]>('/payments'),
        api<Member[]>('/payments/overdue'),
        api<Payment[]>('/payments/upcoming?days=7'),
        api<Member[]>('/members'),
        api<Plan[]>('/plans?onlyActive=true'),
      ]);
      setPayments(p.data);
      setOverdue(o.data);
      setUpcoming(u.data);
      setMembers(m.data);
      setPlans(pl.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(
    () =>
      (payments || []).filter((p) =>
        `${p.member?.firstName} ${p.member?.lastName} ${p.member?.dni}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [payments, query],
  );

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const body = Object.fromEntries(new FormData(e.currentTarget));
    if (!body.expirationDate) delete body.expirationDate;

    try {
      await api('/payments', { method: 'POST', body: JSON.stringify(body) });
      setModal(null);
      setToast({ type: 'success', message: 'Pago registrado correctamente.' });
      load();
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Error' });
    } finally {
      setSaving(false);
    }
  }

  async function renew(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!renewMember) return;

    setSaving(true);
    const paymentMethod = new FormData(e.currentTarget).get('paymentMethod');

    try {
      await api(`/payments/${renewMember.id}/renew`, {
        method: 'POST',
        body: JSON.stringify({ paymentMethod }),
      });
      setModal(null);
      setToast({ type: 'success', message: 'Cuota renovada por 30 días.' });
      load();
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Error' });
    } finally {
      setSaving(false);
    }
  }

  if (error) return <ErrorState message={error} retry={load} />;
  if (!payments) return <Loading />;

  return (
    <div className="stack">
      <ToastView toast={toast} clear={() => setToast(null)} />

      <div className="toolbar">
        <div className="tabs">
          <button className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>
            Todos <span>{payments.length}</span>
          </button>
          <button className={tab === 'overdue' ? 'active' : ''} onClick={() => setTab('overdue')}>
            Vencidos <span>{overdue.length}</span>
          </button>
          <button className={tab === 'upcoming' ? 'active' : ''} onClick={() => setTab('upcoming')}>
            Por vencer <span>{upcoming.length}</span>
          </button>
        </div>
        <Button icon={<Plus />} onClick={() => setModal('payment')}>
          Registrar pago
        </Button>
      </div>

      {tab === 'all' && (
        <>
          <div className="search standalone">
            <Search />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar socio en el historial…"
            />
          </div>

          <div className="card table-card">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Socio</th>
                    <th>Plan</th>
                    <th>Pago</th>
                    <th>Vencimiento</th>
                    <th>Método</th>
                    <th>Descuento</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((p) => (
                    <tr key={p.id}>
                      <td data-label="Socio">
                        <b>
                          {p.member?.firstName} {p.member?.lastName}
                        </b>
                        <small>DNI {p.member?.dni}</small>
                      </td>
                      <td data-label="Plan">{p.plan.name}</td>
                      <td data-label="Pago" className="amount">
                        {money(p.finalAmount)}
                        <small>{date(p.paymentDate)}</small>
                      </td>
                      <td data-label="Vencimiento">{date(p.expirationDate)}</td>
                      <td data-label="Método">
                        {p.paymentMethod === 'CASH' ? 'Efectivo' : 'Transferencia'}
                      </td>
                      <td data-label="Descuento">
                        {Number(p.discountPercentage) > 0 ? (
                          <span className="tag lime">-{p.discountPercentage}%</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td data-label="Estado">
                        <Status ok={p.status === 'PAID'}>
                          {p.status === 'PAID' ? 'Pagado' : 'Cancelado'}
                        </Status>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!visible.length && <Empty />}
          </div>
        </>
      )}

      {tab === 'overdue' && (
        <div className="card-list">
          {overdue.map((m) => {
            const p = m.payments[0];
            return (
              <div className="member-alert" key={m.id}>
                <div className="alert-symbol danger">
                  <AlertCircle />
                </div>
                <div className="grow">
                  <b>
                    {m.firstName} {m.lastName}
                  </b>
                  <span>
                    {p ? `${p.plan.name} · Venció ${date(p.expirationDate)}` : 'Sin pagos registrados'}
                  </span>
                </div>
                <span>{m.phone}</span>
                {p && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setRenewMember(m);
                      setModal('renew');
                    }}
                  >
                    Renovar
                  </Button>
                )}
              </div>
            );
          })}
          {!overdue.length && (
            <Empty title="No hay cuotas vencidas" text="Todos los socios activos están al día." />
          )}
        </div>
      )}

      {tab === 'upcoming' && (
        <div className="card-list">
          {upcoming.map((p) => (
            <div className="member-alert" key={p.id}>
              <div className="alert-symbol orange">
                <CalendarClock />
              </div>
              <div className="grow">
                <b>
                  {p.member?.firstName} {p.member?.lastName}
                </b>
                <span>
                  {p.plan.name} · Vence {date(p.expirationDate)}
                </span>
              </div>
              <span className="tag orange">{p.daysRemaining} días</span>
              <Button
                variant="secondary"
                onClick={() => {
                  setRenewMember(p.member);
                  setModal('renew');
                }}
              >
                Renovar
              </Button>
            </div>
          ))}
          {!upcoming.length && (
            <Empty
              title="Sin vencimientos cercanos"
              text="No hay cuotas que venzan en los próximos 7 días."
            />
          )}
        </div>
      )}

      {modal === 'payment' && (
        <Modal
          title="Registrar pago"
          subtitle="Creá una nueva cuota para un socio activo."
          onClose={() => setModal(null)}
        >
          <form onSubmit={create}>
            <div className="form-stack">
              <Field label="Socio *">
                <select name="memberId" required defaultValue="">
                  <option value="" disabled>
                    Seleccionar socio
                  </option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName} — {m.dni}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Plan *">
                <select name="planId" required defaultValue="">
                  <option value="" disabled>
                    Seleccionar plan
                  </option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {money(p.price)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Forma de pago">
                <select name="paymentMethod">
                  <option value="CASH">Efectivo</option>
                  <option value="TRANSFER">Transferencia</option>
                </select>
              </Field>
              <Field label="Vencimiento" hint="Si lo dejás vacío, se asignan 30 días.">
                <input name="expirationDate" type="date" />
              </Field>
            </div>
            <div className="form-note">
              <CheckCircle2 />
              El backend calcula el monto y valida el beneficio aplicable.
            </div>
            <div className="modal-actions">
              <Button type="button" variant="ghost" onClick={() => setModal(null)}>
                Cancelar
              </Button>
              <Button disabled={saving}>{saving ? 'Guardando…' : 'Registrar pago'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'renew' && renewMember && (
        <Modal
          title="Renovar cuota"
          subtitle={`${renewMember.firstName} ${renewMember.lastName}`}
          onClose={() => setModal(null)}
        >
          <form onSubmit={renew}>
            <p className="modal-copy">
              Se renovará el mismo plan y beneficio del último pago por otros 30 días.
            </p>
            <Field label="Forma de pago">
              <select name="paymentMethod">
                <option value="CASH">Efectivo</option>
                <option value="TRANSFER">Transferencia</option>
              </select>
            </Field>
            <div className="modal-actions">
              <Button type="button" variant="ghost" onClick={() => setModal(null)}>
                Cancelar
              </Button>
              <Button disabled={saving}>{saving ? 'Renovando…' : 'Confirmar renovación'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}