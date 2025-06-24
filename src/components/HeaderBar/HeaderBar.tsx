// import { CircleUserRound } from "lucide-react";
// import { NavLink } from "react-router";

const HeaderBar = () => {
	return (
		<header data-testid="headerbar" className="w-full h-[64px] bg-purple-200 flex justify-between items-center p-4 border-b-2 border-slate-300">
			<div className="flex-1">
				LOGO
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
					Sign In / Sign Up
				</div>
		</header>
	)
}

export default HeaderBar;