import { useState, type FormEvent } from 'react';
import { ArrowRight, Dumbbell, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { useAuth } from '../AuthContext';
import logo from '../assets/logo-inmortal-club.png';

export default function Login() {

  const { login, loading } = useAuth(); const [show, setShow] = useState(false); const [error, setError] = useState('');

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    const data = new FormData(e.currentTarget);
    try {
      await login(
        String(data.get('email')),
        String(data.get('password'))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión');

    };
  }

  return <div className="login-page">
    <section className="login-visual">
      <div className="grain" />
      <div className="login-brand">
        <Dumbbell />
        <b>INMORTAL <span>CLUB</span> </b>
      </div>

      <div className="login-emblem">
        <img src={logo}
          alt="Logo oficial de Inmortal Club" />
      </div>
      <div className="visual-copy">
        <small>FUERZA · DISCIPLINA · CONSTANCIA</small>
        <h1>El control de tu gimnasio, <em>en un solo lugar.</em> </h1>
        <p>Socios, cuotas y finanzas organizados para que puedas enfocarte en hacer crecer tu comunidad.</p>
      </div>

      <div className="visual-stat">
        <strong>24/7</strong>
        <span>Información disponible<br />cuando la necesitás</span>
      </div>
    </section>

    <section className="login-panel">
      <form className="login-form"
        onSubmit={submit}>
        <div className="mobile-brand">
          <img src={logo}
            alt="Logo de Inmortal Club"
          />
          <b>INMORTAL CLUB</b>
        </div>

        <p className="eyebrow">BIENVENIDO</p>
        <h2>Ingresá a tu cuenta</h2>
        <p className="muted">Usá las credenciales asignadas por administración.</p>

        {error && <div className="form-error">{error}
        </div>
        }

        <label className="login-field">
          <span>Correo electrónico</span>
          <div>
            <Mail />
            <input name="email" type="email" placeholder="nombre@correo.com" required autoFocus />
          </div>
        </label>

        <label className="login-field">
          <span>Contraseña</span>
          <div>
            <LockKeyhole />
            <input name="password" type={show ? 'text' : 'password'} placeholder="Mínimo 6 caracteres" minLength={6} required
            />

            <button
              type="button"
              onClick={() => setShow(!show)}>
              {show ? <EyeOff /> : <Eye />}
            </button>
          </div>
        </label>

        <button className="login-submit"
          disabled={loading}>
          {loading ? 'Ingresando…' : <>Ingresar al panel <ArrowRight />
          </>}
        </button>

        <p className="login-help">¿No podés ingresar? Contactá al administrador del sistema.</p>
      </form>
    </section>
  </div>;
}
