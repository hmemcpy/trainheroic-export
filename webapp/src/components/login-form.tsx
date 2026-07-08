"use client";

import { Dumbbell, Loader2, LockKeyhole, Wand2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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
		<div className="min-h-screen bg-[#e8e3d8] px-4 py-8 text-zinc-950">
			<div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-zinc-900/10 bg-[#f8f6ef] shadow-2xl shadow-zinc-900/10 lg:grid-cols-[1.15fr_0.85fr]">
				<section className="relative flex flex-col justify-between bg-zinc-950 p-8 text-stone-100 sm:p-10">
					<div className="absolute inset-0 opacity-20 [background-image:linear-gradient(90deg,rgba(255,255,255,.15)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:44px_44px]" />
					<div className="relative">
						<div className="flex items-center gap-3">
							<div className="flex size-11 items-center justify-center rounded-xl bg-amber-300 text-zinc-950">
								<Dumbbell className="size-6" />
							</div>
							<div>
								<p className="text-xs font-bold tracking-[0.22em] text-amber-300 uppercase">
									TrainHeroic
								</p>
								<p className="font-black">Programming cockpit</p>
							</div>
						</div>
						<h1 className="mt-16 max-w-2xl text-5xl font-black tracking-tight sm:text-6xl">
							Turn logged work into the next block.
						</h1>
					</div>
					<div className="relative mt-10 grid gap-3 sm:grid-cols-3">
						<LoginMetric label="History" value="Fetch" />
						<LoginMetric label="Analysis" value="Auto" />
						<LoginMetric label="Output" value="Program" />
					</div>
				</section>

				<section className="flex items-center p-6 sm:p-10">
					<form
						onSubmit={handleSubmit}
						className="w-full rounded-2xl border border-zinc-900/10 bg-white p-6 shadow-sm"
					>
						<div className="mb-6 flex items-center justify-between">
							<div>
								<p className="text-xs font-bold tracking-[0.18em] text-zinc-500 uppercase">
									Sign in
								</p>
								<h2 className="mt-1 text-2xl font-black">
									Load history and catalog
								</h2>
							</div>
							<div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
								<Wand2 className="size-5" />
							</div>
						</div>
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
								className="h-11 rounded-lg border-zinc-300"
							/>
						</div>
						<div className="mt-4 space-y-2">
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
								className="h-11 rounded-lg border-zinc-300"
							/>
						</div>
						{error && (
							<p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
								{error}
							</p>
						)}
						<Button
							type="submit"
							className="mt-6 h-11 w-full cursor-pointer bg-zinc-950 hover:bg-zinc-800"
							disabled={loading}
						>
							{loading ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Loading training data...
								</>
							) : (
								<>
									<LockKeyhole className="mr-2 h-4 w-4" />
									Analyze Training
								</>
							)}
						</Button>
					</form>
				</section>
			</div>
		</div>
	);
}

function LoginMetric({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-xl border border-stone-100/10 bg-stone-100/5 p-4">
			<p className="text-[0.65rem] font-bold tracking-[0.18em] text-stone-400 uppercase">
				{label}
			</p>
			<p className="mt-2 text-xl font-black text-amber-300">{value}</p>
		</div>
	);
}
