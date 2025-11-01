namespace Backend.DTO.ReviewDTO
{
    /// <summary>
    /// Rezultatul unui pre-commit review
    /// </summary>
    public class PreCommitReviewResult
    {
        public bool Success { get; set; }
        public string? ErrorMessage { get; set; }
        public string? Message { get; set; }
        
        /// <summary>
        /// Dacă commit-ul ar trebui blocat din cauza problemelor critice
        /// </summary>
        public bool ShouldBlockCommit { get; set; }
        
        /// <summary>
        /// Numărul de probleme critice detectate
        /// </summary>
        public int CriticalIssuesCount { get; set; }
        
        /// <summary>
        /// Numărul de probleme cu severitate mare
        /// </summary>
        public int HighIssuesCount { get; set; }
        
        /// <summary>
        /// Numărul total de probleme detectate
        /// </summary>
        public int TotalIssuesCount { get; set; }
        
        /// <summary>
        /// Lista tuturor problemelor detectate
        /// </summary>
        public List<CodeFinding> Findings { get; set; } = new();
    }
}

