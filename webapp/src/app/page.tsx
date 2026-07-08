"use client";

import { useCallback, useState } from "react";
import { Toaster, toast } from "sonner";
import { Dashboard } from "@/components/dashboard";
import { LoadingScreen } from "@/components/loading-screen";
import { LoginForm } from "@/components/login-form";
import {
	fetchCoachAthletes,
	fetchCoachTeams,
	fetchExerciseCatalog,
	fetchProfileStats,
	fetchRecentExercises,
	fetchUserProfile,
	fetchWorkouts,
	login,
} from "@/lib/api";
import {
	extractExercises,
	groupByExercise,
	transformWorkout,
} from "@/lib/transform";
import type {
	CatalogExercise,
	ExerciseWithHistory,
	ExportData,
	TrainHeroicAthlete,
	TrainHeroicTeam,
} from "@/lib/types";

export default function Home() {
	const [exportData, setExportData] = useState<ExportData | null>(null);
	const [exercises, setExercises] = useState<ExerciseWithHistory[]>([]);
	const [catalog, setCatalog] = useState<CatalogExercise[]>([]);
	const [teams, setTeams] = useState<TrainHeroicTeam[]>([]);
	const [athletes, setAthletes] = useState<TrainHeroicAthlete[]>([]);
	const [sessionToken, setSessionToken] = useState("");
	const [userId, setUserId] = useState(0);
	const [catalogLoading, setCatalogLoading] = useState(false);
	const [loading, setLoading] = useState(false);
	const [loadingMessage, setLoadingMessage] = useState("");

	const refreshCatalog = useCallback(
		async (
			token = sessionToken,
			currentUserId = userId,
			currentTeams = teams,
		) => {
			if (!token || !currentUserId) return;
			setCatalogLoading(true);
			try {
				const freshCatalog = await loadAvailableCatalog(
					token,
					currentUserId,
					currentTeams,
				);
				setCatalog(freshCatalog);
			} finally {
				setCatalogLoading(false);
			}
		},
		[sessionToken, teams, userId],
	);

	const handleLogin = useCallback(async (email: string, password: string) => {
		setLoading(true);

		try {
			setLoadingMessage("Signing in...");
			const session = await login(email, password);
			setSessionToken(session.session_id);
			setUserId(session.user_id);

			setLoadingMessage("Loading your profile...");
			const [userData, statsData] = await Promise.all([
				fetchUserProfile(session.user_id, session.session_id),
				fetchProfileStats(session.user_id, session.session_id),
			]);

			setLoadingMessage("Fetching your workouts...");
			const rawWorkouts = await fetchWorkouts(session.session_id);

			setLoadingMessage("Loading programming catalog...");
			const [loadedTeams, loadedAthletes] = await Promise.all([
				fetchCoachTeams(session.session_id).catch(() => []),
				fetchCoachAthletes(session.session_id).catch(() => []),
			]);
			const loadedCatalog = await loadAvailableCatalog(
				session.session_id,
				session.user_id,
				loadedTeams,
			);

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
			setTeams(loadedTeams);
			setAthletes(loadedAthletes);
			setCatalog(loadedCatalog);
			toast.success(
				`Loaded ${workouts.length} workouts and ${loadedCatalog.length || exerciseLib.length} catalog exercises`,
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
		setCatalog([]);
		setTeams([]);
		setAthletes([]);
		setSessionToken("");
		setUserId(0);
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
					catalog={catalog}
					teams={teams}
					athletes={athletes}
					sessionToken={sessionToken}
					catalogLoading={catalogLoading}
					onRefreshCatalog={refreshCatalog}
					onLogout={handleLogout}
				/>
			) : (
				<LoginForm onLogin={handleLogin} />
			)}
		</>
	);
}

async function loadAvailableCatalog(
	sessionToken: string,
	userId: number,
	teams: TrainHeroicTeam[],
): Promise<CatalogExercise[]> {
	const requests = teams.length
		? teams.map((team) =>
				fetchExerciseCatalog(sessionToken, userId, team.id).catch(() => []),
			)
		: [fetchExerciseCatalog(sessionToken, userId).catch(() => [])];
	requests.push(fetchRecentExercises(sessionToken).catch(() => []));
	const results = await Promise.all(requests);
	return dedupeCatalog(results.flat());
}

function dedupeCatalog(exercises: CatalogExercise[]): CatalogExercise[] {
	const map = new Map<number, CatalogExercise>();
	for (const exercise of exercises) {
		if (exercise?.id && exercise.title) map.set(exercise.id, exercise);
	}
	return Array.from(map.values()).sort((a, b) =>
		a.title.localeCompare(b.title),
	);
}
