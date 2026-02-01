using Microsoft.AspNetCore.Mvc;
using TenantRating.API.Data.Entities;
using TenantRating.API.DTOs;
using TenantRating.API.Services;

namespace TenantRating.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
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
        }
        else
        {
             Console.WriteLine($"[DEBUG] User not found for email: {dto.Email}");
        }

        return Ok(new { message = "If the email exists, a reset link has been sent." });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordDto dto)
    {
        var success = await _authService.ResetPassword(dto.Token, dto.NewPassword);
        if (!success) return BadRequest("Invalid or expired token.");

        return Ok(new { message = "Password has been reset successfully." });
    }
}
