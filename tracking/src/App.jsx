import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { SignedIn, SignedOut, SignIn } from '@clerk/clerk-react';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import DriversPage from './pages/DriversPage';
import LoadsPage from './pages/LoadsPage';
import BrokersPage from './pages/BrokersPage';
import ResumePage from './pages/ResumePage';

function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <SignIn
          routing="path"
          path="/login"
          // Con esto ocultamos el botón de "Sign up" en la pantalla de login
          appearance={{
            elements: {
              footerAction: { display: 'none' },
              footerActionLink: { display: 'none' }
            }
          }}
        />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <Toaster />
      <Routes>
        {/* Mantenemos el '/*' aquí para que el login con Google no dé error 404 */}
        <Route path="/login/*" element={<SignInPage />} />

        <Route path="/*" element={
          <>
            <SignedOut>
              <Navigate to="/login" replace />
            </SignedOut>

            <SignedIn>
              <Layout>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/drivers" element={<DriversPage />} />
                  <Route path="/loads" element={<LoadsPage />} />
                  <Route path="/brokers" element={<BrokersPage />} />
                  <Route path="/resume" element={<ResumePage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </SignedIn>
          </>
        } />
      </Routes>
    </>
  );
}