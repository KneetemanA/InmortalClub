import { useEffect, useId, useRef, type ChangeEventHandler, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CalendarDays, CheckCircle2, X, LoaderCircle, Search } from 'lucide-react';

export function Button({ children, variant = 'primary', icon, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; icon?: ReactNode }) {
  return <button className={`btn btn-${variant}`} {...props}>{icon}{children}</button>;
}

export function Modal({ title, subtitle, children, onClose, wide = false }: { title: string; subtitle?: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', close); document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', close); document.body.style.overflow = ''; };
  }, [onClose]);
  return createPortal(<div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className={`modal ${wide ? 'modal-wide' : ''}`} ref={ref} role="dialog" aria-modal="true" aria-label={title}>
      <header><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-btn" onClick={onClose} aria-label="Cerrar"><X /></button></header>
      {children}
    </div>
  </div>, document.body);
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

export function DateFilter({ label, value, onChange, min, max }: { label: string; value: string; onChange: ChangeEventHandler<HTMLInputElement>; min?: string; max?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const open = () => {
    if (input.current?.showPicker) {
      try { input.current.showPicker(); return; } catch { /* Browsers without an available native picker */ }
    }
    input.current?.focus();
  };
  return <div className="date-filter-field">
    <label htmlFor={id}>{label}</label>
    <span className="date-input-wrap">
      <input id={id} ref={input} type="date" value={value} min={min} max={max} onChange={onChange} onClick={open} required />
      <button type="button" className="date-picker-button" onClick={open} aria-label={`Abrir calendario de ${label.toLowerCase()}`}><CalendarDays aria-hidden="true" /></button>
    </span>
  </div>;
}

export function Empty({ title = 'No hay datos', text = 'Todavía no hay información para mostrar.' }: { title?: string; text?: string }) {
  return <div className="empty"><div className="empty-icon"><Search /></div><strong>{title}</strong><p>{text}</p></div>;
}
export function Loading() { return <div className="loading"><LoaderCircle className="spin" /><span>Cargando información…</span></div>; }
export function ErrorState({ message, retry }: { message: string; retry?: () => void }) { return <div className="error-state"><AlertTriangle /><div><strong>No pudimos cargar esta sección</strong><p>{message}</p></div>{retry && <Button variant="secondary" onClick={retry}>Reintentar</Button>}</div>; }
export function Status({ ok, children }: { ok: boolean; children: ReactNode }) { return <span className={`status ${ok ? 'success' : 'danger'}`}>{ok ? <CheckCircle2 /> : <AlertTriangle />}{children}</span>; }

type Toast = { type: 'success' | 'error'; message: string } | null;
export function ToastView({ toast, clear }: { toast: Toast; clear: () => void }) {
  useEffect(() => { if (toast) { const id = setTimeout(clear, 3500); return () => clearTimeout(id); } }, [toast, clear]);
  if (!toast) return null;
  return <div className={`toast ${toast.type}`} onClick={clear}>{toast.type === 'success' ? <CheckCircle2 /> : <AlertTriangle />}<span>{toast.message}</span><X /></div>;
}
