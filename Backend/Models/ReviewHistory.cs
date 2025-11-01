using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    /// <summary>
    /// Model pentru stocarea istoricului review-urilor de cod efectuate de AI
    /// </summary>
    public class ReviewHistory
    {
        [Key]
        public int Id { get; set; }

        /// <summary>
        /// Data și ora efectuării review-ului
        /// </summary>
        [Required]
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Numele fișierului sau proiectului analizat
        /// </summary>
        [Required]
        [MaxLength(500)]
        public string File { get; set; } = string.Empty;

        /// <summary>
        /// JSON cu rezultatele review-ului (findings)
        /// </summary>
        [Required]
        [Column(TypeName = "TEXT")]
        public string FindingsJson { get; set; } = string.Empty;

        /// <summary>
        /// Estimarea efortului de remediere (JSON)
        /// </summary>
        [Column(TypeName = "TEXT")]
        public string? EffortEstimate { get; set; }

        /// <summary>
        /// ID-ul utilizatorului care a inițiat review-ul
        /// </summary>
        [Required]
        public string UserId { get; set; } = string.Empty;

        /// <summary>
        /// Tipul review-ului (full code sau git diff)
        /// </summary>
        [MaxLength(50)]
        public string? ReviewType { get; set; }

        /// <summary>
        /// Numărul de probleme găsite
        /// </summary>
        public int IssuesCount { get; set; }

        /// <summary>
        /// Severitatea maximă a problemelor găsite
        /// </summary>
        [MaxLength(20)]
        public string? MaxSeverity { get; set; }
    }
}

