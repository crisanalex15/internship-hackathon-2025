using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Backend.Services.AI;
using Backend.DTO.ReviewDTO;
using System.Security.Claims;

namespace Backend.Controllers.API
{
    /// <summary>
    /// Controller pentru AI Code Review
    /// Oferă endpoint-uri pentru review automat de cod folosind LLM local
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class AIReviewController : ControllerBase
    {
        private readonly AIReviewService _reviewService;
        private readonly LLMClient _llmClient;
        private readonly ILogger<AIReviewController> _logger;

        public AIReviewController(
            AIReviewService reviewService,
            LLMClient llmClient,
            ILogger<AIReviewController> logger)
        {
            _reviewService = reviewService;
            _llmClient = llmClient;
            _logger = logger;
        }

        /// <summary>
        /// Efectuează un code review complet
        /// POST /api/aireview
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> PerformReview([FromBody] ReviewRequest request)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                _logger.LogInformation("Code review cerut de utilizatorul {UserId}", userId);

                var result = await _reviewService.PerformReviewAsync(request, userId);

                if (!result.Success)
                {
                    return BadRequest(result);
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la procesarea cererii de review");
                return StatusCode(500, new
                {
                    success = false,
                    errorMessage = "A apărut o eroare la procesarea review-ului"
                });
            }
        }

        /// <summary>
        /// Aplică un fix/patch la un fișier
        /// POST /api/aireview/apply-fix
        /// </summary>
        [HttpPost("apply-fix")]
        public async Task<IActionResult> ApplyFix([FromBody] ApplyFixRequest request)
        {
            try
            {
                _logger.LogInformation("Cerere de aplicare fix pentru {File}", request.FilePath);

                var result = await _reviewService.ApplyFixAsync(request);

                if (!result.Success)
                {
                    return BadRequest(result);
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la aplicarea fix-ului");
                return StatusCode(500, new
                {
                    success = false,
                    message = "A apărut o eroare la aplicarea fix-ului"
                });
            }
        }

        /// <summary>
        /// Obține istoricul review-urilor utilizatorului
        /// GET /api/aireview/history
        /// </summary>
        [HttpGet("history")]
        public async Task<IActionResult> GetHistory([FromQuery] int limit = 50)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var history = await _reviewService.GetReviewHistoryAsync(userId, limit);
                return Ok(history);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la obținerea istoricului");
                return StatusCode(500, new { message = "Eroare la obținerea istoricului" });
            }
        }

        /// <summary>
        /// Obține detalii despre un review specific
        /// GET /api/aireview/{id}
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetReviewById(int id)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var review = await _reviewService.GetReviewByIdAsync(id, userId);

                if (review == null)
                {
                    return NotFound(new { message = "Review nu a fost găsit" });
                }

                return Ok(review);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la obținerea detaliilor review-ului");
                return StatusCode(500, new { message = "Eroare la obținerea detaliilor" });
            }
        }

        /// <summary>
        /// Cere explicații detaliate pentru un finding specific
        /// POST /api/aireview/explain
        /// </summary>
        [HttpPost("explain")]
        public async Task<IActionResult> ExplainFinding([FromBody] CodeFinding finding)
        {
            try
            {
                _logger.LogInformation("Cerere de explicații pentru finding");

                var explanation = await _reviewService.ExplainFindingAsync(finding);

                return Ok(new
                {
                    success = true,
                    explanation = explanation
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la obținerea explicațiilor");
                return StatusCode(500, new
                {
                    success = false,
                    message = "Eroare la obținerea explicațiilor"
                });
            }
        }

        /// <summary>
        /// Verifică status-ul serviciului Ollama
        /// GET /api/aireview/status
        /// </summary>
        [HttpGet("status")]
        [AllowAnonymous] // Poate fi accesat fără autentificare pentru debugging
        public async Task<IActionResult> GetStatus()
        {
            try
            {
                var isHealthy = await _llmClient.CheckHealthAsync();
                var models = await _llmClient.GetAvailableModelsAsync();

                return Ok(new
                {
                    status = isHealthy ? "healthy" : "unavailable",
                    message = isHealthy
                        ? "Ollama este disponibil și funcțional"
                        : "Ollama nu este disponibil. Asigură-te că rulează pe http://localhost:11434",
                    availableModels = models,
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la verificarea status-ului Ollama");
                return Ok(new
                {
                    status = "error",
                    message = $"Eroare la verificarea status-ului: {ex.Message}",
                    availableModels = new List<string>(),
                    timestamp = DateTime.UtcNow
                });
            }
        }
    }
}

