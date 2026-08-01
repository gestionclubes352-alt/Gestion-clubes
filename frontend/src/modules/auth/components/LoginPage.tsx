/**
 * @fileoverview Pantalla de Login universal
 * @description Autenticación real contra Supabase Auth (@context/AuthContext).
 * Cualquiera puede registrarse (signUp); la cuenta nueva queda `Pendiente`
 * (trigger `handle_new_user` en la tabla `usuarios`) hasta que un
 * administrador/responsable la aprueba y le asigna rol desde Usuarios.
 *
 * Flujo:
 *   1. Login con email/password (signIn) o registro (signUp)
 *   2. Se carga el perfil (tabla `usuarios`): rol, estado, club_id
 *   3. Si el perfil no existe o no está Activo → pantalla informativa
 *   4. Si está Activo → entra directo a la app (club_id de su ficha)
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@context/AuthContext';

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const { signIn, signUp, signOut, user, perfil, loading, perfilLoading } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isEntering, setIsEntering] = useState(false);

  const [nombre, setNombre] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signUpError, setSignUpError] = useState<string | null>(null);
  const [signUpDone, setSignUpDone] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);

  const switchMode = (next: 'login' | 'signup') => {
    setMode(next);
    setError(null);
    setSignUpError(null);
    setSignUpDone(false);
  };

  // Una vez autenticado y con perfil activo, entra directo a la app.
  useEffect(() => {
    if (loading || perfilLoading || !user || !perfil) return;
    if (perfil.estado === 'Activo') {
      navigate('/', { replace: true });
    }
  }, [loading, perfilLoading, user, perfil, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEntering(true);
    setError(null);
    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError(t('login.wrongCredentials'));
    }
    setIsEntering(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError(null);

    if (!nombre.trim()) { setSignUpError(t('login.nameRequired')); return; }
    if (!email.trim()) { setSignUpError(t('login.emailRequired')); return; }
    if (password.length < 6) { setSignUpError(t('login.passwordMin')); return; }
    if (password !== confirmPassword) { setSignUpError(t('login.passwordMismatch')); return; }

    setIsSigningUp(true);
    const { error: signUpErr } = await signUp(email, password, nombre);
    setIsSigningUp(false);

    if (signUpErr) {
      setSignUpError(t('login.createAccountError'));
      return;
    }
    setSignUpDone(true);
  };

  /* ═══════════════════════════════════════════════════════════════ */
  /* PANTALLA: Cargando sesión existente                             */
  /* ═══════════════════════════════════════════════════════════════ */
  if (loading || (user && perfilLoading)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex items-center justify-center p-4">
        <i className="fa-solid fa-spinner fa-spin text-3xl text-slate-500"></i>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════ */
  /* PANTALLA: Autenticado pero sin acceso (sin perfil / no activo)  */
  /* ═══════════════════════════════════════════════════════════════ */
  if (user && (!perfil || perfil.estado !== 'Activo')) {
    const message = !perfil
      ? t('login.accountNotRegistered')
      : perfil.estado === 'Pendiente'
        ? t('pending.adminApproval')
        : t('pending.inactive');

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src="/logo.svg" alt="Sport Management" className="h-12 w-auto max-w-full mx-auto mb-4 brightness-0 invert" />
          </div>
          <div className="bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/30 border border-slate-700/50 p-8 text-center animate-fade-in">
            <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fa-solid fa-clock text-3xl text-amber-400"></i>
            </div>
            <h2 className="text-xl font-black text-slate-100 uppercase tracking-tight mb-2">
              {t('pending.title')}
            </h2>
            <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
              {message}
            </p>
            <div className="bg-slate-700/50 rounded-2xl p-4 mb-6 border border-slate-600/50">
              <div className="flex items-center justify-center gap-3 text-sm text-slate-300">
                <i className="fa-solid fa-envelope text-slate-500"></i>
                <span className="font-bold">{user.email}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] bg-slate-600 text-white hover:bg-slate-500 transition-all"
            >
              <i className="fa-solid fa-arrow-right-from-bracket mr-2"></i>
              {t('header.logout')}
            </button>
          </div>
          <p className="text-center mt-6 text-[9px] font-bold text-slate-600 uppercase tracking-[0.3em]">
            Sports Management · v1.0
          </p>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════ */
  /* PANTALLA PRINCIPAL: Login universal / Registro                  */
  /* ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.svg" alt="Sport Management" className="h-12 w-auto max-w-full mx-auto mb-4 brightness-0 invert" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em] mt-1">
            Sports Management Platform
          </p>
        </div>

        <div className="bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/30 border border-slate-700/50 p-8">
          {mode === 'login' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] mb-2">
                  {t('common.email')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu.email@ejemplo.com"
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-600 bg-slate-700/50 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sport-primary/30 focus:border-sport-primary transition-all"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] mb-2">
                  {t('login.password')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-600 bg-slate-700/50 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sport-primary/30 focus:border-sport-primary transition-all"
                  required
                />
              </div>

              {error && (
                <div className="p-3 bg-red-900/30 border border-red-800/50 rounded-xl text-center">
                  <span className="text-xs font-bold text-red-400">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isEntering}
                className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-3 bg-sport-primary text-white shadow-xl shadow-sport-primary/30 hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEntering ? (
                  <><i className="fa-solid fa-spinner fa-spin"></i> {t('login.verifying')}</>
                ) : (
                  <><i className="fa-solid fa-right-to-bracket"></i> {t('login.loginButton')}</>
                )}
              </button>

              <p className="text-center text-xs text-slate-500 pt-2">
                {t('login.noAccount')}{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="font-black text-sport-primary hover:underline"
                >
                  {t('login.createAccount')}
                </button>
              </p>
            </form>
          ) : signUpDone ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                <i className="fa-solid fa-circle-check text-2xl text-emerald-400"></i>
              </div>
              <h2 className="text-lg font-black text-slate-100 uppercase tracking-tight">
                {t('login.accountCreated')}
              </h2>
              <p className="text-sm text-slate-400">
                {t('pending.adminApproval')}
              </p>
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] bg-slate-600 text-white hover:bg-slate-500 transition-all"
              >
                {t('login.backToLogin')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4">
              <h2 className="text-center text-sm font-black text-slate-200 uppercase tracking-widest mb-2">
                {t('login.requestAccess')}
              </h2>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] mb-2">
                  {t('login.fullName')}
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder={t('login.yourFullName')}
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-600 bg-slate-700/50 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sport-primary/30 focus:border-sport-primary transition-all"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] mb-2">
                  {t('common.email')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu.email@ejemplo.com"
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-600 bg-slate-700/50 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sport-primary/30 focus:border-sport-primary transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] mb-2">
                  {t('login.password')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t('login.passwordPlaceholder')}
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-600 bg-slate-700/50 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sport-primary/30 focus:border-sport-primary transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] mb-2">
                  {t('login.confirmPassword')}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder={t('login.repeatPassword')}
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-600 bg-slate-700/50 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sport-primary/30 focus:border-sport-primary transition-all"
                  required
                />
              </div>

              {signUpError && (
                <div className="p-3 bg-red-900/30 border border-red-800/50 rounded-xl text-center">
                  <span className="text-xs font-bold text-red-400">{signUpError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSigningUp}
                className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-3 bg-sport-primary text-white shadow-xl shadow-sport-primary/30 hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSigningUp ? (
                  <><i className="fa-solid fa-spinner fa-spin"></i> {t('login.creatingAccount')}</>
                ) : (
                  <><i className="fa-solid fa-user-plus"></i> {t('login.createAccount')}</>
                )}
              </button>

              <p className="text-center text-xs text-slate-500 pt-2">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="font-black text-sport-primary hover:underline"
                >
                  {t('login.backToLogin')}
                </button>
              </p>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-[9px] font-bold text-slate-600 uppercase tracking-[0.3em]">
          Sports Management · v1.0
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
