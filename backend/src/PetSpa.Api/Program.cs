using System.Reflection;
using Microsoft.OpenApi.Models;          // đổi từ Microsoft.OpenApi
using PetSpa.Application;
using PetSpa.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

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

if (app.Environment.IsDevelopment() || builder.Configuration.GetValue<bool>("Swagger:Enabled"))
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Pet Spa API v1"));
}

app.UseHttpsRedirection();
// TODO task 58 (Vương): app.UseCors(...)
// TODO task 57 (Vương): app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();