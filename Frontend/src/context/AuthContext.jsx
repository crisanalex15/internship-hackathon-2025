import { createContext, useContext, useState, useEffect } from "react";
import {
  authApi,
  socialAuthApi,
  getToken,
  setTokens,
  clearTokens,
} from "../services/api";
import sessionLogger from "../services/sessionLogger";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Verifică starea de autentificare la inițializare
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const token = getToken();

    if (!token) {
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      sessionLogger.logAuthEvent("no_token_found");
      return;
    }

    try {
      const response = await authApi.getUserProfile();

      // Verifică dacă e HTML
      if (
        typeof response.data === "string" &&
        response.data.includes("<!DOCTYPE")
      ) {
        throw new Error("Endpoint returned HTML - authentication failed");
      }

      // Verifică dacă response.data este string și trebuie parseat
      let userData = response.data;
      if (typeof response.data === "string") {
        try {
          userData = JSON.parse(response.data);
        } catch (parseError) {
          throw new Error("Invalid user data format");
        }
      }

      setUser(userData);
      setIsAuthenticated(true);
      localStorage.setItem("user", JSON.stringify(userData));

      sessionLogger.logAuthEvent("token_validated", {
        userId: userData.id,
        email: userData.email,
      });
      sessionLogger.startSession(userData);
    } catch (error) {
      // Token invalid sau expirat
      clearTokens();
      setUser(null);
      setIsAuthenticated(false);
      sessionLogger.logAuthEvent("token_invalid", {
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (loginData) => {
    sessionLogger.logAuthEvent("login_attempt", { email: loginData.email });

    try {
      const response = await authApi.login(loginData);
      const { token, refreshToken, user: userData } = response.data;

      // Salvează token-urile
      setTokens(token, refreshToken);

      // Actualizează starea
      setUser(userData);
      setIsAuthenticated(true);
      localStorage.setItem("user", JSON.stringify(userData));

      sessionLogger.logAuthEvent("login_success", {
        userId: userData.id,
        email: userData.email,
        method: "email_password",
      });
      sessionLogger.startSession(userData);

      return { success: true, user: userData };
    } catch (error) {
      sessionLogger.logAuthEvent("login_failed", {
        email: loginData.email,
        error: error.response?.data?.message || "Login failed",
      });

      return {
        success: false,
        error: error.response?.data?.message || "Login failed",
      };
    }
  };

  const logout = async () => {
    sessionLogger.logAuthEvent("logout_attempt");

    try {
      await authApi.logout();
      sessionLogger.logAuthEvent("logout_success");
    } catch (error) {
      console.error("Logout error:", error);
      sessionLogger.logError(error, "logout");
    } finally {
      // Curăță toate token-urile și starea
      clearTokens();
      setUser(null);
      setIsAuthenticated(false);
      sessionLogger.endSession("user_logout");
    }
  };

  const register = async (registerData) => {
    sessionLogger.logAuthEvent("register_attempt", {
      email: registerData.email,
    });

    try {
      const response = await authApi.register(registerData);
      sessionLogger.logAuthEvent("register_success", {
        email: registerData.email,
      });
      return { success: true, message: response.data.message };
    } catch (error) {
      sessionLogger.logAuthEvent("register_failed", {
        email: registerData.email,
        error: error.response?.data?.message || "Registration failed",
      });

      return {
        success: false,
        error: error.response?.data?.message || "Registration failed",
        errors: error.response?.data?.errors,
      };
    }
  };

  const loginWithGoogle = () => {
    sessionLogger.logAuthEvent("social_login_attempt", { provider: "google" });
    socialAuthApi.googleLogin();
  };

  const loginWithFacebook = () => {
    sessionLogger.logAuthEvent("social_login_attempt", {
      provider: "facebook",
    });
    socialAuthApi.facebookLogin();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
        register,
        loginWithGoogle,
        loginWithFacebook,
        checkAuthStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
