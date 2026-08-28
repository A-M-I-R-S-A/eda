import "server-only";

/**
 * sms.ir transport.
 *
 * Everything goes through `/send/verify`, the template route. Under Iranian
 * regulation a transactional message is sent by naming a template that has
 * been registered and approved in the sms.ir panel; the API supplies only
 * parameter *values*. Free-text sending is a separate product that most
 * accounts do not have, so the application never attempts it — a composer for
 * writing message bodies would imply an ability the account lacks, and every
 * send would be refused.
 *
 * Credentials come from the environment only. They are deliberately not part
 * of `SiteSettings`, so an editor with access to the admin panel cannot read
 * the account's API key.
 */

const API_BASE = process.env.SMSIR_API_BASE || "https://api.sms.ir/v1";
const TIMEOUT_MS = Number(process.env.SMSIR_TIMEOUT_MS || 10_000);

export interface SmsCredentials {
  apiKey: string;
  lineNumber: string;
  otpTemplateId: number;
  /** Parameter name inside the registered OTP template. */
  otpParameter: string;
}

/**
 * Reads provider credentials, or explains what is missing.
 *
 * Returns `null` rather than throwing so callers can degrade to "logged but
 * not sent" instead of failing a visitor's form submission.
 */
export function readCredentials(): SmsCredentials | null {
  const apiKey = process.env.SMSIR_API_KEY?.trim();
  if (!apiKey) return null;

  return {
    apiKey,
    /** Only reported on the settings screen; nothing sends from a line. */
    lineNumber: process.env.SMSIR_LINE_NUMBER?.trim() || "",
    otpTemplateId: Number(process.env.SMSIR_OTP_TEMPLATE_ID || 0),
    otpParameter: process.env.SMSIR_OTP_PARAM_NAME?.trim() || "CODE",
  };
}

export type SmsSendResult =
  | { ok: true; messageId?: string; cost?: number }
  | { ok: false; error: string };

interface SmsIrEnvelope {
  status?: number;
  message?: string;
  data?: {
    messageId?: number | string;
    messageIds?: (number | string)[];
    cost?: number;
  } | null;
}

/**
 * sms.ir answers `status: 1` on success and puts the reason in `message`.
 *
 * Provider text is Persian and safe to surface to staff — it is what tells
 * them "credit exhausted" or "template not approved" rather than a generic
 * failure they cannot act on.
 */
function interpret(payload: SmsIrEnvelope, httpStatus: number): SmsSendResult {
  if (payload.status === 1) {
    const id = payload.data?.messageId ?? payload.data?.messageIds?.[0];
    return {
      ok: true,
      messageId: id === undefined || id === null ? undefined : String(id),
      cost: payload.data?.cost,
    };
  }

  const reason =
    payload.message?.trim() ||
    `پاسخ نامعتبر از سامانه پیامک (کد ${httpStatus}).`;

  return { ok: false, error: reason };
}

async function post(path: string, body: unknown, apiKey: string): Promise<SmsSendResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });

    const text = await response.text();

    let payload: SmsIrEnvelope;
    try {
      payload = JSON.parse(text) as SmsIrEnvelope;
    } catch {
      return {
        ok: false,
        error: `پاسخ سامانه پیامک قابل خواندن نبود (کد ${response.status}).`,
      };
    }

    return interpret(payload, response.status);
  } catch (error) {
    if ((error as Error)?.name === "AbortError") {
      return { ok: false, error: "ارتباط با سامانه پیامک زمان‌بر شد." };
    }
    // The provider's own message is safe to show; a transport error is not —
    // it can carry internal hostnames. Log it, return something generic.
    console.error("[sms] transport error", error);
    return { ok: false, error: "ارتباط با سامانه پیامک برقرار نشد." };
  } finally {
    clearTimeout(timer);
  }
}

/** Strips the leading zero: sms.ir expects `9xxxxxxxxx` on the verify route. */
function toProviderMobile(phone: string): string {
  return phone.replace(/^0/, "");
}

export interface TemplateParameter {
  name: string;
  value: string;
}

/**
 * Sends one registered template to one number.
 *
 * The only send primitive in the application. Callers name a template id and
 * supply its parameter values; the wording is the provider's.
 */
export async function sendTemplateMessage(
  phone: string,
  templateId: number,
  parameters: TemplateParameter[],
  credentials: SmsCredentials,
): Promise<SmsSendResult> {
  if (!templateId) {
    return { ok: false, error: "شناسه قالب پیامک تنظیم نشده است." };
  }

  return post(
    "/send/verify",
    {
      mobile: toProviderMobile(phone),
      templateId,
      // Values are sent verbatim; sms.ir rejects a parameter the template
      // does not declare, which is why the names are configurable.
      parameters: parameters.map(({ name, value }) => ({ name, value })),
    },
    credentials.apiKey,
  );
}

/**
 * Sends a one-time code through the registered verification template.
 *
 * The code is the only parameter, and it never appears in any log this
 * application writes.
 */
export async function sendVerificationCode(
  phone: string,
  code: string,
  credentials: SmsCredentials,
): Promise<SmsSendResult> {
  return sendTemplateMessage(
    phone,
    credentials.otpTemplateId,
    [{ name: credentials.otpParameter, value: code }],
    credentials,
  );
}

/** Remaining account credit, for the settings screen. `null` when unavailable. */
export async function fetchCredit(): Promise<number | null> {
  const credentials = readCredentials();
  if (!credentials) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE}/credit`, {
      headers: { Accept: "application/json", "X-API-KEY": credentials.apiKey },
      signal: controller.signal,
      cache: "no-store",
    });
    const payload = (await response.json()) as { status?: number; data?: number };
    return payload.status === 1 && typeof payload.data === "number"
      ? payload.data
      : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
