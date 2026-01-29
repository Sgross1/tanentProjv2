using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TenantRating.API.Data;
using TenantRating.API.Data.Entities;
using TenantRating.API.DTOs;
using TenantRating.API.Services;

namespace TenantRating.API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class RequestsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IScoringService _scoringService;
    private readonly IOcrService _ocrService;

    public RequestsController(AppDbContext context, IScoringService scoringService, IOcrService ocrService)
    {
        _context = context;
        _scoringService = scoringService;
        _ocrService = ocrService;
    }

    [HttpPost("analyze")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<CreateRequestDto>> AnalyzePayslips([FromForm] List<IFormFile> files, [FromForm] decimal? desiredRent)
    {
        if (files == null || (files.Count != 3 && files.Count != 6))
        {
            return BadRequest("יש להעלות בדיוק 3 או 6 תלושי שכר.");
        }

        try
        {
            var result = await _ocrService.AnalyzePayslipsAsync(files);
            
            // Calculate Debug Info if rent is provided
            if (desiredRent.HasValue)
            {
                var calcDetails = TenantRating.API.Logic.RentabilityScoreCalculator.GetCalculationDetails(
                    result.NetIncome,
                    result.NumChildren,
                    result.IsMarried,
                    result.SeniorityYears,
                    result.PensionGrossAmount,
                    desiredRent.Value
                );
                
                result.ScoreFormula = calcDetails.Formula;
                result.CalculationDetails = calcDetails.Details;
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"שגיאה בפענוח הקבצים: {ex.Message}");
        }
    }

    [HttpPost]
    public async Task<ActionResult<RequestResultDto>> CreateRequest(CreateRequestDto dto)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        
        var request = new Request
        {
            UserId = userId,
            DesiredRent = dto.DesiredRent,
            CityName = dto.CityName,
            DateCreated = DateTime.UtcNow
        };

        // Calculate Score (Using the Logic from user spec)
        _scoringService.CalculateScoreForRequest(
            request, 
            dto.NetIncome, 
            dto.NumChildren, 
            dto.IsMarried, 
            dto.SeniorityYears, 
            dto.PensionGrossAmount
        );

        _context.Requests.Add(request);
        await _context.SaveChangesAsync();

        return new RequestResultDto
        {
            RequestId = request.RequestId,
            FinalScore = request.FinalScore,
            TempScore = request.TempScore,
            CityName = request.CityName,
            DateCreated = request.DateCreated,
            MaxAffordableRent = request.TempScore * TenantRating.API.Logic.RentabilityScoreCalculator.RentToIncomeRatio
        };
    }

    [HttpGet("my-requests")]
    public async Task<ActionResult<List<RequestResultDto>>> GetMyRequests()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

        var requests = await _context.Requests
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.DateCreated)
            .Select(r => new RequestResultDto
            {
                RequestId = r.RequestId,
                FinalScore = r.FinalScore,
                TempScore = r.TempScore,
                CityName = r.CityName,
                DateCreated = r.DateCreated
            })
            .ToListAsync();

        return requests;
    }

    [HttpPost("{id}/notify-sms")]
    public async Task<IActionResult> NotifySms(int id)
    {
        var request = await _context.Requests.FindAsync(id);
        if (request == null) return NotFound();

        // Check ownership
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        if (request.UserId != userId) return Forbid();

        // In real app: Send SMS via Twilio/etc using request.User.PhoneNumber
        Console.WriteLine($"[SMS SENT] To Request #{id}: Your score for rent {request.DesiredRent} is {request.FinalScore}");
        
        return Ok();
    }

    [HttpPost("{id}/notify-email")]
    public async Task<IActionResult> NotifyEmail(int id)
    {
        var request = await _context.Requests.FindAsync(id);
        if (request == null) return NotFound();

        // Check ownership
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        if (request.UserId != userId) return Forbid();

        // In real app: Send Email via SendGrid/SMTP using request.User.Email
        Console.WriteLine($"[EMAIL SENT] To Request #{id}: Your score for rent {request.DesiredRent} is {request.FinalScore}");
        
        return Ok();
    }
}
