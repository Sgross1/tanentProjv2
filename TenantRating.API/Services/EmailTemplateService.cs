namespace TenantRating.API.Services;

public class EmailTemplateService : IEmailTemplateService
{
    public async Task<string> RenderTemplateAsync(string templateFileName, IDictionary<string, string> placeholders)
    {
        var filePath = Path.Combine(Directory.GetCurrentDirectory(), "Templates", templateFileName);
        if (!File.Exists(filePath))
        {
            throw new FileNotFoundException($"Email template not found: {templateFileName}", filePath);
        }

        var html = await File.ReadAllTextAsync(filePath);

        foreach (var placeholder in placeholders)
        {
            html = html.Replace(placeholder.Key, placeholder.Value);

            var tokenName = placeholder.Key.Trim('{', '}', ' ');
            if (!string.IsNullOrWhiteSpace(tokenName))
            {
                html = System.Text.RegularExpressions.Regex.Replace(
                    html,
                    $"\\{{\\s*{System.Text.RegularExpressions.Regex.Escape(tokenName)}\\s*\\}}",
                    placeholder.Value ?? string.Empty);
            }
        }

        return html;
    }
}
