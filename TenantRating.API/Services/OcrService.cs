using Azure;
using Azure.AI.DocumentIntelligence;
using Microsoft.Extensions.Configuration;
using TenantRating.API.DTOs;
using System.Text.RegularExpressions;

namespace TenantRating.API.Services;

public class OcrService : IOcrService
{
    private readonly string _endpoint;
    private readonly string _apiKey;
    private readonly string _modelId;
    private readonly ILogger<OcrService> _logger;

    public OcrService(IConfiguration config, ILogger<OcrService> logger)
    {
        _endpoint = config["AzureDocumentIntelligence:Endpoint"]!;
        _apiKey = config["AzureDocumentIntelligence:ApiKey"]!;
        _modelId = config["AzureDocumentIntelligence:ModelId"]!;
        _logger = logger;
    }

    public async Task<CreateRequestDto> AnalyzePayslipsAsync(List<IFormFile> files)
    {
        var credential = new AzureKeyCredential(_apiKey);
        var client = new DocumentIntelligenceClient(new Uri(_endpoint), credential);

        decimal totalNetIncome = 0;
        int countNetIncome = 0;
        
        decimal maxPension = 0;
        decimal maxSeniority = 0;
        int maxChildren = 0;
        bool isMarriedInText = false;
        
        // Accumulate all raw fields for debugging
        var allDebugFields = new Dictionary<string, object>();

        foreach (var file in files)
        {
            if (file.Length == 0) continue;

            try
            {
                using var stream = file.OpenReadStream();
                var content = BinaryData.FromStream(stream);
                var analyzeOptions = new AnalyzeDocumentContent() { Base64Source = content };

                // Throttling for free tier
                await Task.Delay(1000);

                var operation = await client.AnalyzeDocumentAsync(WaitUntil.Completed, _modelId, analyzeOptions);
                var result = operation.Value;
                
                // Add to debug raw data (only the fields part to be concise)
                int docIndex = 0;
                foreach (var document in result.Documents)
                {
                    // Map Hebrew fields - robust checking
                    
                    // Net Income: "שכר נטו", "נטו לתשלום", "נטו"
                    if (document.Fields.TryGetValue("שכר נטו", out var netIncomeField) || 
                        document.Fields.TryGetValue("נטו לתשלום", out netIncomeField) ||
                        document.Fields.TryGetValue("נטו", out netIncomeField) ||
                        document.Fields.TryGetValue("NetIncome", out netIncomeField))
                    {
                        if (TryGetDecimal(netIncomeField, out var val))
                        {
                            totalNetIncome += val;
                            countNetIncome++;
                        }
                    }
                    
                    // Children: "ילדים", "מספר ילדים", "Children"
                    // Parse as decimal first to safely handle "2.0", then cast to int
                    if (document.Fields.TryGetValue("ילדים", out var childrenField) || 
                        document.Fields.TryGetValue("מספר ילדים", out childrenField) ||
                        document.Fields.TryGetValue("NumChildren", out childrenField))
                    {
                        if (TryGetDecimal(childrenField, out var val))
                        {
                            int intVal = (int)val;
                            if (intVal > maxChildren) maxChildren = intVal;
                        }
                    }

                    // Seniority: "ותק בעבודה", "ותק מוכר", "ותק", "שנות ותק", "וותק"
                    if (document.Fields.TryGetValue("ותק בעבודה", out var seniorityField) || 
                        document.Fields.TryGetValue("ותק מוכר", out seniorityField) ||
                        document.Fields.TryGetValue("ותק", out seniorityField) ||
                        document.Fields.TryGetValue("וותק", out seniorityField) || 
                        document.Fields.TryGetValue("שנות ותק", out seniorityField) || 
                        document.Fields.TryGetValue("SeniorityYears", out seniorityField))
                    {
                        if (TryGetDecimal(seniorityField, out var val))
                        {
                            if (val > maxSeniority) maxSeniority = val;
                        }
                    }
                    
                    // Pension: "ברוטו לפנסיה", "פנסיה"
                    if (document.Fields.TryGetValue("ברוטו לפנסיה", out var pensionField) || 
                        document.Fields.TryGetValue("פנסיה", out pensionField) ||
                        document.Fields.TryGetValue("PensionGrossAmount", out pensionField))
                    {
                        if (TryGetDecimal(pensionField, out var val))
                        {
                            if (val > maxPension) maxPension = val;
                        }
                    }

                    // Marital Status: "מצב משפחתי"
                    if ((document.Fields.TryGetValue("מצב משפחתי", out var maritalField) || 
                         document.Fields.TryGetValue("MaritalStatus", out maritalField)) && maritalField != null)
                    {
                        var maritalContent = maritalField.Content;
                        if (!string.IsNullOrEmpty(maritalContent) && 
                           (maritalContent.Contains("נשוי") || maritalContent.Contains("נשואה")))
                        {
                            isMarriedInText = true;
                        }
                    }
                    
                    // Collect raw fields for debug
                    var docFields = document.Fields.ToDictionary(
                        kvp => kvp.Key, 
                        kvp => kvp.Value.Content // Store the string content 
                    );
                    allDebugFields.Add($"File_{file.FileName}_Doc_{docIndex++}", docFields);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error analyzing file {FileName}", file.FileName);
                allDebugFields.Add($"Error_{file.FileName}", ex.Message);
            }
        }

        // Calculation Logic
        decimal averageMonthlyIncome = countNetIncome > 0 ? totalNetIncome / 3 : 0; // Assume 3 months normalization

        return new CreateRequestDto
        {
            NetIncome = Math.Round(averageMonthlyIncome, 2),
            NumChildren = maxChildren,
            SeniorityYears = maxSeniority,
            PensionGrossAmount = maxPension,
            RawData = allDebugFields,
            IsMarried = files.Count >= 6 || isMarriedInText
        };
    }

    private bool TryGetDecimal(DocumentField field, out decimal value)
    {
        value = 0;
        if (field == null) return false;
        
        if (field.Type == DocumentFieldType.Currency && field.ValueCurrency != null)
        {
            value = (decimal)field.ValueCurrency.Amount;
            return true;
        }
        
        if (field.Type == DocumentFieldType.Double && field.ValueDouble.HasValue)
        {
            value = (decimal)field.ValueDouble.Value;
            return true;
        }
        
        var content = field.Content;
        if (string.IsNullOrWhiteSpace(content)) return false;

        // Clean string (remove currency symbols, commas)
        var cleaned = Regex.Replace(content, @"[^\d\.]", "");
        return decimal.TryParse(cleaned, out value);
    }
}
