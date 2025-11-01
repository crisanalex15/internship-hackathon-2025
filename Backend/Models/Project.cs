using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    /// <summary>
    /// Model pentru proiecte cu cod pentru review
    /// </summary>
    public class Project
    {
        [Key]
        public int Id { get; set; }

        /// <summary>
        /// Numele proiectului
        /// </summary>
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// Descrierea proiectului
        /// </summary>
        [MaxLength(1000)]
        public string? Description { get; set; }

        /// <summary>
        /// ID-ul utilizatorului care a creat proiectul (owner)
        /// </summary>
        [Required]
        [MaxLength(450)]
        public string OwnerId { get; set; } = string.Empty;

        /// <summary>
        /// Parola pentru acces la proiect (opțional, null = public)
        /// </summary>
        [MaxLength(256)]
        public string? Password { get; set; }

        /// <summary>
        /// Dacă proiectul este public (fără parolă)
        /// </summary>
        public bool IsPublic { get; set; } = false;

        /// <summary>
        /// Data și ora creării proiectului
        /// </summary>
        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Data și ora ultimei modificări
        /// </summary>
        public DateTime? LastModifiedAt { get; set; }

        /// <summary>
        /// Tag-uri pentru căutare (comma-separated)
        /// </summary>
        [MaxLength(500)]
        public string? Tags { get; set; }

        /// <summary>
        /// Numărul de review-uri primite
        /// </summary>
        public int ReviewCount { get; set; } = 0;

        /// <summary>
        /// Navigație către fișierele proiectului
        /// </summary>
        public virtual ICollection<ProjectFile> Files { get; set; } = new List<ProjectFile>();

        /// <summary>
        /// Navigație către review-urile proiectului
        /// </summary>
        public virtual ICollection<ReviewHistory> Reviews { get; set; } = new List<ReviewHistory>();
    }
}

