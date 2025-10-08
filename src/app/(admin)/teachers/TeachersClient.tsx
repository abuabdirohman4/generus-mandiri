"use client";

import { useState, useEffect } from 'react';
import { createTeacher, getTeachers, getClasses, deleteTeacher } from './actions';
import { toast } from 'sonner';

interface Teacher {
  id: string;
  full_name: string;
  role: string;
  created_at: string;
  classes: {
    id: string;
    name: string;
  }[];
}

interface Class {
  id: string;
  name: string;
  grade: number;
}

export default function TeachersClient() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    classId: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [teachersData, classesData] = await Promise.all([
        getTeachers(),
        getClasses()
      ]);
      setTeachers(teachersData);
      setClasses(classesData);
    } catch (error) {
      toast.error('Gagal memuat data');
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password || !formData.fullName || !formData.classId) {
      toast.error('Semua field harus diisi');
      return;
    }

    try {
      setSubmitting(true);
      const formDataObj = new FormData();
      formDataObj.append('username', formData.username);
      formDataObj.append('password', formData.password);
      formDataObj.append('fullName', formData.fullName);
      formDataObj.append('classId', formData.classId);

      await createTeacher(formDataObj);
      
      toast.success('Guru berhasil dibuat');
      setFormData({ username: '', password: '', fullName: '', classId: '' });
      setShowForm(false);
      loadData(); // Reload data
    } catch (error) {
      toast.error('Gagal membuat guru');
      console.error('Error creating teacher:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (teacherId: string, teacherName: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus guru ${teacherName}?`)) {
      return;
    }

    try {
      await deleteTeacher(teacherId);
      toast.success('Guru berhasil dihapus');
      loadData(); // Reload data
    } catch (error) {
      toast.error('Gagal menghapus guru');
      console.error('Error deleting teacher:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Kelola Guru
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Kelola data guru dan kelas
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
        >
          {showForm ? 'Tutup Form' : 'Tambah Guru'}
        </button>
      </div>

      {/* Form Tambah Guru */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Tambah Guru Baru
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Masukkan username"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Masukkan password"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Masukkan nama lengkap"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Kelas
                </label>
                <select
                  value={formData.classId}
                  onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                >
                  <option value="">Pilih kelas</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} (Kelas {cls.grade})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-brand-500 text-white rounded-md hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Daftar Guru */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Daftar Guru ({teachers.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Nama Lengkap
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Kelas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Dibuat
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {teachers.map((teacher) => (
                <tr key={teacher.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {teacher.full_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {teacher.classes?.[0]?.name || 'Tidak ada kelas'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(teacher.created_at).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <button
                      onClick={() => handleDelete(teacher.id, teacher.full_name)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {teachers.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Belum ada guru yang terdaftar
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
