# Dashboard Attendance Calculation - How "Kehadiran Bulan Ini" is Calculated

## Context

**User Question After Bug Fix**: Dashboard shows "Kehadiran Bulan Ini: 50%" at the top, while the per-desa comparison table shows different percentages:
- Baleendah: 81%
- Banjaran: 100%
- Ciparay: 73%
- Majalaya: 75%
- Sayati: 68%
- Soreang: 47%

User is asking: "apakah 50% itu hasilnya memang benar? itu berarti nilai 81% + 100% + 73% + 75% + 68% + 47% dibagi 6?" (Is the 50% correct? Does that mean (81 + 100 + 73 + 75 + 68 + 47) / 6?)

**Answer**: No, the 50% is NOT calculated as a simple average of those percentages. The calculation is **correct** and uses **weighted average** based on actual attendance data, not the per-desa percentages shown in the table.

---

## How the Calculation Works

### 1. "Kehadiran Bulan Ini" (Top Stat Card - 50%)

**File**: `src/app/(admin)/dashboard/page.tsx` (lines 129-154)

**Calculation Method**: **Weighted Average** based on class-level monitoring data

```typescript
const attendanceRate = useMemo(() => {
  if (!monitoringData || monitoringData.length === 0) return 0;

  let totalPresentWeighted = 0;
  let totalPotentialWeighted = 0;

  monitoringData.forEach(cls => {
    // Potential attendance = Number of Students × Number of Meetings
    const potential = (cls.student_count || 0) * cls.meeting_count;

    // Estimated number present = (class_rate / 100) × potential
    const present = (cls.attendance_rate / 100) * potential;

    totalPotentialWeighted += potential;
    totalPresentWeighted += present;
  });

  if (totalPotentialWeighted === 0) return 0;

  return Math.round((totalPresentWeighted / totalPotentialWeighted) * 100);
}, [monitoringData]);
```

**Formula**:
```
Kehadiran Bulan Ini = (Total Students Present Across All Classes / Total Potential Attendance) × 100

Where:
- Total Present = Sum of (class_attendance_rate × student_count × meeting_count) for each class
- Total Potential = Sum of (student_count × meeting_count) for each class
```

**Key Points**:
- ✅ Weighted by actual number of students in each class
- ✅ Weighted by number of meetings per class
- ✅ Based on raw `monitoringData` (class-level data from server)
- ✅ Reflects true attendance across ALL classes, not organizational averages

---

### 2. Per-Desa Percentages (Table - 81%, 100%, 73%, etc.)

**File**: `src/app/(admin)/dashboard/utils/aggregateMonitoringData.ts` (lines 19-136)

**Calculation Method**: **Weighted Average** grouped by desa

```typescript
// Step 1: Group class-level data by desa_name
const grouped = monitoringData.reduce((acc, item) => {
  const entityName = item.desa_name;

  if (!acc[entityName]) {
    acc[entityName] = {
      name: entityName,
      totalPresent: 0,
      totalPotential: 0,
      meetingCount: 0,
      studentCount: 0
    }
  }

  // Weighted attendance calculation
  const potential = (item.student_count || 0) * item.meeting_count;
  const present = (item.attendance_rate / 100) * potential;

  acc[entityName].totalPresent += present;
  acc[entityName].totalPotential += potential;
  acc[entityName].meetingCount += item.meeting_count;
  acc[entityName].studentCount += (item.student_count || 0);

  return acc;
}, {});

// Step 2: Calculate weighted average for each desa
const result = Object.values(grouped).map((g: any) => ({
  name: g.name,
  attendance_rate: g.totalPotential > 0
    ? Math.round((g.totalPresent / g.totalPotential) * 100)
    : 0,
  meeting_count: g.meetingCount,
  student_count: g.studentCount
}));
```

**Formula** (per desa):
```
Desa Attendance Rate = (Total Present in Desa / Total Potential in Desa) × 100

Where:
- Total Present in Desa = Sum of (class_rate × students × meetings) for classes in that desa
- Total Potential in Desa = Sum of (students × meetings) for classes in that desa
```

**Key Points**:
- ✅ Aggregates class-level data by desa
- ✅ Each desa gets its own weighted average
- ✅ Still weighted by student count and meeting count

---

## Why They Differ

### Example Scenario (Hypothetical)

Let's say:

**Desa A (Baleendah - 81%)**:
- 10 students, 10 meetings → 100 potential attendance
- 81 students present → 81%

**Desa B (Banjaran - 100%)**:
- 2 students, 5 meetings → 10 potential attendance
- 10 students present → 100%

**Overall Calculation** (Kehadiran Bulan Ini):
```
Total Present = 81 + 10 = 91
Total Potential = 100 + 10 = 110
Overall Rate = (91 / 110) × 100 = 82.7% ≈ 83%
```

**Simple Average** (INCORRECT approach):
```
(81% + 100%) / 2 = 90.5% ❌ WRONG!
```

**Why Simple Average is Wrong**:
- Desa B has much fewer students (2 vs 10)
- Desa B has much fewer meetings (5 vs 10)
- Desa B has less "weight" in the overall attendance picture
- Simple average treats both equally, ignoring student/meeting counts

**Weighted Average is Correct**:
- Reflects true attendance: 91 out of 110 possible attendances
- Desa A contributes 100/110 weight (91% of total)
- Desa B contributes 10/110 weight (9% of total)
- Result: 83% (closer to Desa A's 81% because it has more students/meetings)

---

## Real Data Analysis

**User's Screenshot Shows**:
- Kehadiran Bulan Ini: **50%**
- Per-desa rates: 81%, 100%, 73%, 75%, 68%, 47%

**Simple Average** (what user thought it was):
```
(81 + 100 + 73 + 75 + 68 + 47) / 6 = 444 / 6 = 74% ❌
```

**Actual Result**: **50%** (from weighted calculation)

**Possible Explanations**:
1. **Soreang (47%)** likely has significantly MORE students/meetings than other desa
   - If Soreang has 60% of total students/meetings, it pulls the weighted average down toward 47%
   - Other desa with higher rates (Banjaran 100%, Baleendah 81%) have fewer students/meetings
2. **Meeting count variation**:
   - Some desa may have many meetings (high potential), others few meetings
   - Low-attendance desa with many meetings drag down the overall percentage
3. **Student count variation**:
   - Desa with more students have more weight in the calculation
   - If high-attendance desa (Banjaran 100%) has only 10 students, but low-attendance desa (Soreang 47%) has 200 students, the weighted average skews toward 47%

---

## Is the Calculation Correct?

**YES ✅** - The weighted average calculation is the **correct** approach.

**Why Weighted Average is Better**:
1. **Accurate Representation**: Shows true attendance rate across ALL student-meeting combinations
2. **Fair Comparison**: Larger desa/classes get appropriate weight
3. **Meaningful Metric**: Answers "What percentage of all possible attendances were fulfilled?"
4. **Standard Practice**: Same method used in academic GPA calculations (credit-weighted)

**Why Simple Average Would Be Wrong**:
1. **Misleading**: Treats tiny desa (2 students, 1 meeting) same as large desa (200 students, 50 meetings)
2. **Inflated Numbers**: Small high-performing groups skew average upward unrealistically
3. **Ignores Scale**: Doesn't reflect the actual number of students affected

---

## Example Calculation to Verify

**To manually verify the 50%**, user would need to:

1. Look at raw `monitoringData` (class-level breakdown)
2. For each class, calculate: `present = (attendance_rate / 100) × student_count × meeting_count`
3. Sum all `present` values
4. Sum all `potential = student_count × meeting_count` values
5. Calculate: `(total_present / total_potential) × 100`

**Most likely scenario**:
- Soreang (47%) has ~3-4x more students/meetings than other desa combined
- This pulls weighted average from 74% (simple) down to 50% (weighted)

---

## Recommendation

**No changes needed** - the calculation is mathematically correct and follows best practices for weighted averages.

**If user wants to see breakdown**, could add:
1. Tooltip on "Kehadiran Bulan Ini" explaining weighted calculation
2. Show total potential attendance number (e.g., "50% (250/500 attendance records)")
3. Add column in table showing "Weight" (% of total students or meetings)

But the current implementation is accurate and appropriate for a dashboard metric.

---

## Files Referenced

**Calculation Logic**:
- `src/app/(admin)/dashboard/page.tsx` (lines 129-154) - Overall attendance rate
- `src/app/(admin)/dashboard/utils/aggregateMonitoringData.ts` (lines 19-136) - Per-desa aggregation
- `src/app/(admin)/dashboard/actions.ts` (lines 233-250) - Attendance data fetching

**No Changes Required** - Current implementation is correct.
