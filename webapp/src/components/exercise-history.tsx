"use client";

import {
	Calendar,
	ChevronDown,
	ChevronRight,
	ExternalLink,
	Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { ExerciseSet, ExerciseWithHistory } from "@/lib/types";

function formatDate(dateStr: string): string {
	const d = new Date(`${dateStr}T00:00:00`);
	return d.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function formatWeight(kg: number): string {
	return `${kg} kg`;
}

function SetPill({ set }: { set: ExerciseSet }) {
	const data = set.actual || set.prescribed;
	if (!data) return null;

	const parts: string[] = [];
	if (data.weight_kg) parts.push(formatWeight(data.weight_kg));
	if (data.reps) parts.push(`${data.reps} reps`);
	if (data.duration_seconds) {
		const min = Math.floor(data.duration_seconds / 60);
		const sec = data.duration_seconds % 60;
		parts.push(
			min > 0 ? `${min}:${sec.toString().padStart(2, "0")}` : `${sec}s`,
		);
	}

	return (
		<span
			className={`inline-block text-xs px-2 py-1 rounded-md mr-1.5 mb-1 ${
				set.completed
					? "bg-sky-50 text-sky-700 border border-sky-200"
					: "bg-slate-50 text-slate-400 border border-slate-200"
			}`}
		>
			{parts.join(" × ")}
		</span>
	);
}

function SessionRow({ date, sets }: { date: string; sets: ExerciseSet[] }) {
	return (
		<div className="flex items-start gap-3 py-2.5">
			<div className="flex items-center gap-1.5 text-slate-400 flex-shrink-0 pt-0.5">
				<Calendar className="w-3.5 h-3.5" />
				<span className="text-xs font-medium w-20">{formatDate(date)}</span>
			</div>
			<div className="flex flex-wrap">
				{sets.map((s) => (
					<SetPill key={s.set_number} set={s} />
				))}
			</div>
		</div>
	);
}

function ExerciseCard({ exercise }: { exercise: ExerciseWithHistory }) {
	const [expanded, setExpanded] = useState(false);

	const bestWeight = useMemo(() => {
		let max = 0;
		for (const h of exercise.history) {
			for (const s of h.sets) {
				const w = s.actual?.weight_kg || 0;
				if (w > max) max = w;
			}
		}
		return max;
	}, [exercise]);

	const bestReps = useMemo(() => {
		let max = 0;
		for (const h of exercise.history) {
			for (const s of h.sets) {
				const r = s.actual?.reps || 0;
				if (r > max) max = r;
			}
		}
		return max;
	}, [exercise]);

	return (
		<Card className="border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
			<div
				className="flex items-center justify-between px-5 py-4 cursor-pointer select-none"
				onClick={() => setExpanded(!expanded)}
			>
				<div className="flex items-center gap-3 min-w-0">
					<div className="text-slate-400">
						{expanded ? (
							<ChevronDown className="w-5 h-5" />
						) : (
							<ChevronRight className="w-5 h-5" />
						)}
					</div>
					<div className="min-w-0">
						<div className="flex items-center gap-2">
							<h3 className="font-semibold text-slate-800 truncate text-base">
								{exercise.title}
							</h3>
							{exercise.video_url && (
								<a
									href={exercise.video_url}
									target="_blank"
									rel="noopener noreferrer"
									onClick={(e) => e.stopPropagation()}
									className="text-sky-500 hover:text-sky-600 flex-shrink-0"
									title="Watch demo video"
								>
									<ExternalLink className="w-3.5 h-3.5" />
								</a>
							)}
						</div>
						<div className="flex items-center gap-3 mt-0.5">
							<span className="text-xs text-slate-500">
								{exercise.total_sessions} session
								{exercise.total_sessions !== 1 ? "s" : ""}
							</span>
							{bestWeight > 0 && (
								<>
									<span className="text-xs text-slate-300">·</span>
									<span className="text-xs text-slate-500">
										Best: {formatWeight(bestWeight)}
									</span>
								</>
							)}
							{bestWeight === 0 && bestReps > 0 && (
								<>
									<span className="text-xs text-slate-300">·</span>
									<span className="text-xs text-slate-500">
										Best: {bestReps} reps
									</span>
								</>
							)}
						</div>
					</div>
				</div>
				<div className="flex items-center gap-2 flex-shrink-0 ml-2">
					<Badge
						variant="secondary"
						className="bg-sky-50 text-sky-700 border-sky-200 text-xs"
					>
						Last: {formatDate(exercise.last_performed)}
					</Badge>
				</div>
			</div>

			{expanded && (
				<>
					<Separator className="mx-5" />
					<CardContent className="pt-2 pb-4 px-5">
						<ScrollArea
							className={exercise.history.length > 10 ? "h-96" : undefined}
						>
							<div className="divide-y divide-slate-100">
								{exercise.history.map((h, idx) => (
									<SessionRow key={idx} date={h.date} sets={h.sets} />
								))}
							</div>
						</ScrollArea>
					</CardContent>
				</>
			)}
		</Card>
	);
}

export function ExerciseHistory({ exercises }: ExerciseHistoryProps) {
	const [search, setSearch] = useState("");

	const filtered = useMemo(() => {
		if (!search.trim()) return exercises;
		const q = search.toLowerCase();
		return exercises.filter((ex) => ex.title.toLowerCase().includes(q));
	}, [exercises, search]);

	return (
		<div className="space-y-4">
			<div className="relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
				<Input
					placeholder="Find an exercise..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="pl-10 border-slate-300 focus-visible:ring-sky-500 h-11"
				/>
			</div>
			{search && (
				<p className="text-sm text-slate-500">
					{filtered.length} result{filtered.length !== 1 ? "s" : ""} for &ldquo;
					{search}&rdquo;
				</p>
			)}
			<div className="space-y-2">
				{filtered.map((ex) => (
					<ExerciseCard key={ex.exercise_id} exercise={ex} />
				))}
				{filtered.length === 0 && (
					<Card className="border-slate-200/80">
						<CardContent className="py-16 text-center">
							<p className="text-slate-500 text-lg">No exercises found</p>
							{search && (
								<p className="text-slate-400 text-sm mt-1">
									Try a different search term
								</p>
							)}
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}

interface ExerciseHistoryProps {
	exercises: ExerciseWithHistory[];
}
