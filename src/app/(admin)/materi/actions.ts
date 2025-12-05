'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { MaterialCategory, MaterialType, MaterialItem, DayMaterialAssignment, DayMaterialItem, MaterialItemClass, ClassMaster } from './types';

export async function getAvailableClassMasters() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('class_masters')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error getting class masters:', error);
    throw new Error('Gagal memuat daftar kelas');
  }

  return data || [];
}

// New flexible material structure actions

/**
 * Get all material categories
 */
export async function getMaterialCategories(): Promise<MaterialCategory[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('material_categories')
    .select('*')
    .order('display_order');

  if (error) {
    console.error('Error getting material categories:', error);
    throw new Error('Gagal memuat kategori materi');
  }

  return data || [];
}

/**
 * Get material types, optionally filtered by category
 */
export async function getMaterialTypes(categoryId?: string): Promise<MaterialType[]> {
  const supabase = await createClient();

  let query = supabase
    .from('material_types')
    .select(`
      *,
      category:material_categories(*)
    `)
    .order('display_order');

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error getting material types:', error);
    throw new Error('Gagal memuat jenis materi');
  }

  return data || [];
}

/**
 * Get material items for a specific material type
 */
export async function getMaterialItems(materialTypeId: string): Promise<MaterialItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('material_items')
    .select(`
      *,
      material_type:material_types(*)
    `)
    .eq('material_type_id', materialTypeId)
    .order('name');

  if (error) {
    console.error('Error getting material items:', error);
    throw new Error('Gagal memuat item materi');
  }

  return data || [];
}

/**
 * Get all material items (for master data view)
 */
export async function getAllMaterialItems(): Promise<MaterialItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('material_items')
    .select(`
      *,
      material_type:material_types(
        *,
        category:material_categories(*)
      )
    `)
    .order('name');

  if (error) {
    console.error('Error getting all material items:', error);
    throw new Error('Gagal memuat semua item materi');
  }

  return data || [];
}

/**
 * Save day material assignment with items
 */
export async function saveDayMaterialAssignment(data: {
  class_master_id: string;
  semester: number;
  month: number;
  week: number;
  day_of_week: number;
  material_type_id: string;
  notes?: string;
  items?: Array<{
    material_item_id: string;
    display_order: number;
    custom_content?: string;
  }>;
}) {
  const supabase = await createClient();

  try {
    // Insert or update assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('day_material_assignments')
      .upsert({
        class_master_id: data.class_master_id,
        semester: data.semester,
        month: data.month,
        week: data.week,
        day_of_week: data.day_of_week,
        material_type_id: data.material_type_id,
        notes: data.notes || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'class_master_id,semester,month,week,day_of_week,material_type_id'
      })
      .select('id')
      .single();

    if (assignmentError) {
      console.error('Error saving assignment:', assignmentError);
      throw new Error('Gagal menyimpan assignment materi');
    }

    // Delete existing items for this assignment
    await supabase
      .from('day_material_items')
      .delete()
      .eq('assignment_id', assignment.id);

    // Insert new items if provided
    if (data.items && data.items.length > 0) {
      const itemsToInsert = data.items.map(item => ({
        assignment_id: assignment.id,
        material_item_id: item.material_item_id,
        display_order: item.display_order,
        custom_content: item.custom_content || null,
      }));

      const { error: itemsError } = await supabase
        .from('day_material_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('Error saving items:', itemsError);
        throw new Error('Gagal menyimpan item materi');
      }
    }

    revalidatePath('/materi');
    return { success: true, assignment_id: assignment.id };
  } catch (error) {
    console.error('Error in saveDayMaterialAssignment:', error);
    throw error;
  }
}

/**
 * Get day material assignments for a specific day
 */
export async function getDayMaterialAssignments(params: {
  class_master_id: string;
  semester: number;
  month: number;
  week: number;
  day_of_week: number;
}): Promise<DayMaterialAssignment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('day_material_assignments')
    .select(`
      *,
      material_type:material_types(
        *,
        category:material_categories(*)
      ),
      items:day_material_items(
        *,
        material_item:material_items(
          *,
          material_type:material_types(*)
        )
      )
    `)
    .eq('class_master_id', params.class_master_id)
    .eq('semester', params.semester)
    .eq('month', params.month)
    .eq('week', params.week)
    .eq('day_of_week', params.day_of_week)
    .order('material_type(display_order)');

  if (error) {
    console.error('Error getting day material assignments:', error);
    throw new Error('Gagal memuat assignment materi');
  }

  // Sort items by display_order
  const assignments = (data || []).map((assignment: any) => ({
    ...assignment,
    items: assignment.items?.sort((a: any, b: any) => a.display_order - b.display_order) || []
  }));

  return assignments;
}

/**
 * Delete a day material assignment
 */
export async function deleteDayMaterialAssignment(assignmentId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('day_material_assignments')
    .delete()
    .eq('id', assignmentId);

  if (error) {
    console.error('Error deleting assignment:', error);
    throw new Error('Gagal menghapus assignment materi');
  }

  revalidatePath('/materi');
  return { success: true };
}

/**
 * Get material items for a specific class with class mappings
 */
export async function getMaterialItemsByClass(classMasterId: string): Promise<MaterialItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('material_item_classes')
    .select(`
      *,
      material_item:material_items(
        *,
        material_type:material_types(
          *,
          category:material_categories(*)
        )
      ),
      class_master:class_masters(*)
    `)
    .eq('class_master_id', classMasterId)
    .order('material_item(name)');

  if (error) {
    console.error('Error getting material items by class:', error);
    throw new Error('Gagal memuat item materi per kelas');
  }

  // Extract material items and add class info
  const items = (data || [])
    .map((mic: any) => ({
      ...mic.material_item,
      classes: mic.class_master ? [mic.class_master] : []
    }))
    .filter((item: any) => item && item.id); // Filter out null items

  // Deduplicate items (same item can be mapped to multiple classes)
  const uniqueItems = new Map<string, MaterialItem>();
  items.forEach((item: any) => {
    if (!uniqueItems.has(item.id)) {
      uniqueItems.set(item.id, item);
    } else {
      // Merge classes if item already exists
      const existing = uniqueItems.get(item.id)!;
      if (existing.classes && item.classes) {
        existing.classes = [...(existing.classes || []), ...item.classes];
      }
    }
  });

  return Array.from(uniqueItems.values());
}

/**
 * Get material items for a specific class and material type
 * This filters items that are mapped to the class and match the material type
 */
export async function getMaterialItemsByClassAndType(
  classMasterId: string,
  materialTypeId: string
): Promise<MaterialItem[]> {
  const supabase = await createClient();

  // Query material_items with join to material_item_classes to filter by class
  const { data, error } = await supabase
    .from('material_items')
    .select(`
      *,
      material_type:material_types(
        *,
        category:material_categories(*)
      ),
      material_item_classes!inner(
        class_master:class_masters(*)
      )
    `)
    .eq('material_type_id', materialTypeId)
    .eq('material_item_classes.class_master_id', classMasterId)
    .order('name');

  if (error) {
    console.error('Error getting material items by class and type:', error);
    throw new Error('Gagal memuat item materi per kelas dan jenis');
  }

  // Transform data to extract class_master from material_item_classes
  const items = (data || []).map((item: any) => ({
    ...item,
    classes: item.material_item_classes?.map((mic: any) => mic.class_master).filter((cm: any) => cm) || []
  }));

  return items;
}

/**
 * Get all material items with their class associations
 */
export async function getMaterialItemsWithClassMappings(): Promise<MaterialItem[]> {
  const supabase = await createClient();

  // 1. Fetch all material items with types
  const { data: itemsData, error: itemsError } = await supabase
    .from('material_items')
    .select(`
      *,
      material_type:material_types(
        *,
        category:material_categories(*)
      )
    `)
    .range(0, 9999)
    .order('name');

  if (itemsError) {
    console.error('Error getting material items:', itemsError);
    throw new Error('Gagal memuat item materi');
  }

  // 2. Fetch all class mappings (with batch fetching to bypass 1000-row limit)
  let allMappingsData: any[] = [];
  let offset = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: batchData, error: batchError } = await supabase
      .from('material_item_classes')
      .select(`
        material_item_id,
        semester,
        class_master:class_masters(*)
      `)
      .range(offset, offset + batchSize - 1);

    if (batchError) {
      console.error('Error getting class mappings batch:', batchError);
      throw new Error('Gagal memuat mapping kelas');
    }

    if (batchData && batchData.length > 0) {
      allMappingsData = [...allMappingsData, ...batchData];
      offset += batchSize;
      hasMore = batchData.length === batchSize; // Continue if we got a full batch
    } else {
      hasMore = false;
    }
  }

  const mappingsData = allMappingsData;

  // 3. Map classes to items with semester info
  const items = (itemsData || []).map((item: any) => {
    const itemMappings = mappingsData?.filter((m: any) => m.material_item_id === item.id) || [];
    const classes = itemMappings
      .map((m: any) => ({
        ...m.class_master,
        semester: m.semester // Include semester from mapping
      }))
      .filter((cm: any) => cm); // Filter out nulls

    return {
      ...item,
      classes
    };
  });

  return items;
}

/**
 * Get all classes for mapping selection (filtered to CABERAWIT category only)
 */
export async function getAllClasses(): Promise<ClassMaster[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('class_masters')
    .select(`
      id,
      name,
      category:category_id (
        id,
        code,
        name
      )
    `)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching classes:', error);
    return [];
  }

  // Filter for CABERAWIT and PAUD categories only
  return (data || []).filter((cls: any) => {
    // Handle both array and object formats from Supabase
    const category = Array.isArray(cls.category) ? cls.category[0] : cls.category;
    const categoryCode = category?.code?.toUpperCase();
    return categoryCode === 'CABERAWIT' || categoryCode === 'PAUD';
  }).map((cls: any) => ({
    id: cls.id,
    name: cls.name,
    category: Array.isArray(cls.category) ? cls.category[0] : cls.category
  }));
}

/**
 * Get all classes that have material items (for sidebar)
 */
export async function getClassesWithMaterialItems(): Promise<ClassMaster[]> {
  const supabase = await createClient();

  // Use inner join to get only classes that have material items
  // We select id from material_item_classes just to satisfy the join and filter
  const { data, error } = await supabase
    .from('class_masters')
    .select(`
      *,
      material_item_classes!inner(id)
    `)
    .order('name');

  if (error) {
    console.error('Error getting classes with material items:', error);
    throw new Error('Gagal memuat kelas dengan item materi');
  }

  // Remove the material_item_classes property from the result to return clean ClassMaster objects
  return (data || []).map((item: any) => {
    const { material_item_classes, ...classMaster } = item;
    return classMaster;
  });
}

// ==========================================
// CRUD Operations for Material Categories
// ==========================================

/**
 * Create a new material category
 */
export async function createMaterialCategory(data: {
  name: string;
  description?: string;
  display_order: number;
}): Promise<MaterialCategory> {
  const supabase = await createClient();

  const { data: category, error } = await supabase
    .from('material_categories')
    .insert({
      name: data.name,
      description: data.description || null,
      display_order: data.display_order,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating material category:', error);
    // Check for unique constraint violation
    if (error.code === '23505') {
      throw new Error('Nama kategori sudah digunakan');
    }
    throw new Error('Gagal membuat kategori materi');
  }

  revalidatePath('/materi');
  return category;
}

/**
 * Update a material category
 */
export async function updateMaterialCategory(
  id: string,
  data: {
    name: string;
    description?: string;
    display_order: number;
  }
): Promise<MaterialCategory> {
  const supabase = await createClient();

  const { data: category, error } = await supabase
    .from('material_categories')
    .update({
      name: data.name,
      description: data.description || null,
      display_order: data.display_order,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating material category:', error);
    // Check for unique constraint violation
    if (error.code === '23505') {
      throw new Error('Nama kategori sudah digunakan');
    }
    throw new Error('Gagal memperbarui kategori materi');
  }

  revalidatePath('/materi');
  return category;
}

/**
 * Delete a material category
 */
export async function deleteMaterialCategory(id: string): Promise<{ success: boolean }> {
  const supabase = await createClient();

  // Check if there are any material types using this category
  const { data: types, error: checkError } = await supabase
    .from('material_types')
    .select('id')
    .eq('category_id', id)
    .limit(1);

  if (checkError) {
    console.error('Error checking dependencies:', checkError);
    throw new Error('Gagal memeriksa dependensi');
  }

  if (types && types.length > 0) {
    throw new Error('Tidak dapat menghapus kategori. Masih ada jenis materi yang menggunakan kategori ini.');
  }

  const { error } = await supabase
    .from('material_categories')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting material category:', error);
    throw new Error('Gagal menghapus kategori materi');
  }

  revalidatePath('/materi');
  return { success: true };
}

// ==========================================
// CRUD Operations for Material Types
// ==========================================

/**
 * Create a new material type
 */
export async function createMaterialType(data: {
  category_id: string;
  name: string;
  description?: string;
  display_order: number;
}): Promise<MaterialType> {
  const supabase = await createClient();

  const { data: type, error } = await supabase
    .from('material_types')
    .insert({
      category_id: data.category_id,
      name: data.name,
      description: data.description || null,
      display_order: data.display_order,
    })
    .select(`
      *,
      category:material_categories(*)
    `)
    .single();

  if (error) {
    console.error('Error creating material type:', error);
    // Check for unique constraint violation
    if (error.code === '23505') {
      throw new Error('Nama jenis materi sudah digunakan untuk kategori ini');
    }
    throw new Error('Gagal membuat jenis materi');
  }

  revalidatePath('/materi');
  return type;
}

/**
 * Update a material type
 */
export async function updateMaterialType(
  id: string,
  data: {
    category_id: string;
    name: string;
    description?: string;
    display_order: number;
  }
): Promise<MaterialType> {
  const supabase = await createClient();

  const { data: type, error } = await supabase
    .from('material_types')
    .update({
      category_id: data.category_id,
      name: data.name,
      description: data.description || null,
      display_order: data.display_order,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(`
      *,
      category:material_categories(*)
    `)
    .single();

  if (error) {
    console.error('Error updating material type:', error);
    // Check for unique constraint violation
    if (error.code === '23505') {
      throw new Error('Nama jenis materi sudah digunakan untuk kategori ini');
    }
    throw new Error('Gagal memperbarui jenis materi');
  }

  revalidatePath('/materi');
  return type;
}

/**
 * Delete a material type
 */
export async function deleteMaterialType(id: string): Promise<{ success: boolean }> {
  const supabase = await createClient();

  // Check if there are any material items using this type
  const { data: items, error: checkError } = await supabase
    .from('material_items')
    .select('id')
    .eq('material_type_id', id)
    .limit(1);

  if (checkError) {
    console.error('Error checking dependencies:', checkError);
    throw new Error('Gagal memeriksa dependensi');
  }

  if (items && items.length > 0) {
    throw new Error('Tidak dapat menghapus jenis materi. Masih ada item materi yang menggunakan jenis ini.');
  }

  // Check if there are any day material assignments using this type
  const { data: assignments, error: assignmentCheckError } = await supabase
    .from('day_material_assignments')
    .select('id')
    .eq('material_type_id', id)
    .limit(1);

  if (assignmentCheckError) {
    console.error('Error checking assignment dependencies:', assignmentCheckError);
    throw new Error('Gagal memeriksa dependensi assignment');
  }

  if (assignments && assignments.length > 0) {
    throw new Error('Tidak dapat menghapus jenis materi. Masih ada assignment materi yang menggunakan jenis ini.');
  }

  const { error } = await supabase
    .from('material_types')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting material type:', error);
    throw new Error('Gagal menghapus jenis materi');
  }

  revalidatePath('/materi');
  return { success: true };
}

// ==========================================
// CRUD Operations for Material Items
// ==========================================

/**
 * Create a new material item
 */
export async function createMaterialItem(data: {
  material_type_id: string;
  name: string;
  description?: string;
  content?: string;
}): Promise<MaterialItem> {
  const supabase = await createClient();

  const { data: item, error } = await supabase
    .from('material_items')
    .insert({
      material_type_id: data.material_type_id,
      name: data.name,
      description: data.description || null,
      content: data.content || null,
    })
    .select(`
      *,
      material_type:material_types(
        *,
        category:material_categories(*)
      )
    `)
    .single();

  if (error) {
    console.error('Error creating material item:', error);
    // Check for unique constraint violation
    if (error.code === '23505') {
      throw new Error('Nama item materi sudah digunakan untuk jenis materi ini');
    }
    throw new Error('Gagal membuat item materi');
  }

  revalidatePath('/materi');
  return item;
}

/**
 * Update a material item
 */
export async function updateMaterialItem(
  id: string,
  data: {
    material_type_id: string;
    name: string;
    description?: string;
    content?: string;
  }
): Promise<MaterialItem> {
  const supabase = await createClient();

  // Update first without select
  const { error: updateError } = await supabase
    .from('material_items')
    .update({
      material_type_id: data.material_type_id,
      name: data.name,
      description: data.description || null,
      content: data.content || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateError) {
    console.error('Error updating material item:', updateError);
    // Check for unique constraint violation
    if (updateError.code === '23505') {
      throw new Error('Nama item materi sudah digunakan untuk jenis materi ini');
    }
    throw new Error('Gagal memperbarui item materi');
  }

  // Then fetch the updated item with relations
  const { data: item, error: selectError } = await supabase
    .from('material_items')
    .select(`
      *,
      material_type:material_types(
        *,
        category:material_categories(*)
      )
    `)
    .eq('id', id)
    .single();

  if (selectError) {
    console.error('Error fetching updated material item:', selectError);
    // If we got here, update succeeded but fetch failed
    // This could be RLS issue or item was deleted
    if (selectError.code === 'PGRST116') {
      throw new Error('Item materi tidak ditemukan setelah update');
    }
    throw new Error('Berhasil mengupdate tetapi gagal memuat data terbaru');
  }

  if (!item) {
    throw new Error('Item materi tidak ditemukan setelah update');
  }

  revalidatePath('/materi');
  return item;
}

/**
 * Delete a material item
 */
export async function deleteMaterialItem(id: string): Promise<{ success: boolean }> {
  const supabase = await createClient();

  // Check if there are any day material items using this item
  const { data: dayItems, error: checkError } = await supabase
    .from('day_material_items')
    .select('id')
    .eq('material_item_id', id)
    .limit(1);

  if (checkError) {
    console.error('Error checking dependencies:', checkError);
    throw new Error('Gagal memeriksa dependensi');
  }

  if (dayItems && dayItems.length > 0) {
    throw new Error('Tidak dapat menghapus item. Item masih digunakan dalam assignment materi.');
  }

  const { error } = await supabase
    .from('material_items')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting material item:', error);
    throw new Error('Gagal menghapus item materi');
  }

  revalidatePath('/materi');
  return { success: true };
}// Append to end of actions.ts

/**
 * Get material item class mappings for a specific item
 */
export async function getMaterialItemClassMappings(materialItemId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('material_item_classes')
    .select(`
      id,
      class_master_id,
      semester,
      class_master:class_masters(*)
    `)
    .eq('material_item_id', materialItemId);

  if (error) {
    console.error('Error fetching class mappings:', error);
    throw new Error('Gagal memuat mapping kelas');
  }

  return data || [];
}

/**
 * Update material item class mappings (replaces all mappings for an item)
 */
export async function updateMaterialItemClassMappings(
  materialItemId: string,
  mappings: Array<{ class_master_id: string; semester: number | null }>
) {
  const supabase = await createClient();

  // Delete existing mappings
  const { error: deleteError } = await supabase
    .from('material_item_classes')
    .delete()
    .eq('material_item_id', materialItemId);

  if (deleteError) {
    console.error('Error deleting old mappings:', deleteError);
    throw new Error('Gagal menghapus mapping lama');
  }

  // Insert new mappings if any
  if (mappings.length > 0) {
    const { error: insertError } = await supabase
      .from('material_item_classes')
      .insert(
        mappings.map(m => ({
          material_item_id: materialItemId,
          class_master_id: m.class_master_id,
          semester: m.semester
        }))
      );

    if (insertError) {
      console.error('Error inserting new mappings:', insertError);
      throw new Error('Gagal menyimpan mapping baru');
    }
  }

  revalidatePath('/materi');
  return { success: true };
}

export async function getMaterialItem(id: string): Promise<MaterialItem | null> {
  const supabase = await createClient();

  // 1. Fetch item with type
  const { data: itemData, error: itemError } = await supabase
    .from('material_items')
    .select(`
      *,
      material_type:material_types(
        *,
        category:material_categories(*)
      )
    `)
    .eq('id', id)
    .single();

  if (itemError) {
    console.error('Error getting material item:', itemError);
    return null;
  }

  // 2. Fetch class mappings
  const { data: mappingsData, error: mappingsError } = await supabase
    .from('material_item_classes')
    .select(`
      material_item_id,
      semester,
      class_master:class_masters(*)
    `)
    .eq('material_item_id', id);

  if (mappingsError) {
    console.error('Error getting class mappings:', mappingsError);
    // Continue without mappings if error
  }

  // 3. Map classes
  const classes = (mappingsData || [])
    .map((m: any) => ({
      ...m.class_master,
      semester: m.semester
    }))
    .filter((cm: any) => cm);

  return {
    ...itemData,
    classes
  };
}

export async function bulkUpdateMaterialMapping(
  itemIds: string[],
  mappings: { class_master_id: string; semester: number | null }[],
  mode: 'replace' | 'add'
) {
  const supabase = await createClient();

  try {
    // 1. If mode is replace, delete existing mappings for these items
    if (mode === 'replace') {
      const { error: deleteError } = await supabase
        .from('material_item_classes')
        .delete()
        .in('material_item_id', itemIds);

      if (deleteError) {
        console.error('Error deleting existing mappings:', deleteError);
        throw new Error('Gagal menghapus mapping lama');
      }
    }

    // 2. Prepare new mappings
    const newMappings = itemIds.flatMap(itemId =>
      mappings.map(m => ({
        material_item_id: itemId,
        class_master_id: m.class_master_id,
        semester: m.semester
      }))
    );

    if (newMappings.length === 0) {
      revalidatePath('/materi');
      return { success: true };
    }

    // 3. Insert new mappings
    // If mode is 'add', we want to ignore duplicates.
    // Supabase upsert with ignoreDuplicates: true handles this.
    // If mode is 'replace', we already deleted, so just insert.
    const { error: insertError } = await supabase
      .from('material_item_classes')
      .upsert(newMappings, { onConflict: 'material_item_id,class_master_id', ignoreDuplicates: true });

    if (insertError) {
      console.error('Error inserting bulk mappings:', insertError);
      throw new Error('Gagal menyimpan mapping baru');
    }

    revalidatePath('/materi');
    return { success: true };
  } catch (error) {
    console.error('Bulk update error:', error);
    throw error;
  }
}
