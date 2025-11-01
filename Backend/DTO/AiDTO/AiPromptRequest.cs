using System.ComponentModel.DataAnnotations;

namespace Backend.DTO.AiDTO
{
    public class AiPromptRequest
    {
        [Required(ErrorMessage = "Parametrul 'x' este obligatoriu")]
        [StringLength(500, ErrorMessage = "Parametrul 'x' nu poate depăși 500 de caractere")]
        public string X { get; set; } = string.Empty;
    }
}
