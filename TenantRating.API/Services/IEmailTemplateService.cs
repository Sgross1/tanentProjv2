namespace TenantRating.API.Services;

public interface IEmailTemplateService
{
    Task<string> RenderTemplateAsync(string templateFileName, IDictionary<string, string> placeholders);
}
