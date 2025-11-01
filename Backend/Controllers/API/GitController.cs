using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Backend.Services.Git;

namespace Backend.Controllers.API
{
    /// <summary>
    /// API Controller pentru operații Git (diff-uri, repository info)
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class GitController : ControllerBase
    {
        private readonly GitService _gitService;
        private readonly ILogger<GitController> _logger;

        public GitController(GitService gitService, ILogger<GitController> logger)
        {
            _gitService = gitService;
            _logger = logger;
        }

        /// <summary>
        /// Obține diff-ul între două referințe (commits/branches)
        /// </summary>
        [HttpPost("diff")]
        [AllowAnonymous]
        public IActionResult GetDiff([FromBody] GetDiffRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.RepositoryPath))
                {
                    return BadRequest(new { success = false, message = "RepositoryPath este obligatoriu" });
                }

                var result = _gitService.GetDiff(
                    request.RepositoryPath,
                    request.BaseRef ?? "HEAD~1",
                    request.TargetRef ?? "HEAD"
                );

                if (!result.Success)
                {
                    return BadRequest(new { success = false, message = result.ErrorMessage });
                }

                return Ok(new
                {
                    success = true,
                    diff = result
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la obținerea diff-ului");
                return StatusCode(500, new { success = false, message = "Eroare la obținerea diff-ului" });
            }
        }

        /// <summary>
        /// Obține modificările unstaged (working directory)
        /// </summary>
        [HttpPost("unstaged")]
        [AllowAnonymous]
        public IActionResult GetUnstagedChanges([FromBody] RepositoryPathRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.RepositoryPath))
                {
                    return BadRequest(new { success = false, message = "RepositoryPath este obligatoriu" });
                }

                var result = _gitService.GetUnstagedChanges(request.RepositoryPath);

                if (!result.Success)
                {
                    return BadRequest(new { success = false, message = result.ErrorMessage });
                }

                return Ok(new
                {
                    success = true,
                    changes = result
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la obținerea modificărilor unstaged");
                return StatusCode(500, new { success = false, message = "Eroare la obținerea modificărilor" });
            }
        }

        /// <summary>
        /// Obține modificările staged (index)
        /// </summary>
        [HttpPost("staged")]
        [AllowAnonymous]
        public IActionResult GetStagedChanges([FromBody] RepositoryPathRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.RepositoryPath))
                {
                    return BadRequest(new { success = false, message = "RepositoryPath este obligatoriu" });
                }

                var result = _gitService.GetStagedChanges(request.RepositoryPath);

                if (!result.Success)
                {
                    return BadRequest(new { success = false, message = result.ErrorMessage });
                }

                return Ok(new
                {
                    success = true,
                    changes = result
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la obținerea modificărilor staged");
                return StatusCode(500, new { success = false, message = "Eroare la obținerea modificărilor" });
            }
        }

        /// <summary>
        /// Obține informații despre un repository Git
        /// </summary>
        [HttpPost("info")]
        [AllowAnonymous]
        public IActionResult GetRepositoryInfo([FromBody] RepositoryPathRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.RepositoryPath))
                {
                    return BadRequest(new { success = false, message = "RepositoryPath este obligatoriu" });
                }

                var info = _gitService.GetRepositoryInfo(request.RepositoryPath);

                if (!info.IsValid)
                {
                    return BadRequest(new { success = false, message = info.ErrorMessage });
                }

                return Ok(new
                {
                    success = true,
                    repository = info
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la obținerea informațiilor despre repository");
                return StatusCode(500, new { success = false, message = "Eroare la obținerea informațiilor" });
            }
        }

        /// <summary>
        /// Validează dacă o cale este un repository Git valid
        /// </summary>
        [HttpPost("validate")]
        [AllowAnonymous]
        public IActionResult ValidateRepository([FromBody] RepositoryPathRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.RepositoryPath))
                {
                    return BadRequest(new { success = false, message = "RepositoryPath este obligatoriu" });
                }

                var isValid = _gitService.IsValidRepository(request.RepositoryPath);

                return Ok(new
                {
                    success = true,
                    isValid,
                    message = isValid ? "Repository Git valid" : "Nu este un repository Git valid"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la validarea repository-ului");
                return StatusCode(500, new { success = false, message = "Eroare la validare" });
            }
        }

        /// <summary>
        /// Obține conținutul unui fișier la o anumită referință
        /// </summary>
        [HttpPost("file-content")]
        [AllowAnonymous]
        public IActionResult GetFileContent([FromBody] GetFileContentRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.RepositoryPath) || string.IsNullOrWhiteSpace(request.FilePath))
                {
                    return BadRequest(new { success = false, message = "RepositoryPath și FilePath sunt obligatorii" });
                }

                var content = _gitService.GetFileContentAtRef(
                    request.RepositoryPath,
                    request.FilePath,
                    request.GitRef ?? "HEAD"
                );

                if (content == null)
                {
                    return NotFound(new { success = false, message = "Fișierul nu a fost găsit" });
                }

                return Ok(new
                {
                    success = true,
                    content,
                    filePath = request.FilePath,
                    gitRef = request.GitRef ?? "HEAD"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la obținerea conținutului fișierului");
                return StatusCode(500, new { success = false, message = "Eroare la obținerea conținutului" });
            }
        }
    }

    #region DTOs

    public class GetDiffRequest
    {
        public string RepositoryPath { get; set; } = string.Empty;
        public string? BaseRef { get; set; } // Default: HEAD~1
        public string? TargetRef { get; set; } // Default: HEAD
    }

    public class RepositoryPathRequest
    {
        public string RepositoryPath { get; set; } = string.Empty;
    }

    public class GetFileContentRequest
    {
        public string RepositoryPath { get; set; } = string.Empty;
        public string FilePath { get; set; } = string.Empty;
        public string? GitRef { get; set; } // Default: HEAD
    }

    #endregion
}

