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
        private readonly EffortEstimationService _effortEstimationService;
        private readonly ILogger<AIReviewController> _logger;

        public AIReviewController(
            AIReviewService reviewService,
            LLMClient llmClient,
            EffortEstimationService effortEstimationService,
            ILogger<AIReviewController> logger)
        {
            _reviewService = reviewService;
            _llmClient = llmClient;
            _effortEstimationService = effortEstimationService;
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

        /// <summary>
        /// Obține git diff automat din repository
        /// GET /api/aireview/git-diff
        /// </summary>
        [HttpGet("git-diff")]
        public IActionResult GetGitDiff([FromQuery] bool staged = false)
        {
            try
            {
                _logger.LogInformation("Obținere git diff automat (staged: {Staged})", staged);

                var workingDirectory = Directory.GetCurrentDirectory();
                var gitCommand = staged ? "git diff --staged" : "git diff";

                var processInfo = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = "git",
                    Arguments = staged ? "diff --staged" : "diff",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    WorkingDirectory = workingDirectory
                };

                using var process = System.Diagnostics.Process.Start(processInfo);
                if (process == null)
                {
                    return StatusCode(500, new { success = false, message = "Nu s-a putut porni procesul git" });
                }

                var output = process.StandardOutput.ReadToEnd();
                var error = process.StandardError.ReadToEnd();
                process.WaitForExit();

                if (process.ExitCode != 0)
                {
                    _logger.LogWarning("Git diff a eșuat: {Error}", error);
                    return StatusCode(500, new { success = false, message = $"Git diff a eșuat: {error}" });
                }

                if (string.IsNullOrWhiteSpace(output))
                {
                    return Ok(new { success = true, diff = "", message = "Nu există modificări" });
                }

                return Ok(new { success = true, diff = output });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la obținerea git diff");
                return StatusCode(500, new { success = false, message = $"Eroare: {ex.Message}" });
            }
        }

        /// <summary>
        /// Face review automat pe git diff curent
        /// POST /api/aireview/auto-review-diff
        /// </summary>
        [HttpPost("auto-review-diff")]
        public async Task<IActionResult> AutoReviewGitDiff([FromQuery] bool staged = false)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                _logger.LogInformation("Auto review git diff cerut de utilizatorul {UserId} (staged: {Staged})", userId, staged);

                // Obține git diff
                var workingDirectory = Directory.GetCurrentDirectory();
                var processInfo = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = "git",
                    Arguments = staged ? "diff --staged" : "diff",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    WorkingDirectory = workingDirectory
                };

                using var process = System.Diagnostics.Process.Start(processInfo);
                if (process == null)
                {
                    return StatusCode(500, new { success = false, message = "Nu s-a putut porni procesul git" });
                }

                var gitDiff = process.StandardOutput.ReadToEnd();
                var error = process.StandardError.ReadToEnd();
                process.WaitForExit();

                if (process.ExitCode != 0)
                {
                    _logger.LogWarning("Git diff a eșuat: {Error}", error);
                    return StatusCode(500, new { success = false, message = $"Git diff a eșuat: {error}" });
                }

                if (string.IsNullOrWhiteSpace(gitDiff))
                {
                    return Ok(new
                    {
                        success = true,
                        findings = new List<object>(),
                        effortEstimate = new { hours = 0, complexity = "low", description = "Nu există modificări de revizuit" },
                        message = "Nu există modificări în repository"
                    });
                }

                // Efectuează review pe diff
                var request = new ReviewRequest
                {
                    GitDiff = gitDiff,
                    FileName = "git-diff"
                };

                var result = await _reviewService.PerformReviewAsync(request, userId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la auto review git diff");
                return StatusCode(500, new { success = false, message = $"Eroare: {ex.Message}" });
            }
        }

        /// <summary>
        /// Efectuează review incremental pe baza unui Git repository
        /// POST /api/aireview/incremental
        /// </summary>
        [HttpPost("incremental")]
        public async Task<IActionResult> IncrementalReview([FromBody] IncrementalReviewRequest request)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                _logger.LogInformation("Review incremental cerut pentru repository {Repo}", request.RepositoryPath);

                var result = await _reviewService.PerformIncrementalReviewAsync(
                    request.RepositoryPath,
                    userId,
                    request.BaseRef,
                    request.TargetRef
                );

                if (!result.Success)
                {
                    return BadRequest(result);
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la review-ul incremental");
                return StatusCode(500, new
                {
                    success = false,
                    errorMessage = "A apărut o eroare la review-ul incremental"
                });
            }
        }

        /// <summary>
        /// Efectuează pre-commit review pentru modificările staged
        /// POST /api/aireview/pre-commit
        /// </summary>
        [HttpPost("pre-commit")]
        public async Task<IActionResult> PreCommitReview([FromBody] PreCommitRequest request)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                _logger.LogInformation("Pre-commit review cerut pentru repository {Repo}", request.RepositoryPath);

                var result = await _reviewService.PerformPreCommitReviewAsync(
                    request.RepositoryPath,
                    userId
                );

                if (!result.Success)
                {
                    return BadRequest(result);
                }

                // Returnează status code 400 dacă commit-ul ar trebui blocat
                if (result.ShouldBlockCommit)
                {
                    return BadRequest(result);
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la pre-commit review");
                return StatusCode(500, new
                {
                    success = false,
                    errorMessage = "A apărut o eroare la pre-commit review"
                });
            }
        }

        /// <summary>
        /// Calculează o estimare detaliată a efortului pentru o listă de findings
        /// POST /api/aireview/estimate-effort
        /// </summary>
        [HttpPost("estimate-effort")]
        public IActionResult EstimateEffort([FromBody] EffortEstimationRequest request)
        {
            try
            {
                if (request.Findings == null || !request.Findings.Any())
                {
                    return BadRequest(new { success = false, message = "Lista de findings este goală" });
                }

                _logger.LogInformation("Calculare estimare efort pentru {Count} findings", request.Findings.Count);

                var estimate = _effortEstimationService.CalculateDetailedEffort(request.Findings);

                return Ok(new
                {
                    success = true,
                    estimate
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la calcularea estimării efortului");
                return StatusCode(500, new
                {
                    success = false,
                    message = "Eroare la calcularea estimării"
                });
            }
        }
    }

    #region DTOs for New Endpoints

    public class IncrementalReviewRequest
    {
        public string RepositoryPath { get; set; } = string.Empty;
        public string? BaseRef { get; set; } // Default: HEAD~1
        public string? TargetRef { get; set; } // Default: HEAD
    }

    public class PreCommitRequest
    {
        public string RepositoryPath { get; set; } = string.Empty;
    }

    public class EffortEstimationRequest
    {
        public List<CodeFinding> Findings { get; set; } = new();
    }

    #endregion
}

