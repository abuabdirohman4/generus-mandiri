# Database Optimization Plan

> **Status:** Planning/Documentation Phase
> **Created:** December 24, 2025
> **Last Updated:** December 24, 2025
> **Implementation Status:** NOT YET IMPLEMENTED - Documentation only

## Executive Summary

This document provides a comprehensive optimization plan for the `attendance_logs` table and overall database performance in the Generus Mandiri school management system.

**Current Status (Dec 2024):**
- ✅ Database is healthy and performing well
- ✅ No urgent optimization needed
- ✅ Current scale: ~6,444 attendance records
- ✅ Estimated capacity: 10-20+ years before issues

**When to Implement:** When database reaches specific thresholds (detailed below)

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Performance Optimization Plan](#performance-optimization-plan)
3. [Archiving Strategy](#archiving-strategy)
4. [Implementation Guide](#implementation-guide)
5. [Monitoring & Triggers](#monitoring--triggers)
6. [Rollback Procedures](#rollback-procedures)

---

## Current State Analysis

### Database Metrics (as of Dec 2024)

**Attendance Logs Table:**
- **Rows:** 6,444 attendance records
- **Estimated Size:** ~2-3 MB (including indexes)
- **Related Tables:**
  - meetings: 389 rows
  - students: 373 rows
  - classes: 41 rows
  - student_classes: 411 rows

**Total Database:**
- **Estimated Size:** <50 MB
- **Supabase Free Tier Limit:** 500 MB
- **Current Usage:** ~10% of capacity
- **Remaining Capacity:** ~450 MB (90% free)

### Growth Projections

**Conservative Scenario (Current Activity):**
- Meetings per month: ~30-40
- Students per meeting: ~17
- New logs per month: ~510
- Annual growth: ~6,120 logs = ~1.2-1.8 MB

**Growth Scenario (2x expansion):**
- Students double to ~750
- Meetings increase 1.5x
- Annual growth: ~18,000 logs = ~3.6-5.4 MB

**Maximum Scenario (1,000 students, daily meetings):**
- Annual growth: ~36,000 logs = ~7-10 MB

### Capacity Timeline

**Time Until Database Capacity Issues:**
- Conservative growth: **>100 years**
- Growth scenario: **30-40 years**
- Maximum scenario: **15-20 years**

**Conclusion:** Database capacity is NOT a concern for foreseeable future.

### Current Schema Design

**Attendance Logs Table Structure:**
```sql
CREATE TABLE attendance_logs (
  id UUID PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  status CHAR(1) NOT NULL, -- H/I/S/A
  reason TEXT,
  recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Design Evaluation:** ✅ **EXCELLENT**
- Single table approach is industry standard
- Follows best practices from school management systems (PowerSchool, Infinite Campus)
- Appropriate for current and projected scale
- No immediate changes needed

---

## Performance Optimization Plan

### Index Recommendations

**Current Status:** Indexes may be incomplete (needs verification)

**Recommended Indexes (Add When Query Performance Degrades):**

```sql
-- Core indexes for foreign keys
-- Add these when queries on these columns start taking >500ms
CREATE INDEX CONCURRENTLY idx_attendance_logs_meeting_id
  ON attendance_logs(meeting_id);

CREATE INDEX CONCURRENTLY idx_attendance_logs_student_id
  ON attendance_logs(student_id);

CREATE INDEX CONCURRENTLY idx_attendance_logs_date
  ON attendance_logs(date);

CREATE INDEX CONCURRENTLY idx_attendance_logs_status
  ON attendance_logs(status);

-- Composite indexes for common query patterns
-- Add these when report generation becomes slow (>2s)
CREATE INDEX CONCURRENTLY idx_attendance_logs_student_date
  ON attendance_logs(student_id, date DESC);

CREATE INDEX CONCURRENTLY idx_attendance_logs_meeting_student
  ON attendance_logs(meeting_id, student_id);

CREATE INDEX CONCURRENTLY idx_attendance_logs_date_status
  ON attendance_logs(date, status);
```

**Why CONCURRENTLY?**
- Does not lock the table during index creation
- Safe for production databases
- Slightly slower but zero downtime

### When to Add Indexes

**Triggers:**
1. **Query Performance Degradation**
   - Reports taking >2 seconds to load
   - Attendance page slow during peak usage
   - Dashboard queries timing out

2. **Data Volume Thresholds**
   - Attendance logs exceed 50,000 rows
   - Multiple years of data accumulated

3. **User Complaints**
   - Teachers report slow attendance entry
   - Admins report slow report generation

**How to Verify Need:**
```sql
-- Check slow queries in Supabase Dashboard
-- Or run EXPLAIN ANALYZE on suspected slow queries

EXPLAIN ANALYZE
SELECT al.*, s.name, m.title
FROM attendance_logs al
JOIN students s ON al.student_id = s.id
JOIN meetings m ON al.meeting_id = m.id
WHERE al.date >= '2024-01-01'
  AND al.date <= '2024-12-31';

-- Look for "Seq Scan" in output = needs index
-- Look for "Index Scan" = already optimized
```

### Unique Constraint Clarification

**Issue Found:** Code uses inconsistent composite keys
- `saveAttendance()`: uses `(student_id, date)`
- `saveAttendanceForMeeting()`: uses `(student_id, meeting_id)`

**Recommendation:** Add unique constraint on `(student_id, meeting_id)`

**Reasoning:**
- Students can attend multiple meetings on same date (different classes)
- `(student_id, meeting_id)` is the natural unique identifier
- More logical for multi-class support

**Implementation (when fixing):**
```sql
-- Add unique constraint
ALTER TABLE attendance_logs
  ADD CONSTRAINT unique_student_meeting
  UNIQUE (student_id, meeting_id);

-- Then update code to consistently use this pattern
```

---

## Archiving Strategy

### Overview

**What is Archiving?**
Moving old, inactive attendance data from the primary `attendance_logs` table to a separate `attendance_logs_archive` table to:
- Keep active queries fast
- Reduce table size
- Maintain historical data accessibility

**When to Archive?**
- **NOT YET NEEDED** - Current scale is too small
- **Start Planning:** When >50,000 rows
- **Implement:** When >100,000 rows (~2-3 years from now)

### Recommended Approach

**Academic Year-Based Archiving:**
- Archive completed academic years
- Keep current + 1 previous year in active table
- Move older data to archive table

**Timeline:**
```
Active Table (Fast):    Current year + Previous year (0-2 years old)
Archive Table (Slower): Historical data (2-5 years old)
Cold Storage (Files):   Very old data (5+ years old)
```

### Storage Tiers

**Tier 1: Active Database (Hot Storage)**
- **Data:** Current academic year
- **Access:** Daily (reports, dashboards, attendance entry)
- **Performance:** <500ms queries
- **Location:** `attendance_logs` table

**Tier 2: Archive Database (Warm Storage)**
- **Data:** Previous 2-5 years
- **Access:** Weekly/monthly (historical reports, transcripts)
- **Performance:** <2s queries
- **Location:** `attendance_logs_archive` table

**Tier 3: Cold Storage (Compliance)**
- **Data:** 5+ years old
- **Access:** Rare (legal requests, audits)
- **Performance:** Minutes (manual export/import)
- **Location:** CSV files in Supabase Storage

**Tier 4: Deletion/Anonymization**
- **Data:** >10 years old
- **Process:** Review for legal retention requirements
- **Action:** Delete or anonymize (remove PII)

### Legal Retention Requirements

**Indonesia (Generus Mandiri Context):**
- Ministry of Education: **5 years minimum** for student records
- Regional requirements: **7 years** for audits
- Best practice: **10 years** for complete protection

**What to Keep:**
- Student attendance records
- Meeting records (dates, teachers)
- Academic year definitions
- Class assignments

**What Can Be Deleted** (after retention period):
- Detailed attendance reasons (if not disciplinary)
- Temporary class assignments
- Draft/incomplete records

---

## Implementation Guide

> **IMPORTANT:** This is a step-by-step guide for FUTURE implementation.
> Do NOT execute now - wait for trigger conditions (see Monitoring section).

### Phase 1: Preparation (No Impact on Operations)

**Step 1: Add Academic Year Reference**

```sql
-- Add column to link attendance to academic years
ALTER TABLE attendance_logs
  ADD COLUMN academic_year_id UUID REFERENCES academic_years(id);

-- Backfill existing data
-- Link attendance logs to academic years based on meeting date
UPDATE attendance_logs al
SET academic_year_id = ay.id
FROM meetings m, academic_years ay
WHERE al.meeting_id = m.id
  AND m.date >= ay.start_date
  AND m.date <= ay.end_date;

-- Verify backfill
SELECT
  COUNT(*) as total,
  COUNT(academic_year_id) as with_year,
  COUNT(*) - COUNT(academic_year_id) as missing_year
FROM attendance_logs;

-- Add index for archiving queries
CREATE INDEX idx_attendance_logs_academic_year
  ON attendance_logs(academic_year_id);
```

**Step 2: Create Archive Table**

```sql
-- Create archive table with same structure
CREATE TABLE attendance_logs_archive (
  id UUID PRIMARY KEY,
  student_id UUID NOT NULL,
  meeting_id UUID,
  date DATE NOT NULL,
  status CHAR(1) NOT NULL,
  reason TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Archive metadata
  academic_year_id UUID REFERENCES academic_years(id),
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  archived_by UUID REFERENCES profiles(id),

  -- Foreign keys (optional - consider removing for space)
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE SET NULL,
  FOREIGN KEY (recorded_by) REFERENCES profiles(id) ON DELETE SET NULL
);

-- Create indexes for archive queries
CREATE INDEX idx_archive_student ON attendance_logs_archive(student_id);
CREATE INDEX idx_archive_date ON attendance_logs_archive(date);
CREATE INDEX idx_archive_year ON attendance_logs_archive(academic_year_id);
CREATE INDEX idx_archive_meeting ON attendance_logs_archive(meeting_id);
CREATE INDEX idx_archive_student_year ON attendance_logs_archive(student_id, academic_year_id);
CREATE INDEX idx_archive_student_date ON attendance_logs_archive(student_id, date DESC);
```

**Step 3: Create Archive Functions**

```sql
-- Function to archive a completed academic year
CREATE OR REPLACE FUNCTION archive_academic_year(
  p_year_id UUID,
  p_keep_in_active BOOLEAN DEFAULT FALSE -- Safety flag for first run
)
RETURNS TABLE (
  archived_count BIGINT,
  deleted_count BIGINT,
  error_message TEXT
) AS $$
DECLARE
  v_archived_count BIGINT;
  v_deleted_count BIGINT;
  v_year_start DATE;
  v_year_end DATE;
BEGIN
  -- Get year dates
  SELECT start_date, end_date
  INTO v_year_start, v_year_end
  FROM academic_years
  WHERE id = p_year_id;

  IF v_year_start IS NULL THEN
    RETURN QUERY SELECT 0::BIGINT, 0::BIGINT, 'Academic year not found'::TEXT;
    RETURN;
  END IF;

  -- Verify year is completed (end date has passed)
  IF v_year_end > CURRENT_DATE THEN
    RETURN QUERY SELECT 0::BIGINT, 0::BIGINT, 'Academic year not yet completed'::TEXT;
    RETURN;
  END IF;

  -- Copy to archive
  INSERT INTO attendance_logs_archive (
    id, student_id, meeting_id, date, status, reason,
    recorded_by, created_at, updated_at,
    academic_year_id, archived_by
  )
  SELECT
    al.id, al.student_id, al.meeting_id, al.date, al.status, al.reason,
    al.recorded_by, al.created_at, al.updated_at,
    p_year_id, auth.uid()
  FROM attendance_logs al
  JOIN meetings m ON al.meeting_id = m.id
  WHERE m.date >= v_year_start
    AND m.date <= v_year_end
  ON CONFLICT (id) DO NOTHING; -- Prevent duplicates if run twice

  GET DIAGNOSTICS v_archived_count = ROW_COUNT;

  -- Delete from active table (only if not in safety mode)
  IF NOT p_keep_in_active THEN
    DELETE FROM attendance_logs al
    USING meetings m
    WHERE al.meeting_id = m.id
      AND m.date >= v_year_start
      AND m.date <= v_year_end;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  ELSE
    v_deleted_count := 0;
  END IF;

  -- Return results
  RETURN QUERY SELECT
    v_archived_count,
    v_deleted_count,
    format('Successfully archived %s records', v_archived_count)::TEXT;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT
    0::BIGINT,
    0::BIGINT,
    format('Error: %s', SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (adjust as needed)
GRANT EXECUTE ON FUNCTION archive_academic_year(UUID, BOOLEAN) TO authenticated;
```

**Step 4: Create Restore Function (Rollback)**

```sql
-- Function to restore archived data if needed
CREATE OR REPLACE FUNCTION restore_archived_year(
  p_year_id UUID
)
RETURNS TABLE (
  restored_count BIGINT,
  error_message TEXT
) AS $$
DECLARE
  v_restored_count BIGINT;
BEGIN
  -- Copy back to active table
  INSERT INTO attendance_logs (
    id, student_id, meeting_id, date, status, reason,
    recorded_by, created_at, updated_at, academic_year_id
  )
  SELECT
    id, student_id, meeting_id, date, status, reason,
    recorded_by, created_at, updated_at, academic_year_id
  FROM attendance_logs_archive
  WHERE academic_year_id = p_year_id
  ON CONFLICT (id) DO NOTHING; -- Skip if already exists

  GET DIAGNOSTICS v_restored_count = ROW_COUNT;

  RETURN QUERY SELECT
    v_restored_count,
    format('Restored %s records', v_restored_count)::TEXT;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT
    0::BIGINT,
    format('Error: %s', SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION restore_archived_year(UUID) TO authenticated;
```

### Phase 2: First Archive (When Ready)

**Pre-Archive Checklist:**
- [ ] Database has >100,000 attendance records
- [ ] Academic year to archive is completed (end date passed)
- [ ] No active reports running for that year
- [ ] Backup database before proceeding
- [ ] Test on staging/development first

**Execution Steps:**

```sql
-- Step 1: Identify academic year to archive
SELECT id, name, start_date, end_date, is_active
FROM academic_years
WHERE end_date < CURRENT_DATE
ORDER BY end_date DESC;

-- Step 2: Count records to be archived
SELECT COUNT(*) as records_to_archive
FROM attendance_logs al
JOIN meetings m ON al.meeting_id = m.id
WHERE m.date >= '2023-07-01' -- Replace with actual year start
  AND m.date <= '2024-06-30'; -- Replace with actual year end

-- Step 3: Test archive (keep in active mode for safety)
SELECT * FROM archive_academic_year(
  'academic-year-uuid-here',
  true -- Keep in active table (safety mode)
);

-- Step 4: Verify archive table
SELECT COUNT(*) as archived_count
FROM attendance_logs_archive
WHERE academic_year_id = 'academic-year-uuid-here';

-- Step 5: If verification passes, archive for real
SELECT * FROM archive_academic_year(
  'academic-year-uuid-here',
  false -- Remove from active table
);

-- Step 6: Verify counts match
SELECT
  (SELECT COUNT(*) FROM attendance_logs_archive
   WHERE academic_year_id = 'uuid') as archived,
  (SELECT COUNT(*) FROM attendance_logs
   WHERE academic_year_id = 'uuid') as remaining_in_active;
-- Should show: archived > 0, remaining_in_active = 0
```

### Phase 3: Update Application Code

**Option A: Update Server Actions to Query Both Tables**

```typescript
// In src/app/(admin)/laporan/actions.ts

interface QueryOptions {
  includeArchived?: boolean;
  academicYearId?: string;
}

export async function getStudentAttendanceHistory(
  studentId: string,
  options: QueryOptions = {}
) {
  'use server';

  const adminClient = await createAdminClient();

  // Base query select
  const baseSelect = `
    id,
    date,
    status,
    reason,
    meetings(id, title, date),
    recorded_by
  `;

  // Always query active table
  const activeQuery = adminClient
    .from('attendance_logs')
    .select(baseSelect)
    .eq('student_id', studentId);

  // Query archive if needed
  let archiveQuery = null;
  if (options.includeArchived) {
    archiveQuery = adminClient
      .from('attendance_logs_archive')
      .select(baseSelect)
      .eq('student_id', studentId);

    if (options.academicYearId) {
      archiveQuery = archiveQuery.eq('academic_year_id', options.academicYearId);
    }
  }

  // Execute queries in parallel
  const [activeResult, archiveResult] = await Promise.all([
    activeQuery,
    archiveQuery || Promise.resolve({ data: [], error: null })
  ]);

  if (activeResult.error) throw activeResult.error;
  if (archiveResult.error) throw archiveResult.error;

  // Combine results
  const combined = [
    ...(activeResult.data || []).map(r => ({ ...r, is_archived: false })),
    ...(archiveResult.data || []).map(r => ({ ...r, is_archived: true }))
  ];

  // Sort by date descending
  combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    success: true,
    data: combined,
    counts: {
      active: activeResult.data?.length || 0,
      archived: archiveResult.data?.length || 0
    }
  };
}
```

**Option B: Create Database View (Transparent to Application)**

```sql
-- Create unified view
CREATE VIEW attendance_logs_all AS
  SELECT
    id, student_id, meeting_id, date, status, reason,
    recorded_by, created_at, updated_at,
    academic_year_id,
    false AS is_archived
  FROM attendance_logs
  UNION ALL
  SELECT
    id, student_id, meeting_id, date, status, reason,
    recorded_by, created_at, updated_at,
    academic_year_id,
    true AS is_archived
  FROM attendance_logs_archive;

-- Application can query view instead
-- SELECT * FROM attendance_logs_all WHERE student_id = '...';
```

### Phase 4: Automation (Annual Task)

**Create Admin UI or Cron Job:**

```typescript
// In src/app/(admin)/settings/archive/page.tsx or admin task

export async function runAnnualArchive() {
  'use server';

  const supabase = await createAdminClient();

  // Get completed academic year (previous year)
  const { data: previousYear } = await supabase
    .from('academic_years')
    .select('*')
    .eq('is_active', false)
    .lt('end_date', new Date().toISOString())
    .order('end_date', { ascending: false })
    .limit(1)
    .single();

  if (!previousYear) {
    throw new Error('No completed academic year found');
  }

  // Safety check: year must be completed
  if (new Date(previousYear.end_date) > new Date()) {
    throw new Error('Academic year not yet completed');
  }

  // Archive
  const { data, error } = await supabase.rpc('archive_academic_year', {
    p_year_id: previousYear.id,
    p_keep_in_active: false
  });

  if (error) throw error;

  console.log(`Archived academic year ${previousYear.name}:`, data);

  return {
    success: true,
    year: previousYear.name,
    archivedCount: data[0].archived_count,
    deletedCount: data[0].deleted_count
  };
}
```

**Schedule:** Run annually in July/August after academic year ends

---

## Monitoring & Triggers

### When to Take Action

**Continuous Monitoring (Monthly Check):**

1. **Check Database Size**
```sql
-- Total database size
SELECT pg_size_pretty(pg_database_size(current_database())) as total_size;

-- attendance_logs table size
SELECT
  pg_size_pretty(pg_total_relation_size('attendance_logs')) as total_size,
  pg_size_pretty(pg_relation_size('attendance_logs')) as table_size,
  pg_size_pretty(pg_total_relation_size('attendance_logs') - pg_relation_size('attendance_logs')) as indexes_size;

-- Row counts
SELECT
  (SELECT COUNT(*) FROM attendance_logs) as active_logs,
  (SELECT COUNT(*) FROM attendance_logs_archive) as archived_logs;
```

2. **Check Query Performance**
```sql
-- Enable query logging in Supabase Dashboard
-- Monitor slow queries (>2 seconds)

-- Or run EXPLAIN ANALYZE on key queries
EXPLAIN ANALYZE
SELECT al.*, s.name, m.title
FROM attendance_logs al
JOIN students s ON al.student_id = s.id
JOIN meetings m ON al.meeting_id = m.id
WHERE al.date >= CURRENT_DATE - INTERVAL '1 year';
```

### Action Thresholds

| Metric | Warning Level | Action Required | Urgent |
|--------|--------------|-----------------|--------|
| **Attendance Rows** | 50,000 | 100,000 | 500,000 |
| **Table Size** | 15 MB | 30 MB | 150 MB |
| **Query Time** | 1s | 2s | >5s |
| **Database Size** | 250 MB (50%) | 400 MB (80%) | 475 MB (95%) |

**Actions by Level:**

**Warning Level:**
- ✅ Start planning optimization
- ✅ Review this document
- ✅ Test archive procedures on staging

**Action Required:**
- ⚠️ Add recommended indexes
- ⚠️ Implement archiving
- ⚠️ Monitor query performance weekly

**Urgent:**
- 🚨 Immediate optimization needed
- 🚨 Consider database upgrade (Supabase Pro)
- 🚨 Emergency archiving of old data

### Dashboard Metrics to Track

**In Supabase Dashboard:**
- Database size trend (monthly)
- Slow query logs
- Most frequent queries
- Index usage statistics

**Custom Monitoring (Optional):**
```typescript
// Create monitoring dashboard in admin panel
// Show:
// - Total attendance logs count
// - Growth rate (logs added per month)
// - Table size
// - Query performance metrics
// - Estimated time to capacity limits
```

---

## Rollback Procedures

### If Archiving Goes Wrong

**Scenario 1: Archive function failed mid-process**

```sql
-- Check if data was copied to archive
SELECT COUNT(*) FROM attendance_logs_archive
WHERE academic_year_id = 'problematic-year-uuid';

-- If 0, nothing happened, safe to retry
-- If >0, data was copied

-- Check if data was deleted from active
SELECT COUNT(*) FROM attendance_logs al
JOIN meetings m ON al.meeting_id = m.id
JOIN academic_years ay ON ay.id = 'problematic-year-uuid'
WHERE m.date >= ay.start_date AND m.date <= ay.end_date;

-- If >0, data still in active table, safe state
-- If 0, data was moved, can restore
```

**Scenario 2: Need to restore archived data**

```sql
-- Restore entire academic year
SELECT * FROM restore_archived_year('year-uuid-to-restore');

-- Verify restoration
SELECT COUNT(*) FROM attendance_logs
WHERE academic_year_id = 'year-uuid-to-restore';
-- Should show restored count

-- Optional: Remove from archive after restoring
DELETE FROM attendance_logs_archive
WHERE academic_year_id = 'year-uuid-to-restore';
```

**Scenario 3: Reports showing incorrect data after archive**

```sql
-- Quick fix: Create view to union both tables
CREATE OR REPLACE VIEW attendance_logs_all AS
  SELECT *, false AS is_archived FROM attendance_logs
  UNION ALL
  SELECT *, true AS is_archived FROM attendance_logs_archive;

-- Update application queries to use view
-- Or restore archived data temporarily
```

### Database Backup Before Archiving

**CRITICAL:** Always backup before first archive

```bash
# Using Supabase CLI
supabase db dump -f backup_before_archive_$(date +%Y%m%d).sql

# Or use Supabase Dashboard
# Settings > Database > Backups > Create Manual Backup
```

---

## Best Practices Summary

### Do's ✅

1. **Do** wait until data reaches thresholds before optimizing
2. **Do** test on staging/development before production
3. **Do** backup database before first archive
4. **Do** verify counts after archiving
5. **Do** use `CONCURRENTLY` when adding indexes
6. **Do** monitor query performance regularly
7. **Do** document all archiving operations
8. **Do** keep 2 years of data in active table

### Don'ts ❌

1. **Don't** optimize prematurely (current scale is fine)
2. **Don't** archive current or previous academic year
3. **Don't** delete archived data without legal review
4. **Don't** archive during business hours (use off-peak times)
5. **Don't** skip verification steps
6. **Don't** remove foreign keys without understanding impact
7. **Don't** archive if query performance is already good

### Key Principles

1. **Pragmatic over Perfect:** Only optimize when needed
2. **Data Safety First:** Always verify before deleting
3. **User Experience:** Keep recent data fast
4. **Compliance:** Retain data per legal requirements
5. **Transparency:** Document all operations
6. **Reversibility:** Always have rollback plan

---

## Conclusion

**Current Recommendation:**
- ✅ **NO ACTION NEEDED NOW** - Database is healthy
- ✅ **Monitor quarterly** - Check size and performance
- ✅ **Implement when triggers met** - Use this guide when needed

**Future Timeline:**
- **Year 1-2:** Monitor only, no changes needed
- **Year 2-3:** Add indexes if queries slow down
- **Year 3+:** Implement archiving when >100K rows

**This document provides a complete roadmap for database optimization without premature over-engineering.**

---

**Document Version:** 1.0
**Review Schedule:** Annually or when attendance logs exceed 50,000 rows
**Owner:** Development Team / Database Administrator
**Contact:** Update as needed
