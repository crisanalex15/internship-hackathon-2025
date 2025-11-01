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
                _logger.LogInformation("Applying patch to content (length: {ContentLength})", content.Length);
                _logger.LogDebug("Patch content: {Patch}", patch);
                
                var contentLines = content.Split('\n').ToList();
                var patchLines = patch.Split('\n');
                
                int currentContentLine = 0;
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
                
                // Find @@ header to get line numbers
                int? startLine = null;
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
                        // old_start is 1-indexed in git diff, but we use 0-indexed lists
                        startLine = int.Parse(headerMatch.Groups[1].Value) - 1;
                        _logger.LogInformation("Found patch start line: {StartLine} (1-indexed: {OneIndexed})", 
                            startLine, startLine + 1);
                    }
                    patchLineIndex++;
                }
                
                // If no @@ header, try simple approach
                if (startLine == null)
                {
                    _logger.LogWarning("No @@ header found in patch, using simple replacement");
                    
                    // Extract old and new code blocks
                    var oldLines = new List<string>();
                    var newLines = new List<string>();
                    
                    foreach (var line in patchLines)
                    {
                        if (line.StartsWith('-') && !line.StartsWith("---"))
                        {
                            oldLines.Add(line.Substring(1));
                        }
                        else if (line.StartsWith('+') && !line.StartsWith("+++"))
                        {
                            newLines.Add(line.Substring(1));
                        }
                    }
                    
                    if (oldLines.Count == 0 && newLines.Count > 0)
                    {
                        // Pure addition
                        var newCode = string.Join("\n", newLines);
                        return content + (content.EndsWith("\n") ? "" : "\n") + newCode;
                    }
                    
                    // Try to find and replace the old code block
                    var oldCodeBlock = string.Join("\n", oldLines);
                    var newCodeBlock = string.Join("\n", newLines);
                    
                    if (content.Contains(oldCodeBlock))
                    {
                        return content.Replace(oldCodeBlock, newCodeBlock);
                    }
                    
                    // Try with exact line matches
                    var contentLinesList = contentLines;
                    for (int i = 0; i <= contentLinesList.Count - oldLines.Count; i++)
                    {
                        bool matches = true;
                        for (int j = 0; j < oldLines.Count; j++)
                        {
                            if (i + j >= contentLinesList.Count || 
                                contentLinesList[i + j].TrimEnd() != oldLines[j].TrimEnd())
                            {
                                matches = false;
                                break;
                            }
                        }
                        
                        if (matches)
                        {
                            // Found match, replace it
                            contentLinesList.RemoveRange(i, oldLines.Count);
                            contentLinesList.InsertRange(i, newLines);
                            return string.Join("\n", contentLinesList);
                        }
                    }
                    
                    _logger.LogWarning("Could not find old code block in content");
                    return null;
                }
                
                // Apply patch using line numbers
                var resultLines = new List<string>(contentLines);
                int contentIndex = Math.Max(0, Math.Min(startLine.Value, resultLines.Count));
                int linesRemoved = 0;
                
                _logger.LogInformation("Starting patch application at line index {ContentIndex}", contentIndex);
                
                // Process patch lines
                for (int i = patchLineIndex; i < patchLines.Length; i++)
                {
                    var line = patchLines[i];
                    
                    if (string.IsNullOrWhiteSpace(line) || line.StartsWith("\\"))
                        continue;
                    
                    if (line.StartsWith('-') && !line.StartsWith("---"))
                    {
                        // Remove line
                        var lineToRemove = line.Substring(1);
                        
                        if (contentIndex < resultLines.Count)
                        {
                            // Try exact match first
                            if (resultLines[contentIndex].TrimEnd() == lineToRemove.TrimEnd())
                            {
                                resultLines.RemoveAt(contentIndex);
                                linesRemoved++;
                                _logger.LogDebug("Removed line {Index}: {Line}", contentIndex, lineToRemove);
                            }
                            else
                            {
                                // Try to find the line nearby
                                bool found = false;
                                for (int j = Math.Max(0, contentIndex - 3); 
                                     j < Math.Min(resultLines.Count, contentIndex + 10); 
                                     j++)
                                {
                                    if (resultLines[j].TrimEnd() == lineToRemove.TrimEnd())
                                    {
                                        resultLines.RemoveAt(j);
                                        contentIndex = j;
                                        linesRemoved++;
                                        found = true;
                                        _logger.LogDebug("Removed line {Index} (found nearby): {Line}", j, lineToRemove);
                                        break;
                                    }
                                }
                                
                                if (!found)
                                {
                                    _logger.LogWarning("Could not find line to remove: {Line}", lineToRemove);
                                    // Skip this line
                                    continue;
                                }
                            }
                        }
                        else
                        {
                            _logger.LogWarning("Content index {Index} out of range (max: {Max})", 
                                contentIndex, resultLines.Count);
                        }
                    }
                    else if (line.StartsWith('+') && !line.StartsWith("+++"))
                    {
                        // Add line
                        var lineToAdd = line.Substring(1);
                        resultLines.Insert(contentIndex, lineToAdd);
                        contentIndex++;
                        _logger.LogDebug("Added line at {Index}: {Line}", contentIndex - 1, lineToAdd);
                    }
                    else if (!line.StartsWith('@'))
                    {
                        // Context line - advance index
                        contentIndex++;
                    }
                }
                
                var result = string.Join("\n", resultLines);
                
                if (result != content)
                {
                    _logger.LogInformation("Patch applied successfully. Lines removed: {Removed}, Content length changed: {OldLen} -> {NewLen}", 
                        linesRemoved, content.Length, result.Length);
                    return result;
                }
                else
                {
                    _logger.LogWarning("Patch application resulted in no changes");
                    return null;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error applying patch");
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

