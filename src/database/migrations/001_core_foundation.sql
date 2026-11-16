
CREATE TABLE IF NOT EXISTS schools (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(150) NOT NULL,

    code VARCHAR(50) NOT NULL,

    email VARCHAR(255) DEFAULT NULL,

    phone VARCHAR(20) DEFAULT NULL,

    address TEXT DEFAULT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_schools_code (code)
) ENGINE=InnoDB;


CREATE TABLE IF NOT EXISTS academic_years (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    school_id BIGINT UNSIGNED NOT NULL,

    name VARCHAR(50) NOT NULL,

    start_date DATE NOT NULL,

    end_date DATE NOT NULL,

    is_current BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_academic_years_school
        FOREIGN KEY (school_id)
        REFERENCES schools(id),

    CONSTRAINT uq_academic_year_school_id
        UNIQUE (school_id, id),

    CONSTRAINT uq_academic_year_name
        UNIQUE (school_id, name),

    CONSTRAINT chk_academic_year_dates
        CHECK (end_date > start_date),

    INDEX idx_academic_year_school (school_id)
) ENGINE=InnoDB;


CREATE TABLE IF NOT EXISTS classes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    school_id BIGINT UNSIGNED NOT NULL,

    name VARCHAR(50) NOT NULL,

    display_order INT NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_classes_school
        FOREIGN KEY (school_id)
        REFERENCES schools(id),

    CONSTRAINT uq_classes_school_id
        UNIQUE (school_id, id),

    CONSTRAINT uq_classes_school_name
        UNIQUE (school_id, name),

    CONSTRAINT uq_classes_display_order
        UNIQUE (school_id, display_order),

    INDEX idx_classes_school (school_id)
) ENGINE=InnoDB;


CREATE TABLE IF NOT EXISTS subjects (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    school_id BIGINT UNSIGNED NOT NULL,

    name VARCHAR(100) NOT NULL,

    code VARCHAR(30) NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_subjects_school
        FOREIGN KEY (school_id)
        REFERENCES schools(id),

    CONSTRAINT uq_subjects_school_id
        UNIQUE (school_id, id),

    CONSTRAINT uq_subjects_school_code
        UNIQUE (school_id, code),

    INDEX idx_subjects_school (school_id)
) ENGINE=InnoDB;


CREATE TABLE IF NOT EXISTS sections (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    school_id BIGINT UNSIGNED NOT NULL,

    class_id BIGINT UNSIGNED NOT NULL,

    academic_year_id BIGINT UNSIGNED NOT NULL,

    name VARCHAR(50) NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sections_school
        FOREIGN KEY (school_id)
        REFERENCES schools(id),

    CONSTRAINT fk_sections_class
        FOREIGN KEY (school_id, class_id)
        REFERENCES classes(school_id, id),

    CONSTRAINT fk_sections_academic_year
        FOREIGN KEY (school_id, academic_year_id)
        REFERENCES academic_years(school_id, id),

    CONSTRAINT uq_sections_school_id
        UNIQUE (school_id, id),

    CONSTRAINT uq_sections_class_year_name
        UNIQUE (school_id, class_id, academic_year_id, name),

    INDEX idx_sections_school (school_id),

    INDEX idx_sections_class (school_id, class_id)
) ENGINE=InnoDB;


CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    school_id BIGINT UNSIGNED NOT NULL,

    name VARCHAR(150) NOT NULL,

    email VARCHAR(255) NOT NULL,

    password_hash VARCHAR(255) NOT NULL,

    role ENUM(
        'SCHOOL_ADMIN',
        'TEACHER',
        'STUDENT'
    ) NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    last_login_at DATETIME DEFAULT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_users_school
        FOREIGN KEY (school_id)
        REFERENCES schools(id),

    CONSTRAINT uq_users_school_id
        UNIQUE (school_id, id),

    CONSTRAINT uq_users_school_email
        UNIQUE (school_id, email),

    INDEX idx_users_school_role (school_id, role),

    INDEX idx_users_school_active (school_id, is_active)
) ENGINE=InnoDB;


CREATE TABLE IF NOT EXISTS teacher_assignments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    school_id BIGINT UNSIGNED NOT NULL,

    teacher_id BIGINT UNSIGNED NOT NULL,

    section_id BIGINT UNSIGNED NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    start_date DATE DEFAULT NULL,

    end_date DATE DEFAULT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_teacher_assignments_school
        FOREIGN KEY (school_id)
        REFERENCES schools(id),

    CONSTRAINT fk_teacher_assignments_teacher
        FOREIGN KEY (school_id, teacher_id)
        REFERENCES users(school_id, id),

    CONSTRAINT fk_teacher_assignments_section
        FOREIGN KEY (school_id, section_id)
        REFERENCES sections(school_id, id),

    CONSTRAINT uq_teacher_section
        UNIQUE (school_id, teacher_id, section_id),

    CONSTRAINT chk_teacher_assignment_dates
        CHECK (
            end_date IS NULL
            OR start_date IS NULL
            OR end_date >= start_date
        ),

    INDEX idx_teacher_assignment_lookup (
        school_id,
        teacher_id,
        section_id,
        is_active
    ),

    INDEX idx_section_assignment_lookup (
        school_id,
        section_id,
        is_active
    )
) ENGINE=InnoDB;
