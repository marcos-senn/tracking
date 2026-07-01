import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react'; // <-- IMPORTS DE CLERK
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import DriversPage from './pages/DriversPage';
import LoadsPage from './pages/LoadsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster />
      
      {/* Si NO está logueado, lo manda a la pantalla de Login de Clerk */}
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>

      {/* Si SÍ está logueado, muestra la app normal */}
      <SignedIn>
        <Layout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/drivers" element={<DriversPage />} />
            <Route path="/loads" element={<LoadsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </SignedIn>
    </BrowserRouter>
  );
}