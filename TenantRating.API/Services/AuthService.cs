using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using TenantRating.API.Data;
using TenantRating.API.Data.Entities;

namespace TenantRating.API.Services;

public interface IAuthService
{
    Task<User?> Register(User user, string password);
    Task<string?> Login(string email, string password);
    Task<User?> GetUser(string email);
    Task<bool> UserExists(string email);
    Task<string?> GeneratePasswordResetToken(string email);
    Task<bool> ResetPassword(string token, string newPassword);
}

public class AuthService : IAuthService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;

    public AuthService(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    public async Task<User?> Register(User user, string password)
    {
        if (await UserExists(user.Email)) return null;

        CreatePasswordHash(password, out byte[] passwordHash, out byte[] passwordSalt);

        user.PasswordHash = passwordHash;
        user.PasswordSalt = passwordSalt;

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return user;
    }

    public async Task<string?> Login(string email, string password)
    {
        var user = await _context.Users
            .Include(u => u.Requests)
            .Include(u => u.SavedRequests)
            .FirstOrDefaultAsync(x => x.Email == email);

        if (user == null) return null;

        if (!VerifyPasswordHash(password, user.PasswordHash, user.PasswordSalt)) return null;

        // Dynamic Role Logic (Transient - does not save to DB, just for Token)
        if (user.Requests.Any() && user.SavedRequests.Any()) user.Role = UserRole.Both;
        else if (user.Requests.Any()) user.Role = UserRole.Tenant;
        else if (user.SavedRequests.Any()) user.Role = UserRole.Landlord;

        return CreateToken(user);
    }

    public async Task<User?> GetUser(string email)
    {
        var user = await _context.Users
            .Include(u => u.Requests)
            .Include(u => u.SavedRequests)
            .FirstOrDefaultAsync(x => x.Email == email);

        if (user != null)
        {
            if (user.Requests.Any() && user.SavedRequests.Any()) user.Role = UserRole.Both;
            else if (user.Requests.Any()) user.Role = UserRole.Tenant;
            else if (user.SavedRequests.Any()) user.Role = UserRole.Landlord;
        }

        return user;
    }

    public async Task<bool> UserExists(string email)
    {
        return await _context.Users.AnyAsync(x => x.Email == email);
    }

    public async Task<string?> GeneratePasswordResetToken(string email)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null) return null;

        // Generate simple 6-digit code for "Mock" simulation ease
        // In real life, could be a Guid or cryptographically secure string
        var token = new Random().Next(100000, 999999).ToString();

        user.ResetToken = token;
        user.ResetTokenExpiration = DateTime.UtcNow.AddMinutes(15); // Valid for 15 mins

        await _context.SaveChangesAsync();
        return token;
    }

    public async Task<bool> ResetPassword(string token, string newPassword)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.ResetToken == token);

        if (user == null) return false;
        if (user.ResetTokenExpiration < DateTime.UtcNow) return false; // Expired

        CreatePasswordHash(newPassword, out byte[] passwordHash, out byte[] passwordSalt);

        user.PasswordHash = passwordHash;
        user.PasswordSalt = passwordSalt;

        // Clear token
        user.ResetToken = null;
        user.ResetTokenExpiration = null;

        await _context.SaveChangesAsync();
        return true;
    }

    private void CreatePasswordHash(string password, out byte[] passwordHash, out byte[] passwordSalt)
    {
        using var hmac = new HMACSHA512();
        passwordSalt = hmac.Key;
        passwordHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(password));
    }

    private bool VerifyPasswordHash(string password, byte[] storedHash, byte[] storedSalt)
    {
        using var hmac = new HMACSHA512(storedSalt);
        var computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(password));
        for (int i = 0; i < computedHash.Length; i++)
        {
            if (computedHash[i] != storedHash[i]) return false;
        }
        return true;
    }

    private string CreateToken(User user)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Email),
            new Claim(ClaimTypes.Role, user.Role.ToString()) // Claims Role
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration.GetSection("Jwt:Key").Value!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha512Signature);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.Now.AddDays(1),
            SigningCredentials = creds,
            Issuer = _configuration["Jwt:Issuer"],
            Audience = _configuration["Jwt:Audience"]
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);

        return tokenHandler.WriteToken(token);
    }
}
