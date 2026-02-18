using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.EntityFrameworkCore;
using TenantRating.API.Data;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS Configuration
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular",
        builder => builder
            .AllowAnyOrigin() // Relaxed for debugging
            .AllowAnyMethod()
            .AllowAnyHeader());
});

// DB Context
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration.GetSection("Jwt:Key").Value!)),
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration.GetSection("Jwt:Issuer").Value,
            ValidateAudience = true,
            ValidAudience = builder.Configuration.GetSection("Jwt:Audience").Value
        };
    });

// Services
builder.Services.AddScoped<TenantRating.API.Services.IAuthService, TenantRating.API.Services.AuthService>();
builder.Services.AddScoped<TenantRating.API.Services.IScoringService, TenantRating.API.Services.ScoringService>();
builder.Services.AddScoped<TenantRating.API.Services.IOcrService, TenantRating.API.Services.OcrService>();
builder.Services.AddHttpClient<TenantRating.API.Services.ISmsService, TenantRating.API.Services.SmsService>();

var app = builder.Build();

// Create DB if not exists
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    context.Database.EnsureCreated();

    // --- Manual Schema Update (Safe) ---
    // Removed: Columns already exist in DB
    // try { context.Database.ExecuteSqlRaw("ALTER TABLE Users ADD COLUMN ResetToken TEXT NULL"); } catch { }
    // try { context.Database.ExecuteSqlRaw("ALTER TABLE Users ADD COLUMN ResetTokenExpiration TEXT NULL"); } catch { }
    // -----------------------------------

    await DataSeeder.SeedAsync(context);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// app.UseHttpsRedirection(); // Disabled for local dev stability
app.UseCors("AllowAngular");

app.UseAuthentication(); // Must be before Authorization
app.UseAuthorization();
app.MapControllers();

app.Run("http://localhost:5000");