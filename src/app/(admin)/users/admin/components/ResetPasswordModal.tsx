"use client";

import { useState, useEffect } from 'react';
import { resetAdminPassword } from '../actions';
import { Modal } from '@/components/ui/modal';
import InputField from '@/components/form/input/InputField';
import Label from '@/components/form/Label';
import Button from '@/components/ui/button/Button';

interface Admin {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  admin: Admin | null;
  onSuccess: () => void;
}

export default function ResetPasswordModal({ isOpen, onClose, admin, onSuccess }: ResetPasswordModalProps) {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        newPassword: '',
        confirmPassword: ''
      });
      setError(undefined);
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(undefined);

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Password dan konfirmasi password tidak sama');
      setIsLoading(false);
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('Password minimal 6 karakter');
      setIsLoading(false);
      return;
    }

    try {
      if (admin) {
        await resetAdminPassword(admin.id, formData.newPassword);
        onSuccess();
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  if (!admin) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Reset Password - {admin.full_name}
        </h3>

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-md p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Perhatian:</strong> Password baru akan mengganti password lama untuk user <strong>{admin.email}</strong>
              </p>
            </div>
            
            <div>
              <Label htmlFor="newPassword">Password Baru</Label>
              <InputField
                id="newPassword"
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="Masukkan password baru"
                required
                error={!!error}
                hint={error || undefined}
                disabled={isLoading}
              />
            </div>
            
            <div>
              <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
              <InputField
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Konfirmasi password baru"
                required
                error={!!error}
                hint={error || undefined}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              variant="outline"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              variant="primary"
              loading={isLoading}
              loadingText="Resetting..."
            >
              Reset Password
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}