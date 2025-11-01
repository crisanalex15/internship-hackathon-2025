namespace Backend.DTO.ReviewDTO
{
    /// <summary>
    /// Request pentru aplicarea unui patch
    /// </summary>
    public class ApplyFixRequest
    {
        /// <summary>
        /// Patch-ul în format git diff
        /// </summary>
        public string Patch { get; set; } = string.Empty;

        /// <summary>
        /// Path-ul către fișierul care trebuie modificat
        /// </summary>
        public string FilePath { get; set; } = string.Empty;
    }

    /// <summary>
    /// Response după aplicarea unui patch
    /// </summary>
    public class ApplyFixResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? UpdatedContent { get; set; }
    }
}

