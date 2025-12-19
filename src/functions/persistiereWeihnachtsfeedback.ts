import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import {
  TableClient,
  AzureNamedKeyCredential,
  TableServiceClient,
} from "@azure/data-tables";

const TABLE_NAME = process.env.TABLE_NAME ?? "WeihnachtsFeedback";

function createTableClient(): TableClient {
  const connStr = process.env.TABLES_CONNECTION_STRING;
  if (connStr) {
    return TableClient.fromConnectionString(connStr, TABLE_NAME);
  }

  const account = process.env.STORAGE_ACCOUNT_NAME;
  const key = process.env.STORAGE_ACCOUNT_KEY;
  if (!account || !key) {
    throw new Error(
      "Missing config: set TABLES_CONNECTION_STRING OR STORAGE_ACCOUNT_NAME + STORAGE_ACCOUNT_KEY."
    );
  }

  const credential = new AzureNamedKeyCredential(account, key);
  return new TableClient(
    `https://${account}.table.core.windows.net`,
    TABLE_NAME,
    credential
  );
}

async function ensureTableExists(client: TableClient): Promise<void> {
  const connStr = process.env.TABLES_CONNECTION_STRING;
  if (connStr) {
    const service = TableServiceClient.fromConnectionString(connStr);
    await service.createTable(TABLE_NAME).catch((e: any) => {
      if (e?.statusCode !== 409) throw e;
    });
    return;
  }

  const account = process.env.STORAGE_ACCOUNT_NAME!;
  const key = process.env.STORAGE_ACCOUNT_KEY!;
  const credential = new AzureNamedKeyCredential(account, key);
  const service = new TableServiceClient(
    `https://${account}.table.core.windows.net`,
    credential
  );
  await service.createTable(TABLE_NAME).catch((e: any) => {
    if (e?.statusCode !== 409) throw e;
  });
}

function uuid(): string {
  return globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function persistiereWeihnachtsfeedback(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const client = createTableClient();
    await ensureTableExists(client);

    // ---------- GET: gesamtes Feedback holen ----------
    if (request.method === "GET") {
      const pk = request.query.get("pk") ?? "weihnachten";
      const topRaw = request.query.get("top");
      const top = topRaw ? Math.max(1, Math.min(5000, Number(topRaw))) : undefined;

      const filter = `PartitionKey eq '${pk.replace(/'/g, "''")}'`;

      const items: any[] = [];
      const iter = client.listEntities({
        queryOptions: { filter },
      });

      for await (const e of iter) {
        items.push({
          partitionKey: e.partitionKey,
          rowKey: e.rowKey,
          feedbackText: (e as any).feedbackText ?? "",
          createdAt: (e as any).createdAt ?? null,
          userAgent: (e as any).userAgent ?? null,
        });

        if (top && items.length >= top) break;
      }

      return {
        status: 200,
        jsonBody: {
          count: items.length,
          partitionKey: pk,
          items,
        },
      };
    }

    // ---------- POST: Feedback speichern ----------
    const body = (await request.json().catch(() => null)) as
      | { feedbackText?: unknown }
      | null;

    const feedbackText = typeof body?.feedbackText === "string" ? body.feedbackText.trim() : "";
    if (!feedbackText) {
      return {
        status: 400,
        jsonBody: { error: "feedbackText is required (string)." },
      };
    }

    const entity = {
      partitionKey: "weihnachten",
      rowKey: uuid(),
      feedbackText,
      createdAt: new Date().toISOString(),
      userAgent: request.headers.get("user-agent") ?? undefined,
    };

    await client.createEntity(entity);

    return {
      status: 201,
      jsonBody: {
        message: "Feedback gespeichert 🎄",
        id: entity.rowKey,
        partitionKey: entity.partitionKey,
      },
    };
  } catch (err: any) {
    context.error("persistiereWeihnachtsfeedback failed", err);
    return {
      status: 500,
      jsonBody: { error: "Internal Server Error" },
    };
  }
}

app.http("persistiereWeihnachtsfeedback", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  handler: persistiereWeihnachtsfeedback,
});