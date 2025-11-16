/**
 * Version checker module for detecting outdated and deprecated AWS service versions.
 * This module maintains up-to-date information about service version lifecycles
 * and helps identify resources that may have security vulnerabilities or are
 * approaching end-of-life.
 *
 * @module version-checker
 */

export type VersionStatus =
  | "Current"
  | "Deprecated"
  | "Extended Support"
  | "End of Life"
  | "Unknown";

export interface VersionCheckResult {
  status: VersionStatus;
  message?: string;
  endDate?: string;
}

/**
 * EKS Kubernetes version support information
 * AWS typically supports the latest 4 Kubernetes versions
 * Source: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
 *
 * Note: These dates are approximate and should be updated regularly
 */
const EKS_VERSION_DATA: Record<
  string,
  { status: VersionStatus; endDate?: string; message?: string }
> = {
  "1.31": { status: "Current", message: "Latest stable version" },
  "1.30": { status: "Current", message: "Fully supported" },
  "1.29": { status: "Current", message: "Fully supported" },
  "1.28": { status: "Current", message: "Fully supported" },
  "1.27": {
    status: "Deprecated",
    endDate: "2025-06-01",
    message: "Approaching end of support",
  },
  "1.26": {
    status: "End of Life",
    endDate: "2024-06-11",
    message: "No longer supported",
  },
  "1.25": {
    status: "End of Life",
    endDate: "2024-05-01",
    message: "No longer supported",
  },
  "1.24": {
    status: "End of Life",
    endDate: "2024-01-31",
    message: "No longer supported",
  },
  "1.23": {
    status: "End of Life",
    endDate: "2023-10-11",
    message: "No longer supported",
  },
};

/**
 * AWS Lambda runtime support information
 * Source: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
 */
const LAMBDA_RUNTIME_DATA: Record<
  string,
  { status: VersionStatus; endDate?: string; message?: string }
> = {
  // Python runtimes
  "python3.13": { status: "Current", message: "Latest Python runtime" },
  "python3.12": { status: "Current", message: "Fully supported" },
  "python3.11": { status: "Current", message: "Fully supported" },
  "python3.10": { status: "Current", message: "Fully supported" },
  "python3.9": { status: "Current", message: "Fully supported" },
  "python3.8": {
    status: "Deprecated",
    endDate: "2024-10-14",
    message: "Deprecated - migrate to Python 3.9+",
  },
  "python3.7": {
    status: "End of Life",
    endDate: "2023-11-27",
    message: "No longer supported",
  },
  "python2.7": {
    status: "End of Life",
    endDate: "2021-07-15",
    message: "No longer supported",
  },

  // Node.js runtimes
  "nodejs22.x": { status: "Current", message: "Latest Node.js runtime" },
  "nodejs20.x": { status: "Current", message: "Fully supported" },
  "nodejs18.x": { status: "Current", message: "Fully supported" },
  "nodejs16.x": {
    status: "Deprecated",
    endDate: "2024-06-12",
    message: "Deprecated - migrate to Node.js 18+",
  },
  "nodejs14.x": {
    status: "End of Life",
    endDate: "2023-11-27",
    message: "No longer supported",
  },
  "nodejs12.x": {
    status: "End of Life",
    endDate: "2023-03-31",
    message: "No longer supported",
  },

  // Java runtimes
  java21: { status: "Current", message: "Latest Java runtime" },
  java17: { status: "Current", message: "Fully supported" },
  java11: { status: "Current", message: "Fully supported" },
  "java8.al2": {
    status: "Current",
    message: "Fully supported (Amazon Linux 2)",
  },
  java8: {
    status: "Deprecated",
    endDate: "2024-07-31",
    message: "Migrate to java8.al2 or later",
  },

  // .NET runtimes
  dotnet8: { status: "Current", message: "Latest .NET runtime" },
  dotnet6: { status: "Current", message: "Fully supported" },
  "dotnetcore3.1": {
    status: "End of Life",
    endDate: "2023-04-03",
    message: "No longer supported",
  },

  // Ruby runtimes
  "ruby3.3": { status: "Current", message: "Latest Ruby runtime" },
  "ruby3.2": { status: "Current", message: "Fully supported" },
  "ruby2.7": {
    status: "End of Life",
    endDate: "2023-12-07",
    message: "No longer supported",
  },

  // Go runtimes
  provided: {
    status: "Current",
    message: "Custom runtime (use for Go, Rust, etc.)",
  },
  "provided.al2": {
    status: "Current",
    message: "Custom runtime on Amazon Linux 2",
  },
  "provided.al2023": {
    status: "Current",
    message: "Custom runtime on Amazon Linux 2023",
  },
};

/**
 * RDS Database Engine version support information
 * These are major version families - actual minor versions may vary
 */
const RDS_ENGINE_VERSIONS: Record<
  string,
  Record<string, { status: VersionStatus; endDate?: string; message?: string }>
> = {
  postgres: {
    "16": { status: "Current", message: "Latest major version" },
    "15": { status: "Current", message: "Fully supported" },
    "14": { status: "Current", message: "Fully supported" },
    "13": { status: "Current", message: "Fully supported" },
    "12": {
      status: "Deprecated",
      endDate: "2025-11-14",
      message: "Approaching end of support",
    },
    "11": {
      status: "End of Life",
      endDate: "2024-02-29",
      message: "No longer supported",
    },
    "10": {
      status: "End of Life",
      endDate: "2023-01-31",
      message: "No longer supported",
    },
  },
  mysql: {
    "8.4": { status: "Current", message: "Latest LTS version" },
    "8.0": { status: "Current", message: "Fully supported" },
    "5.7": {
      status: "Extended Support",
      endDate: "2024-02-29",
      message: "Standard support ended - now in extended support",
    },
    "5.6": {
      status: "End of Life",
      endDate: "2021-08-03",
      message: "No longer supported",
    },
  },
  mariadb: {
    "10.11": { status: "Current", message: "Latest LTS version" },
    "10.6": { status: "Current", message: "Fully supported" },
    "10.5": { status: "Current", message: "Fully supported" },
    "10.4": {
      status: "Deprecated",
      endDate: "2024-06-18",
      message: "Approaching end of support",
    },
    "10.3": {
      status: "End of Life",
      endDate: "2023-05-25",
      message: "No longer supported",
    },
  },
  "aurora-mysql": {
    "8.0": { status: "Current", message: "Latest version" },
    "5.7": {
      status: "Extended Support",
      endDate: "2024-10-31",
      message: "Standard support ended - now in extended support",
    },
  },
  "aurora-postgresql": {
    "16": { status: "Current", message: "Latest major version" },
    "15": { status: "Current", message: "Fully supported" },
    "14": { status: "Current", message: "Fully supported" },
    "13": { status: "Current", message: "Fully supported" },
    "12": {
      status: "Deprecated",
      endDate: "2025-02-28",
      message: "Approaching end of support",
    },
    "11": {
      status: "End of Life",
      endDate: "2024-02-29",
      message: "No longer supported",
    },
  },
  sqlserver: {
    "2022": { status: "Current", message: "Latest version" },
    "2019": { status: "Current", message: "Fully supported" },
    "2017": { status: "Current", message: "Fully supported" },
    "2016": {
      status: "Extended Support",
      endDate: "2026-07-14",
      message: "Mainstream support ended",
    },
    "2014": {
      status: "End of Life",
      endDate: "2024-07-09",
      message: "No longer supported",
    },
  },
  oracle: {
    "19": { status: "Current", message: "Latest LTS version" },
    "12": {
      status: "Extended Support",
      endDate: "2025-03-31",
      message: "Approaching end of extended support",
    },
    "11": {
      status: "End of Life",
      endDate: "2020-12-31",
      message: "No longer supported",
    },
  },
};

/**
 * ElastiCache engine version support information
 */
const ELASTICACHE_ENGINE_VERSIONS: Record<
  string,
  Record<string, { status: VersionStatus; endDate?: string; message?: string }>
> = {
  redis: {
    "7.1": { status: "Current", message: "Latest version" },
    "7.0": { status: "Current", message: "Fully supported" },
    "6.2": { status: "Current", message: "Fully supported" },
    "6.0": {
      status: "Deprecated",
      endDate: "2025-09-30",
      message: "Approaching end of support",
    },
    "5.0.6": {
      status: "End of Life",
      endDate: "2022-04-30",
      message: "No longer supported",
    },
  },
  memcached: {
    "1.6": { status: "Current", message: "Latest version" },
    "1.5": { status: "Current", message: "Fully supported" },
    "1.4": {
      status: "Deprecated",
      endDate: "2024-12-31",
      message: "Approaching end of support",
    },
  },
};

/**
 * Checks if an EKS cluster version is outdated or deprecated
 */
export function checkEKSVersion(version: string): VersionCheckResult {
  const versionData = EKS_VERSION_DATA[version];

  if (versionData) {
    return {
      status: versionData.status,
      message: versionData.message,
      endDate: versionData.endDate,
    };
  }

  // Version not found in our data - likely very old
  return {
    status: "Unknown",
    message: `Version ${version} not found in support matrix - likely outdated`,
  };
}

/**
 * Checks if a Lambda runtime is outdated or deprecated
 */
export function checkLambdaRuntime(runtime: string): VersionCheckResult {
  const runtimeData = LAMBDA_RUNTIME_DATA[runtime];

  if (runtimeData) {
    return {
      status: runtimeData.status,
      message: runtimeData.message,
      endDate: runtimeData.endDate,
    };
  }

  // Runtime not found - might be custom or very old
  if (runtime.startsWith("provided")) {
    return {
      status: "Current",
      message: "Custom runtime",
    };
  }

  return {
    status: "Unknown",
    message: `Runtime ${runtime} not found in support matrix`,
  };
}

/**
 * Checks if an RDS engine version is outdated or deprecated
 */
export function checkRDSVersion(
  engine: string,
  version: string,
): VersionCheckResult {
  // Extract major version from full version string (e.g., "14.7" -> "14")
  const majorVersion = version.split(".")[0];

  if (!majorVersion) {
    return {
      status: "Unknown",
      message: `Invalid version format: ${version}`,
    };
  }

  const engineVersions = RDS_ENGINE_VERSIONS[engine];
  if (!engineVersions) {
    return {
      status: "Unknown",
      message: `Engine ${engine} not found in support matrix`,
    };
  }

  const versionData = engineVersions[majorVersion];
  if (versionData) {
    return {
      status: versionData.status,
      message: versionData.message,
      endDate: versionData.endDate,
    };
  }

  return {
    status: "Unknown",
    message: `Version ${version} (major: ${majorVersion}) not found for ${engine}`,
  };
}

/**
 * Checks if an ElastiCache engine version is outdated or deprecated
 */
export function checkElastiCacheVersion(
  engine: string,
  version: string,
): VersionCheckResult {
  // Extract major.minor version (e.g., "7.0.7" -> "7.0")
  const parts = version.split(".");
  const majorMinor = parts.length >= 2 ? `${parts[0]}.${parts[1]}` : version;

  const engineVersions = ELASTICACHE_ENGINE_VERSIONS[engine];
  if (!engineVersions) {
    return {
      status: "Unknown",
      message: `Engine ${engine} not found in support matrix`,
    };
  }

  // Try exact match first
  let versionData = engineVersions[version];

  // If not found, try major.minor
  if (!versionData && majorMinor !== version) {
    versionData = engineVersions[majorMinor];
  }

  // If still not found, try just major version
  if (!versionData && parts[0]) {
    versionData = engineVersions[parts[0]];
  }

  if (versionData) {
    return {
      status: versionData.status,
      message: versionData.message,
      endDate: versionData.endDate,
    };
  }

  return {
    status: "Unknown",
    message: `Version ${version} not found for ${engine}`,
  };
}

/**
 * Formats a version check result into a human-readable string for CSV output
 */
export function formatVersionStatus(result: VersionCheckResult): string {
  if (result.status === "Current") {
    return "Current";
  }

  if (result.status === "Deprecated" && result.endDate) {
    return `Deprecated (EOL ${result.endDate})`;
  }

  if (result.status === "Extended Support") {
    return `Extended Support${result.endDate ? ` (ends ${result.endDate})` : ""}`;
  }

  if (result.status === "End of Life") {
    return `End of Life${result.endDate ? ` (${result.endDate})` : ""}`;
  }

  return result.status;
}
