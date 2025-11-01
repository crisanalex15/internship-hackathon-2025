using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authentication.JwtBearer;

namespace Backend.Controllers.API
{
    [ApiController]
    [Route("api/[controller]")]
    public class HealthController : ControllerBase
    {
        [HttpGet]
        [AllowAnonymous]
        public IActionResult Get()
        {
            return Ok(new
            {
                status = "healthy",
                timestamp = DateTime.UtcNow,
                message = "Backend is running successfully"
            });
        }

        [HttpGet("protected")]
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        public IActionResult GetProtected()
        {
            return Ok(new
            {
                status = "protected",
                timestamp = DateTime.UtcNow,
                message = "This endpoint requires authentication",
                user = User.Identity?.Name,
                isAuthenticated = User.Identity?.IsAuthenticated ?? false
            });
        }
    }
}

