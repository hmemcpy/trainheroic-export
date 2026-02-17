"use client";

import { Loader2 } from "lucide-react";

interface LoadingScreenProps {
	message: string;
}

export function LoadingScreen({ message }: LoadingScreenProps) {
	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-blue-100">
			<div className="text-center space-y-4">
				<Loader2 className="w-10 h-10 text-sky-600 animate-spin mx-auto" />
				<p className="text-lg text-slate-600 font-medium">{message}</p>
				<p className="text-sm text-slate-400">This may take a moment...</p>
			</div>
		</div>
	);
}
