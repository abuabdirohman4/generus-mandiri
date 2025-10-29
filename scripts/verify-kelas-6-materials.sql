-- Verify Kelas 6 materials import
SELECT 
  semester,
  month,
  COUNT(*) as total_entries,
  COUNT(DISTINCT week) as weeks,
  COUNT(DISTINCT day_of_week) as days
FROM learning_materials
WHERE class_master_id = '52f0cb47-4d13-48a7-bf66-1bc5c95232ac'
GROUP BY semester, month
ORDER BY semester, month;

-- Check total count
SELECT COUNT(*) as total_materials
FROM learning_materials
WHERE class_master_id = '52f0cb47-4d13-48a7-bf66-1bc5c95232ac';

-- Sample material
SELECT semester, month, week, day_of_week, content
FROM learning_materials
WHERE class_master_id = '52f0cb47-4d13-48a7-bf66-1bc5c95232ac'
ORDER BY semester, month, week, day_of_week
LIMIT 1;
