import type { ExerciseWithHistory, ExportData } from "./types";

export function downloadJson(data: ExportData) {
	const json = JSON.stringify(data, null, 2);
	const blob = new Blob([json], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `trainheroic-export-${new Date().toISOString().slice(0, 10)}.json`;
	a.click();
	URL.revokeObjectURL(url);
}

function escapeCSV(val: string | number | boolean | undefined | null): string {
	if (val === undefined || val === null) return "";
	const s = String(val);
	if (s.includes(",") || s.includes('"') || s.includes("\n")) {
		return `"${s.replace(/"/g, '""')}"`;
	}
	return s;
}

export function generateCSV(exercises: ExerciseWithHistory[]): string {
	const headers = [
		"Exercise",
		"Date",
		"Workout",
		"Set #",
		"Prescribed Reps",
		"Prescribed Weight (kg)",
		"Prescribed Duration (s)",
		"Actual Reps",
		"Actual Weight (kg)",
		"Actual Duration (s)",
		"Completed",
	];

	const rows: string[][] = [headers];

	for (const ex of exercises) {
		for (const h of ex.history) {
			for (const s of h.sets) {
				rows.push([
					escapeCSV(ex.title),
					escapeCSV(h.date),
					escapeCSV(h.workout_title),
					escapeCSV(s.set_number),
					escapeCSV(s.prescribed?.reps),
					escapeCSV(s.prescribed?.weight_kg),
					escapeCSV(s.prescribed?.duration_seconds),
					escapeCSV(s.actual?.reps),
					escapeCSV(s.actual?.weight_kg),
					escapeCSV(s.actual?.duration_seconds),
					escapeCSV(s.completed),
				]);
			}
		}
	}

	return rows.map((row) => row.join(",")).join("\n");
}

export function downloadCSV(exercises: ExerciseWithHistory[]) {
	const csv = generateCSV(exercises);
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `trainheroic-export-${new Date().toISOString().slice(0, 10)}.csv`;
	a.click();
	URL.revokeObjectURL(url);
}
