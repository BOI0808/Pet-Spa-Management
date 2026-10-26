using System.Reflection;
using Microsoft.OpenApi.Models;          
using PetSpa.Application;
using PetSpa.Infrastructure;
using PetSpa.Domain.Exceptions;
using PetSpa.Api.Filters;
using FluentValidation;
using PetSpa.Api.Middleware;
using Serilog;
using Serilog.Events;
using PetSpa.Api.Security;
using Microsoft.AspNetCore.HttpOverrides;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, configuration) => configuration
    .ReadFrom.Configuration(context.Configuration)          // mức log: Serilog__MinimumLevel
    .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
    .WriteTo.Console());

builder.Services.AddControllers(options =>
    {
        options.Filters.Add<ValidationFilter>();
        // Để FluentValidation là nơi duy nhất kiểm tra trường bắt buộc.
        options.SuppressImplicitRequiredAttributeForNonNullableReferenceTypes = true;
    })
    .ConfigureApiBehaviorOptions(options =>
    {
        // Body sai định dạng JSON hoặc sai kiểu dữ liệu: trả cùng error envelope VALIDATION_ERROR qua middleware.
        options.InvalidModelStateResponseFactory = _ =>
            throw new BusinessException(ErrorCodes.ValidationError, "Dữ liệu gửi lên không hợp lệ hoặc sai định dạng.");
    });
builder.Services.AddValidatorsFromAssemblyContaining<Program>();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddPetSpaAuthorization();

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

var allowedOrigins = (builder.Configuration["Cors:AllowedOrigins"] ?? string.Empty)
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    .Select(o => o.TrimEnd('/'))
    .ToArray();

builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy => policy
        .WithOrigins(allowedOrigins)
        .AllowAnyHeader()
        .AllowAnyMethod()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Pet Spa Management API",
        Version = "v1",
        Description = "Backend duy nhất phục vụ Web Quản lý, Web Nhân viên, Web Khách hàng"
    });

    var xml = Path.Combine(AppContext.BaseDirectory, $"{Assembly.GetExecutingAssembly().GetName().Name}.xml");
    if (File.Exists(xml)) options.IncludeXmlComments(xml);

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Dán access token (không cần gõ chữ 'Bearer')"
    });

    // Cú pháp cũ: dùng Reference thay vì OpenApiSecuritySchemeReference
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();
app.UseForwardedHeaders();
app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment() || builder.Configuration.GetValue<bool>("Swagger:Enabled"))
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Pet Spa API v1"));
}

app.UseHttpsRedirection();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();