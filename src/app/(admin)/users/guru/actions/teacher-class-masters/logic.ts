export interface ClassMasterAssignmentInput {
  classMasterId: string
  customClassNames?: string[] | null
}

export function buildClassMasterMappings(
  teacherId: string,
  assignments: ClassMasterAssignmentInput[]
): Array<{ teacher_id: string; class_master_id: string; custom_class_names: string[] | null }> {
  return assignments.map(a => ({
    teacher_id: teacherId,
    class_master_id: a.classMasterId,
    custom_class_names: a.customClassNames && a.customClassNames.length > 0 ? a.customClassNames : null,
  }))
}

export function mapTeacherClassMastersToResult(raw: any[]) {
  return (raw || []).map(tcm => {
    const cm = Array.isArray(tcm.class_masters) ? tcm.class_masters[0] : tcm.class_masters
    return {
      id: tcm.id,
      class_master_id: tcm.class_master_id,
      class_master_name: cm?.name || '',
      custom_class_names: tcm.custom_class_names ?? null,
    }
  })
}

