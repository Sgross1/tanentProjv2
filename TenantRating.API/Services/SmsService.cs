using System.Net.Http.Json;
using System.Text.Json;

namespace TenantRating.API.Services;

public class SmsService : ISmsService
{
    private readonly IConfiguration _config;
    private readonly HttpClient _httpClient;

    public SmsService(IConfiguration config, HttpClient httpClient)
    {
        _config = config;
        _httpClient = httpClient;
    }

    public async Task<(bool IsSuccess, string Status)> SendSmsAsync(string phoneNumber, string message)
    {
        var settings = _config.GetSection("SmsSettings");
        var apiUrl = settings["ApiUrl"] ?? string.Empty;
        var normalizedPhone = phoneNumber.Trim().Replace("-", string.Empty).Replace(" ", string.Empty);

        // בחשבון חינמי כדאי להשתמש במספר הנייד כ-Sender
        var sender = settings["Sender"] ?? settings["User"] ?? string.Empty;

        var payload = new
        {
            key = settings["Key"] ?? string.Empty,
            user = settings["User"] ?? string.Empty,
            pass = settings["Pass"] ?? string.Empty,
            sender = sender,
            recipient = normalizedPhone,
            msg = message
        };

        Console.WriteLine($"[SMS DEBUG] Sending to: {normalizedPhone}, Sender: {sender}, Message: {message}");
        var dataAsJson = System.Text.Json.JsonSerializer.Serialize(payload);
        Console.WriteLine($"[SMS PAYLOAD] {dataAsJson}");

        using var content = JsonContent.Create(payload);
        var response = await _httpClient.PostAsync(apiUrl, content);
        var result = await response.Content.ReadAsStringAsync();

        Console.WriteLine($"[SMS4FREE HTTP STATUS] {(int)response.StatusCode}");
        Console.WriteLine($"[SMS4FREE RAW RESPONSE] {result}");

        string? parseError = null;
        var parsed = TryParseJsonResponse(result, out parseError);
        Console.WriteLine($"[SMS4FREE DEBUG] parsed={parsed?.ToString() ?? "null"}, parseError={parseError}");

        if (parsed.HasValue)
        {
            var (statusCode, statusMessage) = parsed.Value;

            if (statusCode > 0)
            {
                return (true, $"הצלחה! נשלח ל-{statusCode} נמענים. {statusMessage}".Trim());
            }

            if (statusCode == 0)
            {
                return (false, string.IsNullOrWhiteSpace(statusMessage) ? "שגיאה כללית" : statusMessage);
            }

            return statusCode switch
            {
                -1 => (false, "שם משתמש או סיסמה שגויים"),
                -2 => (false, "שם שולח או מספר שולח שגוי"),
                -3 => (false, "לא נמצאו נמענים"),
                -4 => (false, "לא ניתן לשלוח, יתרת הודעות פנויה נמוכה"),
                -5 => (false, "הודעה לא מתאימה"),
                -6 => (false, "צריך לפחות מספר שולח"),
                _ => (false, string.IsNullOrWhiteSpace(statusMessage) ? $"שגיאה כללית מס' {statusCode}" : statusMessage)
            };
        }

        if (!response.IsSuccessStatusCode)
        {
            var body = string.IsNullOrWhiteSpace(result) ? "(ריק)" : result;
            return (false, $"שגיאת HTTP {(int)response.StatusCode}: {body}");
        }

        // לוג שגיאה מפורט
        if (!string.IsNullOrWhiteSpace(parseError))
        {
            Console.WriteLine($"[SMS4FREE PARSE ERROR] {parseError}");
        }

        return (false, string.IsNullOrWhiteSpace(result)
            ? $"תשובה לא מזוהה מהשרת (שגיאת פיענוח: {parseError ?? "לא ידוע"})"
            : $"תשובה לא מזוהה: {result} (שגיאת פיענוח: {parseError ?? "לא ידוע"})");
    }

    private static (int Status, string Message)? TryParseJsonResponse(string raw, out string? error)
    {
        error = null;
        try
        {
            var payload = JsonSerializer.Deserialize<Sms4FreeResponse>(raw);
            if (payload == null || payload.Status == null)
            {
                error = "JSON לא מכיל שדה status או לא תקין";
                return null;
            }
            return (payload.Status.Value, payload.Message ?? string.Empty);
        }
        catch (Exception ex)
        {
            error = ex.Message;
            return null;
        }
    }

    private sealed class Sms4FreeResponse
    {
        [System.Text.Json.Serialization.JsonPropertyName("status")]
        public int? Status { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("message")]
        public string? Message { get; set; }
    }
}
