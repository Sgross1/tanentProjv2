using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using TenantRating.API.Data;
using TenantRating.API.Data.Entities;

namespace TenantRating.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _context;
    public AdminController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("stats")]
    public async Task<ActionResult<object>> GetSystemStats()
    {
        var totalUsers = await _context.Users.CountAsync();
        var totalRequests = await _context.Requests.CountAsync();
        var totalLandlords = await _context.Users.CountAsync(u => u.Role == UserRole.Landlord);
        var totalTenants = await _context.Users.CountAsync(u => u.Role == UserRole.Tenant);
        
        // Get recent requests
        var recentRequests = await _context.Requests
            .Include(r => r.User)
            .OrderByDescending(r => r.DateCreated)
            .Take(5)
            .Select(r => new 
            {
                r.RequestId,
                TenantName = (r.User != null ? r.User.FirstName + " " + r.User.LastName : "Unknown"),
                r.CityName,
                r.FinalScore,
                r.DateCreated
            })
            .ToListAsync();

        return Ok(new 
        {
            TotalUsers = totalUsers,
            TotalRequests = totalRequests,
            TotalLandlords = totalLandlords,
            TotalTenants = totalTenants,
            RecentRequests = recentRequests
        });
    }

    [HttpGet("stats/graphs")]
    public async Task<ActionResult<object>> GetGraphStats()
    {
        // 1. Requests By Month (Last 6 Months)
        var sixMonthsAgo = DateTime.UtcNow.AddMonths(-6);
        var requestsByMonth = await _context.Requests
            .Where(r => r.DateCreated >= sixMonthsAgo)
            .GroupBy(r => new { r.DateCreated.Year, r.DateCreated.Month })
            .Select(g => new { 
                Year = g.Key.Year, 
                Month = g.Key.Month, 
                Count = g.Count() 
            })
            .OrderBy(x => x.Year).ThenBy(x => x.Month)
            .ToListAsync();

        // 2. Requests By Status
        var requestsByStatus = await _context.Requests
            .GroupBy(r => r.Status)
            .Select(g => new { 
                Status = g.Key, 
                Count = g.Count() 
            })
            .ToListAsync();

        // 3. Score Distribution
        var allScores = await _context.Requests.Select(r => r.FinalScore).ToListAsync();
        var scoreDistribution = new[]
        {
            new { Label = "0-500", Count = allScores.Count(s => s < 500) },
            new { Label = "500-700", Count = allScores.Count(s => s >= 500 && s < 700) },
            new { Label = "700-850", Count = allScores.Count(s => s >= 700 && s < 850) },
            new { Label = "850+", Count = allScores.Count(s => s >= 850) }
        };

        return Ok(new 
        {
            RequestsByMonth = requestsByMonth,
            RequestsByStatus = requestsByStatus,
            ScoreDistribution = scoreDistribution
        });
    }

    [HttpGet("users")]
    public async Task<ActionResult<IEnumerable<object>>> GetUsers([FromQuery] string? search, [FromQuery] UserRole? role, [FromQuery] bool? isActive)
    {
        var query = _context.Users.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(u => u.FirstName.Contains(search) || u.LastName.Contains(search) || u.Email.Contains(search));
        }

        if (role.HasValue)
        {
            query = query.Where(u => u.Role == role.Value);
        }
        
        if (isActive.HasValue)
        {
            query = query.Where(u => u.IsActive == isActive.Value);
        }

        var usersData = await query
            .Include(u => u.Requests)
            .Include(u => u.SavedRequests)
            .ToListAsync();

        var users = usersData
            .Select(u => new 
            {
                u.Id,
                u.FirstName,
                u.LastName,
                u.Email,
                // Dynamic Role Logic:
                // If has Requests AND SavedRequests -> Both (3)
                // If has Requests only -> Tenant (0)
                // If has SavedRequests only -> Landlord (1)
                // Else -> Original Role
                Role = (u.Requests.Any() && u.SavedRequests.Any()) ? UserRole.Both :
                       (u.Requests.Any() ? UserRole.Tenant :
                       (u.SavedRequests.Any() ? UserRole.Landlord : u.Role)),
                u.IsActive,
                u.DateJoined
            });

        return Ok(users);
    }

    [HttpPost("users/{id}/toggle-status")]
    public async Task<ActionResult> ToggleUserStatus(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound();

        user.IsActive = !user.IsActive;
        await _context.SaveChangesAsync();

        return Ok(new { IsActive = user.IsActive });
    }
    
    [HttpPost("users/{id}/reset-password")]
    public async Task<ActionResult> ResetPassword(int id)
    {
        // In a real app, generate a random token or temp password. 
        // For MVP, we'll set it to '123456' and return it.
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound();

        // Using System.Security.Cryptography.HMACSHA512 (same as AuthController)
        using var hmac = new System.Security.Cryptography.HMACSHA512();
        var passwordSalt = hmac.Key;
        var passwordHash = hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes("123456"));

        user.PasswordHash = passwordHash;
        user.PasswordSalt = passwordSalt;
        
        await _context.SaveChangesAsync();

        return Ok(new { TempPassword = "123456" });
    }

    [HttpGet("requests")]
    public async Task<ActionResult<IEnumerable<object>>> GetAllRequests([FromQuery] RequestStatus? status, [FromQuery] int? reviewerId)
    {
        var query = _context.Requests
            .Include(r => r.User)
            .Include(r => r.Reviewer)
            .AsQueryable();

        if (status.HasValue)
        {
            query = query.Where(r => r.Status == status.Value);
        }

        if (reviewerId.HasValue)
        {
            query = query.Where(r => r.ReviewerId == reviewerId.Value);
        }

        var requests = await query
            .OrderByDescending(r => r.DateCreated)
            .Select(r => new 
            {
                r.RequestId,
                TenantName = (r.User != null ? r.User.FirstName + " " + r.User.LastName : "Unknown"),
                r.CityName,
                r.FinalScore,
                r.DateCreated,
                r.Status,
                ReviewerName = (r.Reviewer != null ? r.Reviewer.FirstName : "Unassigned")
            })
            .ToListAsync();

        return Ok(requests);
    }

    [HttpPut("requests/{id}")]
    public async Task<ActionResult> UpdateRequest(int id, [FromBody] UpdateRequestDto dto)
    {
        var request = await _context.Requests.FindAsync(id);
        if (request == null) return NotFound();

        if (dto.Status.HasValue) request.Status = dto.Status.Value;
        if (dto.ReviewerId.HasValue) request.ReviewerId = dto.ReviewerId.Value;

        await _context.SaveChangesAsync();
        return Ok();
    }
    [HttpPut("users/{id}/role")]
    public async Task<ActionResult> UpdateUserRole(int id, [FromBody] UpdateUserRoleDto dto)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound();

        if (Enum.IsDefined(typeof(UserRole), dto.Role))
        {
            user.Role = dto.Role;
            await _context.SaveChangesAsync();
            return Ok(new { Role = user.Role });
        }
        return BadRequest("Invalid Role");
    }
}

public class UpdateUserRoleDto
{
    public UserRole Role { get; set; }
}

public class UpdateRequestDto
{
    public RequestStatus? Status { get; set; }
    public int? ReviewerId { get; set; }
}
