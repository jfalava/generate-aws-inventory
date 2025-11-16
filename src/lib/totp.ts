import * as OTPAuth from "otpauth";

const SECRET_KEY = "aws_totp_secret";

/**
 *
 * https://bun.com/docs/api/secrets
 *
 */

export async function storeTOTPSecret(
  secret: string,
  log: (msg: string) => void,
): Promise<void> {
  try {
    await Bun.secrets.set({
      service: "aws-ec2-totp-lister",
      name: SECRET_KEY,
      value: secret,
    });
    log("✓ TOTP secret stored securely");
  } catch (error) {
    throw new Error(`Failed to store TOTP secret: ${error}`);
  }
}

export async function getTOTPSecret(): Promise<string> {
  try {
    const secret = await Bun.secrets.get({
      service: "aws-ec2-totp-lister",
      name: SECRET_KEY,
    });
    if (!secret) {
      throw new Error("TOTP secret not found. Run with --setup-totp first.");
    }
    return secret;
  } catch (error) {
    throw new Error(`Failed to retrieve TOTP secret: ${error}`);
  }
}

export function generateTOTPToken(secret: string): string {
  const totp = new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(secret),
    digits: 6,
    period: 30,
  });
  return totp.generate();
}

/**
 * Read password/secret input from stdin with hidden characters
 */
async function readHiddenInput(prompt: string): Promise<string> {
  process.stdout.write(prompt);

  return new Promise((resolve) => {
    const stdin = process.stdin;
    let input = "";
    let shouldExit = false;

    // Enable raw mode to handle input character by character
    if (stdin.isTTY) {
      stdin.setRawMode(true);
    }

    stdin.resume();
    stdin.setEncoding("utf8");

    const cleanup = () => {
      stdin.removeListener("data", onData);
      if (stdin.isTTY) {
        stdin.setRawMode(false);
      }
      stdin.pause();
    };

    const onData = (data: string) => {
      // Process each character in the data (handles pasted text)
      for (let i = 0; i < data.length; i++) {
        const char = data[i];
        if (!char) continue;
        const charCode = char.charCodeAt(0);

        // Handle Ctrl+C
        if (charCode === 3) {
          cleanup();
          process.exit(130);
        }

        // Handle Enter - if it's a standalone Enter, submit; if part of paste, ignore
        if (charCode === 13 || charCode === 10) {
          // If this is the only character in the data, it's a keypress
          if (
            data.length === 1 ||
            (data.length === 2 &&
              (data.charCodeAt(1) === 13 || data.charCodeAt(1) === 10))
          ) {
            shouldExit = true;
            break;
          }
          // Otherwise, it's part of pasted content - skip it
          continue;
        }

        // Handle Backspace/Delete
        if (charCode === 127 || charCode === 8) {
          if (input.length > 0) {
            input = input.slice(0, -1);
            process.stdout.write("\b \b"); // Erase the asterisk
          }
          continue;
        }

        // Ignore other control characters
        if (charCode < 32) {
          continue;
        }

        // Add character to input and show asterisk
        input += char;
        process.stdout.write("*");
      }

      // If Enter was pressed, submit the input
      if (shouldExit) {
        cleanup();
        process.stdout.write("\n");
        resolve(input.trim());
      }
    };

    stdin.on("data", onData);
  });
}

export async function setupTOTP(log: (msg: string) => void): Promise<void> {
  log("TOTP Setup");
  log("==========");
  log("Enter your TOTP secret (base32 format):");

  const secret = await readHiddenInput("Secret: ");
  if (!secret) {
    throw new Error("Secret is required");
  }

  // Validate the secret by trying to generate a token
  try {
    const token = generateTOTPToken(secret);
    log(`\nTest token generated: ${token}`);
    log("If this matches your authenticator app, the secret is valid.\n");
  } catch (error) {
    throw new Error("Invalid TOTP secret format");
  }

  await storeTOTPSecret(secret, log);
  log("\nTOTP setup complete");
}
