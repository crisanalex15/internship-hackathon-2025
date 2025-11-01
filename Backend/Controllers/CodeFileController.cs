using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace Backend.Controllers
{
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
            // Try to get authenticated user ID, fallback to anonymous if not authenticated
            var userId = User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "anonymous";
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
        /// Descarcă fișierul curent (cu fix-urile aplicate)
        /// </summary>
        [HttpGet("{fileId}/download")]
        public async Task<IActionResult> DownloadFile(string fileId, [FromQuery] string? fileName = null)
        {
            try
            {
                var userDir = GetUserTempDir();
                var currentPath = Path.Combine(userDir, $"{fileId}_current.txt");
                
                if (!System.IO.File.Exists(currentPath))
                {
                    return NotFound(new { message = "Fișierul nu a fost găsit" });
                }
                
                var content = await System.IO.File.ReadAllBytesAsync(currentPath);
                var downloadFileName = fileName ?? $"fixed_{fileId}.txt";
                
                return File(content, "text/plain", downloadFileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error downloading file");
                return StatusCode(500, new { message = "Eroare la descărcarea fișierului" });
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
                _logger.LogInformation("Aplicare patch pe conținut (lungime: {ContentLength})", content.Length);
                _logger.LogDebug("Conținut patch: {Patch}", patch);
                
                // Normalizare line endings
                content = content.Replace("\r\n", "\n");
                patch = patch.Replace("\r\n", "\n");
                
                var contentLines = content.Split('\n').ToList();
                var patchLines = patch.Split('\n');
                
                // Extrage liniile vechi și noi din patch
                var oldLines = new List<string>();
                var newLines = new List<string>();
                int? startLineNumber = null;
                
                int patchLineIndex = 0;
                
                // Skip header lines (---, +++, diff, index)
                while (patchLineIndex < patchLines.Length && 
                       (patchLines[patchLineIndex].StartsWith("---") || 
                        patchLines[patchLineIndex].StartsWith("+++") ||
                        patchLines[patchLineIndex].StartsWith("diff") ||
                        patchLines[patchLineIndex].StartsWith("index")))
                {
                    patchLineIndex++;
                }
                
                // Găsește header-ul @@
                while (patchLineIndex < patchLines.Length && !patchLines[patchLineIndex].StartsWith("@@"))
                {
                    patchLineIndex++;
                }
                
                if (patchLineIndex < patchLines.Length)
                {
                    // Parse @@ -old_start,old_count +new_start,new_count @@
                    var headerMatch = System.Text.RegularExpressions.Regex.Match(
                        patchLines[patchLineIndex],
                        @"@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@"
                    );
                    
                    if (headerMatch.Success)
                    {
                        startLineNumber = int.Parse(headerMatch.Groups[1].Value) - 1; // 0-indexed
                        _logger.LogInformation("Start line din patch: {StartLine} (1-indexed: {OneIndexed})", 
                            startLineNumber, startLineNumber + 1);
                    }
                    patchLineIndex++;
                }
                
                // Extrage liniile din patch
                for (int i = patchLineIndex; i < patchLines.Length; i++)
                {
                    var line = patchLines[i];
                    
                    if (string.IsNullOrWhiteSpace(line) || line.StartsWith("\\"))
                        continue;
                    
                    if (line.StartsWith('-') && !line.StartsWith("---"))
                    {
                        oldLines.Add(line.Substring(1));
                    }
                    else if (line.StartsWith('+') && !line.StartsWith("+++"))
                    {
                        newLines.Add(line.Substring(1));
                    }
                    else if (!line.StartsWith('@'))
                    {
                        // Context line
                        oldLines.Add(line.StartsWith(" ") ? line.Substring(1) : line);
                        newLines.Add(line.StartsWith(" ") ? line.Substring(1) : line);
                    }
                }
                
                _logger.LogInformation("Patch extras: {OldLines} linii vechi, {NewLines} linii noi", 
                    oldLines.Count, newLines.Count);
                
                // Dacă nu avem linii vechi, este o adăugare pură
                if (oldLines.Count == 0 && newLines.Count > 0)
                {
                    _logger.LogInformation("Adăugare pură de cod nou");
                    var newCode = string.Join("\n", newLines);
                    return content + (content.EndsWith("\n") ? "" : "\n") + newCode;
                }
                
                // Dacă patch-ul nu are formatul standard, încearcă înlocuire simplă
                if (oldLines.Count == 0 && newLines.Count == 0)
                {
                    _logger.LogWarning("Patch fără format standard, încerc interpretare directă");
                    // Patch-ul poate fi doar codul nou, nu un diff
                    var cleanPatch = patch.Trim();
                    if (!string.IsNullOrEmpty(cleanPatch))
                    {
                        return content + (content.EndsWith("\n") ? "" : "\n") + cleanPatch;
                    }
                    return null;
                }
                
                // Încearcă mai întâi cu numerele de linie dacă le avem
                if (startLineNumber.HasValue && startLineNumber.Value >= 0 && 
                    startLineNumber.Value < contentLines.Count)
                {
                    _logger.LogInformation("Încerc aplicare cu numere de linie");
                    var resultLines = new List<string>(contentLines);
                    
                    // Verifică dacă liniile vechi se potrivesc la poziția indicată
                    bool matchesAtPosition = true;
                    for (int i = 0; i < oldLines.Count && matchesAtPosition; i++)
                    {
                        int lineIdx = startLineNumber.Value + i;
                        if (lineIdx >= resultLines.Count || 
                            resultLines[lineIdx].TrimEnd() != oldLines[i].TrimEnd())
                        {
                            matchesAtPosition = false;
                        }
                    }
                    
                    if (matchesAtPosition)
                    {
                        resultLines.RemoveRange(startLineNumber.Value, oldLines.Count);
                        resultLines.InsertRange(startLineNumber.Value, newLines);
                        _logger.LogInformation("Patch aplicat cu succes folosind numerele de linie");
                        return string.Join("\n", resultLines);
                    }
                }
                
                // Fallback: caută bloc de cod în tot fișierul
                _logger.LogInformation("Caut blocul de cod vechi în tot fișierul");
                var oldCodeBlock = string.Join("\n", oldLines);
                var newCodeBlock = string.Join("\n", newLines);
                
                // Încearcă înlocuire directă
                if (content.Contains(oldCodeBlock))
                {
                    _logger.LogInformation("Găsit bloc de cod pentru înlocuire directă");
                    return content.Replace(oldCodeBlock, newCodeBlock);
                }
                
                // Încearcă cu potrivire linie cu linie
                for (int i = 0; i <= contentLines.Count - oldLines.Count; i++)
                {
                    bool matches = true;
                    for (int j = 0; j < oldLines.Count; j++)
                    {
                        if (i + j >= contentLines.Count || 
                            contentLines[i + j].TrimEnd() != oldLines[j].TrimEnd())
                        {
                            matches = false;
                            break;
                        }
                    }
                    
                    if (matches)
                    {
                        var resultLines = new List<string>(contentLines);
                        resultLines.RemoveRange(i, oldLines.Count);
                        resultLines.InsertRange(i, newLines);
                        _logger.LogInformation("Patch aplicat cu succes prin căutare linie cu linie la poziția {Pos}", i);
                        return string.Join("\n", resultLines);
                    }
                }
                
                // Încearcă o potrivire mai flexibilă (ignoră whitespace-ul de la început/sfârșit)
                _logger.LogInformation("Încerc potrivire flexibilă");
                for (int i = 0; i <= contentLines.Count - oldLines.Count; i++)
                {
                    bool matches = true;
                    for (int j = 0; j < oldLines.Count; j++)
                    {
                        if (i + j >= contentLines.Count || 
                            contentLines[i + j].Trim() != oldLines[j].Trim())
                        {
                            matches = false;
                            break;
                        }
                    }
                    
                    if (matches)
                    {
                        var resultLines = new List<string>(contentLines);
                        resultLines.RemoveRange(i, oldLines.Count);
                        resultLines.InsertRange(i, newLines);
                        _logger.LogInformation("Patch aplicat cu succes prin potrivire flexibilă la poziția {Pos}", i);
                        return string.Join("\n", resultLines);
                    }
                }
                
                _logger.LogWarning("Nu s-a putut aplica patch-ul - codul vechi nu a fost găsit în conținut");
                _logger.LogDebug("Căutat: {OldBlock}", oldCodeBlock);
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la aplicarea patch-ului");
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

