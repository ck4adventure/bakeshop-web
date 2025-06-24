import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import React, { useState } from "react";
import { useNavigate } from "react-router"

export default function LoginPage() {
	// const [email, setEmail] = useState("");
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const navigate = useNavigate();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		// Handle login logic here
		try {
			const res = await fetch("http://localhost:3000/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ username, password }),
			});

			if (!res.ok) {
				const data = await res.json();
				setError(data.message || "Login failed");
				return;
			}
			navigate("/");

		} catch (err) {
			console.log(err);
			setError("check console for err")
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