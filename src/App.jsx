import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Home from './pages/Home.jsx';
import { MessageSkeletons } from './components/Skeleton.jsx';

// Only the home page is in the first download; the rest load when visited.
const Room = lazy(() => import('./pages/Room.jsx'));
const Summary = lazy(() => import('./pages/Summary.jsx'));
const History = lazy(() => import('./pages/History.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Signup = lazy(() => import('./pages/Signup.jsx'));
const Personalities = lazy(() => import('./pages/Personalities.jsx'));
// The admin panel is its own bundle: regular visitors never download it.
const AdminApp = lazy(() => import('./pages/admin/AdminApp.jsx'));
// The diagnostics page exists only in local development builds.
const SetupCheck = import.meta.env.DEV ? lazy(() => import('./pages/SetupCheck.jsx')) : null;

function PageLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-20">
      <MessageSkeletons count={2} />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:id" element={<Room />} />
        <Route path="/summary/:id" element={<Summary />} />
        <Route path="/history" element={<History />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/personalities" element={<Personalities />} />
        <Route path="/admin/*" element={<AdminApp />} />
        {SetupCheck && <Route path="/setup" element={<SetupCheck />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
