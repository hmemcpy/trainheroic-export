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
