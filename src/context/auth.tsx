// src/context/auth.tsx
import { createContext, useContext, useEffect, useState } from 'react';

type User = { sub: any; username: string };
type AuthContextType = {
	user: User | null;
	loading: boolean;
	login: (username: string, password: string) => Promise<boolean>;
	logout: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType>({
	user: null,
	loading: true,
	login: async () => false,
	logout: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchProfile = async () => {
			try {
				const res = await fetch('http://localhost:3000/auth/profile', { credentials: 'include' });
				if (res.ok) {
					const data = await res.json();
					console.log("data was: ", data);
					setUser(data);
				} else {
					console.log("profile was not fetched")
					setUser(null);
				}
			} finally {
				setLoading(false);
			}
		};
		fetchProfile();
	}, []);

	const login = async (username: string, password: string) => {
		setLoading(true);
		try {
			const res = await fetch('http://localhost:3000/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password }),
				credentials: 'include',
			});
			if (!res.ok) return false;

			// Fetch profile after successful login
			const profileRes = await fetch('http://localhost:3000/auth/profile', { credentials: 'include' });
			if (profileRes.ok) {
				const data = await profileRes.json();
				setUser(data);
			} else {
				console.log("bad response: ", profileRes.json())
				setUser(null);
			}
			return true;
		} finally {
			setLoading(false);
		}
	}

	const logout = async () => {
		setLoading(true);
		await fetch('http://localhost:3000/auth/logout', { method: 'POST', credentials: 'include' });
		setUser(null);
		setLoading(false);
	};

	return (
		<AuthContext.Provider value={{ user, loading, login, logout }}>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => useContext(AuthContext);
