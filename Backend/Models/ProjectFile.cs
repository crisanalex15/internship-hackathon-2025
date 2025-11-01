using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    /// <summary>
    /// Model pentru fișierele dintr-un proiect
    /// </summary>
    public class ProjectFile
    {
        [Key]
        public int Id { get; set; }

        /// <summary>
        /// ID-ul proiectului
        /// </summary>
        [Required]
        public int ProjectId { get; set; }

        /// <summary>
        /// Numele fișierului (cu extensie)
        /// </summary>
        [Required]
        [MaxLength(255)]
        public string FileName { get; set; } = string.Empty;

        /// <summary>
        /// Calea relativă în proiect (ex: src/components/Button.jsx)
        /// </summary>
        [MaxLength(500)]
        public string? FilePath { get; set; }

        /// <summary>
        /// Conținutul fișierului
        /// </summary>
        [Required]
        [Column(TypeName = "TEXT")]
        public string Content { get; set; } = string.Empty;

        /// <summary>
        /// Tipul/lenguajul fișierului (js, cs, java, etc.)
        /// </summary>
        [MaxLength(50)]
        public string? Language { get; set; }

        /// <summary>
        /// Data și ora creării fișierului
        /// </summary>
        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Data și ora ultimei modificări
        /// </summary>
        public DateTime? LastModifiedAt { get; set; }

        /// <summary>
        /// Navigație către proiectul părinte
        /// </summary>
        [ForeignKey("ProjectId")]
        public virtual Project? Project { get; set; }
    }
}

