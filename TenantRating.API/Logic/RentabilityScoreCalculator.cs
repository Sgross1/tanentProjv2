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
        decimal pensionGrossAmount,
        decimal pensionDeductionPercent)
    {
        decimal tempScore = netIncome;

        // --- 1. Demographic Dilution (Haircuts) ---
        tempScore -= numChildren * 300m; // 300 per child
        if (isMarried)
        {
            tempScore -= 400m; // Fixed expenses for spouse
        }

        // --- 2. Stability Premium ---
        decimal stabilityBonus = 0;
        if (seniorityYears >= 2)
        {
            if (seniorityYears <= 5)
            {
                stabilityBonus = 50m * (seniorityYears - 1);
            }
            else
            {
                stabilityBonus = 50m * 4 + 100m * (seniorityYears - 5);
            }
            stabilityBonus = Math.Min(stabilityBonus, 700m); // Cap at 700
        }
        tempScore += stabilityBonus;

        // --- 3. Discipline Predictor (Pension) ---
        decimal disciplineBonus = 0;
        if (pensionDeductionPercent > 6)
        {
            decimal excessPercent = pensionDeductionPercent - 6;
            disciplineBonus = 50m * (excessPercent / 0.1m);
            disciplineBonus = Math.Min(disciplineBonus, 500m); // Cap at 500
        }
        tempScore += disciplineBonus;

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
        decimal pensionDeductionPercent,
        decimal desiredRent)
    {
        var details = new List<string>();

        // A: Base Income
        details.Add($"[A] הכנסה התחלתית (נטו): {netIncome:N0} ₪");

        decimal tempScore = netIncome;

        // B: Demographic Dilution - Children
        decimal childReduction = numChildren * 300m;
        tempScore -= childReduction;
        details.Add($"[B] הפחתה דמוגרפית בגין {numChildren} ילדים (300 ₪ לילד): {childReduction:N0} ₪");

        // C: Demographic Dilution - Spouse
        decimal spouseReduction = isMarried ? 400m : 0;
        tempScore -= spouseReduction;
        details.Add($"[C] הפחתה דמוגרפית בגין בן/בת זוג (הוצאות קבועות): {spouseReduction:N0} ₪");

        // D: Stability Premium
        decimal stabilityBonus = 0;
        if (seniorityYears >= 2)
        {
            if (seniorityYears <= 5)
            {
                stabilityBonus = 50m * (seniorityYears - 1);
            }
            else
            {
                stabilityBonus = 50m * 4 + 100m * (seniorityYears - 5);
            }
            stabilityBonus = Math.Min(stabilityBonus, 700m);
        }
        tempScore += stabilityBonus;
        details.Add($"[D] פרמיית יציבות בגין {seniorityYears} שנות ותק: {stabilityBonus:N0} ₪");

        // E: Discipline Predictor (Pension)
        decimal disciplineBonus = 0;
        if (pensionDeductionPercent > 6)
        {
            decimal excessPercent = pensionDeductionPercent - 6;
            disciplineBonus = 50m * (excessPercent / 0.1m);
            disciplineBonus = Math.Min(disciplineBonus, 500m);
        }
        tempScore += disciplineBonus;
        details.Add($"[E] מנבא משמעת (פנסיה {pensionDeductionPercent:F1}%): {disciplineBonus:N0} ₪");

        // F: Temp Score
        tempScore = Math.Max(0, tempScore);
        details.Add($"[F] נטו מתואם (A - B - C + D + E): {tempScore:N0} ₪");

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
