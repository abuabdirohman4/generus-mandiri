/**
 * Class Logic (Layer 2)
 *
 * Pure business logic for class operations.
 * NO 'use server' directive - testable without mocking.
 */

/**
 * Sort classes by minimum class_master sort_order.
 * Classes with no mappings are sorted to the end.
 */
export function sortClassesByMasterOrder(classes: any[]): any[] {
    return classes.sort((a, b) => {
        const getSortOrder = (cls: any): number => {
            if (!cls.class_master_mappings || cls.class_master_mappings.length === 0) {
                return 9999
            }

            const sortOrders = cls.class_master_mappings
                .map((mapping: any) => mapping.class_master?.sort_order)
                .filter((order: any) => typeof order === 'number')

            if (sortOrders.length === 0) return 9999
            return Math.min(...sortOrders)
        }

        const orderA = getSortOrder(a)
        const orderB = getSortOrder(b)

        if (orderA !== orderB) {
            return orderA - orderB
        }

        return a.name.localeCompare(b.name)
    })
}

/**
 * Attach class_master_mappings from a Map to each class object.
 */
export function attachClassMasterMappings(classes: any[], mappingsMap: Map<string, any[]>): any[] {
    return classes.map((c: any) => ({
        id: c.id,
        name: c.name,
        kelompok_id: c.kelompok_id,
        kelompok: Array.isArray(c.kelompok) ? c.kelompok[0] : c.kelompok,
        class_master_mappings: mappingsMap.get(c.id) || []
    }))
}
