export function deriveClassIdsBySelection(
  availableClasses: { id: string; name: string; kelompok_id?: string; desa_id?: string }[],
  selectedClassNames: string[],
  selectedScopeIds: string[],
  scopeKey: 'kelompok_id' | 'desa_id'
): string[] {
  if (selectedClassNames.length === 0) return []
  const nameSet = new Set(selectedClassNames)
  return availableClasses
    .filter(cls => nameSet.has(cls.name))
    .filter(cls => selectedScopeIds.length === 0 || selectedScopeIds.includes(cls[scopeKey] ?? ''))
    .map(cls => cls.id)
}
