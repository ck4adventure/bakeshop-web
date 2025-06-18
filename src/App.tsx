
import './App.css'
import { Card } from './components/ui/card'
import HeaderBar from './components/HeaderBar/HeaderBar'

function App() {

	return (
		<div className='flex flex-col justify-center items-center m-0'>
			<HeaderBar />
			<main className='flex flex-wrap'>
				<Card className='w-[500px] h-[200px] m-8 p-4'>
					<h1 className='font-bold text-blue-800'>Inventory</h1>
				</Card>
				<Card className='w-[500px] h-[200px] m-8 p-4'>
					<h1 className='font-bold text-blue-800'>Inventory</h1>
				</Card>
				<Card className='w-[500px] h-[200px] m-8 p-4'>
					<h1 className='font-bold text-blue-800'>Inventory</h1>
				</Card>
			</main>
		</div>
	)
}

export default App
