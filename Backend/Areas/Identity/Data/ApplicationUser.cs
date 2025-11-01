using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Areas.Identity.Data

{
    public class ApplicationUser : IdentityUser
    {
        [PersonalData]
        [Column(TypeName = "nvarchar(100)")]
        public string? FirstName { get; set; }

        [PersonalData]
        [Column(TypeName = "nvarchar(100)")]
        public string? LastName { get; set; }

        [PersonalData]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [PersonalData]
        public DateTime? LastModifiedAt { get; set; }

        [PersonalData]
        public DateTime? LastLoginAt { get; set; }

        [PersonalData]
        public bool IsEmailVerified { get; set; }

        [PersonalData]
        public DateTime? EmailVerifiedAt { get; set; }

        [PersonalData]
        public string? RefreshToken { get; set; }

        [PersonalData]
        public DateTime? RefreshTokenExpiryTime { get; set; }

        [PersonalData]
        public string? VerificationCode { get; set; }

        [PersonalData]
        public DateTime? VerificationCodeExpiryTime { get; set; }

        [PersonalData]
        public string? ResetPasswordCode { get; set; }

        [PersonalData]
        public DateTime? VerificationCodePasswordExpiryTime { get; set; }

        [PersonalData]
        public DateTime? LockoutEndPasswordReset { get; set; }

        [PersonalData]
        public int AccessFailedCountPasswordReset { get; set; }


        public void UpdateLastModified()
        {
            LastModifiedAt = DateTime.UtcNow;
        }

        public void UpdateLastLogin()
        {
            LastLoginAt = DateTime.UtcNow;
        }

        public void MarkEmailAsVerified()
        {
            IsEmailVerified = true;
            EmailVerifiedAt = DateTime.UtcNow;
            UpdateLastModified();
        }

        public void SetVerificationCode()
        {
            VerificationCode = new Random().Next(100000, 999999).ToString();
            VerificationCodeExpiryTime = DateTime.UtcNow.AddMinutes(10);
        }

        public bool IsVerificationCodeExpired()
        {
            return !VerificationCodeExpiryTime.HasValue || DateTime.UtcNow > VerificationCodeExpiryTime.Value;
        }

        public void SetPasswordResetVerificationCode()
        {
            ResetPasswordCode = new Random().Next(100000, 999999).ToString();
            VerificationCodePasswordExpiryTime = DateTime.UtcNow.AddMinutes(10);
        }

        public bool IsPasswordResetVerificationCodeExpired()
        {
            return !VerificationCodePasswordExpiryTime.HasValue || DateTime.UtcNow > VerificationCodePasswordExpiryTime.Value;
        }

        public void SetLockoutEndPasswordReset()
        {
            LockoutEndPasswordReset = DateTime.UtcNow.AddMinutes(10);
        }

        public bool IsLockoutEndPasswordResetExpired()
        {
            if (!LockoutEndPasswordReset.HasValue)
            {
                return false;
            }
            return DateTime.UtcNow > LockoutEndPasswordReset.Value;
        }
    }
}
