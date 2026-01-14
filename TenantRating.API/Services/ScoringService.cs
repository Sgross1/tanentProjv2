using TenantRating.API.Data.Entities;

namespace TenantRating.API.Services;

public interface IScoringService
{
    decimal CalculateScoreForRequest(Request request, decimal netIncome, int children, bool isMarried, decimal seniority, decimal pension);
}

public class ScoringService : IScoringService
{
    public decimal CalculateScoreForRequest(Request request, decimal netIncome, int children, bool isMarried, decimal seniority, decimal pension)
    {
        // 1. Calculate Temp Score (Adjusted Income)
        decimal tempScore = Logic.RentabilityScoreCalculator.CalculateTempScore(netIncome, children, isMarried, seniority, pension);
        
        // 2. Update Request with Temp Score
        request.TempScore = tempScore;
        
        // 3. Calculate Final Score (0-100)
        decimal finalScore = Logic.RentabilityScoreCalculator.CalculateFinalScore(tempScore, request.DesiredRent);
        
        request.FinalScore = finalScore;
        
        return finalScore;
    }
}
