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
    }
}

