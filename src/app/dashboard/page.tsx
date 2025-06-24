import { Card } from '../../components/ui/card';
import { useAuth } from "../../context/auth"; 


export default function DashboardPage() {
	  const { user, loading } = useAuth();
		  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Not authenticated</div>;
	return (
		<div>
			<h1>Hi, {user.username}</h1>
			<Card className='w-[500px] h-[200px] m-4 p-4'>
				<h1 className='font-bold text-blue-800'>Inventory</h1>
			</Card>
			<Card className='w-[500px] h-[200px] m-4 p-4'>
				<h1 className='font-bold text-blue-800'>Inventory</h1>
			</Card>
			<Card className='w-[500px] h-[200px] m-4 p-4'>
				<h1 className='font-bold text-blue-800'>Inventory</h1>
			</Card>
		</div>
	)
}