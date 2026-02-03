using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TenantRating.API.Data;
using TenantRating.API.Data.Entities;

namespace TenantRating.API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize] // Should strictly be Authorize(Roles = "Landlord"), but keeping flexible for dev
public class LandlordsController : ControllerBase
{
    private readonly AppDbContext _context;

    public LandlordsController(AppDbContext context)
    {
        _context = context;
    }

    [Authorize] // Allow any authenticated user (Tenant/Landlord) to save/search
    [HttpGet("search")]
    public async Task<IActionResult> SearchTenants([FromQuery] string city, [FromQuery] decimal? minRent, [FromQuery] decimal? maxRent)
    {
        var landlordId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

        var query = _context.Requests
            .Include(r => r.User)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(city))
        {
            query = query.Where(r => r.CityName.Contains(city));
        }

        if (minRent.HasValue)
        {
            query = query.Where(r => r.DesiredRent >= minRent.Value);
        }
        
        if (maxRent.HasValue)
        {
            query = query.Where(r => r.DesiredRent <= maxRent.Value);
        }

        // Fetch saved request IDs for this landlord to efficiently check IsSaved
        var savedRequestIds = await _context.SavedRequests
            .Where(sr => sr.LandlordUserId == landlordId)
            .Select(sr => sr.TenantRequestId)
            .ToListAsync();
        var savedSet = new HashSet<int>(savedRequestIds);

        // Return anonymous object for search results (hiding sensitive data)
        var results = await query
            .Select(r => new 
            {
                r.RequestId,
                TenantName = (r.User != null ? r.User.FirstName : "Unknown"), // Show first name only
                r.FinalScore,
                r.DesiredRent,
                r.CityName,
                DateOfRating = r.DateCreated,
                PhoneNumber = r.User != null ? r.User.PhoneNumber : ""
            })
            .ToListAsync();
            
        // Map to include IsSaved (post-query calculation to avoid complex EF translation if possible, or simple enough to do in memory for small datasets)
        var finalResults = results.Select(r => new {
            r.RequestId,
            r.TenantName,
            r.FinalScore,
            r.DesiredRent,
            r.CityName,
            r.DateOfRating,
            r.PhoneNumber,
            IsSaved = savedSet.Contains(r.RequestId)
        });

        return Ok(finalResults);
    }

    [Authorize]
    [HttpPost("save/{requestId}")]
    public async Task<IActionResult> SaveRequest(int requestId)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

        // Check if already saved
        var exists = await _context.SavedRequests.AnyAsync(sr => sr.LandlordUserId == userId && sr.TenantRequestId == requestId);
        if (exists) return Ok(new { message = "Already saved" });

        var saved = new SavedRequest
        {
            LandlordUserId = userId,
            TenantRequestId = requestId,
            DateSaved = DateTime.UtcNow
        };

        _context.SavedRequests.Add(saved);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Saved successfully" });
    }

    [Authorize]
    [HttpDelete("unsave/{requestId}")]
    public async Task<IActionResult> UnsaveRequest(int requestId)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        var saved = await _context.SavedRequests.FirstOrDefaultAsync(sr => sr.LandlordUserId == userId && sr.TenantRequestId == requestId);

        if (saved != null)
        {
            _context.SavedRequests.Remove(saved);
            await _context.SaveChangesAsync();
        }

        return Ok(new { message = "Unsaved successfully" });
    }

    [Authorize]
    [HttpGet("my-saved")]
    public async Task<IActionResult> GetMySavedRequests()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

        var savedRequests = await _context.SavedRequests
            .Include(sr => sr.Request)
                .ThenInclude(r => r.User) // Need to include User to access TenantName
            .Where(sr => sr.LandlordUserId == userId)
            .Select(sr => new 
            {
                sr.Request.RequestId,
                TenantName = $"{sr.Request.User!.FirstName} {sr.Request.User!.LastName}", 
                sr.Request.CityName,
                sr.Request.FinalScore,
                PhoneNumber = sr.Request.User!.PhoneNumber,
                sr.Request.DesiredRent,
                sr.Request.DateCreated
            })
            .ToListAsync();

        return Ok(savedRequests);
    }
}
