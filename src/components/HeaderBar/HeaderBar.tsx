import { useAuth } from "@/context/auth";
import { useNavigate } from "react-router";

const HeaderBar = () => {
	const { logout } = useAuth();
	const navigate = useNavigate();

	const handleLogout = async () => {
		if (logout) {
			await logout();
			navigate("/"); // SPA redirect
		}
	};

	return (
		<header
			data-testid="headerbar"
			className="w-full h-16 bg-purple-200 flex justify-between items-center p-4 border-b-2 border-slate-300"
		>
			<div className="flex items-center gap-2 flex-1 cursor-pointer" onClick={() => navigate("/")}>
				<img src="/coookies.png" alt="Bakedown logo" className="h-8 w-8" />
				<span className="text-xl font-bold text-blue-900">Bakedown</span>
			</div>

			<div className="flex-1 flex justify-end">
				<button
					type="button"
					onClick={handleLogout}
					className="text-blue-800 hover:text-blue-600 font-medium px-4 py-2 rounded transition"
					aria-label="Log out"
				>
					Log out
				</button>
			</div>
		</header>
	);
};

export default HeaderBar;
