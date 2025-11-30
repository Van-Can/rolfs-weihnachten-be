import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

export async function aktiviereWeihnachtsmusik(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {

    context.log(`ESP32-Trigger gestartet für URL: ${request.url}`);

    const ESP32_URL = "http://109.19.78.5/trigger";

    try {
        const response = await fetch(ESP32_URL, {
            method: "GET",
            // verhindert ewiges Hängen bei Offline-ESP32
            signal: AbortSignal.timeout(4000) 
        });

        context.log(`ESP32 Response status: ${response.status}`);

        return {
            status: 200,
            jsonBody: {
                ok: true,
                message: "Weihnachtsmusik wurde am ESP32 aktiviert 🎄🎵",
                espStatus: response.status
            }
        };

    } catch (err: any) {
        context.log(`Fehler beim ESP32-Aufruf: ${err}`);

        return {
            status: 500,
            jsonBody: {
                ok: false,
                message: "Fehler: ESP32 konnte nicht erreicht werden",
                error: err.toString()
            }
        };
    }
}

app.http('aktiviereWeihnachtsmusik', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: aktiviereWeihnachtsmusik
});