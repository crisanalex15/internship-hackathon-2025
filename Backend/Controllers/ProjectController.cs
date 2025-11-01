using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Backend.Areas.Identity.Data;
using Backend.Models;
using System.Security.Cryptography;
using System.Text;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProjectController : ControllerBase
    {
        private readonly AuthDbContext _context;
        private readonly ILogger<ProjectController> _logger;

        public ProjectController(AuthDbContext context, ILogger<ProjectController> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Obține toate proiectele (public search)
        /// </summary>
        [HttpGet("search")]
        [AllowAnonymous]
        public async Task<IActionResult> SearchProjects([FromQuery] string? query = null)
        {
            try
            {
                var projects = _context.Projects
                    .Where(p => p.IsPublic || p.Password == null)
                    .Include(p => p.Files)
                    .Select(p => new
                    {
                        p.Id,
                        p.Name,
                        p.Description,
                        p.OwnerId,
                        p.IsPublic,
                        p.CreatedAt,
                        p.Tags,
                        p.ReviewCount,
                        FileCount = p.Files.Count,
                        Files = p.Files.Select(f => new
                        {
                            f.Id,
                            f.FileName,
                            f.FilePath,
                            f.Language
                        }).ToList()
                    })
                    .AsQueryable();

                // Search by name, description, or tags
                if (!string.IsNullOrWhiteSpace(query))
                {
                    var searchTerm = query.ToLower();
                    projects = projects.Where(p =>
                        p.Name.ToLower().Contains(searchTerm) ||
                        (p.Description != null && p.Description.ToLower().Contains(searchTerm)) ||
                        (p.Tags != null && p.Tags.ToLower().Contains(searchTerm))
                    );
                }

                var results = await projects
                    .OrderByDescending(p => p.CreatedAt)
                    .ToListAsync();

                return Ok(new { success = true, projects = results });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching projects");
                return StatusCode(500, new { success = false, message = "Eroare la căutarea proiectelor" });
            }
        }

        /// <summary>
        /// Verifică parola proiectului pentru acces
        /// </summary>
        [HttpPost("{projectId}/verify-password")]
        [AllowAnonymous]
        public async Task<IActionResult> VerifyPassword(int projectId, [FromBody] VerifyPasswordRequest request)
        {
            try
            {
                var project = await _context.Projects.FindAsync(projectId);
                if (project == null)
                {
                    return NotFound(new { success = false, message = "Proiectul nu a fost găsit" });
                }

                // Dacă e public, nu e nevoie de parolă
                if (project.IsPublic || string.IsNullOrEmpty(project.Password))
                {
                    return Ok(new { success = true, hasAccess = true });
                }

                // Verifică parola (hash-uită)
                var hashedPassword = HashPassword(request.Password);
                var hasAccess = project.Password == hashedPassword;

                return Ok(new { success = true, hasAccess });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error verifying password");
                return StatusCode(500, new { success = false, message = "Eroare la verificarea parolei" });
            }
        }

        /// <summary>
        /// Obține detaliile unui proiect (cu fișiere)
        /// </summary>
        [HttpGet("{projectId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetProject(int projectId, [FromQuery] string? password = null)
        {
            try
            {
                var project = await _context.Projects
                    .Include(p => p.Files)
                    .FirstOrDefaultAsync(p => p.Id == projectId);

                if (project == null)
                {
                    return NotFound(new { success = false, message = "Proiectul nu a fost găsit" });
                }

                // Verifică accesul pentru proiecte protejate
                if (!project.IsPublic && !string.IsNullOrEmpty(project.Password))
                {
                    if (string.IsNullOrEmpty(password))
                    {
                        return Unauthorized(new { success = false, message = "Parolă necesară", requiresPassword = true });
                    }

                    var hashedPassword = HashPassword(password);
                    if (project.Password != hashedPassword)
                    {
                        return Unauthorized(new { success = false, message = "Parolă incorectă" });
                    }
                }

                var result = new
                {
                    project.Id,
                    project.Name,
                    project.Description,
                    project.OwnerId,
                    project.IsPublic,
                    project.CreatedAt,
                    project.LastModifiedAt,
                    project.Tags,
                    project.ReviewCount,
                    Files = project.Files.Select(f => new
                    {
                        f.Id,
                        f.FileName,
                        f.FilePath,
                        f.Language,
                        f.Content,
                        f.CreatedAt,
                        f.LastModifiedAt
                    }).ToList()
                };

                return Ok(new { success = true, project = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting project");
                return StatusCode(500, new { success = false, message = "Eroare la obținerea proiectului" });
            }
        }

        /// <summary>
        /// Creează un nou proiect
        /// </summary>
        [HttpPost("create")]
        [Authorize]
        public async Task<IActionResult> CreateProject([FromBody] CreateProjectRequest request)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { success = false, message = "Utilizator neautentificat" });
                }

                var project = new Project
                {
                    Name = request.Name,
                    Description = request.Description,
                    OwnerId = userId,
                    IsPublic = request.IsPublic ?? false,
                    Password = request.IsPublic == true || string.IsNullOrEmpty(request.Password)
                        ? null
                        : HashPassword(request.Password),
                    Tags = request.Tags,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Projects.Add(project);
                await _context.SaveChangesAsync();

                // Adaugă fișierele
                if (request.Files != null && request.Files.Any())
                {
                    foreach (var file in request.Files)
                    {
                        var projectFile = new ProjectFile
                        {
                            ProjectId = project.Id,
                            FileName = file.FileName,
                            FilePath = file.FilePath,
                            Content = file.Content,
                            Language = file.Language,
                            CreatedAt = DateTime.UtcNow
                        };
                        _context.ProjectFiles.Add(projectFile);
                    }
                    await _context.SaveChangesAsync();
                }

                return Ok(new { success = true, projectId = project.Id, message = "Proiect creat cu succes" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating project");
                return StatusCode(500, new { success = false, message = "Eroare la crearea proiectului" });
            }
        }

        /// <summary>
        /// Actualizează un proiect existent
        /// </summary>
        [HttpPut("{projectId}")]
        [Authorize]
        public async Task<IActionResult> UpdateProject(int projectId, [FromBody] UpdateProjectRequest request)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var project = await _context.Projects.FindAsync(projectId);

                if (project == null)
                {
                    return NotFound(new { success = false, message = "Proiectul nu a fost găsit" });
                }

                if (project.OwnerId != userId)
                {
                    return Forbid("Nu ai permisiunea să modifici acest proiect");
                }

                project.Name = request.Name ?? project.Name;
                project.Description = request.Description ?? project.Description;
                project.IsPublic = request.IsPublic ?? project.IsPublic;
                project.Tags = request.Tags ?? project.Tags;
                project.LastModifiedAt = DateTime.UtcNow;

                if (!string.IsNullOrEmpty(request.Password))
                {
                    project.Password = HashPassword(request.Password);
                }

                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Proiect actualizat cu succes" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating project");
                return StatusCode(500, new { success = false, message = "Eroare la actualizarea proiectului" });
            }
        }

        /// <summary>
        /// Șterge un proiect
        /// </summary>
        [HttpDelete("{projectId}")]
        [Authorize]
        public async Task<IActionResult> DeleteProject(int projectId)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var project = await _context.Projects
                    .Include(p => p.Files)
                    .FirstOrDefaultAsync(p => p.Id == projectId);

                if (project == null)
                {
                    return NotFound(new { success = false, message = "Proiectul nu a fost găsit" });
                }

                if (project.OwnerId != userId)
                {
                    return Forbid("Nu ai permisiunea să ștergi acest proiect");
                }

                // Șterge fișierele
                _context.ProjectFiles.RemoveRange(project.Files);
                _context.Projects.Remove(project);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Proiect șters cu succes" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting project");
                return StatusCode(500, new { success = false, message = "Eroare la ștergerea proiectului" });
            }
        }

        /// <summary>
        /// Obține proiectele utilizatorului curent
        /// </summary>
        [HttpGet("my-projects")]
        [Authorize]
        public async Task<IActionResult> GetMyProjects()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { success = false, message = "Utilizator neautentificat" });
                }

                var projects = await _context.Projects
                    .Where(p => p.OwnerId == userId)
                    .Include(p => p.Files)
                    .Select(p => new
                    {
                        p.Id,
                        p.Name,
                        p.Description,
                        p.IsPublic,
                        p.CreatedAt,
                        p.LastModifiedAt,
                        p.Tags,
                        p.ReviewCount,
                        FileCount = p.Files.Count
                    })
                    .OrderByDescending(p => p.CreatedAt)
                    .ToListAsync();

                return Ok(new { success = true, projects });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user projects");
                return StatusCode(500, new { success = false, message = "Eroare la obținerea proiectelor" });
            }
        }

        // Helper method pentru hash-uirea parolei
        private string HashPassword(string password)
        {
            using (var sha256 = SHA256.Create())
            {
                var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
                return Convert.ToBase64String(hashedBytes);
            }
        }
    }

    // DTOs
    public class CreateProjectRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool? IsPublic { get; set; }
        public string? Password { get; set; }
        public string? Tags { get; set; }
        public List<ProjectFileDto>? Files { get; set; }
    }

    public class UpdateProjectRequest
    {
        public string? Name { get; set; }
        public string? Description { get; set; }
        public bool? IsPublic { get; set; }
        public string? Password { get; set; }
        public string? Tags { get; set; }
    }

    public class ProjectFileDto
    {
        public string FileName { get; set; } = string.Empty;
        public string? FilePath { get; set; }
        public string Content { get; set; } = string.Empty;
        public string? Language { get; set; }
    }

    public class VerifyPasswordRequest
    {
        public string Password { get; set; } = string.Empty;
    }
}

