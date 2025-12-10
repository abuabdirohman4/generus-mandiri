-- Migration: Add Student Biodata Fields
-- Description: Add 15 new columns to students table for complete biodata
-- Date: 2025-12-10
--
-- New Fields:
-- Identity: nomor_induk, tempat_lahir, tanggal_lahir, anak_ke
-- Contact: alamat, nomor_telepon
-- Parent: nama_ayah, nama_ibu, alamat_orangtua, telepon_orangtua, pekerjaan_ayah, pekerjaan_ibu
-- Guardian: nama_wali, alamat_wali, pekerjaan_wali

BEGIN;

-- =============================================================================
-- Add student identity fields
-- =============================================================================
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS nomor_induk VARCHAR(50),
  ADD COLUMN IF NOT EXISTS tempat_lahir TEXT,
  ADD COLUMN IF NOT EXISTS tanggal_lahir DATE,
  ADD COLUMN IF NOT EXISTS anak_ke INTEGER;

-- =============================================================================
-- Add student contact fields
-- =============================================================================
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS alamat TEXT,
  ADD COLUMN IF NOT EXISTS nomor_telepon VARCHAR(20);

-- =============================================================================
-- Add parent fields
-- =============================================================================
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS nama_ayah TEXT,
  ADD COLUMN IF NOT EXISTS nama_ibu TEXT,
  ADD COLUMN IF NOT EXISTS alamat_orangtua TEXT,
  ADD COLUMN IF NOT EXISTS telepon_orangtua VARCHAR(20),
  ADD COLUMN IF NOT EXISTS pekerjaan_ayah TEXT,
  ADD COLUMN IF NOT EXISTS pekerjaan_ibu TEXT;

-- =============================================================================
-- Add guardian fields
-- =============================================================================
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS nama_wali TEXT,
  ADD COLUMN IF NOT EXISTS alamat_wali TEXT,
  ADD COLUMN IF NOT EXISTS pekerjaan_wali TEXT;

-- =============================================================================
-- Add indexes for frequently queried fields
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_students_nomor_induk
  ON students(nomor_induk);

CREATE INDEX IF NOT EXISTS idx_students_tanggal_lahir
  ON students(tanggal_lahir);

-- =============================================================================
-- Add comments for documentation
-- =============================================================================
COMMENT ON COLUMN students.nomor_induk IS 'Student identification number (NIS)';
COMMENT ON COLUMN students.tempat_lahir IS 'Place of birth';
COMMENT ON COLUMN students.tanggal_lahir IS 'Date of birth';
COMMENT ON COLUMN students.anak_ke IS 'Birth order (e.g., 1st child, 2nd child)';

COMMENT ON COLUMN students.alamat IS 'Student home address';
COMMENT ON COLUMN students.nomor_telepon IS 'Student phone number';

COMMENT ON COLUMN students.nama_ayah IS 'Father''s full name';
COMMENT ON COLUMN students.nama_ibu IS 'Mother''s full name';
COMMENT ON COLUMN students.alamat_orangtua IS 'Parents'' address (if different from student)';
COMMENT ON COLUMN students.telepon_orangtua IS 'Parents'' phone number';
COMMENT ON COLUMN students.pekerjaan_ayah IS 'Father''s occupation';
COMMENT ON COLUMN students.pekerjaan_ibu IS 'Mother''s occupation';

COMMENT ON COLUMN students.nama_wali IS 'Guardian''s full name (if applicable)';
COMMENT ON COLUMN students.alamat_wali IS 'Guardian''s address';
COMMENT ON COLUMN students.pekerjaan_wali IS 'Guardian''s occupation';

COMMIT;
