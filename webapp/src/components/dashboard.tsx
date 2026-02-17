"use client";

import { Dumbbell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ExerciseWithHistory, ExportData } from "@/lib/types";
import { ExerciseHistory } from "./exercise-history";
import { ExportMenu } from "./export-menu";
import { StatsCards } from "./stats-cards";

interface DashboardProps {
	data: ExportData;
	exercises: ExerciseWithHistory[];
	onLogout: () => void;
}

export function Dashboard({ data, exercises, onLogout }: DashboardProps) {
	const dateRange =
		data.workouts.length > 0
			? `${formatDateShort(data.workouts[0].date)} – ${formatDateShort(data.workouts[data.workouts.length - 1].date)}`
			: "";

	return (
		<div className="min-h-screen bg-gradient-to-br from-sky-50/80 to-slate-100">
			{/* Header */}
			<header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
				<div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center">
							<Dumbbell className="w-5 h-5 text-white" />
						</div>
						<div>
							<h1 className="font-bold text-slate-800 text-lg leading-tight">
								My Training History
							</h1>
							<p className="text-xs text-slate-500">
								{data.user.name}
								{dateRange && <> · {dateRange}</>}
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<ExportMenu exportData={data} exercises={exercises} />
						<Button
							variant="ghost"
							size="icon"
							onClick={onLogout}
							className="text-slate-400 hover:text-slate-600 cursor-pointer"
							title="Sign out"
						>
							<LogOut className="w-4 h-4" />
						</Button>
					</div>
				</div>
			</header>

			{/* Content */}
			<main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
				{/* Stats */}
				<StatsCards
					stats={data.profile_stats}
					workoutCount={data.workouts.length}
					exerciseCount={exercises.length}
				/>

				{/* Exercises */}
				<div>
					<h2 className="text-lg font-semibold text-slate-800 mb-4">
						Exercises
					</h2>
					<ExerciseHistory exercises={exercises} />
				</div>
			</main>
		</div>
	);
}

function formatDateShort(dateStr: string): string {
	const d = new Date(`${dateStr}T00:00:00`);
	return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
