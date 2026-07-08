import type {
	CatalogExercise,
	Exercise,
	ExportData,
	GeneratedPlan,
	PlannedBlock,
	PlannedExercise,
	PlannedSet,
	PlannedWorkout,
	PlanSettings,
	Workout,
} from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DAYS = [0, 1, 3, 4];
const WOMENS_EITHER_OR_PATTERNS = [/hip thrust/i];

interface ExerciseStats {
	exercise_id: number;
	title: string;
	family: string;
	sessions: number;
	lastPerformed: string;
	bestWeight: number;
	bestE1rm: number;
	video_url?: string;
}

interface Prescription {
	family: string;
	preferred: string[];
	sets: number;
	reps: number;
	intensity: number;
	priority: PlannedExercise["priority"];
	note?: string;
}

interface DayTemplate {
	focus: string;
	title: string;
	cutRule: string;
	prescriptions: Prescription[];
}

const FAMILY_PATTERNS: Array<[string, RegExp]> = [
	["squat", /squat|pendulum|hack/i],
	["deadlift", /deadlift|hinge|stiff leg|rdl/i],
	["bench", /bench|dips|press - flat/i],
	["row", /row|t-bar|gorilla/i],
	["pulldown", /pulldown|pull up|pull-up/i],
	["single-leg", /split squat|bulgarian|lunge/i],
	["posterior", /hip thrust|leg curl|hamstring|hip extension/i],
	["shoulders", /shoulder press|lateral raise/i],
	["chest", /fly|incline/i],
	["arms", /curl|tricep|jm press/i],
	["core", /hollow|crunch|leg raise|plank/i],
];

const TEMPLATES: DayTemplate[] = [
	{
		focus: "Squat + bench volume",
		title: "Squat Priority / Bench Volume",
		cutRule:
			"If time runs short, keep the row and lateral raise and skip the optional posterior accessory.",
		prescriptions: [
			{
				family: "squat",
				preferred: ["High Bar Back Squat", "Back Squat", "Barbell Back Squat"],
				sets: 3,
				reps: 5,
				intensity: 0.78,
				priority: "main",
				note: "Main lift time box: 25-35 minutes including warmups. First work set may be a heavier triple, then two controlled backoffs.",
			},
			{
				family: "bench",
				preferred: ["Barbell Bench Press", "Bench Press"],
				sets: 2,
				reps: 10,
				intensity: 0.7,
				priority: "secondary",
				note: "Bench is secondary today. Keep it to two useful volume sets.",
			},
			{
				family: "row",
				preferred: [
					"CHEST SUPPORTED T-BAR ROW",
					"Chest Supported - Seated Row",
					"Gorilla Dumbbell Rows",
				],
				sets: 3,
				reps: 10,
				intensity: 0.7,
				priority: "pair",
			},
			{
				family: "posterior",
				preferred: [
					"Roman Chair - Hip Extension",
					"Lying Leg Curl",
					"Seated Leg Curl",
					"Barbell RDL",
				],
				sets: 2,
				reps: 10,
				intensity: 0.68,
				priority: "optional",
				note: "Do not auto-select hip thrust here; it appears in shared either/or blocks from the women's track.",
			},
			{
				family: "shoulders",
				preferred: ["1 Arm Cable Lateral Raise", "DB Lateral Raise"],
				sets: 2,
				reps: 15,
				intensity: 0.62,
				priority: "optional",
			},
		],
	},
	{
		focus: "Bench priority + upper back",
		title: "Paused Bench / Upper Back",
		cutRule:
			"Bench is the priority. If time runs short, keep the row and split squat and drop the curl/adduction slot.",
		prescriptions: [
			{
				family: "bench",
				preferred: [
					"Barbell Bench Press - With Pause",
					"Spoto Press",
					"Tempo Bench Press",
					"Bench Press without feet",
				],
				sets: 4,
				reps: 3,
				intensity: 0.8,
				priority: "main",
				note: "Paused bench intensity day. Keep all reps crisp and stop before grinding.",
			},
			{
				family: "row",
				preferred: [
					"Seated Cable Row",
					"Barbell Flexion Row",
					"CHEST SUPPORTED T-BAR ROW",
				],
				sets: 3,
				reps: 10,
				intensity: 0.7,
				priority: "pair",
			},
			{
				family: "single-leg",
				preferred: [
					"DB Bulgarian Split Squat",
					"FRONT FOOT ELEVATED DB SPLIT SQUAT",
					"Deficit Bulgarian Split Squat",
				],
				sets: 2,
				reps: 10,
				intensity: 0.66,
				priority: "pair",
			},
			{
				family: "arms",
				preferred: ["INCLINE DB CURL", "Cable Biceps Curl", "Hammer Curls"],
				sets: 2,
				reps: 12,
				intensity: 0.62,
				priority: "optional",
			},
			{
				family: "squat",
				preferred: ["Seated Hip Adduction Machine", "Leg Extension"],
				sets: 2,
				reps: 12,
				intensity: 0.62,
				priority: "optional",
			},
		],
	},
	{
		focus: "Deadlift + posterior chain",
		title: "Deadlift Priority / Upper Accessory",
		cutRule:
			"No heavy quad accessory after deadlifts unless the main lift moved fast and recovery is clearly good.",
		prescriptions: [
			{
				family: "deadlift",
				preferred: ["CONVENTIONAL DEADLIFT", "Deadlift", "PAUSE DEADLIFT"],
				sets: 3,
				reps: 5,
				intensity: 0.77,
				priority: "main",
				note: "Main lift time box: 25-35 minutes including warmups. First work set may be a double/triple, then two backoff fives.",
			},
			{
				family: "pulldown",
				preferred: [
					"Hammer - Front Lat Pulldown",
					"Pulldown - Underhand Grip",
					"Close Grip Lat Pulldown",
				],
				sets: 3,
				reps: 12,
				intensity: 0.68,
				priority: "pair",
			},
			{
				family: "shoulders",
				preferred: [
					"Seated DB Shoulder Press",
					"DB seated shoulder press  ",
					"DB Shoulder Press",
				],
				sets: 2,
				reps: 10,
				intensity: 0.66,
				priority: "pair",
			},
			{
				family: "posterior",
				preferred: ["Seated Leg Curl", "Lying Leg Curl"],
				sets: 2,
				reps: 12,
				intensity: 0.64,
				priority: "optional",
			},
			{
				family: "chest",
				preferred: ["Flat DB Fly", "CABLE FLY", "Incline Db Fly"],
				sets: 2,
				reps: 12,
				intensity: 0.62,
				priority: "optional",
			},
		],
	},
	{
		focus: "Secondary lower + bench variation",
		title: "Secondary Lower / Bench Variation",
		cutRule:
			"This is a medium day, not another max-effort squat day. Keep accessories if they do not threaten the next main lift.",
		prescriptions: [
			{
				family: "squat",
				preferred: [
					"Pause Back Squat",
					"Pendulum Squat",
					"HACK SQUAT MACHINE",
					"High Bar Back Squat",
				],
				sets: 3,
				reps: 6,
				intensity: 0.68,
				priority: "main",
				note: "Technique or joint-friendly lower slot. Keep it medium and controlled.",
			},
			{
				family: "bench",
				preferred: [
					"Spoto Press",
					"Tempo Bench Press",
					"Bench Press without feet",
					"DB Bench Press - Flat",
				],
				sets: 3,
				reps: 6,
				intensity: 0.7,
				priority: "secondary",
				note: "Bench variation slot. Rotate every 4 weeks while keeping the bench frequency stable.",
			},
			{
				family: "pulldown",
				preferred: [
					"Pulldown - Underhand Grip",
					"Pull Up - Parallel Grip",
					"PULLDOWN - OverHand GRIP",
				],
				sets: 3,
				reps: 10,
				intensity: 0.68,
				priority: "pair",
			},
			{
				family: "arms",
				preferred: [
					"Tricep Pushdown",
					"Leaning Overhead Cable Tricep Extension",
					"INCLINE DB CURL",
				],
				sets: 2,
				reps: 12,
				intensity: 0.62,
				priority: "optional",
			},
			{
				family: "core",
				preferred: [
					"Hollow Hold With Leg Raises",
					"Bench Reverse Crunch",
					"Hollow Hold",
				],
				sets: 2,
				reps: 10,
				intensity: 0,
				priority: "optional",
			},
		],
	},
];

export function defaultPlanSettings(data: ExportData): PlanSettings {
	const lastDate = latestWorkoutDate(data.workouts);
	return {
		weeks: 4,
		startDate: nextTrainingDate(lastDate, DEFAULT_DAYS),
		trainingDays: DEFAULT_DAYS,
		goal: "powerlifting_strength",
		unit: "kg",
	};
}

export function generatePlan(
	data: ExportData,
	catalog: CatalogExercise[],
	settings = defaultPlanSettings(data),
): GeneratedPlan {
	const stats = analyzeExercises(data.workouts);
	const catalogSource = catalog.length > 0 ? "api" : "export";
	const exercisePool = catalog.length > 0 ? catalog : data.exercises;
	const workouts: PlannedWorkout[] = [];
	const dates = buildTrainingDates(
		settings.startDate,
		settings.weeks,
		settings.trainingDays,
	);

	for (const [index, date] of dates.entries()) {
		const week = Math.floor(index / settings.trainingDays.length) + 1;
		const template = TEMPLATES[index % TEMPLATES.length];
		workouts.push({
			id: `w-${date}-${index}`,
			date,
			title: `Week ${week} - ${template.title}`,
			week,
			dayIndex: index % settings.trainingDays.length,
			focus: template.focus,
			timeCapMinutes: 90,
			cutRule: template.cutRule,
			status: "draft",
			blocks: [
				{
					id: `b-${date}-strength`,
					title: "Strength/Power",
					order: 1,
					exercises: template.prescriptions.map((prescription, order) =>
						createPlannedExercise({
							prescription,
							order,
							week,
							stats,
							exercisePool,
						}),
					),
				},
			],
		});
	}

	return {
		id: `plan-${Date.now()}`,
		settings,
		workouts,
		trainingMaxes: Object.fromEntries(
			["squat", "deadlift", "bench"].map((family) => [
				family,
				Math.round((bestByFamily(stats, family)?.bestE1rm ?? 0) * 0.9),
			]),
		),
		catalogSource,
		createdAt: new Date().toISOString(),
	};
}

export function replaceExercise(
	plan: GeneratedPlan,
	workoutId: string,
	exerciseId: string,
	replacement: CatalogExercise,
): GeneratedPlan {
	return mapWorkout(plan, workoutId, (workout) => ({
		...workout,
		blocks: workout.blocks.map((block) => ({
			...block,
			exercises: block.exercises.map((exercise) =>
				exercise.id === exerciseId
					? {
							...exercise,
							exercise_id: replacement.id,
							title: replacement.title,
							video_url: replacement.video_url,
							family: detectFamily(replacement.title),
							catalog_match: "variation",
						}
					: exercise,
			),
		})),
	}));
}

export function updatePlannedSet(
	plan: GeneratedPlan,
	workoutId: string,
	exerciseId: string,
	setId: string,
	patch: Partial<PlannedSet>,
): GeneratedPlan {
	return mapWorkout(plan, workoutId, (workout) => ({
		...workout,
		blocks: workout.blocks.map((block) => ({
			...block,
			exercises: block.exercises.map((exercise) =>
				exercise.id === exerciseId
					? {
							...exercise,
							sets: exercise.sets.map((set) =>
								set.id === setId ? { ...set, ...patch } : set,
							),
						}
					: exercise,
			),
		})),
	}));
}

export function moveWorkoutDate(
	plan: GeneratedPlan,
	workoutId: string,
	date: string,
): GeneratedPlan {
	return mapWorkout(plan, workoutId, (workout) => ({ ...workout, date }));
}

export function addWorkout(
	plan: GeneratedPlan,
	afterDate?: string,
): GeneratedPlan {
	const base = plan.workouts.at(-1);
	if (!base) return plan;
	const date = nextTrainingDate(
		afterDate || base.date,
		plan.settings.trainingDays,
	);
	const clone: PlannedWorkout = {
		...base,
		id: `w-${date}-extra-${Date.now()}`,
		date,
		title: `Added Session - ${base.focus}`,
		status: "draft",
		publishedId: undefined,
		error: undefined,
		blocks: base.blocks.map((block) => ({
			...block,
			id: `${block.id}-extra-${Date.now()}`,
			exercises: block.exercises.map((exercise) => ({
				...exercise,
				id: `${exercise.id}-extra-${Date.now()}`,
				sets: exercise.sets.map((set) => ({
					...set,
					id: `${set.id}-extra-${Date.now()}`,
				})),
			})),
		})),
	};
	return { ...plan, workouts: [...plan.workouts, clone] };
}

export function adjustTrainingDays(
	plan: GeneratedPlan,
	data: ExportData,
	catalog: CatalogExercise[],
	trainingDays: number[],
): GeneratedPlan {
	const days = trainingDays.length > 0 ? trainingDays : DEFAULT_DAYS;
	return generatePlan(data, catalog, {
		...plan.settings,
		trainingDays: days,
	});
}

export function catalogFamilies(catalog: CatalogExercise[]): string[] {
	return Array.from(
		new Set(catalog.map((exercise) => detectFamily(exercise.title))),
	)
		.filter(Boolean)
		.sort();
}

function createPlannedExercise({
	prescription,
	order,
	week,
	stats,
	exercisePool,
}: {
	prescription: Prescription;
	order: number;
	week: number;
	stats: ExerciseStats[];
	exercisePool: Exercise[];
}): PlannedExercise {
	const match = pickExercise(prescription, stats, exercisePool, week);
	const trainingMax = Math.max(
		match.stat?.bestE1rm ? match.stat.bestE1rm * 0.9 : 0,
		match.stat?.bestWeight || 0,
	);
	const progression = 1 + (week - 1) * 0.025;
	const weight =
		trainingMax > 0
			? roundToIncrement(
					trainingMax * prescription.intensity * progression,
					2.5,
				)
			: undefined;

	return {
		id: `e-${order}-${match.exercise.id}-${week}`,
		exercise_id: match.exercise.id,
		title: match.exercise.title,
		family: prescription.family,
		priority: prescription.priority,
		order: order + 1,
		video_url: match.exercise.video_url,
		instruction: prescription.note,
		catalog_match: match.kind,
		sets: Array.from({ length: prescription.sets }, (_, index) => ({
			id: `s-${order}-${index}-${week}`,
			set_number: index + 1,
			reps: prescription.reps,
			weight_kg: weight,
			rpe: index === 0 && order < 2 ? 7 + Math.min(1, week * 0.25) : undefined,
		})),
	};
}

function pickExercise(
	prescription: Prescription,
	stats: ExerciseStats[],
	exercisePool: Exercise[],
	week: number,
): {
	exercise: Exercise;
	stat?: ExerciseStats;
	kind: PlannedExercise["catalog_match"];
} {
	const normalizedPool = exercisePool.map((exercise) => ({
		exercise,
		key: normalize(exercise.title),
	}));
	const blockIndex = Math.floor((week - 1) / 4);
	const preferred =
		blockIndex > 0 && prescription.preferred.length > 1
			? rotate(prescription.preferred, blockIndex)
			: prescription.preferred;

	for (const title of preferred) {
		const key = normalize(title);
		const exact = normalizedPool.find((entry) => entry.key === key);
		const stat = stats.find((entry) => normalize(entry.title) === key);
		if (exact) return { exercise: exact.exercise, stat, kind: "exact" };
		if (stat) return { exercise: statToExercise(stat), stat, kind: "history" };
	}

	const familyStats = stats
		.filter(
			(entry) =>
				entry.family === prescription.family &&
				isAllowedForPrescription(entry.title, prescription),
		)
		.sort((a, b) => b.sessions - a.sessions);
	if (familyStats[0]) {
		const catalogMatch = normalizedPool.find(
			(entry) =>
				detectFamily(entry.exercise.title) === prescription.family &&
				isAllowedForPrescription(entry.exercise.title, prescription),
		);
		return {
			exercise: catalogMatch?.exercise || statToExercise(familyStats[0]),
			stat: familyStats[0],
			kind: catalogMatch ? "variation" : "history",
		};
	}

	const fallback = normalizedPool.find(
		(entry) =>
			detectFamily(entry.exercise.title) === prescription.family &&
			isAllowedForPrescription(entry.exercise.title, prescription),
	)?.exercise ||
		exercisePool.find((exercise) =>
			isAllowedForPrescription(exercise.title, prescription),
		) || { id: 0, title: prescription.family };
	return { exercise: fallback, kind: "fallback" };
}

function analyzeExercises(workouts: Workout[]): ExerciseStats[] {
	const map = new Map<number, ExerciseStats>();
	for (const workout of workouts) {
		for (const block of workout.blocks || []) {
			for (const exercise of block.exercises || []) {
				if (!exercise.exercise_id) continue;
				let entry = map.get(exercise.exercise_id);
				if (!entry) {
					entry = {
						exercise_id: exercise.exercise_id,
						title: exercise.title,
						family: detectFamily(exercise.title),
						sessions: 0,
						lastPerformed: workout.date,
						bestWeight: 0,
						bestE1rm: 0,
						video_url: exercise.video_url,
					};
					map.set(exercise.exercise_id, entry);
				}
				if ((exercise.sets || []).length > 0) entry.sessions++;
				if (workout.date > entry.lastPerformed)
					entry.lastPerformed = workout.date;
				for (const set of exercise.sets || []) {
					const data = set.actual || set.prescribed;
					if (!data?.weight_kg) continue;
					entry.bestWeight = Math.max(entry.bestWeight, data.weight_kg);
					if (data.reps) {
						entry.bestE1rm = Math.max(
							entry.bestE1rm,
							data.weight_kg * (1 + data.reps / 30),
						);
					}
				}
			}
		}
	}
	return Array.from(map.values());
}

function bestByFamily(
	stats: ExerciseStats[],
	family: string,
): ExerciseStats | undefined {
	return stats
		.filter((entry) => entry.family === family)
		.sort((a, b) => b.bestE1rm - a.bestE1rm)[0];
}

function latestWorkoutDate(workouts: Workout[]): string {
	let latest = new Date().toISOString().slice(0, 10);
	for (const workout of workouts) {
		if (workout.date > latest) latest = workout.date;
	}
	return latest;
}

function buildTrainingDates(
	startDate: string,
	weeks: number,
	trainingDays: number[],
): string[] {
	const dates: string[] = [];
	const start = parseDate(startDate);
	for (let offset = 0; dates.length < weeks * trainingDays.length; offset++) {
		const date = new Date(start.getTime() + offset * DAY_MS);
		if (trainingDays.includes(date.getDay())) dates.push(toDateString(date));
	}
	return dates;
}

function nextTrainingDate(fromDate: string, trainingDays: number[]): string {
	const start = parseDate(fromDate);
	for (let offset = 1; offset <= 14; offset++) {
		const date = new Date(start.getTime() + offset * DAY_MS);
		if (trainingDays.includes(date.getDay())) return toDateString(date);
	}
	return toDateString(new Date(start.getTime() + DAY_MS));
}

function parseDate(date: string): Date {
	return new Date(`${date}T00:00:00`);
}

function toDateString(date: Date): string {
	return date.toISOString().slice(0, 10);
}

function detectFamily(title: string): string {
	return (
		FAMILY_PATTERNS.find(([, pattern]) => pattern.test(title))?.[0] || "other"
	);
}

function normalize(value: string): string {
	return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function isAllowedForPrescription(
	title: string,
	prescription: Prescription,
): boolean {
	if (
		prescription.preferred.some(
			(preferred) => normalize(preferred) === normalize(title),
		)
	) {
		return true;
	}
	return !WOMENS_EITHER_OR_PATTERNS.some((pattern) => pattern.test(title));
}

function roundToIncrement(value: number, increment: number): number {
	return Math.round(value / increment) * increment;
}

function rotate<T>(items: T[], amount: number): T[] {
	const shift = amount % items.length;
	return [...items.slice(shift), ...items.slice(0, shift)];
}

function statToExercise(stat: ExerciseStats): Exercise {
	return {
		id: stat.exercise_id,
		title: stat.title,
		video_url: stat.video_url,
	};
}

function mapWorkout(
	plan: GeneratedPlan,
	workoutId: string,
	mapper: (workout: PlannedWorkout) => PlannedWorkout,
): GeneratedPlan {
	return {
		...plan,
		workouts: plan.workouts.map((workout) =>
			workout.id === workoutId ? mapper(workout) : workout,
		),
	};
}

export function setWorkoutStatus(
	plan: GeneratedPlan,
	workoutId: string,
	status: PlannedWorkout["status"],
	patch: Partial<PlannedWorkout> = {},
): GeneratedPlan {
	return mapWorkout(plan, workoutId, (workout) => ({
		...workout,
		...patch,
		status,
	}));
}

export function summarizeVolume(workout: PlannedWorkout): {
	sets: number;
	volume: number;
} {
	let sets = 0;
	let volume = 0;
	for (const block of workout.blocks) {
		for (const exercise of block.exercises) {
			for (const set of exercise.sets) {
				sets++;
				volume += (set.weight_kg || 0) * set.reps;
			}
		}
	}
	return { sets, volume };
}

export function flattenPlanExercises(plan: GeneratedPlan): PlannedExercise[] {
	return plan.workouts.flatMap((workout) =>
		workout.blocks.flatMap((block: PlannedBlock) => block.exercises),
	);
}
