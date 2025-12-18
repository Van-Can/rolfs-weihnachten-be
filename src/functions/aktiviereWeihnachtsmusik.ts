import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

export async function aktiviereWeihnachtsmusik(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(`ESP32-Trigger gestartet für URL: ${request.url}`);

  const ESP32_URL = "http://91.9.253.126:80/trigger";

  try {
    const response = await fetch(ESP32_URL, {
      method: "GET",
      // verhindert ewiges Hängen bei Offline-ESP32
      signal: AbortSignal.timeout(4000),
    });

    context.log(`ESP32 Response status: ${response.status}`);

    switch (response.status) {
      case 201:
        return {
          status: 201,
          jsonBody: {
            ok: true,
            message: "Weihnachtsmusik im Märchenwald wurde aktiviert 🎄🎵",
            espStatus: response.status,
          },
        };
      case 200:
        return {
          status: 200,
          jsonBody: {
            ok: true,
            message: "Weihnachtsmusik im Märchenwald läuft bereits. 🎄🎵",
            espStatus: response.status,
          },
        };

      case 300:
        return {
          status: 300,
          jsonBody: {
            ok: true,
            message:
              "Noch ist Nachruhe (von 8:00 bis 21:00 Uhr). Die Musik kann noch nicht gespielt werden. 🎄🎵",
            espStatus: response.status,
          },
        };
      default:
        return {
          status: 201,
          jsonBody: {
            ok: true,
            message: "Weihnachtsmusik im Märchenwald wurde aktiviert 🎄🎵",
            espStatus: response.status,
          },
        };
    }
  } catch (err: any) {
    context.log(`Fehler beim ESP32-Aufruf: ${err}`);

    return {
      status: 500,
      jsonBody: {
        ok: false,
        message: "Fehler: ESP32 konnte nicht erreicht werden",
        error: err.toString(),
      },
    };
  }
}

app.http("aktiviereWeihnachtsmusik", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  handler: aktiviereWeihnachtsmusik,
});
