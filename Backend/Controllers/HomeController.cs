using System.Diagnostics;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Backend.Areas.Identity.Data;
using Microsoft.AspNetCore.Identity;

namespace Backend.Controllers
{
    [Authorize]
    public class HomeController : Controller
    {
        private readonly ILogger<HomeController> _logger;
        private readonly UserManager<ApplicationUser> _userManager;

        public HomeController(ILogger<HomeController> logger, UserManager<ApplicationUser> userManager)
        {
            _logger = logger;
            _userManager = userManager;
        }

        [Authorize]
        public IActionResult GetToApi()
        {
            return Redirect("~/swagger");
        }

        public async Task<IActionResult> Index()
        {
            // Obține statistici utilizatori
            var users = _userManager.Users.ToList();
            var totalUsers = users.Count;
            var verifiedUsers = users.Count(u => u.IsEmailVerified);
            var adminUsers = users.Where(u => _userManager.IsInRoleAsync(u, "Admin").Result).Count();
            var recentUsers = users.Count(u => u.CreatedAt > DateTime.UtcNow.AddDays(-30));

            // Statistici pentru utilizatorul curent
            var currentUser = await _userManager.GetUserAsync(User);
            var userRoles = currentUser != null ? await _userManager.GetRolesAsync(currentUser) : new List<string>();

            // Pregătește datele pentru graficele din ultimele 7 zile (implicit)
            var last7Days = Enumerable.Range(0, 7).Select(i => DateTime.UtcNow.Date.AddDays(-6 + i)).ToList();
            
            // Grafic 1: Utilizatori înregistrați pe zi
            var registrationsByDay = last7Days.Select(date => new
            {
                Date = date.ToString("dd MMM"),
                Count = users.Count(u => u.CreatedAt.Date == date)
            }).ToList();

            // Grafic 2: Logări zilnice (pe baza LastLoginAt)
            var loginsByDay = last7Days.Select(date => new
            {
                Date = date.ToString("dd MMM"),
                Count = users.Count(u => u.LastLoginAt.HasValue && u.LastLoginAt.Value.Date == date)
            }).ToList();

            ViewBag.TotalUsers = totalUsers;
            ViewBag.VerifiedUsers = verifiedUsers;
            ViewBag.AdminUsers = adminUsers;
            ViewBag.RecentUsers = recentUsers;
            ViewBag.CurrentUser = currentUser;
            ViewBag.UserRoles = userRoles;
            ViewBag.UserID = currentUser?.Id;
            
            // Date pentru grafice
            ViewBag.RegistrationDates = System.Text.Json.JsonSerializer.Serialize(registrationsByDay.Select(x => x.Date));
            ViewBag.RegistrationCounts = System.Text.Json.JsonSerializer.Serialize(registrationsByDay.Select(x => x.Count));
            ViewBag.LoginDates = System.Text.Json.JsonSerializer.Serialize(loginsByDay.Select(x => x.Date));
            ViewBag.LoginCounts = System.Text.Json.JsonSerializer.Serialize(loginsByDay.Select(x => x.Count));

            return View();
        }

        [HttpGet]
        public IActionResult GetChartData(int days = 30)
        {
            var users = _userManager.Users.ToList();
            var startDate = DateTime.UtcNow.Date.AddDays(-days + 1);
            var dateRange = Enumerable.Range(0, days).Select(i => startDate.AddDays(i)).ToList();
            
            _logger.LogInformation($"Getting chart data for {days} days. Total users: {users.Count}");
            _logger.LogInformation($"Users with LastLoginAt: {users.Count(u => u.LastLoginAt.HasValue)}");
            
            // Utilizatori înregistrați pe zi
            var registrationsByDay = dateRange.Select(date => new
            {
                Date = date.ToString("dd MMM"),
                Count = users.Count(u => u.CreatedAt.Date == date)
            }).ToList();

            // Logări zilnice
            var loginsByDay = dateRange.Select(date => new
            {
                Date = date.ToString("dd MMM"),
                Count = users.Count(u => u.LastLoginAt.HasValue && u.LastLoginAt.Value.Date == date)
            }).ToList();

            return Json(new
            {
                registrationDates = registrationsByDay.Select(x => x.Date),
                registrationCounts = registrationsByDay.Select(x => x.Count),
                loginDates = loginsByDay.Select(x => x.Date),
                loginCounts = loginsByDay.Select(x => x.Count),
                totalUsers = users.Count,
                usersWithLogin = users.Count(u => u.LastLoginAt.HasValue)
            });
        }

        [HttpGet]
        public IActionResult GetUserStats()
        {
            var users = _userManager.Users.ToList();
            var stats = new
            {
                totalUsers = users.Count,
                usersWithLastLogin = users.Count(u => u.LastLoginAt.HasValue),
                recentLogins = users.Where(u => u.LastLoginAt.HasValue)
                    .OrderByDescending(u => u.LastLoginAt)
                    .Take(10)
                    .Select(u => new
                    {
                        email = u.Email,
                        lastLogin = u.LastLoginAt,
                        createdAt = u.CreatedAt
                    }).ToList()
            };
            
            return Json(stats);
        }

        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
