const apiKey = "AIzaSyBvKSyUnfEk_rCiIeGxAcFuRZe7-KGONo4";

async function testModel(apiVersion, model) {
    const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`;
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: "Hello, respond with exactly 'OK' if you receive this." }] }]
            })
        });

        const data = await response.json();
        if (response.ok) {
            console.log(`[Success] API: ${apiVersion}, Model: ${model}. Response: ${data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()}`);
            return true;
        } else {
            console.log(`[Fail] API: ${apiVersion}, Model: ${model}. Status: ${response.status}. Error:`, JSON.stringify(data.error));
            return false;
        }
    } catch (err) {
        console.log(`[Error] API: ${apiVersion}, Model: ${model}. Exception: ${err.message}`);
        return false;
    }
}

async function runTests() {
    console.log("Starting Gemini API Connection and Model compatibility tests...");
    
    // Test v1 endpoint models
    await testModel("v1", "gemini-2.5-flash");
    await testModel("v1", "gemini-2.0-flash");
    await testModel("v1", "gemini-1.5-flash");
    await testModel("v1", "gemini-1.5-flash-latest");

    console.log("\nTesting v1beta endpoint models...");
    // Test v1beta endpoint models
    await testModel("v1beta", "gemini-2.5-flash");
    await testModel("v1beta", "gemini-2.0-flash");
    await testModel("v1beta", "gemini-1.5-flash");
}

runTests();
