using System.Text;
using System.Text.Json;

namespace Backend.Services.AI
{
    public class AiService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AiService> _logger;

        public AiService(HttpClient httpClient, IConfiguration configuration, ILogger<AiService> logger)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<AiStatusResponse> GetStatusAsync()
        {
            try
            {
                var apiKey = _configuration["AiTokenApi:ApiKey"];
                var request = new HttpRequestMessage(HttpMethod.Get, "https://api.openai.com/v1/models");
                request.Headers.Add("Authorization", $"Bearer {apiKey}");

                var response = await _httpClient.SendAsync(request);

                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    var models = JsonSerializer.Deserialize<OpenAiModelsResponse>(content);

                    return new AiStatusResponse
                    {
                        IsHealthy = true,
                        Message = "AI Service is operational",
                        AvailableModels = models?.Data?.Count ?? 0,
                        Timestamp = DateTime.UtcNow
                    };
                }
                else
                {
                    _logger.LogError("AI Service status check failed: {StatusCode}", response.StatusCode);
                    return new AiStatusResponse
                    {
                        IsHealthy = false,
                        Message = $"AI Service error: {response.StatusCode}",
                        AvailableModels = 0,
                        Timestamp = DateTime.UtcNow
                    };
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking AI Service status");
                return new AiStatusResponse
                {
                    IsHealthy = false,
                    Message = $"AI Service error: {ex.Message}",
                    AvailableModels = 0,
                    Timestamp = DateTime.UtcNow
                };
            }
        }

        public async Task<AiPromptResponse> ProcessPromptAsync(string prompt)
        {
            try
            {
                var apiKey = _configuration["AiTokenApi:ApiKey"];
                _logger.LogInformation("Using API Key: {ApiKeyPrefix}...",
                    string.IsNullOrEmpty(apiKey) ? "NULL" : apiKey.Substring(0, Math.Min(10, apiKey.Length)));

                var requestBody = new
                {
                    model = "gpt-3.5-turbo",
                    messages = new[]
                    {
                        new { role = "user", content = prompt }
                    },
                    max_tokens = 1000,
                    temperature = 0.7
                };

                var json = JsonSerializer.Serialize(requestBody);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var request = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions");
                request.Headers.Add("Authorization", $"Bearer {apiKey}");
                request.Content = content;

                var response = await _httpClient.SendAsync(request);
                var responseContent = await response.Content.ReadAsStringAsync();

                _logger.LogInformation("OpenAI API Response: Status={StatusCode}, Content={Content}",
                    response.StatusCode, responseContent);

                // Handle rate limiting with retry
                if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                {
                    _logger.LogWarning("Rate limit hit, waiting before retry...");
                    await Task.Delay(2000); // Wait 2 seconds

                    // Create a new request for retry
                    var retryRequest = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions");
                    retryRequest.Headers.Add("Authorization", $"Bearer {apiKey}");
                    retryRequest.Content = content;

                    // Retry once
                    response = await _httpClient.SendAsync(retryRequest);
                    responseContent = await response.Content.ReadAsStringAsync();
                    _logger.LogInformation("Retry OpenAI API Response: Status={StatusCode}", response.StatusCode);
                }

                if (response.IsSuccessStatusCode)
                {
                    var chatResponse = JsonSerializer.Deserialize<OpenAiChatResponse>(responseContent);
                    var aiResponse = chatResponse?.Choices?.FirstOrDefault()?.Message?.Content ?? "Nu am putut genera un răspuns.";

                    return new AiPromptResponse
                    {
                        Success = true,
                        Response = aiResponse,
                        Timestamp = DateTime.UtcNow,
                        Model = "gpt-3.5-turbo"
                    };
                }
                else
                {
                    _logger.LogError("AI prompt processing failed: {StatusCode} - {Content}", response.StatusCode, responseContent);

                    string errorMessage = response.StatusCode switch
                    {
                        System.Net.HttpStatusCode.TooManyRequests => "Limita de request-uri a fost depășită. Te rugăm să încerci din nou mai târziu.",
                        System.Net.HttpStatusCode.Unauthorized => "API key-ul nu este valid sau a expirat.",
                        System.Net.HttpStatusCode.BadRequest => "Request-ul nu este valid.",
                        _ => $"Eroare la procesarea prompt-ului: {response.StatusCode}"
                    };

                    return new AiPromptResponse
                    {
                        Success = false,
                        Response = errorMessage,
                        Timestamp = DateTime.UtcNow,
                        Model = "gpt-3.5-turbo"
                    };
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing AI prompt");
                return new AiPromptResponse
                {
                    Success = false,
                    Response = $"Eroare: {ex.Message}",
                    Timestamp = DateTime.UtcNow,
                    Model = "gpt-3.5-turbo"
                };
            }
        }
    }

    // Response models
    public class AiStatusResponse
    {
        public bool IsHealthy { get; set; }
        public string Message { get; set; } = string.Empty;
        public int AvailableModels { get; set; }
        public DateTime Timestamp { get; set; }
    }

    public class AiPromptResponse
    {
        public bool Success { get; set; }
        public string Response { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
        public string Model { get; set; } = string.Empty;
    }

    // OpenAI API Response models
    public class OpenAiModelsResponse
    {
        public List<OpenAiModel>? Data { get; set; }
    }

    public class OpenAiModel
    {
        public string? Id { get; set; }
        public string? Object { get; set; }
    }

    public class OpenAiChatResponse
    {
        public List<OpenAiChoice>? Choices { get; set; }
    }

    public class OpenAiChoice
    {
        public OpenAiMessage? Message { get; set; }
    }

    public class OpenAiMessage
    {
        public string? Content { get; set; }
    }
}
