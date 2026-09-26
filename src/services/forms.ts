export interface DemoRequest {
  name: string
  email: string
  organization: string
  message: string
}

export interface SubmitResult {
  /** Reference shown to the user so they can quote it in follow-ups. */
  reference: string
}

/**
 * Submits the "Request a Demo" form.
 *
 * TODO(backend): replace the mock with a real endpoint, e.g. a Vercel serverless function
 * (`/api/demo-request`) that validates the payload again server-side, stores it
 * (Supabase table `demo_requests`) and emails the sales team (Resend / SendGrid / Postmark).
 * Never send email directly from the browser — API keys must stay on the server.
 */
export async function submitDemoRequest(request: DemoRequest): Promise<SubmitResult> {
  await new Promise((r) => setTimeout(r, 800))
  if (import.meta.env.DEV) console.info('[mock] demo request submitted', request)
  return { reference: `DEMO-${Date.now().toString(36).toUpperCase()}` }
}
