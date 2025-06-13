
import './App.css'
import { Card } from './components/ui/card'
import { ThemeProvider } from "@/components/theme-provider"

function App() {

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
		<Card>
      <h1 className='font-bold text-blue-800'>Bakeshop</h1>
			</Card>
    </ThemeProvider>
  )
}

export default App
