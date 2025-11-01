using Backend.Areas.Identity.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;
using System.Security.Claims;

namespace Backend.Services.Auth
{
    public class SocialAuthService : ISocialAuthService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly IJwtService _jwtService;
        private readonly ILogger<SocialAuthService> _logger;

        public SocialAuthService(
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            IJwtService jwtService,
            ILogger<SocialAuthService> logger)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _jwtService = jwtService;
            _logger = logger;
        }

        public async Task<(bool Success, ApplicationUser? User, string? Token, string? RefreshToken, string? Error)> ProcessSocialLoginAsync(
            string provider,
            string providerKey,
            string email,
            string? firstName = null,
            string? lastName = null)
        {
            try
            {
                // Verifică dacă utilizatorul există deja cu acest external login
                var existingUser = await _userManager.FindByLoginAsync(provider, providerKey);
                if (existingUser != null)
                {
                    // Utilizatorul există, generează token-uri
                    return await GenerateTokensForUser(existingUser, provider);
                }

                // Verifică dacă utilizatorul există cu acest email
                var userByEmail = await _userManager.FindByEmailAsync(email);
                if (userByEmail != null)
                {
                    // Adaugă external login la utilizatorul existent
                    var loginInfo = new UserLoginInfo(provider, providerKey, provider);
                    var addLoginResult = await _userManager.AddLoginAsync(userByEmail, loginInfo);

                    if (addLoginResult.Succeeded)
                    {
                        return await GenerateTokensForUser(userByEmail, provider);
                    }
                    else
                    {
                        var errors = string.Join(", ", addLoginResult.Errors.Select(e => e.Description));
                        return (false, null, null, null, $"Failed to link {provider} account: {errors}");
                    }
                }

                // Creează utilizator nou
                var newUser = new ApplicationUser
                {
                    UserName = email,
                    Email = email,
                    FirstName = firstName,
                    LastName = lastName,
                    EmailConfirmed = true,
                    IsEmailVerified = true,
                    EmailVerifiedAt = DateTime.UtcNow
                };

                var createResult = await _userManager.CreateAsync(newUser);
                if (!createResult.Succeeded)
                {
                    var errors = string.Join(", ", createResult.Errors.Select(e => e.Description));
                    return (false, null, null, null, $"Failed to create user: {errors}");
                }

                // Adaugă external login
                var loginInfo2 = new UserLoginInfo(provider, providerKey, provider);
                var addLoginResult2 = await _userManager.AddLoginAsync(newUser, loginInfo2);
                if (!addLoginResult2.Succeeded)
                {
                    var errors = string.Join(", ", addLoginResult2.Errors.Select(e => e.Description));
                    return (false, null, null, null, $"Failed to add external login: {errors}");
                }

                // Adaugă rolul User
                await _userManager.AddToRoleAsync(newUser, "User");

                return await GenerateTokensForUser(newUser, provider);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing social login for provider {Provider}", provider);
                return (false, null, null, null, $"An error occurred during {provider} authentication");
            }
        }

        private async Task<(bool Success, ApplicationUser? User, string? Token, string? RefreshToken, string? Error)> GenerateTokensForUser(ApplicationUser user, string provider)
        {
            try
            {
                user.UpdateLastLogin();
                await _userManager.UpdateAsync(user);

                var token = _jwtService.GenerateJwtToken(user);
                var refreshToken = _jwtService.GenerateRefreshToken();

                user.RefreshToken = refreshToken;
                user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
                await _userManager.UpdateAsync(user);

                _logger.LogInformation("Generated tokens for user {Email} via {Provider}", user.Email, provider);
                return (true, user, token, refreshToken, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating tokens for user {Email}", user.Email);
                return (false, null, null, null, "Failed to generate authentication tokens");
            }
        }

        public async Task<string> GetSocialLoginUrlAsync(string provider, string returnUrl)
        {
            var redirectUrl = provider.ToLower() switch
            {
                "google" => "/api/socialauth/google-callback",
                "facebook" => "/api/socialauth/facebook-callback",
                _ => throw new ArgumentException($"Unsupported provider: {provider}")
            };

            return $"/api/socialauth/{provider.ToLower()}?returnUrl={returnUrl}";
        }

        public async Task<(bool Success, string? Error)> LinkSocialAccountAsync(string userId, string provider, string providerKey)
        {
            try
            {
                var user = await _userManager.FindByIdAsync(userId);
                if (user == null)
                {
                    return (false, "User not found");
                }

                var loginInfo = new UserLoginInfo(provider, providerKey, provider);
                var result = await _userManager.AddLoginAsync(user, loginInfo);

                if (result.Succeeded)
                {
                    _logger.LogInformation("Linked {Provider} account to user {Email}", provider, user.Email);
                    return (true, null);
                }

                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                return (false, errors);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error linking {Provider} account for user {UserId}", provider, userId);
                return (false, $"An error occurred while linking {provider} account");
            }
        }

        public async Task<(bool Success, string? Error)> UnlinkSocialAccountAsync(string userId, string provider)
        {
            try
            {
                var user = await _userManager.FindByIdAsync(userId);
                if (user == null)
                {
                    return (false, "User not found");
                }

                var logins = await _userManager.GetLoginsAsync(user);
                var loginToRemove = logins.FirstOrDefault(l => l.LoginProvider == provider);

                if (loginToRemove == null)
                {
                    return (false, $"No {provider} account linked to this user");
                }

                var result = await _userManager.RemoveLoginAsync(user, loginToRemove.LoginProvider, loginToRemove.ProviderKey);

                if (result.Succeeded)
                {
                    _logger.LogInformation("Unlinked {Provider} account from user {Email}", provider, user.Email);
                    return (true, null);
                }

                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                return (false, errors);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error unlinking {Provider} account for user {UserId}", provider, userId);
                return (false, $"An error occurred while unlinking {provider} account");
            }
        }
    }
}
