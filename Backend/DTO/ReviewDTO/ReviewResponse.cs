namespace Backend.DTO.ReviewDTO
{
    /// <summary>
    /// Response cu rezultatele review-ului
    /// </summary>
    public class ReviewResponse
    {
        public List<CodeFinding> Findings { get; set; } = new();
        public EffortEstimate? EffortEstimate { get; set; }
        public bool Success { get; set; }
        public string? ErrorMessage { get; set; }
    }

    /// <summary>
    /// Reprezintă o problemă găsită în cod
    /// </summary>
    public class CodeFinding
    {
        public string File { get; set; } = string.Empty;
        public int LineStart { get; set; }
        public int LineEnd { get; set; }
        public string Severity { get; set; } = "low"; // low, medium, high, critical
        public string Message { get; set; } = string.Empty;
        public string Suggestion { get; set; } = string.Empty;
        public string? Patch { get; set; }
        public string? Category { get; set; } // e.g., "performance", "security", "style"
    }

    /// <summary>
    /// Estimarea efortului de remediere
    /// </summary>
    public class EffortEstimate
    {
        public double Hours { get; set; }
        public string Complexity { get; set; } = "medium"; // low, medium, high
        public string? Description { get; set; }
    }
}

