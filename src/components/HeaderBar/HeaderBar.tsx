// import { CircleUserRound } from "lucide-react";
// import { NavLink } from "react-router";
import { useAuth } from "@/context/auth";


const HeaderBar = () => {
	const { logout } = useAuth();

	const handleLogout = async () => {
		await logout();
		// Optionally, redirect or refresh here if needed
		window.location.href = "/";
	};
	return (
		<header data-testid="headerbar" className="w-full h-[64px] bg-purple-200 flex justify-between items-center p-4 border-b-2 border-slate-300">
				<div className="flex items-center gap-2 flex-1">
					<img src="/coookies.png" alt="Logo" className="h-8 w-8" />
					<span className="text-xl font-bold text-blue-900">Bakedown</span>
				</div>
			<div className="text-slate-500 flex-1 text-center">
				BAKEDOWN
			</div>

			{/* <nav className="flex m-2 flex-1 space-x-2 justify-end">
					<NavLink to="/inventory" end className={""}>
						Inventory
					</NavLink>
					<NavLink to="/batches" end className={""}>
						Batches
					</NavLink>
					<NavLink to="/production" end className={""}>
						Production List
					</NavLink>
				</nav>
				<div className="m-2">
					<CircleUserRound />
				</div> */}
			<div className="flex-1 flex justify-end">
				<button
					onClick={handleLogout}
					className="text-blue-800 hover:text-blue-600 font-medium px-4 py-2 rounded transition"
				>
					Log out
				</button>
			</div>
		</header>
	)
}

export default HeaderBar;