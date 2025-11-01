using Backend.DTO.ReviewDTO;

namespace Backend.Services.AI
{
    /// <summary>
    /// Serviciu avansat pentru estimarea efortului de remediere a problemelor de cod
    /// Folosește reguli complexe bazate pe severitate, categorie, și complexitate
    /// </summary>
    public class EffortEstimationService
    {
        private readonly ILogger<EffortEstimationService> _logger;

        // Matrici de timp (minute) pentru fiecare combinație severitate x categorie
        private readonly Dictionary<string, Dictionary<string, int>> _effortMatrix = new()
        {
            ["critical"] = new Dictionary<string, int>
            {
                ["syntax"] = 30,        // Erori de sintaxă critice - 30 min
                ["security"] = 120,     // Vulnerabilități critice - 2h
                ["performance"] = 90,   // Probleme majore de performanță - 1.5h
                ["bug"] = 60,           // Bug-uri critice - 1h
                ["style"] = 15,         // Style issues critice (rare) - 15 min
                ["maintainability"] = 45 // Probleme critice de mentenabilitate - 45 min
            },
            ["high"] = new Dictionary<string, int>
            {
                ["syntax"] = 20,
                ["security"] = 60,
                ["performance"] = 45,
                ["bug"] = 40,
                ["style"] = 10,
                ["maintainability"] = 30
            },
            ["medium"] = new Dictionary<string, int>
            {
                ["syntax"] = 10,
                ["security"] = 30,
                ["performance"] = 20,
                ["bug"] = 20,
                ["style"] = 8,
                ["maintainability"] = 15
            },
            ["low"] = new Dictionary<string, int>
            {
                ["syntax"] = 5,
                ["security"] = 15,
                ["performance"] = 10,
                ["bug"] = 10,
                ["style"] = 5,
                ["maintainability"] = 8
            }
        };

        public EffortEstimationService(ILogger<EffortEstimationService> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Calculează estimarea detaliată a efortului pentru o listă de findings
        /// </summary>
        public DetailedEffortEstimate CalculateDetailedEffort(List<CodeFinding> findings)
        {
            if (findings == null || findings.Count == 0)
            {
                return new DetailedEffortEstimate
                {
                    TotalMinutes = 0,
                    TotalHours = 0,
                    Complexity = "low",
                    Description = "Nu există probleme de remediat"
                };
            }

            var estimate = new DetailedEffortEstimate
            {
                Findings = findings,
                BreakdownBySeverity = new Dictionary<string, SeverityBreakdown>(),
                BreakdownByCategory = new Dictionary<string, CategoryBreakdown>()
            };

            // Calcul per finding
            foreach (var finding in findings)
            {
                var minutes = CalculateFindingEffort(finding);
                estimate.TotalMinutes += minutes;

                // Breakdown by severity
                var severity = finding.Severity?.ToLower() ?? "low";
                if (!estimate.BreakdownBySeverity.ContainsKey(severity))
                {
                    estimate.BreakdownBySeverity[severity] = new SeverityBreakdown
                    {
                        Severity = severity,
                        Count = 0,
                        Minutes = 0
                    };
                }
                estimate.BreakdownBySeverity[severity].Count++;
                estimate.BreakdownBySeverity[severity].Minutes += minutes;

                // Breakdown by category
                var category = finding.Category?.ToLower() ?? "other";
                if (!estimate.BreakdownByCategory.ContainsKey(category))
                {
                    estimate.BreakdownByCategory[category] = new CategoryBreakdown
                    {
                        Category = category,
                        Count = 0,
                        Minutes = 0
                    };
                }
                estimate.BreakdownByCategory[category].Count++;
                estimate.BreakdownByCategory[category].Minutes += minutes;
            }

            // Conversii
            estimate.TotalHours = Math.Round(estimate.TotalMinutes / 60.0, 2);
            estimate.TotalDays = Math.Round(estimate.TotalHours / 8.0, 2); // 8 ore/zi

            // Complexitate
            estimate.Complexity = DetermineComplexity(findings, estimate.TotalHours);

            // Descriere
            estimate.Description = GenerateDescription(estimate);

            // Prioritizare
            estimate.RecommendedOrder = PrioritizeFindings(findings);

            // Predicții
            estimate.EstimatedCompletionDate = DateTime.UtcNow.AddHours(estimate.TotalHours);
            estimate.RequiredDevelopers = CalculateRequiredDevelopers(estimate.TotalHours, findings);

            _logger.LogInformation(
                "Effort estimation calculated: {TotalHours}h pentru {Count} findings",
                estimate.TotalHours,
                findings.Count
            );

            return estimate;
        }

        /// <summary>
        /// Calculează efortul pentru un singur finding
        /// </summary>
        private int CalculateFindingEffort(CodeFinding finding)
        {
            var severity = finding.Severity?.ToLower() ?? "low";
            var category = finding.Category?.ToLower() ?? "bug";

            // Obține timpul de bază din matrice
            var baseMinutes = 10; // Default fallback
            if (_effortMatrix.ContainsKey(severity) && _effortMatrix[severity].ContainsKey(category))
            {
                baseMinutes = _effortMatrix[severity][category];
            }

            // Multiplicatori bazați pe complexitate

            // 1. Număr de linii afectate
            var linesAffected = finding.LineEnd - finding.LineStart + 1;
            var lineMultiplier = 1.0 + Math.Min(linesAffected / 10.0, 1.0); // Max +100%

            // 2. Dacă există patch sugerat, reduce timpul (AI a făcut treaba)
            var patchMultiplier = string.IsNullOrEmpty(finding.Patch) ? 1.0 : 0.7; // -30% dacă există patch

            // 3. Dacă există sugestie detaliată, reduce timpul
            var suggestionMultiplier = string.IsNullOrEmpty(finding.Suggestion) ? 1.0 : 0.85; // -15%

            // 4. Complexitate bazată pe mesaj (heuristic)
            var messageComplexityMultiplier = EstimateMessageComplexity(finding.Message);

            // Calcul final
            var adjustedMinutes = baseMinutes * lineMultiplier * patchMultiplier * suggestionMultiplier * messageComplexityMultiplier;

            return (int)Math.Ceiling(adjustedMinutes);
        }

        /// <summary>
        /// Estimează complexitatea bazată pe cuvinte cheie în mesaj
        /// </summary>
        private double EstimateMessageComplexity(string message)
        {
            if (string.IsNullOrEmpty(message))
                return 1.0;

            var lowercaseMessage = message.ToLower();

            // Cuvinte care indică complexitate mare
            var highComplexityKeywords = new[] {
                "refactor", "redesign", "architecture", "security vulnerability",
                "sql injection", "xss", "memory leak", "race condition",
                "deadlock", "concurrency", "thread-safe", "async"
            };

            // Cuvinte care indică complexitate mică
            var lowComplexityKeywords = new[] {
                "typo", "whitespace", "formatting", "indent", "naming",
                "comment", "documentation", "unused variable"
            };

            if (highComplexityKeywords.Any(k => lowercaseMessage.Contains(k)))
                return 1.5; // +50%

            if (lowComplexityKeywords.Any(k => lowercaseMessage.Contains(k)))
                return 0.6; // -40%

            return 1.0; // Normal
        }

        /// <summary>
        /// Determină complexitatea generală
        /// </summary>
        private string DetermineComplexity(List<CodeFinding> findings, double totalHours)
        {
            // Bazat pe timp
            if (totalHours > 40) return "very high";
            if (totalHours > 16) return "high";
            if (totalHours > 4) return "medium";
            if (totalHours > 1) return "low";
            return "very low";
        }

        /// <summary>
        /// Generează o descriere user-friendly
        /// </summary>
        private string GenerateDescription(DetailedEffortEstimate estimate)
        {
            var parts = new List<string>();

            // Rezumat general
            parts.Add($"Remediere {estimate.Findings.Count} probleme detectate");

            // Breakdown by severity
            var criticalCount = estimate.BreakdownBySeverity.GetValueOrDefault("critical")?.Count ?? 0;
            var highCount = estimate.BreakdownBySeverity.GetValueOrDefault("high")?.Count ?? 0;

            if (criticalCount > 0)
                parts.Add($"{criticalCount} critice");
            if (highCount > 0)
                parts.Add($"{highCount} majore");

            // Timp estimat
            if (estimate.TotalHours < 1)
                parts.Add($"~{estimate.TotalMinutes} minute");
            else if (estimate.TotalHours < 8)
                parts.Add($"~{estimate.TotalHours} ore");
            else
                parts.Add($"~{estimate.TotalDays} zile lucrătoare");

            return string.Join(", ", parts);
        }

        /// <summary>
        /// Prioritizează findings în ordinea recomandată de remediere
        /// </summary>
        private List<CodeFinding> PrioritizeFindings(List<CodeFinding> findings)
        {
            // Ordinea: critical > high > medium > low
            // În cadrul aceleiași severități: security > bug > syntax > performance > maintainability > style

            var severityOrder = new Dictionary<string, int>
            {
                ["critical"] = 4,
                ["high"] = 3,
                ["medium"] = 2,
                ["low"] = 1
            };

            var categoryOrder = new Dictionary<string, int>
            {
                ["security"] = 6,
                ["bug"] = 5,
                ["syntax"] = 4,
                ["performance"] = 3,
                ["maintainability"] = 2,
                ["style"] = 1
            };

            return findings.OrderByDescending(f =>
                severityOrder.GetValueOrDefault(f.Severity?.ToLower() ?? "low", 0) * 10 +
                categoryOrder.GetValueOrDefault(f.Category?.ToLower() ?? "style", 0)
            ).ToList();
        }

        /// <summary>
        /// Calculează numărul de dezvoltatori necesari
        /// </summary>
        private int CalculateRequiredDevelopers(double totalHours, List<CodeFinding> findings)
        {
            // Heuristic simplu:
            // - Sub 8h (1 zi) -> 1 developer
            // - 8-40h (1 săptămână) -> 1-2 developers
            // - 40-80h (2 săptămâni) -> 2-3 developers
            // - Peste 80h -> 3+ developers

            if (totalHours <= 8) return 1;
            if (totalHours <= 40) return Math.Min(2, (int)Math.Ceiling(totalHours / 20));
            if (totalHours <= 80) return Math.Min(3, (int)Math.Ceiling(totalHours / 30));
            return Math.Min(5, (int)Math.Ceiling(totalHours / 40));
        }
    }

    #region DTOs

    /// <summary>
    /// Estimare detaliată a efortului
    /// </summary>
    public class DetailedEffortEstimate
    {
        public int TotalMinutes { get; set; }
        public double TotalHours { get; set; }
        public double TotalDays { get; set; }
        public string Complexity { get; set; } = "low";
        public string Description { get; set; } = "";

        public List<CodeFinding> Findings { get; set; } = new();
        public List<CodeFinding> RecommendedOrder { get; set; } = new();

        public Dictionary<string, SeverityBreakdown> BreakdownBySeverity { get; set; } = new();
        public Dictionary<string, CategoryBreakdown> BreakdownByCategory { get; set; } = new();

        public DateTime EstimatedCompletionDate { get; set; }
        public int RequiredDevelopers { get; set; }
    }

    public class SeverityBreakdown
    {
        public string Severity { get; set; } = "";
        public int Count { get; set; }
        public int Minutes { get; set; }
        public double Hours => Math.Round(Minutes / 60.0, 2);
    }

    public class CategoryBreakdown
    {
        public string Category { get; set; } = "";
        public int Count { get; set; }
        public int Minutes { get; set; }
        public double Hours => Math.Round(Minutes / 60.0, 2);
    }

    #endregion
}

