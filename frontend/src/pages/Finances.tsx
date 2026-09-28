import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ArrowDownRight, ArrowUpRight, Plus, Scale } from 'lucide-react';
import { api, date, money, todayInput } from '../api';
import type { Category, Movement } from '../types';
import { Button, DateFilter, Empty, ErrorState, Field, Loading, Modal, ToastView } from '../components';

type Summary = {
  period: { start: string; end: string };
  summary: { membershipIncome: number; otherIncome: number; totalIncome: number; totalExpense: number; balance: number };
  byCategory: { category: string; type: string; total: number; count: number }[];
};
type Period = 'weekly' | 'monthly' | 'yearly' | 'custom';
type Preset = Exclude<Period, 'custom'>;
const periodNames: Record<Period, string> = { weekly: 'Semanal', monthly: 'Mensual', yearly: 'Anual', custom: 'Rango libre' };
const localISO = (value: string, end = false) => new Date(`${value}T${end ? '23:59:59.999' : '00:00:00'}`).toISOString();

export default function Finances() {
  const [anchor, setAnchor] = useState(todayInput());
  const [startDate, setStartDate] = useState(() => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`; });
  const [endDate, setEndDate] = useState(todayInput());
  const [period, setPeriod] = useState<Period>('monthly');
  const [categoryId, setCategoryId] = useState('');
  const [periods, setPeriods] = useState<Record<Preset, Summary>>();
  const [custom, setCustom] = useState<Summary>();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modal, setModal] = useState<'INCOME' | 'EXPENSE' | null>(null);
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
  const rangeStart = active?.period.start;
  const rangeEnd = active?.period.end;
  const loadMovements = useCallback(async () => {
    if (!rangeStart || !rangeEnd || categoryId === 'MEMBERSHIP') { setMovements([]); return; }
    try {
      const query = new URLSearchParams({ startDate: rangeStart, endDate: rangeEnd });
      if (categoryId) query.set('categoryId', categoryId);
      const response = await api<Movement[]>(`/financial/movements?${query}`);
      setMovements(response.data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al cargar movimientos'); }
  }, [rangeStart, rangeEnd, categoryId]);
  useEffect(() => { void loadMovements(); }, [loadMovements]);

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
              <div key={`${c.type}-${c.category}`}>
                <i className={c.type === 'INCOME' ? 'income' : 'expense'} />
                <span>{c.category}
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
            {movements.slice(0, 10).map(m =>
              <div key={m.id}>
                <i className={m.type === 'INCOME' ? 'income' : 'expense'}>
                  {m.type === 'INCOME' ? <ArrowUpRight />
                    :
                    <ArrowDownRight />
                  }
                </i>
                <div>
                  <b>{m.category.name}
                  </b>
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
  </div>;
}
