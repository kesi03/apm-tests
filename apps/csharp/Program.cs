using Elastic.Apm.NetCoreAll;

var builder = WebApplication.CreateBuilder(args);

// Enable full auto-instrumentation. Configuration is read from
// ELASTIC_APM_* environment variables (or appsettings.json).
builder.Services.AddAllElasticApm();

var app = builder.Build();

app.MapGet("/", () => "Hello from C# / ASP.NET Core (Elastic APM)");

app.MapGet("/greet/{name}", async (string name) =>
{
    await Task.Delay(200);
    return $"Hello, {name}!";
});

app.MapGet("/slow", async () =>
{
    await Task.Delay(1000);
    return "Slow response";
});

app.MapGet("/error", (HttpContext context) => throw new InvalidOperationException("Boom from C# demo"));

app.Run();
