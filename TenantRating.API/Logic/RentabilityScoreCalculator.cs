namespace TenantRating.API.Logic;

public static class RentabilityScoreCalculator
{
    // Risk factors (Haircuts) - Reduction for safety buffer
    private const decimal KidExpenseFactor = 400m; // Risk per child
    private const decimal MarriedExpenseFactor = 300m; // Risk per spouse

    // Debt-to-Income Ratio (DTI)
    private const decimal RentToIncomeRatio = 0.35m; // 35% of adjusted income allocated for rent

    public static decimal CalculateTempScore(
        decimal netIncome,
        int numChildren,
        bool isMarried,
        decimal seniorityYears,
        decimal pensionGrossAmount) // Absolute Amount Logic
    {
        decimal tempScore = netIncome;

        // --- 1. Risk Adjustments (Haircuts) ---
        tempScore -= numChildren * KidExpenseFactor;

        if (isMarried)
        {
            tempScore -= MarriedExpenseFactor;
        }

        // --- 2. Quality Bonuses ---

        // Seniority Bonus
        if (seniorityYears >= 9) tempScore += seniorityYears * 35m;
        else if (seniorityYears >= 4) tempScore += seniorityYears * 25m;
        else tempScore += seniorityYears * 15m;

        // Pension Responsibility Bonus (Using Absolute Amount)
        // LOGIC CHANGE: Check absolute amount instead of percentage
        if (pensionGrossAmount >= 700m) tempScore += 50m;
        else if (pensionGrossAmount >= 400m) tempScore += 20m;

        // Ensure non-negative
        return Math.Max(0, tempScore);
    }

    public static decimal CalculateFinalScore(decimal tempScore, decimal requestedRent)
    {
        if (requestedRent <= 0) return 100m; // Fallback
        
        // 1. Max Affordable Rent (35% of Adjusted Income)
        decimal maxAffordableRent = tempScore * RentToIncomeRatio;
        
        // 2. Risk Ratio
        decimal riskRatio = maxAffordableRent / requestedRent;
        
        // 3. Convert to Score (0-100)
        decimal finalScore = riskRatio * 100m;
        
        return Math.Min(Math.Max(finalScore, 0m), 100m);
    }
}
