using System.ComponentModel.DataAnnotations;

namespace TenantRating.API.DTOs;

// ⚠️ DTO למסלול בדיקות/דיבאג בלבד (Swagger/Postman)
// ⚠️ לא מיועד למסלול הלקוח בייצור - יש להשתמש ב-/api/requests/submit
// ⚠️ משמש בעיקר ללוגים, בדיקות וחשיפת פירוט OCR בעת פיתוח
public class CreateRequestDto
{
    [Required]
    public decimal DesiredRent { get; set; }
    [Required]
    public string CityName { get; set; } = string.Empty;

    [Required]
    public List<string> IdNumbers { get; set; } = new();

    // קלט לסימולציית חישוב במסלול הבדיקות של OCR
    public decimal NetIncome { get; set; }
    public int NumChildren { get; set; }
    public bool IsMarried { get; set; }
    public decimal SeniorityYears { get; set; }
    public decimal PensionGrossAmount { get; set; }
    public decimal PensionDeductionPercent { get; set; }

    // נתוני דיבאג בלבד - לא מיועדים למסלול הייצור
    public object? RawData { get; set; }
    public string? ScoreFormula { get; set; }
    public List<string>? CalculationDetails { get; set; }
}

public class RequestResultDto
{
    public int RequestId { get; set; }
    public decimal FinalScore { get; set; }
    public string CityName { get; set; } = string.Empty;
    public decimal DesiredRent { get; set; }
    public DateTime DateCreated { get; set; }
    public decimal MaxAffordableRent { get; set; }
    public int Percentile { get; set; }
}
