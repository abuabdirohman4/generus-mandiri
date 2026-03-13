// ─── Categories ───────────────────────────────────────────────────────────────
export {
    getMaterialCategories,
    createMaterialCategory,
    updateMaterialCategory,
    deleteMaterialCategory,
} from './categories/actions'

// ─── Types ────────────────────────────────────────────────────────────────────
export {
    getMaterialTypes,
    createMaterialType,
    updateMaterialType,
    deleteMaterialType,
} from './types/actions'

// ─── Items, Class Masters, Class Mappings, Day Assignments ────────────────────
export {
    getAvailableClassMasters,
    getAllClasses,
    getClassesWithMaterialItems,
    getMaterialItems,
    getAllMaterialItems,
    getMaterialItem,
    getMaterialItemsByClass,
    getMaterialItemsByClassAndType,
    getMaterialItemsWithClassMappings,
    createMaterialItem,
    updateMaterialItem,
    deleteMaterialItem,
    getMaterialItemClassMappings,
    updateMaterialItemClassMappings,
    bulkUpdateMaterialMapping,
    saveDayMaterialAssignment,
    getDayMaterialAssignments,
    deleteDayMaterialAssignment,
} from './items/actions'
