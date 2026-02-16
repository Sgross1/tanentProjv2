using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TenantRating.API.Data.Entities;

public class Request
{
    public int RequestId { get; set; }

    public int UserId { get; set; }
    [ForeignKey("UserId")]
    public User? User { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal DesiredRent { get; set; }

    public string CityName { get; set; } = string.Empty;

    public string TenantIdNumbers { get; set; } = string.Empty;

    [Column(TypeName = "decimal(18,2)")]
    public decimal TempScore { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal FinalScore { get; set; }

    public RequestStatus Status { get; set; } = RequestStatus.Pending;

    public int? ReviewerId { get; set; }
    [ForeignKey("ReviewerId")]
    public User? Reviewer { get; set; }

    public DateTime DateCreated { get; set; } = DateTime.UtcNow;
}
