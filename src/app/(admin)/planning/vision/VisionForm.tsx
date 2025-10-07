'use client';

import { useState, useMemo, useEffect } from 'react';

import Label from '@/components/form/Label';
import Button from '@/components/ui/button/Button';
import VisionSkeleton from '@/components/ui/skeleton/VisionSkeleton';
import { toast } from 'sonner';

import { upsertVision } from './actions';
import { LIFE_AREAS } from './constants';
import { useVisions } from './hooks/useVision';

export default function VisionForm() {
  const { visions, isLoading, mutate } = useVisions();
  const [localFormData, setLocalFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data from visions using useMemo
  const initialFormData = useMemo(() => {
    const initialData: Record<string, string> = {};
    LIFE_AREAS.forEach(area => {
      const vision = visions.find(v => v.life_area === area);
      initialData[`${area}-vision_3_5_year`] = vision?.vision_3_5_year || '';
      initialData[`${area}-vision_10_year`] = vision?.vision_10_year || '';
    });
    return initialData;
  }, [visions]);

  // Initialize local form data only once when visions are loaded
  useEffect(() => {
    if (visions.length > 0 && Object.keys(localFormData).length === 0) {
      setLocalFormData(initialFormData);
    }
  }, [visions, initialFormData, localFormData]);

  const handleInputChange = (name: string, value: string) => {
    setLocalFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create FormData from our state
      const formDataObj = new FormData();
      Object.entries(localFormData).forEach(([key, value]) => {
        formDataObj.append(key, value);
      });

      // Call server action
      await upsertVision(formDataObj);

      // Invalidate cache and show success toast
      await mutate();
      toast.success('Data visi berhasil disimpan!');
    } catch {
      toast.error('Gagal menyimpan data');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <VisionSkeleton />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Desktop Table Layout */}
      <div className="overflow-x-auto hidden sm:block">
        <table className="min-w-full border rounded-xl bg-white dark:bg-gray-900">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800">
              <th className="w-64 px-4 py-3 text-left font-semibold">Area Kehidupan</th>
              <th className="px-4 py-3 text-left font-semibold">Visi 3-5 Tahun</th>
              <th className="px-4 py-3 text-left font-semibold">Visi 10 Tahun</th>
            </tr>
          </thead>
          <tbody>
            {LIFE_AREAS.map((area) => (
              <tr key={area} className="border-t border-gray-200 dark:border-gray-800">
                <td className="w-64 px-4 py-3 align-top font-medium text-gray-800 dark:text-white/90 whitespace-nowrap">
                  {area}
                </td>
                <td className="px-4 py-3 align-top">
                  <Label htmlFor={`${area}-vision_3_5_year`} className="sr-only">
                    Visi 3-5 Tahun
                  </Label>
                  <textarea
                    id={`${area}-vision_3_5_year`}
                    name={`${area}-vision_3_5_year`}
                    className="w-full rounded-lg border px-4 py-2.5 text-sm"
                    value={localFormData[`${area}-vision_3_5_year`] || ''}
                    onChange={(e) => handleInputChange(`${area}-vision_3_5_year`, e.target.value)}
                    rows={3}
                  />
                </td>
                <td className="px-4 py-3 align-top">
                  <Label htmlFor={`${area}-vision_10_year`} className="sr-only">
                    Visi 10 Tahun
                  </Label>
                  <textarea
                    id={`${area}-vision_10_year`}
                    name={`${area}-vision_10_year`}
                    className="w-full rounded-lg border px-4 py-2.5 text-sm"
                    value={localFormData[`${area}-vision_10_year`] || ''}
                    onChange={(e) => handleInputChange(`${area}-vision_10_year`, e.target.value)}
                    rows={3}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile Card Layout */}
      <div className="block sm:hidden space-y-4">
        {LIFE_AREAS.map((area) => (
          <div key={area} className="border rounded-xl bg-white dark:bg-gray-900 p-4">
            <div className="font-semibold mb-2 text-center text-gray-800 dark:text-white/90">{area}</div>
            <Label htmlFor={`${area}-vision_3_5_year`} className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
              Visi 3-5 Tahun
            </Label>
            <textarea
              id={`${area}-vision_3_5_year`}
              name={`${area}-vision_3_5_year`}
              className="w-full rounded-lg border px-4 py-2.5 text-sm mb-3"
              value={localFormData[`${area}-vision_3_5_year`] || ''}
              onChange={(e) => handleInputChange(`${area}-vision_3_5_year`, e.target.value)}
              rows={3}
            />
            <Label htmlFor={`${area}-vision_10_year`} className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
              Visi 10 Tahun
            </Label>
            <textarea
              id={`${area}-vision_10_year`}
              name={`${area}-vision_10_year`}
              className="w-full rounded-lg border px-4 py-2.5 text-sm"
              value={localFormData[`${area}-vision_10_year`] || ''}
              onChange={(e) => handleInputChange(`${area}-vision_10_year`, e.target.value)}
              rows={3}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting} className='w-full sm:w-auto'>
          {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
        </Button>
      </div>
    </form>
  );
} 