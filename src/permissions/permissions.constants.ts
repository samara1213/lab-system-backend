/**
 * Acciones que se pueden permitir sobre un modulo
 */
export const ACTIONS = ['view', 'create', 'update', 'delete'] as const;
export type Action = (typeof ACTIONS)[number];

/**
 * Slugs de los modulos (tabla "modules", sembrada por las migraciones)
 */
export const MODULES = {
  orders: 'orders',
  results: 'results',
  customers: 'customers',
  exams: 'exams',
  alliances: 'alliances',
  users: 'users',
  roles: 'roles',
  menus: 'menus',
  laboratories: 'laboratories',
  pdf_templates: 'pdf_templates',
} as const;
export type ModuleSlug = (typeof MODULES)[keyof typeof MODULES];

/**
 * Permiso requerido por un endpoint: "<modulo>:<accion>" (por ejemplo "orders:create")
 */
export type Permission = `${ModuleSlug}:${Action}`;

/**
 * Columna de role_permissions que corresponde a cada accion
 */
export const ACTION_COLUMN: Record<
  Action,
  'rpe_can_view' | 'rpe_can_create' | 'rpe_can_update' | 'rpe_can_delete'
> = {
  view: 'rpe_can_view',
  create: 'rpe_can_create',
  update: 'rpe_can_update',
  delete: 'rpe_can_delete',
};
