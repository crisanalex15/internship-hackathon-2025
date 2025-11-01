using Backend.Areas.Identity.Data;
using Microsoft.AspNetCore.Authentication;

namespace Backend.Services.Auth
{
    public interface ISocialAuthService
    {
        Task<(bool Success, ApplicationUser? User, string? Token, string? RefreshToken, string? Error)> ProcessSocialLoginAsync(
            string provider,
            string providerKey,
            string email,
            string? firstName = null,
            string? lastName = null);

        Task<string> GetSocialLoginUrlAsync(string provider, string returnUrl);

        Task<(bool Success, string? Error)> LinkSocialAccountAsync(string userId, string provider, string providerKey);

        Task<(bool Success, string? Error)> UnlinkSocialAccountAsync(string userId, string provider);
    }
}
