// Main App Rendering
// routes are listed here using both
// AuthProvider to check login and get profile
// ProtectedRout to enforce access to authorized users
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import './index.css'
import App from './App.tsx'
import LoginPage from './app/login/page.tsx';
import DashboardPage from './app/business/page.tsx';
import { ProtectedRoute } from '@/components/ProtectedRoute/ProtectedRoute.tsx';
import { AuthProvider } from '@/context/auth';
import BusinessLayout from './app/business/layout.tsx';
import ItemsPage from './app/business/items/page.tsx';
import InventoryPage from './app/business/inventory/page.tsx';

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<BrowserRouter>
			<AuthProvider>
				<Routes>
					<Route path="/login" element={<LoginPage />} />
					<Route path="/" element={<App />} />
					{/* TODO path should be :business-slug */}
					<Route element={
						<ProtectedRoute>
							<BusinessLayout />
						</ProtectedRoute>
					} path='/business'>
						<Route index element={<Navigate to="dashboard" />} />
						<Route path="dashboard" element={<DashboardPage />} />
						<Route path="items" element={<ItemsPage />} />
						<Route path="inventory" element={<InventoryPage />} />
					</Route>
				</Routes>
			</AuthProvider>
		</BrowserRouter>
	</StrictMode>,
)

// index in a route indicates it renders into its parent as default child route
// index routes can't have children, use a layout route instead

// basic example
{/* <Routes>
  <Route index element={<Home />} />
  <Route path="about" element={<About />} />

  <Route element={<AuthLayout />}>
    <Route path="login" element={<Login />} />
    <Route path="register" element={<Register />} />
  </Route>

  <Route path="concerts">
    <Route index element={<ConcertsHome />} />
    <Route path=":city" element={<City />} />
    <Route path="trending" element={<Trending />} />
  </Route>
</Routes> */}

// using layouts
{/* <Routes>
  <Route element={<MarketingLayout />}>
    <Route index element={<MarketingHome />} />
    <Route path="contact" element={<Contact />} />
  </Route>

  <Route path="projects">
    <Route index element={<ProjectsHome />} />
    <Route element={<ProjectsLayout />}>
      <Route path=":pid" element={<Project />} />
      <Route path=":pid/edit" element={<EditProject />} />
    </Route>
  </Route>
</Routes> */}

// dynamic segments, provided as `params` 
{/* <Route path="teams/:teamId" element={<Team />} /> */ }

// import { useParams } from "react-router";

// export default function CategoryProduct() {
//   let { categoryId, productId } = useParams();
//   // ...
// }

