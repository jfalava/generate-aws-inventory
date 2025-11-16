import { $ } from "bun";
import { color } from "./colors";

/**
 * Check if AWS CLI is installed and available in PATH
 * @returns true if AWS CLI is available, false otherwise
 */
export async function isAwsCliAvailable(): Promise<boolean> {
  try {
    await $`aws --version`.quiet();
    return true;
  } catch {
    return false;
  }
}

/**
 * Display platform-specific installation instructions for AWS CLI
 */
export function displayAwsCliInstallInstructions(): void {
  const platform = process.platform;

  console.error(
    color.boldError("\n❌ AWS CLI is not installed or not found in PATH\n"),
  );

  console.error(
    color.bold("To install AWS CLI, choose one of the following options:\n"),
  );

  if (platform === "darwin") {
    // macOS
    console.error(color.cyan("macOS Installation Options:"));
    console.error(color.yellow("\n  Using Homebrew:"));
    console.error(color.muted("    brew install awscli"));

    console.error(color.yellow("\n  Using Nix:"));
    console.error(
      color.muted(
        "    nix profile install legacyPackages.x86_64-linux.awscli2",
      ),
    );

    console.error(color.yellow("\n  Official Installer:"));
    console.error(
      color.muted(
        "    Download from: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html",
      ),
    );
  } else if (platform === "linux") {
    // Linux
    console.error(color.cyan("Linux Installation Options:"));
    console.error(color.yellow("\n  Using Homebrew:"));
    console.error(color.muted("    brew install awscli"));

    console.error(color.yellow("\n  Using Nix:"));
    console.error(
      color.muted(
        "    nix profile install legacyPackages.x86_64-linux.awscli2",
      ),
    );

    console.error(color.yellow("\n  Official Installer:"));
    console.error(
      color.muted(
        "    Download from: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html",
      ),
    );
  } else if (platform === "win32") {
    // Windows
    console.error(color.cyan("Windows Installation Options:"));
    console.error(color.yellow("\n  Using Winget:"));
    console.error(color.muted("    winget install Amazon.AWSCLI"));

    console.error(color.yellow("\n  Official Installer:"));
    console.error(
      color.muted(
        "    Download from: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html",
      ),
    );
  } else {
    // Other platforms
    console.error(color.cyan("Installation:"));
    console.error(color.yellow("\n  Official Installer:"));
    console.error(
      color.muted(
        "    Download from: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html",
      ),
    );
  }

  console.error(color.bold("\n📖 Documentation:"));
  console.error(
    color.muted(
      "   https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html\n",
    ),
  );
}

/**
 * Check if AWS CLI is available and exit with error if not found
 */
export async function checkAwsCliOrExit(): Promise<void> {
  const isAvailable = await isAwsCliAvailable();

  if (!isAvailable) {
    displayAwsCliInstallInstructions();
    process.exit(1);
  }
}
