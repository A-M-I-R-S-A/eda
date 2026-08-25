import type { Appointment, ConsultationRequest } from "@/types";

/**
 * Shared shape returned by every Server Action.
 *
 * Designed for `useActionState`: the form renders `message` and
 * `fieldErrors` directly, and `payload` carries whatever the success screen
 * needs (a tracking code, a booking record…). Nothing sensitive is ever put in
 * `payload` beyond what the submitter already provided.
 */
export type FormStatus = "idle" | "success" | "error";

export interface FormState<TPayload = undefined> {
  status: FormStatus;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  payload?: TPayload;
  /** Increments on every submission so effects can react to repeat results. */
  submissionId?: number;
}

export const idleState: FormState<never> = { status: "idle" };

export function errorState<T>(
  message: string,
  fieldErrors?: Record<string, string[]>,
): FormState<T> {
  return { status: "error", message, fieldErrors, submissionId: Date.now() };
}

export function successState<T>(message: string, payload?: T): FormState<T> {
  return { status: "success", message, payload, submissionId: Date.now() };
}

/* -------------------------------------------------------------------------- */
/*  Payload shapes                                                            */
/* -------------------------------------------------------------------------- */

export interface ConsultationReceipt {
  trackingCode: string;
  createdAt: string;
  requestType: ConsultationRequest["requestType"];
  status: ConsultationRequest["status"];
  attachmentCount: number;
}

export interface AppointmentReceipt {
  bookingCode: string;
  date: string;
  time: string;
  durationMinutes: number;
  consultationType: Appointment["consultationType"];
  meetingMode: Appointment["meetingMode"];
  arbitratorName: string;
  status: Appointment["status"];
}

export interface TrackingResult {
  kind: "request" | "appointment";
  request?: ConsultationRequest;
  appointment?: Appointment;
}
