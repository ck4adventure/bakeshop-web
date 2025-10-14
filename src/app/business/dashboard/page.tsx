// Dashboard Page is the main landing for each business
// it will evtl have things like the "daily order", "inventory", and "batches"

// import { useAuth } from "../../../context/auth"; 


export default function DashboardPage() {
	//   const { user, loading } = useAuth();
	// 	  if (loading) return <div>Loading...</div>;
  // if (!user) return <div>Not authenticated</div>;
	return (
		<div className='flex flex-wrap items-center p-16'>
			<div id="dashboard-card" className='m-8 p-8 border rounded min-h-[80px] min-w-[200px] flex justify-center'>
				<div className='font-bold'>Inventory</div>
			</div>
			<div id="dashboard-card" className='m-8 p-8 border rounded min-h-[80px] min-w-[200px] flex justify-center'>
				<div className='font-bold'>Daily Bakes</div>
			</div>
			<div id="dashboard-card" className='m-8 p-8 border rounded min-h-[80px] min-w-[200px] flex justify-center'>
				<div className='font-bold'>Batches</div>
			</div>
			<div id="dashboard-card" className='m-8 p-8 border rounded min-h-[80px] min-w-[200px] flex justify-center'>
				<div className='font-bold'>Log</div>
			</div>
		</div>
	)
}