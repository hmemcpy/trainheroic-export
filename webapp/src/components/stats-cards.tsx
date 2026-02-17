"use client";

import { CalendarDays, Dumbbell, Hash, Weight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ProfileStats } from "@/lib/types";

interface StatsCardsProps {
	stats: ProfileStats;
	workoutCount: number;
	exerciseCount: number;
}

export function StatsCards({
	stats,
	workoutCount,
	exerciseCount,
}: StatsCardsProps) {
	const cards = [
		{
			label: "Workouts",
			value: workoutCount,
			icon: CalendarDays,
			color: "text-sky-600",
			bg: "bg-sky-50",
		},
		{
			label: "Exercises",
			value: exerciseCount,
			icon: Dumbbell,
			color: "text-blue-600",
			bg: "bg-blue-50",
		},
		{
			label: "Total Reps",
			value:
				stats.total_reps > 0
					? stats.total_reps.toLocaleString()
					: workoutCount > 0
						? "—"
						: "0",
			icon: Hash,
			color: "text-indigo-600",
			bg: "bg-indigo-50",
		},
		{
			label: "Volume (kg)",
			value:
				stats.total_volume_kg > 0
					? Math.round(stats.total_volume_kg).toLocaleString()
					: workoutCount > 0
						? "—"
						: "0",
			icon: Weight,
			color: "text-violet-600",
			bg: "bg-violet-50",
		},
	];

	return (
		<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
			{cards.map((card) => (
				<Card key={card.label} className="border-slate-200/80 shadow-sm">
					<CardContent className="pt-5 pb-4 px-5">
						<div className="flex items-center gap-3">
							<div className={`p-2.5 rounded-xl ${card.bg}`}>
								<card.icon className={`w-5 h-5 ${card.color}`} />
							</div>
							<div>
								<p className="text-2xl font-bold text-slate-800">
									{card.value}
								</p>
								<p className="text-xs text-slate-500 font-medium">
									{card.label}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
