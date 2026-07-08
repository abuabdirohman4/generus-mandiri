export interface ClassMasterAssignmentInput {
  classMasterId: string
  customClassName?: string | null
}

export function buildClassMasterMappings(
  teacherId: string,
  assignments: ClassMasterAssignmentInput[]
): Array<{ teacher_id: string; class_master_id: string; custom_class_name: string | null }> {
  return assignments.map(a => ({
    teacher_id: teacherId,
    class_master_id: a.classMasterId,
    custom_class_name: a.customClassName?.trim() || null,
  }))
}

export function mapTeacherClassMastersToResult(raw: any[]) {
  return (raw || []).map(tcm => {
    const cm = Array.isArray(tcm.class_masters) ? tcm.class_masters[0] : tcm.class_masters
    return {
      id: tcm.id,
      class_master_id: tcm.class_master_id,
      class_master_name: cm?.name || '',
      custom_class_name: tcm.custom_class_name ?? null,
    }
  })
}
