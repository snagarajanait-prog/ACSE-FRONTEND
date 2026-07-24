/**
 * The copilot's email + one-time-code verification, injected into the RTK Query
 * `apiSlice`. These two calls are the identity gate in front of the chat:
 * `sendCode` generates a 6-digit code for an email, `verifyCode` exchanges that
 * code for a short-lived assistant token.
 *
 * Both are PRE-AUTH handshakes — there is no Bearer token yet, and they are
 * excluded from the encryption envelope (this backend takes plaintext, same as
 * `login`). Each unwraps the `{ statusCode, success, message, data }` envelope in
 * `transformResponse`, so callers receive a bare domain object.
 */

import config from '@/config'
import { apiSlice } from '@/redux/api/apiSlice'
import type { ApiEnvelope } from '@/types'

export interface SendCodePayload {
  email: string
}

export interface SendCodeResult {
  email: string
  /** Handle that `verifyCode` needs to match the code back to this attempt. */
  sessionId: string
  /** Seconds until the code expires (300 = 5 min). */
  expiresIn: number
  /**
   * The 6-digit code. The backend returns it in the body so the demo can SHOW it
   * on screen for the visitor to key in — there is no real inbox behind this.
   */
  verificationCode: string
}

export interface VerifyCodePayload {
  sessionId: string
  code: string
}

export interface VerifyCodeResult {
  /** Bearer token minted on success; authorizes the assistant/chat backend. */
  assistantToken: string
  tokenType: string
  /** Seconds until the token expires (900 = 15 min). */
  expiresIn: number
}

export const assistantApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    sendCode: builder.mutation<SendCodeResult, SendCodePayload>({
      query: (body) => ({
        url: config.assistant.sendCode,
        method: 'POST',
        body,
        skipEncryption: true,
      }),
      transformResponse: (res: ApiEnvelope<SendCodeResult>) => res.data,
    }),

    verifyCode: builder.mutation<VerifyCodeResult, VerifyCodePayload>({
      query: (body) => ({
        url: config.assistant.verifyCode,
        method: 'POST',
        body,
        skipEncryption: true,
      }),
      transformResponse: (res: ApiEnvelope<VerifyCodeResult>) => res.data,
    }),
  }),
})

export const { useSendCodeMutation, useVerifyCodeMutation } = assistantApi
