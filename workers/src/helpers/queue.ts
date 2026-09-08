import type { EmailQueueMessage } from "../types";

export async function enqueueEmail(
  queue: Queue,
  to: string,
  subject: string,
  code: string,
  purpose: "login" | "password_reset" | "email_verification"
): Promise<boolean> {
  try {
    const message: EmailQueueMessage = {
      to,
      subject,
      code,
      purpose,
    };

    // Send to queue (non-blocking)
    await queue.send(message);
    return true;
  } catch (error) {
    console.error("Queue error:", error);
    return false;
  }
}
