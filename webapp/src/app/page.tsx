"use client";

import { useCallback, useState } from "react";
import { Toaster, toast } from "sonner";
import { Dashboard } from "@/components/dashboard";
import { LoadingScreen } from "@/components/loading-screen";
import { LoginForm } from "@/components/login-form";
import {
	fetchProfileStats,
	fetchUserProfile,
	fetchWorkouts,
	login,
} from "@/lib/api";
import {
	extractExercises,
	groupByExercise,
	transformWorkout,
} from "@/lib/transform";
import type { ExerciseWithHistory, ExportData } from "@/lib/types";

export default function Home() {
	const [exportData, setExportData] = useState<ExportData | null>(null);
	const [exercises, setExercises] = useState<ExerciseWithHistory[]>([]);
	const [loading, setLoading] = useState(false);
	const [loadingMessage, setLoadingMessage] = useState("");

	const handleLogin = useCallback(async (email: string, password: string) => {
		setLoading(true);

		try {
			setLoadingMessage("Signing in...");
			const session = await login(email, password);

			setLoadingMessage("Loading your profile...");
			const [userData, statsData] = await Promise.all([
				fetchUserProfile(session.user_id, session.session_id),
				fetchProfileStats(session.user_id, session.session_id),
			]);

			setLoadingMessage("Fetching your workouts...");
			const rawWorkouts = await fetchWorkouts(session.session_id);

			setLoadingMessage(`Processing ${rawWorkouts.length} workouts...`);
			const workouts = rawWorkouts.map(transformWorkout);
			const exerciseLib = extractExercises(workouts);
			const grouped = groupByExercise(workouts);

			const data: ExportData = {
				version: "1.0",
				exported_at: new Date().toISOString(),
				user: {
					id: session.user_id,
					name: `${userData.name_first || ""} ${userData.name_last || ""}`.trim(),
					email: userData.email,
					use_metric: userData.use_metric === 1,
				},
				profile_stats: {
					total_sessions: statsData.totalSessions || 0,
					total_reps: statsData.totalReps || 0,
					total_volume_kg: statsData.totalVolume || 0,
					total_exercises: statsData.totalExercises || 0,
					unique_exercises: statsData.uniqueExercises || 0,
				},
				workouts,
				exercises: exerciseLib,
			};

			setExportData(data);
			setExercises(grouped);
			toast.success(
				`Loaded ${workouts.length} workouts with ${grouped.length} exercises`,
			);
		} catch (err) {
			setLoading(false);
			throw err;
		} finally {
			setLoading(false);
		}
	}, []);

	const handleLogout = useCallback(() => {
		setExportData(null);
		setExercises([]);
	}, []);

	return (
		<>
			<Toaster position="top-center" richColors />
			{loading ? (
				<LoadingScreen message={loadingMessage} />
			) : exportData ? (
				<Dashboard
					data={exportData}
					exercises={exercises}
					onLogout={handleLogout}
				/>
			) : (
				<LoginForm onLogin={handleLogin} />
			)}
		</>
	);
}
