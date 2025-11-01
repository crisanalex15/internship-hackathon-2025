using LibGit2Sharp;
using System.Text;

namespace Backend.Services.Git
{
    /// <summary>
    /// Serviciu pentru integrarea cu Git și obținerea diff-urilor pentru incremental review
    /// </summary>
    public class GitService
    {
        private readonly ILogger<GitService> _logger;

        public GitService(ILogger<GitService> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Obține diff-ul între două commit-uri sau branch-uri
        /// </summary>
        public GitDiffResult GetDiff(string repositoryPath, string baseRef = "HEAD~1", string targetRef = "HEAD")
        {
            try
            {
                if (!Repository.IsValid(repositoryPath))
                {
                    return new GitDiffResult
                    {
                        Success = false,
                        ErrorMessage = "Calea specificată nu este un repository Git valid"
                    };
                }

                using var repo = new Repository(repositoryPath);

                // Obține commit-urile
                var baseCommit = GetCommitFromRef(repo, baseRef);
                var targetCommit = GetCommitFromRef(repo, targetRef);

                if (baseCommit == null || targetCommit == null)
                {
                    return new GitDiffResult
                    {
                        Success = false,
                        ErrorMessage = $"Nu s-au găsit commit-urile pentru {baseRef} sau {targetRef}"
                    };
                }

                // Generează diff-ul
                var diff = repo.Diff.Compare<Patch>(baseCommit.Tree, targetCommit.Tree);

                var result = new GitDiffResult
                {
                    Success = true,
                    BaseRef = baseRef,
                    TargetRef = targetRef,
                    TotalFiles = diff.Count(),
                    Files = new List<GitFileDiff>()
                };

                foreach (var change in diff)
                {
                    var fileDiff = new GitFileDiff
                    {
                        Path = change.Path,
                        OldPath = change.OldPath,
                        Status = change.Status.ToString(),
                        Patch = change.Patch,
                        LinesAdded = change.LinesAdded,
                        LinesDeleted = change.LinesDeleted
                    };

                    result.Files.Add(fileDiff);
                }

                _logger.LogInformation("Diff obținut cu succes: {FileCount} fișiere modificate", result.TotalFiles);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la obținerea diff-ului Git");
                return new GitDiffResult
                {
                    Success = false,
                    ErrorMessage = $"Eroare: {ex.Message}"
                };
            }
        }

        /// <summary>
        /// Obține modificările unstaged (working directory vs index)
        /// </summary>
        public GitDiffResult GetUnstagedChanges(string repositoryPath)
        {
            try
            {
                if (!Repository.IsValid(repositoryPath))
                {
                    return new GitDiffResult
                    {
                        Success = false,
                        ErrorMessage = "Calea specificată nu este un repository Git valid"
                    };
                }

                using var repo = new Repository(repositoryPath);

                var diff = repo.Diff.Compare<Patch>(
                    repo.Head.Tip.Tree,
                    DiffTargets.WorkingDirectory | DiffTargets.Index
                );

                var result = new GitDiffResult
                {
                    Success = true,
                    BaseRef = "HEAD",
                    TargetRef = "Working Directory",
                    TotalFiles = diff.Count(),
                    Files = new List<GitFileDiff>()
                };

                foreach (var change in diff)
                {
                    var fileDiff = new GitFileDiff
                    {
                        Path = change.Path,
                        OldPath = change.OldPath,
                        Status = change.Status.ToString(),
                        Patch = change.Patch,
                        LinesAdded = change.LinesAdded,
                        LinesDeleted = change.LinesDeleted
                    };

                    result.Files.Add(fileDiff);
                }

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la obținerea modificărilor unstaged");
                return new GitDiffResult
                {
                    Success = false,
                    ErrorMessage = $"Eroare: {ex.Message}"
                };
            }
        }

        /// <summary>
        /// Obține modificările staged (index vs HEAD)
        /// </summary>
        public GitDiffResult GetStagedChanges(string repositoryPath)
        {
            try
            {
                if (!Repository.IsValid(repositoryPath))
                {
                    return new GitDiffResult
                    {
                        Success = false,
                        ErrorMessage = "Calea specificată nu este un repository Git valid"
                    };
                }

                using var repo = new Repository(repositoryPath);

                var diff = repo.Diff.Compare<Patch>(
                    repo.Head.Tip.Tree,
                    DiffTargets.Index
                );

                var result = new GitDiffResult
                {
                    Success = true,
                    BaseRef = "HEAD",
                    TargetRef = "Staged Changes",
                    TotalFiles = diff.Count(),
                    Files = new List<GitFileDiff>()
                };

                foreach (var change in diff)
                {
                    var fileDiff = new GitFileDiff
                    {
                        Path = change.Path,
                        OldPath = change.OldPath,
                        Status = change.Status.ToString(),
                        Patch = change.Patch,
                        LinesAdded = change.LinesAdded,
                        LinesDeleted = change.LinesDeleted
                    };

                    result.Files.Add(fileDiff);
                }

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la obținerea modificărilor staged");
                return new GitDiffResult
                {
                    Success = false,
                    ErrorMessage = $"Eroare: {ex.Message}"
                };
            }
        }

        /// <summary>
        /// Obține informații despre un repository Git
        /// </summary>
        public GitRepositoryInfo GetRepositoryInfo(string repositoryPath)
        {
            try
            {
                if (!Repository.IsValid(repositoryPath))
                {
                    return new GitRepositoryInfo
                    {
                        IsValid = false,
                        ErrorMessage = "Nu este un repository Git valid"
                    };
                }

                using var repo = new Repository(repositoryPath);

                return new GitRepositoryInfo
                {
                    IsValid = true,
                    CurrentBranch = repo.Head.FriendlyName,
                    HeadCommitSha = repo.Head.Tip?.Sha ?? "",
                    HeadCommitMessage = repo.Head.Tip?.MessageShort ?? "",
                    IsDirty = repo.RetrieveStatus().IsDirty,
                    TotalCommits = repo.Commits.Count(),
                    Branches = repo.Branches.Select(b => b.FriendlyName).ToList()
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la obținerea informațiilor despre repository");
                return new GitRepositoryInfo
                {
                    IsValid = false,
                    ErrorMessage = $"Eroare: {ex.Message}"
                };
            }
        }

        /// <summary>
        /// Obține conținutul unui fișier la o anumită referință (commit/branch)
        /// </summary>
        public string? GetFileContentAtRef(string repositoryPath, string filePath, string gitRef = "HEAD")
        {
            try
            {
                if (!Repository.IsValid(repositoryPath))
                {
                    _logger.LogWarning("Repository invalid: {Path}", repositoryPath);
                    return null;
                }

                using var repo = new Repository(repositoryPath);
                var commit = GetCommitFromRef(repo, gitRef);

                if (commit == null)
                {
                    _logger.LogWarning("Commit-ul {Ref} nu a fost găsit", gitRef);
                    return null;
                }

                var blob = commit[filePath]?.Target as Blob;
                if (blob == null)
                {
                    _logger.LogWarning("Fișierul {FilePath} nu există la {Ref}", filePath, gitRef);
                    return null;
                }

                return blob.GetContentText();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la obținerea conținutului fișierului {FilePath} la {Ref}", filePath, gitRef);
                return null;
            }
        }

        /// <summary>
        /// Validează un repository Git
        /// </summary>
        public bool IsValidRepository(string repositoryPath)
        {
            try
            {
                return Repository.IsValid(repositoryPath);
            }
            catch
            {
                return false;
            }
        }

        #region Helper Methods

        /// <summary>
        /// Obține un commit din referința specificată (SHA, branch, tag, HEAD, HEAD~1, etc.)
        /// </summary>
        private Commit? GetCommitFromRef(Repository repo, string gitRef)
        {
            try
            {
                // Încearcă să obțină ca obiect Git generic
                var gitObject = repo.Lookup(gitRef);

                if (gitObject is Commit commit)
                {
                    return commit;
                }

                if (gitObject is TagAnnotation tag)
                {
                    return tag.Target as Commit;
                }

                // Încearcă ca branch
                var branch = repo.Branches[gitRef];
                if (branch != null)
                {
                    return branch.Tip;
                }

                // Încearcă parsing pentru HEAD~1, HEAD~2, etc.
                if (gitRef.StartsWith("HEAD~"))
                {
                    var stepsBack = int.Parse(gitRef.Replace("HEAD~", ""));
                    var currentCommit = repo.Head.Tip;

                    for (int i = 0; i < stepsBack; i++)
                    {
                        currentCommit = currentCommit?.Parents.FirstOrDefault();
                        if (currentCommit == null) return null;
                    }

                    return currentCommit;
                }

                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la obținerea commit-ului pentru ref {Ref}", gitRef);
                return null;
            }
        }

        #endregion
    }

    #region DTOs

    /// <summary>
    /// Rezultatul unei operații de diff Git
    /// </summary>
    public class GitDiffResult
    {
        public bool Success { get; set; }
        public string? ErrorMessage { get; set; }
        public string BaseRef { get; set; } = "";
        public string TargetRef { get; set; } = "";
        public int TotalFiles { get; set; }
        public List<GitFileDiff> Files { get; set; } = new();
    }

    /// <summary>
    /// Informații despre un fișier modificat în diff
    /// </summary>
    public class GitFileDiff
    {
        public string Path { get; set; } = "";
        public string OldPath { get; set; } = "";
        public string Status { get; set; } = ""; // Modified, Added, Deleted, Renamed
        public string Patch { get; set; } = "";
        public int LinesAdded { get; set; }
        public int LinesDeleted { get; set; }
    }

    /// <summary>
    /// Informații despre un repository Git
    /// </summary>
    public class GitRepositoryInfo
    {
        public bool IsValid { get; set; }
        public string? ErrorMessage { get; set; }
        public string CurrentBranch { get; set; } = "";
        public string HeadCommitSha { get; set; } = "";
        public string HeadCommitMessage { get; set; } = "";
        public bool IsDirty { get; set; }
        public int TotalCommits { get; set; }
        public List<string> Branches { get; set; } = new();
    }

    #endregion
}

