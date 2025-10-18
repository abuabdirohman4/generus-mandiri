
# Changelog

All notable changes to this project will be documented in this file.

## [1.3.1]

### Fixed
- **Organization Hierarchy**: Fixed organization hierarchy display in meeting list
- **Sign In Messages**: Fixed "Sesi anda telah berakhir" and "Username tidak ditemukan" messages
- **Student Management**: Moved student management to user folder structure

## [1.3.0]

### Added
- **Organizational Management Page**: Data management with role-based filtering and tab filtering
- **Admin & Teacher Management**: Enhanced user management with improved validation and error handling
- **DataFilter Component**: Reusable filtering component for various pages
- **Meeting Management**: Enhanced meeting management and student data handling
- **Attendance Logs**: Updated data structure with UUIDs and additional fields

### Improved
- **Role Management**: Improved role checks and access control system
- **User Management**: Enhanced user management with organizational columns
- **UI/UX**: Better loading states and user experience across components
- **Default Gender**: Set default gender to "Laki-laki" for easier student input
- **Input Validation**: Improved form validation across various components

## [1.2.0]

### Added
- **Batch Import System**: Multi-step import for 1-20 students with progress tracking
- **Enhanced DataTable**: Pagination, search, sorting, and mobile-responsive design
- **Custom Confirmation Modal**: Replaced native confirm with styled modal
- **Skeleton Loading**: Better loading states for improved UX

## [1.1.0]

### Added
- **Reset Cookies & Cache Settings Page**: 
- New settings page at `/settings/cache` for clearing all application data
- Complete cache clearing functionality including localStorage, sessionStorage, cookies, PWA cache, and server session
- Confirmation modal with warning message before reset
- Loading states during reset process
- Automatic redirect to login page after successful reset
- Added to main settings page under 'Aplikasi' category

## [1.0.0]

### Added
- **Initial Release**: 'Generus Mandiri - Sistem Manajemen Sekolah Digital'
- **Comprehensive Features**:
  - Authentication system
  - Attendance management (Absensi)
  - Student management (Siswa)
  - Reports and analytics (Laporan)
- **Technology Stack**: Complete setup and configuration
- **Documentation**: Installation and usage instructions