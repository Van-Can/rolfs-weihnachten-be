import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

export async function aktiviereWeihnachtsmusik(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  context.log(`ESP32-Trigger gestartet für URL: ${request.url}`);

  // Check if it's night time (21:00 to 08:00)
  const currentHour = new Date().getHours();
  if (currentHour >= 21-2 || currentHour < 8-2) {
    return {
      status: 300,
      jsonBody: {
        ok: false,
        message: `Es ist ${currentHour} Uhr. Noch ist Nachtruhe (21:00 bis 08:00 Uhr). Die Musik kann nicht gespielt werden. 🎄🎵`,
      },
    };
  }

  const baseUrl = process.env.ROLFSURL;
  if (!baseUrl) {
    return {
      status: 500,
      jsonBody: {
        ok: false,
        message: "Server-Konfiguration fehlerhaft: ROLFSURL fehlt",
      },
    };
  }

  const ESP32_URL = `${baseUrl}/trigger`;

  try {
    const response = await fetch(ESP32_URL, {
      method: "GET",
    });

    context.log(`ESP32 Response status: ${response.status}`);

    if (response.status === 201) {
      return {
        status: 201,
        jsonBody: {
          ok: true,
          message: `Es ist ${currentHour} Uhr. Musik im Märchenwald wurde aktiviert 🎄🎵`,
          espStatus: response.status,
        },
      };
    }

    if (response.status === 200) {
      return {
        status: 200,
        jsonBody: {
          ok: true,
          message: `Es ist ${currentHour} Uhr. Musik im Märchenwald läuft bereits. 🎄🎵`,
          espStatus: response.status,
        },
      };
    }

    return {
      status: 502,
      jsonBody: {
        ok: false,
        message: "Unerwartete Antwort vom ESP32",
        espStatus: response.status,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    context.log(`Fehler beim ESP32-Aufruf: ${message}`);

    return {
      status: 500,
      jsonBody: {
        ok: false,
        message: "Fehler: ESP32 konnte nicht erreicht werden",
        error: message,
      },
    };
  }
}

app.http("aktiviereWeihnachtsmusik", {
  methods: ["POST"],
  authLevel: "function",
  handler: aktiviereWeihnachtsmusik,
});