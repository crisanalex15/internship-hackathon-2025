using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authentication.Facebook;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Backend.Areas.Identity.Data;
using Backend.Services.Auth;
using System.Security.Claims;

namespace Backend.Controllers.Auth
{
    [ApiController]
    [Route("api/[controller]")]
    public class SocialAuthController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly IJwtService _jwtService;
        private readonly ILogger<SocialAuthController> _logger;

        public SocialAuthController(
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            IJwtService jwtService,
            ILogger<SocialAuthController> logger)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _jwtService = jwtService;
            _logger = logger;
        }

        [HttpGet("google")]
        [AllowAnonymous]
        public IActionResult GoogleLogin(string returnUrl = null)
        {
            // Folosește URL-ul standard ASP.NET Identity pentru Google
            var redirectUrl = Url.Action(nameof(GoogleCallback), "SocialAuth");
            var properties = _signInManager.ConfigureExternalAuthenticationProperties(GoogleDefaults.AuthenticationScheme, redirectUrl);
            return Challenge(properties, GoogleDefaults.AuthenticationScheme);
        }

        [HttpGet("google-callback")]
        [AllowAnonymous]
        public async Task<IActionResult> GoogleCallback(string returnUrl = null)
        {
            try
            {
                var info = await _signInManager.GetExternalLoginInfoAsync();
                if (info == null)
                {
                    return BadRequest(new { Message = "Error loading external login information." });
                }

                var result = await ProcessExternalLogin(info, "Google");
                if (result.Success)
                {
                    var frontendUrl = $"http://localhost:5173/auth/callback?token={result.Token}&refreshToken={result.RefreshToken}&provider=google";
                    return Redirect(frontendUrl);
                }

                return BadRequest(new { Message = result.Error });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during Google authentication callback");
                return StatusCode(500, new { Message = "An error occurred during Google authentication." });
            }
        }

        [HttpGet("facebook")]
        [AllowAnonymous]
        public IActionResult FacebookLogin(string returnUrl = null)
        {
            // URL absolut pentru a fi sigur că e corect
            var redirectUrl = "http://localhost:5086/api/socialauth/facebook-callback";
            var properties = _signInManager.ConfigureExternalAuthenticationProperties(FacebookDefaults.AuthenticationScheme, redirectUrl);
            return Challenge(properties, FacebookDefaults.AuthenticationScheme);
        }

        [HttpGet("facebook-callback")]
        [AllowAnonymous]
        public async Task<IActionResult> FacebookCallback(string returnUrl = null)
        {
            try
            {
                var info = await _signInManager.GetExternalLoginInfoAsync();
                if (info == null)
                {
                    return BadRequest(new { Message = "Error loading external login information." });
                }

                var result = await ProcessExternalLogin(info, "Facebook");
                if (result.Success)
                {
                    var frontendUrl = $"http://localhost:5173/auth/callback?token={result.Token}&refreshToken={result.RefreshToken}&provider=facebook";
                    return Redirect(frontendUrl);
                }

                return BadRequest(new { Message = result.Error });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during Facebook authentication callback");
                return StatusCode(500, new { Message = "An error occurred during Facebook authentication." });
            }
        }

        private async Task<(bool Success, string? Token, string? RefreshToken, string? Error)> ProcessExternalLogin(ExternalLoginInfo info, string provider)
        {
            try
            {
                // Încearcă să se logheze cu external login existent
                var signInResult = await _signInManager.ExternalLoginSignInAsync(info.LoginProvider, info.ProviderKey, isPersistent: false, bypassTwoFactor: true);

                if (signInResult.Succeeded)
                {
                    // Utilizatorul există și s-a logat cu succes
                    var user = await _userManager.FindByLoginAsync(info.LoginProvider, info.ProviderKey);
                    if (user != null)
                    {
                        user.UpdateLastLogin();
                        await _userManager.UpdateAsync(user);

                        var token = _jwtService.GenerateJwtToken(user);
                        var refreshToken = _jwtService.GenerateRefreshToken();

                        user.RefreshToken = refreshToken;
                        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
                        await _userManager.UpdateAsync(user);

                        _logger.LogInformation("User {Email} logged in with {Provider}", user.Email, provider);
                        return (true, token, refreshToken, null);
                    }
                }

                // Utilizatorul nu există, creează cont nou
                var email = info.Principal.FindFirstValue(ClaimTypes.Email);
                var firstName = info.Principal.FindFirstValue(ClaimTypes.GivenName);
                var lastName = info.Principal.FindFirstValue(ClaimTypes.Surname);
                var name = info.Principal.FindFirstValue(ClaimTypes.Name);

                if (string.IsNullOrEmpty(email))
                {
                    return (false, null, null, $"Email not provided by {provider}");
                }

                // Verifică dacă utilizatorul există deja cu acest email
                var existingUser = await _userManager.FindByEmailAsync(email);
                if (existingUser != null)
                {
                    // Adaugă external login la utilizatorul existent
                    var addLoginResult = await _userManager.AddLoginAsync(existingUser, info);
                    if (addLoginResult.Succeeded)
                    {
                        existingUser.UpdateLastLogin();
                        await _userManager.UpdateAsync(existingUser);

                        var token = _jwtService.GenerateJwtToken(existingUser);
                        var refreshToken = _jwtService.GenerateRefreshToken();

                        existingUser.RefreshToken = refreshToken;
                        existingUser.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
                        await _userManager.UpdateAsync(existingUser);

                        _logger.LogInformation("Added {Provider} login to existing user {Email}", provider, email);
                        return (true, token, refreshToken, null);
                    }
                }

                // Creează utilizator nou
                var newUser = new ApplicationUser
                {
                    UserName = email,
                    Email = email,
                    FirstName = firstName ?? name?.Split(' ').FirstOrDefault(),
                    LastName = lastName ?? name?.Split(' ').LastOrDefault(),
                    EmailConfirmed = true, // Email-ul este verificat de provider-ul OAuth
                    IsEmailVerified = true, // Considerăm verificat prin OAuth
                    EmailVerifiedAt = DateTime.UtcNow
                };

                var createResult = await _userManager.CreateAsync(newUser);
                if (createResult.Succeeded)
                {
                    var addLoginResult = await _userManager.AddLoginAsync(newUser, info);
                    if (addLoginResult.Succeeded)
                    {
                        // Adaugă rolul User
                        await _userManager.AddToRoleAsync(newUser, "User");

                        newUser.UpdateLastLogin();
                        await _userManager.UpdateAsync(newUser);

                        var token = _jwtService.GenerateJwtToken(newUser);
                        var refreshToken = _jwtService.GenerateRefreshToken();

                        newUser.RefreshToken = refreshToken;
                        newUser.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
                        await _userManager.UpdateAsync(newUser);

                        _logger.LogInformation("Created new user {Email} with {Provider} login", email, provider);
                        return (true, token, refreshToken, null);
                    }
                }

                var errors = createResult.Errors.Select(e => e.Description).ToArray();
                return (false, null, null, $"Failed to create user: {string.Join(", ", errors)}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing {Provider} external login", provider);
                return (false, null, null, $"An error occurred during {provider} authentication");
            }
        }

        [HttpGet("providers")]
        [AllowAnonymous]
        public async Task<IActionResult> GetExternalProviders()
        {
            var schemes = await _signInManager.GetExternalAuthenticationSchemesAsync();
            var providers = schemes.Select(s => new
            {
                Name = s.Name,
                DisplayName = s.DisplayName,
                LoginUrl = Url.Action("GoogleLogin", "SocialAuth") // Pentru Google
            }).ToList();

            return Ok(providers);
        }
    }
}
