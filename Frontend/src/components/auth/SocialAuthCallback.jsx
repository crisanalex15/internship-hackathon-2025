import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { setTokens } from "../../services/api";
import sessionLogger from "../../services/sessionLogger";

export const SocialAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkAuthStatus } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get("token");
      const refreshToken = searchParams.get("refreshToken");
      const provider = searchParams.get("provider") || "social";

      sessionLogger.logAuthEvent("social_callback_received", {
        provider,
        hasToken: !!token,
        hasRefreshToken: !!refreshToken,
      });

      if (token && refreshToken) {
        // Salvează token-urile
        setTokens(token, refreshToken);

        sessionLogger.logAuthEvent("social_login_success", {
          provider,
          autoLogin: true,
        });

        // Verifică starea de autentificare pentru a actualiza user-ul
        try {
          await checkAuthStatus();
          // Redirecționează la profil (auto-login după înregistrare)
          navigate("/profile");
        } catch (error) {
          sessionLogger.logError(error, "social_auth_profile_fetch");
          // Dacă nu poate obține profilul, redirecționează la login
          navigate("/login", {
            state: {
              error:
                "Autentificarea a reușit, dar nu s-au putut încărca datele. Te rog loghează-te din nou.",
            },
          });
        }
      } else {
        // Eroare - redirecționează la login cu mesaj de eroare
        sessionLogger.logAuthEvent("social_login_failed", {
          provider,
          reason: "missing_tokens",
        });

        navigate("/login", {
          state: {
            error: "Autentificarea socială a eșuat. Te rog încearcă din nou.",
          },
        });
      }
    };

    handleCallback();
  }, [searchParams, navigate, checkAuthStatus]);

  return <LoadingSpinner message="Se finalizează autentificarea..." />;
};
