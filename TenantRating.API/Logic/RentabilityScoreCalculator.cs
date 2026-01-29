namespace TenantRating.API.Logic;

public static class RentabilityScoreCalculator
{
    // Risk factors (Haircuts) - Reduction for safety buffer
    private const decimal KidExpenseFactor = 400m; // Risk per child
    private const decimal MarriedExpenseFactor = 300m; // Risk per spouse

    // Debt-to-Income Ratio (DTI)
    public const decimal RentToIncomeRatio = 0.35m; // 35% of adjusted income allocated for rent

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

    public static (string Formula, List<string> Details) GetCalculationDetails(
        decimal netIncome,
        int numChildren,
        bool isMarried,
        decimal seniorityYears,
        decimal pensionGrossAmount,
        decimal desiredRent)
    {
        var details = new List<string>();
        
        // A: Base Income
        details.Add($"[A] הכנסה התחלתית (נטו): {netIncome:N0} ₪");

        decimal tempScore = netIncome;

        // B: Children Haircut
        decimal childReduction = 0;
        if (numChildren > 0)
        {
            childReduction = numChildren * KidExpenseFactor;
            tempScore -= childReduction;
        }
        details.Add($"[B] הפחתה בגין {numChildren} ילדים: {childReduction:N0} ₪");

        // C: Spouse Haircut
        decimal spouseReduction = 0;
        if (isMarried)
        {
            spouseReduction = MarriedExpenseFactor;
            tempScore -= spouseReduction;
        }
        details.Add($"[C] הפחתה בגין בן/בת זוג: {spouseReduction:N0} ₪");

        // D: Seniority Bonus
        decimal seniorityBonus = 0;
        if (seniorityYears > 0)
        {
            if (seniorityYears >= 9) seniorityBonus = seniorityYears * 35m;
            else if (seniorityYears >= 4) seniorityBonus = seniorityYears * 25m;
            else seniorityBonus = seniorityYears * 15m;
            tempScore += seniorityBonus;
        }
        details.Add($"[D] תוספת בגין {seniorityYears} שנות ותק: {seniorityBonus:N0} ₪");

        // E: Pension Bonus
        decimal pensionBonus = 0;
        if (pensionGrossAmount >= 400m)
        {
            pensionBonus = pensionGrossAmount >= 700m ? 50m : 20m;
            tempScore += pensionBonus;
        }
        details.Add($"[E] תוספת עבור חיסכון פנסיוני: {pensionBonus:N0} ₪");

        // F: Temp Score
        tempScore = Math.Max(0, tempScore);
        details.Add($"[F] הכנסה פנויה מותאמת (A - B - C + D + E): {tempScore:N0} ₪");

        // Final Calculation
        if (desiredRent <= 0)
        {
            return ("לא ניתן לחשב (שכר דירה 0)", details);
        }

        // G: Max Affordable
        decimal maxAffordableRent = tempScore * RentToIncomeRatio;
        details.Add($"[G] שכר דירה מקסימלי מומלץ (F * 0.35): {maxAffordableRent:N0} ₪");
        
        // H: Requested Rent
        details.Add($"[H] שכר דירה מבוקש: {desiredRent:N0} ₪");
        
        // Formula
        string formula = $$"""
        נוסחה: (G / H) * 100
        הצבה: ({{maxAffordableRent:N0}} / {{desiredRent:N0}}) * 100
        """;

        return (formula, details);
    }
}
