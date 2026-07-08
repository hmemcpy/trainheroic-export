"use client";

import {
	BarChart3,
	Dumbbell,
	History,
	Library,
	LogOut,
	Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
	CatalogExercise,
	ExerciseWithHistory,
	ExportData,
	TrainHeroicAthlete,
	TrainHeroicTeam,
} from "@/lib/types";
import { ExerciseHistory } from "./exercise-history";
import { ExportMenu } from "./export-menu";
import { PlannerWorkspace } from "./planner-workspace";
import { StatsCards } from "./stats-cards";

interface DashboardProps {
	data: ExportData;
	exercises: ExerciseWithHistory[];
	catalog: CatalogExercise[];
	teams: TrainHeroicTeam[];
	athletes: TrainHeroicAthlete[];
	sessionToken: string;
	catalogLoading: boolean;
	onRefreshCatalog: () => Promise<void>;
	onLogout: () => void;
}

export function Dashboard({
	data,
	exercises,
	catalog,
	teams,
	athletes,
	sessionToken,
	catalogLoading,
	onRefreshCatalog,
	onLogout,
}: DashboardProps) {
	const dateRange =
		data.workouts.length > 0
			? `${formatDateShort(data.workouts[0].date)} – ${formatDateShort(data.workouts[data.workouts.length - 1].date)}`
			: "";
	const plannerCatalog = catalog.length > 0 ? catalog : data.exercises;

	return (
		<div className="min-h-screen bg-[#e8e3d8] text-zinc-950">
			<header className="sticky top-0 z-20 border-zinc-900/10 border-b bg-[#f8f6ef]/90 backdrop-blur-xl">
				<div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
					<div className="flex min-w-0 items-center gap-3">
						<div className="flex size-10 items-center justify-center rounded-xl bg-zinc-950 text-amber-300 shadow-lg shadow-zinc-950/20">
							<Dumbbell className="size-5" />
						</div>
						<div className="min-w-0">
							<h1 className="truncate text-lg font-black tracking-tight text-zinc-950">
								TrainHeroic Programming
							</h1>
							<p className="truncate text-xs font-medium text-zinc-500">
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
							className="cursor-pointer text-zinc-500 hover:text-zinc-950"
							title="Sign out"
						>
							<LogOut className="size-4" />
						</Button>
					</div>
				</div>
			</header>

			<main className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
				<Tabs defaultValue="planner" className="gap-5">
					<div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
						<div>
							<p className="text-xs font-bold tracking-[0.22em] text-zinc-500 uppercase">
								History analyzed automatically
							</p>
							<h2 className="mt-2 max-w-3xl text-4xl font-black tracking-tight text-zinc-950">
								Plan the next block from the work already logged.
							</h2>
						</div>
						<TabsList className="h-auto rounded-xl border border-zinc-900/10 bg-stone-50 p-1 shadow-sm">
							<TabsTrigger
								value="planner"
								className="h-10 rounded-lg px-4 data-[state=active]:bg-zinc-950 data-[state=active]:text-stone-100"
							>
								<Wand2 />
								Planner
							</TabsTrigger>
							<TabsTrigger
								value="history"
								className="h-10 rounded-lg px-4 data-[state=active]:bg-zinc-950 data-[state=active]:text-stone-100"
							>
								<History />
								History
							</TabsTrigger>
							<TabsTrigger
								value="catalog"
								className="h-10 rounded-lg px-4 data-[state=active]:bg-zinc-950 data-[state=active]:text-stone-100"
							>
								<Library />
								Catalog
							</TabsTrigger>
						</TabsList>
					</div>

					<TabsContent value="planner">
						<PlannerWorkspace
							data={data}
							exercises={exercises}
							catalog={plannerCatalog}
							teams={teams}
							athletes={athletes}
							sessionToken={sessionToken}
							catalogLoading={catalogLoading}
							onRefreshCatalog={onRefreshCatalog}
						/>
					</TabsContent>

					<TabsContent value="history" className="space-y-6">
						<StatsCards
							stats={data.profile_stats}
							workoutCount={data.workouts.length}
							exerciseCount={exercises.length}
						/>
						<div>
							<div className="mb-4 flex items-center gap-2">
								<BarChart3 className="size-5 text-zinc-500" />
								<h2 className="text-lg font-black text-zinc-900">
									Exercise Log
								</h2>
							</div>
							<ExerciseHistory exercises={exercises} />
						</div>
					</TabsContent>

					<TabsContent value="catalog">
						<div className="rounded-2xl border border-zinc-900/10 bg-stone-50 p-5 shadow-sm">
							<div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
								<div>
									<p className="text-xs font-bold tracking-[0.18em] text-zinc-500 uppercase">
										Live exercise catalog
									</p>
									<h2 className="mt-1 text-2xl font-black">
										{plannerCatalog.length} exercises available
									</h2>
								</div>
								<Button
									variant="outline"
									onClick={onRefreshCatalog}
									disabled={catalogLoading}
								>
									<Library />
									Refresh Catalog
								</Button>
							</div>
							<div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
								{plannerCatalog.slice(0, 120).map((exercise) => (
									<div
										key={exercise.id}
										className="rounded-xl border border-zinc-200 bg-white p-3"
									>
										<p className="font-semibold text-zinc-900">
											{exercise.title}
										</p>
										<p className="mt-1 text-xs text-zinc-500">
											Available for programming
										</p>
									</div>
								))}
							</div>
						</div>
					</TabsContent>
				</Tabs>
			</main>
		</div>
	);
}

function formatDateShort(dateStr: string): string {
	const d = new Date(`${dateStr}T00:00:00`);
	return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
