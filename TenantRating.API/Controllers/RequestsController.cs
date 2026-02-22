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
    private readonly ISmsService _smsService;
    private readonly IEmailService _emailService;

    public RequestsController(AppDbContext context, IScoringService scoringService, IOcrService ocrService, ISmsService smsService, IEmailService emailService)
    {
        _context = context;
        _scoringService = scoringService;
        _ocrService = ocrService;
        _smsService = smsService;
        _emailService = emailService;
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
                    result.PensionDeductionPercent,
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

    // ⚠️ FOR TESTING ONLY - Use /submit endpoint from client UI
    [HttpPost]
    public async Task<ActionResult<RequestResultDto>> CreateRequest(CreateRequestDto dto)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

        // בדיקת התאמת מספר זהות
        // נניח שמספר הזהות של הלקוח מגיע ב-idNumbers[0] (או מה-DTO אם תעדיף שדה נפרד)
        var inputId = dto.IdNumbers.FirstOrDefault()?.Trim().Replace("-", "");
        var extractedIds = dto.IdNumbers.Select(id => id.Trim().Replace("-", "")).ToList();
        if (string.IsNullOrEmpty(inputId) || !extractedIds.Contains(inputId))
        {
            return BadRequest("מספר הזהות שהוזן אינו תואם לאף אחד ממספרי הזהות שהופקו מהתלושים. ודא שהקלדת את המספר הנכון או העלית את התלושים הנכונים.");
        }

        var request = new Request
        {
            UserId = userId,
            DesiredRent = dto.DesiredRent,
            CityName = dto.CityName,
            TenantIdNumbers = string.Join(",", dto.IdNumbers),
            DateCreated = DateTime.UtcNow
        };

        // Calculate Score (Using the Logic from user spec)
        _scoringService.CalculateScoreForRequest(
            request,
            dto.NetIncome,
            dto.NumChildren,
            dto.IsMarried,
            dto.SeniorityYears,
            dto.PensionGrossAmount,
            dto.PensionDeductionPercent
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

    // ✅ SECURE ENDPOINT - For production client UI
    [HttpPost("submit")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<RequestResultDto>> SubmitRequest(
        [FromForm] List<IFormFile> files,
        [FromForm] string idNumber,
        [FromForm] string? spouseIdNumber,
        [FromForm] decimal desiredRent,
        [FromForm] string cityName)
    {
        if (files == null || (files.Count != 3 && files.Count != 6))
        {
            return ValidationError("יש להעלות בדיוק 3 או 6 תלושי שכר.");
        }

        if (!TryNormalizeIsraeliId(idNumber, out var normalizedPrimaryId))
        {
            return ValidationError("מספר הזהות הראשי אינו תקין.");
        }

        string? normalizedSpouseId = null;
        if (!string.IsNullOrWhiteSpace(spouseIdNumber))
        {
            if (!TryNormalizeIsraeliId(spouseIdNumber, out var parsedSpouseId))
            {
                return ValidationError("מספר הזהות של בן/בת הזוג אינו תקין.");
            }

            normalizedSpouseId = parsedSpouseId;
        }

        if (files.Count == 3 && !string.IsNullOrWhiteSpace(normalizedSpouseId))
        {
            return ValidationError("במסלול של 3 תלושים יש להזין רק מספר זהות אחד.");
        }

        if (files.Count == 6 && string.IsNullOrWhiteSpace(normalizedSpouseId))
        {
            return ValidationError("במסלול של 6 תלושים חובה להזין גם מספר זהות של בן/בת הזוג.");
        }

        if (!string.IsNullOrWhiteSpace(normalizedSpouseId) && normalizedPrimaryId == normalizedSpouseId)
        {
            return ValidationError("מספר הזהות של בן/בת הזוג חייב להיות שונה מהמספר הראשי.");
        }

        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

        try
        {
            // Extract data from files (server-side OCR)
            var extracted = await _ocrService.AnalyzePayslipsAsync(files);

            // Verify ID match between user input and extracted IDs
            var extractedIds = extracted.IdNumbers
                .Select(id => NormalizeDigitsOnly(id))
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .Distinct()
                .OrderBy(id => id)
                .ToList();

            if (files.Count == 3)
            {
                if (extractedIds.Count != 1 || extractedIds[0] != normalizedPrimaryId)
                {
                    return ValidationError(
                        "מספר הזהות שהוזן אינו תואם לתלושים שהועלו.",
                        "נדרש שמספר הזהות הראשי יתאים לכל 3 התלושים במסלול יחיד.");
                }
            }
            else
            {
                var submittedIds = new[] { normalizedPrimaryId, normalizedSpouseId! }
                    .Distinct()
                    .OrderBy(id => id)
                    .ToList();

                if (submittedIds.Count != 2)
                {
                    return ValidationError("נדרשים שני מספרי זהות שונים עבור מסלול של 6 תלושים.");
                }

                if (extractedIds.Count != 2 || !submittedIds.SequenceEqual(extractedIds))
                {
                    return ValidationError(
                        "מספרי הזהות שהוזנו אינם תואמים למספרים שחולצו מהתלושים.",
                        "ודא שהזנת את מספר הזהות של בעל הבקשה ושל בן/בת הזוג בדיוק כפי שמופיעים בתלושים.");
                }
            }

            // Create request entity
            var request = new Request
            {
                UserId = userId,
                DesiredRent = desiredRent,
                CityName = cityName,
                TenantIdNumbers = string.Join(",", extractedIds),
                DateCreated = DateTime.UtcNow
            };

            // Calculate score using extracted data (not from client!)
            _scoringService.CalculateScoreForRequest(
                request,
                extracted.NetIncome,
                extracted.NumChildren,
                extracted.IsMarried,
                extracted.SeniorityYears,
                extracted.PensionGrossAmount,
                extracted.PensionDeductionPercent
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
        catch (InvalidOperationException ex)
        {
            return ValidationError("אימות התלושים נכשל.", ex.Message);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"שגיאה בעיבוד הבקשה: {ex.Message}");
        }
    }

    private ActionResult ValidationError(string message, params string[] details)
    {
        return BadRequest(new
        {
            message,
            details = details.Where(d => !string.IsNullOrWhiteSpace(d)).ToArray()
        });
    }

    private static string NormalizeDigitsOnly(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return string.Empty;
        return new string(raw.Where(char.IsDigit).ToArray());
    }

    private static bool TryNormalizeIsraeliId(string? raw, out string normalized)
    {
        normalized = NormalizeDigitsOnly(raw);
        if (normalized.Length != 9) return false;

        var sum = normalized
            .Select((ch, index) =>
            {
                var digit = ch - '0';
                var multiplied = digit * ((index % 2) + 1);
                return multiplied > 9 ? multiplied - 9 : multiplied;
            })
            .Sum();

        return sum % 10 == 0;
    }

    [HttpPost("verify-id")]
    public async Task<IActionResult> VerifyId([FromBody] VerifyIdDto dto)
    {
        var request = await _context.Requests.FindAsync(dto.RequestId);
        if (request == null) return NotFound("בקשה לא נמצאה");

        // Logic: Clean both strings (trim, remove hyphens) just in case
        var storedIds = request.TenantIdNumbers?.Split(',').Select(id => id.Trim().Replace("-", "")).ToList() ?? new List<string>();
        var inputId = dto.IdNumber?.Trim().Replace("-", "") ?? "";

        // Check if inputId is one of the stored IDs
        bool match = storedIds.Contains(inputId);

        return Ok(new { isMatch = match });
    }

    public class VerifyIdDto
    {
        public int RequestId { get; set; }
        public string IdNumber { get; set; } = string.Empty;
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
        var request = await _context.Requests
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.RequestId == id);
        if (request == null) return NotFound();

        // Check ownership
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        if (request.UserId != userId) return Forbid();

        var phoneNumber = request.User?.PhoneNumber?.Trim();
        if (string.IsNullOrWhiteSpace(phoneNumber))
        {
            return BadRequest(new { error = "לא נמצא מספר פלאפון עבור המשתמש." });
        }

        var message = $"ציון הבקשה שלך הוא {request.FinalScore}. שכר דירה רצוי: {request.DesiredRent}.";
        var result = await _smsService.SendSmsAsync(phoneNumber, message);

        if (result.IsSuccess)
        {
            Console.WriteLine($"[SMS SENT] Request #{id} to {phoneNumber}: {result.Status}");
            return Ok(new { message = "ה-SMS נשלח בהצלחה", status = result.Status });
        }

        Console.WriteLine($"[SMS FAILED] Request #{id} to {phoneNumber}: {result.Status}");
        return BadRequest(new { error = result.Status });
    }

    [HttpPost("{id}/notify-email")]
    public async Task<IActionResult> NotifyEmail(int id)
    {
        var request = await _context.Requests
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.RequestId == id);
        if (request == null) return NotFound();

        // Check ownership
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        if (request.UserId != userId) return Forbid();

        var recipientEmail = request.User?.Email?.Trim();
        if (string.IsNullOrWhiteSpace(recipientEmail))
        {
            return BadRequest(new { error = "לא נמצאה כתובת אימייל עבור המשתמש." });
        }

        var firstName = request.User?.FirstName?.Trim();
        var lastName = request.User?.LastName?.Trim();
        var recipientName = string.Join(" ", new[] { firstName, lastName }.Where(v => !string.IsNullOrWhiteSpace(v))).Trim();
        if (string.IsNullOrWhiteSpace(recipientName))
        {
            recipientName = "משתמש";
        }

        var result = await _emailService.SendRequestCreatedEmailAsync(
            recipientEmail,
            recipientName,
            request.RequestId,
            request.FinalScore,
            request.DesiredRent,
            request.CityName,
            request.DateCreated);

        if (result.IsSuccess)
        {
            Console.WriteLine($"[EMAIL SENT] Request #{id} to {recipientEmail}: {result.Status}");
            return Ok(new { message = "האימייל נשלח בהצלחה", status = result.Status });
        }

        Console.WriteLine($"[EMAIL FAILED] Request #{id} to {recipientEmail}: {result.Status}");
        return BadRequest(new { error = result.Status });
    }
}
