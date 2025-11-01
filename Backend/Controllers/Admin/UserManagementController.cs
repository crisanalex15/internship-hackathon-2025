using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Backend.Areas.Identity.Data;
using Backend.Services.Auth;
using Backend.Services.Email;

namespace Backend.Controllers.Admin
{
    [Authorize(Roles = "Admin")]
    public class UserManagementController : Controller
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IAuthService _authService;
        private readonly IEmailService _emailService;
        private readonly ILogger<UserManagementController> _logger;

        public UserManagementController(
            UserManager<ApplicationUser> userManager,
            IAuthService authService,
            IEmailService emailService,
            ILogger<UserManagementController> logger)
        {
            _userManager = userManager;
            _authService = authService;
            _emailService = emailService;
            _logger = logger;
        }

        public async Task<IActionResult> Index()
        {
            var users = _userManager.Users.ToList();
            var userViewModels = new List<UserManagementViewModel>();

            foreach (var user in users)
            {
                var roles = await _userManager.GetRolesAsync(user);
                var isLocked = user.LockoutEnd.HasValue && user.LockoutEnd > DateTimeOffset.UtcNow;

                userViewModels.Add(new UserManagementViewModel
                {
                    User = user,
                    Roles = roles.ToList(),
                    IsLocked = isLocked
                });
            }

            // Calculăm statistici
            var totalUsers = users.Count;
            var verifiedUsers = users.Count(u => u.IsEmailVerified);
            var adminUsers = userViewModels.Count(vm => vm.Roles.Contains("Admin"));

            ViewBag.TotalUsers = totalUsers;
            ViewBag.VerifiedUsers = verifiedUsers;
            ViewBag.AdminUsers = adminUsers;
            ViewBag.CurrentUser = await _userManager.GetUserAsync(User);

            return View(userViewModels);
        }

        [HttpGet]
        public async Task<IActionResult> Details(string id)
        {
            if (string.IsNullOrEmpty(id))
            {
                return NotFound();
            }

            var user = await _userManager.FindByIdAsync(id);
            if (user == null)
            {
                return NotFound();
            }

            return View(user);
        }

        [HttpPost]
        public async Task<IActionResult> DeleteUser([FromBody] UserActionRequest request)
        {
            if (string.IsNullOrEmpty(request.UserId))
            {
                return Json(new { success = false, message = "User ID is required" });
            }

            var user = await _userManager.FindByIdAsync(request.UserId);
            if (user == null)
            {
                return Json(new { success = false, message = "User not found" });
            }

            var result = await _userManager.DeleteAsync(user);
            if (result.Succeeded)
            {
                _logger.LogInformation("Deleted user {UserId}", request.UserId);
                return Json(new { success = true });
            }

            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            return Json(new { success = false, message = errors });
        }

        [HttpPost]
        public async Task<IActionResult> ToggleAdminRole([FromBody] UserActionRequest request)
        {
            var user = await _userManager.FindByIdAsync(request.UserId);
            if (user == null)
            {
                return Json(new { success = false, message = "User not found" });
            }

            var isAdmin = await _userManager.IsInRoleAsync(user, "Admin");

            if (isAdmin)
            {
                // Remove from Admin role
                var result = await _userManager.RemoveFromRoleAsync(user, "Admin");
                if (result.Succeeded)
                {
                    _logger.LogInformation("Removed user {UserId} from Admin role", request.UserId);
                    return Json(new { success = true, action = "removed" });
                }
                return Json(new { success = false, message = "Failed to remove Admin role" });
            }
            else
            {
                // Add to Admin role
                var result = await _userManager.AddToRoleAsync(user, "Admin");
                if (result.Succeeded)
                {
                    _logger.LogInformation("Added user {UserId} to Admin role", request.UserId);
                    return Json(new { success = true, action = "added" });
                }
                return Json(new { success = false, message = "Failed to add Admin role" });
            }
        }

        [HttpPost]
        public async Task<IActionResult> ToggleLockout([FromBody] UserActionRequest request)
        {
            var user = await _userManager.FindByIdAsync(request.UserId);
            if (user == null)
            {
                return Json(new { success = false, message = "User not found" });
            }

            if (user.LockoutEnd.HasValue && user.LockoutEnd > DateTimeOffset.UtcNow)
            {
                // Unlock user
                user.LockoutEnd = null;
                await _userManager.UpdateAsync(user);
                _logger.LogInformation("Unlocked user {UserId}", request.UserId);
                return Json(new { success = true, action = "unlocked" });
            }
            else
            {
                // Lock user for 24 hours
                user.LockoutEnd = DateTimeOffset.UtcNow.AddHours(24);
                await _userManager.UpdateAsync(user);
                _logger.LogInformation("Locked user {UserId} for 24 hours", request.UserId);
                return Json(new { success = true, action = "locked" });
            }
        }

        [HttpPost]
        public async Task<IActionResult> ResetPassword([FromBody] UserActionRequest request)
        {
            var user = await _userManager.FindByIdAsync(request.UserId);
            if (user == null)
            {
                return Json(new { success = false, message = "User not found" });
            }

            try
            {
                user.SetPasswordResetVerificationCode();
                await _userManager.UpdateAsync(user);
                await _emailService.SendPasswordResetEmailAsync(user.Email!, user.ResetPasswordCode!);
                _logger.LogInformation("Sent password reset email to user {UserId}", request.UserId);
                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending password reset email for user {UserId}", request.UserId);
                return Json(new { success = false, message = "Failed to send password reset email" });
            }
        }

        [HttpPost]
        public async Task<IActionResult> VerifyEmail([FromBody] UserActionRequest request)
        {
            var user = await _userManager.FindByIdAsync(request.UserId);
            if (user == null)
            {
                return Json(new { success = false, message = "User not found" });
            }

            if (user.IsEmailVerified)
            {
                return Json(new { success = false, message = "Email already verified" });
            }

            // Manual email verification
            user.IsEmailVerified = true;
            user.EmailVerifiedAt = DateTime.UtcNow;
            user.MarkEmailAsVerified();

            var result = await _userManager.UpdateAsync(user);
            if (result.Succeeded)
            {
                _logger.LogInformation("Manually verified email for user {UserId}", request.UserId);
                return Json(new { success = true });
            }

            return Json(new { success = false, message = "Failed to verify email" });
        }

        [HttpPost]
        public async Task<IActionResult> SendVerificationEmail([FromBody] UserActionRequest request)
        {
            var user = await _userManager.FindByIdAsync(request.UserId);
            if (user == null)
            {
                return Json(new { success = false, message = "User not found" });
            }

            if (user.IsEmailVerified)
            {
                return Json(new { success = false, message = "Email already verified" });
            }

            try
            {
                var (succeeded, errors) = await _authService.SendVerificationCodeEmailAsync(user.Email!);
                if (succeeded)
                {
                    _logger.LogInformation("Sent verification email to user {UserId}", request.UserId);
                    return Json(new { success = true });
                }

                return Json(new { success = false, message = string.Join(", ", errors) });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending verification email for user {UserId}", request.UserId);
                return Json(new { success = false, message = "Failed to send verification email" });
            }
        }

    }

    public class UserActionRequest
    {
        public ApplicationUser User { get; set; }
        public string UserId { get; set; }
    }

    public class UserManagementViewModel
    {
        public ApplicationUser User { get; set; }
        public List<string> Roles { get; set; } = new();
        public bool IsLocked { get; set; }
    }
}

