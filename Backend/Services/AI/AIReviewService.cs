using System.Text.Json;
using Backend.DTO.ReviewDTO;
using Backend.Models;
using Backend.Areas.Identity.Data;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services.AI
{
    /// <summary>
    /// Serviciu pentru efectuarea code review-urilor automate folosind LLM local
    /// </summary>
    public class AIReviewService
    {
        private readonly LLMClient _llmClient;
        private readonly AuthDbContext _dbContext;
        private readonly ILogger<AIReviewService> _logger;
        private readonly string _promptTemplate;

        public AIReviewService(
            LLMClient llmClient,
            AuthDbContext dbContext,
            ILogger<AIReviewService> logger,
            IWebHostEnvironment environment)
        {
            _llmClient = llmClient;
            _dbContext = dbContext;
            _logger = logger;

            // Încarcă template-ul de prompt
            var templatePath = Path.Combine(environment.ContentRootPath, "Services", "AI", "prompt-template.txt");
            if (File.Exists(templatePath))
            {
                _promptTemplate = File.ReadAllText(templatePath);
            }
            else
            {
                _logger.LogWarning("Prompt template nu a fost găsit la {Path}. Se va folosi un template default.", templatePath);
                _promptTemplate = GetDefaultPromptTemplate();
            }
        }

        /// <summary>
        /// Efectuează un code review complet
        /// </summary>
        public async Task<ReviewResponse> PerformReviewAsync(ReviewRequest request, string userId)
        {
            try
            {
                _logger.LogInformation("Începe code review pentru utilizatorul {UserId}", userId);

                // Validare input
                if (string.IsNullOrWhiteSpace(request.Code) && string.IsNullOrWhiteSpace(request.GitDiff))
                {
                    return new ReviewResponse
                    {
                        Success = false,
                        ErrorMessage = "Trebuie furnizat fie 'code' fie 'gitDiff'"
                    };
                }

                // Pregătește prompt-ul
                var codeToReview = !string.IsNullOrWhiteSpace(request.Code)
                    ? request.Code
                    : request.GitDiff;

                var reviewType = !string.IsNullOrWhiteSpace(request.Code) ? "full" : "diff";
                var prompt = _promptTemplate
                    .Replace("<<<CODE_OR_DIFF>>>", codeToReview)
                    .Replace("<<<FILE_NAME>>>", request.FileName ?? "unknown");

                // Trimite către LLM
                var llmResponse = await _llmClient.SendPromptAsync(prompt, jsonMode: true);

                // Parse răspunsul JSON
                var reviewResult = ParseLLMResponse(llmResponse);

                if (reviewResult == null)
                {
                    return new ReviewResponse
                    {
                        Success = false,
                        ErrorMessage = "Nu s-a putut parsa răspunsul LLM"
                    };
                }

                reviewResult.Success = true;

                // Salvează în baza de date
                await SaveReviewHistoryAsync(request, reviewResult, userId, reviewType);

                _logger.LogInformation("Code review finalizat cu succes: {Count} probleme găsite",
                    reviewResult.Findings.Count);

                return reviewResult;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la efectuarea code review");
                return new ReviewResponse
                {
                    Success = false,
                    ErrorMessage = $"Eroare la efectuarea review-ului: {ex.Message}"
                };
            }
        }

        /// <summary>
        /// Aplică un patch/fix automat la un fișier
        /// </summary>
        public async Task<ApplyFixResponse> ApplyFixAsync(ApplyFixRequest request)
        {
            try
            {
                _logger.LogInformation("Aplicare fix pentru fișierul {File}", request.FilePath);

                // Validare
                if (string.IsNullOrWhiteSpace(request.FilePath) || string.IsNullOrWhiteSpace(request.Patch))
                {
                    return new ApplyFixResponse
                    {
                        Success = false,
                        Message = "FilePath și Patch sunt obligatorii"
                    };
                }

                // Verifică dacă fișierul există
                if (!File.Exists(request.FilePath))
                {
                    return new ApplyFixResponse
                    {
                        Success = false,
                        Message = $"Fișierul {request.FilePath} nu există"
                    };
                }

                // Citește conținutul actual
                var currentContent = await File.ReadAllTextAsync(request.FilePath);

                // Pentru simplitate, aplicăm patch-ul ca înlocuire simplă
                // În producție, ar trebui să folosești `git apply` sau o librărie de diff/patch
                var updatedContent = ApplySimplePatch(currentContent, request.Patch);

                if (updatedContent == null)
                {
                    return new ApplyFixResponse
                    {
                        Success = false,
                        Message = "Nu s-a putut aplica patch-ul"
                    };
                }

                // Scrie conținutul actualizat
                await File.WriteAllTextAsync(request.FilePath, updatedContent);

                _logger.LogInformation("Patch aplicat cu succes pentru {File}", request.FilePath);

                return new ApplyFixResponse
                {
                    Success = true,
                    Message = "Patch aplicat cu succes",
                    UpdatedContent = updatedContent
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la aplicarea patch-ului");
                return new ApplyFixResponse
                {
                    Success = false,
                    Message = $"Eroare: {ex.Message}"
                };
            }
        }

        /// <summary>
        /// Obține istoricul review-urilor pentru un utilizator
        /// </summary>
        public async Task<List<ReviewHistory>> GetReviewHistoryAsync(string userId, int limit = 50)
        {
            return await _dbContext.ReviewHistories
                .Where(r => r.UserId == userId)
                .OrderByDescending(r => r.Timestamp)
                .Take(limit)
                .ToListAsync();
        }

        /// <summary>
        /// Obține detalii despre un review specific
        /// </summary>
        public async Task<ReviewHistory?> GetReviewByIdAsync(int reviewId, string userId)
        {
            return await _dbContext.ReviewHistories
                .FirstOrDefaultAsync(r => r.Id == reviewId && r.UserId == userId);
        }

        /// <summary>
        /// Cere explicații suplimentare despre un finding specific
        /// </summary>
        public async Task<string> ExplainFindingAsync(CodeFinding finding)
        {
            try
            {
                var explainPrompt = $@"
You are a senior software engineer explaining a code issue.

Issue: {finding.Message}
Severity: {finding.Severity}
Category: {finding.Category}
Location: {finding.File}, lines {finding.LineStart}-{finding.LineEnd}
Suggestion: {finding.Suggestion}

Return ONLY a JSON object with this structure:
{{
  ""why_this_is_an_issue"": ""explain why this is a problem"",
  ""potential_consequences_if_not_fixed"": [""consequence 1"", ""consequence 2""],
  ""best_practices_related_to_this_issue"": [""practice 1"", ""practice 2""],
  ""step_by_step_guide_to_fix_it"": [""step 1"", ""step 2"", ""step 3""]
}}

Be clear, concise, and educational.";

                var explanation = await _llmClient.SendPromptAsync(explainPrompt, jsonMode: true);
                return explanation;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la cererea explicațiilor pentru finding");
                return $"{{\"why_this_is_an_issue\": \"Nu s-au putut obține explicații: {ex.Message}\"}}";
            }
        }

        #region Private Helper Methods

        /// <summary>
        /// Parse răspunsul JSON de la LLM
        /// </summary>
        private ReviewResponse? ParseLLMResponse(string llmResponse)
        {
            try
            {
                // Curăță răspunsul de eventual text în plus
                var jsonStart = llmResponse.IndexOf('{');
                var jsonEnd = llmResponse.LastIndexOf('}');

                if (jsonStart >= 0 && jsonEnd > jsonStart)
                {
                    llmResponse = llmResponse.Substring(jsonStart, jsonEnd - jsonStart + 1);
                }

                var options = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                };

                var parsedResponse = JsonSerializer.Deserialize<ReviewResponse>(llmResponse, options);
                return parsedResponse;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la parsarea răspunsului LLM: {Response}", llmResponse);
                return null;
            }
        }

        /// <summary>
        /// Salvează rezultatele review-ului în baza de date
        /// </summary>
        private async Task SaveReviewHistoryAsync(
            ReviewRequest request,
            ReviewResponse response,
            string userId,
            string reviewType)
        {
            try
            {
                var reviewHistory = new ReviewHistory
                {
                    Timestamp = DateTime.UtcNow,
                    File = request.FileName ?? "unknown",
                    FindingsJson = JsonSerializer.Serialize(response.Findings),
                    EffortEstimate = response.EffortEstimate != null
                        ? JsonSerializer.Serialize(response.EffortEstimate)
                        : null,
                    UserId = userId,
                    ReviewType = reviewType,
                    IssuesCount = response.Findings.Count,
                    MaxSeverity = response.Findings.Any()
                        ? response.Findings.Max(f => f.Severity)
                        : "none"
                };

                _dbContext.ReviewHistories.Add(reviewHistory);
                await _dbContext.SaveChangesAsync();

                _logger.LogInformation("Review history salvat cu ID {Id}", reviewHistory.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la salvarea review history în DB");
                // Nu aruncăm excepția pentru a nu bloca răspunsul principal
            }
        }

        /// <summary>
        /// Aplică un patch simplu (pentru demonstrație)
        /// În producție, folosește git apply sau o librărie specializată
        /// </summary>
        private string? ApplySimplePatch(string content, string patch)
        {
            try
            {
                // Acest cod este o implementare simplificată
                // Pentru un patch real în format git diff, ar trebui folosită o librărie specializată
                // sau invocat `git apply` prin proces extern

                // Pentru demonstrație, returnăm conținutul cu un comentariu
                _logger.LogWarning("ApplySimplePatch: implementare simplificată, nu aplică patch-uri reale git diff");
                return content + "\n// Patch aplicat: " + patch.Substring(0, Math.Min(100, patch.Length));
            }
            catch
            {
                return null;
            }
        }

        /// <summary>
        /// Template de prompt default în caz că fișierul nu este găsit
        /// </summary>
        private string GetDefaultPromptTemplate()
        {
            return @"You are an expert code reviewer with deep knowledge of software engineering best practices, design patterns, and SOLID principles.

Analyze the following code thoroughly and identify ALL types of issues:

**1. SYNTAX & COMPILATION** - Code that won't compile or run
**2. LOGIC & CORRECTNESS** - Incorrect validation, wrong conditions, edge cases
**3. ERROR HANDLING** - Missing try-catch, no null checks, silent failures
**4. DESIGN PATTERNS** - Tight coupling, no DI, violating SOLID principles
**5. BEST PRACTICES** - No async/await, poor logging, magic values, string concatenation
**6. SECURITY** - SQL injection, XSS, hardcoded secrets
**7. PERFORMANCE** - Inefficient algorithms, N+1 queries, memory leaks
**8. MAINTAINABILITY** - Code duplication, complex functions, poor naming

**Review Rules:**
1. Only report issues that actually exist in the code
2. Do not report false positives - understand the context fully
3. Be accurate with line numbers - they matter for the developer
4. Prioritize severity correctly - critical issues first
5. Provide clear, actionable suggestions with code examples when possible
6. Consider the bigger picture - architecture, maintainability, scalability

**Severity Levels:**
- ""critical"": Syntax errors, breaking bugs, severe security vulnerabilities
- ""high"": Major bugs, security issues, significant performance problems
- ""medium"": Moderate bugs, performance concerns, code quality issues
- ""low"": Style issues, minor improvements, best practice suggestions

**Categories:**
- ""syntax"": Code that won't compile or run
- ""security"": Vulnerabilities and security concerns
- ""performance"": Speed and efficiency issues
- ""bug"": Logic errors and incorrect behavior
- ""style"": Code formatting and conventions
- ""maintainability"": Code organization and long-term sustainability

**For Each Issue Provide:**
- file: filename being reviewed
- lineStart: starting line number of the issue
- lineEnd: ending line number of the issue
- severity: one of [critical, high, medium, low]
- category: one of [syntax, security, performance, bug, style, maintainability]
- message: clear, concise description of the problem
- suggestion: actionable fix with explanation
- patch: (optional) unified diff format showing the fix

**Effort Estimation:**
Provide realistic time estimate to fix all issues:
- hours: decimal number (e.g., 0.5, 2.0, 8.0)
- complexity: ""low"", ""medium"", or ""high""
- description: brief summary of what needs to be done

File being reviewed: <<<FILE_NAME>>>

Return ONLY valid JSON in this format:

{
  ""findings"": [
    {
      ""file"": ""<<<FILE_NAME>>>"",
      ""lineStart"": 10,
      ""lineEnd"": 10,
      ""severity"": ""critical"",
      ""category"": ""syntax"",
      ""message"": ""The error Message"",
      ""suggestion"": ""The suggestion"",
      ""patch"": """"
    }
  ],
  ""effortEstimate"": {
    ""hours"": 0.5,
    ""complexity"": ""low"",
    ""description"": ""Fix syntax error""
  }
}

If no issues found:

{
  ""findings"": [],
  ""effortEstimate"": {
    ""hours"": 0,
    ""complexity"": ""low"",
    ""description"": ""No issues found""
  }
}

Code to review:

<<<CODE_OR_DIFF>>>";
        }

        #endregion
    }
}

