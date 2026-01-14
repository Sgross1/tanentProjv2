using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TenantRating.API.Data.Entities;

public class SavedRequest
{
    [Key]
    public int SavedRequestId { get; set; }

    public int LandlordUserId { get; set; }
    
    public int TenantRequestId { get; set; }
    
    [ForeignKey("TenantRequestId")]
    public Request? Request { get; set; }
    
    public DateTime DateSaved { get; set; } = DateTime.UtcNow;
}
