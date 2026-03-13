// Barrel export for backward compatibility
// Re-export all actions from the admin domain

export {
  createAdmin,
  updateAdmin,
  deleteAdmin,
  resetAdminPassword,
  getAllAdmins
} from './admin/actions';

// Re-export types
export type { AdminData } from './types';
