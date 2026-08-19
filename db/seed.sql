-- Pocetni podaci za sifrarnike

INSERT INTO misicne_skupine (naziv) VALUES
    ('prsa'),
    ('leđa'),
    ('ramena'),
    ('biceps'),
    ('triceps'),
    ('quads'),
    ('hamstring'),
    ('calves'),
    ('cardio')
ON CONFLICT (naziv) DO NOTHING;

INSERT INTO tipovi_treninga (naziv) VALUES
    ('Upper'),
    ('Lower'),
    ('Push'),
    ('Pull'),
    ('Legs'),
    ('Full Body')
ON CONFLICT (naziv) DO NOTHING;

-- Vjezbe
INSERT INTO vjezbe (naziv, misicna_skupina_id, tip)
SELECT v.naziv, ms.id, v.tip
FROM (VALUES
    ('Bench Press', 'prsa', 'snaga'),
    ('Incline Smith Bench Press', 'prsa', 'snaga'),
    ('Incline Dumbbell Press', 'prsa', 'snaga'),
    ('Incline Bench Press', 'prsa', 'snaga'),
    ('Butterfly Press', 'prsa', 'snaga'),
    ('Machine Chest Press', 'prsa', 'snaga'),
    ('Push-ups', 'prsa', 'oba'),
    ('Pull-ups', 'leđa', 'oba'),
    ('Barbell Rows', 'leđa', 'snaga'),
    ('Machine Rows', 'leđa', 'snaga'),
    ('Lat Pulldown', 'leđa', 'snaga'),
    ('Lat Flys', 'ramena', 'snaga'),
    ('Overhead Press', 'ramena', 'snaga'),
    ('Rear Delts', 'ramena', 'snaga'),
    ('Cable Lat Flys', 'ramena', 'snaga'),
    ('Bicep Curls', 'biceps', 'snaga'),
    ('Biceps Machine', 'biceps', 'snaga'),
    ('Triceps Pushdown', 'triceps', 'snaga'),
    ('Skullcrushers', 'triceps', 'snaga'),
    ('Bulgarian Squat', 'quads', 'oba'),
    ('Squat (Barbell)', 'quads', 'oba'),
    ('Quad Extensions', 'quads', 'oba'),
    ('Leg Press', 'quads', 'snaga'),
    ('Hack Squat', 'quads', 'snaga'),
    ('Romanian Deadlift', 'hamstring', 'oba'),
    ('Hamstring Curls Machine', 'hamstring', 'snaga'),
    ('Calf Raises', 'calves', 'snaga'),
    ('Running (treadmill)', 'cardio', 'kardio'),
    ('Exercise Bike', 'cardio', 'kardio'),
    ('Stair Climber', 'cardio', 'kardio')
) AS v(naziv, misicna_skupina, tip)
JOIN misicne_skupine ms ON ms.naziv = v.misicna_skupina;

-- Vjezba - tip treninga (many-to-many)
INSERT INTO vjezba_tip_treninga (vjezba_id, tip_treninga_id)
SELECT vj.id, tt.id
FROM (VALUES
    ('Bench Press', 'Upper'), ('Bench Press', 'Push'), ('Bench Press', 'Full Body'),
    ('Incline Smith Bench Press', 'Upper'), ('Incline Smith Bench Press', 'Push'), ('Incline Smith Bench Press', 'Full Body'),
    ('Incline Dumbbell Press', 'Upper'), ('Incline Dumbbell Press', 'Push'), ('Incline Dumbbell Press', 'Full Body'),
    ('Incline Bench Press', 'Upper'), ('Incline Bench Press', 'Push'), ('Incline Bench Press', 'Full Body'),
    ('Butterfly Press', 'Upper'), ('Butterfly Press', 'Push'), ('Butterfly Press', 'Full Body'),
    ('Machine Chest Press', 'Upper'), ('Machine Chest Press', 'Push'),
    ('Push-ups', 'Upper'), ('Push-ups', 'Push'), ('Push-ups', 'Full Body'),
    ('Pull-ups', 'Upper'), ('Pull-ups', 'Pull'), ('Pull-ups', 'Full Body'),
    ('Barbell Rows', 'Upper'), ('Barbell Rows', 'Pull'), ('Barbell Rows', 'Full Body'),
    ('Machine Rows', 'Upper'), ('Machine Rows', 'Pull'),
    ('Lat Pulldown', 'Upper'), ('Lat Pulldown', 'Pull'), ('Lat Pulldown', 'Full Body'),
    ('Lat Flys', 'Upper'), ('Lat Flys', 'Push'), ('Lat Flys', 'Full Body'),
    ('Overhead Press', 'Upper'), ('Overhead Press', 'Push'), ('Overhead Press', 'Full Body'),
    ('Rear Delts', 'Upper'), ('Rear Delts', 'Push'),
    ('Cable Lat Flys', 'Upper'), ('Cable Lat Flys', 'Push'),
    ('Bicep Curls', 'Upper'), ('Bicep Curls', 'Pull'), ('Bicep Curls', 'Full Body'),
    ('Biceps Machine', 'Upper'), ('Biceps Machine', 'Pull'),
    ('Triceps Pushdown', 'Upper'), ('Triceps Pushdown', 'Pull'),
    ('Skullcrushers', 'Upper'), ('Skullcrushers', 'Pull'), ('Skullcrushers', 'Lower'), ('Skullcrushers', 'Full Body'),
    ('Bulgarian Squat', 'Lower'), ('Bulgarian Squat', 'Full Body'), ('Bulgarian Squat', 'Legs'),
    ('Squat (Barbell)', 'Lower'), ('Squat (Barbell)', 'Full Body'), ('Squat (Barbell)', 'Legs'),
    ('Quad Extensions', 'Lower'), ('Quad Extensions', 'Full Body'), ('Quad Extensions', 'Legs'),
    ('Leg Press', 'Lower'), ('Leg Press', 'Full Body'), ('Leg Press', 'Legs'),
    ('Hack Squat', 'Lower'), ('Hack Squat', 'Full Body'), ('Hack Squat', 'Legs'),
    ('Romanian Deadlift', 'Lower'), ('Romanian Deadlift', 'Full Body'), ('Romanian Deadlift', 'Legs'),
    ('Hamstring Curls Machine', 'Lower'), ('Hamstring Curls Machine', 'Full Body'), ('Hamstring Curls Machine', 'Legs'),
    ('Calf Raises', 'Lower'), ('Calf Raises', 'Full Body'), ('Calf Raises', 'Legs'),
    ('Running (treadmill)', 'Upper'), ('Running (treadmill)', 'Lower'), ('Running (treadmill)', 'Push'), ('Running (treadmill)', 'Pull'), ('Running (treadmill)', 'Legs'), ('Running (treadmill)', 'Full Body'),
    ('Exercise Bike', 'Upper'), ('Exercise Bike', 'Lower'), ('Exercise Bike', 'Push'), ('Exercise Bike', 'Pull'), ('Exercise Bike', 'Legs'), ('Exercise Bike', 'Full Body'),
    ('Stair Climber', 'Upper'), ('Stair Climber', 'Lower'), ('Stair Climber', 'Legs'), ('Stair Climber', 'Full Body')
) AS x(vjezba_naziv, tip_naziv)
JOIN vjezbe vj ON vj.naziv = x.vjezba_naziv
JOIN tipovi_treninga tt ON tt.naziv = x.tip_naziv;
