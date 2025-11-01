using Backend.Areas.Identity.Data;
using Backend.Services.Auth;
using Backend.Services.Email;
using Backend.DTO.UserDTO;
using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authentication.JwtBearer;


namespace Backend.Controllers.Auth
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IEmailService _emailService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthController> _logger;
        private readonly UserManager<ApplicationUser> _userManager;



        public AuthController(
            IAuthService authService,
            IEmailService emailService,
            IConfiguration configuration,
            ILogger<AuthController> logger,
            UserManager<ApplicationUser> userManager)
        {
            _authService = authService;
            _emailService = emailService;
            _configuration = configuration;
            _logger = logger;
            _userManager = userManager;
        }


        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<IActionResult> Register([FromBody] RegisterRequestDTO request)
        {
            try
            {
                _logger.LogInformation("Starting registration for email: {Email}", request.Email);

                var user = new ApplicationUser
                {
                    UserName = request.Email,
                    Email = request.Email,
                    FirstName = request.FirstName,
                    LastName = request.LastName,
                    EmailConfirmed = true // Setăm direct aici
                };

                _logger.LogInformation("Created user object with Email: {Email}, UserName: {UserName}", user.Email, user.UserName);


                var (succeeded, errors) = await _authService.RegisterAsync(user, request.Password);
                if (!succeeded)
                {
                    return BadRequest(new { Errors = errors });
                }

                // Generăm token-ul de verificare email
                // var token = await _authService.GenerateEmailVerificationTokenAsync(user);
                // var encodedToken = Uri.EscapeDataString(token);
                // var verificationLink = $"{_configuration["App:FrontendUrl"]}/verify-email?userId={user.Id}&token={encodedToken}";

                // Trimitem email-ul de verificare

                return Ok(new { Message = "Registration successful. Please check your email to verify your account." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during registration. Full error: {Error}", ex.ToString());
                return StatusCode(500, new { Message = "An error occurred during registration.", Error = ex.Message });
            }
        }

        // veriication email with code
        [HttpPost("verify-email-with-code")]
        [AllowAnonymous]
        public async Task<IActionResult> VerifyEmailWithCode([FromBody] VerifyEmailRequestDTO request)
        {
            try
            {
                _logger.LogInformation("Attempting to verify email for: {Email} with code: {Code}", request.Email, request.Code);

                var user = await _userManager.FindByEmailAsync(request.Email);
                if (user == null)
                {
                    _logger.LogWarning("User not found for email: {Email}", request.Email);
                    return BadRequest(new { Message = "Invalid verification code." });
                }

                _logger.LogInformation("User found. Stored code: {StoredCode}, Provided code: {ProvidedCode}",
                    user.VerificationCode, request.Code);

                if (user.VerificationCode != request.Code)
                {
                    _logger.LogWarning("Code mismatch for email: {Email}", request.Email);
                    return BadRequest(new { Message = "Invalid verification code." });
                }

                user.IsEmailVerified = true;
                user.EmailVerifiedAt = DateTime.UtcNow;
                user.VerificationCode = null; // Clear the code after successful verification
                await _userManager.UpdateAsync(user);

                _logger.LogInformation("Email verified successfully for: {Email}", request.Email);
                return Ok(new { Message = "Email verified successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error verifying email for: {Email}", request.Email);
                return StatusCode(400, new { Message = "An error occurred while verifying email." });
            }
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginRequestDTO request)
        {
            try
            {


                var (user, token, refreshToken, error) = await _authService.LoginAsync(request.Email, request.Password);
                // if user has created account but not verified email, send verification code email
                if (user != null && !user.IsEmailVerified)
                {
                    var (succeeded, errors) = await _authService.SendVerificationCodeEmailAsync(user.Email!);
                    return StatusCode(449, new { Message = "Email not verified, please verify your email" });
                }

                if (user == null || token == null || refreshToken == null || error != null)
                {
                    return StatusCode(401, new { Message = error });
                }

                return Ok(new
                {
                    Token = token,
                    RefreshToken = refreshToken,
                    User = new
                    {
                        user.Id,
                        user.Email,
                        user.FirstName,
                        user.LastName,
                        user.IsEmailVerified
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during login");
                return StatusCode(500, new { Message = "An error occurred during login.", Error = ex.Message });
            }
        }

        [HttpPost("refresh-token")]
        [AllowAnonymous]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequestDTO request)
        {
            try
            {
                var (token, refreshToken) = await _authService.RefreshTokenAsync(request.Token, request.RefreshToken);
                if (token == null || refreshToken == null)
                {
                    return StatusCode(401, new { Message = "Invalid token." });
                }

                return Ok(new { Token = token, RefreshToken = refreshToken });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during token refresh");
                return StatusCode(500, new { Message = "An error occurred during token refresh.", Error = ex.Message });
            }
        }


        [HttpPost("forgot-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequestDTO request)
        {
            try
            {
                var user = await _userManager.FindByEmailAsync(request.Email);
                if (user == null || !user.IsEmailVerified)
                {
                    // Pentru securitate, returnăm același mesaj chiar dacă utilizatorul nu există
                    return Ok(new { Message = "If your email is registered, you will receive a password reset link." });
                }

                user.SetPasswordResetVerificationCode();
                await _userManager.UpdateAsync(user);
                await _emailService.SendPasswordResetEmailAsync(request.Email, user.ResetPasswordCode!);
                return Ok(new { Message = "If your email is registered, you will receive a password reset link." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during forgot password process");
                return StatusCode(500, new { Message = "An error occurred while processing your request." });
            }
        }

        [HttpPost("reset-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequestDTO request)
        {
            try
            {
                var result = await _authService.ResetPasswordAsync(request.Email, request.Code, request.NewPassword);
                if (!result.Succeeded)
                {
                    return StatusCode(401, new { Message = "Invalid verification code or failed to reset password.", Errors = result.Errors });
                }
                if (!result.Succeeded && result.Errors.Contains("Lockout end password reset expired"))
                {
                    return StatusCode(402, new { Message = "Lockout end password reset expired." });
                }

                return Ok(new { Message = "Password has been reset successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during password reset");
                return StatusCode(500, new { Message = "An error occurred during password reset." });
            }
        }

        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequestDTO request)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized();
                }

                (bool succeeded, string[] errors) = await _authService.ChangePasswordAsync(userId, request.CurrentPassword, request.NewPassword);
                if (!succeeded)
                {
                    return BadRequest(new { Errors = errors });
                }

                return Ok(new { Message = "Password changed successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during password change");
                return StatusCode(500, new { Message = "An error occurred while changing the password." });
            }
        }

        [HttpGet("profile")]
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        public async Task<IActionResult> Profile()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userId == null)
            {
                return Unauthorized(new { Message = "User not found." });
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return NotFound(new { Message = "User not found." });
            }

            // Returnează doar datele necesare pentru frontend
            var userProfile = new
            {
                user.Id,
                user.Email,
                user.UserName,
                user.FirstName,
                user.LastName,
                user.PhoneNumber,
                user.EmailConfirmed,
                user.IsEmailVerified,
                user.EmailVerifiedAt,
                user.CreatedAt,
                user.LastModifiedAt,
                user.LastLoginAt,
                user.LockoutEnd
            };

            return Ok(userProfile);
        }

        [HttpPost("logout")]
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        public async Task<IActionResult> Logout()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (userId != null)
                {
                    var user = await _userManager.FindByIdAsync(userId);
                    if (user != null)
                    {
                        user.RefreshToken = null;
                        user.RefreshTokenExpiryTime = null;
                        user.UpdateLastModified();
                        await _userManager.UpdateAsync(user);
                    }
                }
                return Ok(new { Message = "Logged out successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during logout");
                return StatusCode(500, new { Message = "An error occurred during logout." });
            }
        }
    }
}

