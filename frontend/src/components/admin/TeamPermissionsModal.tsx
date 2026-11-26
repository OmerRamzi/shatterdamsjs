import { useState, useEffect } from 'react';
import { X, ShieldCheck, AlertTriangle, Loader2, Check } from 'lucide-react';
import {
  type AccessLevel,
  type DataScope,
  MODULE_DEFINITIONS,
  type ModuleKey,
  PERMISSION_PRESETS,
  type PermissionRowInput,
} from '../../lib/permissions';

interface TeamPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (
    updatedPermissions?: PermissionRowInput[],
    targetUserId?: number
  ) => void;
  member: {
    id: number;
    displayName: string;
    email: string;
    role: string;
    permissions?: PermissionRowInput[];
  } | null;
}

const GROUPS: Array<'CRM & Sales' | 'Financials & Billing' | 'Operations'> = [
  'CRM & Sales',
  'Financials & Billing',
  'Operations',
];

export function TeamPermissionsModal({
  isOpen,
  onClose,
  onSaved,
  member,
}: TeamPermissionsModalProps) {
  const [grants, setGrants] = useState<Record<string, PermissionRowInput>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !member) return;
    let active = true;
    const controller = new AbortController();
    setError('');
    setIsLoading(true);

    // Seed from passed member permissions first, then hydrate fresh from backend
    const initial: Record<string, PermissionRowInput> = {};
    if (Array.isArray(member.permissions)) {
      for (const p of member.permissions) {
        initial[p.moduleKey] = p;
      }
    }
    setGrants(initial);

    fetch(`/api/team/${member.id}/permissions`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load current permissions');
        }
        return data;
      })
      .then((data) => {
        if (!active) return;
        if (Array.isArray(data?.permissions)) {
          const fresh: Record<string, PermissionRowInput> = {};
          for (const p of data.permissions) {
            fresh[p.moduleKey] = {
              moduleKey: p.moduleKey,
              accessLevel: p.accessLevel,
              scope: p.scope || 'all',
            };
          }
          setGrants(fresh);
        }
      })
      .catch((err) => {
        if (!active || err?.name === 'AbortError') return;
        setError(err?.message || 'Failed to load latest permissions');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [isOpen, member]);

  if (!isOpen || !member) return null;

  const toggleModule = (key: ModuleKey, defaultScope: DataScope) => {
    setGrants((prev) => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = {
          moduleKey: key,
          accessLevel: 'manage',
          scope: defaultScope,
        };
      }
      return next;
    });
  };

  const updateLevel = (key: ModuleKey, accessLevel: AccessLevel) => {
    setGrants((prev) => {
      const existing = prev[key];
      if (!existing) return prev;
      return { ...prev, [key]: { ...existing, accessLevel } };
    });
  };

  const updateScope = (key: ModuleKey, scope: DataScope) => {
    setGrants((prev) => {
      const existing = prev[key];
      if (!existing) return prev;
      return { ...prev, [key]: { ...existing, scope } };
    });
  };

  const applyPreset = (presetPermissions: PermissionRowInput[]) => {
    const next: Record<string, PermissionRowInput> = {};
    for (const p of presetPermissions) {
      next[p.moduleKey] = { ...p };
    }
    setGrants(next);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');

    try {
      const payload = {
        permissions: Object.values(grants),
      };

      const res = await fetch(`/api/team/${member.id}/permissions`, {
        method: 'PUT',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update module permissions');
      }

      const savedPermissions = Array.isArray(data.permissions)
        ? data.permissions
        : payload.permissions;
      onSaved(savedPermissions, member.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error saving permissions');
    } finally {
      setIsSaving(false);
    }
  };

  const enabledCount = Object.keys(grants).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-yellow-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-heading">
                Module Access — {member.displayName}
              </h2>
              <p className="text-xs text-slate-500">
                {member.email} • <span className="capitalize">{member.role}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Presets Bar */}
        <div className="px-6 py-3.5 border-b border-slate-100 bg-white">
          <div className="text-[11px] font-semibold text-slate-500 mb-2">
            Quick Presets
          </div>
          <div className="flex flex-wrap gap-2">
            {PERMISSION_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.permissions)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-yellow-400/15 hover:border-yellow-400/60 text-xs font-semibold text-slate-700 transition-colors"
                title={preset.description}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600">
            All internal team members have baseline access to{' '}
            <strong className="text-slate-900">Assigned Projects</strong> and{' '}
            <strong className="text-slate-900">My Timesheets</strong>. Toggle
            additional system modules below to unlock them immediately in their workspace.
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
              <span>Loading current permissions...</span>
            </div>
          ) : (
            GROUPS.map((groupName) => {
              const mods = MODULE_DEFINITIONS.filter((m) => m.group === groupName);
              return (
                <div key={groupName} className="space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {groupName}
                  </h3>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {mods.map((mod) => {
                      const grant = grants[mod.key];
                      const enabled = Boolean(grant);

                      return (
                        <div
                          key={mod.key}
                          className={`p-4 transition-colors ${
                            enabled ? 'bg-amber-50/30' : 'bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-slate-900">
                                  {mod.label}
                                </span>
                                {mod.sensitive && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100/80 text-amber-800 text-[10px] font-semibold">
                                    <AlertTriangle className="w-2.5 h-2.5" />
                                    Sensitive
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {mod.description}
                              </p>
                            </div>

                            <button
                              type="button"
                              role="switch"
                              aria-checked={enabled}
                              onClick={() => toggleModule(mod.key, mod.defaultScope)}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-yellow-400 ${
                                enabled ? 'bg-slate-900' : 'bg-slate-200'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                                  enabled ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>

                          {enabled && grant && (
                            <div className="mt-3 pt-3 border-t border-slate-200/70 flex flex-wrap items-center gap-3 text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-500 font-medium">Level:</span>
                                <select
                                  value={grant.accessLevel}
                                  onChange={(e) =>
                                    updateLevel(mod.key, e.target.value as AccessLevel)
                                  }
                                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                >
                                  <option value="view">View Only (Read)</option>
                                  <option value="manage">Manage (Create & Edit)</option>
                                  <option value="full">Full Access (incl. Delete)</option>
                                </select>
                              </div>

                              {mod.supportsScope && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-500 font-medium">Records:</span>
                                  <select
                                    value={grant.scope}
                                    onChange={(e) =>
                                      updateScope(mod.key, e.target.value as DataScope)
                                    }
                                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                  >
                                    <option value="all">All Tenant Records</option>
                                    <option value="assigned">Assigned to Staff Only</option>
                                  </select>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500 font-medium">
            {enabledCount === 0
              ? 'No extra modules selected (baseline team only)'
              : `${enabledCount} module${enabledCount === 1 ? '' : 's'} granted`}
          </span>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-200/70 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs sm:text-sm font-bold bg-yellow-400 hover:bg-yellow-300 text-slate-950 transition-colors disabled:opacity-50 shadow-xs"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>{isSaving ? 'Saving...' : 'Save Module Access'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
