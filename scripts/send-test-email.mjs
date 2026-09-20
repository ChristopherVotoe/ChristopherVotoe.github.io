import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY?.trim();
const message = {
  from: process.env.EMAIL_FROM?.trim() || "onboarding@resend.dev",
  to: "chris.votoe.official@gmail.com",
  subject: "Hello World",
  html: "<p>Congrats on sending your <strong>first email</strong>!</p>",
};

if (process.argv.includes("--dry-run")) {
  console.log("Preview only; no email sent:", message);
} else if (!apiKey || apiKey === "re_xxxxxxxxx") {
  console.error("Set RESEND_API_KEY in the ignored .env.email.local file. Replace re_xxxxxxxxx with a new, private Resend API key.");
  process.exitCode = 1;
} else {
  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send(message);
    if (error || !data?.id) {
      console.error("Resend did not confirm the email. Check the API key, sender, and recipient permissions in your Resend dashboard.");
      process.exitCode = 1;
    } else {
      console.log(`Email accepted by Resend. Message ID: ${data.id}`);
    }
  } catch {
    console.error("Could not confirm the email request. Check your connection and Resend dashboard before retrying.");
    process.exitCode = 1;
  }
}
