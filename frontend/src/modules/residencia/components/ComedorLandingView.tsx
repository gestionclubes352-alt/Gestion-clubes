import React from 'react';

const ComedorLandingView: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
    <div className="text-center space-y-6 max-w-sm">
      <i className="fa-solid fa-utensils text-5xl text-[var(--accent)]"></i>
      <h1 className="text-xl font-black uppercase tracking-tighter text-[var(--text-strong)]">Registro de comedor</h1>
      <ol className="text-left text-sm text-slate-600 space-y-3 list-decimal list-inside">
        <li>Abre <b>tu enlace personal</b> (el que guardaste en el móvil, o el del papel que te dieron).</li>
        <li>Pulsa <b>"Registrar mi entrada"</b>.</li>
      </ol>
      <p className="text-xs text-slate-400">¿No tienes tu enlace? Habla con el responsable de residencia.</p>
    </div>
  </div>
);

export default ComedorLandingView;
