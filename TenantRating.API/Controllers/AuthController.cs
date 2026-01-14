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
}
