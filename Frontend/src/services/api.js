import axios from "axios";

// Folosește variabila de environment sau fallback la localhost
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5086/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// JWT Token Management
const getToken = () => localStorage.getItem("accessToken");
const getRefreshToken = () => localStorage.getItem("refreshToken");
const setTokens = (accessToken, refreshToken) => {
  localStorage.setItem("accessToken", accessToken);
  if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
};
const clearTokens = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
};

// Request interceptor - adaugă JWT token la toate request-urile
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - gestionează refresh token și erorile
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          const response = await axios.post(
            `${API_BASE_URL}/auth/refresh-token`,
            {
              token: getToken(),
              refreshToken: refreshToken,
            }
          );

          const { token: newToken, refreshToken: newRefreshToken } =
            response.data;
          setTokens(newToken, newRefreshToken);

          // Retry original request cu noul token
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh token invalid sau expirat
          clearTokens();
          window.location.href = "/login";
          return Promise.reject(refreshError);
        }
      } else {
        // Nu există refresh token
        clearTokens();
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export const authApi = {
  login: (data) => api.post("/auth/login", data),
  register: (data) => api.post("/auth/register", data),
  verifyEmail: ({ email, code }) =>
    api.post("/auth/verify-email-with-code", { email, code }),
  forgotPassword: (data) => api.post("/auth/forgot-password", data),
  resetPassword: (data) => api.post("/auth/reset-password", data),
  getUserProfile: () => api.get("/auth/profile"),
  logout: () => api.post("/auth/logout"),
  refreshToken: (data) => api.post("/auth/refresh-token", data),
};

export const socialAuthApi = {
  googleLogin: () => {
    window.location.href = `${API_BASE_URL}/socialauth/google`;
  },
  facebookLogin: () => {
    window.location.href = `${API_BASE_URL}/socialauth/facebook`;
  },
  getProviders: () => api.get("/socialauthtest/providers"),
};

// Export token management functions
export { getToken, getRefreshToken, setTokens, clearTokens };
