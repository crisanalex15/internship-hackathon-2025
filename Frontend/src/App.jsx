import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LoginForm } from "./components/auth/LoginForm";
import { RegisterForm } from "./components/auth/RegisterForm";
import { VerifyEmailForm } from "./components/auth/VerifyEmailForm";
import { ForgotPasswordForm } from "./components/auth/ForgotPasswordForm";
import { SocialAuthCallback } from "./components/auth/SocialAuthCallback";
import ModernLoadingSpinner from "./components/common/ModernLoadingSpinner";
import IDELayout from "./components/layout/IDELayout";
import ViewTransition from "./components/layout/ViewTransition";
import ModernCodeReviewPanel from "./components/review/ModernCodeReviewPanel";
import ReviewHistory from "./components/review/ReviewHistory";
import PreCommitPanel from "./components/review/PreCommitPanel";
import { useState } from "react";

const queryClient = new QueryClient();

// IDE Container Component
const IDEContainer = () => {
  const [activeView, setActiveView] = useState("review");

  return (
    <IDELayout activeView={activeView} onViewChange={setActiveView}>
      <ViewTransition view={activeView}>
        {activeView === "review" && <ModernCodeReviewPanel />}
        {activeView === "history" && <ReviewHistory />}
        {activeView === "diff" && <ModernCodeReviewPanel />}
        {activeView === "precommit" && <PreCommitPanel />}
      </ViewTransition>
    </IDELayout>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <ModernLoadingSpinner message="Verificare autentificare..." />;
  if (!isAuthenticated) return <Navigate to="/login" />;

  return children;
};

// Public Route Component (allow access to public pages)
const PublicRoute = ({ children }) => {
  const { isLoading } = useAuth();

  if (isLoading) return <ModernLoadingSpinner message="Se încarcă..." />;

  return children;
};

// Main Route Component - decides where to redirect based on auth status
const MainRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <ModernLoadingSpinner message="Inițializare..." />;

  return isAuthenticated ? (
    <Navigate to="/review" />
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
            <Routes>
              {/* Rute publice */}
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <div style={{ minHeight: "100vh", backgroundColor: "#f8f9fa", padding: "20px" }}>
                      <LoginForm />
                    </div>
                  </PublicRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <PublicRoute>
                    <div style={{ minHeight: "100vh", backgroundColor: "#f8f9fa", padding: "20px" }}>
                      <RegisterForm />
                    </div>
                  </PublicRoute>
                }
              />
              <Route
                path="/verify-email"
                element={
                  <PublicRoute>
                    <div style={{ minHeight: "100vh", backgroundColor: "#f8f9fa", padding: "20px" }}>
                      <VerifyEmailForm />
                    </div>
                  </PublicRoute>
                }
              />
              <Route
                path="/forgot-password"
                element={
                  <PublicRoute>
                    <div style={{ minHeight: "100vh", backgroundColor: "#f8f9fa", padding: "20px" }}>
                      <ForgotPasswordForm />
                    </div>
                  </PublicRoute>
                }
              />
              <Route path="/auth/callback" element={<SocialAuthCallback />} />

              {/* Rute protejate - IDE Layout */}
              <Route
                path="/review"
                element={
                  <ProtectedRoute>
                    <IDEContainer />
                  </ProtectedRoute>
                }
              />

              {/* Ruta principală - redirecționează în funcție de starea de autentificare */}
              <Route path="/" element={<MainRoute />} />

              {/* Catch-all route */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </MantineProvider>
    </QueryClientProvider>
  );
}

export default App;
