namespace TenantRating.API.Services;

public interface IEmailService
{
    Task<EmailSendResult> SendPasswordResetEmailAsync(string recipientEmail, string recipientName, string resetLink, string token);
    Task<EmailSendResult> SendRequestCreatedEmailAsync(string recipientEmail, string recipientName, int requestId, decimal finalScore, decimal desiredRent, string cityName, DateTime dateCreated);
}

public class EmailSendResult
{
    public bool IsSuccess { get; set; }
    public string Status { get; set; } = string.Empty;
}
