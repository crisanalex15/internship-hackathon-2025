using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Backend.Areas.Identity.Data;

namespace Backend.Models
{
    /// <summary>
    /// Model pentru comentarii și reply-uri pe code review-uri
    /// Suportă threaded comments (fire de discuții)
    /// </summary>
    public class Comment
    {
        [Key]
        public int Id { get; set; }

        /// <summary>
        /// ID-ul review-ului la care aparține comentariul
        /// </summary>
        [Required]
        public int ReviewId { get; set; }

        /// <summary>
        /// Review-ul la care aparține comentariul
        /// </summary>
        [ForeignKey(nameof(ReviewId))]
        public virtual ReviewHistory? Review { get; set; }

        /// <summary>
        /// Calea fișierului comentat
        /// </summary>
        [Required]
        [MaxLength(500)]
        public string FilePath { get; set; } = string.Empty;

        /// <summary>
        /// Numărul liniei de cod comentate
        /// </summary>
        [Required]
        public int LineNumber { get; set; }

        /// <summary>
        /// ID-ul utilizatorului care a scris comentariul
        /// </summary>
        [Required]
        [MaxLength(450)]
        public string AuthorId { get; set; } = string.Empty;

        /// <summary>
        /// Navigație către autorul comentariului
        /// </summary>
        [ForeignKey(nameof(AuthorId))]
        public virtual ApplicationUser? Author { get; set; }

        /// <summary>
        /// Numele autorului (cached pentru performanță)
        /// </summary>
        [MaxLength(200)]
        public string? AuthorName { get; set; }

        /// <summary>
        /// Mesajul comentariului
        /// </summary>
        [Required]
        [Column(TypeName = "TEXT")]
        public string Message { get; set; } = string.Empty;

        /// <summary>
        /// ID-ul comentariului părinte (pentru replies)
        /// NULL = comentariu principal, NOT NULL = reply
        /// </summary>
        public int? ParentId { get; set; }

        /// <summary>
        /// Navigație către comentariul părinte
        /// </summary>
        [ForeignKey(nameof(ParentId))]
        public virtual Comment? Parent { get; set; }

        /// <summary>
        /// Lista de reply-uri la acest comentariu
        /// </summary>
        public virtual ICollection<Comment> Replies { get; set; } = new List<Comment>();

        /// <summary>
        /// Status-ul comentariului
        /// </summary>
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "open"; // open, resolved, wontfix

        /// <summary>
        /// Data și ora creării comentariului
        /// </summary>
        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Data și ora ultimei modificări
        /// </summary>
        public DateTime? UpdatedAt { get; set; }

        /// <summary>
        /// Data și ora rezolvării (când status = resolved)
        /// </summary>
        public DateTime? ResolvedAt { get; set; }

        /// <summary>
        /// ID-ul utilizatorului care a rezolvat comentariul
        /// </summary>
        [MaxLength(450)]
        public string? ResolvedById { get; set; }

        /// <summary>
        /// Indicatori pentru tipul de comentariu
        /// </summary>
        [MaxLength(50)]
        public string? CommentType { get; set; } // suggestion, question, issue, praise

        /// <summary>
        /// Severitatea (pentru comentarii de tip "issue")
        /// </summary>
        [MaxLength(20)]
        public string? Severity { get; set; } // critical, high, medium, low

        /// <summary>
        /// Link către un finding specific (opțional)
        /// </summary>
        public int? FindingId { get; set; }
    }
}

