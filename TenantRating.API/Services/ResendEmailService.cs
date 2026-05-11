using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Globalization;

namespace TenantRating.API.Services;

public class ResendEmailService : IEmailService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly IEmailTemplateService _templateService;
    private readonly ILogger<ResendEmailService> _logger;

    public ResendEmailService(
        HttpClient httpClient,
        IConfiguration configuration,
        IEmailTemplateService templateService,
        ILogger<ResendEmailService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _templateService = templateService;
        _logger = logger;
    }

    public async Task<EmailSendResult> SendPasswordResetEmailAsync(string recipientEmail, string recipientName, string resetLink, string token)
    {
        var templateHtml = await _templateService.RenderTemplateAsync(
            "ResetPassword.html",
            new Dictionary<string, string>
            {
                ["{recipientName}"] = recipientName,
                ["{resetLink}"] = resetLink,
                ["{token}"] = token
            });

        var fromEmail = _configuration["Resend:FromEmail"] ?? "onboarding@resend.dev";
        var useSandboxRecipient = bool.TryParse(_configuration["Resend:UseSandboxRecipient"], out var parsed) ? parsed : true;
        var sandboxRecipient = _configuration["Resend:SandboxRecipient"] ?? recipientEmail;
        var effectiveRecipient = useSandboxRecipient ? sandboxRecipient : recipientEmail;

        var payload = new
        {
            from = fromEmail,
            to = effectiveRecipient,
            subject = "איפוס סיסמה - KaLiScore",
            html = templateHtml
        };

        return await SendEmailAsync(payload, recipientEmail, effectiveRecipient);
    }

    public async Task<EmailSendResult> SendRequestCreatedEmailAsync(string recipientEmail, string recipientName, int requestId, decimal finalScore, decimal desiredRent, string cityName, DateTime dateCreated)
    {
        var templateHtml = await _templateService.RenderTemplateAsync(
            "RequestCreated.html",
            new Dictionary<string, string>
            {
                ["{recipientName}"] = recipientName,
                ["{requestId}"] = requestId.ToString(CultureInfo.InvariantCulture),
                ["{finalScore}"] = finalScore.ToString("0.0", CultureInfo.InvariantCulture),
                ["{desiredRent}"] = desiredRent.ToString("0.##", CultureInfo.InvariantCulture),
                ["{cityName}"] = cityName,
                ["{dateCreated}"] = dateCreated.ToString("dd/MM/yyyy HH:mm", CultureInfo.InvariantCulture)
            });

        var fromEmail = _configuration["Resend:FromEmail"] ?? "onboarding@resend.dev";
        var useSandboxRecipient = bool.TryParse(_configuration["Resend:UseSandboxRecipient"], out var parsed) ? parsed : true;
        var sandboxRecipient = _configuration["Resend:SandboxRecipient"] ?? recipientEmail;
        var effectiveRecipient = useSandboxRecipient ? sandboxRecipient : recipientEmail;

        var payload = new
        {
            from = fromEmail,
            to = effectiveRecipient,
            subject = "הבקשה שלך נקלטה - KaLiScore",
            html = templateHtml
        };

        return await SendEmailAsync(payload, recipientEmail, effectiveRecipient);
    }

    private async Task<EmailSendResult> SendEmailAsync(object payload, string requestedRecipient, string effectiveRecipient)
    {
        try
        {
            var apiKey = _configuration["Resend:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                return new EmailSendResult
                {
                    IsSuccess = false,
                    Status = "Resend API key is missing"
                };
            }

            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            var response = await _httpClient.PostAsJsonAsync("https://api.resend.com/emails", payload);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Email sent via Resend. requestedTo={RequestedRecipient}, effectiveTo={EffectiveRecipient}", requestedRecipient, effectiveRecipient);
                return new EmailSendResult
                {
                    IsSuccess = true,
                    Status = "Sent"
                };
            }

            var responseBody = await response.Content.ReadAsStringAsync();
            _logger.LogWarning("Resend email send failed. status={StatusCode}, body={Body}", response.StatusCode, responseBody);
            return new EmailSendResult
            {
                IsSuccess = false,
                Status = $"{response.StatusCode}: {responseBody}"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Resend email send threw an exception");
            return new EmailSendResult
            {
                IsSuccess = false,
                Status = ex.Message
            };
        }
    }
}
