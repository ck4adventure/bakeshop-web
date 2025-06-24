import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router';
import './index.css'
import App from './App.tsx'
import LoginPage from './app/login/page.tsx';
import DashboardPage from './app/business/dashboard/page.tsx';
import { ProtectedRoute } from '@/components/ProtectedRoute/ProtectedRoute.tsx';
import { AuthProvider } from '@/context/auth';
import BusinessLayout from './app/business/layout.tsx';

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<BrowserRouter>
			<AuthProvider>
				<Routes>
					<Route path="/" element={<App />} />
					<Route path="/login" element={<LoginPage />} />
					{/* TODO path should be :business-slug */}
					<Route element={<BusinessLayout />} path='/business'>
						<Route path="dashboard" element={
							<ProtectedRoute>
								<DashboardPage />
							</ProtectedRoute>
						} />
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

