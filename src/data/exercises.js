export const EXERCISES = [
  // CHEST
  { name:"Bench Press",        muscle:"chest",     sets:4, reps:"8-10",  desc:"Flat barbell press",              alts:["Dumbbell Press","Push-Up","Cable Fly"] },
  { name:"Dumbbell Press",     muscle:"chest",     sets:3, reps:"10-12", desc:"Flat dumbbell press",             alts:["Bench Press","Incline Press","Push-Up"] },
  { name:"Incline Press",      muscle:"chest",     sets:3, reps:"8-10",  desc:"Incline barbell press",           alts:["Incline Dumbbell Press","Cable Fly","Bench Press"] },
  { name:"Incline Dumbbell Press",muscle:"chest",  sets:3, reps:"10-12", desc:"Incline dumbbell press",          alts:["Incline Press","Dumbbell Press","Cable Fly"] },
  { name:"Push-Up",            muscle:"chest",     sets:3, reps:"15-20", desc:"Bodyweight chest movement",       alts:["Bench Press","Dumbbell Press","Dumbbell Fly"] },
  { name:"Cable Fly",          muscle:"chest",     sets:3, reps:"12-15", desc:"Cable crossover isolation",       alts:["Dumbbell Fly","Pec Deck","Incline Press"] },
  { name:"Dumbbell Fly",       muscle:"chest",     sets:3, reps:"12-15", desc:"Dumbbell chest isolation",        alts:["Cable Fly","Pec Deck","Bench Press"] },
  { name:"Pec Deck",           muscle:"chest",     sets:3, reps:"12-15", desc:"Machine chest fly",               alts:["Cable Fly","Dumbbell Fly","Incline Press"] },
  // BACK
  { name:"Pull-Up",            muscle:"back",      sets:4, reps:"6-10",  desc:"Bodyweight vertical pull",        alts:["Lat Pulldown","Assisted Pull-Up","Cable Row"] },
  { name:"Lat Pulldown",       muscle:"back",      sets:3, reps:"10-12", desc:"Cable vertical pull to chest",    alts:["Pull-Up","Cable Row","Straight-Arm Pulldown"] },
  { name:"Barbell Row",        muscle:"back",      sets:4, reps:"8-10",  desc:"Barbell bent-over row",           alts:["Dumbbell Row","Cable Row","Seal Row"] },
  { name:"Dumbbell Row",       muscle:"back",      sets:3, reps:"10-12", desc:"Single-arm dumbbell row",         alts:["Barbell Row","Cable Row","Machine Row"] },
  { name:"Cable Row",          muscle:"back",      sets:3, reps:"10-12", desc:"Seated cable row",                alts:["Barbell Row","Dumbbell Row","Machine Row"] },
  { name:"Deadlift",           muscle:"back",      sets:4, reps:"5-6",   desc:"Conventional barbell deadlift",   alts:["Romanian Deadlift","Trap Bar Deadlift","Barbell Row"] },
  { name:"Trap Bar Deadlift",  muscle:"back",      sets:4, reps:"6-8",   desc:"Hex bar deadlift",                alts:["Deadlift","Romanian Deadlift","Barbell Row"] },
  { name:"Straight-Arm Pulldown",muscle:"back",    sets:3, reps:"12-15", desc:"Cable lat isolation",             alts:["Lat Pulldown","Pull-Up","Cable Row"] },
  // SHOULDERS
  { name:"Overhead Press",     muscle:"shoulders", sets:4, reps:"8-10",  desc:"Barbell shoulder press",          alts:["Dumbbell Shoulder Press","Arnold Press","Machine Shoulder Press"] },
  { name:"Dumbbell Shoulder Press",muscle:"shoulders",sets:3,reps:"10-12",desc:"Seated dumbbell press",          alts:["Overhead Press","Arnold Press","Machine Shoulder Press"] },
  { name:"Arnold Press",       muscle:"shoulders", sets:3, reps:"10-12", desc:"Rotating dumbbell press",         alts:["Overhead Press","Dumbbell Shoulder Press","Machine Shoulder Press"] },
  { name:"Lateral Raise",      muscle:"shoulders", sets:3, reps:"12-15", desc:"Dumbbell lateral raises",         alts:["Cable Lateral Raise","Machine Fly","Upright Row"] },
  { name:"Cable Lateral Raise",muscle:"shoulders", sets:3, reps:"15",    desc:"Cable side raise",                alts:["Lateral Raise","Machine Fly","Upright Row"] },
  { name:"Face Pull",          muscle:"shoulders", sets:3, reps:"15-20", desc:"Cable face pull for rear delts",  alts:["Rear Delt Fly","Band Pull-Apart","Upright Row"] },
  { name:"Rear Delt Fly",      muscle:"shoulders", sets:3, reps:"15",    desc:"Dumbbell rear delt fly",          alts:["Face Pull","Band Pull-Apart","Cable Lateral Raise"] },
  // LEGS
  { name:"Squat",              muscle:"legs",      sets:4, reps:"8-10",  desc:"Barbell back squat",              alts:["Goblet Squat","Leg Press","Hack Squat"] },
  { name:"Goblet Squat",       muscle:"legs",      sets:3, reps:"12-15", desc:"Dumbbell/KB held at chest",       alts:["Squat","Leg Press","Bulgarian Split Squat"] },
  { name:"Romanian Deadlift",  muscle:"legs",      sets:3, reps:"10-12", desc:"Hip-hinge hamstring focus",       alts:["Leg Curl","Good Morning","Deadlift"] },
  { name:"Leg Press",          muscle:"legs",      sets:3, reps:"10-12", desc:"Machine leg press",               alts:["Squat","Goblet Squat","Hack Squat"] },
  { name:"Hack Squat",         muscle:"legs",      sets:3, reps:"10-12", desc:"Machine hack squat",              alts:["Squat","Leg Press","Goblet Squat"] },
  { name:"Leg Curl",           muscle:"legs",      sets:3, reps:"12-15", desc:"Machine hamstring curl",          alts:["Romanian Deadlift","Nordic Curl","Good Morning"] },
  { name:"Leg Extension",      muscle:"legs",      sets:3, reps:"12-15", desc:"Machine quad isolation",          alts:["Squat","Bulgarian Split Squat","Hack Squat"] },
  { name:"Bulgarian Split Squat",muscle:"legs",    sets:3, reps:"10-12", desc:"Rear foot elevated split squat",  alts:["Squat","Lunges","Goblet Squat"] },
  { name:"Lunges",             muscle:"legs",      sets:3, reps:"12/leg", desc:"Walking or stationary lunges",   alts:["Bulgarian Split Squat","Squat","Leg Press"] },
  { name:"Calf Raise",         muscle:"legs",      sets:4, reps:"15-20", desc:"Standing calf raise",             alts:["Seated Calf Raise","Donkey Calf Raise","Jump Rope"] },
  { name:"Seated Calf Raise",  muscle:"legs",      sets:4, reps:"15-20", desc:"Seated machine calf raise",       alts:["Calf Raise","Donkey Calf Raise","Jump Rope"] },
  // ARMS
  { name:"Barbell Curl",       muscle:"arms",      sets:3, reps:"10-12", desc:"Barbell bicep curl",              alts:["Dumbbell Curl","Hammer Curl","Cable Curl"] },
  { name:"Dumbbell Curl",      muscle:"arms",      sets:3, reps:"12",    desc:"Alternating dumbbell curl",       alts:["Barbell Curl","Hammer Curl","Cable Curl"] },
  { name:"Hammer Curl",        muscle:"arms",      sets:3, reps:"12",    desc:"Neutral grip curl",               alts:["Barbell Curl","Dumbbell Curl","Incline Curl"] },
  { name:"Cable Curl",         muscle:"arms",      sets:3, reps:"12-15", desc:"Cable bicep curl",                alts:["Barbell Curl","Dumbbell Curl","Hammer Curl"] },
  { name:"Tricep Pushdown",    muscle:"arms",      sets:3, reps:"12-15", desc:"Cable tricep pushdown",           alts:["Skull Crusher","Overhead Tricep Extension","Dips"] },
  { name:"Skull Crusher",      muscle:"arms",      sets:3, reps:"10-12", desc:"Lying barbell tricep extension",  alts:["Tricep Pushdown","Overhead Tricep Extension","Dips"] },
  { name:"Overhead Tricep Extension",muscle:"arms",sets:3, reps:"10-12", desc:"Dumbbell overhead extension",     alts:["Skull Crusher","Tricep Pushdown","Dips"] },
  { name:"Dips",               muscle:"arms",      sets:3, reps:"8-12",  desc:"Bodyweight or weighted dips",     alts:["Skull Crusher","Tricep Pushdown","Close-Grip Bench Press"] },
  { name:"Close-Grip Bench Press",muscle:"arms",   sets:3, reps:"8-10",  desc:"Narrow grip bench for triceps",   alts:["Dips","Skull Crusher","Tricep Pushdown"] },
  // CORE
  { name:"Plank",              muscle:"core",      sets:3, reps:"60s",   desc:"Isometric core hold",             alts:["Dead Bug","Ab Wheel","Cable Crunch"] },
  { name:"Ab Wheel",           muscle:"core",      sets:3, reps:"10-15", desc:"Rollout for anti-extension",      alts:["Plank","Dead Bug","Cable Crunch"] },
  { name:"Cable Crunch",       muscle:"core",      sets:3, reps:"15-20", desc:"Kneeling cable crunch",           alts:["Crunch","Ab Wheel","Decline Sit-Up"] },
  { name:"Dead Bug",           muscle:"core",      sets:3, reps:"10",    desc:"Anti-extension stability drill",  alts:["Plank","Pallof Press","Cable Crunch"] },
  { name:"Russian Twist",      muscle:"core",      sets:3, reps:"20",    desc:"Rotational core movement",        alts:["Pallof Press","Cable Rotation","Plank"] },
  { name:"Hanging Leg Raise",  muscle:"core",      sets:3, reps:"12-15", desc:"Hanging hip flexor + core",       alts:["Ab Wheel","Cable Crunch","Decline Sit-Up"] },
  // CARDIO
  { name:"Treadmill Run",      muscle:"cardio",    sets:1, reps:"20min", desc:"Moderate steady-state cardio",    alts:["Bike","Rowing Machine","Jump Rope"] },
  { name:"Bike",               muscle:"cardio",    sets:1, reps:"20min", desc:"Stationary bike cardio",          alts:["Treadmill Run","Rowing Machine","Stair Climber"] },
  { name:"Rowing Machine",     muscle:"cardio",    sets:1, reps:"15min", desc:"Full-body low-impact cardio",     alts:["Bike","Treadmill Run","Jump Rope"] },
  { name:"Jump Rope",          muscle:"cardio",    sets:4, reps:"3min",  desc:"High-intensity skipping",         alts:["Treadmill Run","Bike","Burpees"] },
  { name:"Stair Climber",      muscle:"cardio",    sets:1, reps:"20min", desc:"Stair machine cardio",            alts:["Treadmill Run","Bike","Rowing Machine"] },
];

export const MUSCLE_COLORS = {
  chest:"text-red-400", back:"text-blue-400", shoulders:"text-purple-400",
  legs:"text-green-400", arms:"text-yellow-400", core:"text-orange-400", cardio:"text-cyan-400",
};

export const MUSCLE_BG = {
  chest:"bg-red-400/10 border-red-400/20", back:"bg-blue-400/10 border-blue-400/20",
  shoulders:"bg-purple-400/10 border-purple-400/20", legs:"bg-green-400/10 border-green-400/20",
  arms:"bg-yellow-400/10 border-yellow-400/20", core:"bg-orange-400/10 border-orange-400/20",
  cardio:"bg-cyan-400/10 border-cyan-400/20",
};

export const getExercise = name => EXERCISES.find(e => e.name === name);
export const getAlternatives = ex =>
  (ex?.alts || []).map(n => EXERCISES.find(e => e.name === n)).filter(Boolean);
