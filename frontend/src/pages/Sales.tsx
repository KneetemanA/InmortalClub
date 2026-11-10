import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ShoppingBag } from 'lucide-react';
import { api, money } from '../api';
import type { Category } from '../types';
import { Button, Empty, ErrorState, Field, Loading, ToastView } from '../components';

type Sale = { id: string; amount: string | number; description?: string; movementDate: string; category: { id: string; name: string } };
const categoryLabel = (name: string) => name.charAt(0) + name.slice(1).toLowerCase();
const time = (value: string) => new Date(value).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' });

// Ventas de mostrador (bebidas, remeras, etc.). Se registran como ingresos que solo el administrador ve en Finanzas.
export default function Sales() {
  const [categories, setCategories] = useState<Category[]>(); const [sales, setSales] = useState<Sale[]>([]);
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false); const [formKey, setFormKey] = useState(0);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const load = useCallback(async () => {
    try { setError(''); const [c, s] = await Promise.all([api<Category[]>('/sales/categories'), api<Sale[]>('/sales/mine')]); setCategories(c.data); setSales(s.data); }
    catch (e) { setError(e instanceof Error ? e.message : 'Error'); }
  }, []);
  useEffect(() => { load(); }, [load]);
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (saving) return; setSaving(true);
    const body = Object.fromEntries(new FormData(e.currentTarget));
    try { await api('/sales', { method: 'POST', body: JSON.stringify(body) }); setToast({ type: 'success', message: 'Venta registrada.' }); setFormKey(k => k + 1); await load(); }
    catch (e) { setToast({ type: 'error', message: e instanceof Error ? e.message : 'No se pudo registrar la venta' }); }
    finally { setSaving(false); }
  }
  if (error) return <ErrorState message={error} retry={load} />; if (!categories) return <Loading />;
  return <div className="stack"><ToastView toast={toast} clear={() => setToast(null)} />
    <div className="card"><form key={formKey} onSubmit={create}><div className="form-grid">
      <Field label="Categoría *"><select name="categoryId" required defaultValue=""><option value="" disabled>Seleccionar</option>{categories.map(c => <option key={c.id} value={c.id}>{categoryLabel(c.name)}</option>)}</select></Field>
      <Field label="Qué se vendió *"><input name="description" placeholder="Ej.: 2 bebidas energéticas" minLength={2} maxLength={200} required /></Field>
      <Field label="Importe *"><input name="amount" type="number" min="0.01" step="0.01" required /></Field>
      <Field label="Forma de pago *"><select name="paymentMethod" defaultValue="CASH"><option value="CASH">Efectivo</option><option value="TRANSFER">Transferencia</option></select></Field>
    </div><div className="modal-actions"><Button icon={<ShoppingBag />} disabled={saving}>{saving ? 'Registrando…' : 'Registrar venta'}</Button></div></form></div>
    <h4 className="section-title">Tus ventas de hoy</h4>
    {sales.length ? <div className="card"><div className="compact-list">{sales.map(s => <div key={s.id}><div><b>{s.description || categoryLabel(s.category.name)}</b><span>{categoryLabel(s.category.name)} · {time(s.movementDate)}</span></div><strong>{money(s.amount)}</strong></div>)}</div></div>
      : <Empty title="Todavía no registraste ventas hoy" text="Las ventas que cargues aparecen acá y en Finanzas para el administrador." />}
  </div>;
}
