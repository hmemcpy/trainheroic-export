export interface User {
	id: number;
	name: string;
	email?: string;
	use_metric: boolean;
}

export interface ProfileStats {
	total_sessions: number;
	total_reps: number;
	total_volume_kg: number;
	total_exercises: number;
	unique_exercises: number;
}

export interface SetData {
	reps?: number;
	weight_kg?: number;
	duration_seconds?: number;
}

export interface ExerciseSet {
	set_number: number;
	prescribed?: SetData;
	actual?: SetData;
	completed: boolean;
}

export interface LoggedExercise {
	exercise_id: number;
	title: string;
	order: number;
	video_url?: string;
	instruction?: string;
	notes?: string;
	sets?: ExerciseSet[];
}

export interface WorkoutBlock {
	id: number;
	title: string;
	order: number;
	completed: boolean;
	instruction?: string;
	exercises?: LoggedExercise[];
}

export interface Workout {
	id: number;
	date: string;
	title: string;
	program: string;
	completed: boolean;
	completion_percent: number;
	started_at?: string;
	completed_at?: string;
	notes?: string;
	rpe?: number;
	blocks?: WorkoutBlock[];
}

export interface Exercise {
	id: number;
	title: string;
	video_url?: string;
	thumbnail_url?: string;
	param_1_type?: number;
	param_2_type?: number;
	use_count?: number;
}

export interface ExportData {
	version: string;
	exported_at: string;
	user: User;
	profile_stats: ProfileStats;
	workouts: Workout[];
	exercises: Exercise[];
}

export interface ExerciseHistoryEntry {
	date: string;
	workout_title: string;
	workout_id: number;
	sets: ExerciseSet[];
}

export interface ExerciseWithHistory {
	exercise_id: number;
	title: string;
	video_url?: string;
	total_sessions: number;
	last_performed: string;
	history: ExerciseHistoryEntry[];
}

export interface AuthSession {
	session_id: string;
	user_id: number;
}

export interface TrainHeroicTeam {
	id: number;
	group_id?: number;
	title: string;
	type?: number;
	athlete_id?: number;
	pub_days?: number;
	pub_enabled?: number;
}

export interface TrainHeroicAthlete {
	id: number;
	fullName: string;
	imageProfile?: string;
}

export interface CatalogExercise extends Exercise {
	abr?: string;
	abr2?: string;
	custom?: number;
	points_of_performance?: string;
	tags?: string[];
}

export interface PlanSettings {
	weeks: number;
	startDate: string;
	trainingDays: number[];
	goal: "powerlifting_strength";
	unit: "kg";
}

export interface PlannedSet {
	id: string;
	set_number: number;
	reps: number;
	weight_kg?: number;
	rpe?: number;
	note?: string;
}

export interface PlannedExercise {
	id: string;
	exercise_id: number;
	title: string;
	family: string;
	order: number;
	video_url?: string;
	instruction?: string;
	sets: PlannedSet[];
	catalog_match: "exact" | "variation" | "history" | "fallback";
}

export interface PlannedBlock {
	id: string;
	title: string;
	order: number;
	exercises: PlannedExercise[];
}

export interface PlannedWorkout {
	id: string;
	date: string;
	title: string;
	week: number;
	dayIndex: number;
	focus: string;
	blocks: PlannedBlock[];
	status: "draft" | "publishing" | "published" | "error";
	publishedId?: number;
	error?: string;
}

export interface GeneratedPlan {
	id: string;
	settings: PlanSettings;
	workouts: PlannedWorkout[];
	trainingMaxes: Record<string, number>;
	catalogSource: "api" | "export";
	createdAt: string;
}

export interface PublishTarget {
	teamId?: number;
	athleteId?: number;
}

export interface PublishResult {
	workoutId?: number;
	programWorkoutId?: number;
	status: "published" | "failed";
	message?: string;
}
