import * as schema from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import {
  AccessLevel,
  AuthUser,
  getPermissionScope,
  hasPermission,
} from './permissions';

/**
 * Resolves whether a user can access a specific project and at what capability.
 * - Administrators & users with 'projects' module (scope 'all') get module-level access across tenant projects.
 * - Users with 'projects' module (scope 'assigned') OR baseline team members ('employee'/'freelancer')
 *   can access projects where they exist in project_team.
 * - Clients can only read/interact with their own client projects.
 */
export async function canAccessProject(
  db: any,
  user: AuthUser,
  projectId: number,
  requiredProjectLevel: AccessLevel = 'view'
): Promise<{ allowed: boolean; isAssigned: boolean; isClientOwner: boolean }> {
  const [project] = await db
    .select({
      id: schema.projects.id,
      tenantId: schema.projects.tenantId,
      clientId: schema.projects.clientId,
    })
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, projectId),
        eq(schema.projects.tenantId, user.tenantId),
        isNull(schema.projects.deletedAt)
      )
    )
    .limit(1);

  if (!project) {
    return { allowed: false, isAssigned: false, isClientOwner: false };
  }

  if (user.role === 'administrator') {
    return { allowed: true, isAssigned: true, isClientOwner: false };
  }

  if (user.role === 'client') {
    const [clientRecord] = await db
      .select({ id: schema.clients.id })
      .from(schema.clients)
      .where(
        and(
          eq(schema.clients.userId, user.id),
          eq(schema.clients.tenantId, user.tenantId)
        )
      )
      .limit(1);

    const isClientOwner = !!clientRecord && project.clientId === clientRecord.id;
    return { allowed: isClientOwner, isAssigned: false, isClientOwner };
  }

  const hasModuleAccess = hasPermission(user, 'projects', requiredProjectLevel);
  const scope = getPermissionScope(user, 'projects');

  if (hasModuleAccess && scope === 'all') {
    return { allowed: true, isAssigned: true, isClientOwner: false };
  }

  const [assignment] = await db
    .select({ id: schema.projectTeam.id })
    .from(schema.projectTeam)
    .where(
      and(
        eq(schema.projectTeam.projectId, projectId),
        eq(schema.projectTeam.userId, user.id)
      )
    )
    .limit(1);

  const isAssigned = !!assignment;

  if (requiredProjectLevel === 'view') {
    // Baseline team members can view projects they are assigned to
    return { allowed: isAssigned, isAssigned, isClientOwner: false };
  }

  // Mutations on project structure require explicit module permission AND assignment (when scoped)
  return {
    allowed: hasModuleAccess && isAssigned,
    isAssigned,
    isClientOwner: false,
  };
}
