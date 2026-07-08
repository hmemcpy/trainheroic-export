"use client";

import {
	Activity,
	CalendarDays,
	CheckCircle2,
	ChevronsUpDown,
	Clock3,
	Dumbbell,
	Library,
	Loader2,
	Plus,
	RefreshCw,
	Search,
	Send,
	SlidersHorizontal,
	Target,
	XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createWorkoutTemplate, publishProgramWorkout } from "@/lib/api";
import {
	addWorkout,
	adjustStartDate,
	adjustTrainingDays,
	catalogFamilies,
	defaultPlanSettings,
	generatePlan,
	replaceExercise,
	setWorkoutStatus,
	summarizeVolume,
	updatePlannedSet,
} from "@/lib/planner";
import type {
	CatalogExercise,
	ExerciseWithHistory,
	ExportData,
	GeneratedPlan,
	PlannedExercise,
	PlannedWorkout,
	TrainHeroicAthlete,
	TrainHeroicTeam,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const WEEK_DAYS = [
	{ value: 0, label: "Sun" },
	{ value: 1, label: "Mon" },
	{ value: 2, label: "Tue" },
	{ value: 3, label: "Wed" },
	{ value: 4, label: "Thu" },
	{ value: 5, label: "Fri" },
	{ value: 6, label: "Sat" },
];

interface PlannerWorkspaceProps {
	data: ExportData;
	exercises: ExerciseWithHistory[];
	catalog: CatalogExercise[];
	teams: TrainHeroicTeam[];
	athletes: TrainHeroicAthlete[];
	sessionToken: string;
	catalogLoading: boolean;
	onRefreshCatalog: () => Promise<void>;
}

export function PlannerWorkspace({
	data,
	exercises,
	catalog,
	teams,
	athletes,
	sessionToken,
	catalogLoading,
	onRefreshCatalog,
}: PlannerWorkspaceProps) {
	const [plan, setPlan] = useState<GeneratedPlan>(() =>
		generatePlan(data, catalog, defaultPlanSettings(data)),
	);
	const [selectedWorkoutId, setSelectedWorkoutId] = useState(
		() => plan.workouts[0]?.id || "",
	);
	const [selectedExerciseId, setSelectedExerciseId] = useState(
		() => plan.workouts[0]?.blocks[0]?.exercises[0]?.id || "",
	);
	const [query, setQuery] = useState("");
	const [familyFilter, setFamilyFilter] = useState("all");
	const [teamId, setTeamId] = useState<number | undefined>(() => teams[0]?.id);
	const [athleteId, setAthleteId] = useState<number | undefined>(
		() => athletes[0]?.id,
	);
	const [pendingReplacement, setPendingReplacement] =
		useState<CatalogExercise | null>(null);
	const [undoPlan, setUndoPlan] = useState<{
		plan: GeneratedPlan;
		label: string;
	} | null>(null);
	const [publishingAll, setPublishingAll] = useState(false);

	const selectedWorkout =
		plan.workouts.find((workout) => workout.id === selectedWorkoutId) ||
		plan.workouts[0];
	const selectedExercise = selectedWorkout?.blocks
		.flatMap((block) => block.exercises)
		.find((exercise) => exercise.id === selectedExerciseId);

	const families = useMemo(() => catalogFamilies(catalog), [catalog]);
	const filteredCatalog = useMemo(() => {
		const normalized = query.trim().toLowerCase();
		return catalog
			.filter((exercise) => {
				const family =
					families.find((entry) =>
						exercise.title.toLowerCase().includes(entry.replace("-", " ")),
					) || "all";
				const familyMatch =
					familyFilter === "all" ||
					family === familyFilter ||
					exercise.title.toLowerCase().includes(familyFilter.replace("-", " "));
				const textMatch =
					!normalized || exercise.title.toLowerCase().includes(normalized);
				return familyMatch && textMatch;
			})
			.slice(0, 80);
	}, [catalog, families, familyFilter, query]);

	const totalSets = useMemo(
		() =>
			plan.workouts.reduce(
				(sum, workout) => sum + summarizeVolume(workout).sets,
				0,
			),
		[plan],
	);
	function regenerate() {
		const nextPlan = generatePlan(data, catalog, {
			...plan.settings,
			startDate: plan.settings.startDate,
		});
		setUndoPlan({ plan, label: "Regenerated plan" });
		setPlan(nextPlan);
		setPendingReplacement(null);
		setSelectedWorkoutId(nextPlan.workouts[0]?.id || "");
		setSelectedExerciseId(
			nextPlan.workouts[0]?.blocks[0]?.exercises[0]?.id || "",
		);
	}

	function toggleTrainingDay(day: number) {
		const nextDays = plan.settings.trainingDays.includes(day)
			? plan.settings.trainingDays.filter((value) => value !== day)
			: [...plan.settings.trainingDays, day].sort((a, b) => a - b);
		if (nextDays.length === 0) {
			toast.error("Keep at least one training day");
			return;
		}
		const nextPlan = adjustTrainingDays(plan, data, catalog, nextDays);
		setUndoPlan({ plan, label: "Changed weekly days" });
		setPlan(nextPlan);
		setPendingReplacement(null);
		setSelectedWorkoutId(nextPlan.workouts[0]?.id || "");
		setSelectedExerciseId(
			nextPlan.workouts[0]?.blocks[0]?.exercises[0]?.id || "",
		);
	}

	function updateStartWeek(startDate: string) {
		const nextPlan = adjustStartDate(plan, data, catalog, startDate);
		setUndoPlan({ plan, label: "Changed starting week" });
		setPlan(nextPlan);
		setPendingReplacement(null);
		setSelectedWorkoutId(nextPlan.workouts[0]?.id || "");
		setSelectedExerciseId(
			nextPlan.workouts[0]?.blocks[0]?.exercises[0]?.id || "",
		);
	}

	function updateSet(
		workoutId: string,
		exercise: PlannedExercise,
		setId: string,
		field: "weight_kg" | "reps",
		value: string,
	) {
		const numeric = field === "reps" ? parseInt(value, 10) : parseFloat(value);
		if (Number.isNaN(numeric)) return;
		const existing = exercise.sets.find((set) => set.id === setId);
		if (existing?.[field] === numeric) return;
		setUndoPlan({ plan, label: "Edited set" });
		setPlan((current) =>
			updatePlannedSet(current, workoutId, exercise.id, setId, {
				[field]: numeric,
			}),
		);
	}

	function stageReplacement(replacement: CatalogExercise) {
		setPendingReplacement(replacement);
	}

	function applyReplacement() {
		if (!selectedWorkout || !selectedExercise || !pendingReplacement) return;
		setUndoPlan({ plan, label: "Replaced exercise" });
		setPlan((current) =>
			replaceExercise(
				current,
				selectedWorkout.id,
				selectedExercise.id,
				pendingReplacement,
			),
		);
		toast.success(`Replaced with ${pendingReplacement.title}`);
		setPendingReplacement(null);
	}

	function undoLastChange() {
		if (!undoPlan) return;
		setPlan(undoPlan.plan);
		setUndoPlan(null);
		setPendingReplacement(null);
		toast.success("Restored previous plan");
	}

	function addSession() {
		setUndoPlan({ plan, label: "Added session" });
		setPlan((current) => addWorkout(current));
	}

	async function publishWorkout(workout: PlannedWorkout) {
		if (!teamId && teams.length > 0) {
			toast.error("Select a team before publishing");
			return;
		}
		setPlan((current) => setWorkoutStatus(current, workout.id, "publishing"));
		try {
			const template = await createWorkoutTemplate(sessionToken, workout);
			const result = await publishProgramWorkout(
				sessionToken,
				workout,
				{ teamId, athleteId },
				template.id || template.workout_id,
			);
			setPlan((current) =>
				setWorkoutStatus(current, workout.id, "published", {
					publishedId: result.programWorkoutId || result.workoutId,
				}),
			);
			toast.success(`${workout.title} published`);
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Unable to publish workout";
			setPlan((current) =>
				setWorkoutStatus(current, workout.id, "error", { error: message }),
			);
			toast.error(message);
		}
	}

	async function publishAll() {
		setPublishingAll(true);
		try {
			for (const workout of plan.workouts) {
				if (workout.status !== "published") await publishWorkout(workout);
			}
		} finally {
			setPublishingAll(false);
		}
	}

	return (
		<div className="planner-shell overflow-hidden rounded-[2rem] border border-zinc-900/10 bg-[#f4f1ea] shadow-2xl shadow-zinc-900/10">
			<div className="grid min-h-[calc(100vh-12rem)] grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_340px]">
				<aside className="border-zinc-900/10 border-b bg-zinc-950 text-stone-100 lg:border-r lg:border-b-0">
					<div className="p-5">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-[0.65rem] font-bold tracking-[0.22em] text-amber-300 uppercase">
									Planner
								</p>
								<h2 className="mt-1 text-2xl font-black tracking-tight">
									Next block
								</h2>
							</div>
							<Button
								size="icon-sm"
								variant="secondary"
								className="bg-stone-100 text-zinc-950 hover:bg-amber-200"
								onClick={regenerate}
								title="Regenerate plan"
							>
								<RefreshCw />
							</Button>
						</div>
						<div className="mt-5 grid grid-cols-3 gap-2">
							<Metric label="Weeks" value={plan.settings.weeks} />
							<Metric label="Days" value={plan.workouts.length} />
							<Metric label="Sets" value={totalSets} />
						</div>
					</div>

					<div className="border-stone-100/10 border-t p-5">
						<Label className="text-[0.65rem] font-bold tracking-[0.18em] text-stone-400 uppercase">
							Starting week
						</Label>
						<Input
							type="week"
							value={toWeekInputValue(plan.settings.startDate)}
							onChange={(event) =>
								updateStartWeek(weekInputToDate(event.target.value))
							}
							className="mt-3 h-10 rounded-lg border-stone-100/20 bg-stone-100/10 text-stone-100"
						/>
						<p className="mt-3 text-xs text-stone-400">
							Pick the week the block should begin. Workout dates are generated
							from your selected training days.
						</p>
					</div>

					<div className="border-stone-100/10 border-t p-5">
						<p className="text-[0.65rem] font-bold tracking-[0.18em] text-stone-400 uppercase">
							Weekly days
						</p>
						<div className="mt-3 grid grid-cols-4 gap-2">
							{WEEK_DAYS.map((day) => {
								const active = plan.settings.trainingDays.includes(day.value);
								return (
									<button
										key={day.value}
										type="button"
										onClick={() => toggleTrainingDay(day.value)}
										className={cn(
											"rounded-lg border px-2 py-2 text-xs font-black transition",
											active
												? "border-amber-300 bg-amber-300 text-zinc-950"
												: "border-stone-100/10 bg-stone-100/5 text-stone-300 hover:bg-stone-100/10",
										)}
									>
										{day.label}
									</button>
								);
							})}
						</div>
						<p className="mt-3 text-xs text-stone-400">
							Default is 4 days. Adjust days anytime and regenerate the same
							powerlifting skeleton.
						</p>
					</div>

					<div className="border-stone-100/10 border-y p-5">
						<div className="grid gap-3">
							<LiftMax label="Squat Max" value={plan.trainingMaxes.squat} />
							<LiftMax label="Bench Max" value={plan.trainingMaxes.bench} />
							<LiftMax
								label="Deadlift Max"
								value={plan.trainingMaxes.deadlift}
							/>
						</div>
					</div>

					<ScrollArea className="h-[38rem]">
						<div className="space-y-2 p-3">
							{plan.workouts.map((workout) => {
								const volume = summarizeVolume(workout);
								return (
									<button
										key={workout.id}
										type="button"
										onClick={() => {
											setSelectedWorkoutId(workout.id);
											setSelectedExerciseId(
												workout.blocks[0]?.exercises[0]?.id || "",
											);
											setPendingReplacement(null);
										}}
										className={cn(
											"w-full rounded-xl border p-3 text-left transition",
											selectedWorkout?.id === workout.id
												? "border-amber-300 bg-amber-300 text-zinc-950"
												: "border-stone-100/10 bg-stone-100/5 hover:bg-stone-100/10",
										)}
									>
										<div className="flex items-center justify-between gap-2">
											<span className="text-xs font-bold uppercase tracking-wide">
												W{workout.week} / D{workout.dayIndex + 1}
											</span>
											<StatusIcon status={workout.status} />
										</div>
										<p className="mt-2 line-clamp-2 text-sm font-semibold">
											{workout.title}
										</p>
										<div className="mt-3 flex items-center justify-between text-xs opacity-80">
											<span>{formatDate(workout.date)}</span>
											<span>{volume.sets} sets</span>
										</div>
									</button>
								);
							})}
						</div>
					</ScrollArea>
					<div className="border-stone-100/10 border-t p-3">
						<Button
							className="w-full bg-stone-100 text-zinc-950 hover:bg-amber-200"
							onClick={addSession}
						>
							<Plus />
							Add Session
						</Button>
					</div>
				</aside>

				<section className="min-w-0 bg-[#f8f6ef]">
					{selectedWorkout ? (
						<WorkoutEditor
							workout={selectedWorkout}
							selectedExerciseId={selectedExerciseId}
							onSelectExercise={setSelectedExerciseId}
							onSetChange={updateSet}
							onPublish={publishWorkout}
						/>
					) : null}
				</section>

				<aside className="border-zinc-900/10 border-t bg-stone-50 lg:border-t-0 lg:border-l">
					<div className="border-zinc-900/10 border-b p-4">
						<div className="flex items-center justify-between gap-3">
							<div>
								<p className="text-xs font-bold tracking-[0.18em] text-zinc-500 uppercase">
									Catalog
								</p>
								<h3 className="text-lg font-black text-zinc-950">
									{catalog.length} exercises
								</h3>
							</div>
							<Button
								size="icon-sm"
								variant="outline"
								onClick={onRefreshCatalog}
								disabled={catalogLoading}
								title="Refresh catalog"
							>
								{catalogLoading ? (
									<Loader2 className="animate-spin" />
								) : (
									<Library />
								)}
							</Button>
						</div>
						<div className="mt-4 grid gap-2">
							<div className="relative">
								<Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
								<Input
									value={query}
									onChange={(event) => setQuery(event.target.value)}
									placeholder="Search exercises"
									className="h-10 rounded-lg border-zinc-300 bg-white pl-9"
								/>
							</div>
							<select
								value={familyFilter}
								onChange={(event) => setFamilyFilter(event.target.value)}
								className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm"
							>
								<option value="all">All movement families</option>
								{families.map((family) => (
									<option key={family} value={family}>
										{family}
									</option>
								))}
							</select>
						</div>
					</div>

					<ScrollArea className="h-[28rem]">
						<div className="space-y-2 p-3">
							{filteredCatalog.map((exercise) => (
								<button
									key={exercise.id}
									type="button"
									onClick={() => stageReplacement(exercise)}
									className={cn(
										"w-full rounded-xl border bg-white p-3 text-left shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50",
										pendingReplacement?.id === exercise.id
											? "border-emerald-500 ring-4 ring-emerald-100"
											: "border-zinc-200",
									)}
								>
									<div className="flex items-start justify-between gap-3">
										<p className="text-sm font-semibold text-zinc-900">
											{exercise.title}
										</p>
										<ChevronsUpDown className="size-4 text-zinc-400" />
									</div>
									{exercise.use_count ? (
										<p className="mt-2 text-xs text-zinc-500">
											Used in your catalog
										</p>
									) : null}
								</button>
							))}
							{filteredCatalog.length === 0 && (
								<div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
									No catalog matches
								</div>
							)}
						</div>
					</ScrollArea>

					<div className="border-zinc-900/10 border-t p-4">
						<div className="grid gap-3">
							<div className="rounded-xl border border-zinc-200 bg-white p-3">
								<p className="text-xs font-bold tracking-[0.16em] text-zinc-500 uppercase">
									Plan edits
								</p>
								<p className="mt-2 text-sm font-semibold text-zinc-950">
									{pendingReplacement
										? pendingReplacement.title
										: "Choose a catalog exercise to preview"}
								</p>
								<p className="mt-1 text-xs text-zinc-500">
									{pendingReplacement
										? "Ready to replace the selected exercise."
										: undoPlan
											? `Last change: ${undoPlan.label}`
											: "Catalog choices wait for Apply before changing the workout."}
								</p>
								<div className="mt-3 grid grid-cols-2 gap-2">
									<Button
										variant="outline"
										disabled={!undoPlan}
										onClick={undoLastChange}
									>
										Undo last
									</Button>
									<Button
										className="bg-emerald-600 hover:bg-emerald-700"
										disabled={!pendingReplacement}
										onClick={applyReplacement}
									>
										Apply
									</Button>
								</div>
							</div>
							<div className="grid gap-1.5">
								<Label className="text-xs text-zinc-500">Team</Label>
								<select
									value={teamId || ""}
									onChange={(event) =>
										setTeamId(
											event.target.value
												? Number(event.target.value)
												: undefined,
										)
									}
									className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm"
								>
									<option value="">No team selected</option>
									{teams.map((team) => (
										<option key={team.id} value={team.id}>
											{team.title}
										</option>
									))}
								</select>
							</div>
							<div className="grid gap-1.5">
								<Label className="text-xs text-zinc-500">Athlete</Label>
								<select
									value={athleteId || ""}
									onChange={(event) =>
										setAthleteId(
											event.target.value
												? Number(event.target.value)
												: undefined,
										)
									}
									className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm"
								>
									<option value="">Current account / team</option>
									{athletes.map((athlete) => (
										<option key={athlete.id} value={athlete.id}>
											{athlete.fullName}
										</option>
									))}
								</select>
							</div>
							<Button
								className="bg-emerald-600 hover:bg-emerald-700"
								onClick={publishAll}
								disabled={publishingAll}
							>
								{publishingAll ? (
									<Loader2 className="animate-spin" />
								) : (
									<Send />
								)}
								Publish Plan
							</Button>
							<p className="text-xs text-zinc-500">
								{teams.length > 0
									? "Coach programming access detected."
									: "Publishing requires coach programming access."}
							</p>
						</div>
					</div>
				</aside>
			</div>

			<div className="grid gap-3 border-zinc-900/10 border-t bg-zinc-950 p-4 text-stone-100 md:grid-cols-4">
				<Insight
					icon={Activity}
					label="History"
					value={`${data.workouts.length} workouts`}
				/>
				<Insight
					icon={Dumbbell}
					label="Frequent lifts"
					value={`${exercises.length} tracked`}
				/>
				<Insight icon={Target} label="Plan source" value={plan.catalogSource} />
				<Insight
					icon={Clock3}
					label="Generated"
					value={formatDate(plan.createdAt.slice(0, 10))}
				/>
			</div>
		</div>
	);
}

function WorkoutEditor({
	workout,
	selectedExerciseId,
	onSelectExercise,
	onSetChange,
	onPublish,
}: {
	workout: PlannedWorkout;
	selectedExerciseId: string;
	onSelectExercise: (id: string) => void;
	onSetChange: (
		workoutId: string,
		exercise: PlannedExercise,
		setId: string,
		field: "weight_kg" | "reps",
		value: string,
	) => void;
	onPublish: (workout: PlannedWorkout) => Promise<void>;
}) {
	const volume = summarizeVolume(workout);
	return (
		<div className="flex h-full min-h-[44rem] flex-col">
			<div className="border-zinc-900/10 border-b p-5">
				<div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
					<div>
						<div className="flex flex-wrap items-center gap-2">
							<Badge className="rounded-md bg-zinc-950 text-stone-100">
								Week {workout.week}
							</Badge>
							<Badge
								variant="outline"
								className="rounded-md border-amber-300 bg-amber-100 text-amber-900"
							>
								{workout.focus}
							</Badge>
						</div>
						<h2 className="mt-3 max-w-3xl text-3xl font-black tracking-tight text-zinc-950">
							{workout.title}
						</h2>
					</div>
					<div className="flex flex-wrap items-end gap-3">
						<div className="grid gap-1">
							<Label className="text-xs text-zinc-500">Date</Label>
							<div className="flex h-10 w-40 items-center rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900">
								{formatDate(workout.date)}
							</div>
						</div>
						<div className="rounded-xl border border-zinc-200 bg-white px-4 py-2">
							<p className="text-xs font-semibold text-zinc-500">Budget</p>
							<p className="text-lg font-black text-zinc-950">
								{workout.timeCapMinutes} min
							</p>
						</div>
						<div className="rounded-xl border border-zinc-200 bg-white px-4 py-2">
							<p className="text-xs font-semibold text-zinc-500">Volume</p>
							<p className="text-lg font-black text-zinc-950">
								{Math.round(volume.volume).toLocaleString()} kg
							</p>
						</div>
						<Button
							className="bg-zinc-950 hover:bg-zinc-800"
							onClick={() => onPublish(workout)}
							disabled={workout.status === "publishing"}
						>
							{workout.status === "publishing" ? (
								<Loader2 className="animate-spin" />
							) : (
								<Send />
							)}
							Publish
						</Button>
					</div>
				</div>
			</div>

			<ScrollArea className="flex-1">
				<div className="grid gap-4 p-5">
					{workout.cutRule && (
						<div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
							<p className="font-black">Session rule</p>
							<p className="mt-1">{workout.cutRule}</p>
						</div>
					)}
					{workout.blocks.map((block) => (
						<div key={block.id}>
							<div className="mb-3 flex items-center gap-2">
								<SlidersHorizontal className="size-4 text-zinc-500" />
								<h3 className="font-black text-zinc-900">{block.title}</h3>
							</div>
							<div className="grid gap-3">
								{block.exercises.map((exercise) => (
									<div
										key={exercise.id}
										className={cn(
											"rounded-2xl border bg-white p-4 shadow-sm transition",
											selectedExerciseId === exercise.id
												? "border-emerald-500 ring-4 ring-emerald-100"
												: "border-zinc-200",
										)}
									>
										<button
											type="button"
											onClick={() => onSelectExercise(exercise.id)}
											className="flex w-full items-start justify-between gap-4 text-left"
										>
											<div>
												<div className="flex flex-wrap items-center gap-2">
													<p className="font-black text-zinc-950">
														{exercise.title}
													</p>
													<Badge
														className={cn(
															"rounded-md text-[0.65rem]",
															priorityClass(exercise.priority),
														)}
													>
														{exercise.priority}
													</Badge>
													<Badge
														variant="outline"
														className="rounded-md text-[0.65rem]"
													>
														{exercise.catalog_match}
													</Badge>
												</div>
												<p className="mt-1 text-xs text-zinc-500">
													{exercise.family} movement
												</p>
												{exercise.instruction && (
													<p className="mt-2 max-w-3xl text-xs leading-5 text-zinc-600">
														{exercise.instruction}
													</p>
												)}
											</div>
											<Badge className="rounded-md bg-zinc-100 text-zinc-700">
												{exercise.sets.length} sets
											</Badge>
										</button>

										<div className="mt-4 overflow-x-auto">
											<div className="grid min-w-[28rem] grid-cols-[70px_repeat(3,minmax(0,1fr))] gap-2 text-xs font-semibold text-zinc-500">
												<span>Set</span>
												<span>Weight</span>
												<span>Reps</span>
												<span>RPE</span>
											</div>
											<div className="mt-2 grid gap-2">
												{exercise.sets.map((set) => (
													<div
														key={set.id}
														className="grid min-w-[28rem] grid-cols-[70px_repeat(3,minmax(0,1fr))] items-center gap-2"
													>
														<span className="text-sm font-bold text-zinc-900">
															#{set.set_number}
														</span>
														<Input
															type="number"
															step="2.5"
															value={set.weight_kg ?? ""}
															onChange={(event) =>
																onSetChange(
																	workout.id,
																	exercise,
																	set.id,
																	"weight_kg",
																	event.target.value,
																)
															}
															className="h-9 rounded-lg"
														/>
														<Input
															type="number"
															value={set.reps}
															onChange={(event) =>
																onSetChange(
																	workout.id,
																	exercise,
																	set.id,
																	"reps",
																	event.target.value,
																)
															}
															className="h-9 rounded-lg"
														/>
														<span className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-700">
															{set.rpe?.toFixed(1) || "-"}
														</span>
													</div>
												))}
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					))}
				</div>
			</ScrollArea>
		</div>
	);
}

function Metric({ label, value }: { label: string; value: number }) {
	return (
		<div className="rounded-xl border border-stone-100/10 bg-stone-100/5 p-3">
			<p className="text-[0.65rem] font-bold tracking-wide text-stone-400 uppercase">
				{label}
			</p>
			<p className="mt-1 text-xl font-black">{value}</p>
		</div>
	);
}

function LiftMax({ label, value }: { label: string; value?: number }) {
	return (
		<div className="flex items-center justify-between rounded-xl bg-stone-100/5 px-3 py-2">
			<span className="text-sm text-stone-300">{label}</span>
			<span className="font-black text-amber-300">{value || "-"} kg</span>
		</div>
	);
}

function priorityClass(priority: PlannedExercise["priority"]): string {
	if (priority === "main") return "bg-zinc-950 text-stone-100";
	if (priority === "secondary") return "bg-emerald-100 text-emerald-800";
	if (priority === "pair") return "bg-sky-100 text-sky-800";
	return "bg-zinc-100 text-zinc-700";
}

function Insight({
	icon: Icon,
	label,
	value,
}: {
	icon: typeof Activity;
	label: string;
	value: string;
}) {
	return (
		<div className="flex items-center gap-3 rounded-xl border border-stone-100/10 bg-stone-100/5 p-3">
			<Icon className="size-4 text-amber-300" />
			<div>
				<p className="text-[0.65rem] font-bold uppercase tracking-wide text-stone-400">
					{label}
				</p>
				<p className="text-sm font-semibold">{value}</p>
			</div>
		</div>
	);
}

function StatusIcon({ status }: { status: PlannedWorkout["status"] }) {
	if (status === "published") return <CheckCircle2 className="size-4" />;
	if (status === "error") return <XCircle className="size-4" />;
	if (status === "publishing")
		return <Loader2 className="size-4 animate-spin" />;
	return <CalendarDays className="size-4" />;
}

function formatDate(dateStr: string): string {
	const date = new Date(`${dateStr}T00:00:00`);
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
}

function toWeekInputValue(dateStr: string): string {
	const date = new Date(`${dateStr}T00:00:00`);
	if (Number.isNaN(date.getTime())) return "";
	const thursday = new Date(date);
	const day = thursday.getDay() || 7;
	thursday.setDate(thursday.getDate() + 4 - day);
	const yearStart = new Date(thursday.getFullYear(), 0, 1);
	const week = Math.ceil(
		((thursday.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
	);
	return `${thursday.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function weekInputToDate(weekValue: string): string {
	const [yearText, weekText] = weekValue.split("-W");
	const year = Number(yearText);
	const week = Number(weekText);
	if (!year || !week) return new Date().toISOString().slice(0, 10);

	const jan4 = new Date(year, 0, 4);
	const jan4Day = jan4.getDay() || 7;
	const monday = new Date(jan4);
	monday.setDate(jan4.getDate() - jan4Day + 1 + (week - 1) * 7);
	return [
		monday.getFullYear(),
		String(monday.getMonth() + 1).padStart(2, "0"),
		String(monday.getDate()).padStart(2, "0"),
	].join("-");
}
