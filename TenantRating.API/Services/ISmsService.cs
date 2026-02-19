namespace TenantRating.API.Services;

public interface ISmsService
{
    Task<(bool IsSuccess, string Status)> SendSmsAsync(string phoneNumber, string message);
}
