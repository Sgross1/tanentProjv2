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
