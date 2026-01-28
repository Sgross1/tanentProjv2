using TenantRating.API.DTOs;

namespace TenantRating.API.Services;

public interface IOcrService
{
    Task<CreateRequestDto> AnalyzePayslipsAsync(List<IFormFile> files);
}
