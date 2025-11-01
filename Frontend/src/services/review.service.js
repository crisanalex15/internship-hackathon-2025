import axios from "axios";

// Folosește variabila de environment sau fallback la localhost
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5086/api";

const reviewApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// JWT Token Management
const getToken = () => localStorage.getItem("accessToken");

// Request interceptor - adaugă JWT token
reviewApi.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor pentru erori
reviewApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expirat, redirectează către login
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const reviewService = {
  /**
   * Efectuează un code review
   * @param {Object} data - { code?, gitDiff?, fileName?, language? }
   */
  performReview: (data) => reviewApi.post("/aireview", data),

  /**
   * Aplică un fix/patch la un fișier
   * @param {Object} data - { patch, filePath }
   */
  applyFix: (data) => reviewApi.post("/aireview/apply-fix", data),

  /**
   * Obține istoricul review-urilor
   * @param {Number} limit - număr maxim de rezultate
   */
  getHistory: (limit = 50) => reviewApi.get("/aireview/history", { params: { limit } }),

  /**
   * Obține detalii despre un review specific
   * @param {Number} id - ID-ul review-ului
   */
  getReviewById: (id) => reviewApi.get(`/aireview/${id}`),

  /**
   * Cere explicații detaliate pentru un finding
   * @param {Object} finding - obiectul finding
   */
  explainFinding: (finding) => reviewApi.post("/aireview/explain", finding),

  /**
   * Verifică status-ul serviciului Ollama
   */
  checkStatus: () => reviewApi.get("/aireview/status"),

  /**
   * Obține git diff automat din repository
   * @param {Boolean} staged - dacă true, folosește git diff --staged
   */
  getGitDiff: (staged = false) => reviewApi.get("/aireview/git-diff", { params: { staged } }),

  /**
   * Face review automat pe git diff curent
   * @param {Boolean} staged - dacă true, folosește git diff --staged
   */
  autoReviewGitDiff: (staged = false) => reviewApi.post("/aireview/auto-review-diff", null, { params: { staged } }),
};

export default reviewService;

