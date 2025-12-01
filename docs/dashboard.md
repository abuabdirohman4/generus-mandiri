**Core Requirements Identified:**
1. **Dashboard Redesign (Admin-only):**
   - Remove filter dropdown (use RLS auto-filtering by role instead)
   - Remove redundant charts that duplicate Laporan page functionality
   - Add **Class Monitoring Table** as main feature showing:
     - All classes with their meeting status (today/week/month/custom periods)
     - Percentage attendance for each class
     - Clear indication when classes have NO meetings (orange warning highlight)
     - Sortable columns
     - Organizational info display based on user role (Daerah/Desa/Kelompok)
     - Tab selector for periods: Hari Ini | Minggu Ini | Bulan Ini | Custom

2. **Home Page Enhancement (Teacher-focused):**
   - Display teacher's meetings today
   - Show top 5 performing students (most rajin, ≥75% attendance)
   - Show students needing attention (<75% attendance, highlighted by severity)
   - Period selector (Minggu Ini / Bulan Ini)
   - All within Home page, NOT a separate dashboard for teachers

3. **Navigation:**
   - Keep Dashboard and Home as separate pages
   - Dashboard is admin-only for monitoring
   - Home is navigation hub for all users

4. **Code Quality:**
   - Remove ALL unused code from actions.ts
   - Make code efficient and DRY (Don't Repeat Yourself)
   - Implement incrementally: Dashboard first, then Home page