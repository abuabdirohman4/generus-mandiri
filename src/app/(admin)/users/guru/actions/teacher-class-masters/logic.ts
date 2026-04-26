export function buildClassMasterMappings(
  teacherId: string,
  classMasterIds: string[]
): Array<{ teacher_id: string; class_master_id: string }> {
  return classMasterIds.map(cmId => ({ teacher_id: teacherId, class_master_id: cmId }))
}

export function mapTeacherClassMastersToResult(raw: any[]) {
  return (raw || []).map(tcm => {
    const cm = Array.isArray(tcm.class_masters) ? tcm.class_masters[0] : tcm.class_masters
    return {
      id: tcm.id,
      class_master_id: tcm.class_master_id,
      class_master_name: cm?.name || '',
    }
  })
}
