using Microsoft.AspNetCore.Mvc;
using TenantRating.API.Data.Entities;
using TenantRating.API.DTOs;
using TenantRating.API.Services;
using System.Net.Http.Json;
using System.IO;

namespace TenantRating.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IConfiguration _configuration;

    public AuthController(IAuthService authService, IConfiguration configuration)
    {
        _authService = authService;
        _configuration = configuration;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponseDto>> Register(RegisterDto dto)
    {
        Console.WriteLine($"[API] Register request received for: {dto.Email}"); // Debug Log
        if (!Enum.TryParse<UserRole>(dto.Role, true, out var role))
        {
            return BadRequest("Invalid Role");
        }

        var user = new User
        {
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Email = dto.Email,
            PhoneNumber = dto.PhoneNumber,
            Role = role
        };

        var result = await _authService.Register(user, dto.Password);
        if (result == null) return BadRequest("User already exists");

        // Auto login after register
        var token = await _authService.Login(dto.Email, dto.Password);

        return new AuthResponseDto
        {
            Token = token!,
            Role = user.Role.ToString(),
            FirstName = user.FirstName
        };
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login(LoginDto dto)
    {
        var token = await _authService.Login(dto.Email, dto.Password);
        if (token == null) return Unauthorized("Invalid email or password");

        var user = await _authService.GetUser(dto.Email);

        return new AuthResponseDto
        {
            Token = token,
            Role = user?.Role.ToString() ?? "Tenant",
            FirstName = user?.FirstName ?? "User"
        };
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordDto dto)
    {
        Console.WriteLine($"[DEBUG] Received forgot password request for: {dto.Email}");
        var token = await _authService.GeneratePasswordResetToken(dto.Email);

        if (token != null)
        {
            var resetLink = $"http://localhost:4200/reset-password?token={token}";

            Console.WriteLine("=================================================");
            Console.WriteLine($"[EMAIL SIMULATION] To: {dto.Email}");
            Console.WriteLine($"[EMAIL SIMULATION] Subject: Password Reset Request");
            Console.WriteLine($"[EMAIL SIMULATION] Body: Click here to reset: {resetLink}");
            Console.WriteLine($"[EMAIL SIMULATION] Token Code: {token}");
            Console.WriteLine("=================================================");
            ///////
            try
            {
                using var client = new HttpClient();
                // הגדרת כותרת האבטחה עם ה-API KEY שלך מתוך ההגדרות
                var apiKey = _configuration["Resend:ApiKey"];
                client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);
                // קריאת ה-HTML מהקובץ החיצוני והחלפת המשתנים
                string emailHtml = await GetEmailTemplate(resetLink, token);
                // יצירת גוף ההודעה כפי ש-Resend מצפה לקבל
                var emailPayload = new
                {
                    from = "onboarding@resend.dev",
                    to = "a0583264755@gmail.com", // המייל האישי שלך כפי שביקשת
                    subject = "איפוס סיסמה - KaLiScore",
                    html = emailHtml
                };


                // שליחת הבקשה לשרתים של Resend
                var response = await client.PostAsJsonAsync("https://api.resend.com/emails", emailPayload);
                if (response.IsSuccessStatusCode)
                {
                    Console.WriteLine($"[SUCCESS] Email sent successfully to: {dto.Email}");
                }
                else
                {
                    Console.WriteLine($"[ERROR] Failed to send email via Resend: {response.StatusCode} - {await response.Content.ReadAsStringAsync()}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Failed to send email via Resend: {ex.Message}");
            }
            /////////

        }
        else
        {
            Console.WriteLine($"[DEBUG] User not found for email: {dto.Email}");
        }

        return Ok(new { message = "If the email exists, a reset link has been sent." });
    }

    private async Task<string> GetEmailTemplate(string resetLink, string token)
    {
        var filePath = Path.Combine(Directory.GetCurrentDirectory(), "Templates", "ResetPassword.html");
        var html = await System.IO.File.ReadAllTextAsync(filePath);

        // החלפת ה"ממלאי מקום" בנתונים האמיתיים
        return html.Replace("{resetLink}", resetLink).Replace("{token}", token);
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordDto dto)
    {
        var success = await _authService.ResetPassword(dto.Token, dto.NewPassword);
        if (!success) return BadRequest("Invalid or expired token.");

        return Ok(new { message = "Password has been reset successfully." });
    }
}
