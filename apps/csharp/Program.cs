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

app.MapPost("/chain", async (HttpContext ctx) =>
{
    using var doc = await System.Text.Json.JsonDocument.ParseAsync(ctx.Request.Body);
    var root = doc.RootElement.Clone();

    // find members array
    if (root.TryGetProperty("chain", out var chain) && chain.TryGetProperty("members", out var members))
    {
        int idx = -1;
        var membersList = new System.Collections.Generic.List<System.Text.Json.JsonElement>();
        foreach (var el in members.EnumerateArray()) membersList.Add(el);

        for (int i = 0; i < membersList.Count; i++)
        {
            var name = membersList[i].GetProperty("name").GetString();
            if (name == "csharp")
            {
                // create a new mutable document: recreate payload as a Dictionary
                ctx.Request.Body.Position = 0;
                var payload = await System.Text.Json.JsonSerializer.DeserializeAsync<System.Collections.Generic.Dictionary<string, object>>(ctx.Request.Body);
                var chainMap = (System.Text.Json.JsonElement) System.Text.Json.JsonSerializer.SerializeToElement(payload).GetProperty("chain");
                var mems = (System.Collections.Generic.List<System.Text.Json.JsonElement>)null; // not used further
                // mark completed in payload dict
                var cms = (System.Collections.Generic.List<object>)null; // placeholder
                // simpler approach: forward without complex in-place mutation for demo
                idx = i;
                break;
            }
        }

        if (idx >= 0 && idx + 1 < membersList.Count)
        {
            var nextUrl = membersList[idx + 1].GetProperty("url").GetString();
            var traceparent = ctx.Request.Headers["traceparent"].ToString();
            // forward original body to next
            using var client = new System.Net.Http.HttpClient();
            var req = new System.Net.Http.StringContent(System.Text.Json.JsonSerializer.Serialize(root), System.Text.Encoding.UTF8, "application/json");
            if (!string.IsNullOrEmpty(traceparent)) req.Headers.Add("traceparent", traceparent);
            await client.PostAsync(nextUrl, req);
        }
    }

    return Results.Json(new { status = "ok" });
});

app.Run();
