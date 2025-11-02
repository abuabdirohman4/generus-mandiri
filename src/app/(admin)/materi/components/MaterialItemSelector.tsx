'use client';

import { useState, useEffect } from 'react';
import { MaterialItem } from '../types';
import { getMaterialItems, getMaterialItemsByClassAndType } from '../actions';

interface MaterialItemSelectorProps {
  materialTypeId: string;
  classMasterId?: string; // Optional: if provided, filter items by class
  selectedItems: Array<{
    material_item_id: string;
    display_order: number;
    custom_content?: string;
  }>;
  onChange: (items: Array<{
    material_item_id: string;
    display_order: number;
    custom_content?: string;
  }>) => void;
}

export default function MaterialItemSelector({
  materialTypeId,
  classMasterId,
  selectedItems,
  onChange,
}: MaterialItemSelectorProps) {
  const [availableItems, setAvailableItems] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (materialTypeId) {
      loadItems();
    } else {
      setAvailableItems([]);
    }
  }, [materialTypeId, classMasterId]);

  const loadItems = async () => {
    try {
      setLoading(true);
      // If classMasterId is provided, filter items by class
      // Otherwise, get all items for the material type
      if (classMasterId) {
        const items = await getMaterialItemsByClassAndType(classMasterId, materialTypeId);
        setAvailableItems(items);
      } else {
        const items = await getMaterialItems(materialTypeId);
        setAvailableItems(items);
      }
    } catch (error) {
      console.error('Error loading material items:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (itemId: string) => {
    const isSelected = selectedItems.some(item => item.material_item_id === itemId);
    
    if (isSelected) {
      // Remove item and reorder remaining items
      const filtered = selectedItems.filter(item => item.material_item_id !== itemId);
      const reordered = filtered.map((item, index) => ({
        ...item,
        display_order: index,
      }));
      onChange(reordered);
    } else {
      // Add item with next display_order
      const nextOrder = selectedItems.length;
      onChange([...selectedItems, {
        material_item_id: itemId,
        display_order: nextOrder,
      }]);
    }
  };

  const updateCustomContent = (itemId: string, customContent: string) => {
    onChange(selectedItems.map(item => 
      item.material_item_id === itemId 
        ? { ...item, custom_content: customContent }
        : item
    ));
  };

  const moveItem = (itemId: string, direction: 'up' | 'down') => {
    const itemIndex = selectedItems.findIndex(item => item.material_item_id === itemId);
    if (itemIndex === -1) return;

    const sortedItems = [...selectedItems].sort((a, b) => a.display_order - b.display_order);
    const sortedIndex = sortedItems.findIndex(item => item.material_item_id === itemId);
    const targetIndex = direction === 'up' ? sortedIndex - 1 : sortedIndex + 1;

    if (targetIndex < 0 || targetIndex >= sortedItems.length) return;

    // Swap items
    [sortedItems[sortedIndex], sortedItems[targetIndex]] = [sortedItems[targetIndex], sortedItems[sortedIndex]];

    // Reorder display_order values
    const reordered = sortedItems.map((item, index) => ({
      ...item,
      display_order: index,
    }));

    onChange(reordered);
  };

  const getSelectedItem = (itemId: string) => {
    return selectedItems.find(item => item.material_item_id === itemId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!materialTypeId) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Pilih jenis materi terlebih dahulu
      </div>
    );
  }

  if (availableItems.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        {classMasterId 
          ? 'Belum ada item materi untuk jenis ini yang ter-mapping ke kelas ini. Item dapat ditambahkan melalui master data atau mapping kelas dapat dilakukan di tab Master Data.'
          : 'Belum ada item materi untuk jenis ini. Item dapat ditambahkan melalui master data.'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium">
          Pilih Item Materi
          {classMasterId && (
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 font-normal">
              (dari kelas yang dipilih)
            </span>
          )}
        </label>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {selectedItems.length} item dipilih dari {availableItems.length} tersedia
        </span>
      </div>

      {/* Available Items */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {availableItems.map((item) => {
          const selectedItem = getSelectedItem(item.id);
          const isSelected = !!selectedItem;

          return (
            <div
              key={item.id}
              className={`border rounded-lg p-3 transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleItem(item.id)}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {item.name}
                  </div>
                  {item.description && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {item.description}
                    </div>
                  )}
                  {item.content && (
                    <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {item.content}
                    </div>
                  )}
                </div>
              </div>

              {/* Custom Content for Selected Items */}
              {isSelected && (
                <div className="mt-3 pl-7">
                  <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Konten Kustom (Opsional)
                  </label>
                  <textarea
                    value={selectedItem.custom_content || ''}
                    onChange={(e) => updateCustomContent(item.id, e.target.value)}
                    placeholder="Override konten default jika diperlukan..."
                    rows={2}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Items Order */}
      {selectedItems.length > 0 && (
        <div className="mt-6 pt-4 border-t">
          <label className="block text-sm font-medium mb-2">
            Urutan Item ({selectedItems.length} item)
          </label>
          <div className="space-y-2">
            {selectedItems
              .sort((a, b) => a.display_order - b.display_order)
              .map((selectedItem, index) => {
                const item = availableItems.find(i => i.id === selectedItem.material_item_id);
                if (!item) return null;

                return (
                  <div
                    key={selectedItem.material_item_id}
                    className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                  >
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-8">
                      {index + 1}.
                    </span>
                    <span className="flex-1 text-sm text-gray-900 dark:text-white">
                      {item.name}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => moveItem(selectedItem.material_item_id, 'up')}
                        disabled={index === 0}
                        className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Pindah ke atas"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(selectedItem.material_item_id, 'down')}
                        disabled={index === selectedItems.length - 1}
                        className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Pindah ke bawah"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

