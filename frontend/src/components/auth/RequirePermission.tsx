import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { type AccessLevel, type ModuleKey, getModuleLabel } from '../../lib/permissions';

interface RequirePermissionProps {
  module: ModuleKey;
  minLevel?: AccessLevel;
  alsoRequire?: { module: ModuleKey; minLevel?: AccessLevel };
  children: React.ReactNode;
}

export function RequirePermission({
  module,
  minLevel = 'view',
  alsoRequire,
  children,
}: RequirePermissionProps) {
  const { hasPermission } = useAuth();

  const primaryOk = hasPermission(module, minLevel);
  const secondaryOk = alsoRequire
    ? hasPermission(alsoRequire.module, alsoRequire.minLevel || 'view')
    : true;

  if (!primaryOk || !secondaryOk) {
    return (
      <div className="max-w-lg mx-auto mt-16 bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-xs">
        <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-sm text-slate-500 mt-2">
          You do not currently have permission to access the{' '}
          <span className="font-semibold text-slate-700">
            {getModuleLabel(module)}
          </span>{' '}
          module. Ask your workspace administrator to grant you access.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
