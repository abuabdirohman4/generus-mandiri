// ─── Templates CRUD ───────────────────────────────────────────────────────────
export {
    getAllTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
} from './templates/actions'

// ─── Sections, Section Items & Template Resolution ────────────────────────────
export {
    getTemplateById,
    getApplicableTemplate,
    createSection,
    updateSection,
    deleteSection,
    createSectionItem,
    deleteSectionItem,
} from './sections/actions'

// ─── Materials & Resolution ───────────────────────────────────────────────────
export {
    getMaterialCategories,
    getMaterialTypes,
    getMaterialItems,
    getClassMasters,
    resolveSectionItems,
} from './resolution/actions'
