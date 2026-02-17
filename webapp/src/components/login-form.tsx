"use client";

import { Dumbbell, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LoginFormProps {
	onLogin: (email: string, password: string) => Promise<void>;
}

export function LoginForm({ onLogin }: LoginFormProps) {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);
		try {
			await onLogin(email, password);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Login failed");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-blue-100">
			<Card className="w-full max-w-md shadow-xl border-sky-200/50">
				<CardHeader className="text-center space-y-2">
					<div className="mx-auto w-14 h-14 rounded-2xl bg-sky-600 flex items-center justify-center mb-2">
						<Dumbbell className="w-7 h-7 text-white" />
					</div>
					<CardTitle className="text-2xl font-bold text-slate-800">
						TrainHeroic Export
					</CardTitle>
					<p className="text-sm text-slate-500">
						Sign in to export your training data
					</p>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="email" className="text-slate-700">
								Email
							</Label>
							<Input
								id="email"
								type="email"
								placeholder="your@email.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								className="border-slate-300 focus-visible:ring-sky-500"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="password" className="text-slate-700">
								Password
							</Label>
							<Input
								id="password"
								type="password"
								placeholder="Your password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								className="border-slate-300 focus-visible:ring-sky-500"
							/>
						</div>
						{error && (
							<p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
								{error}
							</p>
						)}
						<Button
							type="submit"
							className="w-full bg-sky-600 hover:bg-sky-700 cursor-pointer"
							disabled={loading}
						>
							{loading ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Signing in...
								</>
							) : (
								"Sign In & Export"
							)}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
