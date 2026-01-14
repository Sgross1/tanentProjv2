using System.ComponentModel.DataAnnotations;

namespace TenantRating.API.DTOs;

public class CreateRequestDto
{
    [Required]
    public decimal DesiredRent { get; set; }
    [Required]
    public string CityName { get; set; } = string.Empty;
    
    // Input for scoring simulation (mocking the file upload parsing)
    public decimal NetIncome { get; set; }
    public int NumChildren { get; set; }
    public bool IsMarried { get; set; }
    public decimal SeniorityYears { get; set; }
    public decimal PensionGrossAmount { get; set; }
}

public class RequestResultDto
{
    public int RequestId { get; set; }
    public decimal FinalScore { get; set; }
    public decimal TempScore { get; set; }
    public string CityName { get; set; } = string.Empty;
    public DateTime DateCreated { get; set; }
}
