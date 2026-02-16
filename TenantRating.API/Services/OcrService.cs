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
        bool hasMinus = false; // Flag if any payslip has minus

        decimal maxPension = 0;
        decimal maxSeniority = 0;
        int maxChildren = 0;
        bool isMarriedInText = false;
        decimal pensionDeductionPercent = 0;

        // New: Collect IDs and dates for validation
        var idNumbers = new HashSet<string>();
        var payDates = new List<DateTime>();
        bool idMissing = false;

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
                    // Only process fields with confidence > 80%
                    var validFields = document.Fields.Where(kvp => kvp.Value.Confidence > 0.8).ToDictionary(kvp => kvp.Key, kvp => kvp.Value);

                    // Map Hebrew fields - robust checking

                    // Net Income: "שכר נטו", "נטו לתשלום", "נטו"
                    if (validFields.TryGetValue("שכר נטו", out var netIncomeField) ||
                        validFields.TryGetValue("נטו לתשלום", out netIncomeField) ||
                        validFields.TryGetValue("נטו", out netIncomeField) ||
                        validFields.TryGetValue("NetIncome", out netIncomeField))
                    {
                        if (TryGetDecimal(netIncomeField, out var val))
                        {
                            countNetIncome++;
                        }
                    }

                    // Check for Minus field
                    bool currentHasMinus = false;
                    if (validFields.TryGetValue("מינוס", out var minusField))
                    {
                        if (minusField != null && !string.IsNullOrWhiteSpace(minusField.Content))
                        {
                            currentHasMinus = true;
                            hasMinus = true;
                        }
                    }

                    // Apply Net Income with minus logic if exists
                    if (validFields.TryGetValue("שכר נטו", out netIncomeField) ||
                        validFields.TryGetValue("נטו לתשלום", out netIncomeField) ||
                        validFields.TryGetValue("נטו", out netIncomeField) ||
                        validFields.TryGetValue("NetIncome", out netIncomeField))
                    {
                        if (TryGetDecimal(netIncomeField, out var val))
                        {
                            // If this payslip has minus, subtract from total; otherwise add
                            if (currentHasMinus)
                                totalNetIncome -= val;
                            else
                                totalNetIncome += val;
                        }
                    }

                    // ID Number: "מספר זהות", "ת.ז.", "ID" - allow lower confidence
                    string? extractedId = null;
                    if (document.Fields.TryGetValue("מספר זהות", out var idField) ||
                        document.Fields.TryGetValue("ת.ז.", out idField) ||
                        document.Fields.TryGetValue("ID", out idField))
                    {
                        var idContent = idField.Content?.Replace(" ", "").Replace("-", "");
                        if (!string.IsNullOrEmpty(idContent) && Regex.IsMatch(idContent, @"^\d{9}$"))
                        {
                            extractedId = idContent;
                            idNumbers.Add(idContent);
                        }
                    }
                    if (extractedId == null)
                    {
                        idMissing = true;
                    }

                    // Children: "ילדים", "מספר ילדים", "Children"
                    // Parse as decimal first to safely handle "2.0", then cast to int
                    if (validFields.TryGetValue("ילדים", out var childrenField) ||
                        validFields.TryGetValue("מספר ילדים", out childrenField) ||
                        validFields.TryGetValue("NumChildren", out childrenField))
                    {
                        if (TryGetDecimal(childrenField, out var val))
                        {
                            int intVal = (int)val;
                            if (intVal > maxChildren) maxChildren = intVal;
                        }
                    }

                    // Seniority: "ותק בעבודה", "ותק מוכר", "ותק", "שנות ותק", "וותק"
                    bool seniorityFound = false;
                    if (validFields.TryGetValue("ותק בעבודה", out var seniorityField) ||
                        validFields.TryGetValue("ותק מוכר", out seniorityField) ||
                        validFields.TryGetValue("ותק", out seniorityField) ||
                        validFields.TryGetValue("וותק", out seniorityField) ||
                        validFields.TryGetValue("שנות ותק", out seniorityField) ||
                        validFields.TryGetValue("SeniorityYears", out seniorityField))
                    {
                        if (TryGetDecimal(seniorityField, out var val))
                        {
                            if (val > maxSeniority) maxSeniority = val;
                            seniorityFound = true;
                        }
                    }

                    // If seniority not found, try to calculate from dates
                    if (!seniorityFound)
                    {
                        if (validFields.TryGetValue("תאריך תחילת עבודה", out var startDateField) ||
                            validFields.TryGetValue("תחילת עבודה", out startDateField))
                        {
                            if (TryGetDate(startDateField, out var startDate))
                            {
                                var seniorityCalc = (decimal)((DateTime.Now - startDate).TotalDays / 365.25);
                                if (seniorityCalc > maxSeniority) maxSeniority = seniorityCalc;
                            }
                        }
                    }

                    // Pension: "ברוטו לפנסיה", "פנסיה"
                    decimal currentGross = 0;
                    if (validFields.TryGetValue("ברוטו לפנסיה", out var pensionField) ||
                        validFields.TryGetValue("פנסיה", out pensionField) ||
                        validFields.TryGetValue("PensionGrossAmount", out pensionField))
                    {
                        if (TryGetDecimal(pensionField, out var val))
                        {
                            if (val > maxPension) maxPension = val;
                            currentGross = val;
                        }
                    }

                    // Pension Deduction: "ניכויים לפנסיה", calculate percent
                    if (validFields.TryGetValue("ניכויים לפנסיה", out var deductionField) && currentGross > 0)
                    {
                        if (TryGetDecimal(deductionField, out var deduction))
                        {
                            var percent = (deduction / currentGross) * 100;
                            if (percent > pensionDeductionPercent) pensionDeductionPercent = percent;
                        }
                    }

                    // Marital Status: "מצב משפחתי"
                    if ((validFields.TryGetValue("מצב משפחתי", out var maritalField) ||
                         validFields.TryGetValue("MaritalStatus", out maritalField)) && maritalField != null)
                    {
                        var maritalContent = maritalField.Content;
                        if (!string.IsNullOrEmpty(maritalContent))
                        {
                            // Check single letters: נ/ר/ג/א
                            if (maritalContent.Length == 1)
                            {
                                if (maritalContent == "נ") isMarriedInText = true;
                                // ר, ג, א - assume not married
                            }
                            else
                            {
                                // Check words: נש/רו/גר/אל
                                if (maritalContent.Contains("נש")) isMarriedInText = true;
                                // Others not married
                            }
                        }
                    }

                    // Pay Date: "חודש ושנה", "תאריך"
                    if (validFields.TryGetValue("חודש ושנה", out var dateField) ||
                        validFields.TryGetValue("תאריך", out dateField) ||
                        validFields.TryGetValue("PayDate", out dateField))
                    {
                        if (TryGetDate(dateField, out var payDate))
                        {
                            // If d/m/y, take m/y
                            payDate = new DateTime(payDate.Year, payDate.Month, 1);
                            payDates.Add(payDate);
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

        // Validations
        // ID: Must have all, unique up to 2
        if (idMissing || idNumbers.Count == 0)
        {
            throw new InvalidOperationException("לא מצליחים לזהות את מספר הזהות באחד או יותר מהתלושים.");
        }
        if (files.Count == 3 && idNumbers.Count != 1)
        {
            throw new InvalidOperationException("מספרי הזהות בתלושים אינם תואמים.");
        }
        if (files.Count == 6 && idNumbers.Count > 2)
        {
            throw new InvalidOperationException("יותר מדי מספרי זהות שונים בתלושים.");
        }

        // Marital: If not specified and has children, assume married
        if (!isMarriedInText && maxChildren > 0)
        {
            isMarriedInText = true;
        }

        // Dates: Sort, check consecutiveness, last not >3 months old
        payDates = payDates.Distinct().OrderBy(d => d).ToList();
        if (payDates.Count > 1)
        {
            for (int i = 1; i < payDates.Count; i++)
            {
                var diff = (payDates[i] - payDates[i - 1]).TotalDays;
                if (diff > 35 || diff < 25) // Approx monthly
                {
                    throw new InvalidOperationException("תאריכי התלושים אינם סמוכים.");
                }
            }
        }
        var lastDate = payDates.LastOrDefault();
        if (lastDate != default && (DateTime.Now - lastDate).TotalDays > 90) // 3 months
        {
            throw new InvalidOperationException("התלוש האחרון ישן מדי.");
        }

        // Calculation Logic
        // If HasMinus, we need to apply minus logic during calculation
        // For now, if hasMinus is true, we flag it in the DTO
        decimal averageMonthlyIncome = countNetIncome > 0 ? totalNetIncome / countNetIncome : 0;

        return new CreateRequestDto
        {
            NetIncome = Math.Round(averageMonthlyIncome, 2),
            HasMinus = hasMinus,
            NumChildren = maxChildren,
            SeniorityYears = Math.Round(maxSeniority, 1),
            PensionGrossAmount = maxPension,
            PensionDeductionPercent = pensionDeductionPercent,
            IdNumbers = idNumbers.ToList(),
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

    private bool TryGetDate(DocumentField field, out DateTime value)
    {
        value = DateTime.MinValue;
        if (field == null) return false;

        if (field.Type == DocumentFieldType.Date && field.ValueDate.HasValue)
        {
            value = field.ValueDate.Value.DateTime;
            return true;
        }

        var content = field.Content;
        if (string.IsNullOrWhiteSpace(content)) return false;

        // Try parse common formats
        if (DateTime.TryParse(content, out value)) return true;
        // Hebrew formats like d/m/y
        if (Regex.IsMatch(content, @"^\d{1,2}/\d{1,2}/\d{4}$") && DateTime.TryParseExact(content, "d/M/yyyy", null, System.Globalization.DateTimeStyles.None, out value)) return true;
        if (Regex.IsMatch(content, @"^\d{1,2}/\d{1,2}/\d{2}$") && DateTime.TryParseExact(content, "d/M/yy", null, System.Globalization.DateTimeStyles.None, out value)) return true;
        return false;
    }
}
