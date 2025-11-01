using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Backend.Areas.Identity.Data;

public class AuthDbContext : IdentityDbContext<ApplicationUser>
{
    public AuthDbContext(DbContextOptions<AuthDbContext> options)
        : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<ApplicationUser>(b =>
        {
            b.ToTable("Users");

            // Configurăm coloanele personalizate
            b.Property(u => u.FirstName).HasColumnType("TEXT");
            b.Property(u => u.LastName).HasColumnType("TEXT");
            b.Property(u => u.CreatedAt).HasColumnType("TEXT");
            b.Property(u => u.LastModifiedAt).HasColumnType("TEXT");
            b.Property(u => u.LastLoginAt).HasColumnType("TEXT");
            b.Property(u => u.IsEmailVerified).HasColumnType("INTEGER");
            b.Property(u => u.EmailVerifiedAt).HasColumnType("TEXT");
            b.Property(u => u.RefreshToken).HasColumnType("TEXT");
            b.Property(u => u.RefreshTokenExpiryTime).HasColumnType("TEXT");
            b.Property(u => u.VerificationCode).HasColumnType("TEXT");
            b.Property(u => u.VerificationCodeExpiryTime).HasColumnType("TEXT");
            b.Property(u => u.ResetPasswordCode).HasColumnType("TEXT");
            b.Property(u => u.VerificationCodePasswordExpiryTime).HasColumnType("TEXT");

        });

        builder.Entity<IdentityRole>().ToTable("Roles");
        builder.Entity<IdentityUserRole<string>>().ToTable("UserRoles");
        builder.Entity<IdentityUserClaim<string>>().ToTable("UserClaims");
        builder.Entity<IdentityUserLogin<string>>().ToTable("UserLogins");
        builder.Entity<IdentityRoleClaim<string>>().ToTable("RoleClaims");
        builder.Entity<IdentityUserToken<string>>().ToTable("UserTokens");

    }
}
