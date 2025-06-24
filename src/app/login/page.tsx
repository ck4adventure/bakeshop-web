import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import React, { useState, useEffect } from "react";

import { useNavigate } from "react-router";
import { useAuth } from "@/context/auth";

export default function LoginPage() {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const { login, loading, user } = useAuth();

	if (loading) return <div>Loading...</div>;
	const navigate = useNavigate();

	useEffect(() => {
		if (user) {
			navigate("/dashboard");
		}
	}, [user, navigate]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		const success = await login(username, password);
		if (success) {
			navigate("/dashboard");
		} else {
			setError("Invalid email or password");
		}
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50">
			<form
				onSubmit={handleSubmit}
				className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md"
			>
				<h2 className="mb-6 text-center text-2xl font-bold">Login</h2>
				{error && (
					<div className="mb-4 rounded bg-red-100 px-3 py-2 text-red-700">
						{error}
					</div>
				)}
				<div className="mb-4">
					<Label htmlFor="username">Username</Label>
					<Input
						id="username"
						type="username"
						placeholder="baker"
						value={username}
						onChange={e => setUsername(e.target.value)}
						required
						className="mt-1"
					/>
				</div>
				<div className="mb-6">
					<Label htmlFor="password">Password</Label>
					<Input
						id="password"
						type="password"
						placeholder="Your password"
						value={password}
						onChange={e => setPassword(e.target.value)}
						required
						className="mt-1"
					/>
				</div>
				<Button type="submit" className="w-full">
					Sign In
				</Button>
			</form>
		</div>
	);
}