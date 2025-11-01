using Backend.Areas.Identity.Data;
using Backend.Services.Email;
using Microsoft.AspNetCore.Identity;
using System.Security.Claims;

namespace Backend.Services.Auth
{
    public interface IAuthService
    {
        Task<(ApplicationUser? User, string? Token, string? RefreshToken, string? Error)> LoginAsync(string email, string password);
        Task<(bool Succeeded, string[] Errors)> RegisterAsync(ApplicationUser user, string password);
        Task<(bool Succeeded, string[] Errors)> ChangePasswordAsync(string userId, string currentPassword, string newPassword);
        Task<string> GenerateEmailVerificationTokenAsync(ApplicationUser user);
        Task<bool> VerifyEmailAsync(string email, string code);
        Task<string> GeneratePasswordResetTokenAsync(ApplicationUser user);
        Task<(bool Succeeded, string[] Errors)> ResetPasswordAsync(string email, string token, string newPassword);
        Task<(string? Token, string? RefreshToken)> RefreshTokenAsync(string accessToken, string refreshToken);

        Task<(bool Succeeded, string[] Errors)> SendVerificationCodeEmailAsync(string email);
        Task<bool> VerifyPasswordResetCodeAsync(string email, string code);
    }

    public class AuthService : IAuthService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IJwtService _jwtService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthService> _logger;
        private readonly IEmailService _emailService;
        public AuthService(
            UserManager<ApplicationUser> userManager,
            IJwtService jwtService,
            IConfiguration configuration,
            ILogger<AuthService> logger,
            IEmailService emailService)
        {
            _userManager = userManager;
            _jwtService = jwtService;
            _configuration = configuration;
            _logger = logger;
            _emailService = emailService;
        }

        /// <summary>
        /// Login a user
        /// </summary>
        /// <param name="email">Email of the user</param>
        /// <param name="password"></param>
        /// <returns>User, Token, RefreshToken, Error</returns>
        public async Task<(ApplicationUser? User, string? Token, string? RefreshToken, string? Error)> LoginAsync(string email, string password)
        {
            try
            {
                var user = await _userManager.FindByEmailAsync(email);
                if (user == null)
                {
                    return (null, null, null, "User not found");
                }
                else if (!user.IsEmailVerified)
                {
                    var code = Random.Shared.Next(100000, 999999);
                    user.VerificationCode = code.ToString();
                    await _userManager.UpdateAsync(user);
                    return (user, null, null, "Email not verified, please verify your email");
                }
                if (user.LockoutEnabled && user.LockoutEnd > DateTime.UtcNow)
                {
                    return (null, null, null, "Account locked out, please try again later");
                }

                var isPasswordValid = await _userManager.CheckPasswordAsync(user, password);
                if (!isPasswordValid)
                {
                    await _userManager.AccessFailedAsync(user);
                    return (null, null, null, "Invalid password, please try again");
                }

                // Actualizăm informațiile de login
                user.UpdateLastLogin();

                // Generăm tokenurile
                var token = _jwtService.GenerateJwtToken(user);
                var refreshToken = _jwtService.GenerateRefreshToken();

                // Salvăm refresh token-ul în baza de date
                user.RefreshToken = refreshToken;
                user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
                await _userManager.UpdateAsync(user);

                return (user, token, refreshToken, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during login for email: {Email}", email);
                throw;
            }
        }

        /// <summary>
        /// Register a user
        /// </summary>
        /// <param name="user">User to register</param>
        /// <param name="password">Password of the user</param>
        /// <returns>Succeeded, Errors</returns>
        public async Task<(bool Succeeded, string[] Errors)> RegisterAsync(ApplicationUser user, string password)
        {
            try
            {
                _logger.LogInformation("Starting user creation in AuthService for email: {Email}", user.Email);

                // Set normalized values
                user.NormalizedEmail = user.Email?.ToUpperInvariant();
                user.NormalizedUserName = user.UserName?.ToUpperInvariant();
                user.SecurityStamp = Guid.NewGuid().ToString();
                user.LastModifiedAt = DateTime.UtcNow;

                _logger.LogInformation("Normalized values set. NormalizedEmail: {NormalizedEmail}, NormalizedUserName: {NormalizedUserName}",
                    user.NormalizedEmail, user.NormalizedUserName);

                var result = await _userManager.CreateAsync(user, password);
                _logger.LogInformation("UserManager.CreateAsync result: {Succeeded}. Errors: {Errors}",
                    result.Succeeded,
                    result.Errors != null ? string.Join(", ", result.Errors.Select(e => e.Description)) : "none");
                if (result.Succeeded)
                {
                    // Generăm și salvăm codul de verificare
                    var (succeeded, errors) = await SendVerificationCodeEmailAsync(user.Email!);
                    if (!succeeded)
                    {
                        return (false, errors);
                    }

                    return (true, Array.Empty<string>());
                }

                return (false, result.Errors.Select(e => e.Description).ToArray());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during registration for user: {Email}. Full error: {Error}", user.Email, ex.ToString());
                throw;
            }
        }

        /// <summary>
        /// Change the password of a user
        /// </summary>
        /// <param name="userId">Id of the user</param>
        /// <param name="currentPassword">Current password of the user</param>
        /// <param name="newPassword">New password of the user</param>
        /// <returns>Succeeded, Errors</returns>
        public async Task<(bool Succeeded, string[] Errors)> ChangePasswordAsync(string userId, string currentPassword, string newPassword)
        {
            try
            {
                var user = await _userManager.FindByIdAsync(userId);
                if (user == null)
                {
                    return (false, new[] { "User not found" });
                }

                var result = await _userManager.ChangePasswordAsync(user, currentPassword, newPassword);
                if (result.Succeeded)
                {
                    user.UpdateLastModified();
                    await _userManager.UpdateAsync(user);
                    return (true, Array.Empty<string>());
                }

                return (false, result.Errors.Select(e => e.Description).ToArray());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during password change for user: {UserId}", userId);
                throw;
            }
        }

        /// <summary>
        /// Generate an email verification token
        /// </summary>
        /// <param name="user">User to generate the token for</param>
        /// <returns>Email verification token</returns>
        public async Task<string> GenerateEmailVerificationTokenAsync(ApplicationUser user)
        {
            try
            {
                return await _userManager.GenerateEmailConfirmationTokenAsync(user);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating email verification token for user: {Email}", user.Email);
                throw;
            }
        }

        /// <summary>
        /// Verify an email
        /// </summary>
        /// <param name="email">Email to verify</param>
        /// <param name="code">Code to verify</param>
        /// <returns>True if the email is verified, false otherwise</returns>
        public async Task<bool> VerifyEmailAsync(string email, string code)
        {
            try
            {

                var user = await _userManager.FindByEmailAsync(email);
                if (user == null)
                {
                    return false;
                }

                if (user.IsVerificationCodeExpired())
                {
                    return false;
                }
                var storedCode = user.VerificationCode;
                if (storedCode == code)
                {
                    user.MarkEmailAsVerified();
                    await _userManager.UpdateAsync(user);

                    // Ștergem codul după verificare
                    user.VerificationCode = null;
                    await _userManager.UpdateAsync(user);
                    return true;
                }

                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during email verification for user: {Email}", email);
                throw;
            }
        }

        /// <summary>
        /// Generate a password reset token
        /// </summary>
        /// <param name="user">User to generate the token for</param>
        /// <returns>Password reset token</returns>
        public async Task<string> GeneratePasswordResetTokenAsync(ApplicationUser user)
        {
            try
            {
                return await _userManager.GeneratePasswordResetTokenAsync(user);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating password reset token for user: {Email}", user.Email);
                throw;
            }
        }

        /// <summary>
        /// Reset the password of a user
        /// </summary>
        /// <param name="email">Email of the user</param>
        /// <param name="token">Token to reset the password</param>
        /// <param name="newPassword">New password of the user</param>
        /// <returns>True if the password is reset, false otherwise</returns>
        public async Task<(bool Succeeded, string[] Errors)> ResetPasswordAsync(string email, string verificationCode, string newPassword)
        {
            try
            {
                var user = await _userManager.FindByEmailAsync(email);
                if (user == null)
                {
                    _logger.LogWarning("User not found for email: {Email}", email);
                    return (false, new[] { "User not found" });
                }
                if (user.IsLockoutEndPasswordResetExpired())
                {
                    return (false, new[] { "Lockout end password reset expired" });
                }


                // Verificăm codul de verificare pentru resetare parolă
                if (user.ResetPasswordCode != verificationCode)
                {
                    user.AccessFailedCountPasswordReset++;
                    if (user.AccessFailedCountPasswordReset >= 5)
                    {
                        user.LockoutEndPasswordReset = DateTime.UtcNow.AddMinutes(10);
                    }
                    await _userManager.UpdateAsync(user);
                    return (false, new[] { "Invalid password reset verification code" });
                }

                if (user.IsPasswordResetVerificationCodeExpired())
                {
                    return (false, new[] { "Expired password reset verification code" });
                }

                // Resetez parola folosind Identity
                var token = await _userManager.GeneratePasswordResetTokenAsync(user);
                var result = await _userManager.ResetPasswordAsync(user, token, newPassword);

                if (result.Succeeded)
                {
                    // Curăț codul de resetare parolă după succes
                    user.ResetPasswordCode = null;
                    user.VerificationCodePasswordExpiryTime = null;
                    user.UpdateLastModified();
                    await _userManager.UpdateAsync(user);
                    return (true, Array.Empty<string>());
                }

                return (false, result.Errors.Select(e => e.Description).ToArray());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during password reset for email: {Email}", email);
                throw;
            }
        }

        /// <summary>
        /// Refresh a token
        /// </summary>
        /// <param name="accessToken">Access token to refresh</param>
        /// <param name="refreshToken">Refresh token to refresh</param>
        /// <returns>Token, RefreshToken</returns>
        public async Task<(string? Token, string? RefreshToken)> RefreshTokenAsync(string accessToken, string refreshToken)
        {
            try
            {
                var principal = _jwtService.GetPrincipalFromExpiredToken(accessToken);
                if (principal == null)
                {
                    return (null, null);
                }

                var userId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return (null, null);
                }

                var user = await _userManager.FindByIdAsync(userId);
                if (user == null ||
                    user.RefreshToken != refreshToken ||
                    user.RefreshTokenExpiryTime <= DateTime.UtcNow)
                {
                    return (null, null);
                }

                // Generăm noile tokenuri
                var newAccessToken = _jwtService.GenerateJwtToken(user);
                var newRefreshToken = _jwtService.GenerateRefreshToken();

                // Actualizăm refresh token-ul în baza de date
                user.RefreshToken = newRefreshToken;
                user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
                await _userManager.UpdateAsync(user);

                return (newAccessToken, newRefreshToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during token refresh");
                throw;
            }
        }


        /// <summary>
        /// Send a verification code email
        /// </summary>
        /// <param name="email">Email to send the verification code to</param>
        /// <returns>Succeeded, Errors</returns>
        public async Task<(bool Succeeded, string[] Errors)> SendVerificationCodeEmailAsync(string email)
        {
            try
            {
                var user = await _userManager.FindByEmailAsync(email);
                if (user == null)
                {
                    return (false, new[] { "User not found" });
                }

                user.SetVerificationCode();
                await _userManager.UpdateAsync(user);
                await _emailService.SendVerificationEmailAsync(email, user.VerificationCode!);
                return (true, new[] { "Verification code sent successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during sending verification code email for email: {Email}", email);
                return (false, new[] { "Error during sending verification code email" });
            }
        }

        /// <summary>
        /// Verify a password reset code
        /// </summary>
        /// <param name="email">Email to verify</param>
        /// <param name="code">Code to verify</param>
        /// <returns>True if the code is verified, false otherwise</returns>
        public async Task<bool> VerifyPasswordResetCodeAsync(string email, string code)
        {
            try
            {
                var user = await _userManager.FindByEmailAsync(email);
                if (user == null)
                {
                    return false;
                }

                if (user.VerificationCode != code)
                {
                    return false;
                }
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during verifying password reset code for email: {Email}", email);
                throw;
            }
        }



    }
}


