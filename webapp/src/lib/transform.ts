import type {
	Exercise,
	ExerciseHistoryEntry,
	ExerciseSet,
	ExerciseWithHistory,
	SetData,
	Workout,
} from "./types";

const PARAM_TYPES: Record<number, string> = {
	1: "weight",
	3: "reps",
	4: "time_mmss",
	6: "sets_only",
	18: "time_sec",
	19: "weight_any",
};

function parseTime(timeStr: string | number | null | undefined): number | null {
	if (!timeStr) return null;
	const s = String(timeStr);
	if (s.includes(":")) {
		const parts = s.split(":");
		return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
	}
	const n = parseFloat(s);
	return Number.isNaN(n) ? null : Math.round(n);
}

function parseSetData(
	exerciseData: any,
	setIndex: number,
	param1Type: number | null,
	param2Type: number | null,
): SetData | null {
	const p1Val = exerciseData[`param_1_data_${setIndex}`];
	const p2Val = exerciseData[`param_2_data_${setIndex}`];

	const result: SetData = {};

	// Parse param 1
	const p1TypeStr = param1Type
		? PARAM_TYPES[param1Type] || "unknown"
		: "unknown";
	if (p1Val && p1Val !== "0") {
		if (p1TypeStr === "reps") {
			const v = parseInt(parseFloat(p1Val).toString(), 10);
			if (!Number.isNaN(v)) result.reps = v;
		} else if (p1TypeStr === "weight" || p1TypeStr === "weight_any") {
			const v = parseFloat(p1Val);
			if (!Number.isNaN(v)) result.weight_kg = v;
		} else if (p1TypeStr === "time_mmss" || p1TypeStr === "time_sec") {
			const secs = parseTime(p1Val);
			if (secs) result.duration_seconds = secs;
		}
	}

	// Parse param 2
	const p2TypeStr = param2Type
		? PARAM_TYPES[param2Type] || "unknown"
		: "unknown";
	if (p2Val && p2Val !== "0") {
		if (p2TypeStr === "reps") {
			const v = parseInt(parseFloat(p2Val).toString(), 10);
			if (!Number.isNaN(v)) result.reps = v;
		} else if (p2TypeStr === "weight" || p2TypeStr === "weight_any") {
			const v = parseFloat(p2Val);
			if (!Number.isNaN(v)) result.weight_kg = v;
		} else if (p2TypeStr === "time_mmss" || p2TypeStr === "time_sec") {
			const secs = parseTime(p2Val);
			if (secs) result.duration_seconds = secs;
		}
	}

	return Object.keys(result).length > 0 ? result : null;
}

export function transformWorkout(raw: any): Workout {
	const ssw = raw.summarizedSavedWorkout || {};
	const saved = ssw.saved_workout || {};
	const workoutTemplate = ssw.workout || {};

	const workout: Workout = {
		id: saved.id || raw.id,
		date: raw.date,
		title: raw.workout_title || saved.title || "",
		program: raw.program_title || "",
		completed: saved.completed === 1,
		completion_percent: saved.percent_completed || 0,
	};

	if (saved.timestamp_started) {
		workout.started_at = new Date(saved.timestamp_started * 1000).toISOString();
	}
	if (saved.timestamp_completed) {
		workout.completed_at = new Date(
			saved.timestamp_completed * 1000,
		).toISOString();
	}
	if (saved.notes) workout.notes = saved.notes;
	if (saved.rpe) workout.rpe = parseFloat(saved.rpe);

	// Transform blocks
	const savedSets: Record<number, any> = {};
	for (const ws of saved.workoutSets || []) {
		savedSets[ws.workout_set_id] = ws;
	}

	const blocks = [];
	for (const ws of workoutTemplate.workoutSets || []) {
		const savedSet = savedSets[ws.id] || {};
		const block: any = {
			id: ws.id,
			title: ws.block_title || ws.title || "",
			order: ws.order || 0,
			completed: savedSet.completed === 1,
		};
		if (ws.instruction) block.instruction = ws.instruction;

		const savedExercises: Record<number, any> = {};
		for (const ex of savedSet.workoutSetExercises || []) {
			savedExercises[ex.workout_set_exercise_id] = ex;
		}

		const exercises = [];
		for (const exTemplate of ws.exercises || []) {
			const savedEx = savedExercises[exTemplate.id] || {};
			const exercise: any = {
				exercise_id: exTemplate.exercise_id,
				title: savedEx.exercise_title || exTemplate.title || "",
				order: exTemplate.order || 0,
			};
			if (exTemplate.video_url) exercise.video_url = exTemplate.video_url;
			if (savedEx.instruction || exTemplate.instruction)
				exercise.instruction = savedEx.instruction || exTemplate.instruction;
			if (savedEx.notes) exercise.notes = savedEx.notes;

			const paramCount = exTemplate.param_count || savedEx.param_count || 0;
			const param1Type = exTemplate.param_1_type || savedEx.param_1_type;
			const param2Type = exTemplate.param_2_type || savedEx.param_2_type;

			const sets: ExerciseSet[] = [];
			for (let i = 1; i <= paramCount; i++) {
				const prescribed = parseSetData(exTemplate, i, param1Type, param2Type);
				const actual = parseSetData(savedEx, i, param1Type, param2Type);

				if (prescribed || actual) {
					const setData: ExerciseSet = {
						set_number: i,
						completed: !!actual,
					};
					if (prescribed) setData.prescribed = prescribed;
					if (actual) setData.actual = actual;
					sets.push(setData);
				}
			}

			if (sets.length > 0) exercise.sets = sets;
			exercises.push(exercise);
		}

		if (exercises.length > 0) {
			block.exercises = exercises;
			blocks.push(block);
		}
	}

	if (blocks.length > 0) workout.blocks = blocks;
	return workout;
}

export function extractExercises(workouts: Workout[]): Exercise[] {
	const seen = new Map<number, Exercise>();
	for (const workout of workouts) {
		for (const block of workout.blocks || []) {
			for (const ex of block.exercises || []) {
				if (ex.exercise_id && !seen.has(ex.exercise_id)) {
					seen.set(ex.exercise_id, {
						id: ex.exercise_id,
						title: ex.title,
						video_url: ex.video_url,
					});
				}
			}
		}
	}
	return Array.from(seen.values());
}

export function groupByExercise(workouts: Workout[]): ExerciseWithHistory[] {
	const exerciseMap = new Map<number, ExerciseWithHistory>();

	for (const workout of workouts) {
		for (const block of workout.blocks || []) {
			for (const ex of block.exercises || []) {
				if (!ex.exercise_id) continue;

				let entry = exerciseMap.get(ex.exercise_id);
				if (!entry) {
					entry = {
						exercise_id: ex.exercise_id,
						title: ex.title,
						video_url: ex.video_url,
						total_sessions: 0,
						last_performed: "",
						history: [],
					};
					exerciseMap.set(ex.exercise_id, entry);
				}

				if (ex.sets && ex.sets.length > 0) {
					const historyEntry: ExerciseHistoryEntry = {
						date: workout.date,
						workout_title: workout.title,
						workout_id: workout.id,
						sets: ex.sets,
					};
					entry.history.push(historyEntry);
					entry.total_sessions++;
					if (!entry.last_performed || workout.date > entry.last_performed) {
						entry.last_performed = workout.date;
					}
				}
			}
		}
	}

	// Sort history within each exercise by date descending
	for (const entry of exerciseMap.values()) {
		entry.history.sort((a, b) => b.date.localeCompare(a.date));
	}

	// Sort exercises by most recent
	return Array.from(exerciseMap.values()).sort((a, b) =>
		b.last_performed.localeCompare(a.last_performed),
	);
}
