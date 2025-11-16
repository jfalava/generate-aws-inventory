/**
 * AWS SDK Error Handler
 *
 * Provides error handling, retry logic, and user-friendly error messages for AWS SDK operations
 */

/**
 * Check if an error is a throttling error
 */
export function isThrottlingError(error: any): boolean {
  const throttlingCodes = [
    "Throttling",
    "ThrottlingException",
    "TooManyRequestsException",
    "RequestLimitExceeded",
    "ProvisionedThroughputExceededException",
  ];

  return (
    error &&
    (throttlingCodes.includes(error.name) ||
      throttlingCodes.includes(error.code) ||
      throttlingCodes.includes(error.$metadata?.httpStatusCode))
  );
}

/**
 * Check if an error is a credential error
 */
export function isCredentialError(error: any): boolean {
  const credentialCodes = [
    "CredentialsError",
    "InvalidClientTokenId",
    "SignatureDoesNotMatch",
    "UnrecognizedClientException",
    "InvalidAccessKeyId",
    "ExpiredToken",
    "ExpiredTokenException",
  ];

  return (
    error &&
    (credentialCodes.includes(error.name) ||
      credentialCodes.includes(error.code) ||
      error.message?.includes("credential") ||
      error.message?.includes("expired"))
  );
}

/**
 * Check if an error is a transient/retryable error
 */
export function isRetryableError(error: any): boolean {
  const retryableCodes = [
    "RequestTimeout",
    "RequestTimeoutException",
    "ServiceUnavailable",
    "InternalServerError",
    "InternalFailure",
    "InternalError",
  ];

  const statusCode = error.$metadata?.httpStatusCode;

  return (
    isThrottlingError(error) ||
    retryableCodes.includes(error.name) ||
    retryableCodes.includes(error.code) ||
    statusCode === 500 ||
    statusCode === 503 ||
    statusCode === 504
  );
}

/**
 * Extract a user-friendly error message from an AWS SDK error
 */
export function getErrorMessage(error: any, serviceName: string): string {
  if (isCredentialError(error)) {
    return `AWS credentials error for ${serviceName}: ${error.message}. Please check your credentials.`;
  }

  if (isThrottlingError(error)) {
    return `AWS rate limit exceeded for ${serviceName}: ${error.message}. The request will be retried.`;
  }

  if (error.name === "AccessDeniedException" || error.code === "AccessDenied") {
    return `Access denied for ${serviceName}: ${error.message}. Check your IAM permissions.`;
  }

  return `Error calling ${serviceName}: ${error.message || error.name || "Unknown error"}`;
}

/**
 * Execute an AWS SDK operation with retry logic
 *
 * @param operation - The async operation to execute
 * @param serviceName - Name of the service for error messages
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param retryDelayMs - Base delay between retries in ms (default: 1000)
 * @returns The result of the operation
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  serviceName: string,
  maxRetries: number = 3,
  retryDelayMs: number = 1000,
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Don't retry on non-retryable errors
      if (!isRetryableError(error)) {
        throw new Error(getErrorMessage(error, serviceName));
      }

      // Don't retry if this was the last attempt
      if (attempt === maxRetries) {
        throw new Error(getErrorMessage(error, serviceName));
      }

      // Calculate delay with exponential backoff
      const delay = retryDelayMs * Math.pow(2, attempt);

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but TypeScript needs it
  throw new Error(getErrorMessage(lastError, serviceName));
}

/**
 * Sleep for a specified duration
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
