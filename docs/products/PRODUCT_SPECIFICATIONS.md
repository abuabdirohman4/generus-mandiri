# Product Specifications: Generus Mandiri

**Version:** 1.8.1
**Last Updated:** March 15, 2026
**Document Type:** Product Requirements & Technical Specifications

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Product Overview](#product-overview)
3. [Target Users & Use Cases](#target-users--use-cases)
4. [Core Features & Modules](#core-features--modules)
5. [Technical Architecture](#technical-architecture)
6. [User Roles & Permissions](#user-roles--permissions)
7. [Data Model & Business Logic](#data-model--business-logic)
8. [Security & Compliance](#security--compliance)
9. [Performance & Scalability](#performance--scalability)
10. [Deployment & Infrastructure](#deployment--infrastructure)
11. [Roadmap & Future Enhancements](#roadmap--future-enhancements)

---

## 1. Executive Summary

**Generus Mandiri** is a modern, digital school management system specifically designed for LDII (Lembaga Dakwah Islam Indonesia) religious education programs. It provides comprehensive tools for managing students (santri), teachers (pengajar), classes, attendance tracking, report cards (rapot), and learning materials across a multi-level organizational hierarchy.

### Key Value Propositions

- **🎯 Purpose-Built for LDII**: Tailored to LDII's organizational structure (Daerah → Desa → Kelompok) and educational terminology
- **📊 Data-Driven Management**: Real-time analytics and reports for informed decision-making
- **🔐 Role-Based Access Control**: Secure, hierarchical access based on organizational levels
- **📱 Progressive Web App**: Install and use like a native mobile app, with offline support
- **💎 Open Source & Free**: No licensing costs, built as a charitable contribution (jariyah)
- **✅ High Quality**: 90%+ test coverage, TypeScript strict mode, TDD practices

### Target Scale

- **Current Deployment**: 4 kelompok (1 in Daerah Kendal, 3 in Daerah Bandung Selatan 2)
- **Target**: National rollout to all LDII kelompok across Indonesia
- **Estimated Users**: Thousands of teachers and tens of thousands of students

---

## 2. Product Overview

### 2.1 Product Vision

To become the standard digital management system for LDII religious education nationwide, enabling efficient administration, accurate reporting, and improved educational outcomes.

### 2.2 Product Type

**Category**: Education Management System / School Information System
**Platform**: Web Application (Progressive Web App)
**Deployment Model**: Cloud-hosted (Supabase) with self-hosting option

### 2.3 Core Problem Statement

LDII's religious education programs (Generus) operate across hundreds of locations with manual, paper-based administration. This leads to:

- ❌ Inefficient attendance tracking and reporting
- ❌ Inconsistent data across organizational levels
- ❌ Difficulty monitoring student progress at scale
- ❌ Time-consuming manual report card creation
- ❌ No centralized learning material repository

### 2.4 Solution

A unified digital platform that:

- ✅ Digitizes attendance tracking with real-time sync
- ✅ Provides hierarchical data access based on organizational roles
- ✅ Automates report generation and analytics
- ✅ Enables customizable digital report cards (rapot)
- ✅ Centralizes learning materials with rich text editing
- ✅ Works offline and syncs when connected

---

## 3. Target Users & Use Cases

### 3.1 User Personas

#### **A. Superadmin**
- **Role**: System administrator with global access
- **Goals**: Configure system, manage all organizations, troubleshoot issues
- **Technical Proficiency**: High
- **Access Level**: All features, all organizations

#### **B. Admin Daerah (Regional Admin)**
- **Role**: Manages all kelompok within a daerah (region)
- **Goals**: Monitor performance across desa/kelompok, generate regional reports
- **Technical Proficiency**: Medium to High
- **Access Level**: All data within assigned daerah

#### **C. Admin Desa (Village Admin)**
- **Role**: Manages all kelompok within a desa (village)
- **Goals**: Coordinate kelompok activities, review village-level statistics
- **Technical Proficiency**: Medium
- **Access Level**: All data within assigned desa

#### **D. Admin Kelompok (Group Admin)**
- **Role**: Manages a single kelompok
- **Goals**: Manage local students/teachers, track attendance, review approvals
- **Technical Proficiency**: Medium
- **Access Level**: All data within assigned kelompok

#### **E. Pengajar (Teacher)**
- **Role**: Teaches one or more classes
- **Goals**: Take attendance, view student progress, access teaching materials
- **Technical Proficiency**: Low to Medium
- **Access Level**: Only classes they teach
- **Configurable Permissions**: Can be granted student management permissions

#### **F. Santri (Student)** *(Future)*
- **Role**: Student in the program
- **Goals**: View personal data, report cards, learning materials
- **Technical Proficiency**: Low
- **Access Level**: Own data only

### 3.2 Primary Use Cases

1. **Attendance Management**
   - Create meetings (single or multi-class)
   - Record attendance (H/S/I/A status)
   - Auto-save with offline support
   - View attendance history

2. **Student Lifecycle Management**
   - Batch import students (up to 20 at once)
   - Transfer students across organizations (with approval workflow)
   - Archive students (graduated/inactive)
   - Soft delete (recoverable) and hard delete (permanent)

3. **Report Generation**
   - Monthly attendance reports
   - Annual statistics
   - Custom filtered reports
   - Export to PDF

4. **Report Card (Rapot) Management**
   - Create custom report card templates (drag-and-drop)
   - Assign templates to classes
   - Fill student evaluations
   - Generate PDF report cards

5. **Learning Materials Management**
   - Create materials with rich text editor (TipTap)
   - Organize by class/topic
   - Share materials across classes

6. **Organizational Management**
   - Manage daerah/desa/kelompok structure
   - Assign admins to organizational levels
   - Role-based data filtering

---

## 4. Core Features & Modules

### 4.1 Authentication & Authorization

**Tech**: Supabase Auth + Row Level Security (RLS)

- **Email/Password Login**: Secure authentication with Supabase
- **Role-Based Access Control (RBAC)**: 5 roles (superadmin, admin, teacher, student)
- **Hierarchical Data Access**: Users only see data within their organizational scope
- **Session Management**: Persistent login with automatic token refresh
- **Password Recovery**: Email-based password reset

### 4.2 Dashboard & Home

**Route**: `/home`, `/dashboard`

**Features**:
- **Quick Stats**: Total students, classes, attendance rate
- **Recent Activity**: Latest meetings and attendance logs
- **Upcoming Meetings**: Calendar view
- **Performance Metrics**: Charts and graphs (Recharts)
- **Role-Specific Views**: Different dashboards for admins vs teachers

### 4.3 Attendance Management (Absensi)

**Route**: `/absensi`

**Features**:

#### Meeting Creation
- **Meeting Types**: ASAD, PEMBINAAN, SAMBUNG_KELOMPOK/DESA/DAERAH/PUSAT
- **Class Selection**: Single or multiple classes
- **Date & Time**: Flexible scheduling
- **Eligibility Rules**: Type-based class restrictions (e.g., ASAD excludes PAUD/Pengajar)

#### Attendance Recording
- **Status Codes**: H (Hadir), S (Sakit), I (Izin), A (Alpha)
- **Reason Field**: Optional note for absences
- **Auto-Save**: Debounced updates to prevent data loss
- **Multi-Class Support**: Record attendance for meetings spanning multiple classes
- **Offline Mode**: Cache locally and sync when online

#### Attendance History
- **Calendar View**: Browse past meetings
- **Edit Capability**: Update attendance within permission rules
- **Teacher Permissions**: Caberawit teachers can edit Pengajar meetings

**Technical Implementation**:
- **Composite Key**: (student_id, meeting_id) for upsert operations
- **Real-Time Sync**: SWR hooks with optimistic updates
- **Batch Fetching**: For large datasets (`fetchAttendanceLogsInBatches()`)

### 4.4 Student Management (Siswa)

**Route**: `/users/siswa`

**Features**:

#### Student List
- **Filtering**: By class, kelompok, status
- **Search**: By name, NIS (student ID)
- **Sorting**: By name, class, join date
- **Pagination**: Client-side for performance
- **Bulk Actions**: Archive, transfer, delete multiple students

#### Student Detail
- **Biodata**: Personal information, contact details
- **Class Enrollment**: Current and historical classes
- **Attendance History**: View all attendance records
- **Report Cards**: Access to rapot history
- **Transfer Requests**: Pending/approved/rejected transfers

#### Batch Import
- **Wizard UI**: 3-step process (Config → Review → Import)
- **CSV/Excel Support**: Template-based import
- **Validation**: Pre-import data validation
- **Capacity**: 1-20 students per batch
- **Rollback**: Cancel before final import

#### Student Lifecycle
- **Archive**: Set status to `graduated` or `inactive`
  - Keeps data for historical reports
  - Hidden from active lists
  - Reversible (unarchive)
- **Transfer**: Move to different org/class
  - Auto-approved within same org
  - Requires approval for cross-org transfers
  - Bulk transfer support
- **Soft Delete**: Mark as deleted (restorable within retention period)
- **Hard Delete**: Permanent removal (superadmin only)

**Permissions**:
- **Default Admin**: All actions
- **Configurable Teacher Permissions**:
  - `can_archive_students`
  - `can_transfer_students`
  - `can_soft_delete_students`
  - `can_hard_delete_students` (always false for teachers)

### 4.5 Teacher Management (Guru)

**Route**: `/users/guru`

**Features**:

#### Teacher List
- **Filtering**: By kelompok, class assignment
- **Search**: By name, email
- **Class Assignment**: Multiple classes per teacher

#### Teacher Detail
- **Profile Information**: Name, email, contact
- **Class Assignments**: List of assigned classes
- **Permissions**: Configurable student management permissions
- **Meeting History**: Meetings created by this teacher

#### Settings
- **Grant Permissions**: Enable/disable student management actions
- **Class Assignment**: Add/remove class assignments

### 4.6 Admin Management

**Route**: `/users/admin`

**Features**:

- **Admin Types**: Daerah, Desa, Kelompok
- **Organizational Assignment**: Link admin to specific daerah/desa/kelompok
- **Permission Validation**: Ensure admins only manage their scope
- **Role Upgrade/Downgrade**: Change admin levels

### 4.7 Class Management (Kelas)

**Route**: `/kelas`

**Features**:

#### Class Organization
- **Class Hierarchy**: Class → Class Master (Jenjang) → Category
- **Class Masters (Jenjang)**:
  - PAUD
  - Kelas 1-6 (Caberawit)
  - Pra Remaja
  - Remaja
  - Pra Nikah
  - Orang Tua
  - Pengajar
- **Class Master Mappings**: Junction table linking classes to masters
- **Sort Order**: All class lists sorted by `class_master.sort_order`

#### Class Configuration
- **Name & Code**: Custom naming per kelompok
- **Kelompok Assignment**: Link class to organizational unit
- **Teacher Assignment**: Multiple teachers per class
- **Student Enrollment**: Multiple students per class (via `student_classes`)
- **Meeting Types**: Eligible meeting types per class
- **Special Flags**:
  - `is_sambung_capable`: Can participate in Sambung meetings
  - `exclude_pembinaan`: Sambung-only classes

**Technical Note**:
- **CRITICAL**: Never use PostgREST nested join for `class_master.sort_order` (silently fails)
- **Always use two-query pattern**: Fetch `class_master_mappings` → fetch `class_masters` by IDs → join in code

### 4.8 Report Generation (Laporan)

**Route**: `/laporan`

**Features**:

#### Report Types
- **Monthly Attendance**: Attendance summary for a month
- **Annual Statistics**: Yearly performance metrics
- **Custom Filtered Reports**: User-defined filters

#### DataFilter Component
- **Shared Filter UI**: Centralized filtering across pages
- **Filter Options**:
  - Date Range (month/year)
  - Class (single or multiple)
  - Kelompok (organizational scope)
  - Meeting Type (ASAD, PEMBINAAN, SAMBUNG)
  - Student Status (active/archived)
- **Dynamic Options**: Filter choices based on user role

#### Export Capabilities
- **PDF Export**: Generate printable reports
- **Charts & Graphs**: Visual representation (Recharts)
- **Summary Statistics**: Aggregated metrics

**Key Business Rules**:
- **Class Filter Logic**: ALWAYS filter by meeting's class, NOT student's enrolled class
  - Prevents showing attendance from other classes for multi-class students
  - See `docs/claude/business-rules.md#filtering--reporting-conventions`

### 4.9 Report Cards (Rapot)

**Route**: `/rapot`

**Features**:

#### Template Management (`/rapot/templates`)
- **Template Builder**: Drag-and-drop field editor
- **Field Types**:
  - Text Input
  - Number Input
  - Textarea
  - Dropdown/Select
  - Date Picker
  - Heading/Section
- **Template Assignment**: Link templates to specific classes or jenjang
- **Version Control**: Track template changes over time

#### Report Card Entry (`/rapot`)
- **Student Selection**: Choose student to evaluate
- **Template-Based Form**: Dynamic form based on assigned template
- **Auto-Save**: Prevent data loss during entry
- **Bulk Entry**: Evaluate multiple students in sequence

#### Report Card Generation (`/rapot/[studentId]`)
- **PDF Generation**: @react-pdf/renderer
- **Print-Ready**: Professional layout
- **Historical Access**: View past report cards
- **Download**: Save as PDF file

**Template Examples**:
- Academic Performance (grades for subjects)
- Behavior Assessment (akhlak, discipline)
- Memorization Progress (hafalan surat, doa)
- Teacher Comments

### 4.10 Learning Materials (Materi)

**Route**: `/materi`

**Features**:

#### Material Creation
- **Rich Text Editor**: TipTap with formatting options
  - Bold, Italic, Underline
  - Headings (H1-H6)
  - Lists (ordered/unordered)
  - Links
  - Code blocks
- **File Attachments**: Upload documents, images (future)
- **Categorization**: Organize by topic, class, jenjang

#### Material Sharing
- **Class Assignment**: Share materials with specific classes
- **Public Library**: Organizational-wide materials (future)
- **Search & Filter**: Find materials by keyword, category

#### Material Consumption
- **View Mode**: Clean reading interface
- **Bookmark**: Save favorite materials (future)
- **Print/Download**: Export materials (future)

### 4.11 Organizational Management (Organisasi)

**Route**: `/organisasi`

**Features**:

#### Organizational Hierarchy
- **Daerah (Region)**: Top-level organizational unit
- **Desa (Village)**: Mid-level organizational unit
- **Kelompok (Group)**: Lowest-level operational unit

#### CRUD Operations
- **Create**: Add new daerah/desa/kelompok
- **Edit**: Update organizational details
- **Delete**: Soft delete with validation (prevent deletion if has active data)
- **Assign Admins**: Link admin users to organizational units

#### Data Filtering
- **Role-Based Tabs**: Admins see tabs for daerah/desa/kelompok based on role
- **Hierarchical Filtering**: Filter lower-level data by parent organization

### 4.12 Settings & Configuration

**Route**: `/settings`

**Features**:

#### Profile Settings (`/settings/profile`)
- **Personal Information**: Name, email, phone
- **Password Change**: Secure password update
- **Avatar Upload** (future)

#### PWA Settings (`/settings/pwa`)
- **Install Prompt**: Guide users to install PWA
- **Notification Preferences**: Configure push notifications (future)
- **Offline Mode**: View cached data status

#### Cache Management (`/settings/cache`)
- **Clear Cache**: Force refresh of local data
- **SWR Cache Stats**: View cache hit rates (future)
- **Troubleshooting**: Reset localStorage

#### System Settings (Superadmin only)
- **Feature Flags**: Enable/disable features globally
- **Maintenance Mode**: Block access for maintenance
- **Backup & Restore**: Database snapshots (future)

### 4.13 Academic Year Management (Tahun Ajaran)

**Route**: `/tahun-ajaran`

**Status**: 🚧 In Development

**Planned Features**:
- **Auto Academic Year**: Automatically create academic year based on dates
- **Year Transition**: Promote students to next class
- **Historical Data**: Archive past academic years
- **Report Filtering**: Filter reports by academic year

### 4.14 Monitoring & Analytics

**Route**: `/monitoring`

**Status**: ✅ Implemented (Basic), 🚧 Enhanced Features in Development

**Features**:

#### Real-Time Monitoring
- **Active Users**: Current logged-in users
- **System Health**: Database connection, API response times
- **Error Tracking**: Application errors and warnings

#### Analytics Dashboard
- **Attendance Trends**: Line charts showing attendance over time
- **Class Performance**: Comparative bar charts
- **Student Growth**: Total student counts over time
- **Teacher Activity**: Meeting creation frequency

**Future Enhancements**:
- Predictive analytics (student at-risk detection)
- Comparative analysis across kelompok
- Export analytics to Excel/CSV

---

## 5. Technical Architecture

### 5.1 Technology Stack

#### **Frontend**
- **Framework**: Next.js 15 (App Router, React Server Components)
- **UI Library**: React 19
- **Language**: TypeScript 5 (strict mode)
- **Styling**: Tailwind CSS 4 + Ant Design components
- **State Management**:
  - Zustand (client state, persisted to localStorage)
  - SWR (server state, data fetching with cache)
- **Forms**: React Hook Form (future)
- **Charts**: Recharts
- **PDF Generation**: @react-pdf/renderer
- **Rich Text**: TipTap
- **Drag & Drop**: @dnd-kit (rapot template builder)

#### **Backend**
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **API**: Supabase PostgREST + Next.js Server Actions
- **Storage**: Supabase Storage (future for file uploads)
- **Real-Time**: Supabase Realtime (future for live updates)

#### **DevOps & Testing**
- **Testing**: Vitest + @testing-library/react
- **Code Quality**: ESLint + Prettier
- **Type Checking**: TypeScript compiler
- **CI/CD**: GitHub Actions (future)
- **Deployment**: Vercel (recommended) or self-hosted

#### **PWA**
- **Service Worker**: Next.js PWA plugin
- **Offline Cache**: Workbox strategies
- **Manifest**: Custom app manifest for installation

### 5.2 Architecture Patterns

#### **App Router Structure**

```
src/app/
├── (full-width-pages)/       # Public/auth pages
│   └── login/                 # Login page
├── (admin)/                   # Protected admin pages
│   ├── layout.tsx             # Shared layout with sidebar
│   ├── home/                  # Dashboard
│   ├── absensi/               # Attendance
│   ├── users/
│   │   ├── siswa/             # Students
│   │   ├── guru/              # Teachers
│   │   └── admin/             # Admins
│   ├── kelas/                 # Classes
│   ├── laporan/               # Reports
│   ├── rapot/                 # Report cards
│   ├── materi/                # Materials
│   ├── organisasi/            # Organizations
│   ├── tahun-ajaran/          # Academic years
│   ├── monitoring/            # Monitoring
│   └── settings/              # Settings
```

#### **Feature Co-Location Pattern**

Each feature directory contains:
```
feature/
├── page.tsx                   # Page component
├── actions.ts                 # Server actions
├── hooks/                     # Custom SWR hooks
├── stores/                    # Zustand stores
├── components/                # Feature-specific components
└── __tests__/                 # Unit/integration tests
```

#### **3-Layer Architecture**

1. **Presentation Layer** (Client Components)
   - UI components (`components/ui/`, `components/shared/`)
   - Feature components (`app/(admin)/*/components/`)
   - Hooks for data fetching (`app/(admin)/*/hooks/`)

2. **Business Logic Layer** (Server Actions)
   - Server actions (`app/(admin)/*/actions.ts`)
   - Utility functions (`lib/`)
   - Permission helpers (`lib/studentPermissions.ts`, `lib/accessControlServer.ts`)

3. **Data Layer** (Supabase)
   - Database schemas (PostgreSQL)
   - Row Level Security (RLS) policies
   - Database functions and triggers

#### **Type Management**

**CRITICAL**: All domain types centralized in `src/types/`

```
src/types/
├── attendance.ts              # Attendance-related types
├── auth.ts                    # Auth & user types
├── class.ts                   # Class types
├── database.ts                # Supabase database types
├── filter.ts                  # Filter types
├── meeting.ts                 # Meeting types
├── organization.ts            # Org types
├── rapot.ts                   # Report card types
├── student.ts                 # Student types
└── index.ts                   # Re-exports
```

**Rules**:
- Never define types inline in components/actions
- Import from `@/types/*`
- Use `extends` for type hierarchies (e.g., `Student extends BaseStudent`)

### 5.3 Data Fetching Patterns

#### **Pattern 1: Server Action + SWR Hook (Reads)**

```typescript
// actions.ts
export async function getStudents() {
  'use server'
  const supabase = await createClient()
  const { data } = await supabase.from('students').select('*')
  return data
}

// hooks/useStudents.ts
export function useStudents() {
  return useSWR(SWR_KEYS.STUDENTS, getStudents)
}

// page.tsx
const { data: students } = useStudents()
```

#### **Pattern 2: Direct Server Action (Mutations)**

```typescript
// actions.ts
export async function updateStudent(id: string, data: any) {
  'use server'
  const supabase = await createClient()
  await supabase.from('students').update(data).eq('id', id)
  revalidatePath('/users/siswa')
  return { success: true }
}

// page.tsx
import { updateStudent } from './actions'

async function handleUpdate() {
  await updateStudent(studentId, formData)
  mutate(SWR_KEYS.STUDENTS) // Revalidate SWR cache
}
```

#### **Pattern 3: Custom SWR Config (Stable Data)**

```typescript
// For data that changes infrequently (e.g., classes, organizations)
const { data } = useSWR(
  SWR_KEYS.CLASSES,
  getClasses,
  {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // 1 minute
  }
)
```

### 5.4 State Management Strategy

#### **Zustand Stores (Client State)**

**Persisted to localStorage**:
- `userProfileStore`: Current user profile data
- `sidebarStore`: Sidebar open/closed state
- `themeStore`: Dark/light theme preference
- `languageStore`: i18n language preference
- `attendanceStore`: In-progress attendance data (for offline)
- `absensiUIStore`: UI state for attendance page
- `siswaStore`: Student page UI state
- `kelasStore`: Class page UI state
- `guruStore`: Teacher page UI state
- `adminStore`: Admin page UI state
- `laporanStore`: Report page filters
- `organisasiStore`: Org page state

**Store Pattern**:
```typescript
export const useMyStore = create(
  persist(
    (set) => ({
      data: null,
      setData: (data) => set({ data }),
    }),
    {
      name: 'my-store-storage',
    }
  )
)
```

#### **SWR (Server State)**

**Centralized SWR Keys** (`lib/swr.ts`):
```typescript
export const SWR_KEYS = {
  STUDENTS: '/api/students',
  CLASSES: '/api/classes',
  MEETINGS: '/api/meetings',
  // ...
}
```

**Cache Invalidation**:
- On login/logout: `clearUserCache()` (clears all SWR caches)
- After mutations: `mutate(SWR_KEYS.*)` or `revalidatePath()`

### 5.5 Database Schema (Key Tables)

#### **Core Tables**

```sql
-- Users & Authentication
profiles (id, full_name, role, permissions, kelompok_id, ...)

-- Students
students (id, full_name, nis, status, kelompok_id, deleted_at, ...)
student_classes (student_id, class_id) -- Junction table

-- Teachers
teacher_classes (teacher_id, class_id) -- Junction table

-- Classes
classes (id, name, code, kelompok_id, ...)
class_masters (id, name, category_id, sort_order, ...)
class_master_mappings (class_id, class_master_id) -- Junction table
class_categories (id, name, code) -- PAUD, CABERAWIT, etc.

-- Attendance
meetings (id, date, type, class_id, class_ids, created_by, ...)
attendance_logs (id, student_id, meeting_id, status, reason, ...)

-- Organizations
daerah (id, name, code, ...)
desa (id, name, code, daerah_id, ...)
kelompok (id, name, code, desa_id, ...)

-- Transfer Workflow
transfer_requests (id, student_id, from_kelompok_id, to_kelompok_id,
                   status, requested_by, reviewed_by, ...)

-- Report Cards
rapot_templates (id, name, fields, class_master_id, ...)
rapot_data (id, student_id, template_id, data, academic_year, ...)

-- Learning Materials
materials (id, title, content, class_id, created_by, ...)
```

#### **Row Level Security (RLS) Policies**

All tables have RLS enabled with policies based on:
- **User Role**: superadmin, admin, teacher, student
- **Organizational Scope**: daerah_id, desa_id, kelompok_id
- **Ownership**: created_by, teacher assignments

**Example Policy** (students table):
```sql
-- Teachers can view students in their assigned classes
CREATE POLICY "Teachers can view their students"
ON students FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM student_classes sc
    JOIN teacher_classes tc ON sc.class_id = tc.class_id
    WHERE sc.student_id = students.id
      AND tc.teacher_id = auth.uid()
  )
);
```

### 5.6 Security Architecture

#### **Authentication Flow**

1. User submits email/password
2. Supabase Auth validates credentials
3. JWT token issued with user metadata
4. Client stores token in httpOnly cookie
5. Subsequent requests include token for RLS enforcement

#### **Authorization Layers**

**Layer 1: Client-Side (UI)**
- Hide/show features based on user role
- Use `lib/userUtils.ts`: `isSuperAdmin()`, `isAdmin()`, etc.
- Use `lib/studentPermissions.ts`: `canArchiveStudent()`, etc.

**Layer 2: Server Actions**
- Validate permissions before mutations
- Use `lib/accessControlServer.ts`: `canAccessFeature()`, `getDataFilter()`

**Layer 3: Database (RLS)**
- Enforce access control at row level
- Prevent unauthorized reads/writes even if client/server logic bypassed

**Defense in Depth**: All 3 layers must align for security

#### **Data Privacy**

- **No PII in Logs**: Never log personally identifiable information
- **Audit Trail**: Track who created/modified records (`created_by`, `updated_at`)
- **Soft Delete by Default**: Preserve data integrity, allow recovery
- **GDPR Compliance**: Hard delete option for superadmin (right to be forgotten)

---

## 6. User Roles & Permissions

### 6.1 Role Definitions

| Role | Code | Description | Access Level |
|------|------|-------------|--------------|
| **Superadmin** | `superadmin` | System administrator | All data, all features |
| **Admin Daerah** | `admin` | Regional admin | All data in assigned daerah |
| **Admin Desa** | `admin` | Village admin | All data in assigned desa |
| **Admin Kelompok** | `admin` | Group admin | All data in assigned kelompok |
| **Teacher** | `teacher` | Class instructor | Only assigned classes |
| **Student** | `student` | Student | Own data only *(future)* |

**Note**: Admin type (daerah/desa/kelompok) determined by `profiles.daerah_id`, `desa_id`, `kelompok_id` fields.

### 6.2 Feature Access Matrix

| Feature | Superadmin | Admin Daerah | Admin Desa | Admin Kelompok | Teacher | Student |
|---------|------------|--------------|------------|----------------|---------|---------|
| **Dashboard** | ✅ All data | ✅ Daerah data | ✅ Desa data | ✅ Kelompok data | ✅ Own classes | ✅ Own data |
| **Students: View** | ✅ All | ✅ Daerah | ✅ Desa | ✅ Kelompok | ✅ Own classes | ✅ Own data |
| **Students: Create** | ✅ | ✅ | ✅ | ✅ | ⚙️ Configurable | ❌ |
| **Students: Edit** | ✅ | ✅ | ✅ | ✅ | ⚙️ Configurable | ❌ |
| **Students: Archive** | ✅ | ✅ | ✅ | ✅ | ⚙️ Configurable | ❌ |
| **Students: Transfer** | ✅ | ✅ | ✅ | ✅ | ⚙️ Configurable | ❌ |
| **Students: Soft Delete** | ✅ | ✅ | ✅ | ✅ | ⚙️ Configurable | ❌ |
| **Students: Hard Delete** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Teachers: Manage** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Admins: Manage** | ✅ | ✅ Daerah scope | ✅ Desa scope | ✅ Kelompok scope | ❌ | ❌ |
| **Classes: Manage** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Attendance: Create Meeting** | ✅ | ✅ | ⚠️ Sambung only | ✅ | ✅ Own classes | ❌ |
| **Attendance: Take** | ✅ | ✅ | ❌ | ✅ | ✅ Own classes | ❌ |
| **Attendance: Edit** | ✅ | ✅ | ❌ | ✅ | ✅ Own + special | ❌ |
| **Reports: View** | ✅ All | ✅ Daerah | ✅ Desa | ✅ Kelompok | ✅ Own classes | ✅ Own data |
| **Reports: Export** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Rapot: Templates** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Rapot: Entry** | ✅ | ✅ | ✅ | ✅ | ✅ Own classes | ❌ |
| **Rapot: View** | ✅ All | ✅ Daerah | ✅ Desa | ✅ Kelompok | ✅ Own classes | ✅ Own rapot |
| **Materials: Create** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Materials: View** | ✅ All | ✅ Daerah | ✅ Desa | ✅ Kelompok | ✅ Assigned | ✅ Assigned |
| **Organizations: Manage** | ✅ | ✅ Daerah scope | ✅ Desa scope | ✅ Kelompok scope | ❌ | ❌ |
| **Settings: System** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Settings: Profile** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Legend**:
- ✅ Full access
- ⚙️ Configurable (via `profiles.permissions` JSONB field)
- ⚠️ Limited access
- ❌ No access

### 6.3 Configurable Teacher Permissions

Teachers can be granted these permissions by admins:

```json
{
  "can_archive_students": false,
  "can_transfer_students": false,
  "can_soft_delete_students": false,
  "can_hard_delete_students": false  // Always false for teachers
}
```

**Configuration UI**: `/users/guru` → Teacher row → Settings icon → Permissions tab

**Validation**:
- Client-side: Use `lib/studentPermissions.ts` helper functions
- Server-side: Always validate in server actions (defense in depth)
- Database: RLS policies enforce final access control

### 6.4 Meeting Type Access Rules

**Meeting Creation Permissions** by Role:

| Meeting Type | Superadmin | Admin Daerah | Admin Desa | Admin Kelompok | Teacher |
|--------------|------------|--------------|------------|----------------|---------|
| `PEMBINAAN` | ✅ | ✅ | ❌ | ✅ | ✅ Own classes |
| `ASAD` | ✅ | ✅ | ❌ | ✅ | ✅ If not PAUD/Pengajar only |
| `SAMBUNG_KELOMPOK` | ✅ | ✅ | ❌ | ✅ | ⚙️ If class `is_sambung_capable` |
| `SAMBUNG_DESA` | ✅ | ✅ | ✅ | ❌ | ⚙️ If class `is_sambung_capable` |
| `SAMBUNG_DAERAH` | ✅ | ✅ | ❌ | ❌ | ⚙️ If class `is_sambung_capable` |
| `SAMBUNG_PUSAT` | ✅ | ✅ | ❌ | ✅ | ⚙️ If class `is_sambung_capable` |

**Special Rules**:

- **ASAD**: Excludes PAUD and Pengajar classes
- **Sambung Desa**: Excludes Caberawit (PAUD/Kelas 1-6) and Pengajar classes
- **Admin Desa**: Can only create `SAMBUNG_DESA` meetings (no regular classes, only inter-group events)
- **Teachers**: Meeting types dynamically determined by assigned class properties

**Implementation**: `lib/constants/meetingTypes.ts`

---

## 7. Data Model & Business Logic

### 7.1 Organizational Hierarchy

```
Daerah (Region)
├── Desa (Village) 1
│   ├── Kelompok (Group) 1.1
│   │   ├── Classes
│   │   ├── Students
│   │   └── Teachers
│   └── Kelompok 1.2
└── Desa 2
    └── Kelompok 2.1
```

**Rules**:
- One daerah can have many desa
- One desa can have many kelompok
- Each admin is assigned to one level (daerah/desa/kelompok)
- Data access cascades down (Daerah admin sees all desa/kelompok below)

### 7.2 Class Hierarchy & Sorting

```
Class Category (e.g., CABERAWIT)
└── Class Master (e.g., Kelas 1, Kelas 2, ..., Kelas 6)
    └── Actual Class (e.g., "Kelas 1 Kelompok A")
```

**Critical: Class Sorting**

ALL class lists MUST be sorted by `class_master.sort_order` (ascending).

**NEVER use PostgREST nested join** (silently fails):
```typescript
// ❌ WRONG - This returns null
.select('*, class_masters!inner(sort_order)')
```

**ALWAYS use two-query pattern**:
```typescript
// ✅ CORRECT
// Step 1: Fetch mappings
const { data: mappings } = await supabase
  .from('class_master_mappings')
  .select('class_id, class_master_id')
  .in('class_id', classIds)

// Step 2: Fetch masters by IDs
const masterIds = mappings.map(m => m.class_master_id)
const { data: masters } = await supabase
  .from('class_masters')
  .select('id, sort_order')
  .in('id', masterIds)

// Step 3: Join in code and sort
const classesWithSortOrder = classes.map(cls => ({
  ...cls,
  sort_order: getMasterSortOrder(cls.id, mappings, masters)
})).sort((a, b) => a.sort_order - b.sort_order)
```

**Reference**: `src/app/(admin)/users/siswa/actions/classes.ts`

### 7.3 Student Lifecycle States

```
[New Student]
    ↓
  ACTIVE ←──────────────┐
    ↓                   │ (Unarchive)
    ├─→ GRADUATED ──────┤
    │                   │
    └─→ INACTIVE ───────┘
```

**Status Field** (`students.status`):
- `active`: Currently enrolled (default)
- `graduated`: Successfully completed program
- `inactive`: Not active (transferred out, leave, etc.)

**Soft Delete** (`students.deleted_at`):
- NOT a lifecycle state
- Marks data as erroneous/invalid
- Hidden from ALL views (including historical reports)
- Restorable within retention period

**Query Patterns**:
```sql
-- Active students only
WHERE status = 'active' AND deleted_at IS NULL

-- All valid students (including archived)
WHERE deleted_at IS NULL

-- Graduated students
WHERE status = 'graduated' AND deleted_at IS NULL
```

### 7.4 Transfer Workflow

**Transfer Request States**:
```
[Create Request] → pending
    ↓
    ├─→ Auto-approved (same org) → approved → executed
    │
    ├─→ Needs approval → pending
    │       ↓
    │       ├─→ [Approve] → approved → executed
    │       ├─→ [Reject] → rejected
    │       └─→ [Cancel] → cancelled
```

**Execution on Approval**:
1. Update `students.kelompok_id` to target kelompok
2. Clear current `student_classes` entries
3. Add to target class (if specified)
4. Set `transfer_requests.executed_at` timestamp

**Permissions** (`lib/studentPermissions.ts`):
- `canRequestTransfer(user, student)`: Check if user can create request
- `canReviewTransferRequest(user, request)`: Check if user can approve/reject
- `needsApproval(requester, request)`: Determine if auto-approved

**Auto-Approval Rules**:
- Same kelompok (class change only) → Auto-approved
- Superadmin transfers → Auto-approved
- Cross-kelompok → Requires approval from target admin

### 7.5 Attendance Business Rules

**Status Codes**:
- `H` (Hadir): Present
- `S` (Sakit): Sick
- `I` (Izin): Excused absence
- `A` (Alpha): Unexcused absence

**Attendance Calculation**:
```typescript
attendanceRate = (H_count / total_meetings) * 100
```

**Special Permission**: Caberawit teachers can edit Pengajar meeting attendance
- Implemented in `/absensi/[meetingId]/page.tsx` (lines 240-243)
- Requires `class_master_mappings` loaded in user profile

**Multi-Class Meetings**:
- Meetings can span multiple classes via `meetings.class_ids` array
- Attendance logs reference single `meeting_id` for all classes
- Filters must check BOTH `meeting.class_id` AND `meeting.class_ids`

### 7.6 Report Card (Rapot) Data Model

**Template Structure** (`rapot_templates.fields`):
```json
[
  {
    "id": "field-1",
    "type": "text",
    "label": "Nilai Akhlak",
    "required": true,
    "order": 1
  },
  {
    "id": "field-2",
    "type": "number",
    "label": "Hafalan Surat (jumlah)",
    "min": 0,
    "max": 114,
    "order": 2
  }
]
```

**Rapot Data Structure** (`rapot_data.data`):
```json
{
  "field-1": "Baik sekali",
  "field-2": 15
}
```

**Template Assignment**:
- Templates linked to `class_master_id` (jenjang level)
- All classes with same jenjang use same template
- Admins can override per class (future)

---

## 8. Security & Compliance

### 8.1 Authentication & Session Management

- **Authentication Provider**: Supabase Auth
- **Token Type**: JWT with httpOnly cookies
- **Session Duration**: 7 days (configurable)
- **Password Policy**: Min 8 characters (configurable)
- **Multi-Factor Auth**: Not implemented (future)

### 8.2 Authorization Strategy

**Defense in Depth** (3 layers):

1. **Client-Side**: UI-level access control
   - Hide/disable features based on role
   - Prevent unauthorized actions from being triggered

2. **Server-Side**: Business logic validation
   - Server actions validate permissions before mutations
   - Use helper functions from `lib/accessControlServer.ts`

3. **Database-Side**: Row Level Security (RLS)
   - PostgreSQL policies enforce data access at row level
   - Final line of defense against unauthorized access

### 8.3 Data Privacy & GDPR

**Personal Data Collected**:
- Student: Name, NIS, date of birth, parent contact
- Teacher: Name, email, phone
- Admin: Name, email, organizational assignment

**Data Retention**:
- Active data: Indefinite (until user/admin deletes)
- Soft deleted: 90 days retention, then permanent deletion (configurable)
- Hard deleted: Immediate permanent removal (superadmin only)

**User Rights**:
- **Right to Access**: Users can view their own data
- **Right to Rectification**: Users/admins can update data
- **Right to Erasure**: Hard delete option (superadmin only)
- **Right to Data Portability**: Export to PDF (future: CSV/Excel)

**Data Processing Legal Basis**:
- **Legitimate Interest**: Educational administration for LDII members
- **Consent**: Implied consent through enrollment in LDII programs

**Note**: As an internal LDII system (not public-facing), full GDPR compliance may not be required, but best practices are followed.

### 8.4 Security Best Practices

- ✅ **Environment Variables**: Sensitive keys in `.env.local` (never committed)
- ✅ **RLS Enabled**: All tables have Row Level Security
- ✅ **SQL Injection Prevention**: Use parameterized queries (Supabase client handles this)
- ✅ **XSS Prevention**: React auto-escapes output (no `dangerouslySetInnerHTML` except in TipTap editor with sanitization)
- ✅ **CSRF Protection**: Next.js CSRF tokens (built-in)
- ✅ **Audit Logs**: Track `created_by`, `updated_at` for critical actions
- ⚠️ **Rate Limiting**: Not implemented (future with Supabase Edge Functions)
- ⚠️ **Input Validation**: Basic client-side validation (future: Zod schemas)

---

## 9. Performance & Scalability

### 9.1 Performance Optimizations

#### **Frontend**
- **React Server Components**: Reduce client bundle size, faster initial load
- **Code Splitting**: Lazy load routes with Next.js dynamic imports
- **Image Optimization**: Next.js Image component with automatic WebP conversion
- **SWR Caching**: Reduce redundant API calls with intelligent cache
- **Debounced Auto-Save**: Batch updates to prevent excessive writes

#### **Backend**
- **Database Indexes**: Composite indexes on frequent query columns
  - `(student_id, meeting_id)` for `attendance_logs`
  - `(kelompok_id, status)` for `students`
  - `(class_id, student_id)` for `student_classes`
- **Batch Fetching**: Use `fetchAttendanceLogsInBatches()` for large datasets
- **Query Optimization**: Select only needed columns, use joins wisely
- **Connection Pooling**: Supabase handles connection pooling

#### **Caching Strategy**
- **SWR Cache**: Client-side cache with stale-while-revalidate
  - Short TTL for frequently changing data (attendance)
  - Long TTL for stable data (classes, organizations)
- **Browser Cache**: Static assets cached with aggressive cache headers
- **Service Worker Cache**: Offline cache for PWA (future: workbox strategies)

### 9.2 Scalability Considerations

#### **Current Scale**
- **Users**: ~50-100 concurrent users (4 kelompok)
- **Students**: ~500-1000 students
- **Attendance Logs**: ~10,000-50,000 logs
- **Database Size**: <1 GB

#### **Target Scale (National Rollout)**
- **Users**: ~5,000-10,000 concurrent users
- **Students**: ~100,000-500,000 students
- **Attendance Logs**: ~10M-50M logs
- **Database Size**: 10-50 GB

#### **Scalability Strategies**

**Database**:
- ✅ **Supabase Scaling**: Automatic read replicas, connection pooling
- 🚧 **Partitioning**: Partition `attendance_logs` by year (future)
- 🚧 **Archiving**: Move old data to archive tables (future)

**Application**:
- ✅ **Horizontal Scaling**: Vercel auto-scales Edge Functions
- ✅ **CDN**: Next.js static assets served via Vercel Edge Network
- 🚧 **Load Balancing**: Multiple regions for global deployment (future)

**Monitoring**:
- 🚧 **Performance Monitoring**: Sentry/DataDog integration (future)
- 🚧 **Database Metrics**: Query performance tracking (future)
- 🚧 **Error Tracking**: Automated error alerts (future)

### 9.3 Performance Benchmarks

**Target Metrics**:
- **Initial Page Load**: <2 seconds (on 3G)
- **Attendance Save**: <500ms
- **Report Generation**: <3 seconds (100 students)
- **PDF Export**: <5 seconds (10-page document)
- **Database Queries**: <100ms (95th percentile)

**Testing**: Performance tests not yet implemented (future: Lighthouse CI)

---

## 10. Deployment & Infrastructure

### 10.1 Hosting & Infrastructure

**Recommended Stack**:
- **Frontend**: Vercel (Next.js optimized)
- **Database**: Supabase (managed PostgreSQL)
- **Storage**: Supabase Storage (future for file uploads)
- **Analytics**: Umami (self-hosted) or Vercel Analytics

**Self-Hosting Option**:
- **Frontend**: Any Node.js hosting (Docker, VPS)
- **Database**: Self-hosted PostgreSQL with Supabase libraries
- **Requirements**: Node.js 18+, PostgreSQL 14+

### 10.2 Environment Configuration

**Required Environment Variables** (`.env.local`):
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Optional**:
```bash
NEXT_PUBLIC_USE_DUMMY_DATA=false
NEXT_PUBLIC_UMAMI_WEBSITE_ID=your-umami-id
```

### 10.3 Deployment Workflow

**Production Deployment** (Vercel):
1. Push to `master` branch
2. Vercel auto-deploys
3. Run database migrations (manual via Supabase Dashboard)
4. Verify deployment

**Branch Previews**:
- Push to any branch → Vercel creates preview deployment
- Use for testing before merging to `master`

**Rollback**:
- Vercel allows instant rollback to previous deployment
- Database migrations require manual rollback (use migration down scripts)

### 10.4 Database Migrations

**Current Process** (Manual):
1. Write migration SQL in Supabase SQL Editor
2. Test on staging project
3. Run on production
4. Document in `docs/migrations/` (future)

**Future** (Automated):
- Use Supabase CLI for migration management
- Version-controlled migrations in git
- CI/CD pipeline runs migrations automatically

### 10.5 Monitoring & Observability

**Current**:
- ✅ Vercel analytics (basic metrics)
- ✅ Supabase dashboard (database stats)
- ⚠️ Client-side error logging (console only)

**Future**:
- 🚧 Sentry for error tracking
- 🚧 DataDog/New Relic for APM
- 🚧 Custom monitoring dashboard (`/monitoring` page enhanced)
- 🚧 Automated alerts (Slack/email)

### 10.6 Backup & Disaster Recovery

**Database Backups**:
- **Supabase**: Automatic daily backups (7-day retention on free tier, 30+ on paid)
- **Manual Backups**: Export via Supabase Dashboard → Download SQL dump

**Disaster Recovery Plan**:
1. **Database Failure**: Restore from latest Supabase backup
2. **Vercel Outage**: Deploy to alternative provider (Netlify, Railway)
3. **Supabase Outage**: Self-host PostgreSQL with backup restoration
4. **Data Corruption**: Rollback to previous backup, reprocess recent data

**RTO (Recovery Time Objective)**: <4 hours
**RPO (Recovery Point Objective)**: <24 hours (daily backups)

---

## 11. Roadmap & Future Enhancements

### 11.1 Short-Term (Q2 2026)

**✅ Completed**:
- ✅ Core attendance system (ASAD, PEMBINAAN, SAMBUNG)
- ✅ Student/teacher/admin management
- ✅ Transfer approval workflow
- ✅ Rapot template builder
- ✅ Learning materials with rich text editor
- ✅ PWA support

**🚧 In Progress**:
- Tahun Ajaran (Academic Year) auto-management
- Enhanced monitoring dashboard
- Student Hafalan (Memorization) tracking

### 11.2 Mid-Term (Q3-Q4 2026)

**Planned Features**:

1. **Hafalan (Memorization) Tracking**
   - Track surat (Quran chapters), doa (prayers), hadist memorization
   - Progress visualization
   - Integration with rapot

2. **Advanced Analytics**
   - Predictive analytics (student at-risk detection)
   - Comparative analysis across kelompok
   - Trend analysis over academic years

3. **Export & Integration**
   - Export reports to Excel/CSV
   - WhatsApp notification integration (attendance reminders)
   - Email digests for admins (weekly/monthly reports)

4. **Enhanced Rapot**
   - Multiple templates per class
   - Template versioning
   - Digital signatures
   - Parental access (view-only)

5. **Performance Optimization**
   - Database query optimization
   - Partitioning for large tables
   - Improved caching strategies

### 11.3 Long-Term (2027+)

**Wishlist**:

1. **Payment Integration**
   - Infaq/SPP tracking
   - Payment receipts
   - Financial reports

2. **Mobile Native App**
   - React Native or Flutter
   - Push notifications
   - Offline-first architecture

3. **Gamification**
   - Student achievement badges
   - Leaderboards (with opt-in privacy)
   - Motivation system

4. **Video Conferencing**
   - Integrated online classes
   - Recording playback
   - Attendance auto-tracking

5. **Digital Library**
   - E-books repository
   - Audio murotal (Quran recitation)
   - Video lessons

6. **Parent Portal**
   - View child's progress
   - Receive notifications
   - Communication with teachers

7. **Multi-Language Support**
   - English, Arabic translations
   - i18n framework integration

8. **Advanced Permissions**
   - Granular permission management
   - Custom role creation
   - Approval workflows for sensitive actions

### 11.4 Technical Debt & Improvements

**Code Quality**:
- [ ] Increase test coverage to 95%+ (currently 90%)
- [ ] Add E2E tests (Playwright)
- [ ] Implement Zod schemas for validation
- [ ] Refactor large components into smaller units

**Documentation**:
- [ ] User manual (Bahasa Indonesia)
- [ ] Admin guide
- [ ] Developer onboarding guide
- [ ] API documentation (if public API planned)

**Infrastructure**:
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Automated database migrations
- [ ] Staging environment
- [ ] Performance monitoring setup

---

## 12. Appendices

### 12.1 Glossary

| Term | Indonesian | Definition |
|------|------------|------------|
| **ASAD** | Anak Soleh Anak Doktrin | Weekly mandatory meeting for all students (except PAUD/Pengajar) |
| **Caberawit** | Cabang Berawal Wiyata | Elementary-level classes (Kelas 1-6) |
| **Daerah** | Regional unit | Top organizational level (equivalent to DPD) |
| **Desa** | Village unit | Mid organizational level (equivalent to PC) |
| **Generus** | Generasi Penerus | Next generation (students in LDII religious education) |
| **Hafalan** | Memorization | Quran/hadist/doa memorization tracking |
| **Kelompok** | Group unit | Lowest operational organizational level (equivalent to PAC) |
| **LDII** | Lembaga Dakwah Islam Indonesia | Indonesian Islamic Propagation Institute |
| **Pembinaan** | Regular class meeting | Standard class instruction session |
| **Pengajar** | Teacher/Instructor | Teacher training class or role |
| **Rapot** | Report Card | Student evaluation document |
| **Sambung** | Connection/Bridge | Multi-class/multi-group meeting |
| **Santri** | Student | Religious education student |

### 12.2 Technical Abbreviations

| Abbr | Full Term | Description |
|------|-----------|-------------|
| **PWA** | Progressive Web App | Web app installable as native app |
| **RLS** | Row Level Security | PostgreSQL row-level access control |
| **SWR** | Stale-While-Revalidate | Data fetching library |
| **TDD** | Test-Driven Development | Write tests before implementation |
| **JWT** | JSON Web Token | Authentication token format |
| **RBAC** | Role-Based Access Control | Permission system based on roles |
| **CRUD** | Create, Read, Update, Delete | Basic data operations |
| **SSR** | Server-Side Rendering | Render pages on server |
| **RSC** | React Server Components | Server-rendered React components |

### 12.3 Contact & Support

**Developer**: Abu Abdirohman
**License**: Open Source (specify: MIT / GPL / LDII-only)
**Repository**: [GitHub link]
**Support Email**: [Email if public]

**For LDII Members**:
- Technical issues: Contact local IT coordinator
- Feature requests: Submit via [feedback form/GitHub issues]
- Training: Contact regional admin for onboarding

---

## 13. Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.8.1 | 2026-03-15 | Product Specifications document created | Abu Abdirohman |
| 1.8.0 | 2026-02-22 | Transfer approval workflow implemented | Abu Abdirohman |
| 1.7.0 | 2026-02-11 | Rapot template builder completed | Abu Abdirohman |
| 1.6.0 | 2026-01-10 | Materi (learning materials) module added | Abu Abdirohman |
| 1.5.0 | 2025-12-01 | Multi-class meetings support | Abu Abdirohman |
| 1.0.0 | 2025-10-01 | Initial production release | Abu Abdirohman |

---

**Document End**

*This product specification is a living document and will be updated as features are added and requirements evolve.*
