
-- 1. Create pilot school.
INSERT INTO schools (
    name,
    code,
    email,
    is_active
)
VALUES (
    'Pilot School',
    'PILOT-001',
    'admin@pilotschool.example',
    TRUE
)
ON DUPLICATE KEY UPDATE
    id = LAST_INSERT_ID(id);

SET @school_id = LAST_INSERT_ID();


-- 2. Create academic year.
INSERT INTO academic_years (
    school_id,
    name,
    start_date,
    end_date,
    is_current
)
VALUES (
    @school_id,
    '2026-2027',
    '2026-06-01',
    '2027-05-31',
    TRUE
)
ON DUPLICATE KEY UPDATE
    id = LAST_INSERT_ID(id);

SET @academic_year_id = LAST_INSERT_ID();


-- 3. Create classes 1-10.
INSERT INTO classes (
    school_id,
    name,
    display_order
)
VALUES
(@school_id, 'Class 1', 1),
(@school_id, 'Class 2', 2),
(@school_id, 'Class 3', 3),
(@school_id, 'Class 4', 4),
(@school_id, 'Class 5', 5),
(@school_id, 'Class 6', 6),
(@school_id, 'Class 7', 7),
(@school_id, 'Class 8', 8),
(@school_id, 'Class 9', 9),
(@school_id, 'Class 10', 10)
ON DUPLICATE KEY UPDATE
    name = VALUES(name);


-- 4. Create five subjects.
INSERT INTO subjects (
    school_id,
    name,
    code
)
VALUES
(@school_id, 'Mathematics', 'MATH'),
(@school_id, 'Science', 'SCI'),
(@school_id, 'English', 'ENG'),
(@school_id, 'Social Studies', 'SOC'),
(@school_id, 'Computer Science', 'CS')
ON DUPLICATE KEY UPDATE
    name = VALUES(name);

-- 5. Create deterministic pilot accounts for local development.
INSERT INTO users (
    school_id,
    name,
    email,
    password_hash,
    role,
    is_active
)
VALUES
(
    @school_id,
    'Pilot Administrator',
    'admin@pilotschool.example',
    '$2b$12$HnpQr3gw2h42SHwJX4IWSuPylUQK6o8LJ4Ge.jvSqbLIvDzHKhbV2',
    'SCHOOL_ADMIN',
    TRUE
),
(
    @school_id,
    'Pilot Teacher',
    'teacher@pilotschool.example',
    '$2b$12$JVACGtFEeIfMNF7MtWfD5u5XTsYEz4KnziJsIX03mYeEdMlUtMqU2',
    'TEACHER',
    TRUE
)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    password_hash = VALUES(password_hash),
    role = VALUES(role),
    is_active = TRUE;

-- 5. Create sections A and B for every class.
INSERT INTO sections (
    school_id,
    class_id,
    academic_year_id,
    name
)
SELECT
    @school_id,
    c.id,
    @academic_year_id,
    section_names.section_name
FROM classes c
CROSS JOIN (
    SELECT 'A' AS section_name
    UNION ALL
    SELECT 'B'
) AS section_names
WHERE c.school_id = @school_id
ON DUPLICATE KEY UPDATE
    name = VALUES(name);

SET @teacher_id = (
    SELECT id
    FROM users
    WHERE school_id = @school_id
      AND email = 'teacher@pilotschool.example'
    LIMIT 1
);

SET @section_id = (
    SELECT id
    FROM sections
    WHERE school_id = @school_id
    ORDER BY id
    LIMIT 1
);

-- 6. Assign the pilot teacher to one section.
INSERT INTO teacher_assignments (
    school_id,
    teacher_id,
    section_id,
    is_active
)
VALUES (@school_id, @teacher_id, @section_id, TRUE)
ON DUPLICATE KEY UPDATE
    is_active = TRUE;
