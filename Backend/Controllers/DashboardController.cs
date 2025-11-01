using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Backend.Controllers
{
    [Authorize]
    public class DashboardController : Controller
    {
        private readonly ILogger<DashboardController> _logger;

        public DashboardController(ILogger<DashboardController> logger)
        {
            _logger = logger;
        }

        public IActionResult Index()
        {
            // Obține informațiile despre utilizatorul autentificat
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;
            var userName = User.FindFirst(ClaimTypes.Name)?.Value;

            ViewBag.UserId = userId;
            ViewBag.UserEmail = userEmail;
            ViewBag.UserName = userName;
            ViewBag.IsAuthenticated = User.Identity?.IsAuthenticated ?? false;

            return View();
        }

        [HttpGet]
        public IActionResult GetUserInfo()
        {
            var userInfo = new
            {
                IsAuthenticated = User.Identity?.IsAuthenticated ?? false,
                UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                Email = User.FindFirst(ClaimTypes.Email)?.Value,
                Name = User.FindFirst(ClaimTypes.Name)?.Value,
                Claims = User.Claims.Select(c => new { c.Type, c.Value }).ToList()
            };

            return Json(userInfo);
        }
    }
}
