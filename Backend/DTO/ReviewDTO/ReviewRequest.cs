namespace Backend.DTO.ReviewDTO
{
    /// <summary>
    /// Request pentru efectuarea unui code review
    /// </summary>
    public class ReviewRequest
    {
        /// <summary>
        /// Codul sursă complet (pentru full review)
        /// </summary>
        public string? Code { get; set; }

        /// <summary>
        /// Git diff (pentru incremental review)
        /// </summary>
        public string? GitDiff { get; set; }

        /// <summary>
        /// Numele fișierului sau proiectului
        /// </summary>
        public string? FileName { get; set; }

        /// <summary>
        /// Limbajul de programare (opțional, pentru detecție mai precisă)
        /// </summary>
        public string? Language { get; set; }

        /// <summary>
        /// Reguli personalizate pentru AI (vor fi concatenate cu regulile default)
        /// </summary>
        public string? CustomRules { get; set; }
    }
}

