using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace Backend.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class CodeFileController : ControllerBase
    {
        private readonly ILogger<CodeFileController> _logger;
        private readonly string _tempDirectory;

        public CodeFileController(ILogger<CodeFileController> logger, IWebHostEnvironment environment)
        {
            _logger = logger;
            _tempDirectory = Path.Combine(environment.ContentRootPath, "TempFiles");
            
            // Ensure temp directory exists
            if (!Directory.Exists(_tempDirectory))
            {
                Directory.CreateDirectory(_tempDirectory);
            }
        }

        private string GetUserTempDir()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "anonymous";
            var userDir = Path.Combine(_tempDirectory, userId);
            
            if (!Directory.Exists(userDir))
            {
                Directory.CreateDirectory(userDir);
            }
            
            return userDir;
        }

        /// <summary>
        /// Creează un nou fișier temp pentru review
        /// </summary>
        [HttpPost("create")]
        public async Task<IActionResult> CreateTempFile([FromBody] CreateFileRequest request)
        {
            try
            {
                var userDir = GetUserTempDir();
                var fileId = Guid.NewGuid().ToString();
                
                // Salvează fișierul original
                var originalPath = Path.Combine(userDir, $"{fileId}_original.txt");
                await System.IO.File.WriteAllTextAsync(originalPath, request.Content);
                
                // Salvează fișierul curent (inițial = original)
                var currentPath = Path.Combine(userDir, $"{fileId}_current.txt");
                await System.IO.File.WriteAllTextAsync(currentPath, request.Content);
                
                return Ok(new
                {
                    fileId = fileId,
                    fileName = request.FileName,
                    originalPath = originalPath,
                    currentPath = currentPath
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating temp file");
                return StatusCode(500, new { message = "Eroare la crearea fișierului temporar" });
            }
        }

        /// <summary>
        /// Citește conținutul fișierului curent
        /// </summary>
        [HttpGet("{fileId}/current")]
        public async Task<IActionResult> GetCurrentContent(string fileId)
        {
            try
            {
                var userDir = GetUserTempDir();
                var currentPath = Path.Combine(userDir, $"{fileId}_current.txt");
                
                if (!System.IO.File.Exists(currentPath))
                {
                    return NotFound(new { message = "Fișierul nu a fost găsit" });
                }
                
                var content = await System.IO.File.ReadAllTextAsync(currentPath);
                return Ok(new { content = content });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error reading current file");
                return StatusCode(500, new { message = "Eroare la citirea fișierului" });
            }
        }

        /// <summary>
        /// Citește conținutul fișierului original
        /// </summary>
        [HttpGet("{fileId}/original")]
        public async Task<IActionResult> GetOriginalContent(string fileId)
        {
            try
            {
                var userDir = GetUserTempDir();
                var originalPath = Path.Combine(userDir, $"{fileId}_original.txt");
                
                if (!System.IO.File.Exists(originalPath))
                {
                    return NotFound(new { message = "Fișierul nu a fost găsit" });
                }
                
                var content = await System.IO.File.ReadAllTextAsync(originalPath);
                return Ok(new { content = content });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error reading original file");
                return StatusCode(500, new { message = "Eroare la citirea fișierului" });
            }
        }

        /// <summary>
        /// Actualizează fișierul curent
        /// </summary>
        [HttpPost("{fileId}/update")]
        public async Task<IActionResult> UpdateCurrentContent(string fileId, [FromBody] UpdateContentRequest request)
        {
            try
            {
                var userDir = GetUserTempDir();
                var currentPath = Path.Combine(userDir, $"{fileId}_current.txt");
                
                if (!System.IO.File.Exists(currentPath))
                {
                    return NotFound(new { message = "Fișierul nu a fost găsit" });
                }
                
                await System.IO.File.WriteAllTextAsync(currentPath, request.Content);
                
                return Ok(new { message = "Fișierul a fost actualizat", success = true });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating file");
                return StatusCode(500, new { message = "Eroare la actualizarea fișierului" });
            }
        }

        /// <summary>
        /// Aplică un patch pe fișierul curent
        /// </summary>
        [HttpPost("{fileId}/apply-patch")]
        public async Task<IActionResult> ApplyPatch(string fileId, [FromBody] ApplyPatchRequest request)
        {
            try
            {
                var userDir = GetUserTempDir();
                var currentPath = Path.Combine(userDir, $"{fileId}_current.txt");
                
                if (!System.IO.File.Exists(currentPath))
                {
                    return NotFound(new { message = "Fișierul nu a fost găsit" });
                }
                
                var currentContent = await System.IO.File.ReadAllTextAsync(currentPath);
                
                // Parse patch și aplică modificările
                var updatedContent = ApplyPatchToContent(currentContent, request.Patch);
                
                if (updatedContent == null)
                {
                    return BadRequest(new { message = "Nu s-a putut aplica patch-ul. Codul poate fi deja modificat." });
                }
                
                // Salvează conținutul modificat
                await System.IO.File.WriteAllTextAsync(currentPath, updatedContent);
                
                return Ok(new 
                { 
                    message = "Patch aplicat cu succes", 
                    success = true,
                    updatedContent = updatedContent
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error applying patch");
                return StatusCode(500, new { message = "Eroare la aplicarea patch-ului" });
            }
        }

        /// <summary>
        /// Obține diff-ul între original și current
        /// </summary>
        [HttpGet("{fileId}/diff")]
        public async Task<IActionResult> GetDiff(string fileId)
        {
            try
            {
                var userDir = GetUserTempDir();
                var originalPath = Path.Combine(userDir, $"{fileId}_original.txt");
                var currentPath = Path.Combine(userDir, $"{fileId}_current.txt");
                
                if (!System.IO.File.Exists(originalPath) || !System.IO.File.Exists(currentPath))
                {
                    return NotFound(new { message = "Fișierele nu au fost găsite" });
                }
                
                var originalContent = await System.IO.File.ReadAllTextAsync(originalPath);
                var currentContent = await System.IO.File.ReadAllTextAsync(currentPath);
                
                var hasChanges = originalContent != currentContent;
                
                return Ok(new 
                { 
                    originalContent = originalContent,
                    currentContent = currentContent,
                    hasChanges = hasChanges
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting diff");
                return StatusCode(500, new { message = "Eroare la obținerea diff-ului" });
            }
        }

        /// <summary>
        /// Reset fișierul curent la original
        /// </summary>
        [HttpPost("{fileId}/reset")]
        public async Task<IActionResult> ResetToOriginal(string fileId)
        {
            try
            {
                var userDir = GetUserTempDir();
                var originalPath = Path.Combine(userDir, $"{fileId}_original.txt");
                var currentPath = Path.Combine(userDir, $"{fileId}_current.txt");
                
                if (!System.IO.File.Exists(originalPath))
                {
                    return NotFound(new { message = "Fișierul original nu a fost găsit" });
                }
                
                var originalContent = await System.IO.File.ReadAllTextAsync(originalPath);
                await System.IO.File.WriteAllTextAsync(currentPath, originalContent);
                
                return Ok(new 
                { 
                    message = "Fișierul a fost resetat la versiunea originală", 
                    success = true,
                    content = originalContent
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resetting file");
                return StatusCode(500, new { message = "Eroare la resetarea fișierului" });
            }
        }

        /// <summary>
        /// Șterge fișierele temp pentru un fileId
        /// </summary>
        [HttpDelete("{fileId}")]
        public IActionResult DeleteTempFiles(string fileId)
        {
            try
            {
                var userDir = GetUserTempDir();
                var originalPath = Path.Combine(userDir, $"{fileId}_original.txt");
                var currentPath = Path.Combine(userDir, $"{fileId}_current.txt");
                
                if (System.IO.File.Exists(originalPath))
                {
                    System.IO.File.Delete(originalPath);
                }
                
                if (System.IO.File.Exists(currentPath))
                {
                    System.IO.File.Delete(currentPath);
                }
                
                return Ok(new { message = "Fișierele au fost șterse", success = true });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting files");
                return StatusCode(500, new { message = "Eroare la ștergerea fișierelor" });
            }
        }

        private string? ApplyPatchToContent(string content, string patch)
        {
            try
            {
                // Parse patch lines
                var patchLines = patch.Split('\n');
                var linesToRemove = new List<string>();
                var linesToAdd = new List<string>();
                
                foreach (var line in patchLines)
                {
                    if (line.StartsWith('-') && !line.StartsWith("---"))
                    {
                        linesToRemove.Add(line.Substring(1));
                    }
                    else if (line.StartsWith('+') && !line.StartsWith("+++"))
                    {
                        linesToAdd.Add(line.Substring(1));
                    }
                }
                
                // Apply changes
                var updatedContent = content;
                
                // Remove old lines
                foreach (var lineToRemove in linesToRemove)
                {
                    updatedContent = updatedContent.Replace(lineToRemove, "");
                }
                
                // Add new lines at the same position
                if (linesToRemove.Count > 0 && linesToAdd.Count > 0)
                {
                    var searchFor = string.Join("", linesToRemove);
                    var replaceWith = string.Join("\n", linesToAdd);
                    
                    if (content.Contains(searchFor))
                    {
                        updatedContent = content.Replace(searchFor, replaceWith);
                    }
                    else
                    {
                        // Try without exact match
                        var oldCode = string.Join("\n", linesToRemove);
                        var newCode = string.Join("\n", linesToAdd);
                        updatedContent = content.Replace(oldCode, newCode);
                    }
                }
                
                return updatedContent != content ? updatedContent : null;
            }
            catch
            {
                return null;
            }
        }
    }

    public class CreateFileRequest
    {
        public string FileName { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
    }

    public class UpdateContentRequest
    {
        public string Content { get; set; } = string.Empty;
    }

    public class ApplyPatchRequest
    {
        public string Patch { get; set; } = string.Empty;
    }
}

