using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Areas.Identity.Data;

public class AuthDbContext : IdentityDbContext<ApplicationUser>
{
    public AuthDbContext(DbContextOptions<AuthDbContext> options)
        : base(options)
    {
    }

    // DbSet pentru AI Code Review
    public DbSet<ReviewHistory> ReviewHistories { get; set; }

    // DbSet pentru Proiecte
    public DbSet<Project> Projects { get; set; }
    public DbSet<ProjectFile> ProjectFiles { get; set; }

    // DbSet pentru Comentarii (Threaded Comments System)
    public DbSet<Comment> Comments { get; set; }

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

        // Configurare Comment (threaded comments cu self-referencing)
        builder.Entity<Comment>(entity =>
        {
            entity.ToTable("Comments");

            // Relația self-referencing pentru replies
            entity.HasOne(c => c.Parent)
                .WithMany(c => c.Replies)
                .HasForeignKey(c => c.ParentId)
                .OnDelete(DeleteBehavior.Restrict); // Nu șterge cascade pentru a preveni probleme

            // Relația cu ReviewHistory
            entity.HasOne(c => c.Review)
                .WithMany()
                .HasForeignKey(c => c.ReviewId)
                .OnDelete(DeleteBehavior.Cascade);

            // Relația cu ApplicationUser (Author)
            entity.HasOne(c => c.Author)
                .WithMany()
                .HasForeignKey(c => c.AuthorId)
                .OnDelete(DeleteBehavior.Restrict);

            // Index-uri pentru performanță
            entity.HasIndex(c => c.ReviewId);
            entity.HasIndex(c => c.AuthorId);
            entity.HasIndex(c => c.ParentId);
            entity.HasIndex(c => new { c.FilePath, c.LineNumber });
            entity.HasIndex(c => c.Status);
        });

    }
}
