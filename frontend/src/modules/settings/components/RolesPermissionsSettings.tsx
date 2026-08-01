import React, { useState, useCallback, useEffect } from 'react';
import { ALL_MENU_ITEMS, MENU_SECTIONS } from '@shared/hooks/useMenuVisibility';

const ROLES = ['Responsable', 'Administrador', 'Tecnico'] as const;
type Role = typeof ROLES[number];

const ROLE_LABELS: Record<Role, string> = {
  Responsable: 'Responsable',
  Administrador: 'Administrador',
  Tecnico: 'Técnico',
};

const ROLE_COLORS: Record<Role, string> = {
  Responsable: 'text-violet-600 bg-violet-50 border-violet-200',
  Administrador: 'text-teal-600 bg-teal-50 border-teal-200',
  Tecnico: 'text-amber-600 bg-amber-50 border-amber-200',
};

const SECTION_LABELS: Record<string, string> = {
  general: 'General',
  management: 'Gestión',
  planning: 'Planificación',
  medical: 'Área Médica',
  tools: 'Herramientas',
  content: 'Contenido',
  admin: 'Administración',
};

const STORAGE_KEY = 'role-permissions';

type RolePermissions = Record<Role, Record<string, boolean>>;

const getDefaultPermissions = (): RolePermissions => {
  const permissions: RolePermissions = {
    Responsable: {},
    Administrador: {},
    Tecnico: {},
  };

  ALL_MENU_ITEMS.forEach(item => {
    // Responsable: acceso total
    permissions.Responsable[item.id] = true;
    // Administrador: todo menos Configuración
    permissions.Administrador[item.id] = item.id !== 'CONFIGURACIÓN';
    // Técnico: todo menos admin y herramientas
    permissions.Tecnico[item.id] = item.section !== 'admin' && item.section !== 'tools';
  });

  return permissions;
};

const loadPermissions = (): RolePermissions => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultPermissions();
    return { ...getDefaultPermissions(), ...JSON.parse(raw) };
  } catch {
    return getDefaultPermissions();
  }
};

const savePermissions = (p: RolePermissions) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
};

const RolesPermissionsSettings: React.FC = () => {
  const [permissions, setPermissions] = useState<RolePermissions>(loadPermissions);

  useEffect(() => {
    savePermissions(permissions);
  }, [permissions]);

  const togglePermission = useCallback((role: Role, menuId: string) => {
    // Responsable siempre tiene todo habilitado
    if (role === 'Responsable') return;
    // Configuración solo para Responsable
    if (menuId === 'CONFIGURACIÓN') return;

    setPermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [menuId]: !prev[role][menuId],
      },
    }));
  }, []);

  const toggleSectionForRole = useCallback((role: Role, sectionKey: string) => {
    if (role === 'Responsable') return;

    const sectionItems = ALL_MENU_ITEMS.filter(m => m.section === sectionKey && m.id !== 'CONFIGURACIÓN');
    const allEnabled = sectionItems.every(m => permissions[role][m.id]);

    setPermissions(prev => {
      const updated = { ...prev[role] };
      sectionItems.forEach(m => {
        updated[m.id] = !allEnabled;
      });
      return { ...prev, [role]: updated };
    });
  }, [permissions]);

  const handleReset = () => {
    const defaults = getDefaultPermissions();
    setPermissions(defaults);
    savePermissions(defaults);
  };

  const sections = MENU_SECTIONS.filter(s => ALL_MENU_ITEMS.some(m => m.section === s.key));

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">Roles y Permisos</h3>
            <p className="text-slate-500">Configura qué puede ver cada rol del sistema</p>
          </div>
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 hover:text-[var(--accent)] hover:border-[var(--accent)]/30 text-xs font-bold uppercase tracking-wider transition-all"
          >
            <i className="fa-solid fa-rotate-right mr-2"></i>
            Restablecer
          </button>
        </div>
      </div>

      {/* Cabecera de roles */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-[1fr_repeat(3,100px)] md:grid-cols-[1fr_repeat(3,140px)] items-center gap-0 px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Sección / Permiso
          </div>
          {ROLES.map(role => (
            <div key={role} className="text-center">
              <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${ROLE_COLORS[role]}`}>
                {ROLE_LABELS[role]}
              </span>
            </div>
          ))}
        </div>

        {/* Filas por sección */}
        {sections.map(section => {
          const sectionItems = ALL_MENU_ITEMS.filter(m => m.section === section.key);

          return (
            <div key={section.key}>
              {/* Fila de sección */}
              <div className="grid grid-cols-[1fr_repeat(3,100px)] md:grid-cols-[1fr_repeat(3,140px)] items-center gap-0 px-6 py-3 bg-slate-50/50 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black text-[var(--accent)] uppercase tracking-wider">
                    {SECTION_LABELS[section.key] || section.key}
                  </span>
                </div>
                {ROLES.map(role => {
                  const allEnabled = sectionItems.every(m => permissions[role][m.id]);
                  const someEnabled = sectionItems.some(m => permissions[role][m.id]);
                  const isLocked = role === 'Responsable';

                  return (
                    <div key={role} className="flex justify-center">
                      <button
                        onClick={() => toggleSectionForRole(role, section.key)}
                        disabled={isLocked}
                        className={`
                          w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all
                          ${isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:shadow-sm'}
                          ${allEnabled
                            ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                            : someEnabled
                              ? 'bg-[var(--accent)]/30 border-[var(--accent)]/50 text-white'
                              : 'bg-white border-slate-300'
                          }
                        `}
                      >
                        {allEnabled && <i className="fa-solid fa-check text-[10px]"></i>}
                        {!allEnabled && someEnabled && <i className="fa-solid fa-minus text-[10px]"></i>}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Filas de ítems individuales */}
              {sectionItems.map(item => (
                <div
                  key={item.id}
                  className="grid grid-cols-[1fr_repeat(3,100px)] md:grid-cols-[1fr_repeat(3,140px)] items-center gap-0 px-6 py-2.5 border-b border-slate-50 hover:bg-slate-50/30 transition-colors"
                >
                  <div className="flex items-center gap-3 pl-4">
                    <i className={`fa-solid ${item.icon} text-xs text-slate-400 w-4 text-center`}></i>
                    <span className="text-sm font-medium text-slate-600">{item.id}</span>
                  </div>
                  {ROLES.map(role => {
                    const enabled = permissions[role][item.id] ?? false;
                    const isLocked = role === 'Responsable' || item.id === 'CONFIGURACIÓN';

                    return (
                      <div key={role} className="flex justify-center">
                        <button
                          onClick={() => togglePermission(role, item.id)}
                          disabled={isLocked}
                          className={`
                            w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                            ${isLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:shadow-sm'}
                            ${enabled
                              ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                              : 'bg-white border-slate-300 hover:border-slate-400'
                            }
                          `}
                        >
                          {enabled && <i className="fa-solid fa-check text-[8px]"></i>}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Notas */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <i className="fa-solid fa-circle-info text-amber-500 mt-0.5"></i>
        <div className="text-sm text-amber-700">
          <p className="font-bold mb-1">Notas sobre los permisos</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>El rol <strong>Responsable</strong> siempre tiene acceso completo y no se puede modificar.</li>
            <li>La sección <strong>Configuración</strong> solo es accesible para el rol Responsable.</li>
            <li>Los cambios se guardan automáticamente.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RolesPermissionsSettings;
