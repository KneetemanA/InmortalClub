import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ArrowDownRight, ArrowUpRight, FolderPlus, Plus, Scale } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { api, date, money, todayInput } from '../api';
import { paymentMethodLabel } from '../payment-utils';
import type { Category, Movement, Payment } from '../types';
import { Button, DateFilter, Empty, ErrorState, Field, Loading, Modal, ToastView } from '../components';

type FinancialPayment = Omit<Payment, 'member' | 'plan' | 'user'> & { member: {firstName: string; lastName: string; dni: string | null}; plan: {name: string}; user: {id: string; name: string} };
type FinancialMovement = Omit<Movement, 'user'> & {user: {id: string; name: string}};
type CategoryTotal = { categoryId: string; category: string; type: string; total: number; count: number };
type Summary = {
  period: { start: string; end: string };
  summary: { membershipIncome: number; otherIncome: number; totalIncome: number; totalExpense: number; balance: number };
  byCategory: CategoryTotal[];
  payments: FinancialPayment[];
  movements: FinancialMovement[];
};
type Period = 'weekly' | 'monthly' | 'yearly' | 'custom';
type Preset = Exclude<Period, 'custom'>;
const periodNames: Record<Period, string> = { weekly: 'Semanal', monthly: 'Mensual', yearly: 'Anual', custom: 'Rango libre' };
const localISO = (value: string, end = false) => new Date(`${value}T${end ? '23:59:59.999' : '00:00:00'}`).toISOString();

export default function Finances() {
  const { user } = useAuth();
  const isAdmin = user?.role.name === 'ADMIN';
  const [anchor, setAnchor] = useState(todayInput());
  const [startDate, setStartDate] = useState(() => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`; });
  const [endDate, setEndDate] = useState(todayInput());
  const [period, setPeriod] = useState<Period>('monthly');
  const [categoryId, setCategoryId] = useState('');
  const [periods, setPeriods] = useState<Record<Preset, Summary>>();
  const [custom, setCustom] = useState<Summary>();
  const [detailCategory, setDetailCategory] = useState<CategoryTotal>();
  const [detail, setDetail] = useState<FinancialPayment | FinancialMovement>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [modal, setModal] = useState<'INCOME' | 'EXPENSE' | null>(null);
  const [categoryModal, setCategoryModal] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setError('');
      const [summaries, categoryResponse, customResponse] = await Promise.all([
        api<Record<Preset, Summary>>(`/financial/periods?date=${encodeURIComponent(localISO(anchor))}&timezoneOffsetMinutes=${new Date(`${anchor}T12:00:00`).getTimezoneOffset()}${categoryId ? `&categoryId=${encodeURIComponent(categoryId)}` : ''}`),
        api<Category[]>('/financial/categories'),
        api<Summary>(`/financial/summary?startDate=${encodeURIComponent(localISO(startDate))}&endDate=${encodeURIComponent(localISO(endDate, true))}${categoryId ? `&categoryId=${encodeURIComponent(categoryId)}` : ''}`),
      ]);
      setPeriods(summaries.data);
      setCategories(categoryResponse.data);
      setCustom(customResponse.data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al cargar las finanzas'); }
  }, [anchor, startDate, endDate, categoryId]);
  useEffect(() => { void load(); }, [load]);

  const active = period === 'custom' ? custom : periods?.[period];
  const movements = active?.movements || [];
  const categoryPayments = detailCategory?.categoryId === 'MEMBERSHIP' ? active?.payments || [] : [];
  const categoryMovements = detailCategory ? movements.filter(m => m.category.id === detailCategory.categoryId) : [];
  const closeDetails = () => { setDetailCategory(undefined); setDetail(undefined); };

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!modal) return; setSaving(true);
    const form = new FormData(e.currentTarget);
    const movementDate = String(form.get('movementDate') || '');
    const body = {
      categoryId: form.get('categoryId'),
      amount: Number(form.get('amount')),
      description: form.get('description'),
      movementDate: localISO(movementDate)
    };
    try {
      await api(`/financial/${modal === 'INCOME' ? 'income' : 'expense'}`, { method: 'POST', body: JSON.stringify(body) });
      setModal(null); setToast({ type: 'success', message: modal === 'INCOME' ? 'Ingreso registrado.' : 'Egreso registrado.' });
      await load();
    } catch (e) { setToast({ type: 'error', message: e instanceof Error ? e.message : 'Error' }); }
    finally { setSaving(false); }
  }

  async function createCategory(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSaving(true);
    setCategoryError('');
    try {
      const response = await api<Category>('/financial/categories', {
        method: 'POST',
        body: JSON.stringify({ name: String(form.get('name')).trim(), type: form.get('type') }),
      });
      setCategories(previous => [...previous, response.data].sort((a, b) => a.name.localeCompare(b.name)));
      setCategoryModal(false);
      setToast({ type: 'success', message: 'Categoría creada. Ya está disponible para registrar movimientos.' });
    } catch (e) {
      setCategoryError(e instanceof Error ? e.message : 'No se pudo crear la categoría');
    } finally { setSaving(false); }
  }

  if (error) return <ErrorState message={error} retry={load} />;
  if (!periods || !active) return <Loading />;
  const s = active.summary;
  return <div className="stack">
    <ToastView toast={toast} clear={() => setToast(null)} />
    <div className="toolbar finance-toolbar">
      <div className="period-tabs" role="group" aria-label="Período financiero">
        {(Object.keys(periodNames) as Period[]).map(key =>
          <button
            key={key}
            type="button"
            className={period === key ? 'selected' : ''}
            onClick={() => setPeriod(key)}>
            {periodNames[key]}
          </button>)}
      </div>

      <div className="date-filter">
        {period === 'custom' ?
        <>
          <DateFilter label="Desde" value={startDate} onChange={e => { if (e.target.value) { setStartDate(e.target.value); if (e.target.value > endDate) setEndDate(e.target.value); } }} />
          <DateFilter label="Hasta" value={endDate} min={startDate} onChange={e => { if (e.target.value) setEndDate(e.target.value); }} />
        </>
          :
          <DateFilter label="Fecha de referencia" value={anchor} onChange={e => { if (e.target.value) setAnchor(e.target.value); }} />}
        <label>Categoría<select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
          <option value="">Todas las categorías</option>
          <option value="MEMBERSHIP">Cuotas de membresía</option>

          {categories.map(c => <option value={c.id} key={c.id}>{c.name} ({c.type === 'INCOME' ? 'Ingreso' : 'Egreso'})</option>)}
        </select>
        </label>
      </div>

      <div className="button-pair">
        {isAdmin && <Button variant="secondary" icon={<FolderPlus />} onClick={() => { setCategoryError(''); setCategoryModal(true); }}>Nueva categoría</Button>}
        <Button
          variant="secondary"
          icon={<ArrowDownRight />}
          onClick={() => setModal('EXPENSE')}
        >
          Nuevo egreso
        </Button>

        <Button
          icon={<Plus />}
          onClick={() => setModal('INCOME')}
        >
          Nuevo ingreso
        </Button>
      </div>
    </div>

    {!categories.length && <div className="form-note"><FolderPlus /> No hay categorías de ingresos ni egresos. {isAdmin ? 'Creá una con “Nueva categoría” para poder registrar movimientos.' : 'Pedile a un administrador que cree las categorías para poder registrar movimientos.'}</div>}

    <p className="finance-period-label">{periodNames[period]} · {date(active.period.start)} al {date(active.period.end)}</p>
    <section className="stats-grid finance">
      <div className="stat-card">
        <div className="stat-icon lime">
          <ArrowUpRight />
        </div>
        <span>Ingresos totales</span>
        <strong>{money(s.totalIncome)}</strong>
        <small>Cuotas: {money(s.membershipIncome)}</small>
      </div>

      <div className="stat-card">
        <div className="stat-icon orange">
          <ArrowDownRight />
        </div>
        <span>Egresos</span>
        <strong>{money(s.totalExpense)}</strong>
        <small>En el período elegido</small>
      </div>

      <div className="stat-card">
        <div className="stat-icon blue">
          <Scale />
        </div>
        <span>Balance</span>
        <strong className={s.balance >= 0 ? 'positive' : 'negative'}>
          {money(s.balance)}
        </strong>
        <small>
          {s.balance >= 0 ? 'Resultado positivo' : 'Resultado negativo'}
        </small>
      </div>
    </section>
    <section className="dashboard-grid">
      <div className="card">
        <div className="card-head">
          <div>
            <h3>Por categoría</h3>
            <p>Composición del período</p>
          </div>
        </div>
        {active.byCategory.length ?
          <div className="category-list">
            {active.byCategory.map(c =>
              <div key={c.categoryId}>
                <i className={c.type === 'INCOME' ? 'income' : 'expense'} />
                <span><button type="button" className="finance-detail-link" onClick={()=>{setDetailCategory(c);setDetail(undefined)}}>{c.category} · Ver detalle</button>
                  <small>
                    {c.count} movimientos
                  </small>
                </span>
                <b className={c.type === 'INCOME' ? 'positive' : 'negative'}>
                  {c.type === 'INCOME' ? '+' : '-'}{money(c.total)}
                </b>
              </div>
            )}
          </div>
          :
          <Empty />
        }
      </div>

      <div className="card table-card">
        <div className="card-head">
          <div>
            <h3>Movimientos manuales</h3>
            <p>Ingresos extra y egresos</p>
          </div>
        </div>
        {movements.length ?
          <div className="compact-list movements">
            {movements.map(m =>
              <div key={m.id}>
                <i className={m.type === 'INCOME' ? 'income' : 'expense'}>
                  {m.type === 'INCOME' ? <ArrowUpRight />
                    :
                    <ArrowDownRight />
                  }
                </i>
                <div>
                  <button type="button" className="finance-detail-link" onClick={()=>{setDetailCategory(undefined);setDetail(m)}}>{m.category.name} · Ver detalle</button>
                  <span>
                    {m.description || 'Sin descripción'} · {date(m.movementDate)}
                  </span>
                </div>
                <strong className={m.type === 'INCOME' ? 'positive' : 'negative'}>
                  {m.type === 'INCOME' ? '+' : '-'}{money(m.amount)}
                </strong>
              </div>
            )}
          </div>
          :
          <Empty />
        }
      </div>
    </section>

    {(detailCategory || detail) && <Modal wide title={detail ? ('paymentDate' in detail ? 'Detalle de cuota' : 'Detalle de movimiento') : detailCategory!.category}
      subtitle={`${date(active.period.start)} al ${date(active.period.end)}`} onClose={closeDetails}>
      {detail ? <>
        {detailCategory && <Button variant="ghost" onClick={()=>setDetail(undefined)}>← Volver al desglose</Button>}
        {'paymentDate' in detail ? <div className="detail-grid finance-detail-grid">
          <div><span>Socio</span><b>{detail.member.firstName} {detail.member.lastName}</b></div>
          <div><span>DNI</span><b>{detail.member.dni || 'Sin DNI'}</b></div>
          <div><span>Plan</span><b>{detail.plan.name}</b></div>
          <div><span>Importe cobrado</span><b>{money(detail.finalAmount)}</b></div>
          <div><span>Fecha de pago</span><b>{date(detail.paymentDate)}</b></div>
          <div><span>Vencimiento</span><b>{date(detail.expirationDate)}</b></div>
          <div><span>Forma de pago</span><b>{paymentMethodLabel(detail.paymentMethod)}</b>{detail.paymentMethod==='MIXED' && <p>Efectivo: {money(detail.cashAmount)}<br/>Transferencia: {money(detail.transferAmount)}</p>}</div>
          <div><span>Registrado por</span><b>{detail.user.name}</b></div>
          <div><span>Descuento aplicado al cobro</span><b>{Number(detail.discountPercentage)}% · {money(detail.discountAmount)}</b></div>
          <div><span>Proporcional</span><b>{detail.prorated ? 'Sí' : 'No'}</b></div>
          {Number(detail.adjustmentAmount || 0)!==0 && <div><span>Ajuste sobre tarifa</span><b>{money(detail.adjustmentAmount)}</b></div>}
        </div> : <div className="detail-grid finance-detail-grid">
          <div><span>Tipo</span><b>{detail.type==='INCOME'?'Ingreso':'Egreso'}</b></div>
          <div><span>Categoría</span><b>{detail.category.name}</b></div>
          <div><span>Monto</span><b>{money(detail.amount)}</b></div>
          <div><span>Fecha</span><b>{date(detail.movementDate)}</b></div>
          <div><span>Registrado por</span><b>{detail.user.name}</b></div>
          <div className="finance-description"><span>Descripción</span><p>{detail.description || 'Sin descripción'}</p></div>
        </div>}
      </> : <>
        <p className="modal-copy">{detailCategory!.count} movimientos · Total {money(detailCategory!.total)}</p>
        <div className="table-scroll"><table><thead><tr><th>Fecha</th><th>{detailCategory!.categoryId==='MEMBERSHIP'?'Socio y plan':'Descripción'}</th><th>Importe</th><th>Detalle</th></tr></thead><tbody>
          {categoryPayments.map(p=><tr key={p.id}><td data-label="Fecha">{date(p.paymentDate)}</td><td data-label="Socio y plan"><b>{p.member.firstName} {p.member.lastName}</b><small>{p.plan.name} · {paymentMethodLabel(p.paymentMethod)}</small></td><td data-label="Importe">{money(p.finalAmount)}</td><td data-label="Detalle"><Button variant="ghost" onClick={()=>setDetail(p)}>Ver pago</Button></td></tr>)}
          {categoryMovements.map(m=><tr key={m.id}><td data-label="Fecha">{date(m.movementDate)}</td><td data-label="Descripción" className="finance-description">{m.description || 'Sin descripción'}</td><td data-label="Importe">{money(m.amount)}</td><td data-label="Detalle"><Button variant="ghost" onClick={()=>setDetail(m)}>Ver movimiento</Button></td></tr>)}
        </tbody></table></div>
      </>}
      <div className="modal-actions"><Button variant="secondary" onClick={closeDetails}>Cerrar</Button></div>
    </Modal>}

    {modal &&
      <Modal title={modal === 'INCOME' ? 'Registrar ingreso' : 'Registrar egreso'}
        subtitle="Este movimiento impactará en el balance financiero."
        onClose={() => setModal(null)}>
        <form onSubmit={create}>
          <div className="form-stack">

            <Field label="Categoría *">
              <select name="categoryId" required defaultValue="">
                <option value=""
                  disabled>
                  Seleccionar categoría
                </option>
                {categories.filter(c => c.type === modal).map(c =>
                  <option
                    key={c.id}
                    value={c.id}>{c.name}
                  </option>)}
              </select>
            </Field>
            {!categories.some(c => c.type === modal) && <div className="form-note"><FolderPlus /> {isAdmin ? 'No hay categorías de este tipo. Cerrá este formulario y creá una con “Nueva categoría”.' : 'Un administrador debe crear una categoría de este tipo.'}</div>}

            <Field label="Monto *">
              <input name="amount"
                type="number"
                min="0.01"
                step="0.01"
                required
              />
            </Field>

            <Field label="Fecha">
              <input
                name="movementDate"
                type="date"
                defaultValue={todayInput()}
                required
              />
            </Field>

            <Field label="Descripción">
              <textarea
                name="description"
                rows={3}
              />
            </Field>
          </div>

          <div className="modal-actions">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setModal(null)}>
              Cancelar
            </Button>

            <Button
              disabled={saving}>{saving ? 'Guardando…' : 'Guardar movimiento'}
            </Button>
          </div>
        </form>
      </Modal>}
    {categoryModal && <Modal title="Nueva categoría" subtitle="Organizá los ingresos extra y los egresos del gimnasio." onClose={() => !saving && setCategoryModal(false)}>
      <form onSubmit={createCategory}>
        <div className="form-stack">
          <Field label="Nombre *"><input name="name" minLength={2} maxLength={100} placeholder="Ej.: Alquiler, bebidas" required /></Field>
          <Field label="Tipo *"><select name="type" defaultValue="EXPENSE" required><option value="INCOME">Ingreso</option><option value="EXPENSE">Egreso</option></select></Field>
        </div>
        {categoryError && <p className="form-error" role="alert">{categoryError}</p>}
        <div className="modal-actions"><Button type="button" variant="ghost" disabled={saving} onClick={() => setCategoryModal(false)}>Cancelar</Button><Button disabled={saving}>{saving ? 'Creando…' : 'Crear categoría'}</Button></div>
      </form>
    </Modal>}
  </div>;
}
