'use client';

import { useState, useEffect } from 'react';
import { MaterialType, MaterialCategory } from '../types';
import { getMaterialTypes, getMaterialCategories } from '../actions';

interface MaterialTypeSelectorProps {
  selectedTypeId?: string;
  onSelect: (materialType: MaterialType | null) => void;
  categoryId?: string; // Optional filter by category
}

export default function MaterialTypeSelector({ 
  selectedTypeId, 
  onSelect,
  categoryId 
}: MaterialTypeSelectorProps) {
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [types, setTypes] = useState<MaterialType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(categoryId);

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [categoriesData, typesData] = await Promise.all([
        getMaterialCategories(),
        getMaterialTypes(selectedCategory)
      ]);
      setCategories(categoriesData);
      setTypes(typesData);
    } catch (error) {
      console.error('Error loading material types:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupedTypes = types.reduce((acc, type) => {
    const catId = type.category_id;
    if (!acc[catId]) {
      acc[catId] = [];
    }
    acc[catId].push(type);
    return acc;
  }, {} as Record<string, MaterialType[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category Filter */}
      {!categoryId && (
        <div>
          <label className="block text-sm font-medium mb-2">
            Filter berdasarkan Kategori
          </label>
          <select
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="">Semua Kategori</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Material Types */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Pilih Jenis Materi <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          {categories
            .filter(cat => !selectedCategory || cat.id === selectedCategory)
            .map((category) => {
              const categoryTypes = groupedTypes[category.id] || [];
              if (categoryTypes.length === 0) return null;

              return (
                <div key={category.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {category.name}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {categoryTypes.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => onSelect(type.id === selectedTypeId ? null : type)}
                        className={`px-4 py-2 rounded-lg border text-left transition-all ${
                          selectedTypeId === type.id
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="font-medium">{type.name}</div>
                        {type.description && (
                          <div className="text-xs mt-1 opacity-75">
                            {type.description}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
        {types.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            Tidak ada jenis materi yang tersedia
          </p>
        )}
      </div>
    </div>
  );
}

