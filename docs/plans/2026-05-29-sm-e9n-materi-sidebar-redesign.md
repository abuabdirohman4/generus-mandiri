# Plan: Materi Page Sidebar Redesign — Role-based Tab & Grouped Table View

**Date:** 2026-05-29
**Feature:** Materi sidebar role-based tab + grouped-by-type content view
**Branch:** `feat/sm-TBD-materi-sidebar-redesign`

---

## Context

Halaman `/materi` saat ini memiliki sidebar dengan 2 tab ("Kategori" dan "Kelas") yang selalu tampil untuk semua user. Masalah:

1. Tab "Kelas" tidak berguna untuk admin yang hanya butuh manage kategori/materi
2. Tab "Kategori" tidak relevan untuk guru yang hanya ingin lihat materi per kelas
3. Content view saat ini berupa satu flat table — tidak intuitif, tidak grouped per tipe
4. Tidak ada "Semua Kategori" entry di sidebar tree
5. `filteredItemsForClassMode` redundant — logic duplikat dengan `filteredItems`

**Tujuan redesign:**
- **Admin/canManage**: sidebar tampilkan 2 tab — "Kategori" (CRUD existing) + "Kelas" (list kelas)
- **Guru/tidak canManage**: sidebar hanya tampilkan tab "Kelas", langsung aktif
- **Tab "Kelas"**: list nama kelas di sidebar → klik → content area tampilkan grouped tables per tipe materi
- **Content saat tab Kelas + kelas dipilih**: filter bar (Kategori dropdown + Semester + Bulan) + tabel-tabel per tipe (grouped, kolom sama: Nama/Semester/Bulan/Kelas + action)
- **Default state**: semua kategori, semester aktif, bulan aktif
- **Belum pilih kelas**: empty state "Pilih kelas di sidebar"

---

## Affected Files

| File | Change |
|------|--------|
| `src/app/(admin)/materi/stores/materiStore.ts` | Add `activeTab: 'kategori' \| 'kelas'` to filters |
| `src/app/(admin)/materi/components/layout/MateriSidebar.tsx` | Role-based tabs, "Semua Kategori" entry, Kelas tab as simple list |
| `src/app/(admin)/materi/components/layout/MaterialsPageClient.tsx` | Pass `canManage` + `activeTab` to sidebar; init tab per role |
| `src/app/(admin)/materi/components/views/MateriContentView.tsx` | Add grouped-by-type rendering for Kelas mode; add Kategori dropdown filter |
| `src/app/(admin)/materi/components/views/MateriKelasView.tsx` | **NEW** — dedicated view for tab Kelas (grouped tables per tipe) |

---

## Task Breakdown

### Task 1 — Update `materiStore.ts`: tambah `activeTab`

**File:** `src/app/(admin)/materi/stores/materiStore.ts`

Tambah field `activeTab` ke `MateriFilters`:

```typescript
// BEFORE (line 4-13):
export interface MateriFilters {
    viewMode: 'by_material' | 'by_class'
    selectedCategoryId: string | null
    ...
}

// AFTER:
export interface MateriFilters {
    viewMode: 'by_material' | 'by_class'  // keep for backward compat, will be derived
    activeTab: 'kategori' | 'kelas'        // NEW: which sidebar tab is active
    selectedCategoryId: string | null
    selectedTypeId: string | null
    selectedClassId: string | null
    selectedSemester: 1 | 2 | null
    selectedMonth: number | null
    searchQuery: string
    sidebarCollapsed: boolean
}
```

Update `defaultFilters` (line 33):
```typescript
const defaultFilters: MateriFilters = {
    viewMode: 'by_material',
    activeTab: 'kategori',      // default to kategori tab
    selectedCategoryId: null,
    selectedTypeId: null,
    selectedClassId: null,
    selectedSemester: getCurrentSemester(),
    selectedMonth: null,        // CHANGE: no default month, show all months
    searchQuery: '',
    sidebarCollapsed: false
}
```

Update persist partialize (line 72-84) — persist `activeTab`:
```typescript
partialize: (state) => ({
    filters: {
        viewMode: state.filters.viewMode,
        activeTab: state.filters.activeTab,    // NEW: persist tab
        sidebarCollapsed: state.filters.sidebarCollapsed,
        selectedSemester: state.filters.selectedSemester,
        selectedMonth: state.filters.selectedMonth,
        selectedCategoryId: null,
        selectedTypeId: null,
        selectedClassId: null,
        searchQuery: ''
    },
    columnVisibility: state.columnVisibility,
})
```

**TDD:** SKIP (trivial store update — pure type/default value change, no logic)

---

### Task 2 — Update `MaterialsPageClient.tsx`: init tab per role + pass activeTab ke sidebar

**File:** `src/app/(admin)/materi/components/layout/MaterialsPageClient.tsx`

**2a. Auto-set tab based on role** — add useEffect after line 74 (`const { filters } = useMateriStore()`):

```typescript
const { filters, setFilter } = useMateriStore()

// Auto-set active tab based on role:
// - canManage: default 'kategori' (keep as-is)
// - !canManage (guru): force 'kelas' tab
useEffect(() => {
    if (!canManage && filters.activeTab !== 'kelas') {
        setFilter('activeTab', 'kelas')
        setFilter('viewMode', 'by_class')
    }
}, [canManage])
```

**2b. Data loading** — update `loadSidebarData` (lines 87-133) to also load classes when `activeTab === 'kelas'`:

```typescript
// BEFORE: loads classes only when viewMode === 'by_class'
// AFTER: always load classes (needed for Kelas tab sidebar list)
// Keep existing logic but ensure classes always loaded

useEffect(() => {
    loadSidebarData()
}, [filters.viewMode, filters.activeTab])  // add activeTab dependency
```

**2c. Pass `canManage` to `MateriSidebar`** — find `<MateriSidebar` in JSX (around line 370-390) and add prop:

```typescript
<MateriSidebar
    ...existing props...
    canManage={canManage}    // NEW prop
/>
```

---

### Task 3 — Update `MateriSidebar.tsx`: role-based tabs + "Semua Kategori" + simple Kelas list

**File:** `src/app/(admin)/materi/components/layout/MateriSidebar.tsx`

**3a. Add `canManage` prop** — update interface (line 17-27):

```typescript
interface MateriSidebarProps {
    categories: MaterialCategory[];
    types: MaterialType[];
    items: MaterialItem[];
    classes: ClassMaster[];
    monthsByItemId: Record<string, Array<{ class_master_id: string; semester: number; month: number }>>;
    isOpen: boolean;
    onToggle: () => void;
    isLoading?: boolean;
    onDataChange?: () => Promise<void>;
    canManage?: boolean;    // NEW
}
```

**3b. Replace View Mode Toggle** (lines 345-359) with role-based tabs:

```tsx
{/* Sidebar Tabs — role-based */}
<div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
    {canManage && (
        <button
            onClick={() => {
                setFilter('activeTab', 'kategori')
                setFilter('viewMode', 'by_material')
            }}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                filters.activeTab === 'kategori'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
        >
            Kategori
        </button>
    )}
    <button
        onClick={() => {
            setFilter('activeTab', 'kelas')
            setFilter('viewMode', 'by_class')
            setFilter('selectedCategoryId', null)
            setFilter('selectedTypeId', null)
        }}
        className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            filters.activeTab === 'kelas'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
        }`}
    >
        Kelas
    </button>
</div>
```

**3c. Add "Semua Kategori" entry** — di atas category tree, tepat sebelum `{categories.sort(...)` (line 379):

```tsx
{/* Semua Kategori entry */}
<div className="mb-2">
    <div
        onClick={() => {
            setFilter('selectedCategoryId', null)
            setFilter('selectedTypeId', null)
            if (isMobile()) onToggle()
        }}
        className={`flex items-center gap-2 px-1 py-2 rounded-lg cursor-pointer transition-colors ${
            !filters.selectedCategoryId && !filters.selectedTypeId
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
        }`}
    >
        <div className="shrink-0 w-5 h-5" />
        <div className="shrink-0 text-gray-400 dark:text-gray-500">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
        </div>
        <div className="flex-1 text-sm font-medium">Semua Kategori</div>
        <div className="shrink-0 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
            {items.length}
        </div>
    </div>
</div>
```

**3d. Replace by_class tree (semesters/nested)** — Replace the entire by_class section (lines 513-614) with simple class list:

```tsx
) : (
    // Tab Kelas — simple class list
    <>
        {classes.map(cls => {
            const isSelected = filters.selectedClassId === cls.id
            const itemCount = items.filter(i => i.classes?.some(c => c.id === cls.id)).length

            return (
                <div key={cls.id} className="mb-1">
                    <div
                        onClick={() => {
                            setFilter('selectedClassId', cls.id)
                            setFilter('viewMode', 'by_class')
                            if (isMobile()) onToggle()
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                            isSelected
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                    >
                        <div className="shrink-0 text-blue-500 dark:text-blue-400">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                            </svg>
                        </div>
                        <div className="flex-1 text-sm font-medium">{cls.name}</div>
                        <div className="shrink-0 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                            {itemCount}
                        </div>
                    </div>
                </div>
            )
        })}
    </>
)
```

**3e. Remove now-unused state/functions** (by_class semester logic):
- Remove `expandedClasses` state (line 122)
- Remove `toggleClassExpand` (lines 124-132)
- Remove `expandedSemesters` state (lines 135-137)
- Remove `toggleSemesterExpand` (lines 139-152)
- Remove `isSemesterExpanded` (lines 154-156)
- Remove `getItemsBySemesterForClass` (lines 160-177)
- Remove `getTypesForSemesterInClass` (lines 179-188)
- Remove `getItemCountForTypeInSemester` (lines 190-212)
- Remove `handleSemesterTypeClick` (lines 204-212)
- Remove `SemesterSection` import (line 8)

Also remove `handleClassTypeClick` (lines 113-120) — no longer needed since Kelas tab only sets `selectedClassId`.

**TDD:** SKIP (pure UI restructure — presentational component, no extractable logic)

---

### Task 4 — Create `MateriKelasView.tsx`: grouped tables per tipe materi

**File:** `src/app/(admin)/materi/components/views/MateriKelasView.tsx` (NEW FILE)

This component renders content when tab Kelas is active.

**Props:**
```typescript
interface MateriKelasViewProps {
    categories: MaterialCategory[]
    types: MaterialType[]
    items: MaterialItem[]
    classMasters: ClassMaster[]
    monthsByItemId: Record<string, Array<{ class_master_id: string; semester: number; month: number }>>
    userProfile: any
    onEditItem?: (item: MaterialItem) => void
    onDeleteItem?: (item: MaterialItem) => void
    onViewItem?: (item: MaterialItem) => void
    selectedIds?: Set<string>
    onToggleSelection?: (id: string) => void
    onToggleAll?: (selected: boolean, itemIds: string[]) => void
    onBulkEdit?: () => void
}
```

**Logic — filter items:**
```typescript
// 1. Filter by selected class (required — show empty state if not selected)
// 2. Filter by selected category (from filter bar dropdown)
// 3. Filter by semester + month (from filter bar)
// 4. Filter by search query

const filteredItems = useMemo(() => {
    if (!filters.selectedClassId) return []

    let result = items.filter(item =>
        item.classes?.some(c => c.id === filters.selectedClassId)
    )

    // Category filter (if not "Semua Kategori")
    if (filters.selectedCategoryId) {
        const typeIds = types
            .filter(t => t.category_id === filters.selectedCategoryId)
            .map(t => t.id)
        result = result.filter(i => typeIds.includes(i.material_type_id))
    }

    // Semester + month filter via targetItemIds (same pattern as MateriContentView)
    if (filters.selectedSemester && filters.selectedMonth) {
        result = result.filter(item => targetItemIds.has(item.id))
    } else if (filters.selectedSemester) {
        result = result.filter(item => {
            const targets = monthsByItemId[item.id] || []
            return targets.some(t =>
                t.semester === filters.selectedSemester &&
                t.class_master_id === filters.selectedClassId
            )
        })
    }

    return result
}, [items, filters, types, targetItemIds, monthsByItemId])
```

**Logic — group by type:**
```typescript
// Group filteredItems by material type (same pattern as monitoring/page.tsx)
const groupedByType = useMemo(() => {
    const grouped: Record<string, { type: MaterialType | undefined; items: MaterialItem[] }> = {}

    filteredItems.forEach(item => {
        const type = types.find(t => t.id === item.material_type_id)
        const typeId = item.material_type_id
        if (!grouped[typeId]) {
            grouped[typeId] = { type, items: [] }
        }
        grouped[typeId].items.push(item)
    })

    // Sort by type display_order
    return Object.entries(grouped)
        .sort(([, a], [, b]) => {
            const orderA = a.type?.display_order ?? 999
            const orderB = b.type?.display_order ?? 999
            return orderA - orderB
        })
}, [filteredItems, types])
```

**Render structure:**
```tsx
return (
    <div className="space-y-6">
        {/* Filter bar */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 border-b border-gray-200 dark:border-gray-700 pb-4">
            {/* Kategori dropdown */}
            <InputFilter
                id="kategori-filter"
                label="Kategori"
                value={filters.selectedCategoryId || ''}
                onChange={(val) => setFilter('selectedCategoryId', val || null)}
                allOptionLabel="Semua Kategori"
                options={categories.map(c => ({ value: c.id, label: c.name }))}
                widthClassName="w-48"
                variant="modal"
                compact
            />
            {/* Semester dropdown */}
            <InputFilter ... />
            {/* Bulan dropdown */}
            <InputFilter ... />
        </div>

        {/* Empty state — no class selected */}
        {!filters.selectedClassId && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-16 text-center">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" ...school icon... />
                <p className="text-gray-500 dark:text-gray-400 font-medium">Pilih kelas di sidebar</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Klik nama kelas di sebelah kiri untuk melihat materinya
                </p>
            </div>
        )}

        {/* Class selected but no items */}
        {filters.selectedClassId && filteredItems.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Tidak ada materi untuk filter yang dipilih
                </p>
            </div>
        )}

        {/* Grouped tables — one per type */}
        {filters.selectedClassId && groupedByType.map(([typeId, { type, items: typeItems }]) => (
            <div key={typeId} className="mb-6 last:mb-0">
                {/* Type header */}
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                    {type?.name || 'Lainnya'}
                    <span className="ml-2 text-sm font-normal text-gray-500">({typeItems.length})</span>
                </h3>

                {/* Table for this type */}
                <MateriTable
                    items={typeItems}
                    onEdit={onEditItem}
                    onDelete={onDeleteItem}
                    onView={onViewItem}
                    selectedIds={selectedIds}
                    onToggleSelection={onToggleSelection}
                    onToggleAll={(selected) => onToggleAll?.(selected, typeItems.map(i => i.id))}
                    showTargetBadge={!!(filters.selectedSemester && filters.selectedMonth)}
                    selectedMonth={filters.selectedMonth}
                    monthsByItemId={monthsByItemId}
                    showClassColumn={false}           // No need — already filtered by class
                    showSemesterColumn={columnVisibility.showSemesterColumn}
                    showMonthColumn={columnVisibility.showMonthColumn}
                />
            </div>
        ))}
    </div>
)
```

**TDD:** SKIP (presentational — no extractable business logic; grouping logic is a simple reduce, already tested pattern in monitoring)

---

### Task 5 — Update `MaterialsPageClient.tsx`: conditional render Kategori vs Kelas view

**File:** `src/app/(admin)/materi/components/layout/MaterialsPageClient.tsx`

**5a. Import new component** (top of file):
```typescript
import MateriKelasView from '../views/MateriKelasView'
```

**5b. Replace `<MateriContentView>` render** — conditional based on `filters.activeTab`:

Find the section where `<MateriContentView>` is rendered (around line 380-430) and replace:

```tsx
{/* Content area — conditional on active tab */}
{filters.activeTab === 'kelas' ? (
    <MateriKelasView
        categories={categories}
        types={types}
        items={items}
        classMasters={classMasters}
        monthsByItemId={monthsByItemId}
        userProfile={userProfile}
        onEditItem={canManage ? handleEditItem : undefined}
        onDeleteItem={canManage ? handleDeleteItem : undefined}
        onViewItem={handleViewContent}
        selectedIds={selectedItemIds}
        onToggleSelection={handleToggleSelection}
        onToggleAll={handleToggleAll}
        onBulkEdit={canManage && selectedItemIds.size > 0 ? handleBulkEdit : undefined}
    />
) : (
    <MateriContentView
        ...existing props unchanged...
    />
)}
```

**5c. Update `loadSidebarData`** — ensure classes always loaded (not just for by_class):

```typescript
// Around line 87-133, the useEffect that calls loadSidebarData
// Change: always load classes (needed for Kelas tab sidebar)
// Current code loads classes only when viewMode === 'by_class'
// After: load classes unconditionally (or when activeTab can be 'kelas')

// Easiest fix: call getAllClasses() always alongside categories/types
```

Exact change in `loadSidebarData` function: find the `if (filters.viewMode === 'by_class')` branch that fetches classes, and move `getAllClasses()` call to always run (outside the if block).

---

### Task 6 — Update `MateriContentView.tsx`: add Kategori dropdown to filter bar

**File:** `src/app/(admin)/materi/components/views/MateriContentView.tsx`

The existing content view (used for tab "Kategori") currently has Semester + Bulan + Kelas filters. Add Kategori dropdown.

**Update filter bar** (lines 235-285 — the `<div className="grid ...">` section):

Change from `grid-cols-2 md:grid-cols-3` to `grid-cols-2 md:grid-cols-4` and add Kategori as first filter:

```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-b border-gray-200 dark:border-gray-700">
    {/* NEW: Kategori filter */}
    <InputFilter
        id="kategori-filter"
        label="Kategori"
        value={filters.selectedCategoryId || ''}
        onChange={(val) => {
            setFilter('selectedCategoryId', val || null)
            setFilter('selectedTypeId', null)  // clear type when category changes
        }}
        allOptionLabel="Semua Kategori"
        options={categories.map(c => ({ value: c.id, label: c.name }))}
        widthClassName="w-48"
        variant="modal"
        compact
    />
    {/* existing: Semester, Bulan, Kelas — unchanged */}
    ...
```

Also remove the `{filters.viewMode === 'by_material' && (...Kelas filter...)}` conditional wrapper — show Kelas filter always since viewMode is always by_material in this view now.

---

### Task 7 — Cleanup: remove dead code

**File:** `src/app/(admin)/materi/components/views/MateriContentView.tsx`

Remove `filteredItemsForClassMode` useMemo (lines 69-121) — no longer used since by_class rendering moved to `MateriKelasView`.

Remove from JSX the ternary `{filters.viewMode === 'by_material' ? (...) : (...)}` — replace with direct render of the by_material table.

Remove `filters.viewMode` dependency from useEffect on line 67 (not needed anymore).

**File:** `src/app/(admin)/materi/stores/materiStore.ts`

`viewMode` field can be kept for backward compat (persisted values), but `activeTab` is the new source of truth. Add comment.

---

## Implementation Order

```
Task 1 → Task 2 (partial: data loading) → Task 3 → Task 4 → Task 5 → Task 6 → Task 7
```

Run after each task:
```bash
npm run type-check
```

Run after all tasks:
```bash
npm run build
```

---

## Verification Steps

1. **Admin user (canManage=true)**:
   - Sidebar menampilkan 2 tab: "Kategori" dan "Kelas"
   - Tab "Kategori" aktif by default
   - Tab "Kategori" → tree kategori + "Semua Kategori" di atas → CRUD tetap berfungsi
   - Tab "Kelas" → list nama kelas → klik kelas → content area grouped tables
   - Filter Kategori/Semester/Bulan di content area berfungsi

2. **Guru user (canManage=false)**:
   - Sidebar hanya menampilkan tab "Kelas" (tanpa tab "Kategori")
   - Langsung aktif di tab Kelas
   - Empty state muncul sebelum pilih kelas
   - Setelah klik kelas, grouped tables tampil

3. **Default state saat pilih kelas**:
   - Semester aktif ter-set (Semester 1 jika bulan Juli-Desember, Semester 2 jika Jan-Juni)
   - Bulan: null (Semua Bulan)
   - Kategori: null (Semua Kategori)

4. **TypeScript**: `npm run type-check` must pass with 0 errors

5. **Build**: `npm run build` must succeed

---

## CLAUDE.md Check
- [ ] Apakah ada pattern/arsitektur BARU yang diperkenalkan di task ini?
  - Ya: Role-based sidebar tabs pattern — `canManage` controls tab visibility
- [ ] Apakah ada tabel database baru? No.
- [ ] Apakah ada route/page baru? No.
- [ ] Apakah ada permission pattern baru?
  - Tidak baru, tapi perlu dokumentasikan bahwa `canManageMaterials` sekarang juga mengontrol sidebar tab visibility
- [ ] Update needed: Jika ada → update `docs/claude/architecture-patterns.md` section Material Management Permissions setelah implementasi

---

## Commit Message Template

```
feat(materi): role-based sidebar tabs + grouped-by-type kelas view

- Sidebar shows 'Kategori' + 'Kelas' tabs for admins; only 'Kelas' for teachers
- Kelas tab: simple class list → click → grouped tables per material type
- Add "Semua Kategori" entry at top of category tree
- Add Kategori dropdown filter to content views
- Remove complex nested semester/class tree from sidebar

Fixes #[GH_NUMBER]

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
