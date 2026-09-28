import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Plus, UserRoundCog } from 'lucide-react';
import { api, date } from '../api';
import type { User } from '../types';
import { Button, Empty, ErrorState, Field, Loading, Modal, Status, ToastView } from '../components';

export default function Users() {
  const [users, setUsers] = useState<User[]>();
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setError('');
      setUsers((await api<User[]>('/auth/users')).data);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudieron cargar los usuarios'); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fields = new FormData(form);
    const password = String(fields.get('password'));
    if (password !== fields.get('confirmPassword')) {
      setFormError('Las contraseñas no coinciden.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await api('/auth/register', { method: 'POST', body: JSON.stringify({
        name: String(fields.get('name')).trim(),
        email: String(fields.get('email')).trim().toLowerCase(),
        password,
        roleName: fields.get('roleName'),
      }) });
      setOpen(false);
      setToast({ type: 'success', message: 'Usuario creado. Ya puede iniciar sesión con su email y contraseña.' });
      void load();
    } catch (e) { setFormError(e instanceof Error ? e.message : 'No se pudo crear el usuario'); }
    finally { setSaving(false); }
  }

  return <div className="stack">
    <ToastView toast={toast} clear={() => setToast(null)} />
    <div className="toolbar"><div className="filter-title"><UserRoundCog /> Accesos del equipo</div>
      <Button icon={<Plus />} onClick={() => { setFormError(''); setOpen(true); }}>Nuevo usuario</Button>
    </div>
    {error ? <ErrorState message={error} retry={load} /> : !users ? <Loading /> :
      <div className="card table-card"><div className="table-scroll"><table className="users-table">
        <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Alta</th><th>Estado</th></tr></thead>
        <tbody>{users.map(u => <tr key={u.id}>
          <td data-label="Nombre"><b>{u.name}</b></td>
          <td data-label="Email">{u.email}</td>
          <td data-label="Rol">{u.role.name === 'ADMIN' ? 'Administrador' : 'Recepcionista'}</td>
          <td data-label="Alta">{date(u.createdAt)}</td>
          <td data-label="Estado"><Status ok={u.active}>{u.active ? 'Activo' : 'Inactivo'}</Status></td>
        </tr>)}</tbody>
      </table></div>{users.length === 0 && <Empty title="Sin usuarios" text="Creá el primer acceso del equipo." />}</div>}

    {open && <Modal title="Crear usuario" subtitle="Esta persona podrá ingresar al sistema con las credenciales que definas." onClose={() => !saving && setOpen(false)}>
      <form onSubmit={create}><div className="form-grid">
        <Field label="Nombre *"><input name="name" minLength={2} maxLength={100} autoComplete="name" required /></Field>
        <Field label="Email *"><input name="email" type="email" autoComplete="off" required /></Field>
        <Field label="Rol *"><select name="roleName" defaultValue="RECEPTIONIST" required><option value="RECEPTIONIST">Recepcionista</option><option value="ADMIN">Administrador</option></select></Field>
        <div />
        <Field label="Contraseña *"><input name="password" type="password" minLength={6} autoComplete="new-password" required /></Field>
        <Field label="Repetir contraseña *"><input name="confirmPassword" type="password" minLength={6} autoComplete="new-password" required /></Field>
      </div>
      <div className="form-note"><UserRoundCog /> El rol administrador puede gestionar usuarios, planes y auditoría.</div>
      {formError && <p className="form-error" role="alert">{formError}</p>}
      <div className="modal-actions"><Button type="button" variant="ghost" disabled={saving} onClick={() => setOpen(false)}>Cancelar</Button>
        <Button disabled={saving}>{saving ? 'Creando…' : 'Crear usuario'}</Button></div>
      </form>
    </Modal>}
  </div>;
}
