
import { Link } from 'react-router';
import { Card } from '../../../components/ui/card';
import { useEffect, useState } from "react";
// import { InventoryComponent } from '@/components/Inventory/InventoryComponent';
// import { useAuth } from "../../../context/auth"; 


export default function DashboardPage() {
	const [data, setData] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		const fetchData = async () => {
			try {
				const response = await fetch("http://localhost:3000/items");
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}
				const json = await response.json();
				setData(json);
			} catch (err: any) {
				setError(err.message);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, []);

	if (loading) return <div>Loading...</div>;
	if (error) return <div>Error: {error}</div>;
	return (
		<div className='m-16 flex flex-col items-center'>
			{/* <InventoryComponent items={data}/> */}
			<Card className='w-9/12 h-[200px] m-4 p-4'>
				<h1 className='font-bold text-blue-800'><Link to={"/business/inventory"}>Inventory</Link></h1>
			</Card>
			<Card className='w-9/12 h-[200px] m-4 p-4'>
				<h1 className='font-bold text-blue-800'>Today</h1>
			</Card>
			<Card className='w-9/12 h-[200px] m-4 p-4'>
				<h1 className='font-bold text-blue-800'>Batches</h1>
			</Card>
		</div>
	)
}