using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Backend.Services.AI
{
    /// <summary>
    /// Client pentru comunicarea cu Ollama API (local LLM)
    /// Suportă CodeLlama și Llama3 pentru code review
    /// </summary>
    public class LLMClient
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<LLMClient> _logger;
        private readonly string _ollamaBaseUrl;
        private readonly string _defaultModel;

        public LLMClient(HttpClient httpClient, IConfiguration configuration, ILogger<LLMClient> logger)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _logger = logger;

            // Configurare URL Ollama (default: http://localhost:11434)
            _ollamaBaseUrl = _configuration["Ollama:BaseUrl"] ?? "http://localhost:11434";
            _defaultModel = _configuration["Ollama:DefaultModel"] ?? "codellama";

            _httpClient.Timeout = TimeSpan.FromMinutes(5); // LLM poate dura mai mult
        }

        /// <summary>
        /// Trimite un prompt către Ollama și returnează răspunsul
        /// </summary>
        public async Task<string> SendPromptAsync(string prompt, string? model = null, bool jsonMode = true)
        {
            try
            {
                var selectedModel = model ?? _defaultModel;
                _logger.LogInformation("Trimit prompt către Ollama (model: {Model})", selectedModel);

                var requestBody = new OllamaChatRequest
                {
                    Model = selectedModel,
                    Messages = new List<OllamaMessage>
                    {
                        new OllamaMessage
                        {
                            Role = "system",
                            Content = "You are a senior software engineer performing code review. Always respond with valid JSON only, no additional text."
                        },
                        new OllamaMessage
                        {
                            Role = "user",
                            Content = prompt
                        }
                    },
                    Stream = false,
                    Format = jsonMode ? "json" : null,
                    Options = new OllamaOptions
                    {
                        Temperature = 0.3, // Permite înțelegere mai bună a contextului
                        TopP = 0.5, // Balans între precizie și flexibilitate
                        NumPredict = 4096
                    }
                };

                var json = JsonSerializer.Serialize(requestBody, new JsonSerializerOptions
                {
                    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                });

                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync($"{_ollamaBaseUrl}/api/chat", content);
                var responseContent = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Ollama API a returnat status code: {StatusCode}, Content: {Content}",
                        response.StatusCode, responseContent);
                    throw new Exception($"Ollama API error: {response.StatusCode}");
                }

                var chatResponse = JsonSerializer.Deserialize<OllamaChatResponse>(responseContent,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                var aiResponse = chatResponse?.Message?.Content ?? string.Empty;

                if (string.IsNullOrWhiteSpace(aiResponse))
                {
                    throw new Exception("Ollama a returnat un răspuns gol");
                }

                _logger.LogInformation("Răspuns primit de la Ollama ({Length} caractere)", aiResponse.Length);
                return aiResponse;
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "Eroare de rețea la comunicarea cu Ollama. Verifică dacă Ollama rulează pe {Url}", _ollamaBaseUrl);
                throw new Exception($"Nu se poate conecta la Ollama. Asigură-te că Ollama rulează pe {_ollamaBaseUrl}", ex);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la trimiterea prompt-ului către Ollama");
                throw;
            }
        }

        /// <summary>
        /// Verifică dacă Ollama este disponibil și returnează modelele disponibile
        /// </summary>
        public async Task<List<string>> GetAvailableModelsAsync()
        {
            try
            {
                var response = await _httpClient.GetAsync($"{_ollamaBaseUrl}/api/tags");

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Nu s-au putut obține modelele disponibile de la Ollama");
                    return new List<string>();
                }

                var content = await response.Content.ReadAsStringAsync();
                var modelsResponse = JsonSerializer.Deserialize<OllamaModelsResponse>(content,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                return modelsResponse?.Models?.Select(m => m.Name ?? "").Where(n => !string.IsNullOrEmpty(n)).ToList()
                    ?? new List<string>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la obținerea listei de modele de la Ollama");
                return new List<string>();
            }
        }

        /// <summary>
        /// Verifică health status-ul serviciului Ollama
        /// </summary>
        public async Task<bool> CheckHealthAsync()
        {
            try
            {
                var response = await _httpClient.GetAsync($"{_ollamaBaseUrl}/api/tags");
                return response.IsSuccessStatusCode;
            }
            catch
            {
                return false;
            }
        }
    }

    #region Ollama API Models

    public class OllamaChatRequest
    {
        [JsonPropertyName("model")]
        public string Model { get; set; } = string.Empty;

        [JsonPropertyName("messages")]
        public List<OllamaMessage> Messages { get; set; } = new();

        [JsonPropertyName("stream")]
        public bool Stream { get; set; }

        [JsonPropertyName("format")]
        public string? Format { get; set; }

        [JsonPropertyName("options")]
        public OllamaOptions? Options { get; set; }
    }

    public class OllamaMessage
    {
        [JsonPropertyName("role")]
        public string Role { get; set; } = string.Empty;

        [JsonPropertyName("content")]
        public string Content { get; set; } = string.Empty;
    }

    public class OllamaOptions
    {
        [JsonPropertyName("temperature")]
        public double Temperature { get; set; } = 0.7;

        [JsonPropertyName("top_p")]
        public double TopP { get; set; } = 0.9;

        [JsonPropertyName("num_predict")]
        public int NumPredict { get; set; } = 2048;
    }

    public class OllamaChatResponse
    {
        [JsonPropertyName("model")]
        public string? Model { get; set; }

        [JsonPropertyName("created_at")]
        public string? CreatedAt { get; set; }

        [JsonPropertyName("message")]
        public OllamaMessage? Message { get; set; }

        [JsonPropertyName("done")]
        public bool Done { get; set; }
    }

    public class OllamaModelsResponse
    {
        [JsonPropertyName("models")]
        public List<OllamaModelInfo>? Models { get; set; }
    }

    public class OllamaModelInfo
    {
        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("modified_at")]
        public string? ModifiedAt { get; set; }

        [JsonPropertyName("size")]
        public long Size { get; set; }
    }

    #endregion
}

