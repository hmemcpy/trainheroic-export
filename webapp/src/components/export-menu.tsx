"use client";

import { Download, FileDown, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadCSV, downloadJson } from "@/lib/export";
import type { ExerciseWithHistory, ExportData } from "@/lib/types";

interface ExportMenuProps {
	exportData: ExportData;
	exercises: ExerciseWithHistory[];
}

export function ExportMenu({ exportData, exercises }: ExportMenuProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button className="bg-sky-600 hover:bg-sky-700 cursor-pointer shadow-sm">
					<Download className="mr-2 h-4 w-4" />
					Download My Data
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuItem
					onClick={() => downloadCSV(exercises)}
					className="cursor-pointer py-2.5"
				>
					<Table2 className="mr-2.5 h-4 w-4 text-green-600" />
					<div>
						<p className="font-medium">Spreadsheet</p>
						<p className="text-xs text-slate-500">
							CSV for Excel, Numbers, or Google Sheets
						</p>
					</div>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={() => downloadJson(exportData)}
					className="cursor-pointer py-2.5"
				>
					<FileDown className="mr-2.5 h-4 w-4 text-sky-600" />
					<div>
						<p className="font-medium">Full Backup</p>
						<p className="text-xs text-slate-500">Complete data file</p>
					</div>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
