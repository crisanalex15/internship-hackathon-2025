using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Backend.Services.Auth;

namespace Backend.Controllers.API
{
    [ApiController]
    [Route("api/[controller]")]
    public class SocialAuthTestController : ControllerBase
    {
        private readonly ISocialAuthService _socialAuthService;
        private readonly ILogger<SocialAuthTestController> _logger;

        public SocialAuthTestController(
            ISocialAuthService socialAuthService,
            ILogger<SocialAuthTestController> logger)
        {
            _socialAuthService = socialAuthService;
            _logger = logger;
        }

        [HttpGet("providers")]
        [AllowAnonymous]
        public IActionResult GetAvailableProviders()
        {
            var providers = new[]
            {
                new {
                    Name = "Google",
                    LoginUrl = "/api/socialauth/google",
                    DisplayName = "Google",
                    Icon = "google"
                },
                new {
                    Name = "Facebook",
                    LoginUrl = "/api/socialauth/facebook",
                    DisplayName = "Facebook",
                    Icon = "facebook"
                }
            };

            return Ok(new
            {
                Providers = providers,
                Message = "Social authentication providers available",
                Timestamp = DateTime.UtcNow
            });
        }

        [HttpPost("simulate-google")]
        [AllowAnonymous]
        public async Task<IActionResult> SimulateGoogleLogin([FromBody] SocialLoginRequest request)
        {
            try
            {
                var result = await _socialAuthService.ProcessSocialLoginAsync(
                    "Google",
                    $"google_{request.Email}",
                    request.Email,
                    request.FirstName,
                    request.LastName
                );

                if (result.Success)
                {
                    return Ok(new
                    {
                        Token = result.Token,
                        RefreshToken = result.RefreshToken,
                        User = new
                        {
                            result.User?.Id,
                            result.User?.Email,
                            result.User?.FirstName,
                            result.User?.LastName,
                            result.User?.IsEmailVerified
                        }
                    });
                }

                return BadRequest(new { Message = result.Error });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error simulating Google login");
                return StatusCode(500, new { Message = "An error occurred during Google simulation." });
            }
        }

        [HttpPost("simulate-facebook")]
        [AllowAnonymous]
        public async Task<IActionResult> SimulateFacebookLogin([FromBody] SocialLoginRequest request)
        {
            try
            {
                var result = await _socialAuthService.ProcessSocialLoginAsync(
                    "Facebook",
                    $"facebook_{request.Email}",
                    request.Email,
                    request.FirstName,
                    request.LastName
                );

                if (result.Success)
                {
                    return Ok(new
                    {
                        Token = result.Token,
                        RefreshToken = result.RefreshToken,
                        User = new
                        {
                            result.User?.Id,
                            result.User?.Email,
                            result.User?.FirstName,
                            result.User?.LastName,
                            result.User?.IsEmailVerified
                        }
                    });
                }

                return BadRequest(new { Message = result.Error });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error simulating Facebook login");
                return StatusCode(500, new { Message = "An error occurred during Facebook simulation." });
            }
        }
    }

    public class SocialLoginRequest
    {
        public string Email { get; set; } = "";
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
    }
}

