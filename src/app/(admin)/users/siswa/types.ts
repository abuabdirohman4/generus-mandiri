// src/app/(admin)/users/siswa/types.ts
// Re-export centralized types for backward compatibility

/**
 * IMPORTANT: All student types are now centralized in @/types/student
 * This file re-exports for backward compatibility.
 * New code should import directly from @/types/student
 */

export type {
  StudentBiodata,
  StudentBiodataFormData,
  BiodataFormTab,
  StudentBase,
  StudentWithOrg,
  StudentWithClasses,
} from '@/types/student'
