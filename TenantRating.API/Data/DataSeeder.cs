using System.Text;
using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using TenantRating.API.Data.Entities;

namespace TenantRating.API.Data;

public static class DataSeeder
{
    public static async Task SeedAsync(AppDbContext context)
    {
        if (await context.Users.AnyAsync(u => u.Role == UserRole.Admin))
            return;

        Console.WriteLine("[Seeder] Creating default admin user...");

        using var hmac = new HMACSHA512();

        var adminUser = new User
        {
            FirstName = "System",
            LastName = "Admin",
            Email = "admin@tenantrating.com",
            PhoneNumber = "000-0000000",
            Role = UserRole.Admin,
            IsActive = true,
            DateJoined = DateTime.UtcNow,
            PasswordHash = hmac.ComputeHash(Encoding.UTF8.GetBytes("Admin123!")),
            PasswordSalt = hmac.Key
        };

        context.Users.Add(adminUser);
        await context.SaveChangesAsync();
        
        Console.WriteLine("[Seeder] Admin user created: admin@tenantrating.com / Admin123!");
    }
}
