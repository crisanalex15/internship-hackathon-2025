# 🔧 Ghid de Configurare - Backend Social Authentication

## 📋 Configurări necesare pentru a face aplicația să funcționeze complet

### 1. 🔑 **Google OAuth2 Configuration**

#### **Pasul 1: Google Cloud Console**

1. Mergi la [Google Cloud Console](https://console.cloud.google.com/)
2. Creează un proiect nou sau selectează unul existent
3. Activează **Google+ API** și **Google OAuth2 API**
4. Mergi la **Credentials** → **Create Credentials** → **OAuth 2.0 Client IDs**
5. Configurează:
   - **Application type**: Web application
   - **Name**: Backend Social Auth
   - **Authorized JavaScript origins**:
     - `http://localhost:5086`
     - `https://localhost:5087` (dacă folosești HTTPS)
   - **Authorized redirect URIs**:
     - `http://localhost:5086/api/socialauth/google-callback`
     - `https://localhost:5087/api/socialauth/google-callback`

#### **Pasul 2: Copiază credentialele**

- **Client ID**: `123456789-abcdefghijklmnop.apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-abcdefghijklmnopqrstuvwxyz123456`

---

### 2. 📘 **Facebook OAuth2 Configuration**

#### **Pasul 1: Facebook Developers**

1. Mergi la [Facebook Developers](https://developers.facebook.com/)
2. Creează o aplicație nouă
3. Adaugă **Facebook Login** product
4. Configurează:
   - **App Domain**: `localhost`
   - **Valid OAuth Redirect URIs**:
     - `http://localhost:5086/api/socialauth/facebook-callback`
     - `https://localhost:5087/api/socialauth/facebook-callback`

#### **Pasul 2: Copiază credentialele**

- **App ID**: `123456789012345`
- **App Secret**: `abcdefghijklmnopqrstuvwxyz123456`

---

### 3. ⚙️ **Backend Configuration**

#### **Actualizează `appsettings.json`:**

```json
{
  "Authentication": {
    "Google": {
      "ClientId": "123456789-abcdefghijklmnop.apps.googleusercontent.com",
      "ClientSecret": "GOCSPX-abcdefghijklmnopqrstuvwxyz123456"
    },
    "Facebook": {
      "AppId": "123456789012345",
      "AppSecret": "abcdefghijklmnopqrstuvwxyz123456"
    }
  }
}
```

#### **Pentru Development (opțional) - `appsettings.Development.json`:**

```json
{
  "Authentication": {
    "Google": {
      "ClientId": "your-dev-google-client-id",
      "ClientSecret": "your-dev-google-client-secret"
    },
    "Facebook": {
      "AppId": "your-dev-facebook-app-id",
      "AppSecret": "your-dev-facebook-app-secret"
    }
  }
}
```

---

### 4. 🌐 **Frontend Configuration**

#### **Actualizează serviciul API pentru social auth:**

Adaugă în `Frontend/src/services/api.js`:

```javascript
export const socialAuthApi = {
  googleLogin: () => {
    window.location.href = "http://localhost:5086/api/socialauth/google";
  },
  facebookLogin: () => {
    window.location.href = "http://localhost:5086/api/socialauth/facebook";
  },
  getProviders: () => api.get("/socialauthtest/providers"),
};
```

#### **Creează pagina de callback pentru social auth:**

Creează `Frontend/src/components/auth/SocialAuthCallback.jsx`:

```jsx
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { LoadingSpinner } from "../common/LoadingSpinner";

export const SocialAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setTokens } = useAuth();

  useEffect(() => {
    const token = searchParams.get("token");
    const refreshToken = searchParams.get("refreshToken");

    if (token && refreshToken) {
      // Salvează token-urile și redirecționează
      setTokens(token, refreshToken);
      navigate("/profile");
    } else {
      // Eroare - redirecționează la login
      navigate("/login", {
        state: { error: "Autentificarea socială a eșuat" },
      });
    }
  }, [searchParams, navigate, setTokens]);

  return <LoadingSpinner message="Se finalizează autentificarea..." />;
};
```

---

### 5. 🔒 **Security Configuration**

#### **CORS Settings** (deja configurat în Program.cs):

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowSpecificOrigins", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "https://localhost:5173")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});
```

#### **JWT Settings** (deja configurat):

```json
{
  "Jwt": {
    "Key": "your-super-secure-key-here",
    "Issuer": "Alex Crisan",
    "Audience": "Alex Crisan Users",
    "ExpirationInMinutes": 60
  }
}
```

---

### 6. 🧪 **Testing Configuration**

#### **Test Endpoints disponibile:**

1. **Health Check**: `GET /api/health`
2. **Social Providers**: `GET /api/socialauthtest/providers`
3. **Simulate Google**: `POST /api/socialauthtest/simulate-google`
4. **Simulate Facebook**: `POST /api/socialauthtest/simulate-facebook`

#### **Test cu Postman/curl:**

```bash
# Test Google simulation
curl -X POST http://localhost:5086/api/socialauthtest/simulate-google \
  -H "Content-Type: application/json" \
  -d '{"email":"test@gmail.com","firstName":"Test","lastName":"User"}'
```

---

### 7. 🚀 **Deployment Configuration**

#### **Pentru Production:**

1. **Actualizează URL-urile în appsettings.Production.json**:

```json
{
  "App": {
    "FrontendUrl": "https://yourdomain.com"
  },
  "Authentication": {
    "Google": {
      "ClientId": "prod-google-client-id",
      "ClientSecret": "prod-google-client-secret"
    },
    "Facebook": {
      "AppId": "prod-facebook-app-id",
      "AppSecret": "prod-facebook-app-secret"
    }
  }
}
```

2. **Actualizează redirect URIs în Google/Facebook**:
   - Google: `https://yourdomain.com/api/socialauth/google-callback`
   - Facebook: `https://yourdomain.com/api/socialauth/facebook-callback`

---

### 8. 🔧 **Environment Variables (opțional)**

Pentru securitate suplimentară, poți folosi environment variables:

```bash
# Windows
set GOOGLE_CLIENT_ID=your-google-client-id
set GOOGLE_CLIENT_SECRET=your-google-client-secret
set FACEBOOK_APP_ID=your-facebook-app-id
set FACEBOOK_APP_SECRET=your-facebook-app-secret

# Linux/Mac
export GOOGLE_CLIENT_ID=your-google-client-id
export GOOGLE_CLIENT_SECRET=your-google-client-secret
export FACEBOOK_APP_ID=your-facebook-app-id
export FACEBOOK_APP_SECRET=your-facebook-app-secret
```

Apoi în Program.cs:

```csharp
.AddGoogle(googleOptions =>
{
    googleOptions.ClientId = Environment.GetEnvironmentVariable("GOOGLE_CLIENT_ID")
        ?? builder.Configuration["Authentication:Google:ClientId"] ?? "";
    googleOptions.ClientSecret = Environment.GetEnvironmentVariable("GOOGLE_CLIENT_SECRET")
        ?? builder.Configuration["Authentication:Google:ClientSecret"] ?? "";
})
```

---

### 9. ✅ **Verificare Configurare**

#### **Endpoint-uri pentru testare:**

- **Backend health**: `http://localhost:5086/api/health`
- **Social providers**: `http://localhost:5086/api/socialauthtest/providers`
- **Swagger**: `http://localhost:5086/swagger`

#### **Flow complet de testare:**

1. Pornește backend: `dotnet run` în `/Backend`
2. Pornește frontend: `npm run dev` în `/Frontend`
3. Testează: `http://localhost:5173` → login → social auth

---

### 🎯 **Quick Start pentru testare:**

1. **Înlocuiește în `appsettings.json`** credentialele cu cele reale
2. **Restart backend**: `dotnet run`
3. **Testează**: Mergi la frontend și încearcă login cu Google/Facebook

**Configurarea este acum COMPLETĂ și ORGANIZATĂ!** 🎉
