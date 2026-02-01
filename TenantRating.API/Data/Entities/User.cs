using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TenantRating.API.Data.Entities;

public enum UserRole
{
    Tenant,
    Landlord,
    Admin,
    Both
}

public class User
{
    public int Id { get; set; }
    
    [Required]
    public string FirstName { get; set; } = string.Empty;
    
    [Required]
    public string LastName { get; set; } = string.Empty;
    
    [Required]
    public string Email { get; set; } = string.Empty;
    
    public string PhoneNumber { get; set; } = string.Empty;
    
    public UserRole Role { get; set; }
    
    public byte[] PasswordHash { get; set; } = Array.Empty<byte>();
    public byte[] PasswordSalt { get; set; } = Array.Empty<byte>();
    
    public bool IsActive { get; set; } = true;
    
    public DateTime DateJoined { get; set; } = DateTime.UtcNow;

    public string? ResetToken { get; set; }
    public DateTime? ResetTokenExpiration { get; set; }

    [InverseProperty("User")]
    public List<Request> Requests { get; set; } = new();
    
    [InverseProperty("LandlordUser")]
    public List<SavedRequest> SavedRequests { get; set; } = new();
}
