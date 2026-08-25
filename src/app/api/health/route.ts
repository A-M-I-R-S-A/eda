import { NextResponse } from "next/server";
import { pingDatabase } from "@/lib/db/store";

/**
 * Liveness / readiness probe.
 *
 * Answers whether this process can actually serve — which for this
 * application means "can it reach MariaDB". A process that is listening but
 * cannot read the database is not ready, and a host that only checks for an
 * open port would keep sending it traffic.
 *
 * Deliberately says nothing else: no version, no hostname, no error detail.
 * The endpoint is unauthenticated, so it reports a boolean and a status code
 * and nothing an attacker could use to fingerprint the deployment.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const database = await pingDatabase();

  return NextResponse.json(
    { status: database ? "ok" : "degraded", database },
    {
      status: database ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
