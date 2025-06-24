
import './App.css'
import AppPage  from './app/marketing/page.tsx'
// import HeaderBar from './components/HeaderBar/HeaderBar'

function App() {

	return (
		<div className='flex flex-col justify-center items-center m-0'>
			{/* Header Bar */}
			<header className="w-full bg-white shadow flex items-center justify-between px-8 py-4">
				<div className="flex items-center gap-2">
					<img src="/1.png" alt="Logo" className="h-8 w-8" />
					<span className="text-xl font-bold text-blue-900">Bakedown</span>
				</div>
				<nav className="flex items-center gap-6">
					<a href="/features" className="text-blue-800 hover:text-blue-600 font-medium">Features</a>
					<a href="/about" className="text-blue-800 hover:text-blue-600 font-medium">About</a>
					<a href="/contact" className="text-blue-800 hover:text-blue-600 font-medium">Contact</a>
				</nav>
				<div>
					<a href="/login" className="ml-2 px-4 py-2 border border-blue-700 text-blue-700 rounded hover:bg-blue-50 transition font-semibold">Log In</a>
					<a href="/signup" className="ml-4 px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 transition font-semibold">Sign Up</a>
				</div>
			</header>

			<AppPage />

			{/* Basic Footer */}
			<footer className="w-full bg-white border-t mt-12 py-6 flex flex-col md:flex-row items-center justify-between px-8 text-blue-700 text-sm">
				<span>&copy; {new Date().getFullYear()} Bakedown. All rights reserved.</span>
				<div className="flex gap-4 mt-2 md:mt-0">
					<a href="#privacy" className="hover:underline">Privacy Policy</a>
					<a href="#terms" className="hover:underline">Terms of Service</a>
					<a href="#contact" className="hover:underline">Contact</a>
				</div>
			</footer>
		</div>
	)
}

export default App


