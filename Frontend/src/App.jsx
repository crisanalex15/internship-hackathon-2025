import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LoginForm } from "./components/auth/LoginForm";
import { RegisterForm } from "./components/auth/RegisterForm";
import { VerifyEmailForm } from "./components/auth/VerifyEmailForm";
import { UserProfile } from "./components/profile/UserProfile";
import { ForgotPasswordForm } from "./components/auth/ForgotPasswordForm";
import { SocialAuthCallback } from "./components/auth/SocialAuthCallback";
import { LoadingSpinner } from "./components/common/LoadingSpinner";

const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" />;

  return children;
};

// Public Route Component (allow access to public pages)
const PublicRoute = ({ children }) => {
  const { isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;

  return children;
};

// Main Route Component - decides where to redirect based on auth status
const MainRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;

  return isAuthenticated ? (
    <Navigate to="/profile" />
  ) : (
    <Navigate to="/login" />
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <AuthProvider>
          <BrowserRouter>
            <div
              style={{
                minHeight: "100vh",
                backgroundColor: "#f8f9fa",
                padding: "20px",
              }}
            >
              <Routes>
                {/* Rute publice */}
                <Route
                  path="/login"
                  element={
                    <PublicRoute>
                      <LoginForm />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <PublicRoute>
                      <RegisterForm />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/verify-email"
                  element={
                    <PublicRoute>
                      <VerifyEmailForm />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/forgot-password"
                  element={
                    <PublicRoute>
                      <ForgotPasswordForm />
                    </PublicRoute>
                  }
                />
                <Route path="/auth/callback" element={<SocialAuthCallback />} />

                {/* Rute protejate */}
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <UserProfile />
                    </ProtectedRoute>
                  }
                />

                {/* Ruta principală - redirecționează în funcție de starea de autentificare */}
                <Route path="/" element={<MainRoute />} />

                {/* Catch-all route */}
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </div>
          </BrowserRouter>
        </AuthProvider>
      </MantineProvider>
    </QueryClientProvider>
  );
}

export default App;
