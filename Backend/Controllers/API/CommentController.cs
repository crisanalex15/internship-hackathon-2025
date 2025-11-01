using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Backend.Areas.Identity.Data;
using Backend.Models;

namespace Backend.Controllers.API
{
    /// <summary>
    /// API Controller pentru gestionarea comentariilor și reply-urilor (Threaded Comments)
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class CommentController : ControllerBase
    {
        private readonly AuthDbContext _context;
        private readonly ILogger<CommentController> _logger;

        public CommentController(AuthDbContext context, ILogger<CommentController> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Obține toate comentariile pentru un review specific
        /// </summary>
        [HttpGet("review/{reviewId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetCommentsByReview(int reviewId)
        {
            try
            {
                var comments = await _context.Comments
                    .Where(c => c.ReviewId == reviewId && c.ParentId == null) // Doar comentariile root
                    .Include(c => c.Author)
                    .Include(c => c.Replies)
                        .ThenInclude(r => r.Author)
                    .OrderBy(c => c.CreatedAt)
                    .Select(c => MapCommentToDto(c))
                    .ToListAsync();

                return Ok(new { success = true, comments });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la obținerea comentariilor pentru review {ReviewId}", reviewId);
                return StatusCode(500, new { success = false, message = "Eroare la obținerea comentariilor" });
            }
        }

        /// <summary>
        /// Obține comentariile pentru un fișier specific dintr-un review
        /// </summary>
        [HttpGet("review/{reviewId}/file")]
        [AllowAnonymous]
        public async Task<IActionResult> GetCommentsByFile(int reviewId, [FromQuery] string filePath)
        {
            try
            {
                var comments = await _context.Comments
                    .Where(c => c.ReviewId == reviewId && c.FilePath == filePath && c.ParentId == null)
                    .Include(c => c.Author)
                    .Include(c => c.Replies)
                        .ThenInclude(r => r.Author)
                    .OrderBy(c => c.LineNumber)
                    .ThenBy(c => c.CreatedAt)
                    .Select(c => MapCommentToDto(c))
                    .ToListAsync();

                return Ok(new { success = true, comments });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la obținerea comentariilor pentru fișier");
                return StatusCode(500, new { success = false, message = "Eroare la obținerea comentariilor" });
            }
        }

        /// <summary>
        /// Creează un comentariu nou
        /// </summary>
        [HttpPost]
        [Authorize]
        public async Task<IActionResult> CreateComment([FromBody] CreateCommentRequest request)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { success = false, message = "Utilizator neautentificat" });
                }

                // Validare
                if (string.IsNullOrWhiteSpace(request.Message))
                {
                    return BadRequest(new { success = false, message = "Mesajul este obligatoriu" });
                }

                // Verifică dacă review-ul există
                var reviewExists = await _context.ReviewHistories.AnyAsync(r => r.Id == request.ReviewId);
                if (!reviewExists)
                {
                    return NotFound(new { success = false, message = "Review-ul nu a fost găsit" });
                }

                // Dacă e reply, verifică dacă parent-ul există
                if (request.ParentId.HasValue)
                {
                    var parentExists = await _context.Comments.AnyAsync(c => c.Id == request.ParentId.Value);
                    if (!parentExists)
                    {
                        return NotFound(new { success = false, message = "Comentariul părinte nu a fost găsit" });
                    }
                }

                var user = await _context.Users.FindAsync(userId);
                var comment = new Comment
                {
                    ReviewId = request.ReviewId,
                    FilePath = request.FilePath ?? "",
                    LineNumber = request.LineNumber ?? 0,
                    AuthorId = userId,
                    AuthorName = user?.Email ?? "Unknown",
                    Message = request.Message,
                    ParentId = request.ParentId,
                    Status = "open",
                    CommentType = request.CommentType ?? "comment",
                    Severity = request.Severity,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Comments.Add(comment);
                await _context.SaveChangesAsync();

                // Include author in response
                await _context.Entry(comment).Reference(c => c.Author).LoadAsync();

                _logger.LogInformation("Comentariu creat cu ID {CommentId} de către {UserId}", comment.Id, userId);

                return Ok(new
                {
                    success = true,
                    message = "Comentariu creat cu succes",
                    comment = MapCommentToDto(comment)
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la crearea comentariului");
                return StatusCode(500, new { success = false, message = "Eroare la crearea comentariului" });
            }
        }

        /// <summary>
        /// Adaugă un reply la un comentariu existent
        /// </summary>
        [HttpPost("{commentId}/reply")]
        [Authorize]
        public async Task<IActionResult> AddReply(int commentId, [FromBody] AddReplyRequest request)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { success = false, message = "Utilizator neautentificat" });
                }

                var parentComment = await _context.Comments.FindAsync(commentId);
                if (parentComment == null)
                {
                    return NotFound(new { success = false, message = "Comentariul nu a fost găsit" });
                }

                var user = await _context.Users.FindAsync(userId);
                var reply = new Comment
                {
                    ReviewId = parentComment.ReviewId,
                    FilePath = parentComment.FilePath,
                    LineNumber = parentComment.LineNumber,
                    AuthorId = userId,
                    AuthorName = user?.Email ?? "Unknown",
                    Message = request.Message,
                    ParentId = commentId,
                    Status = "open",
                    CommentType = "reply",
                    CreatedAt = DateTime.UtcNow
                };

                _context.Comments.Add(reply);
                await _context.SaveChangesAsync();

                await _context.Entry(reply).Reference(r => r.Author).LoadAsync();

                _logger.LogInformation("Reply adăugat cu ID {ReplyId} la comentariul {ParentId}", reply.Id, commentId);

                return Ok(new
                {
                    success = true,
                    message = "Reply adăugat cu succes",
                    reply = MapCommentToDto(reply)
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la adăugarea reply-ului");
                return StatusCode(500, new { success = false, message = "Eroare la adăugarea reply-ului" });
            }
        }

        /// <summary>
        /// Actualizează un comentariu existent
        /// </summary>
        [HttpPut("{commentId}")]
        [Authorize]
        public async Task<IActionResult> UpdateComment(int commentId, [FromBody] UpdateCommentRequest request)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var comment = await _context.Comments.FindAsync(commentId);

                if (comment == null)
                {
                    return NotFound(new { success = false, message = "Comentariul nu a fost găsit" });
                }

                if (comment.AuthorId != userId)
                {
                    return Forbid("Nu ai permisiunea să modifici acest comentariu");
                }

                comment.Message = request.Message ?? comment.Message;
                comment.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Comentariu actualizat cu succes" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la actualizarea comentariului");
                return StatusCode(500, new { success = false, message = "Eroare la actualizarea comentariului" });
            }
        }

        /// <summary>
        /// Marchează un comentariu ca rezolvat
        /// </summary>
        [HttpPut("{commentId}/resolve")]
        [Authorize]
        public async Task<IActionResult> ResolveComment(int commentId)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var comment = await _context.Comments.FindAsync(commentId);

                if (comment == null)
                {
                    return NotFound(new { success = false, message = "Comentariul nu a fost găsit" });
                }

                comment.Status = "resolved";
                comment.ResolvedAt = DateTime.UtcNow;
                comment.ResolvedById = userId;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Comentariul {CommentId} marcat ca rezolvat de {UserId}", commentId, userId);

                return Ok(new { success = true, message = "Comentariu marcat ca rezolvat" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la marcarea comentariului ca rezolvat");
                return StatusCode(500, new { success = false, message = "Eroare la marcarea comentariului" });
            }
        }

        /// <summary>
        /// Redeschide un comentariu rezolvat
        /// </summary>
        [HttpPut("{commentId}/reopen")]
        [Authorize]
        public async Task<IActionResult> ReopenComment(int commentId)
        {
            try
            {
                var comment = await _context.Comments.FindAsync(commentId);

                if (comment == null)
                {
                    return NotFound(new { success = false, message = "Comentariul nu a fost găsit" });
                }

                comment.Status = "open";
                comment.ResolvedAt = null;
                comment.ResolvedById = null;

                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Comentariu redeschis" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la redeschiderea comentariului");
                return StatusCode(500, new { success = false, message = "Eroare la redeschiderea comentariului" });
            }
        }

        /// <summary>
        /// Șterge un comentariu (doar autorul sau admin)
        /// </summary>
        [HttpDelete("{commentId}")]
        [Authorize]
        public async Task<IActionResult> DeleteComment(int commentId)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var comment = await _context.Comments
                    .Include(c => c.Replies)
                    .FirstOrDefaultAsync(c => c.Id == commentId);

                if (comment == null)
                {
                    return NotFound(new { success = false, message = "Comentariul nu a fost găsit" });
                }

                if (comment.AuthorId != userId)
                {
                    return Forbid("Nu ai permisiunea să ștergi acest comentariu");
                }

                // Șterge și reply-urile
                if (comment.Replies.Any())
                {
                    _context.Comments.RemoveRange(comment.Replies);
                }

                _context.Comments.Remove(comment);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Comentariul {CommentId} șters de {UserId}", commentId, userId);

                return Ok(new { success = true, message = "Comentariu șters cu succes" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la ștergerea comentariului");
                return StatusCode(500, new { success = false, message = "Eroare la ștergerea comentariului" });
            }
        }

        #region Helper Methods

        /// <summary>
        /// Mapează un Comment la un DTO pentru răspuns
        /// </summary>
        private object MapCommentToDto(Comment comment)
        {
            return new
            {
                comment.Id,
                comment.ReviewId,
                comment.FilePath,
                comment.LineNumber,
                comment.AuthorId,
                AuthorName = comment.Author?.Email ?? comment.AuthorName ?? "Unknown",
                comment.Message,
                comment.ParentId,
                comment.Status,
                comment.CommentType,
                comment.Severity,
                comment.CreatedAt,
                comment.UpdatedAt,
                comment.ResolvedAt,
                comment.ResolvedById,
                Replies = comment.Replies?.Select(r => new
                {
                    r.Id,
                    r.AuthorId,
                    AuthorName = r.Author?.Email ?? r.AuthorName ?? "Unknown",
                    r.Message,
                    r.CreatedAt,
                    r.UpdatedAt,
                    r.Status
                }).ToList()
            };
        }

        #endregion
    }

    #region DTOs

    public class CreateCommentRequest
    {
        public int ReviewId { get; set; }
        public string? FilePath { get; set; }
        public int? LineNumber { get; set; }
        public string Message { get; set; } = string.Empty;
        public int? ParentId { get; set; }
        public string? CommentType { get; set; } // suggestion, question, issue, praise
        public string? Severity { get; set; }
    }

    public class AddReplyRequest
    {
        public string Message { get; set; } = string.Empty;
    }

    public class UpdateCommentRequest
    {
        public string? Message { get; set; }
    }

    #endregion
}

